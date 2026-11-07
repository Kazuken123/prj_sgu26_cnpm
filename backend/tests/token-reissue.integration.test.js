// UC-12 against real MySQL (RUN_DB_TESTS=1). Uses the in-memory Redis
// replacement unless RUN_REDIS_TESTS=1, like the other payment integration tests.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const utcPool = require("../config/utc-pool");
const { memoryCashRedis } = require("./helpers/cash-exchange.fixture");
const realRedis = process.env.RUN_REDIS_TESTS === "1";

describe("Token reissue SQL / " + (realRedis ? "real Redis" : "Redis replacement"), { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_reissue_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_test_reissue:" + randomUUID() + ":";
  const keys = new Set();
  let admin, db, redisAdmin, redis, service, staff;
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config);
    assert.match(name, /^tcv_reissue_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 12 }));
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const [insert] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES ('reissue@example.invalid', 'test-only', 'STAFF', 'ACTIVE')");
    staff = { userId: insert.insertId, role: "STAFF", status: "ACTIVE" };
    if (realRedis) {
      redisAdmin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
      redisAdmin.on("error", () => {}); await redisAdmin.connect();
      const store = new RedisStore({ cashCodePrefix: prefix + "code:" });
      redis = {
        ensureCashCode: (...args) => { keys.add(prefix + "code:" + args[0]); return store.ensureCashCode(...args); },
        inspectCashCode: (...args) => store.inspectCashCode(...args),
        resolveCashCode: (...args) => store.resolveCashCode(...args),
        removeCashCode: (...args) => store.removeCashCode(...args),
        consumeLookup: (buckets, cfg) => store.consumeLookup(buckets.map(key => { const scoped = prefix + key; keys.add(scoped); return scoped; }), cfg),
      };
    } else redis = memoryCashRedis().redis;
    service = new PaymentService(new PaymentStore(db), redis, { price: () => "50000.00",
      exchangeConfig: () => ({ windowSeconds: 60, sessionLimit: 100, ipLimit: 1000 }) });
  });
  after(async () => {
    if (redisAdmin?.isOpen) { if (keys.size) await redisAdmin.del([...keys]); await redisAdmin.disconnect(); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_reissue_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const ip = "192.0.2.120";
  async function activatedVisit() {
    const id = (await service.initialize({ paymentMethod: "CASH" }, randomUUID())).data.sessionId;
    await service.confirmCash(staff, id);
    const code = await service.issueCashCode(staff, id);
    const visit = await service.exchangeCashCodeOnly({ shortedCode: code.shortedCode }, ip);
    const [[row]] = await db.query(`SELECT p.payment_ref AS paymentRef, p.paid_at AS paidAt FROM PAYMENTS p WHERE p.session_id = ?`, [id]);
    return { id, token: visit.token, input: { sessionId: id, paymentRef: row.paymentRef, paidAt: row.paidAt.toISOString(), reason: "Khách đổi thiết bị" } };
  }
  const visitRow = async id => (await db.query("SELECT token_hash, reissue_count, expires_at, status FROM VISIT_SESSIONS WHERE session_id = ?", [id]))[0][0];
  const audits = async id => (await db.query("SELECT action, user_id, details FROM AUDIT_LOGS WHERE resource_id = ? AND action = 'REISSUE_VISITOR_TOKEN'", [id]))[0];

  it("reissue revokes the old token in SQL, keeps expires_at, and the pickup code mints a new token once", async () => {
    const item = await activatedVisit(), before = await visitRow(item.id);
    const summary = await service.verifyTokenReissue(staff, item.input);
    assert.equal(summary.reissueCount, 0); assert.equal(summary.remainingAfter, 1);
    const result = await service.reissueToken(staff, item.input, { ipAddress: ip });
    const revoked = await visitRow(item.id);
    assert.equal(revoked.token_hash, null); assert.equal(revoked.reissue_count, 1);
    assert.equal(revoked.expires_at.getTime(), before.expires_at.getTime());
    await assert.rejects(service.authenticateVisitor(item.token), { status: 401 });
    const logged = await audits(item.id);
    assert.equal(logged.length, 1); assert.equal(logged[0].user_id, staff.userId);
    assert.equal(JSON.parse(logged[0].details).reason, "Khách đổi thiết bị");
    const visit = await service.exchangeCashCodeOnly({ shortedCode: result.shortedCode }, ip);
    assert.equal((await service.authenticateVisitor(visit.token)).sessionId, item.id);
    const reissued = await visitRow(item.id);
    assert.equal(reissued.reissue_count, 1); assert.equal(reissued.expires_at.getTime(), before.expires_at.getTime());
    await assert.rejects(service.exchangeCashCodeOnly({ shortedCode: result.shortedCode }, ip), { status: 401 });
  });
  it("concurrent reissues of the same ticket count exactly once under InnoDB row locks", async () => {
    const item = await activatedVisit();
    const second = new PaymentService(new PaymentStore(db), redis);
    const results = await Promise.allSettled(Array.from({ length: 6 }, (_, index) =>
      (index % 2 ? service : second).reissueToken(staff, item.input, { ipAddress: ip })));
    assert.ok(results.every(row => row.status === "fulfilled"), JSON.stringify(results.map(row => row.reason?.code)));
    assert.equal((await visitRow(item.id)).reissue_count, 1);
    assert.equal(results.filter(row => row.value.renewedCode === false).length, 1);
  });
  it("the limit is enforced from SQL state and rejected requests leave no audit", async () => {
    const item = await activatedVisit();
    for (let n = 1; n <= 2; n++) {
      const { shortedCode } = await service.reissueToken(staff, item.input, { ipAddress: ip });
      await service.exchangeCashCodeOnly({ shortedCode }, ip);
    }
    await assert.rejects(service.reissueToken(staff, item.input, { ipAddress: ip }), { code: "REISSUE_LIMIT_REACHED" });
    assert.equal((await visitRow(item.id)).reissue_count, 2); assert.equal((await audits(item.id)).length, 2);
  });
  it("a locked staff account is rejected inside the transaction before any change", async () => {
    const item = await activatedVisit();
    const [insert] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES (?, 'test-only', 'STAFF', 'LOCKED')", [randomUUID() + "@example.invalid"]);
    const locked = { userId: insert.insertId, role: "STAFF", status: "ACTIVE" };
    await assert.rejects(service.reissueToken(locked, item.input, { ipAddress: ip }), { status: 403 });
    assert.equal((await visitRow(item.id)).reissue_count, 0);
  });
});
