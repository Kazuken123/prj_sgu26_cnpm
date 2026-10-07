const pool = require("../config/database");
class HealthStore {
  constructor(db = pool) { this.db = db; }
  async ping() {
    for (const sql of ["SELECT user_id FROM USERS LIMIT 0", "SELECT token_id FROM REFRESH_TOKENS LIMIT 0",
      "SELECT request_id FROM OWNER_REQUESTS LIMIT 0"]) {
      await this.db.query({ sql, timeout: 2000 });
    }
  }
}
module.exports = HealthStore;
