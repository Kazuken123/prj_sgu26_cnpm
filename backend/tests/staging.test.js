const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os");
const { randomUUID } = require("node:crypto"), { execFileSync } = require("node:child_process");
const { load, parse, DIGEST } = require("../config/staging-dataset");
const { StagingService } = require("../services/staging.service"), Store = require("../stores/staging.store"), Media = require("../adapters/local-media");
test("frozen staging package pins approved content and excludes operational records", async () => {
  const data = await load(); assert.equal(data.files.length, 70); assert.equal(data.mode, "FROZEN_PIPER_AUDIO");
  assert.deepEqual(Object.keys(data.tables), ["LANGUAGES", "POIS", "POI_TRANSLATIONS", "AUDIOS", "CONTENT_JOBS", "TOURS", "TOUR_POIS"]);
  assert.equal(new Set(data.files.map(f => f.key)).size, 70);
  assert.ok(data.tables.POI_TRANSLATIONS.every(t => t.status === "READY" && !t.audio_script.includes("MockTranslation")));
  assert.ok(data.tables.CONTENT_JOBS.every(j => j.status === "COMPLETED" && j.claim_id === null && j.lease_expires_at === null));
});
test("changed packaged content is rejected instead of importing unapproved text", async () => {
  const data = await load(); data.tables.POI_TRANSLATIONS[0].audio_script = "TEST unauthorized content";
  assert.throws(() => parse(Buffer.from(JSON.stringify(data))), /STAGING_DATASET_HASH_MISMATCH/);
});
test("invalid audio prevents any database operation", async () => {
  let touched = false;
  await assert.rejects(new StagingService({ locked: async () => { touched = true; } }, { get: async () => Buffer.from("not WAV") }).ensure());
  assert.equal(touched, false);
});
test("the Render-only entry point refuses a normal local database", async () => {
  await assert.rejects(require("../scripts/staging-start").main(), /STAGING_CONFIGURATION_REQUIRED/);
});
test("seed CLI requires an explicit approved target and apply", () => {
  const { parseOptions } = require("../scripts/staging-seed");
  for (const args of [[], ["--apply"], ["--database", "defaultdb", "--apply"]]) assert.throws(() => parseOptions(args));
  assert.equal(parseOptions(["--database", "tcv_demo_review_20261020", "--apply"]), "tcv_demo_review_20261020");
});
if (process.env.RUN_DB_TESTS === "1") describe("Frozen staging: isolated SQL import, preservation, concurrency and rollback", { timeout: 120000 }, () => {
  let admin, media, data, previousInit;
  const pools = [], config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
  before(async () => {
    previousInit = process.env.STAGING_INITIALIZE_EMPTY; process.env.STAGING_INITIALIZE_EMPTY = "true";
    admin = await require("mysql2/promise").createConnection(config); data = await load();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-staging-test-"));
    execFileSync("tar", ["-xzf", path.resolve(__dirname, "../../data/staging/media.tar.gz"), "-C", root]); media = new Media({ root });
  });
  after(async () => {
    for (const p of pools) await p.end(); await admin?.end();
    if (previousInit === undefined) delete process.env.STAGING_INITIALIZE_EMPTY; else process.env.STAGING_INITIALIZE_EMPTY = previousInit;
  });
  async function fixture() {
    const name = "tcv_staging_test_" + randomUUID().replaceAll("-", "");
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const pool = require("../config/utc-pool")(require("mysql2/promise").createPool({ ...config, database: name, connectionLimit: 4 })); pools.push(pool);
    const store = new Store(pool, name); return { pool, store, name, service: new StagingService(store, media) };
  }
  test("initializes only an empty schema, publishes 70 valid WAVs, then replay is UNCHANGED", async () => {
    const { pool, service } = await fixture(); assert.equal((await service.ensure()).outcome, "CREATED");
    assert.equal((await service.ensure()).outcome, "UNCHANGED");
    const [audios] = await pool.query("SELECT COUNT(*) AS n FROM AUDIOS WHERE status='AVAILABLE'"); assert.equal(audios[0].n, 70);
    const [texts] = await pool.query("SELECT audio_script FROM POI_TRANSLATIONS WHERE translation_id=2");
    assert.equal(texts[0].audio_script, data.tables.POI_TRANSLATIONS.find(t => t.translation_id === 2).audio_script);
    const [audit] = await pool.query("SELECT details FROM AUDIT_LOGS WHERE action='SEED_APPROVED_DEMO'");
    assert.equal(audit.length, 1); assert.equal(JSON.parse(audit[0].details).manifestSha256, DIGEST);
    const [people] = await pool.query("SELECT COUNT(*) AS n FROM USERS"); assert.equal(people[0].n, 0);
    const [money] = await pool.query("SELECT COUNT(*) AS n FROM PAYMENTS"); assert.equal(money[0].n, 0);
  });
  test("two simultaneous starts import once and keep one audit record", async () => {
    const { pool, service } = await fixture();
    assert.deepEqual((await Promise.all([service.ensure(), service.ensure()])).map(r => r.outcome).sort(), ["CREATED", "UNCHANGED"]);
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM AUDIT_LOGS"); assert.equal(rows[0].n, 1);
  });
  test("existing content is never overwritten or supplemented when it conflicts", async () => {
    const { pool, store, service } = await fixture();
    await store.locked(state => state.insert("POIS", [{ ...data.tables.POIS[0], name: "TEST ONLY existing content" }]), { initializeEmpty: true });
    await assert.rejects(service.ensure(), /STAGING_DATA_CONFLICT_STOP/);
    const [rows] = await pool.query("SELECT name FROM POIS"); assert.deepEqual(rows.map(r => r.name), ["TEST ONLY existing content"]);
    const [texts] = await pool.query("SELECT COUNT(*) AS n FROM POI_TRANSLATIONS"); assert.equal(texts[0].n, 0);
  });
  test("audit failure rolls back every imported record without deleting pre-existing reference data", async () => {
    const { pool, store } = await fixture();
    const failing = { locked: (work, options) => store.locked(state => work({ ...state, audit: async () => { throw Error("TEST audit failure"); } }), options) };
    await assert.rejects(new StagingService(failing, media).ensure(), /TEST audit failure/);
    const [pois] = await pool.query("SELECT COUNT(*) AS n FROM POIS"); assert.equal(pois[0].n, 0);
    const [languages] = await pool.query("SELECT COUNT(*) AS n FROM LANGUAGES"); assert.equal(languages[0].n, 2);
    const [audio] = await pool.query("SELECT COUNT(*) AS n FROM AUDIOS"); assert.equal(audio[0].n, 0);
  });
  test("wrong physical database and partial schema stop without trying initialization", async () => {
    const { pool, name, service } = await fixture();
    await assert.rejects(new Store(pool, "tcv_staging_test_" + "a".repeat(32)).locked(() => {}), /WRONG_STAGING_DATABASE/);
    await pool.query("CREATE TABLE TEST_ONLY_KEEP (id INT PRIMARY KEY)");
    await assert.rejects(service.ensure(), /STAGING_PARTIAL_SCHEMA_STOP/);
    const [rows] = await pool.query("SHOW TABLES"); assert.equal(rows.length, 1); assert.ok(name.startsWith("tcv_staging_test_"));
    for (let i = 2; i <= 16; i++) await pool.query(`CREATE TABLE TEST_ONLY_KEEP_${i} (id INT PRIMARY KEY)`);
    await assert.rejects(service.ensure(), /STAGING_PARTIAL_SCHEMA_STOP/);
    const [unchanged] = await pool.query("SHOW TABLES"); assert.equal(unchanged.length, 16);
  });
  test("normal startup refuses empty schema and preserves later POI edits without rerunning seed", async () => {
    const { pool, service } = await fixture();
    await assert.rejects(service.prepareRuntime(), /STAGING_SCHEMA_INITIALIZATION_REQUIRED/);
    const [empty] = await pool.query("SHOW TABLES"); assert.equal(empty.length, 0);
    await service.ensure(); await pool.query("UPDATE POIS SET display_order=90 WHERE poi_id=1");
    assert.equal((await service.prepareRuntime()).outcome, "RUNTIME_READY");
    const [changed] = await pool.query("SELECT display_order FROM POIS WHERE poi_id=1"); assert.equal(changed[0].display_order, 90);
    await assert.rejects(service.ensure(), /STAGING_DATA_CONFLICT_STOP/);
    const [audit] = await pool.query("SELECT COUNT(*) AS n FROM AUDIT_LOGS"); assert.equal(audit[0].n, 1);
  });
});
