const pool = require("../config/database");

class AuditLogStore {
  constructor(db = pool) { this.db = db; }
  async list({ from, to, action, page, limit }) {
    // Require lazily: AuthStore already uses AuditLogStore to write audit entries.
    const Transactions = require("./auth.store");
    return new Transactions(this.db).transaction(async connection => {
      const where = [], values = [];
      if (from) { where.push("a.created_at >= ?"); values.push(from.replace("T", " ").slice(0, -1)); }
      if (to) { where.push("a.created_at <= ?"); values.push(to.replace("T", " ").slice(0, -1)); }
      if (action) { where.push("a.action = ?"); values.push(action); }
      const condition = where.length ? " WHERE " + where.join(" AND ") : "";
      const [count] = await connection.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS a" + condition, values);
      const [items] = await connection.query(`SELECT CAST(a.log_id AS CHAR) AS logId, a.user_id AS userId,
        u.full_name AS actorName, a.action, a.resource_type AS resourceType, a.resource_id AS resourceId,
        a.created_at AS createdAt, a.details FROM AUDIT_LOGS a LEFT JOIN USERS u ON u.user_id = a.user_id${condition}
        ORDER BY a.created_at DESC, a.log_id DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
      return { items, total: Number(count[0].total), page, limit };
    }, { repeatableRead: true });
  }
  async create(entry, executor = this.db) {
    // Confirmation may supply the same UTC instant used for payment/activation.
    // Other audit callers retain their existing database-default timestamp.
    const timed = entry.createdAt !== undefined;
    await executor.query(
      "INSERT INTO AUDIT_LOGS (user_id, action, resource_type, resource_id, details, ip_address" +
        (timed ? ", created_at) VALUES (?, ?, ?, ?, ?, ?, ?)" : ") VALUES (?, ?, ?, ?, ?, ?)"),
      [entry.userId, entry.action, entry.resourceType, entry.resourceId, entry.details ?? null, entry.ipAddress ?? null,
        ...(timed ? [entry.createdAt] : [])],
    );
  }
}
module.exports = AuditLogStore;
