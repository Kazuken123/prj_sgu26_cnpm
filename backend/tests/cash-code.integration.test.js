const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const { PaymentService } = require("../services/payment.service");
const useRealRedis = process.env.RUN_REDIS_TESTS === "1";
describe("Cash code SQL transactions / " + (useRealRedis ? "real Redis" : "Redis replacement"), { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_cash_code_test_" + randomUUID().replaceAll("-", "");
  const prefix = "tcv_test_cash_code:" + randomUUID() + ":";
  const tracked = new Set(), codes = new Map();
  let admin, db, redisAdmin, redisStore, service, staff, manager;
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_cash_code_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 12 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    for (const role of ["STAFF", "ADMIN"]) {
      const [insert] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES (?, 'test-only', ?, 'ACTIVE')", [role.toLowerCase() + "@cash-code.invalid", role]);
      const actor = { userId: insert.insertId, role, status: "ACTIVE" }; if (role === "STAFF") staff = actor; else manager = actor;
    }
    if (useRealRedis) {
      redisAdmin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
      redisAdmin.on("error", () => {}); await redisAdmin.connect();
      redisStore = new RedisStore({ cashCodePrefix: prefix });
    } else {
      redisStore = { ensureCashCode: async (id, candidate) => {
        const old = codes.get(id);
        if (old && old.expiresAtMs > Date.now()) return { created: false, record: structuredClone(old) };
        codes.set(id, structuredClone(candidate)); return { created: true, record: structuredClone(candidate) };
      } };
    }
    service = new PaymentService(new PaymentStore(db), redisStore, { price: () => "50000.00", cashCodeTtlMs: () => 600000 });
  });
  after(async () => {
    if (redisAdmin?.isOpen) { if (tracked.size) await redisAdmin.del([...tracked].map(id => prefix + id)); await redisAdmin.disconnect(); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_cash_code_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const create = async (method = "CASH", paid = true) => {
    const id = (await service.initialize({ paymentMethod: method }, randomUUID())).data.sessionId; tracked.add(id);
    if (paid) await service.confirmCash(staff, id);
    return id;
  };
  const stored = async id => useRealRedis ? JSON.parse(await redisAdmin.get(prefix + id)) : structuredClone(codes.get(id));
  const forget = async id => { if (useRealRedis) await redisAdmin.del(prefix + id); else codes.delete(id); };
  const snapshot = async id => {
    const [payment] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [id]);
    const [visit] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [id]);
    const [audit] = await db.query("SELECT * FROM AUDIT_LOGS ORDER BY log_id");
    return { payment, visit, audit };
  };
  it("issue after confirmation writes only code audit, preserving paid amount, timestamps and token hash", async () => {
    const id = await create(), before = await snapshot(id);
    const response = await service.issueCashCode(staff, id, {}, { ipAddress: "127.0.0.1" });
    const record = await stored(id), after = await snapshot(id), audit = after.audit.at(-1);
    assert.deepEqual(after.payment, before.payment); assert.deepEqual(after.visit, before.visit);
    assert.equal(after.audit.length, before.audit.length + 1); assert.equal(audit.user_id, staff.userId);
    assert.equal(audit.action, "ISSUE_CASH_CODE"); assert.equal(audit.resource_id, record.issueId); assert.equal(audit.ip_address, "127.0.0.1");
    assert.equal(JSON.stringify(audit).includes(record.authCode), false);
    assert.deepEqual(JSON.parse(audit.details), { sessionId: id, paymentRef: before.payment[0].payment_ref, codeExpiresAt: response.codeExpiresAt.toISOString() });
    assert.equal(record.sessionId, id); assert.equal(record.shortedCode, response.shortedCode);
    assert.match(record.authCode, /^[a-f0-9]{64}$/); assert.match(response.shortedCode, /^\d{6}$/);
    assert.equal(response.codeExpiresAt.getTime(), record.expiresAtMs);
    assert.equal(after.visit[0].token_hash, null);
  });
  it("12 concurrent requests from two accounts return one code and create one code audit", async () => {
    const id = await create(), before = await snapshot(id);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => service.issueCashCode(i % 2 ? staff : manager, id)));
    assert.equal(results.filter(row => !row.reused).length, 1);
    assert.equal(new Set(results.map(row => row.shortedCode)).size, 1);
    assert.equal(new Set(results.map(row => row.codeExpiresAt.toISOString())).size, 1);
    const after = await snapshot(id); assert.deepEqual(after.payment, before.payment); assert.deepEqual(after.visit, before.visit);
    assert.equal(after.audit.length, before.audit.length + 1);
    assert.equal(after.audit.at(-1).resource_id, (await stored(id)).issueId);
  });
  it("Redis outage after money commit returns 503, retains PAID and supports retry on the same visit", async () => {
    const id = await create(), before = await snapshot(id);
    service.redis = { ensureCashCode: async () => { throw new Error("unavailable"); } };
    try { await assert.rejects(service.issueCashCode(staff, id), { code: "CASH_CODE_UNAVAILABLE", status: 503 }); }
    finally { service.redis = redisStore; }
    assert.deepEqual(await snapshot(id), before);
    const response = await service.issueCashCode(staff, id); assert.equal(response.reused, false);
    const after = await snapshot(id); assert.deepEqual(after.payment, before.payment); assert.deepEqual(after.visit, before.visit);
  });
  it("reply lost after Redis write reuses stored code and writes audit once on retry", async () => {
    const id = await create(), before = await snapshot(id);
    service.redis = { ensureCashCode: async (...args) => { await redisStore.ensureCashCode(...args); throw new Error("lost Redis reply"); } };
    try { await assert.rejects(service.issueCashCode(staff, id), { code: "CASH_CODE_UNAVAILABLE" }); }
    finally { service.redis = redisStore; }
    const original = await stored(id); assert.deepEqual(await snapshot(id), before);
    const retry = await service.issueCashCode(manager, id);
    assert.equal(retry.reused, true); assert.equal(retry.shortedCode, original.shortedCode); assert.deepEqual(await stored(id), original);
    const after = await snapshot(id); assert.equal(after.audit.length, before.audit.length + 1);
    await service.issueCashCode(staff, id); assert.deepEqual(await snapshot(id), after);
  });
  it("audit rollback leaves money intact; retry repairs missing audit for the existing Redis code", async () => {
    const id = await create(), before = await snapshot(id);
    await db.query("CREATE TRIGGER cash_code_audit_failure BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(service.issueCashCode(staff, id), { code: "CASH_CODE_PERSISTENCE_UNAVAILABLE", status: 503 }); }
    finally { await db.query("DROP TRIGGER cash_code_audit_failure"); }
    assert.deepEqual(await snapshot(id), before); const original = await stored(id);
    const retried = await service.issueCashCode(staff, id);
    assert.equal(retried.reused, true); assert.equal(retried.shortedCode, original.shortedCode);
    assert.deepEqual(await stored(id), original);
    const after = await snapshot(id); assert.equal(after.audit.length, before.audit.length + 1);
    await service.issueCashCode(manager, id); assert.deepEqual(await snapshot(id), after);
  });
  it("a missing or expired Redis record can be recreated before token issuance without extending the ticket", async () => {
    const id = await create(), first = await service.issueCashCode(staff, id), old = await stored(id), before = await snapshot(id);
    // Force disappearance of the temporary key; exact TTL expiry is tested in redis-cash-code.test.js.
    await forget(id);
    const second = await service.issueCashCode(staff, id), current = await stored(id);
    assert.equal(second.reused, false); assert.notEqual(current.issueId, old.issueId); assert.notEqual(current.authCode, old.authCode);
    assert.equal(second.visitExpiresAt.getTime(), first.visitExpiresAt.getTime());
    const after = await snapshot(id); assert.deepEqual(after.payment, before.payment); assert.deepEqual(after.visit, before.visit);
    assert.equal(after.audit.length, before.audit.length + 1);
    await db.query("UPDATE VISIT_SESSIONS SET token_hash = ? WHERE session_id = ?", ["b".repeat(64), id]);
    await forget(id);
    await assert.rejects(service.issueCashCode(staff, id), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  });
  it("code expiry is capped at saved ticket expiry and configuration changes do not refresh existing code", async () => {
    const id = await create();
    await db.query("UPDATE VISIT_SESSIONS SET expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 SECOND) WHERE session_id = ?", [id]);
    const first = await service.issueCashCode(staff, id);
    assert.equal(first.codeExpiresAt.getTime(), first.visitExpiresAt.getTime());
    service.cashCodeTtlMs = () => 3600000;
    try {
      const retry = await service.issueCashCode(manager, id);
      assert.equal(retry.reused, true); assert.equal(retry.codeExpiresAt.getTime(), first.codeExpiresAt.getTime());
    } finally { service.cashCodeTtlMs = () => 600000; }
  });
  it("unpaid, ONLINE, revoked, expired and inconsistent pairs cannot receive a code or new audit", async () => {
    const pending = await create("CASH", false), online = await create("ONLINE", false);
    for (const id of [pending, online]) {
      const before = await snapshot(id); await assert.rejects(service.issueCashCode(staff, id), error => error.status === 409);
      assert.deepEqual(await snapshot(id), before);
    }
    for (const change of ["status = 'REVOKED'", "expires_at = '2020-01-01 00:00:00'", "activated_at = NULL", "reissue_count = 1"]) {
      const id = await create(); await db.query("UPDATE VISIT_SESSIONS SET " + change + " WHERE session_id = ?", [id]);
      const before = await snapshot(id); await assert.rejects(service.issueCashCode(staff, id), error => error.status === 409);
      assert.deepEqual(await snapshot(id), before);
    }
  });
  it("account state is checked again for new issuance and existing-code retries", async () => {
    const fresh = await create(), reused = await create(); await service.issueCashCode(staff, reused);
    const before = await snapshot(fresh);
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [staff.userId]);
    try { for (const id of [fresh, reused]) await assert.rejects(service.issueCashCode(staff, id), { code: "FORBIDDEN" }); }
    finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [staff.userId]); }
    await assert.rejects(service.issueCashCode({ ...staff, userId: 999999 }, fresh), { code: "MISSING_ACCESS_TOKEN" });
    assert.deepEqual(await snapshot(fresh), before);
  });
  it("invalid TTL or forged payload leaves paid data and audit unchanged", async () => {
    const id = await create(), before = await snapshot(id);
    await assert.rejects(service.issueCashCode(staff, id, { shortedCode: "123456", ttl: 999999 }), { code: "INVALID_CASH_CODE_INPUT" });
    service.cashCodeTtlMs = () => { throw new Error("invalid config"); };
    try { await assert.rejects(service.issueCashCode(staff, id), { code: "CASH_CODE_TTL_NOT_CONFIGURED" }); }
    finally { service.cashCodeTtlMs = () => 600000; }
    assert.deepEqual(await snapshot(id), before);
    await assert.rejects(service.issueCashCode(staff, randomUUID()), { code: "VISIT_SESSION_NOT_FOUND" });
  });
});
