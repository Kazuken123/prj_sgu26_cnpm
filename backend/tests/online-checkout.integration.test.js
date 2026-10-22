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
  const name = "tcv_online_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_test_online:" + randomUUID() + ":", tracked = new Set(), rateKeys = new Set();
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
      redis = {
        ensureOnlineCode: (...args) => { tracked.add(args[0]); return store.ensureOnlineCode(...args); },
        inspectOnlineCode: (...args) => store.inspectOnlineCode(...args),
        removeOnlineCode: (...args) => store.removeOnlineCode(...args),
        consumeLookup: (keys, config) => store.consumeLookup(keys.map(key => { const scoped = prefix + "limit:" + key; rateKeys.add(scoped); return scoped; }), config),
      };
    } else { memory = memoryOnlineRedis(); redis = memory.redis; }
    gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }),
      webhookSecret: () => "online-sql-webhook-test-only-at-least-32-bytes" });
    service = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00",
      onlineExchangeConfig: () => ({ windowSeconds: 60, ipLimit: 1000, sessionLimit: 100 }) });
  });
  after(async () => {
    if (redisAdmin?.isOpen) {
      const owned = [...tracked].map(id => prefix + id).concat([...rateKeys]);
      if (owned.length) await redisAdmin.del(owned); await redisAdmin.disconnect();
    }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_online_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const start = key => service.initializeOnline({}, key);
  const exchange = checkout => service.exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.210");
  const paidCheckout = async () => { const checkout = (await start(randomUUID())).data; await notify(checkout); return checkout; };
  const notify = (checkout, status = "SUCCESS", overrides = {}) => {
    const event = gateway.createWebhook({ paymentRef: checkout.paymentRef, amount: checkout.amount, currency: checkout.currency, status, ...overrides });
    return service.processMockWebhook(event.body, event.signature);
  };
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
    // Expiry only affects the exchange code. Verified late money must still be recorded.
    assert.equal((await notify(first.data)).paymentStatus, "PAID");
    const paid = await snapshot(first.data.sessionId); assert.equal(paid.visits[0].token_hash, null);
    await assert.rejects(exchange(first.data), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
    assert.deepEqual(await snapshot(first.data.sessionId), paid);
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
  it("SQL webhook commits PAID/ACTIVE/audit once, leaves confirmation actor NULL and issues no token", async () => {
    const checkout = (await start(randomUUID())).data, before = await snapshot(checkout.sessionId);
    const result = await notify(checkout), after = await snapshot(checkout.sessionId);
    assert.equal(result.duplicate, false); assert.equal(after.payments[0].status, "PAID"); assert.equal(after.visits[0].status, "ACTIVE");
    assert.equal(after.payments[0].amount, before.payments[0].amount); assert.equal(after.payments[0].payment_ref, before.payments[0].payment_ref);
    assert.equal(after.payments[0].confirmed_by, null); assert.equal(after.visits[0].token_hash, null); assert.equal(after.visits[0].reissue_count, 0);
    assert.equal(after.visits[0].activated_at.getTime(), after.payments[0].paid_at.getTime());
    assert.equal(after.visits[0].expires_at.getTime() - after.payments[0].paid_at.getTime(), 86400000);
    const audits = after.audits.filter(a => a.action === "CONFIRM_ONLINE_PAYMENT" && a.resource_id === checkout.paymentRef);
    assert.equal(audits.length, 1); assert.equal(audits[0].user_id, null); assert.equal(JSON.stringify(audits).includes(checkout.authCode), false);
    assert.equal((await notify(checkout)).duplicate, true); assert.equal((await notify(checkout, "FAILED")).paymentStatus, "PAID");
    assert.deepEqual(await snapshot(checkout.sessionId), after);
  });
  it("SQL repeated FAILED is idempotent, then valid late SUCCESS upgrades the same payment and visit", async () => {
    const checkout = (await start(randomUUID())).data;
    await notify(checkout, "FAILED"); const failed = await snapshot(checkout.sessionId);
    assert.equal(failed.payments[0].status, "FAILED"); assert.equal(failed.payments[0].paid_at, null);
    assert.equal(failed.visits[0].status, "PENDING"); assert.equal(failed.visits[0].expires_at, null);
    assert.equal((await notify(checkout, "FAILED")).duplicate, true); assert.deepEqual(await snapshot(checkout.sessionId), failed);
    await notify(checkout); const paid = await snapshot(checkout.sessionId);
    assert.equal(paid.payments.length, 1); assert.equal(paid.visits.length, 1); assert.equal(paid.payments[0].status, "PAID");
    const audit = paid.audits.find(a => a.action === "CONFIRM_ONLINE_PAYMENT" && a.resource_id === checkout.paymentRef);
    assert.equal(JSON.parse(audit.details).previousStatus, "FAILED");
  });
  it("20 concurrent SUCCESS/FAILED SQL callbacks from two Stores activate once and never downgrade PAID", async () => {
    const checkout = (await start(randomUUID())).data, second = new PaymentService(new PaymentStore(db), redis, { gateway });
    await Promise.all(Array.from({ length: 20 }, (_, i) => {
      const event = gateway.createWebhook({ paymentRef: checkout.paymentRef, amount: checkout.amount, currency: "VND", status: i % 2 ? "SUCCESS" : "FAILED" });
      return (i % 2 ? service : second).processMockWebhook(event.body, event.signature);
    }));
    const paid = await snapshot(checkout.sessionId);
    assert.equal(paid.payments[0].status, "PAID"); assert.equal(paid.visits[0].status, "ACTIVE");
    assert.equal(paid.audits.filter(a => a.action === "CONFIRM_ONLINE_PAYMENT" && a.resource_id === checkout.paymentRef).length, 1);
    assert.ok(paid.audits.filter(a => a.action === "FAIL_ONLINE_PAYMENT" && a.resource_id === checkout.paymentRef).length <= 1);
  });
  it("invalid signature, mismatched money, unknown/CASH or unprepared references cannot alter SQL", async () => {
    const checkout = (await start(randomUUID())).data, before = await snapshot(checkout.sessionId), event = gateway.createWebhook({
      paymentRef: checkout.paymentRef, amount: checkout.amount, currency: "VND", status: "SUCCESS" });
    await assert.rejects(service.processMockWebhook(event.body, "sha256=" + "0".repeat(64)), { code: "INVALID_WEBHOOK_SIGNATURE" });
    await assert.rejects(notify(checkout, "SUCCESS", { amount: "50001.00" }), { code: "WEBHOOK_PAYMENT_MISMATCH" });
    await assert.rejects(notify(checkout, "SUCCESS", { paymentRef: randomUUID() }), { code: "WEBHOOK_PAYMENT_NOT_FOUND" });
    assert.deepEqual(await snapshot(checkout.sessionId), before);
    const cash = (await service.initialize({ paymentMethod: "CASH" }, randomUUID())).data;
    await assert.rejects(notify(cash), { code: "WEBHOOK_ONLINE_REQUIRED" });
    const unprepared = (await service.initialize({ paymentMethod: "ONLINE" }, randomUUID())).data;
    await assert.rejects(notify(unprepared), { code: "ONLINE_CHECKOUT_NOT_PREPARED" });
  });
  it("payment/visit/audit SQL failures roll back together and retry records money exactly once", async () => {
    for (const table of ["PAYMENTS", "VISIT_SESSIONS", "AUDIT_LOGS"]) {
      const checkout = (await start(randomUUID())).data, before = await snapshot(checkout.sessionId);
      const operation = table === "AUDIT_LOGS" ? "INSERT" : "UPDATE";
      await db.query("CREATE TRIGGER online_webhook_failure BEFORE " + operation + " ON " + table + " FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced webhook SQL failure'");
      try { await assert.rejects(notify(checkout), { code: "WEBHOOK_PERSISTENCE_UNAVAILABLE" }); }
      finally { await db.query("DROP TRIGGER online_webhook_failure"); }
      assert.deepEqual(await snapshot(checkout.sessionId), before);
      assert.equal((await notify(checkout)).duplicate, false); assert.equal((await notify(checkout)).duplicate, true);
    }
  });
  it("lost webhook commit acknowledgement and revoked/expired paid visits never renew or reactivate", async () => {
    const checkout = (await start(randomUUID())).data, original = service.store;
    service.store = Object.create(original);
    service.store.withOnlineWebhook = async (...args) => { await original.withOnlineWebhook(...args); throw new Error("commit response lost"); };
    try { await assert.rejects(notify(checkout), { code: "WEBHOOK_PERSISTENCE_UNAVAILABLE" }); }
    finally { service.store = original; }
    const paid = await snapshot(checkout.sessionId); assert.equal((await notify(checkout)).duplicate, true); assert.deepEqual(await snapshot(checkout.sessionId), paid);
    await db.query("UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", [checkout.sessionId]);
    const revoked = await snapshot(checkout.sessionId); assert.equal((await notify(checkout)).sessionStatus, "REVOKED"); assert.deepEqual(await snapshot(checkout.sessionId), revoked);
    await db.query("UPDATE VISIT_SESSIONS SET status = 'ACTIVE', expires_at = '2020-01-01 00:00:00' WHERE session_id = ?", [checkout.sessionId]);
    const expired = await snapshot(checkout.sessionId); await notify(checkout); assert.deepEqual(await snapshot(checkout.sessionId), expired);
  });
  it("webhook can persist valid late payment while Redis is unavailable without creating replacement credentials", async () => {
    const checkout = (await start(randomUUID())).data; await forget(checkout.sessionId);
    service.redis = new Proxy({}, { get: () => { throw new Error("Redis unavailable"); } });
    try { assert.equal((await notify(checkout)).paymentStatus, "PAID"); } finally { service.redis = redis; }
    const paid = await snapshot(checkout.sessionId); assert.equal(paid.visits[0].token_hash, null);
    assert.equal(await stored(checkout.sessionId) ?? null, null);
  });
  it("HTTP/operator mock tool demonstrates FAILED then SUCCESS with real SQL and signed raw requests", async t => {
    const { createApp } = require("../server"), { runMockPayment } = require("../scripts/mock-payment");
    const server = http.createServer(createApp({ paymentService: service }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`, previous = gateway.config;
    gateway.config = () => ({ provider: "MOCK", publicBaseUrl: base });
    t.after(async () => { gateway.config = previous; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const response = await fetch(base + "/api/payments/online-checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: "{}" });
    assert.equal(response.status, 201); const checkout = (await response.json()).data;
    const failed = await runMockPayment([checkout.paymentRef, "FAILED"], { gateway }); assert.equal(failed.paymentStatus, "FAILED");
    const success = await runMockPayment([checkout.paymentRef, "SUCCESS"], { gateway }); assert.equal(success.paymentStatus, "PAID");
    assert.equal((await runMockPayment([checkout.paymentRef, "FAILED"], { gateway })).paymentStatus, "PAID");
    const before = await snapshot(checkout.sessionId);
    assert.equal((await fetch(checkout.paymentUrl + "?result=FAILED")).status, 200); assert.deepEqual(await snapshot(checkout.sessionId), before);
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + checkout.authCode } })).status, 401);
  });
  it("SQL online exchange stores one token hash/audit and preserves paid money, activation and original ticket expiry", async () => {
    const checkout = await paidCheckout(), before = await snapshot(checkout.sessionId), result = await exchange(checkout), after = await snapshot(checkout.sessionId);
    assert.deepEqual(after.payments, before.payments);
    assert.deepEqual(after.visits.map(row => ({ ...row, token_hash: null })), before.visits);
    assert.equal(after.visits[0].token_hash, require("node:crypto").createHash("sha256").update(result.token).digest("hex"));
    assert.equal(result.expiresAt.getTime(), before.visits[0].expires_at.getTime());
    const audits = after.audits.filter(a => a.action === "ISSUE_VISITOR_TOKEN" && a.resource_id === checkout.sessionId);
    assert.equal(audits.length, 1); assert.equal(audits[0].user_id, null);
    assert.equal(JSON.stringify(after).includes(result.token), false); assert.equal(JSON.stringify(audits).includes(checkout.authCode), false);
    assert.equal(await stored(checkout.sessionId) ?? null, null);
    assert.equal((await service.authenticateVisitor(result.token)).sessionId, checkout.sessionId);
    await assert.rejects(exchange(checkout), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    await notify(checkout); await notify(checkout, "FAILED"); assert.deepEqual(await snapshot(checkout.sessionId), after);
  });
  it("20 online exchanges across two Stores yield exactly one token/audit even after duplicate callbacks", async () => {
    const checkout = await paidCheckout(), second = new PaymentService(new PaymentStore(db), redis, { gateway,
      onlineExchangeConfig: () => ({ windowSeconds: 60, ipLimit: 1000, sessionLimit: 100 }) });
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => (i % 2 ? service : second).exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.211")));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.filter(r => r.status === "rejected" && r.reason.code === "VISIT_TOKEN_ALREADY_ISSUED").length, 19);
    const after = await snapshot(checkout.sessionId);
    assert.equal(after.audits.filter(a => a.action === "ISSUE_VISITOR_TOKEN" && a.resource_id === checkout.sessionId).length, 1);
  });
  it("pending and failed attempts preserve online code, wrong/cross-session/CASH attempts cannot acquire rights", async () => {
    const checkout = (await start(randomUUID())).data, record = await stored(checkout.sessionId);
    await assert.rejects(exchange(checkout), { code: "ONLINE_PAYMENT_PENDING" });
    assert.deepEqual(await stored(checkout.sessionId), record);
    await notify(checkout, "FAILED"); await assert.rejects(exchange(checkout), { code: "ONLINE_PAYMENT_NOT_PAID" });
    assert.deepEqual(await stored(checkout.sessionId), record);
    await notify(checkout);
    await assert.rejects(service.exchangeOnlineCode(checkout.sessionId, { authCode: "0".repeat(64) }, "192.0.2.212"), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
    const other = await paidCheckout();
    await assert.rejects(service.exchangeOnlineCode(other.sessionId, { authCode: checkout.authCode }, "192.0.2.212"), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
    const cash = (await service.initialize({ paymentMethod: "CASH" }, randomUUID())).data;
    await assert.rejects(service.exchangeOnlineCode(cash.sessionId, { authCode: checkout.authCode }, "192.0.2.212"), { code: "ONLINE_PAYMENT_REQUIRED" });
    assert.deepEqual(await stored(checkout.sessionId), record); assert.ok((await exchange(checkout)).token);
  });
  it("token-hash update and audit SQL errors roll back and retain the unconsumed online code", async () => {
    for (const table of ["VISIT_SESSIONS", "AUDIT_LOGS"]) {
      const checkout = await paidCheckout(), record = await stored(checkout.sessionId), before = await snapshot(checkout.sessionId);
      const operation = table === "AUDIT_LOGS" ? "INSERT" : "UPDATE";
      await db.query("CREATE TRIGGER online_exchange_failure BEFORE " + operation + " ON " + table + " FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced token SQL failure'");
      try { await assert.rejects(exchange(checkout), { code: "ONLINE_EXCHANGE_PERSISTENCE_UNAVAILABLE" }); }
      finally { await db.query("DROP TRIGGER online_exchange_failure"); }
      assert.deepEqual(await snapshot(checkout.sessionId), before); assert.deepEqual(await stored(checkout.sessionId), record);
      assert.ok((await exchange(checkout)).token);
    }
  });
  it("missing online code or Redis outage cannot mint token or reset a PAID visit", async () => {
    const checkout = await paidCheckout(), before = await snapshot(checkout.sessionId);
    service.redis = { ...redis, inspectOnlineCode: async () => { throw new Error("inspection outage"); } };
    try { await assert.rejects(exchange(checkout), { code: "ONLINE_CODE_UNAVAILABLE" }); } finally { service.redis = redis; }
    assert.deepEqual(await snapshot(checkout.sessionId), before);
    await forget(checkout.sessionId); await assert.rejects(exchange(checkout), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
    assert.deepEqual(await snapshot(checkout.sessionId), before);
  });
  it("cleanup failure after SQL commit or a lost commit acknowledgement cannot issue a second online token", async () => {
    const checkout = await paidCheckout(); service.redis = { ...redis, removeOnlineCode: async () => { throw new Error("cleanup outage"); } };
    let result;
    try { result = await exchange(checkout); } finally { service.redis = redis; }
    assert.ok(result.token); assert.ok(await stored(checkout.sessionId)); const first = await snapshot(checkout.sessionId);
    await assert.rejects(exchange(checkout), { code: "VISIT_TOKEN_ALREADY_ISSUED" }); assert.deepEqual(await snapshot(checkout.sessionId), first);
    const lost = await paidCheckout(), original = service.store;
    service.store = Object.create(original);
    service.store.withOnlineTokenExchange = async (...args) => { await original.withOnlineTokenExchange(...args); throw new Error("commit reply lost"); };
    try { await assert.rejects(exchange(lost), { code: "ONLINE_EXCHANGE_PERSISTENCE_UNAVAILABLE" }); } finally { service.store = original; }
    const saved = await snapshot(lost.sessionId); await assert.rejects(exchange(lost), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
    assert.deepEqual(await snapshot(lost.sessionId), saved);
  });
  it("a code expiring after Redis read is refused by conditional SQL without erasing paid state", async () => {
    const short = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00", onlineCodeTtlMs: () => 3000 });
    const checkout = (await short.initializeOnline({}, randomUUID())).data; await notify(checkout); const before = await snapshot(checkout.sessionId);
    service.redis = { ...redis, inspectOnlineCode: async (...args) => { const record = await redis.inspectOnlineCode(...args); assert.ok(record);
      await new Promise(resolve => setTimeout(resolve, 3200)); return record; } };
    try { await assert.rejects(exchange(checkout), { code: "ONLINE_EXCHANGE_CHANGED" }); } finally { service.redis = redis; }
    assert.deepEqual(await snapshot(checkout.sessionId), before);
  });
  it("online exchange default rate budgets reject the sixth session attempt and the 31st IP attempt", async () => {
    const checkout = await paidCheckout(), limited = new PaymentService(new PaymentStore(db), redis, { gateway });
    for (let i = 0; i < 5; i++) await assert.rejects(limited.exchangeOnlineCode(checkout.sessionId, { authCode: "0".repeat(64) }, "192.0.2.220"), { status: 401 });
    await assert.rejects(limited.exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.221"), { status: 429 });
    for (let i = 0; i < 30; i++) await assert.rejects(limited.exchangeOnlineCode(randomUUID(), { authCode: checkout.authCode }, "192.0.2.222"), { status: 404 });
    await assert.rejects(limited.exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.222"), { status: 429 });
    assert.equal((await snapshot(checkout.sessionId)).visits[0].token_hash, null);
  });
  it("browser simulation HTTP with SQL/Redis preserves pending refusal, failure, duplicate safety and one-time guest access", async t => {
    const { createApp } = require("../server");
    const demo = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00", simulationEnabled: () => true,
      lookupConfig: () => ({ windowSeconds: 60, ipLimit: 100, sessionLimit: 100 }) });
    const server = http.createServer(createApp({ paymentService: demo }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (route, body) => fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const checkout = (await demo.initializeOnline({}, randomUUID())).data;
    const exchangePath = `/api/payments/sessions/${checkout.sessionId}/exchange-online-code`;
    const simulatePath = `/api/payments/mock-checkout/${checkout.paymentRef}/pay`;
    assert.equal((await post(exchangePath, { authCode: checkout.authCode })).status, 409);
    assert.equal((await post(simulatePath, {})).status, 400);
    demo.simulationEnabled = () => false;
    assert.equal((await post(simulatePath, { status: "SUCCESS" })).status, 404);
    demo.simulationEnabled = () => true;
    const savedRedis = demo.redis;
    demo.redis = { ...redis, consumeLookup: async () => { throw new Error("forced outage"); } };
    assert.equal((await post(simulatePath, { status: "SUCCESS" })).status, 503);
    demo.redis = savedRedis;
    assert.equal((await snapshot(checkout.sessionId)).payments[0].status, "PENDING");
    assert.equal((await (await post(simulatePath, { status: "FAILED" })).json()).data.paymentStatus, "FAILED");
    assert.equal((await post(exchangePath, { authCode: checkout.authCode })).status, 409);
    const results = await Promise.all(Array.from({ length: 10 }, async () => {
      const response = await post(simulatePath, { status: "SUCCESS" });
      assert.equal(response.status, 200); return (await response.json()).data;
    }));
    assert.equal(results.filter(result => !result.duplicate).length, 1);
    const paid = await snapshot(checkout.sessionId);
    assert.equal(paid.audits.filter(row => row.resource_id === checkout.paymentRef && row.action === "CONFIRM_ONLINE_PAYMENT").length, 1);
    const issued = await post(exchangePath, { authCode: checkout.authCode });
    assert.equal(issued.status, 200); const visitor = (await issued.json()).data;
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + visitor.token } })).status, 200);
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer invalid" } })).status, 401);
    assert.equal((await post(exchangePath, { authCode: checkout.authCode })).status, 409);
  });
  it("full HTTP ONLINE flow reaches protected guest API only after valid webhook and one-time code exchange", async t => {
    const { createApp } = require("../server"), { runMockPayment } = require("../scripts/mock-payment");
    const { createFixture, staff } = require("./helpers/auth.fixture");
    const auth = createFixture(); await auth.addStaff(); const staffToken = (await auth.service.login(staff)).accessToken;
    const server = http.createServer(createApp({ paymentService: service, authService: auth.service }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`, previous = gateway.config; gateway.config = () => ({ provider: "MOCK", publicBaseUrl: base });
    t.after(async () => { gateway.config = previous; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const created = await fetch(base + "/api/payments/online-checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: "{}" });
    assert.equal(created.status, 201); const checkout = (await created.json()).data;
    const send = () => fetch(base + `/api/payments/sessions/${checkout.sessionId}/exchange-online-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authCode: checkout.authCode }) });
    assert.equal((await send()).status, 409); assert.ok(await stored(checkout.sessionId));
    await runMockPayment([checkout.paymentRef, "FAILED"], { gateway }); assert.equal((await send()).status, 409);
    await runMockPayment([checkout.paymentRef, "SUCCESS"], { gateway });
    const exchanged = await send(); assert.equal(exchanged.status, 200); assert.equal(exchanged.headers.get("cache-control"), "no-store"); const visitor = (await exchanged.json()).data;
    const me = await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + visitor.token } });
    assert.equal(me.status, 200); assert.deepEqual((await me.json()).data, { sessionId: checkout.sessionId, status: "ACTIVE", expiresAt: visitor.expiresAt });
    assert.equal((await send()).status, 409);
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + staffToken } })).status, 401);
    assert.equal((await fetch(base + "/api/auth/me", { headers: { Authorization: "Bearer " + visitor.token } })).status, 401);
    assert.equal((await fetch(base + `/api/admin/payments/sessions/${checkout.sessionId}`, { headers: { Authorization: "Bearer " + visitor.token } })).status, 401);
    const before = await snapshot(checkout.sessionId); await runMockPayment([checkout.paymentRef, "FAILED"], { gateway });
    assert.deepEqual(await snapshot(checkout.sessionId), before);
    await db.query("UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", [checkout.sessionId]);
    assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + visitor.token } })).status, 401);
  });
});
