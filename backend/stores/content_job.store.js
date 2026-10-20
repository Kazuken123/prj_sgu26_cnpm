const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");

const projection = `j.job_id AS jobId, j.poi_id AS poiId, j.language_code AS languageCode,
 j.source_version AS sourceVersion, p.content_version AS currentVersion, j.status,
 j.created_at AS createdAt, j.updated_at AS updatedAt,
 t.status AS translationStatus, t.source_version AS translationVersion,
 a.status AS audioStatus, a.source_version AS audioVersion`;
const joins = ` FROM CONTENT_JOBS j JOIN POIS p ON p.poi_id = j.poi_id
 LEFT JOIN POI_TRANSLATIONS t ON t.poi_id = j.poi_id AND t.language_code = j.language_code
 LEFT JOIN AUDIOS a ON a.translation_id = t.translation_id`;
class ContentJobStore {
  constructor(db = pool) {
    this.db = db; this.transactions = new AuthStore(db); this.users = new UserStore(db); this.audit = new AuditLogStore(db);
  }
  async list({ poiId, status, languageCode, currentOnly, page, limit }) {
    const where = ` WHERE (? IS NULL OR j.poi_id = ?) AND (? IS NULL OR j.status = ?)
      AND (? IS NULL OR j.language_code = ?) AND (? = 0 OR j.source_version = p.content_version)`;
    const params = [poiId, poiId, status, status, languageCode, languageCode, Number(currentOnly)];
    const [items] = await this.db.query("SELECT " + projection + joins + where + " ORDER BY j.created_at DESC, j.job_id DESC LIMIT ? OFFSET ?",
      [...params, limit, (page - 1) * limit]);
    const [count] = await this.db.query("SELECT COUNT(*) AS total FROM CONTENT_JOBS j JOIN POIS p ON p.poi_id = j.poi_id" + where, params);
    return { items, total: Number(count[0].total), page, limit };
  }
  async get(id) {
    const [rows] = await this.db.query("SELECT " + projection + joins + " WHERE j.job_id = ?", [id]);
    return rows[0];
  }
  async withLockedJob(actorId, id, authorize, work) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      const [reference] = await connection.query("SELECT poi_id FROM CONTENT_JOBS WHERE job_id = ?", [id]);
      if (!reference[0]) return work({ job: undefined });
      // Same parent-before-job order as POI source edits. Use locking reads
      // for versions/status, not an earlier transaction snapshot.
      const [parents] = await connection.query("SELECT content_version FROM POIS WHERE poi_id = ? FOR UPDATE", [reference[0].poi_id]);
      const [rows] = await connection.query(`SELECT job_id AS jobId, poi_id AS poiId, language_code AS languageCode,
        source_version AS sourceVersion, status FROM CONTENT_JOBS WHERE job_id = ? FOR UPDATE`, [id]);
      if (!parents[0] || !rows[0]) return work({ job: undefined });
      const job = { ...rows[0], currentVersion: parents[0].content_version };
      return work({ job, enqueue: async ipAddress => {
        const [result] = await connection.query("UPDATE CONTENT_JOBS SET status = 'PENDING', error_message = NULL WHERE job_id = ? AND status = 'FAILED' AND source_version = ?",
          [id, job.currentVersion]);
        if (result.affectedRows !== 1) return undefined;
        await this.audit.create({ userId: actorId, action: "RETRY_CONTENT_JOB", resourceType: "CONTENT_JOBS", resourceId: String(id),
          details: JSON.stringify({ poiId: job.poiId, languageCode: job.languageCode, sourceVersion: job.sourceVersion }), ipAddress }, connection);
        return { ...job, status: "PENDING" };
      } });
    });
  }
}
module.exports = ContentJobStore;
