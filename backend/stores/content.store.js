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
}
module.exports = ContentStore;
