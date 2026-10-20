const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");

const columns = `p.poi_id AS poiId, p.name, p.category, p.conservation_status AS conservationStatus,
 p.activity_hours AS activityHours, p.latitude, p.longitude, p.trigger_radius AS triggerRadius,
 p.avatar_url AS avatarUrl, p.display_order AS displayOrder, p.status, p.content_version AS contentVersion,
 vi.description, vi.audio_script AS audioScript`;
const joined = " FROM POIS p LEFT JOIN POI_TRANSLATIONS vi ON vi.poi_id = p.poi_id AND vi.language_code = 'vi'";
class PoiStore {
  constructor(db = pool) {
    this.db = db; this.transactions = new AuthStore(db); this.users = new UserStore(db); this.audit = new AuditLogStore(db);
  }
  async get(id, executor = this.db) {
    const [rows] = await executor.query("SELECT " + columns + joined + " WHERE p.poi_id = ?", [id]);
    return rows[0] ? { ...rows[0], latitude: Number(rows[0].latitude), longitude: Number(rows[0].longitude) } : undefined;
  }
  async list({ category, status, page, limit }) {
    const where = " WHERE (? IS NULL OR p.category = ?) AND (? IS NULL OR p.status = ?)";
    const params = [category, category, status, status];
    const [rows] = await this.db.query("SELECT " + columns + joined + where + " ORDER BY p.display_order, p.poi_id LIMIT ? OFFSET ?", [...params, limit, (page - 1) * limit]);
    const [count] = await this.db.query("SELECT COUNT(*) AS total FROM POIS p" + where, params);
    return { items: rows.map(row => ({ ...row, latitude: Number(row.latitude), longitude: Number(row.longitude) })), total: Number(count[0].total), page, limit };
  }
  async mutate(actorId, id, authorize, work) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      // Lock the parent first, then read its Vietnamese source in the same transaction.
      if (id !== null) await connection.query("SELECT poi_id FROM POIS WHERE poi_id = ? FOR UPDATE", [id]);
      const current = id === null ? undefined : await this.get(id, connection);
      return work({ current, persist: async (data, version, sourceChanged, audit) => {
        const values = [data.name, data.category, data.conservationStatus, data.activityHours, data.latitude, data.longitude,
          data.triggerRadius, data.avatarUrl, data.displayOrder, data.status, version];
        let poiId = id;
        if (poiId === null) {
          const [insert] = await connection.query("INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, avatar_url, display_order, status, content_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values);
          poiId = insert.insertId;
        } else {
          await connection.query("UPDATE POIS SET name = ?, category = ?, conservation_status = ?, activity_hours = ?, latitude = ?, longitude = ?, trigger_radius = ?, avatar_url = ?, display_order = ?, status = ?, content_version = ? WHERE poi_id = ?", [...values, poiId]);
        }
        if (sourceChanged) {
          await connection.query(`INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
            VALUES (?, 'vi', ?, ?, ?, ?, 'READY') ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), audio_script = VALUES(audio_script), source_version = VALUES(source_version), status = 'READY'`,
          [poiId, data.name, data.description, data.audioScript, version]);
          await connection.query(`INSERT INTO CONTENT_JOBS (poi_id, language_code, source_version, status)
            SELECT ?, code, ?, 'PENDING' FROM LANGUAGES WHERE is_active = 1
            ON DUPLICATE KEY UPDATE job_id = job_id`, [poiId, version]);
        }
        await this.audit.create({ ...audit, userId: actorId, resourceType: "POIS", resourceId: String(poiId) }, connection);
        return { ...await this.get(poiId, connection), processing: sourceChanged ? "PENDING" : "UNCHANGED" };
      } });
    });
  }
  async deactivate(actorId, id, authorize, ipAddress) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      const [rows] = await connection.query("SELECT poi_id, status FROM POIS WHERE poi_id = ? FOR UPDATE", [id]);
      if (!rows[0]) return undefined;
      if (rows[0].status !== "INACTIVE") {
        await connection.query("UPDATE POIS SET status = 'INACTIVE' WHERE poi_id = ?", [id]);
        await this.audit.create({ userId: actorId, action: "DEACTIVATE_POI", resourceType: "POIS", resourceId: String(id), ipAddress }, connection);
      }
      return this.get(id, connection);
    });
  }
}
module.exports = PoiStore;
