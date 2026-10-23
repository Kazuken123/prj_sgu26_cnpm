const pool = require("../config/database");
const RedisStore = require("./redis.store");
class HealthStore {
  constructor(db = pool, redis = new RedisStore()) { this.db = db; this.redis = redis; }
  async pingRedis() { await this.redis.ping(); }
  async ping() {
    let timer, expired = false;
    const probes = async () => { for (const sql of ["SELECT user_id FROM USERS LIMIT 0", "SELECT token_id, rotated_token_hashes FROM REFRESH_TOKENS LIMIT 0",
      "SELECT log_id FROM AUDIT_LOGS LIMIT 0", "SELECT poi_id, category, conservation_status, activity_hours FROM POIS LIMIT 0",
      "SELECT translation_id FROM POI_TRANSLATIONS LIMIT 0", "SELECT job_id FROM CONTENT_JOBS LIMIT 0",
      "SELECT code FROM LANGUAGES LIMIT 0", "SELECT request_key_hash FROM PAYMENTS LIMIT 0",
      "SELECT session_id, token_hash, status, expires_at FROM VISIT_SESSIONS LIMIT 0",
      "SELECT audio_id, file_url, source_version, status FROM AUDIOS LIMIT 0",
      "SELECT tour_id FROM TOURS LIMIT 0", "SELECT tour_id, poi_id, sequence_no FROM TOUR_POIS LIMIT 0",
      "SELECT document_id, content_version, status FROM KNOWLEDGE_DOCUMENTS LIMIT 0",
      "SELECT chunk_id, source_version, embedding, embedding_model FROM KNOWLEDGE_CHUNKS LIMIT 0",
      "SELECT chat_log_id, session_id, status, created_at FROM CHAT_LOGS LIMIT 0",
      "SELECT access_id, session_id, language_code, created_at FROM BUNDLE_ACCESS_LOGS LIMIT 0"]) {
      if (expired) throw new Error("READINESS_TIMEOUT");
      await this.db.query({ sql, timeout: 2000 });
    } };
    try { await Promise.race([probes(), new Promise((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(new Error("READINESS_TIMEOUT")); }, 5000);
    })]); } finally { clearTimeout(timer); }
  }
}
module.exports = HealthStore;
