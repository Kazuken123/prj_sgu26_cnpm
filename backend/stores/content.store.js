const pool = require("../config/database");
const AuthStore = require("./auth.store");
class ContentStore {
  constructor(db = pool) { this.db = db; this.transactions = new AuthStore(db); }
  async withMapSnapshot(work) {
    return this.transactions.transaction(async connection => {
      const [clock] = await connection.query("SELECT UTC_TIMESTAMP(3) AS nowUtc");
      const [languages] = await connection.query("SELECT code, name FROM LANGUAGES WHERE is_active = 1 ORDER BY code");
      return work({ nowUtc: clock[0].nowUtc, languages, content: async languageCodes => {
        const [pois] = await connection.query(`SELECT poi_id AS poiId, name AS originalName, category,
          latitude, longitude, trigger_radius AS triggerRadius, avatar_url AS avatarUrl,
          display_order AS displayOrder, content_version AS contentVersion
          FROM POIS WHERE status = 'ACTIVE' ORDER BY display_order, poi_id`);
        const placeholders = languageCodes.map(() => "?").join(",");
        // Public projection deliberately never reads scripts, audio or visitor/payment data.
        const [translations] = await connection.query(`SELECT t.poi_id AS poiId, t.language_code AS languageCode,
          t.name, t.description FROM POI_TRANSLATIONS t JOIN POIS p ON p.poi_id = t.poi_id
          JOIN LANGUAGES l ON l.code = t.language_code WHERE p.status = 'ACTIVE' AND l.is_active = 1
          AND t.status = 'READY' AND t.source_version = p.content_version
          AND t.language_code IN (${placeholders})`, languageCodes);
        return { pois, translations };
      } });
    }, { repeatableRead: true });
  }
  async withBundleSnapshot({ sessionId, tokenHash }, work) {
    return this.transactions.transaction(async connection => {
      // Same payment-before-visit order as webhook/checkout/token exchange.
      const [payments] = await connection.query("SELECT status AS paymentStatus, paid_at AS paidAt FROM PAYMENTS WHERE session_id = ? FOR UPDATE", [sessionId]);
      const [visits] = await connection.query(`SELECT status AS sessionStatus, token_hash AS tokenHash, activated_at AS activatedAt,
        expires_at AS expiresAt FROM VISIT_SESSIONS WHERE session_id = ? FOR UPDATE`, [sessionId]);
      const [clock] = await connection.query("SELECT UTC_TIMESTAMP(3) AS nowUtc");
      return work({ visit: visits[0] && payments[0] ? { ...visits[0], ...payments[0] } : undefined, nowUtc: clock[0].nowUtc,
        languages: async () => {
          const [rows] = await connection.query("SELECT code, name FROM LANGUAGES WHERE is_active = 1 ORDER BY code"); return rows;
        },
        content: async languageCodes => {
          const [pois] = await connection.query(`SELECT poi_id AS poiId, name AS originalName, category, conservation_status AS conservationStatus,
            activity_hours AS activityHours, latitude, longitude, trigger_radius AS triggerRadius, avatar_url AS avatarUrl,
            display_order AS displayOrder, content_version AS contentVersion FROM POIS WHERE status = 'ACTIVE' ORDER BY display_order, poi_id`);
          const placeholders = languageCodes.map(() => "?").join(",");
          const [translations] = await connection.query(`SELECT t.poi_id AS poiId, t.language_code AS languageCode, t.name, t.description,
            t.audio_script AS audioScript, t.status, t.source_version AS sourceVersion, a.status AS audioStatus,
            a.source_version AS audioVersion, a.file_url AS fileUrl, a.duration, a.file_size AS fileSize
            FROM POI_TRANSLATIONS t JOIN POIS p ON p.poi_id = t.poi_id JOIN LANGUAGES l ON l.code = t.language_code
            LEFT JOIN AUDIOS a ON a.translation_id = t.translation_id
            WHERE p.status = 'ACTIVE' AND l.is_active = 1 AND t.language_code IN (${placeholders})`, languageCodes);
          const [tours] = await connection.query("SELECT tour_id AS tourId, name, description FROM TOURS ORDER BY tour_id");
          const [items] = await connection.query(`SELECT tp.tour_id AS tourId, tp.poi_id AS poiId, tp.sequence_no AS sequenceNo
            FROM TOUR_POIS tp JOIN POIS p ON p.poi_id = tp.poi_id WHERE p.status = 'ACTIVE' ORDER BY tp.tour_id, tp.sequence_no`);
          return { pois, translations, tours, items };
        },
        recordAccess: async languageCode => {
          // Recheck at the actual write: expiry may pass while building the response.
          const [saved] = await connection.query(`INSERT INTO BUNDLE_ACCESS_LOGS (session_id, language_code)
            SELECT s.session_id, ? FROM VISIT_SESSIONS s JOIN PAYMENTS p ON p.session_id = s.session_id
            WHERE s.session_id = ? AND s.token_hash = ? AND s.status = 'ACTIVE' AND s.expires_at > UTC_TIMESTAMP(3)
            AND s.activated_at IS NOT NULL AND p.status = 'PAID' AND p.paid_at IS NOT NULL`, [languageCode, sessionId, tokenHash]);
          return saved.affectedRows === 1;
        },
      });
    }, { repeatableRead: true });
  }
  async getForUpdate(poiId, languageCode, executor = this.db) {
    const [rows] = await executor.query(`SELECT translation_id AS translationId, name, description, audio_script AS audioScript,
      source_version AS sourceVersion, status FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = ? FOR UPDATE`, [poiId, languageCode]);
    return rows[0];
  }
  async saveTranslation(poiId, languageCode, sourceVersion, text, executor = this.db) {
    await executor.query(`INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
      VALUES (?, ?, ?, ?, ?, ?, 'READY') ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
      audio_script = VALUES(audio_script), source_version = VALUES(source_version), status = 'READY'`,
    [poiId, languageCode, text.name, text.description, text.audioScript, sourceVersion]);
  }
  async getAudioForUpdate(translationId, executor = this.db) {
    const [rows] = await executor.query(`SELECT file_url AS fileUrl, duration, file_size AS fileSize, source_version AS sourceVersion, status
      FROM AUDIOS WHERE translation_id = ? FOR UPDATE`, [translationId]);
    return rows[0];
  }
  async saveAudio(translationId, version, asset, executor = this.db) {
    await executor.query(`INSERT INTO AUDIOS (translation_id, source_version, file_url, duration, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE source_version = VALUES(source_version), file_url = VALUES(file_url),
      duration = VALUES(duration), file_size = VALUES(file_size), status = VALUES(status)`,
    [translationId, version, asset?.fileUrl ?? null, asset?.duration ?? null, asset?.fileSize ?? null, asset ? "AVAILABLE" : "FAILED"]);
  }
  async getPublishedAudio(fileUrl) {
    const [rows] = await this.db.query(`SELECT a.file_url AS fileUrl, a.duration, a.file_size AS fileSize FROM AUDIOS a
      JOIN POI_TRANSLATIONS t ON t.translation_id = a.translation_id JOIN POIS p ON p.poi_id = t.poi_id
      JOIN LANGUAGES l ON l.code = t.language_code WHERE a.file_url = ? AND a.status = 'AVAILABLE' AND t.status = 'READY'
      AND a.source_version = t.source_version AND t.source_version = p.content_version AND p.status = 'ACTIVE' AND l.is_active = 1 LIMIT 1`, [fileUrl]);
    return rows[0];
  }
}
module.exports = ContentStore;
