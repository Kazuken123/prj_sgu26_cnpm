const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const locations = require("../config/poi-locations");
const oldLocations = require("../config/demo-locations");
const { load } = require("../config/staging-dataset");
const { loadInput, LANGUAGE_CODES } = require("../config/additional-pois-input");
const { PoiLocationService } = require("../services/poi-location.service");
const PoiLocationStore = require("../stores/poi-location.store");
const { parseOptions } = require("../scripts/poi-locations");
const { validateSnapshot } = require("../services/additional-pois-seed.service");

async function fixture() {
  const base = await load(), additional = await loadInput();
  const rows = [...base.tables.POIS.map(row => {
    const point = oldLocations.manifest.points.find(item => item.poiId === row.poi_id);
    return { ...row, latitude: point.latitude, longitude: point.longitude };
  }), ...additional.pois.map(row => ({ poi_id: row.poiId, name: row.name, content_version: row.sourceVersion, status: "ACTIVE",
    latitude: row.latitude, longitude: row.longitude, avatar_url: null, trigger_radius: row.radius, display_order: row.displayOrder }))];
  const events = []; let failAudit = false;
  const store = {
    async transaction(apply, work) {
      const saved = structuredClone(rows);
      try {
        const result = await work({ read: async () => structuredClone(rows.filter(row => row.poi_id >= 11 && row.poi_id <= 18)),
          update: async (point, before) => {
            assert.equal(apply, true); events.push("UPDATE:" + point.poiId);
            const row = rows.find(item => item.poi_id === point.poiId);
            assert.equal(row.status, before.status); assert.equal(row.content_version, before.content_version);
            row.latitude = point.latitude; row.longitude = point.longitude;
          },
          audit: async details => { assert.equal(apply, true); if (failAudit) throw new Error("TEST_AUDIT_FAILURE"); events.push(details); },
        });
        return result;
      } catch (error) { rows.splice(0, rows.length, ...saved); throw error; }
    },
  };
  return { base, additional, rows, events, service: new PoiLocationService(store), failAudit: () => { failAudit = true; } };
}

test("V2 preserves every V1 point and retains the pinned audio source", async () => {
  assert.deepEqual(locations.manifest.points.slice(0, 10), oldLocations.manifest.points);
  assert.equal(locations.manifest.points.length, 18);
  assert.deepEqual(locations.manifest.points.filter(point => !locations.reviewed(point)).map(point => point.poiId), [18]);
  const schematicTargets = {
    11: [10.7858, 106.7080], 12: [10.7862, 106.7077], 13: [10.7885, 106.7058],
    15: [10.7865, 106.7081], 16: [10.7863, 106.7079],
  };
  for (const [id, coordinates] of Object.entries(schematicTargets)) {
    const point = locations.manifest.points.find(item => item.poiId === Number(id));
    assert.equal(point.kind, "SCHEMATIC_SIMULATION");
    assert.deepEqual([point.latitude, point.longitude], coordinates);
    assert.equal(point.surveyed, false); assert.equal(point.evidence.locationVerified, false);
    assert.equal(point.evidence.sourceImageSha256, "91349b51c63391490ce20898bc35f96f310086daf276c8f2644eb79323219e37");
    assert.equal(point.evidence.method, "APPROXIMATE_AREA_ESTIMATE_FROM_PERSPECTIVE_SCHEMATIC_NOT_GEOREFERENCED");
    assert.equal(point.evidence.sourceImageWidth, 17000); assert.equal(point.evidence.sourceImageHeight, 10744);
    assert.equal(point.evidence.previewWidth, 2125); assert.equal(point.evidence.previewHeight, 1343);
  }
  const bytes = await fs.readFile(path.resolve(__dirname, "../../data/demo/locations/positions-v2.json"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), locations.DIGEST);
  const modified = JSON.parse(bytes); modified.points[13].latitude += 0.01;
  assert.throws(() => locations.parse(Buffer.from(JSON.stringify(modified))), /MANIFEST_CHANGED/);
  assert.equal((await loadInput()).sourceSha256, "527ebab96807c9313d4b38026afe06f2a34de52f4967ea8921c8563f0067410c");
});

test("plan changes only reviewed coordinates and preserves custom pending positions and visibility", async () => {
  const f = await fixture(), pending = f.rows.find(row => row.poi_id === 18);
  pending.status = "INACTIVE"; pending.latitude = 10.7889; pending.longitude = 106.7084;
  f.rows.find(row => row.poi_id === 12).status = "INACTIVE";
  const before = structuredClone(f.rows), plan = await f.service.apply();
  assert.equal(plan.outcome, "PLAN"); assert.equal(plan.points, 8); assert.equal(plan.reviewedTargets, 7);
  assert.deepEqual(plan.changes.map(change => change.poiId), [11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(plan.pendingCoordinatePoiIds, [18]);
  assert.deepEqual(plan.unverifiedTreeIdentityPoiIds, [18]);
  assert.deepEqual(f.rows, before); assert.deepEqual(f.events, []);
  const result = await f.service.apply({ apply: true, expectedHash: plan.planHash });
  assert.equal(result.outcome, "UPDATED");
  assert.deepEqual(f.rows.find(row => row.poi_id === 18), before.find(row => row.poi_id === 18));
  for (const row of f.rows) {
    const prior = before.find(item => item.poi_id === row.poi_id);
    assert.deepEqual({ ...row, latitude: prior.latitude, longitude: prior.longitude }, prior);
  }
  const replay = await f.service.apply();
  assert.equal(replay.outcome, "UNCHANGED"); assert.equal(replay.changedPoints, 0);
  assert.equal((await f.service.apply({ apply: true, expectedHash: replay.planHash })).outcome, "UNCHANGED");
});

test("the original ten POIs stay untouched even when their coordinates differ from V1", async () => {
  const f = await fixture();
  for (const row of f.rows.filter(item => item.poi_id <= 10)) {
    row.latitude += 0.000123; row.longitude -= 0.000321;
    row.status = "INACTIVE"; row.avatar_url = "/original-photo.webp";
    row.display_order = 99; row.activity_hours = "TEST original hours";
    row.name = "TEST original " + row.poi_id; row.content_version = 7;
  }
  const firstTen = structuredClone(f.rows.filter(row => row.poi_id <= 10));
  const plan = await f.service.apply();
  assert.deepEqual(plan.changes.map(change => change.poiId), [11, 12, 13, 14, 15, 16, 17]);
  await f.service.apply({ apply: true, expectedHash: plan.planHash });
  assert.deepEqual(f.rows.filter(row => row.poi_id <= 10), firstTen);
  assert.equal(f.events.some(event => typeof event === "string" && /^UPDATE:(?:[1-9]|10)$/.test(event)), false);
  const replay = await f.service.apply();
  assert.equal(replay.outcome, "UNCHANGED"); assert.equal(replay.changedPoints, 0);
});

test("the original ten retain their V1 location-note behavior", () => {
  for (const point of oldLocations.manifest.points) {
    const poi = { poiId: point.poiId, originalName: point.name, latitude: point.latitude, longitude: point.longitude };
    assert.equal(locations.locationNote(poi), null);
    assert.deepEqual(oldLocations.locationNote(poi), { kind: point.kind, label: point.kind === "OSM_REFERENCE"
      ? "Vị trí tham khảo OSM theo bản ghi nguồn đã lưu; chưa tái xác minh, chưa khảo sát thực địa."
      : "Vị trí mô phỏng theo sơ đồ cho demo; không xác nhận vị trí thực tế của cá thể hoặc cây." });
    assert.equal(oldLocations.locationNote({ ...poi, longitude: poi.longitude + 0.0001 }), null);
  }
});

test("changed coordinates, identities or versions invalidate a reviewed apply plan", async () => {
  const f = await fixture(), plan = await f.service.apply();
  f.rows[11].longitude += 0.0001;
  await assert.rejects(f.service.apply({ apply: true, expectedHash: plan.planHash }), /PLAN_CHANGED/);
  assert.deepEqual(f.events, []);
  const g = await fixture(); g.rows[10].name = "TEST other POI";
  await assert.rejects(g.service.apply(), /IDENTITY_CONFLICT/);
  const h = await fixture(); h.rows[17].content_version = 2;
  await assert.rejects(h.service.apply(), /IDENTITY_CONFLICT/);
});

test("failed audit rolls back all coordinate changes", async () => {
  const f = await fixture(), before = structuredClone(f.rows), plan = await f.service.apply();
  f.failAudit();
  await assert.rejects(f.service.apply({ apply: true, expectedHash: plan.planHash }), /TEST_AUDIT_FAILURE/);
  assert.deepEqual(f.rows, before);
});

test("location notes distinguish map references from pending coordinates and unverified tree identity", () => {
  const map = locations.manifest.points.find(point => point.poiId === 14);
  assert.equal(oldLocations.locationNote({ poiId: 14, originalName: map.name, ...map }).kind, "MAP_REFERENCE_SECONDARY");
  assert.equal(oldLocations.locationNote({ poiId: 14, originalName: map.name, latitude: 10.7865, longitude: 106.7055 }).kind, "SEED_APPROXIMATION");
  for (const id of [11, 12, 13, 15, 16]) {
    const point = locations.manifest.points.find(item => item.poiId === id);
    const note = oldLocations.locationNote({ poiId: id, originalName: point.name, latitude: point.latitude, longitude: point.longitude });
    assert.equal(note.kind, "SCHEMATIC_SIMULATION");
    assert.match(note.label, /không xác nhận vị trí thực tế/);
  }
  const tree = locations.manifest.points.find(point => point.poiId === 18);
  assert.match(oldLocations.locationNote({ poiId: 18, originalName: tree.name, latitude: 10.788, longitude: 106.708 }).label, /Chưa xác định cá thể cây/);
  assert.equal(oldLocations.locationNote({ poiId: 99, originalName: "TEST unknown" }), null);
});

test("additional seed replay normalizes only the seven exact reviewed location pairs", async () => {
  const input = await loadInput();
  const state = { languages: LANGUAGE_CODES.map(code => ({ code, is_active: 1 })), translations: [], audios: [], jobs: [],
    pois: input.pois.map(p => ({ poi_id: p.poiId, name: p.name, category: p.category, conservation_status: p.conservationStatus,
      activity_hours: p.activityHours, latitude: p.latitude, longitude: p.longitude, trigger_radius: p.radius, display_order: p.displayOrder,
      status: "ACTIVE", content_version: p.sourceVersion, avatar_url: null })) };
  for (const id of [11, 12, 13, 14, 15, 16, 17]) {
    const point = locations.manifest.points.find(item => item.poiId === id), row = state.pois.find(item => item.poi_id === id);
    row.latitude = point.latitude; row.longitude = point.longitude;
  }
  assert.equal(validateSnapshot(state, input, { files: [] }).pois, 8);
  for (const id of [11, 12, 13, 14, 15, 16, 17]) {
    const row = state.pois.find(item => item.poi_id === id), longitude = row.longitude;
    row.longitude += 0.00000001;
    assert.throws(() => validateSnapshot(state, input, { files: [] }), /POI_DATA_CONFLICT/);
    row.longitude = longitude;
  }
  state.pois.find(row => row.poi_id === 18).longitude += 0.00000001;
  assert.throws(() => validateSnapshot(state, input, { files: [] }), /POI_DATA_CONFLICT/);
});

test("location CLI requires an explicit staging target, mode and reviewed hash", () => {
  assert.deepEqual(parseOptions(["--database", "tcv_demo_review_20261020", "--plan"]), { database: "tcv_demo_review_20261020", apply: false, expectedHash: undefined });
  assert.equal(parseOptions(["--database", "tcv_demo_review_20261020", "--apply", "--expected", "a".repeat(64)]).apply, true);
  for (const args of [[], ["--apply"], ["--database", "defaultdb", "--plan"], ["--database", "tcv_demo_review_20261020", "--apply"]]) assert.throws(() => parseOptions(args), /EXPLICIT_TARGET/);
});

test("Store plans through a read-only snapshot and refuses mutations in that mode", async () => {
  const calls = [], connection = {
    query: async (sql, params) => { calls.push({ sql, params }); return sql === "SELECT DATABASE() AS name" ? [[{ name: "tcv_demo_review_20261020" }]] : [[]]; },
    commit: async () => calls.push({ sql: "COMMIT" }), rollback: async () => calls.push({ sql: "ROLLBACK" }), release: () => calls.push({ sql: "RELEASE" }),
  };
  const store = new PoiLocationStore({ getConnection: async () => connection }, "tcv_demo_review_20261020");
  await store.transaction(false, async state => {
    await state.read();
    await assert.rejects(state.update({}, {}), /READ_ONLY/); await assert.rejects(state.audit({}), /READ_ONLY/);
  });
  assert.ok(calls.some(call => call.sql === "START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY"));
  assert.equal(calls.some(call => /^(UPDATE|INSERT|ALTER|CREATE|DROP)/.test(call.sql)), false);
  assert.equal(calls.some(call => call.sql.includes("FOR UPDATE")), false);
  assert.ok(calls.some(call => call.sql.includes("FROM POIS WHERE poi_id BETWEEN 11 AND 18 ORDER BY poi_id")));
});

test("Store locks the staging target and updates only coordinates with optimistic row guards", async () => {
  const calls = [], connection = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql === "SELECT DATABASE() AS name") return [[{ name: "tcv_demo_review_20261020" }]];
      if (sql.startsWith("SELECT GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.startsWith("UPDATE POIS")) return [{ affectedRows: 1 }];
      return [[]];
    },
    beginTransaction: async () => calls.push({ sql: "BEGIN" }), commit: async () => calls.push({ sql: "COMMIT" }), rollback: async () => calls.push({ sql: "ROLLBACK" }), release: () => calls.push({ sql: "RELEASE" }),
  };
  const store = new PoiLocationStore({ getConnection: async () => connection }, "tcv_demo_review_20261020");
  await store.transaction(true, async state => {
    await state.read();
    await state.update(locations.manifest.points.find(point => point.poiId === 14), { poi_id: 14, name: "Chim hồng hạc", content_version: 1, status: "INACTIVE", latitude: 10.7865, longitude: 106.7055 });
    await state.audit({ changedPoints: 1 });
  });
  const update = calls.find(call => call.sql.startsWith("UPDATE POIS"));
  assert.match(update.sql, /^UPDATE POIS SET latitude=\?,longitude=\? WHERE /);
  assert.ok(update.sql.includes("content_version=? AND status=? AND latitude=? AND longitude=?"));
  assert.equal(update.params[5], "INACTIVE");
  assert.ok(calls.some(call => call.sql.endsWith("FOR UPDATE")));
  assert.ok(calls.some(call => call.sql.includes("FROM POIS WHERE poi_id BETWEEN 11 AND 18 ORDER BY poi_id FOR UPDATE")));
  assert.ok(calls.some(call => call.sql.startsWith("SELECT RELEASE_LOCK")));
});

test("Store rejects original POIs and the pending banyan before issuing any update", async () => {
  const calls = [], connection = {
    query: async sql => {
      calls.push(sql);
      if (sql === "SELECT DATABASE() AS name") return [[{ name: "tcv_demo_review_20261020" }]];
      if (sql.startsWith("SELECT GET_LOCK")) return [[{ acquired: 1 }]];
      return [[]];
    },
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
  };
  const store = new PoiLocationStore({ getConnection: async () => connection }, "tcv_demo_review_20261020");
  await store.transaction(true, async state => {
    for (const poiId of [...Array.from({ length: 10 }, (_, index) => index + 1), 18]) {
      const point = locations.manifest.points.find(item => item.poiId === poiId);
      await assert.rejects(state.update(point, { poi_id: poiId, name: point.name }), /NEW_POIS_ONLY/);
    }
    const point = locations.manifest.points.find(item => item.poiId === 14);
    await assert.rejects(state.update(point, { poi_id: 1, name: point.name }), /NEW_POIS_ONLY/);
    await assert.rejects(state.update({ ...point, longitude: point.longitude + 0.0001 }, { poi_id: 14, name: point.name }), /NEW_POIS_ONLY/);
  });
  assert.equal(calls.some(sql => sql.startsWith("UPDATE POIS")), false);
});
