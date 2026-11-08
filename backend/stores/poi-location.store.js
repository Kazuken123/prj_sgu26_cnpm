const { manifest, canUpdate, sameCoordinates } = require("../config/poi-locations");

class PoiLocationStore {
  static createDatabase(env) {
    const options = require("../config/database-options").databaseOptions(env);
    return require("../config/utc-pool")(require("mysql2/promise").createPool(options));
  }
  constructor(db, target) {
    if (!db || (target !== "tcv_demo_review_20261020" && !(process.env.NODE_ENV === "test" && /^tcv_poi_locations_test_[a-f0-9]{32}$/.test(target || "")))) throw new Error("POI_LOCATION_TARGET_REQUIRED");
    this.db = db; this.target = target;
  }
  async transaction(apply, work) {
    const connection = await this.db.getConnection();
    let begun = false, locked = false;
    const lock = "tcv-staging:" + this.target;
    try {
      const [[identity]] = await connection.query("SELECT DATABASE() AS name");
      if (identity?.name !== this.target) throw new Error("POI_LOCATION_PHYSICAL_TARGET_MISMATCH");
      if (apply) {
        const [[answer]] = await connection.query("SELECT GET_LOCK(?,10) AS acquired", [lock]);
        if (Number(answer?.acquired) !== 1) throw new Error("POI_LOCATION_LOCK_UNAVAILABLE");
        locked = true; await connection.beginTransaction();
      } else await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
      begun = true;
      const result = await work({
        read: async () => (await connection.query("SELECT poi_id,name,content_version,status,latitude,longitude FROM POIS WHERE poi_id BETWEEN 11 AND 18 ORDER BY poi_id" + (apply ? " FOR UPDATE" : "")))[0],
        update: async (point, before) => {
          if (!apply) throw new Error("POI_LOCATION_READ_ONLY");
          const target = manifest.points.find(item => item.poiId === point?.poiId);
          if (!canUpdate(target) || Number(before?.poi_id) !== target.poiId || point.name !== target.name ||
              before.name !== target.name || !sameCoordinates(point, target)) throw new Error("POI_LOCATION_NEW_POIS_ONLY");
          const [saved] = await connection.query("UPDATE POIS SET latitude=?,longitude=? WHERE poi_id=? AND name=? AND content_version=? AND status=? AND latitude=? AND longitude=?",
            [point.latitude, point.longitude, before.poi_id, before.name, before.content_version, before.status, before.latitude, before.longitude]);
          if (saved.affectedRows !== 1) throw new Error("POI_LOCATION_WRITE_CONFLICT");
        },
        audit: async details => {
          if (!apply) throw new Error("POI_LOCATION_READ_ONLY");
          await connection.query("INSERT INTO AUDIT_LOGS(action,resource_type,resource_id,details) VALUES('SEED_APPROVED_DEMO','DEMO_DATASET','TCV_BROWSER_DEMO_POSITIONS_V2',?)", [JSON.stringify(details)]);
        },
      });
      await connection.commit(); begun = false; return result;
    } catch (error) { if (begun) await connection.rollback().catch(() => {}); throw error; }
    finally {
      if (locked) await connection.query("SELECT RELEASE_LOCK(?)", [lock]).catch(() => {});
      connection.release();
    }
  }
}

module.exports = PoiLocationStore;
