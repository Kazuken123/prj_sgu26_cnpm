const pool = require("../config/database");

class AuditLogStore {
  constructor(db = pool) { this.db = db; }
  async create(entry, executor = this.db) {
    await executor.query(
      "INSERT INTO AUDIT_LOGS (user_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [entry.userId, entry.action, entry.resourceType, entry.resourceId, entry.details ?? null, entry.ipAddress ?? null],
    );
  }
}
module.exports = AuditLogStore;
