const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { CODES, validate, parse } = require("../config/additional-assets");
const { StagingService, verifyPackagedRecords } = require("../services/staging.service");
const StagingStore = require("../stores/staging.store");
const hash = value => createHash("sha256").update(value).digest("hex");
const key = index => index.toString(16).padStart(8, "0") + "-0000-4000-8000-000000000000.wav";

function sourceFixture() {
  const input = { datasetId: "TCV_ADDITIONAL_POIS_V1", sourceSha256: "a".repeat(64), pois: [] };
  const manifest = { datasetId: input.datasetId, sourceSha256: input.sourceSha256, files: [] };
  let i = 0;
  for (let poiId = 11; poiId <= 18; poiId++) {
    const poi = { poiId, sourceVersion: 1, translations: {} };
    for (const languageCode of CODES) {
      const audioScript = `${poiId} ${languageCode} source text`;
      poi.translations[languageCode] = { audioScript };
      manifest.files.push({ poiId, languageCode, sourceVersion: 1, key: key(++i), sha256: "b".repeat(64),
        scriptSha256: hash(audioScript), fileSize: 32044, duration: 1 });
    }
    input.pois.push(poi);
  }
  return { input, manifest };
}

function runtimeFixture() {
  const snapshot = { POIS: [], LANGUAGES: CODES.map(code => ({ code, is_active: 1 })), POI_TRANSLATIONS: [], AUDIOS: [] };
  const files = [];
  let i = 0;
  for (let poiId = 1; poiId <= 18; poiId++) {
    snapshot.POIS.push({ poi_id: poiId, content_version: 1, status: "ACTIVE", display_order: 90, latitude: "10.78" });
    for (const languageCode of CODES) {
      const audioScript = `${poiId} ${languageCode} speech`;
      const file = { poiId, languageCode, sourceVersion: 1, key: key(++i), scriptSha256: hash(audioScript), fileSize: 32044, duration: 1 };
      files.push(file);
      snapshot.POI_TRANSLATIONS.push({ translation_id: i, poi_id: poiId, language_code: languageCode,
        audio_script: audioScript, source_version: 1, status: "READY" });
      snapshot.AUDIOS.push({ translation_id: i, file_url: "/api/media/audio/" + file.key,
        source_version: 1, status: "AVAILABLE", duration: 1, file_size: 32044 });
    }
  }
  return { snapshot, packaged: { files, poiCount: 18, languageCount: 15, audioCount: 270 } };
}

test("additional audio manifest covers exactly eight POIs and fifteen canonical languages with source hashes", () => {
  const { input, manifest } = sourceFixture();
  assert.equal(validate(manifest, input), manifest);
  assert.equal(manifest.files.length, 120);
  for (const mutate of [
    data => { data.files[0].languageCode = "zh-CN"; },
    data => { data.files[0].languageCode = "pt"; },
    data => { data.files[0].key = data.files[1].key; },
    data => { data.files[0].poiId = 1; },
    data => { data.files[0].duration = 2; },
    data => { data.files[0].fileSize = 32045; },
    data => { data.files[0].scriptSha256 = "c".repeat(64); },
    data => { data.sourceSha256 = "c".repeat(64); },
    data => { data.files.pop(); },
  ]) {
    const changed = structuredClone(manifest); mutate(changed);
    assert.throws(() => validate(changed, input), /ADDITIONAL_AUDIO/);
  }
  assert.throws(() => parse(Buffer.from(JSON.stringify(manifest)), input), /ADDITIONAL_AUDIO_MANIFEST_(CHANGED|NOT_GENERATED)/);
});

test("runtime accepts 270 packaged records while preserving mutable POI positions, order and visibility", () => {
  const { snapshot, packaged } = runtimeFixture();
  snapshot.POIS[17].status = "INACTIVE";
  assert.doesNotThrow(() => verifyPackagedRecords(snapshot, packaged));
  assert.equal(snapshot.POIS[17].status, "INACTIVE");
  for (const mutate of [
    data => { data.POI_TRANSLATIONS[269].audio_script = "changed script"; },
    data => { data.AUDIOS[269].file_url = "/api/media/audio/other.wav"; },
    data => { data.AUDIOS[269].file_size++; },
    data => { data.AUDIOS[269].duration++; },
    data => { data.AUDIOS[269].status = "PENDING"; },
    data => { data.POIS[17].content_version = 2; },
    data => { data.POIS[17].status = "INVALID"; },
    data => { data.LANGUAGES[14].is_active = 0; },
    data => { data.POI_TRANSLATIONS.pop(); },
    data => { data.AUDIOS.push({ ...data.AUDIOS[269] }); },
  ]) {
    const changed = structuredClone(snapshot); mutate(changed);
    assert.throws(() => verifyPackagedRecords(changed, packaged), /STAGING_PACKAGED_DATABASE_MISMATCH/);
  }
});

test("extended staging requires all270 media before reading the database and refuses baseline reseeding", async () => {
  const previous = process.env.STAGING_DEMO_ADDITIONAL_POIS;
  process.env.STAGING_DEMO_ADDITIONAL_POIS = "true";
  try {
    let touched = false;
    const service = new StagingService({ inspectRuntime: async work => { touched = true; return work({ snapshot: async () => runtimeFixture().snapshot }); } });
    service.verifyMedia = async () => ({ files: [] });
    await assert.rejects(service.prepareRuntime(), /STAGING_PACKAGED_AUDIO_COUNT_MISMATCH/);
    assert.equal(touched, false);
    await assert.rejects(service.ensure(), /STAGING_ADDITIONAL_OPERATOR_SEED_REQUIRED/);
    service.verifyMedia = async () => runtimeFixture().packaged;
    assert.deepEqual(await service.prepareRuntime(), { outcome: "RUNTIME_READY", pois: 18, languages: 15, packagedAudio: 270 });
  } finally {
    if (previous === undefined) delete process.env.STAGING_DEMO_ADDITIONAL_POIS;
    else process.env.STAGING_DEMO_ADDITIONAL_POIS = previous;
  }
});

test("extended runtime database inspection uses only a read-only transaction without schema or data mutations", async () => {
  const calls = [];
  const snapshot = runtimeFixture().snapshot;
  const tables = ["LANGUAGES", "USERS", "REFRESH_TOKENS", "AUDIT_LOGS", "VISIT_SESSIONS", "PAYMENTS", "POIS", "POI_TRANSLATIONS", "AUDIOS", "CONTENT_JOBS", "TOURS", "TOUR_POIS", "KNOWLEDGE_DOCUMENTS", "KNOWLEDGE_CHUNKS", "CHAT_LOGS", "BUNDLE_ACCESS_LOGS"];
  const connection = {
    async query(sql) {
      calls.push(sql);
      if (sql === "SELECT DATABASE() AS name") return [[{ name: "tcv_demo_review_20261020" }]];
      if (sql === "SHOW TABLES") return [tables.map(table => ({ Tables: table }))];
      if (sql === "START TRANSACTION READ ONLY") return [{}];
      const match = sql.match(/FROM (LANGUAGES|POIS|POI_TRANSLATIONS|AUDIOS)$/);
      assert.ok(match, sql);
      return [snapshot[match[1]]];
    },
    async commit() { calls.push("COMMIT"); },
    async rollback() { calls.push("ROLLBACK"); },
    release() { calls.push("RELEASE"); },
  };
  const store = new StagingStore({ getConnection: async () => connection }, "tcv_demo_review_20261020");
  await store.inspectRuntime(async state => verifyPackagedRecords(await state.snapshot(), runtimeFixture().packaged));
  assert.ok(calls.includes("START TRANSACTION READ ONLY"));
  assert.equal(calls.some(sql => /^(ALTER|INSERT|UPDATE|DELETE|CREATE|DROP)/.test(sql)), false);
  assert.deepEqual(calls.slice(-2), ["COMMIT", "RELEASE"]);
});
