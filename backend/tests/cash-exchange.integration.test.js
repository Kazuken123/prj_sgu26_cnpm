const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const utcPool = require("../config/utc-pool");
const { memoryCashRedis } = require("./helpers/cash-exchange.fixture");
const realRedis = process.env.RUN_REDIS_TESTS === "1";

describe("Cash exchange SQL / " + (realRedis ? "real Redis" : "Redis replacement"), { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_exchange_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_test_exchange:" + randomUUID() + ":";
  const keys = new Set();
  let admin, db, redisAdmin, redis, service, staff;
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config);
    assert.match(name, /^tcv_exchange_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 12 }));
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const [insert] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES ('cash-exchange@example.invalid', 'test-only', 'STAFF', 'ACTIVE')");
    staff = { userId: insert.insertId, role: "STAFF", status: "ACTIVE" };
    if (realRedis) {
      redisAdmin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
      redisAdmin.on("error", () => {}); await redisAdmin.connect();
      const store = new RedisStore({ cashCodePrefix: prefix + "code:" });
      redis = {
        ensureCashCode: (...args) => { keys.add(prefix + "code:" + args[0]); return store.ensureCashCode(...args); },
        inspectCashCode: (...args) => store.inspectCashCode(...args),
        removeCashCode: (...args) => store.removeCashCode(...args),
        consumeLookup: (buckets, config) => store.consumeLookup(buckets.map(key => { const scoped = prefix + key; keys.add(scoped); return scoped; }), config),
      };
    } else redis = memoryCashRedis().redis;
    service = new PaymentService(new PaymentStore(db), redis, { price: () => "50000.00",
      exchangeConfig: () => ({ windowSeconds: 60, sessionLimit: 100, ipLimit: 1000 }) });
  });
  after(async () => {
    if (redisAdmin?.isOpen) { if (keys.size) await redisAdmin.del([...keys]); await redisAdmin.disconnect(); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_exchange_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  async function create(paid = true, method = "CASH") {
    const id = (await service.initialize({ paymentMethod: method }, randomUUID())).data.sessionId;
    if (!paid) return { id, body: { shortedCode: "012345" } };
    await service.confirmCash(staff, id);
    const code = await service.issueCashCode(staff, id);
    return { id, body: { shortedCode: code.shortedCode }, code };
  }
  const exchange = item => service.exchangeCashCode(item.id, item.body, "192.0.2.100");
  async function snapshot(id) {
    const [payments] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [id]);
    const [visits] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [id]);
    const [audits] = await db.query("SELECT * FROM AUDIT_LOGS WHERE action = 'ISSUE_VISITOR_TOKEN' AND resource_id = ?", [id]);
    return { payments, visits, audits };
  }
  it("full pending-confirm-issue-exchange flow stores one hash and audit without changing payment or ticket", async () => {
    const item = await create(), before = await snapshot(item.id), result = await exchange(item), after = await snapshot(item.id);
    assert.deepEqual(after.payments, before.payments);
    assert.deepEqual(after.visits.map(row => ({ ...row, token_hash: null })), before.visits);
    assert.equal(after.visits[0].token_hash, createHash("sha256").update(result.token).digest("hex"));
    assert.equal(result.expiresAt.getTime(), before.visits[0].expires_at.getTime());
    assert.equal(after.audits.length, 1); assert.equal(after.audits[0].user_id, null);
    const allStored = JSON.stringify(after); assert.equal(allStored.includes(result.token), false);
    assert.deepEqual(Object.keys(JSON.parse(after.audits[0].details)).sort(), ["issueId", "paymentRef"]);
    assert.equal(await redis.inspectCashCode(item.id, item.body.shortedCode), null);
    await assert.rejects(exchange(item), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    await assert.rejects(service.issueCashCode(staff, item.id), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    assert.deepEqual(await snapshot(item.id), after);
  });
  it("20 concurrent exchanges across two Service/Store instances commit exactly one token", async () => {
    const item = await create(), second = new PaymentService(new PaymentStore(db), redis, {
      exchangeConfig: () => ({ windowSeconds: 60, sessionLimit: 100, ipLimit: 1000 }) });
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => (i % 2 ? service : second).exchangeCashCode(item.id, item.body, "192.0.2.101")));
    assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
    assert.equal(results.filter(row => row.status === "rejected" && row.reason.code === "VISIT_TOKEN_ALREADY_ISSUED").length, 19);
    assert.equal((await snapshot(item.id)).audits.length, 1);
  });
  it("wrong code leaves the paid ticket and Redis mapping unchanged, then correct code succeeds", async () => {
    const item = await create(), before = await snapshot(item.id), original = await redis.inspectCashCode(item.id, item.body.shortedCode);
    const wrong = item.body.shortedCode === "000000" ? "999999" : "000000";
    await assert.rejects(service.exchangeCashCode(item.id, { shortedCode: wrong }, "192.0.2.102"), { code: "CASH_CODE_INVALID_OR_EXPIRED" });
    assert.deepEqual(await snapshot(item.id), before);
    assert.deepEqual(await redis.inspectCashCode(item.id, item.body.shortedCode), original);
    assert.ok((await exchange(item)).token);
  });
  it("pending, failed, online, revoked, expired, inconsistent and previously issued visits cannot exchange", async () => {
    for (const item of [await create(false), await create(false, "ONLINE")]) {
      const before = await snapshot(item.id); await assert.rejects(exchange(item), error => error.status === 409);
      assert.deepEqual(await snapshot(item.id), before);
    }
    for (const change of ["status = 'REVOKED'", "expires_at = '2020-01-01 00:00:00'", "paid_at = NULL", "token_hash = 'already-issued'", "reissue_count = 1"]) {
      const item = await create();
      if (change.startsWith("paid_at")) await db.query("UPDATE PAYMENTS SET paid_at = NULL WHERE session_id = ?", [item.id]);
      else await db.query("UPDATE VISIT_SESSIONS SET " + change + " WHERE session_id = ?", [item.id]);
      const before = await snapshot(item.id); await assert.rejects(exchange(item), error => error.status === 409);
      assert.deepEqual(await snapshot(item.id), before);
    }
    const failed = await create(false); await db.query("UPDATE PAYMENTS SET status = 'FAILED' WHERE session_id = ?", [failed.id]);
    await assert.rejects(exchange(failed), { code: "CASH_PAYMENT_NOT_PAID" });
  });
  it("audit insert failure rolls back token hash and retains valid Redis code for retry", async () => {
    const item = await create(), before = await snapshot(item.id), original = await redis.inspectCashCode(item.id, item.body.shortedCode);
    await db.query("CREATE TRIGGER cash_exchange_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(exchange(item), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" }); }
    finally { await db.query("DROP TRIGGER cash_exchange_fail_audit"); }
    assert.deepEqual(await snapshot(item.id), before);
    assert.deepEqual(await redis.inspectCashCode(item.id, item.body.shortedCode), original);
    assert.ok((await exchange(item)).token);
  });
  it("Redis validation outage never stores a hash or changes the paid visit", async () => {
    const item = await create(), before = await snapshot(item.id);
    service.redis = { ...redis, inspectCashCode: async () => { throw new Error("unavailable"); } };
    try { await assert.rejects(exchange(item), { code: "CASH_CODE_UNAVAILABLE" }); }
    finally { service.redis = redis; }
    assert.deepEqual(await snapshot(item.id), before); assert.ok((await exchange(item)).token);
  });
  it("cleanup failure after real SQL commit leaves stale code unable to issue a second token", async () => {
    const item = await create();
    service.redis = { ...redis, removeCashCode: async () => { throw new Error("cleanup unavailable"); } };
    let first;
    try { first = await exchange(item); } finally { service.redis = redis; }
    assert.ok(first.token); assert.ok(await redis.inspectCashCode(item.id, item.body.shortedCode));
    const before = await snapshot(item.id);
    await assert.rejects(exchange(item), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    assert.deepEqual(await snapshot(item.id), before);
  });
  it("SQL conditional write rejects a code that expires after Redis inspection", async () => {
    service.cashCodeTtlMs = () => 3000;
    let item;
    try { item = await create(); } finally { service.cashCodeTtlMs = () => 600000; }
    const before = await snapshot(item.id);
    service.redis = { ...redis, inspectCashCode: async (...args) => {
      const result = await redis.inspectCashCode(...args);
      assert.ok(result);
      await new Promise(resolve => setTimeout(resolve, 3200)); return result;
    } };
    try { await assert.rejects(exchange(item), { code: "CASH_EXCHANGE_CHANGED" }); }
    finally { service.redis = redis; }
    assert.deepEqual(await snapshot(item.id), before);
  });
  it("lost response after real commit returns no new token on retry and retains original hash", async () => {
    const item = await create(), originalStore = service.store, store = new PaymentStore(db);
    service.store = { withCashTokenExchange: async (...args) => { await store.withCashTokenExchange(...args); throw new Error("commit reply lost"); } };
    try { await assert.rejects(exchange(item), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" }); }
    finally { service.store = originalStore; }
    const before = await snapshot(item.id); assert.match(before.visits[0].token_hash, /^[a-f0-9]{64}$/);
    await assert.rejects(exchange(item), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    assert.deepEqual(await snapshot(item.id), before); assert.equal(before.audits.length, 1);
  });
  async function httpApp(t) {
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    const credentials = { email: "cash-exchange@example.invalid", password: "TestOnlyPassword123" };
    const passwordHash = await require("bcrypt").hash(credentials.password, 4);
    await db.query("UPDATE USERS SET password_hash = ? WHERE user_id = ?", [passwordHash, staff.userId]);
    const auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db),
      config: () => ({ secret: "visitor-http-integration-only-at-least-32-bytes", issuer: "food-tour-api", audience: "food-tour-client",
        accessTokenTtl: "1h", refreshTokenTtlMs: 86400000 }) });
    const { createApp } = require("../server");
    const server = http.createServer(createApp({ authService: auth, paymentService: service }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (target, body, token, extraHeaders = {}) => fetch(base + target, {
      method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", ...extraHeaders,
        ...(token ? { Authorization: "Bearer " + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { request, credentials };
  }
  it("HTTP full cash flow: staff login through guest protected request, role separation and staff logout", async t => {
    const { request, credentials } = await httpApp(t);
    const login = await request("/api/auth/login", credentials); assert.equal(login.status, 200);
    const staffToken = (await login.json()).data.accessToken;
    const pending = await request("/api/payments", { paymentMethod: "CASH" }, undefined, { "Idempotency-Key": randomUUID() });
    assert.equal(pending.status, 201); const id = (await pending.json()).data.sessionId;
    assert.equal((await request(`/api/admin/payments/sessions/${id}`, undefined, staffToken)).status, 200);
    assert.equal((await request(`/api/admin/payments/sessions/${id}/confirm-cash`, {}, staffToken)).status, 200);
    const code = await request(`/api/admin/payments/sessions/${id}/cash-code`, {}, staffToken); assert.equal(code.status, 200);
    const body = { shortedCode: (await code.json()).data.shortedCode };
    const exchangeResponse = await request(`/api/payments/sessions/${id}/exchange-cash-code`, body);
    assert.equal(exchangeResponse.status, 200); const visitor = (await exchangeResponse.json()).data;
    const me = await request("/api/visits/me", undefined, visitor.token);
    assert.equal(me.status, 200); assert.equal(me.headers.get("cache-control"), "no-store");
    assert.deepEqual((await me.json()).data, { sessionId: id, status: "ACTIVE", expiresAt: visitor.expiresAt });
    assert.equal((await request(`/api/payments/sessions/${id}/exchange-cash-code`, body)).status, 409);
    assert.equal((await request("/api/visits/me", undefined, staffToken)).status, 401);
    assert.equal((await request("/api/auth/me", undefined, visitor.token)).status, 401);
    assert.equal((await request(`/api/admin/payments/sessions/${id}/confirm-cash`, {}, visitor.token)).status, 401);
    const stored = await snapshot(id); assert.equal(stored.payments.length, 1); assert.equal(stored.visits.length, 1); assert.equal(stored.audits.length, 1);
    assert.equal(stored.visits[0].token_hash, createHash("sha256").update(visitor.token).digest("hex"));
    assert.equal((await request("/api/auth/logout", {}, staffToken)).status, 204);
    assert.equal((await request(`/api/admin/payments/sessions/${id}`, undefined, staffToken)).status, 401);
    assert.equal((await request("/api/visits/me", undefined, visitor.token)).status, 200);
    assert.deepEqual(await snapshot(id), stored);
  });
  it("HTTP checks SQL again on the next request for expiry, revocation, hash removal and payment inconsistency", async t => {
    const { request } = await httpApp(t);
    for (const change of ["expired", "revoked", "removed-token", "unpaid", "missing-payment"]) {
      const item = await create(), visitor = await exchange(item);
      assert.equal((await request("/api/visits/me", undefined, visitor.token)).status, 200);
      if (change === "expired") await db.query("UPDATE VISIT_SESSIONS SET expires_at = UTC_TIMESTAMP() WHERE session_id = ?", [item.id]);
      if (change === "revoked") await db.query("UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", [item.id]);
      if (change === "removed-token") await db.query("UPDATE VISIT_SESSIONS SET token_hash = NULL WHERE session_id = ?", [item.id]);
      if (change === "unpaid") await db.query("UPDATE PAYMENTS SET status = 'PENDING' WHERE session_id = ?", [item.id]);
      if (change === "missing-payment") await db.query("DELETE FROM PAYMENTS WHERE session_id = ?", [item.id]);
      const denied = await request("/api/visits/me", undefined, visitor.token);
      assert.equal(denied.status, 401, change); assert.equal(denied.headers.get("cache-control"), "no-store");
      const text = await denied.text(); assert.equal(text.includes(visitor.token), false);
    }
    const unknown = "tcv_visit_" + "0".repeat(64);
    assert.equal((await request("/api/visits/me", undefined, unknown)).status, 401);
  });
});
