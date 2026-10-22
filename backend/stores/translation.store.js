const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const ContentStore = require("./content.store");
const AuditStore = require("./audit_log.store");

class TranslationStore {
  constructor(db = pool) {
    this.transactions = new AuthStore(db); this.users = new UserStore(db);
    this.content = new ContentStore(db); this.audit = new AuditStore(db);
  }
  async withTranslation(actorId, poiId, languageCode, work) {
    return this.transactions.transaction(async connection => {
      const actor = await this.users.getUserById(actorId, connection, true);
      // Match POI edit, worker and retry lock order: parent, job, then text/audio.
      const [parents] = await connection.query("SELECT content_version AS contentVersion FROM POIS WHERE poi_id = ? FOR UPDATE", [poiId]);
      const [languages] = await connection.query("SELECT code, is_active AS active FROM LANGUAGES WHERE code = ? FOR SHARE", [languageCode]);
      const parent = parents[0];
      let job, source, translation, audio;
      if (parent) {
        const [jobs] = await connection.query(`SELECT job_id AS jobId, status FROM CONTENT_JOBS
          WHERE poi_id = ? AND language_code = ? AND source_version = ? FOR UPDATE`, [poiId, languageCode, parent.contentVersion]);
        job = jobs[0];
        source = await this.content.getForUpdate(poiId, "vi", connection);
        translation = await this.content.getForUpdate(poiId, languageCode, connection);
        if (translation) audio = await this.content.getAudioForUpdate(translation.translationId, connection);
      }
      return work({ actor, parent, language: languages[0], source, translation, audio, job,
        persist: async (text, ipAddress) => {
          await this.content.saveTranslation(poiId, languageCode, parent.contentVersion, text, connection);
          const saved = await this.content.getForUpdate(poiId, languageCode, connection);
          await this.audit.create({ userId: actorId, action: "IMPORT_REVIEWED_TRANSLATION", resourceType: "POI_TRANSLATIONS",
            resourceId: String(saved.translationId), ipAddress,
            details: JSON.stringify({ poiId, languageCode, sourceVersion: parent.contentVersion }) }, connection);
        } });
    });
  }
}
module.exports = TranslationStore;
