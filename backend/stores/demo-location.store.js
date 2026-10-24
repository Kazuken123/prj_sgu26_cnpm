const AuthStore = require("./auth.store");
class DemoLocationStore {
  constructor(db, target) {
    if (target !== "tcv_demo_review_20261020" && !(process.env.NODE_ENV === "test" && /^tcv_staging_test_[a-f0-9]{32}$/.test(target || ""))) throw new Error("WRONG_LOCATION_DATABASE");
    this.db = db; this.target = target;
  }
  async transaction(work) {
    return new AuthStore(this.db).transaction(async c => {
      const [[actual]] = await c.query("SELECT DATABASE() AS name");
      if (actual.name !== this.target) throw new Error("WRONG_PHYSICAL_DATABASE");
      const read = async () => (await c.query(`SELECT poi_id,name,content_version,status,latitude,longitude FROM POIS ORDER BY poi_id FOR UPDATE`))[0];
      // Locks every demo POI in ID order; repeat/concurrent applications see either full old or full new coordinates.
      return work({ read, update: async point => {
        const [saved] = await c.query("UPDATE POIS SET latitude=?,longitude=? WHERE poi_id=? AND name=? AND status='ACTIVE'",
          [point.latitude, point.longitude, point.poiId, point.name]);
        if (saved.affectedRows !== 1) throw new Error("LOCATION_WRITE_CONFLICT");
      }, audit: details => c.query(`INSERT INTO AUDIT_LOGS(action,resource_type,resource_id,details)
        VALUES('SEED_APPROVED_DEMO','DEMO_DATASET','TCV_BROWSER_DEMO_POSITIONS_V1',?)`, [JSON.stringify(details)]) });
    });
  }
}
module.exports = DemoLocationStore;
