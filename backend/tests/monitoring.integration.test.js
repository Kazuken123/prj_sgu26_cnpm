const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const MonitoringStore = require("../stores/monitoring.store");
const { MonitoringService } = require("../services/monitoring.service");
const HealthStore = require("../stores/health.store");
const RedisStore = require("../stores/redis.store");

describe("UC-18 real MySQL/Redis statistics and ADMIN HTTP authorization", { skip: process.env.RUN_DB_TESTS !== "1" || process.env.RUN_REDIS_TESTS !== "1" }, () => {
  const database = "tcv_monitor_test_" + randomUUID().replaceAll("-", "");
  const config = { secret: "monitoring-integration-test-only-secret-32-bytes", issuer: "food-tour-api", audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 86400000 };
  const credentials = email => ({ email, password: "MonitorTestOnlyPassword1!" });
  const window = { from: "2024-02-29T00:00:00Z", to: "2024-03-01T00:00:00Z" };
  let connection, db, auth, adminId, adminToken, staffToken, server, base, checks, api, firstSession;
  const actor = () => ({ userId: adminId, role: "ADMIN", status: "ACTIVE" });
  const request = (query = "", token = adminToken, method = "GET", url = base) => fetch(url + "/api/admin/monitoring" + query, {
    method, headers: token ? { Authorization: "Bearer " + token } : {}, signal: AbortSignal.timeout(10000),
  });
  const selected = () => "?" + new URLSearchParams(window);
  async function data(query = selected()) { const response = await request(query); assert.equal(response.status, 200); return (await response.json()).data; }
  async function fixturePayment({ status = "PAID", visit = "ACTIVE", expiry = "future", at = "2024-02-29 12:00:00", amount = "50000.00", currency = "VND" } = {}) {
    const id = randomUUID();
    await db.query(`INSERT INTO VISIT_SESSIONS(session_id,status,activated_at,expires_at) VALUES(?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${expiry === "future" ? "1" : "-1"} DAY))`, [id, visit]);
    await db.query("INSERT INTO PAYMENTS(session_id,payment_ref,payment_method,amount,currency,status,paid_at,created_at) VALUES(?,?,'CASH',?,?,?,?,'2020-01-01')", [id, randomUUID(), amount, currency, status, at]);
    return id;
  }
  async function snapshot() {
    const rows = [];
    for (const table of ["VISIT_SESSIONS", "PAYMENTS", "BUNDLE_ACCESS_LOGS", "CONTENT_JOBS", "AUDIOS", "AUDIT_LOGS"]) rows.push((await db.query("SELECT * FROM " + table + " ORDER BY 1"))[0]);
    return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  }
  function wrapQuery(intercept) {
    return { getConnection: async () => {
      const c = await db.getConnection();
      return { beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), release: () => c.release(), destroy: () => c.destroy(),
        query: (query, values) => intercept(c, typeof query === "string" ? query : query.sql, query, values) };
    } };
  }
  before(async () => {
    const mysql = require("mysql2/promise"), bcrypt = require("bcrypt");
    const options = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    connection = await mysql.createConnection(options);
    assert.match(database, /^tcv_monitor_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await connection.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...options, database, multipleStatements: true, connectionLimit: 8 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service"), AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store"), RefreshTokenStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db), config: () => config,
      passwordHasher: { hash: value => bcrypt.hash(value, 4), compare: bcrypt.compare } });
    adminId = (await auth.bootstrapAdmin(credentials("monitor-admin@example.invalid"))).userId;
    await auth.createStaff(adminId, credentials("monitor-staff@example.invalid"));
    adminToken = (await auth.login(credentials("monitor-admin@example.invalid"))).accessToken;
    staffToken = (await auth.login(credentials("monitor-staff@example.invalid"))).accessToken;
    checks = new HealthStore(db, new RedisStore()); api = new MonitoringService(new MonitoringStore(db), checks);
    server = http.createServer(require("../server").createApp({ authService: auth, monitoringService: api }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end(); if (connection) await connection.end();
    await require("../config/database").end(); // Preserve isolated UUID fixture database, never initialize an existing database.
  });
  it("empty database returns available zeros, actual healthy dependencies and a 24h UTC window", async () => {
    const result = await data("");
    assert.equal(result.health.readiness.status, "READY"); assert.equal(result.metrics.activePaidVisits.value, 0);
    assert.equal(result.metrics.paidPayments.value.count, 0); assert.equal(result.metrics.bundleAccess.value.total, 0);
    assert.equal(new Date(result.window.to) - new Date(result.window.from), 86400000);
    assert.equal(result.window.to, result.asOf); assert.equal(result.metrics.chatbot.status, "NOT_IMPLEMENTED");
  });
  it("current active paid visits include unexchanged tokens, exclude unpaid/revoked/expired sessions independently of the window", async () => {
    firstSession = await fixturePayment();
    await fixturePayment({ at: "2024-02-29 00:00:00", amount: "9999999999.99" });
    await fixturePayment({ status: "PENDING", at: null }); await fixturePayment({ status: "FAILED", at: null });
    await fixturePayment({ visit: "REVOKED" }); await fixturePayment({ expiry: "past" });
    await fixturePayment({ visit: "PENDING" }); await fixturePayment({ at: "2024-03-01 00:00:00" });
    await fixturePayment({ at: "2024-02-28 23:59:59", currency: "USD", amount: "1.25" });
    const result = await data();
    assert.equal(result.metrics.activePaidVisits.value, 4);
    assert.deepEqual(result.metrics.paidPayments.value, { count: 5, totals: [{ currency: "VND", amount: "10000199999.99" }] });
    const later = await data("?from=2024-03-01T00:00:00Z&to=2024-03-02T00:00:00Z");
    assert.equal(later.metrics.paidPayments.value.count, 1); assert.equal(later.metrics.activePaidVisits.value, 4);
    const all = await data("?from=2024-02-28T00:00:00Z&to=2024-03-02T00:00:00Z");
    assert.deepEqual(all.metrics.paidPayments.value.totals, [{ currency: "USD", amount: "1.25" }, { currency: "VND", amount: "10000249999.99" }]);
    assert.equal((await data("")).metrics.paidPayments.value.count, 0); // Filter paid_at, not creation or activation time.
  });
  it("bundle reloads count issuances, unique sessions are not the sum of per-language visitors and end boundary is excluded", async () => {
    for (const [lang, at] of [["vi", "2024-02-29 00:00:00"], ["vi", "2024-02-29 12:00:00"], ["en", "2024-02-29 13:00:00"], ["en", "2024-03-01 00:00:00"]]) {
      await db.query("INSERT INTO BUNDLE_ACCESS_LOGS(session_id,language_code,created_at) VALUES(?,?,?)", [firstSession, lang, at]);
    }
    assert.deepEqual((await data()).metrics.bundleAccess.value, { total: 3, uniqueSessions: 1, byLanguage: [
      { languageCode: "en", total: 1, uniqueSessions: 1 }, { languageCode: "vi", total: 2, uniqueSessions: 1 }] });
  });
  it("jobs include old versions and inactive POIs, audio counts stored state rather than playable files", async () => {
    const [insert] = await db.query("INSERT INTO POIS(name,latitude,longitude,content_version) VALUES('TEST ONLY',0,0,9)");
    for (const [version, status] of [[1, "COMPLETED"], [2, "FAILED"], [3, "PROCESSING"], [4, "PENDING"]]) {
      await db.query("INSERT INTO CONTENT_JOBS(poi_id,language_code,source_version,status,created_at) VALUES(?,'vi',?,?,'2020-01-01')", [insert.insertId, version, status]);
    }
    const [translation] = await db.query("INSERT INTO POI_TRANSLATIONS(poi_id,language_code,source_version,status) VALUES(?,'vi',1,'READY')", [insert.insertId]);
    await db.query("INSERT INTO AUDIOS(translation_id,source_version,status,file_url) VALUES(?,1,'AVAILABLE','not-a-verified-file')", [translation.insertId]);
    const result = await data();
    assert.deepEqual(result.metrics.contentJobs.value, { total: 4, byStatus: { PENDING: 1, PROCESSING: 1, COMPLETED: 1, FAILED: 1 } });
    assert.equal(result.metrics.audioRecords.value.byStatus.AVAILABLE, 1); assert.equal(result.metrics.audioRecords.scope, "CURRENT_ALL_RECORDS");
  });
  it("repeated cash confirmations count one payment and do not inflate revenue through audit entries", async () => {
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store");
    const payments = new PaymentService(new PaymentStore(db), new RedisStore(), { price: () => "50000.00", validityMs: () => 86400000 });
    const created = await payments.initialize({ paymentMethod: "CASH" }, randomUUID(), actor());
    await Promise.all([payments.confirmCash(actor(), created.data.sessionId), payments.confirmCash(actor(), created.data.sessionId)]);
    assert.deepEqual((await data("")).metrics.paidPayments.value, { count: 1, totals: [{ currency: "VND", amount: "50000.00" }] });
  });
  it("HTTP rechecks current role and rejects missing, guest, expired, revoked and STAFF credentials", async () => {
    const jwt = require("jsonwebtoken"), expired = jwt.sign({ ...jwt.decode(adminToken), exp: Math.floor(Date.now() / 1000) - 5 }, config.secret);
    const revoked = await auth.login(credentials("monitor-admin@example.invalid")); await auth.logout({ refreshToken: revoked.refreshToken });
    for (const token of [null, "invalid", "tcv_visit_" + "a".repeat(64), expired, revoked.accessToken]) assert.equal((await request("", token)).status, 401);
    assert.equal((await request("", staffToken)).status, 403);
    for (const [column, value, expected] of [["role", "STAFF", 403], ["status", "LOCKED", 403]]) {
      await db.query(`UPDATE USERS SET ${column}=? WHERE user_id=?`, [value, adminId]);
      try { assert.equal((await request()).status, expected); }
      finally { await db.query("UPDATE USERS SET role='ADMIN',status='ACTIVE' WHERE user_id=?", [adminId]); }
    }
  });
  it("HTTP rejects invalid filters and write methods, sends no-store and never mutates monitored data", async () => {
    const before = await snapshot();
    for (const query of ["?from=bad", "?from=2024-02-30T00:00:00Z&to=2024-03-01T00:00:00Z", selected() + "&from=2024-01-01T00:00:00Z", "?action=PAYMENTS"]) assert.equal((await request(query)).status, 400);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal((await request("", adminToken, method)).status, 404);
    await Promise.all(Array.from({ length: 3 }, () => data()));
    assert.equal((await request()).headers.get("cache-control"), "no-store"); assert.equal(await snapshot(), before);
  });
  it("partial SQL source outage returns null with NOT_READY then recovers, fatal transaction errors return safe HTTP 503", async () => {
    let fault = "source";
    const wrapped = wrapQuery((c, sql, query, args) => {
      if (sql.includes("FROM AUDIOS") && fault === "source") return c.query("SELECT * FROM UC18_TEST_MISSING_TABLE");
      if (sql.includes("FROM AUDIOS") && fault === "fatal") throw Error("private driver detail");
      return c.query(query, args);
    });
    const local = http.createServer(require("../server").createApp({ authService: auth, monitoringService: new MonitoringService(new MonitoringStore(wrapped), checks) }));
    await new Promise(resolve => local.listen(0, "127.0.0.1", resolve)); const url = `http://127.0.0.1:${local.address().port}`;
    try {
      const response = await request(selected(), adminToken, "GET", url), result = (await response.json()).data;
      assert.equal(response.status, 200); assert.equal(result.metrics.audioRecords.value, null); assert.equal(result.metrics.paidPayments.value.count, 5);
      assert.equal(result.health.readiness.status, "NOT_READY"); assert.ok(!JSON.stringify(result).includes("UC18_TEST_MISSING_TABLE"));
      fault = "fatal"; const failed = await request(selected(), adminToken, "GET", url); assert.equal(failed.status, 503);
      assert.equal((await failed.json()).code, "MONITORING_UNAVAILABLE");
      fault = null; const recovered = await request(selected(), adminToken, "GET", url); assert.equal((await recovered.json()).data.metrics.audioRecords.value.total, 1);
    } finally { local.closeAllConnections(); await new Promise(resolve => local.close(resolve)); }
  });
  it("real Redis unavailable endpoint is bounded and recovery restores readiness without changing statistics", async () => {
    const net = require("node:net"), probe = net.createServer(); await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const redis = new RedisStore(), healthyUrl = redis.url;
    const monitor = new MonitoringService(new MonitoringStore(db), new HealthStore(db, redis));
    const before = await monitor.get(actor(), window);
    redis.url = `redis://127.0.0.1:${port}`;
    const started = Date.now(), during = await monitor.get(actor(), window);
    assert.ok(Date.now() - started < 5000); assert.equal(during.health.redis.status, "UNAVAILABLE"); assert.equal(during.health.readiness.status, "NOT_READY");
    assert.deepEqual(during.metrics.paidPayments.value, before.metrics.paidPayments.value);
    redis.url = healthyUrl; assert.equal((await monitor.get(actor(), window)).health.readiness.status, "READY");
  });
  it("all SQL metrics use one repeatable-read snapshot during concurrent payment and bundle insertion", { timeout: 15000 }, async () => {
    let enter, resume;
    const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { resume = resolve; });
    const wrapped = wrapQuery(async (c, sql, query, args) => {
      const rows = await c.query(query, args);
      if (sql.includes("JOIN PAYMENTS")) { enter(); await resumed; }
      return rows;
    });
    const before = await api.get(actor(), window), pending = new MonitoringService(new MonitoringStore(wrapped), checks).get(actor(), window);
    try {
      await Promise.race([entered, pending.then(() => { throw Error("snapshot gate was not reached"); })]);
      const id = await fixturePayment();
      await db.query("INSERT INTO BUNDLE_ACCESS_LOGS(session_id,language_code,created_at) VALUES(?,'vi','2024-02-29 15:00:00')", [id]);
    } finally { resume(); }
    const during = await pending, later = await api.get(actor(), window);
    assert.deepEqual(during.metrics.paidPayments.value, before.metrics.paidPayments.value);
    assert.deepEqual(during.metrics.bundleAccess.value, before.metrics.bundleAccess.value);
    assert.equal(later.metrics.paidPayments.value.count, before.metrics.paidPayments.value.count + 1);
    assert.equal(later.metrics.bundleAccess.value.total, before.metrics.bundleAccess.value.total + 1);
  });
});
