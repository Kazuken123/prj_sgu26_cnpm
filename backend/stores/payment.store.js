const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");

const projection = `SELECT p.session_id AS sessionId, p.payment_ref AS paymentRef,
 p.payment_method AS paymentMethod, p.amount, p.currency, p.status AS paymentStatus,
 s.status AS sessionStatus, s.created_by AS createdBy
 FROM PAYMENTS p JOIN VISIT_SESSIONS s ON s.session_id = p.session_id`;
class PaymentStore {
  constructor(db = pool) {
    this.db = db; this.transactions = new AuthStore(db);
    this.users = new UserStore(db); this.audit = new AuditLogStore(db);
  }
  async getByRequestHash(hash, executor = this.db) {
    const [rows] = await executor.query(projection + " WHERE p.request_key_hash = ?", [hash]);
    return rows[0];
  }
  async getStatus(sessionId) {
    const [rows] = await this.db.query(`SELECT s.session_id AS sessionId, s.status AS sessionStatus,
      p.status AS paymentStatus FROM VISIT_SESSIONS s JOIN PAYMENTS p ON p.session_id = s.session_id
      WHERE s.session_id = ?`, [sessionId]);
    return rows[0];
  }
  async initialize({ hash, actorId, authorize, build }) {
    const attempt = () => this.transactions.transaction(async connection => {
      if (actorId !== null) authorize(await this.users.getUserById(actorId, connection, true));
      const existing = await this.getByRequestHash(hash, connection);
      if (existing) return { record: existing, created: false };
      const data = build();
      await connection.query("INSERT INTO VISIT_SESSIONS (session_id, created_by, status) VALUES (?, ?, 'PENDING')",
        [data.sessionId, actorId]);
      await connection.query(`INSERT INTO PAYMENTS
        (session_id, payment_ref, payment_method, amount, currency, status, request_key_hash)
        VALUES (?, ?, ?, ?, 'VND', 'PENDING', ?)`,
      [data.sessionId, data.paymentRef, data.paymentMethod, data.amount, hash]);
      await this.audit.create({ userId: actorId, action: "CREATE_PENDING_PAYMENT", resourceType: "PAYMENTS",
        resourceId: data.paymentRef, details: JSON.stringify({ sessionId: data.sessionId, paymentMethod: data.paymentMethod }) }, connection);
      return { record: await this.getByRequestHash(hash, connection), created: true };
    });
    try { return await attempt(); }
    catch (error) {
      if (error.code !== "ER_DUP_ENTRY") throw error;
      // A competing insert commits first. The losing transaction (including its
      // temporary session and audit) is rolled back before reading the winner.
      return this.transactions.transaction(async connection => {
        if (actorId !== null) authorize(await this.users.getUserById(actorId, connection, true));
        const existing = await this.getByRequestHash(hash, connection);
        if (!existing) throw error; // Do not mask a collision on another unique key.
        return { record: existing, created: false };
      });
    }
  }
}
module.exports = PaymentStore;
