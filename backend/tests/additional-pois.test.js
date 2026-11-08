const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path"), os = require("node:os");
const { execFileSync } = require("node:child_process");
const { createHash, randomUUID } = require("node:crypto");
const { ADDITIONAL_POI_NAMES, SQL_FILE_PATH, parseArgs, loadSqlStatements, runSeed } = require("../scripts/seed-additional-pois");
const { loadInput, parseInput, splitStatements, LANGUAGE_CODES } = require("../config/additional-pois-input");
const { validateSnapshot } = require("../services/additional-pois-seed.service");
const { validate } = require("../config/additional-assets");
const hash = text => createHash("sha256").update(text).digest("hex");

async function fixture() {
  const input = await loadInput();
  const manifest = { datasetId: input.datasetId, sourceSha256: input.sourceSha256, files: input.pois.flatMap(p => LANGUAGE_CODES.map(code => ({
    poiId: p.poiId, languageCode: code, sourceVersion: 1, key: randomUUID() + ".wav", sha256: "1".repeat(64),
    scriptSha256: hash(p.translations[code].audioScript), duration: 1, fileSize: 32044,
  }))) };
  validate(manifest, input);
  const data = { languages: LANGUAGE_CODES.map(code => ({ code, is_active: 1 })), pois: [], translations: [], audios: [], jobs: [] };
  const calls = []; let committed = 0, rolledBack = 0, released = 0, before;
  const connection = {
    beginTransaction: async () => { calls.push("BEGIN"); before = structuredClone(data); },
    commit: async () => { calls.push("COMMIT"); committed++; },
    rollback: async () => { calls.push("ROLLBACK"); rolledBack++; Object.assign(data, before); },
    release: () => { released++; },
    query: async (sql, params = []) => {
      calls.push(sql);
      if (sql.startsWith("SELECT DATABASE")) return [[{ name: "tcv_demo_review_20261020" }]];
      if (sql.startsWith("SELECT GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.startsWith("SELECT RELEASE_LOCK")) return [[{ released: 1 }]];
      if (sql.startsWith("SELECT code")) return [structuredClone(data.languages)];
      if (sql.startsWith("SELECT poi_id")) return [structuredClone(data.pois)];
      if (sql.startsWith("SELECT translation_id")) return [structuredClone(data.translations)];
      if (sql.startsWith("SELECT a.audio_id")) return [structuredClone(data.audios)];
      if (sql.startsWith("SELECT job_id")) return [structuredClone(data.jobs)];
      assert.match(sql, /^INSERT INTO /);
      assert.match(sql, /WHERE NOT EXISTS|AND NOT EXISTS/);
      let row, table, exists;
      if (sql.startsWith("INSERT INTO POIS")) {
        table = data.pois;
        const [poi_id, name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, content_version] = params;
        row = { poi_id, name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, content_version, status: "ACTIVE", avatar_url: null };
        exists = table.some(p => p.poi_id === poi_id || p.name === name);
      } else if (sql.startsWith("INSERT INTO POI_TRANSLATIONS")) {
        table = data.translations;
        const [poi_id, language_code, name, description, audio_script, source_version] = params;
        row = { translation_id: 1001 + table.length, poi_id, language_code, name, description, audio_script, source_version, status: "READY" };
        exists = table.some(t => t.poi_id === poi_id && t.language_code === language_code);
      } else if (sql.startsWith("INSERT INTO AUDIOS")) {
        table = data.audios;
        const [file_url, duration, file_size, source_version, poiId, languageCode] = params;
        const translation = data.translations.find(t => t.poi_id === poiId && t.language_code === languageCode);
        assert.ok(translation);
        row = { audio_id: 2001 + table.length, translation_id: translation.translation_id, file_url, duration, file_size, source_version, status: "AVAILABLE" };
        exists = table.some(a => a.translation_id === translation.translation_id);
      } else if (sql.startsWith("INSERT INTO CONTENT_JOBS")) {
        table = data.jobs;
        const [poi_id, language_code, source_version] = params;
        row = { job_id: 3001 + table.length, poi_id, language_code, source_version, status: "COMPLETED", error_message: null, claim_id: null, lease_expires_at: null };
        exists = table.some(j => j.poi_id === poi_id && j.language_code === language_code && j.source_version === source_version);
      } else assert.fail("Unexpected mutation");
      if (!exists) table.push(row);
      return [{ affectedRows: exists ? 0 : 1 }];
    },
  };
  const pool = { getConnection: async () => connection };
  const dependencies = { target: "tcv_demo_review_20261020", loadInput: async () => input, verify: async (media, source) => validate(manifest, source) };
  return { input, manifest, data, calls, connection, pool, dependencies, totals: () => ({ committed, rolledBack, released }) };
}

describe("Additional POIs offline input and atomic seed", () => {
  it("loads exactly 8 POIs and all 120 SQL/CJS translations using canonical language codes", async () => {
    const input = await loadInput(), statements = await loadSqlStatements();
    assert.equal(statements.length, 128);
    assert.equal(statements.filter(s => s.startsWith("INSERT INTO POIS ")).length, 8);
    assert.equal(statements.filter(s => s.startsWith("INSERT INTO POI_TRANSLATIONS ")).length, 120);
    assert.deepEqual(input.pois.map(p => p.name), ADDITIONAL_POI_NAMES);
    for (const p of input.pois) assert.deepEqual(Object.keys(p.translations), LANGUAGE_CODES);
    assert.match(input.sourceSha256, /^[a-f0-9]{64}$/);
  });
  it("rejects SQL/CJS drift and SQL that falls outside the safe INSERT grammar", async () => {
    const content = await fs.readFile(SQL_FILE_PATH, "utf8");
    const source = structuredClone(require("../../data/demo/additional-pois-translations.cjs"));
    source[11].translations.fr.audioScript += " Changed";
    assert.throws(() => parseInput(content, source), /ADDITIONAL_SQL_DATASET_TEXT_MISMATCH/);
    assert.throws(() => parseInput(content.replace("INSERT INTO POIS", "DROP TABLE POIS"), require("../../data/demo/additional-pois-translations.cjs")), /ADDITIONAL_SQL_INVALID_TRANSLATION/);
    assert.deepEqual(splitStatements("INSERT 'an apostrophe: it''s; quoted';\n-- comment\nINSERT 'second';"), ["INSERT 'an apostrophe: it''s; quoted'", "INSERT 'second'"]);
    assert.deepEqual(splitStatements("INSERT 'first line\n-- narration text; it''s preserved'; -- comment\nINSERT 'second';"), ["INSERT 'first line\n-- narration text; it''s preserved'", "INSERT 'second'"]);
    assert.throws(() => splitStatements("INSERT 'unclosed;"), /UNTERMINATED/);
  });
  it("defaults to dry-run and never applies mixed dry-run/list flags", () => {
    assert.deepEqual(parseArgs([]), { apply: false, dryRun: true, list: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true, dryRun: false, list: false });
    assert.deepEqual(parseArgs(["--apply", "--dry-run"]), { apply: false, dryRun: true, list: false });
    assert.deepEqual(parseArgs(["--list"]), { apply: false, dryRun: false, list: true });
    assert.throws(() => parseArgs(["--force"]), /INVALID_ARGUMENT/);
  });
  it("dry-run validates 120 audio records and the DB without transactions or writes", async () => {
    const f = await fixture(), before = structuredClone(f.data);
    const result = await runSeed(f.pool, { apply: false }, f.dependencies);
    assert.equal(result.outcome, "PLAN");
    assert.deepEqual(result.pending, { pois: 8, translations: 120, audios: 120, jobs: 120 });
    assert.equal(result.verifiedAudios, 120);
    assert.deepEqual(f.data, before);
    assert.ok(f.calls.every(sql => sql.startsWith("SELECT ")));
    assert.deepEqual(f.totals(), { committed: 0, rolledBack: 0, released: 1 });
  });
  it("applies all records atomically and verifies a second apply is unchanged", async () => {
    const f = await fixture();
    const first = await runSeed(f.pool, { apply: true }, f.dependencies);
    assert.equal(first.outcome, "CREATED");
    assert.deepEqual(first.inserted, { pois: 8, translations: 120, audios: 120, jobs: 120 });
    assert.deepEqual(first.verified, first.inserted);
    const saved = structuredClone(f.data);
    const second = await runSeed(f.pool, { apply: true }, f.dependencies);
    assert.equal(second.outcome, "UNCHANGED");
    assert.deepEqual(second.inserted, { pois: 0, translations: 0, audios: 0, jobs: 0 });
    assert.deepEqual(f.data, saved);
    assert.equal(f.totals().committed, 2);
    for (const a of f.data.audios) assert.match(a.file_url, /^\/api\/media\/audio\/[a-f0-9-]+\.wav$/);
  });
  it("fills missing translations/audio even when all eight parent POIs already exist", async () => {
    const f = await fixture();
    await runSeed(f.pool, { apply: true }, f.dependencies);
    f.data.translations.length = 0; f.data.audios.length = 0; f.data.jobs.length = 0;
    const result = await runSeed(f.pool, { apply: true }, f.dependencies);
    assert.deepEqual(result.inserted, { pois: 0, translations: 120, audios: 120, jobs: 120 });
    assert.equal(result.verified.audios, 120);
  });
  it("rejects conflicting script/audio/ID data instead of silently overwriting it", async () => {
    const f = await fixture();
    await runSeed(f.pool, { apply: true }, f.dependencies);
    f.data.translations[0].audio_script += " Edited";
    await assert.rejects(runSeed(f.pool, { apply: true }, f.dependencies), /TRANSLATION_DATA_CONFLICT/);
    f.data.translations[0].audio_script = f.input.pois[0].translations.vi.audioScript;
    f.data.audios[0].file_url = "/api/media/audio/incorrect.wav";
    assert.throws(() => validateSnapshot(f.data, f.input, f.manifest), /AUDIO_DATA_CONFLICT/);
    f.data.audios[0].file_url = "/api/media/audio/" + f.manifest.files[0].key;
    f.data.pois[0].poi_id = 99;
    assert.throws(() => validateSnapshot(f.data, f.input, f.manifest), /POI_IDENTITY_CONFLICT/);
  });
  it("rejects missing active languages before inserting data", async () => {
    const f = await fixture(); f.data.languages.pop();
    await assert.rejects(runSeed(f.pool, { apply: true }, f.dependencies), /ACTIVE_LANGUAGES_REQUIRED/);
    assert.equal(f.data.pois.length, 0);
    assert.equal(f.totals().rolledBack, 1);
  });
  it("rolls back every inserted record on a write or post-write verification failure", async () => {
    const f = await fixture(), originalQuery = f.connection.query;
    f.connection.query = async (sql, params) => {
      if (sql.startsWith("INSERT INTO AUDIOS")) throw new Error("simulated write failure");
      return originalQuery(sql, params);
    };
    await assert.rejects(runSeed(f.pool, { apply: true }, f.dependencies), /simulated write failure/);
    assert.equal(f.data.pois.length, 0); assert.equal(f.data.translations.length, 0);
    assert.deepEqual(f.totals(), { committed: 0, rolledBack: 1, released: 1 });
    const g = await fixture(), gQuery = g.connection.query;
    g.connection.query = async (sql, params) => {
      const result = await gQuery(sql, params);
      if (sql.startsWith("INSERT INTO AUDIOS") && g.data.audios.length === 120) g.data.audios[0].duration++;
      return result;
    };
    await assert.rejects(runSeed(g.pool, { apply: true }, g.dependencies), /AUDIO_DATA_CONFLICT/);
    assert.equal(g.data.pois.length, 0); assert.equal(g.totals().committed, 0);
  });
  it("validates offline files before opening a DB connection and checks DB identity", async () => {
    const f = await fixture(); let connected = false;
    const pool = { getConnection: async () => { connected = true; return f.connection; } };
    await assert.rejects(runSeed(pool, { apply: true }, { ...f.dependencies, verify: async () => { throw new Error("tampered WAV"); } }), /tampered WAV/);
    assert.equal(connected, false);
    await assert.rejects(runSeed(f.pool, { apply: true }, { ...f.dependencies, target: "wrong_database" }), /DATABASE_IDENTITY_MISMATCH/);
    assert.equal(f.totals().committed, 0);
  });
});

describe("Additional POIs seed with real local MySQL and generated speech assets", { skip: process.env.RUN_DB_TESTS !== "1", timeout: 120000 }, () => {
  let admin, mysql, input, baseline, manifest, media, config, mediaRoot;
  const databases = [];
  before(async () => {
    const host = process.env.DB_HOST || "127.0.0.1";
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(host), "Disposable seed integration tests require a local MySQL host");
    // Use the real generated manifest and files; missing assets fail an opted-in
    // run before creating a database. This suite never contacts Aiven.
    input = await loadInput();
    mediaRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-additional-media-test-"));
    execFileSync("tar", ["-xzf", path.resolve(__dirname, "../../data/demo/additional/media.tar.gz"), "-C", mediaRoot], { windowsHide: true });
    media = new (require("../adapters/local-media"))({ root: mediaRoot });
    manifest = await require("../config/additional-assets").verify(media, input);
    baseline = await require("../config/staging-dataset").load();
    mysql = require("mysql2/promise");
    config = { host, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config);
  });
  after(async () => {
    try {
      for (const { db, name } of databases) {
        await db.end();
        assert.match(name, /^tcv_additional_test_[a-f0-9]{32}$/);
        assert.notEqual(name, process.env.DB_NAME);
        if (admin) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      }
      if (admin) await admin.end();
    } finally {
      if (mediaRoot) {
        const root = path.resolve(mediaRoot);
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.match(path.basename(root), /^tcv-additional-media-test-[a-zA-Z0-9]+$/);
        await fs.rm(root, { recursive: true, force: true });
      }
    }
  });
  async function fixtureDatabase() {
    const path = require("node:path");
    const name = "tcv_additional_test_" + randomUUID().replaceAll("-", "");
    assert.match(name, /^tcv_additional_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    const raw = mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 4 });
    const db = require("../config/utc-pool")(raw); databases.push({ db, name });
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const schema = new (require("../stores/schema.store"))(db);
    await schema.migrateContentJobClaim(); await schema.migrateContentJobLease();
    const extension = require("../../data/demo/fifteen/extension.json");
    const languages = [...baseline.tables.LANGUAGES, ...extension.languages];
    for (const language of languages) await db.query("INSERT INTO LANGUAGES (code, name, is_active) SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM LANGUAGES WHERE code = ?)", [language.code, language.name, language.code]);
    const { columns } = require("../config/staging-dataset");
    for (const [table, rows] of Object.entries(baseline.tables)) {
      if (table === "LANGUAGES") continue;
      const cols = columns[table];
      for (const row of rows) await db.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, cols.map(column => row[column]));
    }
    return { db, name, dependencies: { target: name, media } };
  }
  it("dry-run leaves the baseline unchanged; apply and rerun preserve baseline rows and verify all120 audios", async () => {
    const { db, dependencies } = await fixtureDatabase();
    const { columns } = require("../config/staging-dataset");
    const snapshot = async () => {
      const result = {};
      for (const [table, cols] of Object.entries(columns)) {
        if (table === "LANGUAGES") continue;
        const [rows] = await db.query(`SELECT ${cols.join(",")} FROM ${table}`); result[table] = rows;
      }
      return result;
    };
    const beforeRows = await snapshot();
    const plan = await runSeed(db, { apply: false }, dependencies);
    assert.deepEqual(plan.pending, { pois: 8, translations: 120, audios: 120, jobs: 120 });
    assert.deepEqual(await snapshot(), beforeRows);
    const created = await runSeed(db, { apply: true }, dependencies);
    assert.deepEqual(created.inserted, { pois: 8, translations: 120, audios: 120, jobs: 120 });
    const second = await runSeed(db, { apply: true }, dependencies);
    assert.equal(second.outcome, "UNCHANGED");
    const afterRows = await snapshot();
    for (const [table, rows] of Object.entries(beforeRows)) for (const row of rows) assert.ok(afterRows[table].some(candidate => JSON.stringify(candidate) === JSON.stringify(row)), "Baseline row changed: " + table);
    const [audios] = await db.query("SELECT t.poi_id, t.language_code, t.audio_script, a.file_url, a.duration, a.file_size, a.status FROM AUDIOS a JOIN POI_TRANSLATIONS t ON t.translation_id = a.translation_id WHERE t.poi_id BETWEEN 11 AND 18");
    assert.equal(audios.length, 120);
    for (const row of audios) {
      const file = manifest.files.find(f => f.poiId === row.poi_id && f.languageCode === row.language_code);
      assert.equal(row.file_url, "/api/media/audio/" + file.key); assert.equal(Number(row.file_size), file.fileSize);
      assert.equal(row.duration, file.duration); assert.equal(row.status, "AVAILABLE"); assert.equal(hash(row.audio_script), file.scriptSha256);
    }
  });
  it("concurrent apply inserts each packaged record once", async () => {
    const { db, dependencies } = await fixtureDatabase();
    const results = await Promise.all([runSeed(db, { apply: true }, dependencies), runSeed(db, { apply: true }, dependencies)]);
    assert.deepEqual(results.map(result => result.outcome).sort(), ["CREATED", "UNCHANGED"]);
    const [rows] = await db.query("SELECT COUNT(*) AS n FROM POI_TRANSLATIONS WHERE poi_id BETWEEN 11 AND 18");
    assert.equal(Number(rows[0].n), 120);
  });
  it("an actual MySQL insert failure rolls back POIs, translations, audio and jobs together", async () => {
    const { db, dependencies } = await fixtureDatabase();
    await db.query("CREATE TRIGGER additional_test_fail_audio BEFORE INSERT ON AUDIOS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced additional audio failure'");
    try { await assert.rejects(runSeed(db, { apply: true }, dependencies)); }
    finally { await db.query("DROP TRIGGER additional_test_fail_audio"); }
    const [pois] = await db.query("SELECT COUNT(*) AS n FROM POIS WHERE poi_id BETWEEN 11 AND 18");
    const [texts] = await db.query("SELECT COUNT(*) AS n FROM POI_TRANSLATIONS WHERE poi_id BETWEEN 11 AND 18");
    const [jobs] = await db.query("SELECT COUNT(*) AS n FROM CONTENT_JOBS WHERE poi_id BETWEEN 11 AND 18");
    assert.equal(Number(pois[0].n), 0); assert.equal(Number(texts[0].n), 0); assert.equal(Number(jobs[0].n), 0);
    const [baselineAudios] = await db.query("SELECT COUNT(*) AS n FROM AUDIOS"); assert.equal(Number(baselineAudios[0].n), 70);
  });
});
