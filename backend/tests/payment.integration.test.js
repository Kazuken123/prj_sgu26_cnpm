const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const PaymentStore = require("../stores/payment.store");
const SchemaStore = require("../stores/schema.store");
const { PaymentService } = require("../services/payment.service");
describe("Pending CASH/ONLINE with disposable SQL database", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_payment_test_" + randomUUID().replaceAll("-", "");
  let admin, db, service, staff;
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_payment_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 12 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const [user] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES ('payment@example.invalid', 'test-only', 'STAFF', 'ACTIVE')");
    staff = { userId: user.insertId, role: "STAFF", status: "ACTIVE" };
    service = new PaymentService(new PaymentStore(db), { consumeLookup: async () => true }, { price: () => "50000.00" });
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_payment_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const create = (method = "CASH", key = randomUUID(), actor) => service.initialize({ paymentMethod: method }, key, actor);
  const counts = async () => {
    const [rows] = await db.query("SELECT (SELECT COUNT(*) FROM VISIT_SESSIONS) AS sessions, (SELECT COUNT(*) FROM PAYMENTS) AS payments, (SELECT COUNT(*) FROM AUDIT_LOGS) AS audits");
    return rows[0];
  };
  it("004 adds exactly one nullable unique hash column, preserves legacy records and visit schema, and reruns safely", async () => {
    const legacy = await create(), second = await create("ONLINE");
    const [beforeVisit] = await db.query("SHOW COLUMNS FROM VISIT_SESSIONS");
    await db.query("ALTER TABLE PAYMENTS DROP COLUMN request_key_hash");
    const [beforePayment] = await db.query("SELECT * FROM PAYMENTS ORDER BY payment_id");
    const [beforeColumns] = await db.query("SHOW COLUMNS FROM PAYMENTS");
    const [beforeSession] = await db.query("SELECT * FROM VISIT_SESSIONS ORDER BY session_id");
    await new SchemaStore(db).migratePaymentRequestKey(); await new SchemaStore(db).migratePaymentRequestKey();
    const [afterPayment] = await db.query("SELECT * FROM PAYMENTS ORDER BY payment_id");
    for (const row of afterPayment) { assert.equal(row.request_key_hash, null); delete row.request_key_hash; }
    assert.deepEqual(afterPayment, beforePayment);
    assert.deepEqual((await db.query("SELECT * FROM VISIT_SESSIONS ORDER BY session_id"))[0], beforeSession);
    assert.deepEqual((await db.query("SHOW COLUMNS FROM VISIT_SESSIONS"))[0], beforeVisit);
    const [columns] = await db.query("SHOW COLUMNS FROM PAYMENTS LIKE 'request_key_hash'");
    assert.equal(columns[0].Null, "YES"); assert.equal(columns[0].Type, "char(64)"); assert.equal(columns[0].Key, "UNI");
    const [afterColumns] = await db.query("SHOW COLUMNS FROM PAYMENTS");
    assert.equal(afterColumns.length, beforeColumns.length + 1);
    assert.deepEqual(afterColumns.filter(column => column.Field !== "request_key_hash"), beforeColumns);
    const [tables] = await db.query("SHOW TABLES"); assert.equal(tables.length, 16);
    const value = "a".repeat(64);
    await db.query("UPDATE PAYMENTS SET request_key_hash = ? WHERE session_id = ?", [value, legacy.data.sessionId]);
    await assert.rejects(db.query("UPDATE PAYMENTS SET request_key_hash = ? WHERE session_id = ?", [value, second.data.sessionId]), { code: "ER_DUP_ENTRY" });
  });
  it("both methods persist pending payment/session/audit atomically, with no code/token or payment timestamps", async () => {
    for (const method of ["CASH", "ONLINE"]) {
      const key = randomUUID(), before = await counts(), result = await create(method, key);
      const [payments] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [result.data.sessionId]);
      const [sessions] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [result.data.sessionId]);
      const payment = payments[0], session = sessions[0];
      assert.equal(payment.request_key_hash, createHash("sha256").update(key).digest("hex"));
      assert.equal(payment.payment_method, method); assert.equal(payment.amount, "50000.00"); assert.equal(payment.currency, "VND");
      assert.equal(payment.status, "PENDING"); assert.equal(payment.paid_at, null); assert.equal(payment.confirmed_by, null);
      assert.equal(session.status, "PENDING"); assert.equal(session.created_by, null);
      for (const field of ["token_hash", "activated_at", "expires_at"]) assert.equal(session[field], null);
      assert.equal(session.reissue_count, 0);
      const after = await counts();
      for (const field of ["sessions", "payments", "audits"]) assert.equal(after[field], before[field] + 1);
      const [audits] = await db.query("SELECT * FROM AUDIT_LOGS WHERE resource_id = ?", [result.data.paymentRef]);
      assert.equal(audits.length, 1); assert.equal(audits[0].user_id, null);
      assert.equal(JSON.stringify(audits).includes(key), false);
      assert.equal(JSON.stringify(result).includes(payment.request_key_hash), false);
    }
  });
  it("lost-response retry reuses original session/ref/price and does not add audit", async () => {
    const key = randomUUID(), first = await create("CASH", key), before = await counts();
    service.price = () => "100000.00";
    try {
      const repeated = await create("CASH", key);
      assert.equal(repeated.created, false); assert.deepEqual(repeated.data, first.data);
      assert.deepEqual(await counts(), before);
    } finally { service.price = () => "50000.00"; }
  });
  it("24 simultaneous requests create exactly one session, payment and audit", async () => {
    for (const method of ["CASH", "ONLINE"]) {
      const key = randomUUID(), before = await counts();
      const results = await Promise.all(Array.from({ length: 24 }, () => create(method, key)));
      assert.equal(results.filter(result => result.created).length, 1);
      assert.equal(new Set(results.map(result => result.data.sessionId)).size, 1);
      assert.equal(new Set(results.map(result => result.data.paymentRef)).size, 1);
      const after = await counts();
      for (const field of ["sessions", "payments", "audits"]) assert.equal(after[field], before[field] + 1);
    }
  });
  it("simultaneous method mismatch has one winner and one conflict, without orphans", async () => {
    const key = randomUUID(), before = await counts();
    const results = await Promise.allSettled([create("CASH", key), create("ONLINE", key)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.find(result => result.status === "rejected").reason.code, "REQUEST_KEY_CONFLICT");
    const after = await counts();
    for (const field of ["sessions", "payments", "audits"]) assert.equal(after[field], before[field] + 1);
  });
  it("payment insert error rolls back the provisional session", async () => {
    const before = await counts();
    await db.query("CREATE TRIGGER payment_test_fail_insert BEFORE INSERT ON PAYMENTS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced payment failure'");
    try { await assert.rejects(create()); }
    finally { await db.query("DROP TRIGGER payment_test_fail_insert"); }
    assert.deepEqual(await counts(), before);
  });
  it("audit failure rolls back payment and session; retry after failure can succeed once", async () => {
    const key = randomUUID(), before = await counts();
    await db.query("CREATE TRIGGER payment_test_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(create("ONLINE", key)); }
    finally { await db.query("DROP TRIGGER payment_test_fail_audit"); }
    assert.deepEqual(await counts(), before);
    assert.equal((await create("ONLINE", key)).created, true);
    assert.equal((await create("ONLINE", key)).created, false);
  });
  it("staff creation records the current actor and rejects changed/locked/deleted actors inside transaction", async () => {
    const result = await create("CASH", randomUUID(), staff);
    const [sessions] = await db.query("SELECT created_by FROM VISIT_SESSIONS WHERE session_id = ?", [result.data.sessionId]);
    assert.equal(sessions[0].created_by, staff.userId);
    const [logs] = await db.query("SELECT user_id FROM AUDIT_LOGS WHERE resource_id = ?", [result.data.paymentRef]);
    assert.equal(logs[0].user_id, staff.userId);
    const before = await counts();
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [staff.userId]);
    try { await assert.rejects(create("CASH", randomUUID(), staff), { code: "FORBIDDEN" }); }
    finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [staff.userId]); }
    await assert.rejects(create("CASH", randomUUID(), { ...staff, userId: 999999 }), { code: "MISSING_ACCESS_TOKEN" });
    assert.deepEqual(await counts(), before);
  });
  it("lookup/retry preserve externally seeded PAID and FAILED state and original dates", async () => {
    for (const state of ["PAID", "FAILED"]) {
      const key = randomUUID(), first = await create("ONLINE", key);
      await db.query("UPDATE PAYMENTS SET status = ?, paid_at = '2026-10-19 01:00:00' WHERE session_id = ?", [state, first.data.sessionId]);
      if (state === "PAID") await db.query("UPDATE VISIT_SESSIONS SET status = 'ACTIVE', activated_at = '2026-10-19 01:00:00', expires_at = '2026-10-20 01:00:00', token_hash = ? WHERE session_id = ?", [createHash("sha256").update(key).digest("hex"), first.data.sessionId]);
      const [beforePayment] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [first.data.sessionId]);
      const [beforeSession] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [first.data.sessionId]);
      assert.equal((await create("ONLINE", key)).data.paymentStatus, state);
      const status = await service.status(first.data.sessionId, "127.0.0.1");
      assert.deepEqual(Object.keys(status).sort(), ["paymentStatus", "sessionId", "sessionStatus"]);
      assert.deepEqual((await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [first.data.sessionId]))[0], beforePayment);
      assert.deepEqual((await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [first.data.sessionId]))[0], beforeSession);
    }
  });
  it("missing price and forged amounts leave no database changes", async () => {
    const before = await counts();
    await assert.rejects(service.initialize({ paymentMethod: "CASH", amount: 1 }, randomUUID()), { code: "INVALID_PAYMENT_INPUT" });
    service.price = () => { throw new Error("not configured"); };
    try { await assert.rejects(create("ONLINE"), { code: "VISIT_PRICE_NOT_CONFIGURED" }); }
    finally { service.price = () => "50000.00"; }
    assert.deepEqual(await counts(), before);
  });
  it("collision on payment_ref is not mistaken for an idempotent retry", async () => {
    const existing = await create(), before = await counts();
    const store = new PaymentStore(db);
    await assert.rejects(store.initialize({ hash: "b".repeat(64), actorId: null, authorize: () => {},
      build: () => ({ sessionId: randomUUID(), paymentRef: existing.data.paymentRef, paymentMethod: "CASH", amount: "50000.00" }) }), { code: "ER_DUP_ENTRY" });
    assert.deepEqual(await counts(), before);
  });
  it("staff lookup reads guest CASH and other staff CASH with saved prices, without Redis or current price", async () => {
    const guest = await create(), internal = await create("CASH", randomUUID(), staff);
    const store = new PaymentStore(db);
    const lookup = new PaymentService(store, { consumeLookup: async () => { throw new Error("Redis is unavailable"); } },
      { price: () => { throw new Error("Price configuration removed"); } });
    const [other] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES ('cash-lookup@example.invalid', 'test-only', 'STAFF', 'ACTIVE')");
    const actor = { ...staff, userId: other.insertId };
    for (const created of [guest, internal]) {
      const row = await lookup.lookupCash(actor, created.data.sessionId.toUpperCase());
      assert.deepEqual(row, created.data);
      assert.equal(row.amount, "50000.00");
    }
  });
  it("staff lookup rejects ONLINE, missing sessions and stale locked/deleted actor identities", async () => {
    const cash = await create(), online = await create("ONLINE"), before = await counts();
    await assert.rejects(service.lookupCash(staff, online.data.sessionId), { code: "CASH_PAYMENT_REQUIRED" });
    await assert.rejects(service.lookupCash(staff, randomUUID()), { code: "VISIT_SESSION_NOT_FOUND" });
    await assert.rejects(service.lookupCash(staff, "' OR 1=1 --"), { code: "INVALID_SESSION_ID" });
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [staff.userId]);
    try { await assert.rejects(service.lookupCash(staff, cash.data.sessionId), { code: "FORBIDDEN" }); }
    finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [staff.userId]); }
    await assert.rejects(service.lookupCash({ ...staff, userId: 999999 }, cash.data.sessionId), { code: "MISSING_ACCESS_TOKEN" });
    assert.deepEqual(await counts(), before);
  });
  it("concurrent staff cash lookups are read-only, return no hashes and leave audit unchanged", async () => {
    const created = await create(), before = await counts();
    const [payment] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [created.data.sessionId]);
    const [session] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [created.data.sessionId]);
    const rows = await Promise.all(Array.from({ length: 12 }, () => service.lookupCash(staff, created.data.sessionId)));
    for (const row of rows) assert.deepEqual(row, created.data);
    assert.deepEqual(await counts(), before);
    assert.deepEqual((await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [created.data.sessionId]))[0], payment);
    assert.deepEqual((await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [created.data.sessionId]))[0], session);
  });
  it("staff cash lookup displays seeded PAID/FAILED/REVOKED states without changing payment or ticket dates", async () => {
    for (const state of [{ payment: "PAID", session: "ACTIVE" }, { payment: "FAILED", session: "PENDING" }, { payment: "PAID", session: "REVOKED" }]) {
      const created = await create();
      await db.query("UPDATE PAYMENTS SET status = ? WHERE session_id = ?", [state.payment, created.data.sessionId]);
      await db.query("UPDATE VISIT_SESSIONS SET status = ? WHERE session_id = ?", [state.session, created.data.sessionId]);
      const [payment] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [created.data.sessionId]);
      const [session] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [created.data.sessionId]);
      const before = await counts(), result = await service.lookupCash(staff, created.data.sessionId);
      assert.equal(result.paymentStatus, state.payment); assert.equal(result.sessionStatus, state.session);
      assert.deepEqual(await counts(), before);
      assert.deepEqual((await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [created.data.sessionId]))[0], payment);
      assert.deepEqual((await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [created.data.sessionId]))[0], session);
    }
  });
});
