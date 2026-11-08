const { LANGUAGE_CODES } = require("../config/additional-pois-input");

class AdditionalPoisSeedStore {
  constructor(db, target = process.env.DB_NAME) { this.db = db || require("../config/database"); this.target = target; }
  async run(apply, work) {
    const connection = await this.db.getConnection();
    let locked = false, transaction = false;
    const lockName = "tcv-staging:" + this.target;
    try {
      const [identity] = await connection.query("SELECT DATABASE() AS name");
      if (!this.target || identity[0]?.name !== this.target) throw new Error("ADDITIONAL_DATABASE_IDENTITY_MISMATCH");
      if (apply) {
        const [rows] = await connection.query("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
        if (rows[0]?.acquired !== 1) throw new Error("ADDITIONAL_DATABASE_LOCK_UNAVAILABLE");
        locked = true;
        await connection.beginTransaction(); transaction = true;
      }
      const state = {
        snapshot: async input => {
          const ids = input.pois.map(p => p.poiId), names = input.pois.map(p => p.name);
          const queries = [
            ["languages", "SELECT code, is_active FROM LANGUAGES WHERE code IN (?)", [LANGUAGE_CODES]],
            ["pois", "SELECT poi_id, name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, avatar_url, display_order, status, content_version FROM POIS WHERE poi_id IN (?) OR name IN (?)", [ids, names]],
            ["translations", "SELECT translation_id, poi_id, language_code, name, description, audio_script, source_version, status FROM POI_TRANSLATIONS WHERE poi_id IN (?)", [ids]],
            ["audios", "SELECT a.audio_id, a.translation_id, a.file_url, a.duration, a.file_size, a.source_version, a.status FROM AUDIOS a JOIN POI_TRANSLATIONS t ON t.translation_id = a.translation_id WHERE t.poi_id IN (?)", [ids]],
            ["jobs", "SELECT job_id, poi_id, language_code, source_version, status, error_message, claim_id, lease_expires_at FROM CONTENT_JOBS WHERE poi_id IN (?)", [ids]],
          ];
          const result = {};
          for (const [key, sql, params] of queries) { const [rows] = await connection.query(sql, params); result[key] = rows; }
          return result;
        },
        insertPoi: async p => {
          const [result] = await connection.query(`INSERT INTO POIS
            (poi_id, name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?
            WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE poi_id = ? OR name = ?)`,
          [p.poiId, p.name, p.category, p.conservationStatus, p.activityHours, p.latitude, p.longitude, p.radius, p.displayOrder, p.sourceVersion, p.poiId, p.name]);
          return result.affectedRows;
        },
        insertTranslation: async (p, code) => {
          const t = p.translations[code];
          const [result] = await connection.query(`INSERT INTO POI_TRANSLATIONS
            (poi_id, language_code, name, description, audio_script, source_version, status)
            SELECT ?, ?, ?, ?, ?, ?, 'READY'
            WHERE NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = ?)`,
          [p.poiId, code, t.name, t.description, t.audioScript, p.sourceVersion, p.poiId, code]);
          return result.affectedRows;
        },
        insertAudio: async file => {
          const [result] = await connection.query(`INSERT INTO AUDIOS
            (translation_id, file_url, duration, file_size, source_version, status)
            SELECT t.translation_id, ?, ?, ?, ?, 'AVAILABLE' FROM POI_TRANSLATIONS t
            WHERE t.poi_id = ? AND t.language_code = ? AND t.source_version = ? AND t.status = 'READY'
              AND NOT EXISTS (SELECT 1 FROM AUDIOS a WHERE a.translation_id = t.translation_id)`,
          ["/api/media/audio/" + file.key, file.duration, file.fileSize, file.sourceVersion, file.poiId, file.languageCode, file.sourceVersion]);
          return result.affectedRows;
        },
        insertJob: async (p, code) => {
          const [result] = await connection.query(`INSERT INTO CONTENT_JOBS (poi_id, language_code, source_version, status)
            SELECT ?, ?, ?, 'COMPLETED'
            WHERE NOT EXISTS (SELECT 1 FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = ? AND source_version = ?)`,
          [p.poiId, code, p.sourceVersion, p.poiId, code, p.sourceVersion]);
          return result.affectedRows;
        },
      };
      const result = await work(state);
      if (transaction) { await connection.commit(); transaction = false; }
      return result;
    } catch (error) {
      if (transaction) await connection.rollback().catch(() => {});
      throw error;
    } finally {
      if (locked) await connection.query("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => {});
      connection.release();
    }
  }
}

module.exports = AdditionalPoisSeedStore;
