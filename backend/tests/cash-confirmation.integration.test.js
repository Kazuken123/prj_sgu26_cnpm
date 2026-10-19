const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const PaymentStore = require("../stores/payment.store");
const { PaymentService } = require("../services/payment.service");
const { getVisitValidityMs } = require("../config/payment");
describe("Cash confirmation transactions on disposable SQL database", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const name = "tcv_cash_confirm_test_" + randomUUID().replaceAll("-", "");
  let admin, db, service, staff, manager;
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_cash_confirm_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 12 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    for (const role of ["STAFF", "ADMIN"]) {
      const [insert] = await db.query("INSERT INTO USERS (email, password_hash, role, status) VALUES (?, 'test-only', ?, 'ACTIVE')", [role.toLowerCase() + "@confirmation.invalid", role]);
      const actor = { userId: insert.insertId, role, status: "ACTIVE" };
      if (role === "STAFF") staff = actor; else manager = actor;
    }
    service = new PaymentService(new PaymentStore(db), { consumeLookup: async () => { throw new Error("Redis not used at this milestone"); } },
      { price: () => "50000.00", validityMs: () => getVisitValidityMs({}) });
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_cash_confirm_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const create = async (paymentMethod = "CASH") => (await service.initialize({ paymentMethod }, randomUUID())).data.sessionId;
  const snapshot = async id => {
    const [payments] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [id]);
    const [sessions] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [id]);
    const [audits] = await db.query("SELECT * FROM AUDIT_LOGS ORDER BY log_id");
    return { payments, sessions, audits };
  };
  it("confirms the existing CASH payment and visit with UTC dates, saved price and matching audit in one transaction", async () => {
    const id = await create();
    await db.query("UPDATE VISIT_SESSIONS SET created_at = '2020-01-01 00:00:00' WHERE session_id = ?", [id]);
    const before = await snapshot(id), result = await service.confirmCash(staff, id, {}, { ipAddress: "127.0.0.1" });
    const after = await snapshot(id), payment = after.payments[0], session = after.sessions[0], audit = after.audits.at(-1);
    assert.equal(payment.payment_id, before.payments[0].payment_id); assert.equal(payment.payment_ref, before.payments[0].payment_ref);
    assert.equal(payment.amount, "50000.00"); assert.equal(payment.currency, "VND"); assert.equal(payment.status, "PAID");
    assert.equal(payment.confirmed_by, staff.userId); assert.equal(session.status, "ACTIVE");
    assert.equal(session.activated_at.getTime(), payment.paid_at.getTime());
    assert.equal(session.expires_at.getTime() - payment.paid_at.getTime(), 86400000);
    assert.ok(payment.paid_at.getUTCFullYear() >= 2026); assert.equal(session.created_at.getUTCFullYear(), 2020);
    assert.equal(session.token_hash, null); assert.equal(session.reissue_count, 0);
    assert.equal(after.audits.length, before.audits.length + 1); assert.equal(audit.action, "CONFIRM_CASH_PAYMENT");
    assert.equal(audit.user_id, staff.userId); assert.equal(audit.resource_id, payment.payment_ref); assert.equal(audit.ip_address, "127.0.0.1");
    assert.equal(audit.created_at.getTime(), payment.paid_at.getTime());
    assert.deepEqual(JSON.parse(audit.details), { sessionId: id, amount: "50000.00", currency: "VND" });
    assert.equal(result.alreadyConfirmed, false); assert.equal(result.expiresAt.getTime(), session.expires_at.getTime());
    assert.equal(JSON.stringify(result).includes("request_key_hash"), false);
  });
  it("24 simultaneous confirmations by two staff identities record money/audit once and preserve the first actor", async () => {
    const id = await create(), before = await snapshot(id);
    const results = await Promise.all(Array.from({ length: 24 }, (_, index) => service.confirmCash(index % 2 ? staff : manager, id)));
    assert.equal(results.filter(row => !row.alreadyConfirmed).length, 1);
    assert.equal(new Set(results.map(row => row.expiresAt.toISOString())).size, 1);
    const after = await snapshot(id);
    assert.equal(after.payments.length, 1); assert.equal(after.sessions.length, 1); assert.equal(after.audits.length, before.audits.length + 1);
    assert.equal(after.audits.at(-1).user_id, after.payments[0].confirmed_by);
    assert.ok([staff.userId, manager.userId].includes(after.payments[0].confirmed_by));
    const [counts] = await db.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS WHERE action = 'CONFIRM_CASH_PAYMENT' AND resource_id = ?", [after.payments[0].payment_ref]);
    assert.equal(counts[0].total, 1);
  });
  it("lost response and changed/invalid config do not renew a confirmed ticket or alter first confirmer", async () => {
    const id = await create(); await service.confirmCash(staff, id);
    const before = await snapshot(id);
    service.validityMs = () => { throw new Error("bad config after confirmation"); };
    service.price = () => { throw new Error("price not needed for confirmation"); };
    try {
      assert.equal((await service.confirmCash(manager, id)).alreadyConfirmed, true);
      assert.deepEqual(await snapshot(id), before);
    } finally { service.validityMs = () => getVisitValidityMs({}); service.price = () => "50000.00"; }
  });
  for (const [label, table] of [["payment", "PAYMENTS"], ["visit", "VISIT_SESSIONS"], ["audit", "AUDIT_LOGS"]]) {
    it(label + " write failure rolls back payment, activation and audit; retry succeeds once", async () => {
      const id = await create(), before = await snapshot(id);
      const event = table === "AUDIT_LOGS" ? "INSERT" : "UPDATE";
      await db.query(`CREATE TRIGGER cash_test_failure BEFORE ${event} ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced confirmation failure'`);
      try { await assert.rejects(service.confirmCash(staff, id)); }
      finally { await db.query("DROP TRIGGER cash_test_failure"); }
      assert.deepEqual(await snapshot(id), before);
      assert.equal((await service.confirmCash(staff, id)).alreadyConfirmed, false);
      assert.equal((await service.confirmCash(manager, id)).alreadyConfirmed, true);
    });
  }
  it("refuses ONLINE, FAILED, revoked pending visits and inconsistent payment/session pairs without writes", async () => {
    const online = await create("ONLINE"), onlineBefore = await snapshot(online);
    await assert.rejects(service.confirmCash(staff, online), { code: "CASH_PAYMENT_REQUIRED" });
    assert.deepEqual(await snapshot(online), onlineBefore);
    for (const state of [{ payment: "FAILED", session: "PENDING" }, { payment: "PENDING", session: "REVOKED" },
      { payment: "PENDING", session: "ACTIVE" }, { payment: "PAID", session: "PENDING" }]) {
      const id = await create();
      await db.query("UPDATE PAYMENTS SET status = ? WHERE session_id = ?", [state.payment, id]);
      await db.query("UPDATE VISIT_SESSIONS SET status = ? WHERE session_id = ?", [state.session, id]);
      const before = await snapshot(id);
      await assert.rejects(service.confirmCash(staff, id), error => error.status === 409);
      assert.deepEqual(await snapshot(id), before);
    }
  });
  it("rechecks actor status inside the transaction, including replay and missing accounts", async () => {
    const pending = await create(), paid = await create(); await service.confirmCash(staff, paid);
    const before = await snapshot(pending);
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [staff.userId]);
    try {
      for (const id of [pending, paid]) await assert.rejects(service.confirmCash(staff, id), { code: "FORBIDDEN" });
    } finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [staff.userId]); }
    await assert.rejects(service.confirmCash({ ...staff, userId: 999999 }, pending), { code: "MISSING_ACCESS_TOKEN" });
    assert.deepEqual(await snapshot(pending), before);
  });
  it("custom validity applies only to new confirmations; invalid config leaves the pending pair unchanged", async () => {
    const id = await create(); service.validityMs = () => getVisitValidityMs({ VISIT_VALIDITY_HOURS: "48" });
    try { const row = await service.confirmCash(staff, id); assert.equal(row.expiresAt.getTime() - row.paidAt.getTime(), 172800000); }
    finally { service.validityMs = () => getVisitValidityMs({}); }
    const pending = await create(), before = await snapshot(pending);
    service.validityMs = () => getVisitValidityMs({ VISIT_VALIDITY_HOURS: "0" });
    try { await assert.rejects(service.confirmCash(staff, pending), { code: "VISIT_VALIDITY_NOT_CONFIGURED" }); }
    finally { service.validityMs = () => getVisitValidityMs({}); }
    assert.deepEqual(await snapshot(pending), before);
  });
  it("already expired or revoked paid tickets are never reactivated, extended or given a new token", async () => {
    for (const status of ["ACTIVE", "REVOKED"]) {
      const id = await create(); await service.confirmCash(staff, id);
      await db.query("UPDATE VISIT_SESSIONS SET status = ?, expires_at = '2020-01-02 00:00:00', token_hash = ? WHERE session_id = ?", [status, "c".repeat(64), id]);
      const before = await snapshot(id), result = await service.confirmCash(manager, id);
      assert.equal(result.alreadyConfirmed, true); assert.equal(result.sessionStatus, status);
      assert.deepEqual(await snapshot(id), before);
      await db.query("UPDATE VISIT_SESSIONS SET token_hash = NULL WHERE session_id = ?", [id]);
    }
  });
  it("missing sessions and forged amount/expiry cannot record payment", async () => {
    const id = await create(), before = await snapshot(id);
    await assert.rejects(service.confirmCash(staff, randomUUID()), { code: "VISIT_SESSION_NOT_FOUND" });
    await assert.rejects(service.confirmCash(staff, id, { amount: 1, expiresAt: "2099" }), { code: "INVALID_CASH_CONFIRMATION" });
    assert.deepEqual(await snapshot(id), before);
  });
});
