const pool = require("../config/database");
class ContentStore {
  constructor(db = pool) { this.db = db; }
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
