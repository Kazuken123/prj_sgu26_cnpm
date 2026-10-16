const pool = require("../config/database");
class HealthStore {
  constructor(db = pool) { this.db = db; }
  async ping() {
    for (const sql of ["SELECT user_id FROM USERS LIMIT 0", "SELECT token_id FROM REFRESH_TOKENS LIMIT 0",
      "SELECT log_id FROM AUDIT_LOGS LIMIT 0"]) {
      await this.db.query({ sql, timeout: 2000 });
    }
  }
}
module.exports = HealthStore;
