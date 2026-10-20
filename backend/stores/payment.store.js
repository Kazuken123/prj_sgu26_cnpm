const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");

const projection = `SELECT p.session_id AS sessionId, p.payment_ref AS paymentRef,
 p.payment_method AS paymentMethod, p.amount, p.currency, p.status AS paymentStatus,
 s.status AS sessionStatus, s.created_by AS createdBy
 FROM PAYMENTS p JOIN VISIT_SESSIONS s ON s.session_id = p.session_id`;
const confirmationProjection = `SELECT p.session_id AS sessionId, p.payment_ref AS paymentRef,
 p.payment_method AS paymentMethod, p.amount, p.currency, p.status AS paymentStatus,
 p.paid_at AS paidAt, p.confirmed_by AS confirmedBy, s.status AS sessionStatus,
 s.activated_at AS activatedAt, s.expires_at AS expiresAt, s.token_hash AS tokenHash, s.reissue_count AS reissueCount
 FROM PAYMENTS p JOIN VISIT_SESSIONS s ON s.session_id = p.session_id WHERE p.session_id = ?`;
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
  async getVisitorByTokenHash(tokenHash) {
    const [rows] = await this.db.query(`SELECT s.session_id AS sessionId, s.status AS sessionStatus,
      s.activated_at AS activatedAt, s.expires_at AS expiresAt, p.status AS paymentStatus, p.paid_at AS paidAt,
      UTC_TIMESTAMP(3) AS nowUtc
      FROM VISIT_SESSIONS s JOIN PAYMENTS p ON p.session_id = s.session_id
      WHERE s.token_hash = ?`, [tokenHash]);
    return rows[0];
  }
  async lookupForStaff(actorId, sessionId, authorize) {
    return this.transactions.transaction(async connection => {
      // Recheck the account before reading payment details, including accounts
      // locked/deleted after HTTP authentication. No payment/session mutation.
      authorize(await this.users.getUserById(actorId, connection, true));
      const [rows] = await connection.query(projection + " WHERE p.session_id = ?", [sessionId]);
      return rows[0];
    });
  }
  async withCashConfirmation(actorId, sessionId, authorize, work) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      // InnoDB locking read covers the payment and its visit. Distinct staff
      // confirming the same session still serialize on these business records.
      const [rows] = await connection.query(confirmationProjection + " FOR UPDATE", [sessionId]);
      return work(rows[0], {
        currentTime: async () => {
          const [clock] = await connection.query("SELECT UTC_TIMESTAMP() AS confirmedAt");
          return clock[0].confirmedAt;
        },
        persist: async ({ paidAt, expiresAt, ipAddress }) => {
          const [payment] = await connection.query(`UPDATE PAYMENTS SET status = 'PAID', confirmed_by = ?, paid_at = ?
            WHERE session_id = ? AND status = 'PENDING'`, [actorId, paidAt, sessionId]);
          const [visit] = await connection.query(`UPDATE VISIT_SESSIONS SET status = 'ACTIVE', activated_at = ?, expires_at = ?
            WHERE session_id = ? AND status = 'PENDING'`, [paidAt, expiresAt, sessionId]);
          if (payment.affectedRows !== 1 || visit.affectedRows !== 1) {
            const error = new Error("PAYMENT_WRITE_CONFLICT"); error.code = error.message; throw error;
          }
          await this.audit.create({ userId: actorId, action: "CONFIRM_CASH_PAYMENT", resourceType: "PAYMENTS",
            resourceId: rows[0].paymentRef, details: JSON.stringify({ sessionId, amount: String(rows[0].amount), currency: rows[0].currency }),
            ipAddress, createdAt: paidAt }, connection);
          const [saved] = await connection.query(confirmationProjection, [sessionId]);
          return saved[0];
        },
      });
    });
  }
  async withCashCodeIssue(actorId, sessionId, authorize, work) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      // Keep the same business lock order as confirmation and the future token
      // exchange. Redis is not part of this SQL transaction.
      const [rows] = await connection.query(confirmationProjection + " FOR UPDATE", [sessionId]);
      const [clock] = await connection.query("SELECT UTC_TIMESTAMP(3) AS nowUtc");
      return work(rows[0], {
        now: clock[0].nowUtc,
        auditIssue: async ({ issueId, codeExpiresAt, ipAddress }) => {
          // The ID is a random audit correlation ID, never the raw auth/short code.
          // Reusing Redis state after an ambiguous failure repairs a missing audit
          // without writing another payment or extending either deadline.
          const [existing] = await connection.query(`SELECT log_id FROM AUDIT_LOGS
            WHERE action = 'ISSUE_CASH_CODE' AND resource_type = 'CASH_ACCESS_CODE' AND resource_id = ? LIMIT 1`, [issueId]);
          if (!existing.length) {
            await this.audit.create({ userId: actorId, action: "ISSUE_CASH_CODE", resourceType: "CASH_ACCESS_CODE", resourceId: issueId,
              details: JSON.stringify({ sessionId, paymentRef: rows[0].paymentRef, codeExpiresAt: codeExpiresAt.toISOString() }),
              ipAddress, createdAt: clock[0].nowUtc }, connection);
          }
        },
      });
    });
  }
  async withCashTokenExchange(sessionId, work) {
    return this.transactions.transaction(async connection => {
      // Same payment/visit lock order as code issuance and confirmation.
      const [rows] = await connection.query(confirmationProjection + " FOR UPDATE", [sessionId]);
      const [clock] = await connection.query("SELECT UTC_TIMESTAMP(3) AS nowUtc");
      return work(rows[0], {
        now: clock[0].nowUtc,
        persist: async ({ tokenHash, issueId, codeExpiresAt, ipAddress }) => {
          const [saved] = await connection.query(`UPDATE VISIT_SESSIONS SET token_hash = ?
            WHERE session_id = ? AND token_hash IS NULL AND reissue_count = 0
            AND status = 'ACTIVE' AND expires_at > UTC_TIMESTAMP(3) AND ? > UTC_TIMESTAMP(3)`,
          [tokenHash, sessionId, codeExpiresAt]);
          if (saved.affectedRows !== 1) return false;
          await this.audit.create({ userId: null, action: "ISSUE_VISITOR_TOKEN", resourceType: "VISIT_SESSIONS", resourceId: sessionId,
            details: JSON.stringify({ paymentRef: rows[0].paymentRef, issueId }), ipAddress, createdAt: clock[0].nowUtc }, connection);
          return true;
        },
      });
    });
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
