const { createHash } = require("node:crypto");
const pool = require("../config/database");
const AuditLogStore = require("./audit_log.store");
class DemoSeedStore {
  constructor(db = pool) { this.db = db; this.audit = new AuditLogStore(db); }
  async transaction(database, datasetId, work) {
    const connection = await this.db.getConnection();
    const lock = createHash("sha256").update(database + ":" + datasetId).digest("hex");
    let locked = false, begun = false, discard = false;
    try {
      const [[actual]] = await connection.query("SELECT DATABASE() AS name");
      if (actual.name !== database) throw new Error("WRONG_DEMO_DATABASE");
      // An unknown GET_LOCK reply may still have acquired a session lock.
      // Never return that connection to the pool without closing the session.
      discard = true;
      const [[acquired]] = await connection.query("SELECT GET_LOCK(?, 5) AS acquired", [lock]);
      discard = false;
      if (Number(acquired.acquired) !== 1) throw new Error("DEMO_LOCK_UNAVAILABLE");
      locked = true;
      begun = true; await connection.beginTransaction();
      const result = await work({
        markers: async action => (await connection.query("SELECT details FROM AUDIT_LOGS WHERE action = ? AND resource_type = 'DEMO_DATASET' AND resource_id = ? ORDER BY log_id FOR UPDATE", [action, datasetId]))[0],
        collisions: async () => {
          // A new dedicated demo DB must not adopt any pre-existing content,
          // even if someone renamed a previous import or removed its marker.
          const [pois] = await connection.query("SELECT poi_id FROM POIS LIMIT 1");
          const [tours] = await connection.query("SELECT tour_id FROM TOURS LIMIT 1");
          return pois.length > 0 || tours.length > 0;
        },
        languages: async () => (await connection.query("SELECT code FROM LANGUAGES WHERE code IN ('en','vi') AND is_active = 1 ORDER BY code FOR UPDATE"))[0].map(row => row.code),
        owned: marker => this.owned(connection, marker),
        insert: manifest => this.insert(connection, manifest),
        audit: (action, marker) => this.audit.create({ userId: null, action, resourceType: "DEMO_DATASET", resourceId: datasetId, details: JSON.stringify(marker) }, connection),
      });
      await connection.commit(); begun = false;
      return result;
    } catch (error) {
      if (begun) { try { await connection.rollback(); } catch { discard = true; } }
      throw error;
    } finally {
      if (locked) {
        try { const [[released]] = await connection.query("SELECT RELEASE_LOCK(?) AS released", [lock]); if (Number(released.released) !== 1) discard = true; }
        catch { discard = true; }
      }
      if (discard) connection.destroy(); else connection.release();
    }
  }
  async owned(connection, marker) {
    const pois = [], translationIds = [], jobIds = [];
    for (const poiId of marker.poiIds) {
      const [[poi]] = await connection.query(`SELECT name, category, conservation_status AS conservationStatus, activity_hours AS activityHours,
        latitude, longitude, trigger_radius AS triggerRadius, avatar_url AS avatarUrl, display_order AS displayOrder,
        status, content_version AS contentVersion FROM POIS WHERE poi_id = ? FOR UPDATE`, [poiId]);
      if (!poi) return {};
      poi.latitude = Number(poi.latitude); poi.longitude = Number(poi.longitude);
      const [texts] = await connection.query("SELECT translation_id, language_code, name, description, audio_script, source_version, status FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY language_code DESC FOR UPDATE", [poiId]);
      poi.text = {};
      for (const text of texts) {
        if (text.status !== "READY" || text.source_version !== 1) return {};
        poi.text[text.language_code] = { name: text.name, description: text.description, audioScript: text.audio_script };
        translationIds.push(text.translation_id);
      }
      const [jobs] = await connection.query("SELECT job_id, language_code, source_version FROM CONTENT_JOBS WHERE poi_id = ? ORDER BY language_code DESC FOR UPDATE", [poiId]);
      if (jobs.length !== 2 || jobs.some(row => row.source_version !== 1) || jobs.map(row => row.language_code).join() !== "vi,en") return {};
      jobIds.push(...jobs.map(row => row.job_id)); pois.push(poi);
    }
    const [[tour]] = await connection.query("SELECT name, description FROM TOURS WHERE tour_id = ? FOR UPDATE", [marker.tourId]);
    const [links] = await connection.query("SELECT poi_id, sequence_no FROM TOUR_POIS WHERE tour_id = ? ORDER BY sequence_no FOR UPDATE", [marker.tourId]);
    return { pois, tour, links: links.every((row, index) => row.sequence_no === index + 1) ? links.map(row => row.poi_id) : [], translationIds, jobIds };
  }
  async insert(connection, manifest) {
    const poiIds = [], translationIds = [], jobIds = [];
    for (const [index, poi] of manifest.pois.entries()) {
      const [insert] = await connection.query(`INSERT INTO POIS (name, category, latitude, longitude, trigger_radius, display_order, status, content_version)
        VALUES (?, 'ANIMAL', ?, ?, 30, ?, 'ACTIVE', 1)`, [poi.text.vi.name, poi.latitude, poi.longitude, index + 1]);
      poiIds.push(insert.insertId);
      for (const language of ["vi", "en"]) {
        const text = poi.text[language];
        const [translation] = await connection.query(`INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
          VALUES (?, ?, ?, ?, ?, 1, 'READY')`, [insert.insertId, language, text.name, text.description, text.audioScript]);
        const [job] = await connection.query("INSERT INTO CONTENT_JOBS (poi_id, language_code, source_version, status) VALUES (?, ?, 1, 'PENDING')", [insert.insertId, language]);
        translationIds.push(translation.insertId); jobIds.push(job.insertId);
      }
    }
    const [tour] = await connection.query("INSERT INTO TOURS (name, description) VALUES (?, ?)", [manifest.tour.name, manifest.tour.description]);
    for (const [index, id] of poiIds.entries()) await connection.query("INSERT INTO TOUR_POIS (tour_id, poi_id, sequence_no) VALUES (?, ?, ?)", [tour.insertId, id, index + 1]);
    return { poiIds, translationIds, jobIds, tourId: tour.insertId };
  }
}
module.exports = DemoSeedStore;
