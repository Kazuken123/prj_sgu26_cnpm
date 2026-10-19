const pool = require("../config/database");
class HealthStore {
  constructor(db = pool) { this.db = db; }
  async ping() {
    for (const sql of ["SELECT user_id FROM USERS LIMIT 0", "SELECT token_id, rotated_token_hashes FROM REFRESH_TOKENS LIMIT 0",
      "SELECT log_id FROM AUDIT_LOGS LIMIT 0", "SELECT poi_id, category, conservation_status, activity_hours FROM POIS LIMIT 0",
      "SELECT translation_id FROM POI_TRANSLATIONS LIMIT 0", "SELECT job_id FROM CONTENT_JOBS LIMIT 0",
      "SELECT code FROM LANGUAGES LIMIT 0", "SELECT request_key_hash FROM PAYMENTS LIMIT 0"]) {
      await this.db.query({ sql, timeout: 2000 });
    }
  }
}
module.exports = HealthStore;
