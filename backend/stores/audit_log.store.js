const pool = require("../config/database");

class AuditLogStore {
  constructor(db = pool) { this.db = db; }
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
