const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const AuditLogStore = require("../stores/audit_log.store");
const { AuditService } = require("../services/audit.service");

describe("UC-17 read-only audit with real MySQL and internal authentication", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const database = "tcv_audit_test_" + randomUUID().replaceAll("-", "");
  const config = { secret: "audit-integration-test-only-secret-at-least-32-bytes", issuer: "food-tour-api", audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 86400000 };
  const credentials = email => ({ email, password: "AuditTestOnlyPassword1!" });
  let connection, db, auth, adminId, adminToken, staffToken, server, base;
  const actor = () => ({ userId: adminId, role: "ADMIN", status: "ACTIVE" });
  const request = (query = "", token = adminToken, method = "GET") => fetch(base + "/api/admin/audit-logs" + query, {
    method, headers: token ? { Authorization: "Bearer " + token } : {}, signal: AbortSignal.timeout(10000),
  });
  async function data(query) { const response = await request(query); assert.equal(response.status, 200); return (await response.json()).data; }
  async function snapshot() {
    const [rows] = await db.query("SELECT * FROM AUDIT_LOGS ORDER BY log_id");
    return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  }
  before(async () => {
    const mysql = require("mysql2/promise"), bcrypt = require("bcrypt");
    const options = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    connection = await mysql.createConnection(options);
    assert.match(database, /^tcv_audit_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await connection.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...options, database, multipleStatements: true, connectionLimit: 8 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service"), AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store"), RefreshTokenStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db), config: () => config,
      passwordHasher: { hash: value => bcrypt.hash(value, 4), compare: bcrypt.compare } });
    adminId = (await auth.bootstrapAdmin(credentials("audit-admin@example.invalid"))).userId;
    await auth.createStaff(adminId, credentials("audit-staff@example.invalid"));
    adminToken = (await auth.login(credentials("audit-admin@example.invalid"))).accessToken;
    staffToken = (await auth.login(credentials("audit-staff@example.invalid"))).accessToken;
    const { createApp } = require("../server");
    server = http.createServer(createApp({ authService: auth, auditService: new AuditService(new AuditLogStore(db)) }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
    await db.query("INSERT INTO AUDIT_LOGS(log_id,user_id,action,resource_type,resource_id,details,created_at) VALUES ('9007199254740993',?,'UPDATE_TOUR','TOURS','12',?,'2024-02-29 12:00:00')",
      [adminId, JSON.stringify({ items: [{ poiId: 2, sequenceNo: 1, token: "TEST_ONLY_SECRET" }], authCode: "TEST_ONLY_SECRET" })]);
    for (const [action, time] of [["UPDATE_TOUR", "2024-02-29 12:00:00"], ["CREATE_TOUR", "2024-02-29 11:59:59"], ["CREATE_TOUR", "2024-02-29 12:00:01"]]) {
      await db.query("INSERT INTO AUDIT_LOGS(user_id,action,resource_type,resource_id,created_at) VALUES(NULL,?,'TOURS','12',?)", [action, time]);
    }
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end(); if (connection) await connection.end();
    await require("../config/database").end(); // Retain uniquely named test DB; never initialize an existing database.
  });
  it("ADMIN reads latest first with deterministic BIGINT tie-breaker, pagination and no-store", async () => {
    const before = await snapshot();
    const query = "?from=2024-02-29T11:59:59Z&to=2024-02-29T12:00:01Z&limit=2";
    const first = await data(query), second = await data(query + "&page=2");
    assert.equal(first.total, 4); assert.equal(first.items.length, 2); assert.equal(second.items.length, 2);
    const all = [...first.items, ...second.items];
    assert.deepEqual(all.map(row => row.createdAt), ["2024-02-29T12:00:01.000Z", "2024-02-29T12:00:00.000Z", "2024-02-29T12:00:00.000Z", "2024-02-29T11:59:59.000Z"]);
    assert.equal(all[2].logId, "9007199254740993"); assert.ok(BigInt(all[1].logId) > BigInt(all[2].logId));
    assert.equal(new Set(all.map(row => row.logId)).size, 4);
    assert.equal((await request()).headers.get("cache-control"), "no-store"); assert.equal(await snapshot(), before);
  });
  it("ADMIN can filter actual stored knowledge actions without leaking document contents", async () => {
    for (const action of ["CREATE_KNOWLEDGE_DOCUMENT", "UPDATE_KNOWLEDGE_DOCUMENT", "DEACTIVATE_KNOWLEDGE_DOCUMENT", "PUBLISH_KNOWLEDGE_DOCUMENT", "FAIL_KNOWLEDGE_PROCESSING"]) {
      await db.query("INSERT INTO AUDIT_LOGS(user_id,action,resource_type,resource_id,details) VALUES(?,?,'KNOWLEDGE_DOCUMENTS','1',?)", [adminId, action, JSON.stringify({ contentVersion: 2, content: "PRIVATE_DOCUMENT", token: "PRIVATE_TOKEN" })]);
      const result = await data("?action=" + action);
      assert.equal(result.total, 1); assert.deepEqual(result.items[0].details, { contentVersion: 2 });
      assert.equal(result.items[0].detailsOmitted, true); assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);
    }
  });
  it("time filters are inclusive UTC, combine with action and support one-sided bounds", async () => {
    const exact = await data("?from=2024-02-29T12:00:00Z&to=2024-02-29T12:00:00Z&action=UPDATE_TOUR");
    assert.equal(exact.total, 2); assert.equal(exact.items.length, 2);
    assert.equal((await data("?to=2024-02-29T11:59:59Z&action=CREATE_TOUR")).total, 1);
    assert.equal((await data("?from=2024-02-29T12:00:01Z&action=CREATE_TOUR")).total, 1);
    assert.equal(exact.filters.action, "UPDATE_TOUR"); assert.ok(exact.actions.includes("RETRY_CONTENT_JOB"));
  });
  it("valid filters with no matches or a page beyond the end return 200 empty, never fake errors", async () => {
    const empty = await data("?action=DEACTIVATE_POI"); assert.equal(empty.total, 0); assert.deepEqual(empty.items, []);
    const beyond = await data("?action=UPDATE_TOUR&page=2&limit=100"); assert.equal(beyond.total, 2); assert.deepEqual(beyond.items, []);
  });
  it("nullable/deleted actor links retain log, actor ID/name are shown without joining secrets", async () => {
    const removed = await auth.createStaff(adminId, credentials("removed-audit@example.invalid"));
    await db.query("INSERT INTO AUDIT_LOGS(user_id,action,resource_type,resource_id) VALUES(?,'DEACTIVATE_POI','POIS','1')", [removed.userId]);
    await db.query("DELETE FROM USERS WHERE user_id=?", [removed.userId]);
    const rows = (await data("?action=DEACTIVATE_POI")).items;
    assert.equal(rows.length, 1); assert.equal(rows[0].userId, null); assert.equal(rows[0].actorName, null);
    const owned = (await data("?action=CREATE_STAFF")).items;
    assert.ok(owned.some(row => row.userId === adminId));
    for (const row of owned) { assert.equal(row.password_hash, undefined); assert.equal(row.ipAddress, undefined); }
  });
  it("HTTP rejects missing, guest, invalid, expired and logged-out credentials", async () => {
    const before = await snapshot(), jwt = require("jsonwebtoken"), payload = jwt.decode(adminToken);
    const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 5 }, config.secret);
    const other = await auth.login(credentials("audit-admin@example.invalid"));
    await auth.logout({ refreshToken: other.refreshToken });
    for (const token of [null, "invalid", "tcv_visit_" + "a".repeat(64), expired, other.accessToken]) assert.equal((await request("", token)).status, 401);
    assert.equal((await request("", staffToken)).status, 403); assert.equal(await snapshot(), before);
  });
  it("permissions use the current database role and account state rather than JWT claims", async () => {
    for (const [column, value, expected] of [["role", "STAFF", 403], ["status", "LOCKED", 403]]) {
      await db.query(`UPDATE USERS SET ${column}=? WHERE user_id=?`, [value, adminId]);
      try { assert.equal((await request()).status, expected); }
      finally { await db.query("UPDATE USERS SET role='ADMIN',status='ACTIVE' WHERE user_id=?", [adminId]); }
    }
    await db.query("UPDATE USERS SET locked_until=DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE user_id=?", [adminId]);
    try { assert.equal((await request()).status, 423); }
    finally { await db.query("UPDATE USERS SET locked_until=NULL WHERE user_id=?", [adminId]); }
  });
  it("malformed filters and SQL injection attempts return 400 with no audit mutations", async () => {
    const before = await snapshot();
    for (const query of ["?action=UNKNOWN_ACTION", "?action=" + encodeURIComponent("CREATE_TOUR' OR 1=1 --"),
      "?from=2026-02-30T00:00:00Z", "?from=2026-01-02T00:00:00Z&to=2026-01-01T00:00:00Z", "?page=0", "?limit=101", "?action=CREATE_TOUR&action=UPDATE_TOUR", "?userId=1"]) {
      assert.equal((await request(query)).status, 400, query);
    }
    assert.equal(await snapshot(), before);
  });
  it("free-form, unknown, nested secret and HTML details are not passed through as raw data", async () => {
    const before = await snapshot();
    const tour = (await data("?action=UPDATE_TOUR")).items.find(row => row.logId === "9007199254740993");
    assert.deepEqual(tour.details, { items: [{ poiId: 2, sequenceNo: 1 }] }); assert.equal(tour.detailsOmitted, true);
    await db.query("INSERT INTO AUDIT_LOGS(action,details) VALUES ('LEGACY_UNKNOWN',?),('CREATE_POI',?),('CREATE_POI',?)", [
      '{"apiKey":"TEST_ONLY_SECRET"}', '<script>TEST_ONLY_SECRET</script>', '{"sourceChanged":true,"contentVersion":1,"nested":{"rawToken":"TEST_ONLY_SECRET"}}']);
    const response = await request(), body = await response.text(); assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/); assert.ok(!body.includes("TEST_ONLY_SECRET")); assert.ok(!body.includes("<script>"));
    const current = JSON.parse(body).data.items;
    assert.equal(current.find(row => row.action === "LEGACY_UNKNOWN").details, null);
    assert.ok(current.some(row => row.action === "CREATE_POI" && row.details?.contentVersion === 1));
    assert.notEqual(await snapshot(), before); // Only fixture INSERTs above changed rows, not the GET.
    const afterInsert = await snapshot(); await data(); assert.equal(await snapshot(), afterInsert);
  });
  it("query outages become safe HTTP 503 and successful retry is distinguishable from empty data", async () => {
    let unavailable = true;
    const wrapped = new AuditService(new AuditLogStore({ getConnection: async () => {
      const c = await db.getConnection();
      return { beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), release: () => c.release(), destroy: () => c.destroy(),
        query: (sql, args) => unavailable && String(sql).includes("COUNT(*) AS total FROM AUDIT_LOGS")
          ? c.query("SELECT * FROM UC17_TEST_MISSING_TABLE") : c.query(sql, args) };
    } }));
    const { createApp } = require("../server");
    const broken = http.createServer(createApp({ authService: auth, auditService: wrapped }));
    await new Promise(resolve => broken.listen(0, "127.0.0.1", resolve));
    try {
      const url = `http://127.0.0.1:${broken.address().port}/api/admin/audit-logs`;
      const get = () => fetch(url, { headers: { Authorization: "Bearer " + adminToken }, signal: AbortSignal.timeout(5000) });
      const failed = await get(), body = await failed.text(); assert.equal(failed.status, 503); assert.match(body, /AUDIT_LOGS_UNAVAILABLE/); assert.ok(!body.includes("UC17_TEST_MISSING_TABLE")); assert.ok(!body.includes("ER_NO_SUCH_TABLE"));
      unavailable = false; const recovered = await get(); assert.equal(recovered.status, 200); assert.ok((await recovered.json()).data.total > 0);
    } finally { broken.closeAllConnections(); await new Promise(resolve => broken.close(resolve)); }
  });
  it("count and page share one snapshot during concurrent audit insertion", { timeout: 15000 }, async () => {
    let enter, resume;
    const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { resume = resolve; });
    const wrapped = { getConnection: async () => {
      const c = await db.getConnection();
      return { beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), release: () => c.release(), destroy: () => c.destroy(),
        query: async (sql, args) => { const rows = await c.query(sql, args); if (String(sql).includes("COUNT(*) AS total FROM AUDIT_LOGS")) { enter(); await resumed; } return rows; } };
    } };
    const before = await new AuditLogStore(db).list({ action: "CREATE_TOUR", page: 1, limit: 100 });
    const pending = new AuditLogStore(wrapped).list({ action: "CREATE_TOUR", page: 1, limit: 100 });
    try {
      await Promise.race([entered, pending.then(() => { throw new Error("Read completed before snapshot gate"); })]);
      await db.query("INSERT INTO AUDIT_LOGS(action,resource_type,resource_id) VALUES('CREATE_TOUR','TOURS','TEST_SNAPSHOT')");
    } finally { resume(); }
    const during = await pending; assert.equal(during.total, before.total); assert.deepEqual(during.items, before.items);
    const afterInsert = await new AuditLogStore(db).list({ action: "CREATE_TOUR", page: 1, limit: 100 }); assert.equal(afterInsert.total, before.total + 1);
  });
  it("write methods are unavailable and repeated/concurrent reads never add or modify audit entries", async () => {
    const before = await snapshot();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal((await request("", adminToken, method)).status, 404);
    await Promise.all(Array.from({ length: 4 }, () => data("?limit=2"))); assert.equal(await snapshot(), before);
  });
});
