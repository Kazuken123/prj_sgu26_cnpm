const { createHash } = require("node:crypto");
const { manifest, DIGEST, reviewed, canUpdate, sameCoordinates } = require("../config/poi-locations");
const { loadInput } = require("../config/additional-pois-input");

function validateRows(rows, identities) {
  if (!Array.isArray(rows) || rows.length !== identities.length || new Set(rows.map(row => Number(row.poi_id))).size !== identities.length ||
      rows.some(row => {
        const expected = identities.find(point => point.poiId === Number(row.poi_id));
        return !expected || row.name !== expected.name || Number(row.content_version) !== expected.sourceVersion ||
          !["ACTIVE", "INACTIVE"].includes(row.status) || !Number.isFinite(Number(row.latitude)) || Math.abs(Number(row.latitude)) > 90 ||
          !Number.isFinite(Number(row.longitude)) || Math.abs(Number(row.longitude)) > 180;
      })) throw new Error("POI_LOCATION_IDENTITY_CONFLICT");
  return rows.map(row => ({ poi_id: Number(row.poi_id), name: row.name, content_version: Number(row.content_version), status: row.status,
    latitude: Number(row.latitude), longitude: Number(row.longitude) })).sort((a, b) => a.poi_id - b.poi_id);
}

class PoiLocationService {
  constructor(store, dependencies = {}) {
    this.store = store; this.loadInput = dependencies.loadInput || loadInput;
  }
  async apply({ apply = false, expectedHash } = {}) {
    const additional = await this.loadInput();
    const identities = additional.pois.map(row => ({ poiId: row.poiId, name: row.name, sourceVersion: row.sourceVersion }));
    return this.store.transaction(apply, async state => {
      const before = validateRows(await state.read(), identities);
      const planHash = createHash("sha256").update(JSON.stringify({ version: manifest.version, manifestSha256: DIGEST, rows: before })).digest("hex");
      const changes = before.flatMap(row => {
        const point = manifest.points.find(item => item.poiId === row.poi_id);
        return canUpdate(point) && !sameCoordinates(row, point) ? [{ poiId: point.poiId, name: point.name, kind: point.kind, sourceUrl: point.sourceUrl,
          from: { latitude: row.latitude, longitude: row.longitude }, to: { latitude: point.latitude, longitude: point.longitude } }] : [];
      });
      const result = { version: manifest.version, manifestSha256: DIGEST, planHash, points: identities.length, reviewedTargets: manifest.points.filter(canUpdate).length,
        pendingCoordinatePoiIds: manifest.points.filter(point => !reviewed(point)).map(point => point.poiId),
        unverifiedTreeIdentityPoiIds: [18], changedPoints: changes.length, changes, surveyed: false };
      if (!apply) return { ...result, outcome: changes.length ? "PLAN" : "UNCHANGED" };
      if (expectedHash !== planHash) throw new Error("POI_LOCATION_PLAN_CHANGED");
      if (!changes.length) return { ...result, outcome: "UNCHANGED" };
      for (const change of changes) await state.update(manifest.points.find(point => point.poiId === change.poiId), before.find(row => row.poi_id === change.poiId));
      const after = validateRows(await state.read(), identities);
      const expected = before.map(row => {
        const change = changes.find(item => item.poiId === row.poi_id);
        return change ? { ...row, ...change.to } : row;
      });
      if (JSON.stringify(after) !== JSON.stringify(expected)) throw new Error("POI_LOCATION_WRITE_FAILED");
      await state.audit({ ...result, before, after });
      return { ...result, outcome: "UPDATED" };
    });
  }
}

module.exports = { PoiLocationService, validateRows };
