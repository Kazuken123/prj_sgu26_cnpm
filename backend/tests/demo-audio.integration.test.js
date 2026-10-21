const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { randomUUID } = require("node:crypto");
const { DemoAudioService } = require("../services/demo-audio.service"), DemoAudioStore = require("../stores/demo-audio.store");
const { DemoSeedService } = require("../services/demo-seed.service"), DemoSeedStore = require("../stores/demo-seed.store");
const { PipelineService } = require("../services/pipeline.service"), JobStore = require("../stores/content_job.store");
const MockTts = require("../adapters/mock-tts"), LocalMedia = require("../adapters/local-media"), utcPool = require("../config/utc-pool");
const draft = require("../../data/demo/draft03.json"), approved = require("../../data/demo/piper-reviewed/manifest.json");
if (process.env.RUN_DB_TESTS === "1") describe("Atomic approved demo audio publication with real SQL and files", { timeout: 120000 }, () => {
  const database = "tcv_seed_test_" + randomUUID().replaceAll("-", ""), input = { ...draft, database };
  let connection, db, root, media, candidates, service, seed, plan;
  const assets = async () => (await db.query("SELECT translation_id,file_url,duration,file_size,source_version,status FROM AUDIOS ORDER BY translation_id"))[0];
  async function core() {
    const tables = [];
    for (const table of ["POIS", "POI_TRANSLATIONS", "CONTENT_JOBS", "TOURS", "TOUR_POIS"]) tables.push((await db.query("SELECT * FROM " + table + " ORDER BY 1"))[0]);
    return JSON.stringify(tables);
  }
  const markerCount = async action => (await db.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS WHERE action=? AND resource_id='TCV_DEMO_POIS_V1'", [action]))[0][0].total;
  function wrap(hook) {
    return { ...db, getConnection: async () => {
      const c = await db.getConnection();
      return new Proxy(c, { get(target, key) { const override = hook(target, key); return override || (typeof target[key] === "function" ? target[key].bind(target) : target[key]); } });
    } };
  }
  before(async () => {
    const mysql = require("mysql2/promise"), options = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    connection = await mysql.createConnection(options); assert.match(database, /^tcv_seed_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await connection.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...options, database, multipleStatements: true, connectionLimit: 8 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const Schema = require("../stores/schema.store"); await new Schema(db).migrateContentJobClaim(); await new Schema(db).migrateContentJobLease();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-publish-sql-")); media = new LocalMedia({ root });
    candidates = new LocalMedia({ root: path.resolve(__dirname, "../../data/demo/piper-reviewed") });
    service = new DemoAudioService(new DemoAudioStore(db), media, candidates);
    seed = new DemoSeedService(new DemoSeedStore(db)); const imported = await seed.seed(input, database);
    const worker = new PipelineService(new JobStore(db), { tts: new MockTts(), mediaStorage: media });
    for (const jobId of imported.jobIds) assert.equal((await worker.runJob(jobId)).completed, true);
  });
  after(async () => {
    if (db) await db.end(); if (connection) await connection.end();
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-publish-sql-")) await fs.rm(root, { recursive: true, force: true });
    await require("../config/database").end(); // Retain UUID fixture database, never touch demo/old DB.
  });
  it("plan is read-only, requires unchanged approved content and exactly four complete mock audios", async () => {
    const before = await core(), old = await assets(); plan = await service.plan(database, approved);
    assert.equal(plan.oldAssets.length, 4); assert.ok(plan.newAssets.every(asset => asset.duration > 1));
    assert.equal(await core(), before); assert.deepEqual(await assets(), old); assert.equal(await markerCount("PUBLISH_DEMO_AUDIO"), 0);
    await db.query("UPDATE POI_TRANSLATIONS SET description='changed' WHERE translation_id=1");
    try { await assert.rejects(service.plan(database, approved), { code: "DEMO_AUDIO_CONFLICT" }); }
    finally { await db.query("UPDATE POI_TRANSLATIONS SET description=? WHERE translation_id=1", [draft.pois[0].text.vi.description]); }
  });
  it("apply publishes all four together, replay is UNCHANGED and seed cannot overwrite speech", async () => {
    const before = await core(); assert.equal((await service.apply(database, plan)).status, "PUBLISHED");
    assert.equal((await service.apply(database, plan)).status, "UNCHANGED"); assert.equal(await markerCount("PUBLISH_DEMO_AUDIO"), 1);
    assert.ok((await assets()).every(asset => asset.duration > 1)); assert.equal(await core(), before);
    assert.equal((await seed.seed(input, database)).status, "UNCHANGED");
    for (const asset of plan.oldAssets) assert.equal((await media.get(asset.fileUrl.slice(17))).length, 32044);
  });
  it("rollback is atomic/repeatable and preserves both old and new files without resetting jobs", async () => {
    const before = await core(); assert.equal((await service.apply(database, plan, true)).status, "ROLLED_BACK");
    assert.equal((await service.apply(database, plan, true)).status, "UNCHANGED"); assert.equal(await markerCount("ROLLBACK_DEMO_AUDIO"), 1);
    assert.ok((await assets()).every(asset => asset.duration === 1)); assert.equal(await core(), before);
    for (const asset of plan.newAssets) assert.ok((await media.get(asset.fileUrl.slice(17))).length > 32044);
    await assert.rejects(service.apply(database, plan), { code: "DEMO_AUDIO_CONFLICT" });
  });
  it("stale source, changed current audio or a tampered plan is refused without partial publication", async () => {
    const next = await service.plan(database, approved), before = await assets();
    await assert.rejects(service.apply(database, { ...next, sourceDigest: "0".repeat(64) }), { code: "DEMO_AUDIO_CONFLICT" });
    await db.query("UPDATE CONTENT_JOBS SET status='PENDING' WHERE job_id=1");
    try { await assert.rejects(service.apply(database, next), { code: "DEMO_AUDIO_CONFLICT" }); }
    finally { await db.query("UPDATE CONTENT_JOBS SET status='COMPLETED' WHERE job_id=1"); }
    await db.query("UPDATE AUDIOS SET duration=2 WHERE translation_id=1");
    try { await assert.rejects(service.apply(database, next), { code: "DEMO_AUDIO_CONFLICT" }); }
    finally { await db.query("UPDATE AUDIOS SET duration=1 WHERE translation_id=1"); }
    assert.deepEqual(await assets(), before);
  });
  it("audit failure rolls all four audio updates back and retains files for reconciliation", async () => {
    const next = await service.plan(database, approved), before = await assets();
    const fault = wrap((c, key) => key === "query" ? (sql, args) => String(sql).includes("INSERT INTO AUDIT_LOGS") ? Promise.reject(Error("private SQL failure")) : c.query(sql, args) : null);
    await assert.rejects(new DemoAudioService(new DemoAudioStore(fault), media, candidates).apply(database, next), { code: "DEMO_AUDIO_UNAVAILABLE" });
    assert.deepEqual(await assets(), before); assert.equal(await markerCount("PUBLISH_DEMO_AUDIO"), 1);
  });
  it("concurrent publishers share dataset lock, one publishes and the other observes UNCHANGED", async () => {
    const next = await service.plan(database, approved);
    const result = await Promise.all([service.apply(database, next), service.apply(database, next)]);
    assert.deepEqual(result.map(row => row.status).sort(), ["PUBLISHED", "UNCHANGED"]);
    assert.equal(await markerCount("PUBLISH_DEMO_AUDIO"), 2); await service.apply(database, next, true);
  });
  it("lost commit acknowledgement can be reconciled by the same plan without duplicate publication", async () => {
    const next = await service.plan(database, approved); let lost = true;
    const fault = wrap((c, key) => key === "commit" ? async () => { await c.commit(); if (lost) { lost = false; throw Error("lost ack"); } } : null);
    await assert.rejects(new DemoAudioService(new DemoAudioStore(fault), media, candidates).apply(database, next), { code: "DEMO_AUDIO_UNAVAILABLE" });
    assert.equal((await service.apply(database, next)).status, "UNCHANGED"); assert.equal(await markerCount("PUBLISH_DEMO_AUDIO"), 3);
    await service.apply(database, next, true);
  });
  it("wrong physical database and missing or corrupted approved file fail before any SQL mutation", async () => {
    const before = await assets();
    await assert.rejects(service.plan("tcv_demo_review_20261020", approved), { code: "DEMO_AUDIO_UNAVAILABLE" });
    const broken = new DemoAudioService(new DemoAudioStore(db), media, { get: async () => Buffer.from("not audio") });
    await assert.rejects(broken.plan(database, approved), { code: "DEMO_AUDIO_UNAVAILABLE" }); assert.deepEqual(await assets(), before);
  });
});
