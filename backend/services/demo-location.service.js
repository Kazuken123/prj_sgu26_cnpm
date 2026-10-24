const { createHash } = require("node:crypto");
const { manifest } = require("../config/demo-locations");
const { load } = require("../config/staging-dataset");
const hash = rows => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
class DemoLocationService {
  constructor(store) { this.store = store; }
  async apply({ apply = false, expectedHash } = {}) {
    const base = (await load()).tables.POIS;
    return this.store.transaction(async state => {
      const rows = await state.read();
      if (rows.length !== base.length || rows.some(row => !base.some(p => p.poi_id === row.poi_id && p.name === row.name && p.content_version === row.content_version && p.status === row.status))) throw new Error("LOCATION_IDENTITY_CONFLICT");
      const old = rows.every(row => base.some(p => p.poi_id === row.poi_id && Number(p.latitude) === Number(row.latitude) && Number(p.longitude) === Number(row.longitude)));
      const updated = rows.every(row => manifest.points.some(p => p.poiId === row.poi_id && Number(row.latitude) === p.latitude && Number(row.longitude) === p.longitude));
      if (updated) return { outcome: "UNCHANGED", points: rows.length };
      if (!old) throw new Error("LOCATION_DRIFT_STOP");
      const planHash = hash(rows);
      if (!apply) return { outcome: "PLAN", points: rows.length, planHash, osmReference: 3, simulated: 7 };
      if (expectedHash !== planHash) throw new Error("LOCATION_PLAN_CHANGED");
      for (const point of manifest.points) await state.update(point);
      const after = await state.read();
      if (!after.every(row => manifest.points.some(p => p.poiId === row.poi_id && Number(row.latitude) === p.latitude && Number(row.longitude) === p.longitude))) throw new Error("LOCATION_WRITE_FAILED");
      await state.audit({ version: manifest.version, before: rows, after, planHash, surveyed: false });
      return { outcome: "UPDATED", points: rows.length, osmReference: 3, simulated: 7 };
    });
  }
}
module.exports = DemoLocationService;
