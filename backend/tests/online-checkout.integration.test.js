const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const MockGateway = require("../adapters/mock-gateway");
const utcPool = require("../config/utc-pool");
const { memoryOnlineRedis } = require("./helpers/online-checkout.fixture");
const realRedis = process.env.RUN_REDIS_TESTS === "1";

describe("ONLINE checkout SQL / " + (realRedis ? "real Redis" : "Redis replacement"), { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_online_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_test_online:" + randomUUID() + ":", tracked = new Set();
  let admin, db, redisAdmin, redis, memory, service, gateway;
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config);
    assert.match(name, /^tcv_online_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, connectionLimit: 12, multipleStatements: true }));
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    if (realRedis) {
      redisAdmin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
      redisAdmin.on("error", () => {}); await redisAdmin.connect();
      const store = new RedisStore({ onlineCodePrefix: prefix });
      redis = { ensureOnlineCode: (...args) => { tracked.add(args[0]); return store.ensureOnlineCode(...args); } };
    } else { memory = memoryOnlineRedis(); redis = memory.redis; }
    gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }) });
    service = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00" });
  });
  after(async () => {
    if (redisAdmin?.isOpen) { if (tracked.size) await redisAdmin.del([...tracked].map(id => prefix + id)); await redisAdmin.disconnect(); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_online_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const start = key => service.initializeOnline({}, key);
  const stored = async id => realRedis ? JSON.parse(await redisAdmin.get(prefix + id)) : structuredClone(memory.state.codes.get(id));
  const forget = async id => { if (realRedis) await redisAdmin.del(prefix + id); else memory.state.codes.delete(id); };
  async function snapshot(id) {
    const [payments] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [id]);
    const [visits] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [id]);
    const [audits] = await db.query("SELECT * FROM AUDIT_LOGS ORDER BY log_id");
    return { payments, visits, audits };
  }
  it("SQL stores one pending payment/visit, immutable deadline and non-secret preparation/ready audits", async () => {
    const key = randomUUID(), result = await start(key), id = result.data.sessionId, all = await snapshot(id), code = await stored(id);
    assert.equal(all.payments.length, 1); assert.equal(all.visits.length, 1);
    assert.equal(all.payments[0].status, "PENDING"); assert.equal(all.payments[0].paid_at, null); assert.equal(all.payments[0].confirmed_by, null);
    assert.equal(all.visits[0].status, "PENDING"); assert.equal(all.visits[0].activated_at, null); assert.equal(all.visits[0].expires_at, null); assert.equal(all.visits[0].token_hash, null);
    assert.equal(code.authCode, result.data.authCode); assert.equal(code.expiresAtMs, result.data.codeExpiresAt.getTime());
    const prepare = all.audits.find(a => a.action === "PREPARE_ONLINE_CHECKOUT" && a.resource_id === result.data.paymentRef);
    assert.deepEqual(JSON.parse(prepare.details), { sessionId: id, issueId: code.issueId, expiresAtMs: code.expiresAtMs });
    assert.equal(all.audits.filter(a => a.action === "ONLINE_CHECKOUT_READY" && a.resource_id === code.issueId).length, 1);
    assert.equal(JSON.stringify(all).includes(result.data.authCode), false); assert.equal(JSON.stringify(all).includes(key), false);
    assert.equal((await service.mockCheckout(result.data.paymentRef)).paymentStatus, "PENDING");
    assert.deepEqual(await snapshot(id), all);
  });
  it("20 concurrent retries across two Store instances reuse one request, code, URL and setup audit pair", async () => {
    const key = randomUUID(), second = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00" });
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? service : second).initializeOnline({}, key)));
    assert.equal(results.filter(r => r.created).length, 1);
    assert.equal(new Set(results.map(r => r.data.sessionId)).size, 1);
    assert.equal(new Set(results.map(r => r.data.authCode)).size, 1);
    assert.equal(new Set(results.map(r => r.data.paymentUrl)).size, 1);
    assert.equal(new Set(results.map(r => r.data.codeExpiresAt.toISOString())).size, 1);
    const result = results[0], all = await snapshot(result.data.sessionId), code = await stored(result.data.sessionId);
    assert.equal(all.audits.filter(a => a.action === "PREPARE_ONLINE_CHECKOUT" && a.resource_id === result.data.paymentRef).length, 1);
    assert.equal(all.audits.filter(a => a.action === "ONLINE_CHECKOUT_READY" && a.resource_id === code.issueId).length, 1);
  });
  it("configuration changes after issuance do not change price, TTL, code or pending rows", async () => {
    const key = randomUUID(), first = await start(key), before = await snapshot(first.data.sessionId);
    const changed = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "99999.00", onlineCodeTtlMs: () => 3600000 });
    assert.deepEqual((await changed.initializeOnline({}, key)).data, first.data); assert.deepEqual(await snapshot(first.data.sessionId), before);
  });
  it("issued code removed from Redis is not re-created and payment is retained", async () => {
    const key = randomUUID(), first = await start(key), before = await snapshot(first.data.sessionId);
    await forget(first.data.sessionId);
    await assert.rejects(start(key), { code: "ONLINE_CODE_MISSING" });
    assert.deepEqual(await snapshot(first.data.sessionId), before); assert.equal(await stored(first.data.sessionId) ?? null, null);
  });
  it("expired checkout stays PENDING and cannot gain a new deadline", async () => {
    const key = randomUUID(), short = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00", onlineCodeTtlMs: () => 3000 });
    const first = await short.initializeOnline({}, key), before = await snapshot(first.data.sessionId);
    await new Promise(resolve => setTimeout(resolve, 3200));
    await assert.rejects(start(key), { code: "ONLINE_CODE_EXPIRED" }); assert.deepEqual(await snapshot(first.data.sessionId), before);
  });
  it("failed first Redis write retains a committed deadline and can complete setup within that deadline", async () => {
    const key = randomUUID(); service.redis = { ensureOnlineCode: async () => { throw new Error("unavailable"); } };
    try { await assert.rejects(start(key), { code: "ONLINE_CODE_UNAVAILABLE" }); } finally { service.redis = redis; }
    const pending = await service.initialize({ paymentMethod: "ONLINE" }, key), before = await snapshot(pending.data.sessionId);
    const prepare = before.audits.find(a => a.action === "PREPARE_ONLINE_CHECKOUT" && a.resource_id === pending.data.paymentRef);
    const result = await start(key); assert.equal(result.data.codeExpiresAt.getTime(), JSON.parse(prepare.details).expiresAtMs);
    const after = await snapshot(pending.data.sessionId); assert.deepEqual(after.payments, before.payments); assert.deepEqual(after.visits, before.visits);
  });
  it("prepare audit failure cannot publish a code or URL and retry reuses the same pending payment", async () => {
    const key = randomUUID(), pending = await service.initialize({ paymentMethod: "ONLINE" }, key), before = await snapshot(pending.data.sessionId);
    await db.query("CREATE TRIGGER online_audit_failure BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(start(key), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" }); }
    finally { await db.query("DROP TRIGGER online_audit_failure"); }
    assert.deepEqual(await snapshot(pending.data.sessionId), before); assert.equal(await stored(pending.data.sessionId) ?? null, null);
    assert.equal((await start(key)).data.sessionId, pending.data.sessionId);
  });
  it("ready-audit rollback reuses existing Redis code and original preparation on retry", async () => {
    const key = randomUUID(); service.redis = { ensureOnlineCode: async () => { throw new Error("prepare only"); } };
    try { await assert.rejects(start(key), { code: "ONLINE_CODE_UNAVAILABLE" }); } finally { service.redis = redis; }
    await db.query("CREATE TRIGGER online_ready_failure BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced ready audit failure'");
    try { await assert.rejects(start(key), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" }); }
    finally { await db.query("DROP TRIGGER online_ready_failure"); }
    const pending = await service.initialize({ paymentMethod: "ONLINE" }, key), record = await stored(pending.data.sessionId), before = await snapshot(pending.data.sessionId);
    const retry = await start(key); assert.equal(retry.data.authCode, record.authCode); assert.equal(retry.data.codeExpiresAt.getTime(), record.expiresAtMs);
    const after = await snapshot(pending.data.sessionId); assert.deepEqual(after.payments, before.payments); assert.deepEqual(after.visits, before.visits);
  });
  it("lost Redis reply and lost ready commit response recover without another order or changed credentials", async () => {
    const key = randomUUID(); service.redis = { ensureOnlineCode: async (...args) => { await redis.ensureOnlineCode(...args); throw new Error("reply lost"); } };
    try { await assert.rejects(start(key), { code: "ONLINE_CODE_UNAVAILABLE" }); } finally { service.redis = redis; }
    const pending = await service.initialize({ paymentMethod: "ONLINE" }, key), record = await stored(pending.data.sessionId);
    const originalStore = service.store;
    service.store = Object.create(originalStore);
    service.store.withOnlineCheckout = async (...args) => {
      const result = await originalStore.withOnlineCheckout(...args);
      if (result?.authCode) throw new Error("ready commit response lost"); return result;
    };
    try { await assert.rejects(start(key), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" }); } finally { service.store = originalStore; }
    const before = await snapshot(pending.data.sessionId), retry = await start(key);
    assert.equal(retry.data.authCode, record.authCode); assert.deepEqual(await snapshot(pending.data.sessionId), before);
  });
  it("gateway timeout preserves pending SQL/Redis state and another request can retry the existing checkout", async () => {
    const key = randomUUID(), original = gateway.createCheckout.bind(gateway); service.gatewayTimeoutMs = 30;
    gateway.createCheckout = async () => new Promise(() => {});
    try { await assert.rejects(start(key), { code: "ONLINE_GATEWAY_UNAVAILABLE" }); }
    finally { gateway.createCheckout = original; service.gatewayTimeoutMs = 2000; }
    const pending = await service.initialize({ paymentMethod: "ONLINE" }, key), record = await stored(pending.data.sessionId);
    const result = await start(key); assert.equal(result.data.authCode, record.authCode);
  });
  it("cash, failed, paid, activated and revoked records cannot be reset by the checkout endpoint", async () => {
    const cashKey = randomUUID(); await service.initialize({ paymentMethod: "CASH" }, cashKey);
    await assert.rejects(start(cashKey), { code: "REQUEST_KEY_CONFLICT" });
    for (const change of ["FAILED", "PAID", "ACTIVE", "REVOKED"]) {
      const key = randomUUID(), pending = await service.initialize({ paymentMethod: "ONLINE" }, key);
      if (["FAILED", "PAID"].includes(change)) await db.query("UPDATE PAYMENTS SET status = ? WHERE session_id = ?", [change, pending.data.sessionId]);
      else await db.query("UPDATE VISIT_SESSIONS SET status = ? WHERE session_id = ?", [change, pending.data.sessionId]);
      const before = await snapshot(pending.data.sessionId); await assert.rejects(start(key), { code: "ONLINE_CHECKOUT_NOT_PENDING" });
      assert.deepEqual(await snapshot(pending.data.sessionId), before);
    }
  });
  it("HTTP mock checkout URL is read-only even with forged redirect outcomes and cannot grant guest access", async t => {
    const { createApp } = require("../server");
    const server = http.createServer(createApp({ paymentService: service }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`, previous = gateway.config;
    gateway.config = () => ({ provider: "MOCK", publicBaseUrl: base });
    t.after(async () => { gateway.config = previous; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const key = randomUUID(), post = () => fetch(base + "/api/payments/online-checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: "{}" });
    const first = await post(); assert.equal(first.status, 201); assert.equal(first.headers.get("cache-control"), "no-store"); const data = (await first.json()).data;
    assert.equal((await post()).status, 200); const before = await snapshot(data.sessionId);
    for (const outcome of ["SUCCESS", "FAILED"]) {
      const response = await fetch(data.paymentUrl + "?result=" + outcome); assert.equal(response.status, 200);
      const text = await response.text(); assert.equal(text.includes(data.authCode), false); assert.equal(JSON.parse(text).data.paymentStatus, "PENDING");
    }
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + data.authCode } })).status, 401);
    assert.deepEqual(await snapshot(data.sessionId), before);
  });
});
