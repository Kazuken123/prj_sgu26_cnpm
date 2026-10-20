const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const ContentJobStore = require("../stores/content_job.store");
const ContentStore = require("../stores/content.store");
const { ContentJobService } = require("../services/content-job.service");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");
const MockTranslation = require("../adapters/mock-translation");
const MockTts = require("../adapters/mock-tts");
const LocalMedia = require("../adapters/local-media");
const { MediaService } = require("../services/media.service");
const { inspectWav } = require("../utils/pcm-wav");
const utcPool = require("../config/utc-pool");

if (process.env.RUN_DB_TESTS === "1") describe("SQL audio pipeline with real private filesystem and protected media HTTP", () => {
  let admin, db, auth, actor, pois, jobs, storage, root, media;
  const name = "tcv_audio_test_" + randomUUID().replaceAll("-", "");
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config);
    assert.match(name, /^tcv_audio_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 10 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    await new (require("../stores/schema.store"))(db).migrateContentJobClaim();
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), RefreshStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshStore(db) });
    const user = await auth.bootstrapAdmin({ email: "audio-admin@example.invalid", password: "AudioTestPassword123" });
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" };
    pois = new PoiService(new PoiStore(db)); jobs = new ContentJobService(new ContentJobStore(db));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-audio-sql-")); storage = new LocalMedia({ root });
    media = new MediaService(new ContentStore(db), storage);
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_audio_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-audio-sql-")) await fs.rm(root, { recursive: true, force: true });
  });
  const worker = (options = {}) => new PipelineService(new ContentJobStore(db), {
    translator: new MockTranslation(), tts: new MockTts(), mediaStorage: storage, audioTimeoutMs: 1000, ...options,
  });
  async function fixture(language = "en") {
    const body = { name: "Nguồn thử " + randomUUID(), category: "PLANT", description: "Nội dung thử.", audioScript: "Lời đọc thử.",
      latitude: 10.78, longitude: 106.70, status: "ACTIVE" };
    const poi = await pois.save(actor, null, body);
    const [rows] = await db.query("SELECT job_id AS jobId FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = ?", [poi.poiId, language]);
    return { body, poiId: poi.poiId, jobId: rows[0].jobId };
  }
  async function audio(f) {
    const [rows] = await db.query("SELECT a.* FROM AUDIOS a JOIN POI_TRANSLATIONS t ON t.translation_id = a.translation_id WHERE t.poi_id = ? AND t.language_code = 'en'", [f.poiId]);
    return rows[0];
  }
  async function logs(f) {
    const [rows] = await db.query("SELECT action, details FROM AUDIT_LOGS WHERE resource_type = 'CONTENT_JOBS' AND resource_id = ? ORDER BY log_id", [String(f.jobId)]);
    return rows;
  }
  const key = result => result.fileUrl.split("/").pop();
  const visit = { status: "ACTIVE" };
  function deferredTts() {
    let started, resolve;
    const called = new Promise(r => { started = r; }), result = new Promise(r => { resolve = r; });
    return { called, resolve, provider: "MOCK", synthesize: () => { started(); return result; } };
  }
  it("POI -> text -> actual WAV file -> audio AVAILABLE/job COMPLETED commits metadata and audit once", async () => {
    const f = await fixture(), result = await worker().runJob(f.jobId);
    assert.equal(result.completed, true); assert.equal((await jobs.get(actor, f.jobId)).status, "COMPLETED");
    const row = await audio(f), bytes = await storage.get(key(result));
    assert.equal(row.status, "AVAILABLE"); assert.equal(row.file_url, result.fileUrl);
    assert.equal(row.file_size, bytes.length); assert.equal(row.duration, inspectWav(bytes).duration); assert.equal(row.source_version, 1);
    assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 1);
    assert.equal(JSON.parse((await logs(f)).at(-1).details).provider, "MOCK");
    const [job] = await db.query("SELECT claim_id FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]); assert.equal(job[0].claim_id, null);
    assert.deepEqual(await media.getAudio(key(result), visit), bytes);
    assert.equal((await worker().runJob(f.jobId)).reason, "NOT_PENDING");
  });
  it("Vietnamese audio uses original script and does not call the translation adapter", async () => {
    const f = await fixture("vi"); let received;
    const result = await worker({ translator: { translate: () => assert.fail("Vietnamese must not be translated") },
      tts: { provider: "MOCK", synthesize: input => { received = input; return new MockTts().synthesize(input); } } }).runJob(f.jobId);
    assert.equal(result.completed, true); assert.equal(received.languageCode, "vi"); assert.equal(received.text, f.body.audioScript);
  });
  it("20 workers produce one current audio, one completion audit and one stored file", async () => {
    const f = await fixture(), before = await fs.readdir(root); let calls = 0;
    const tts = { provider: "MOCK", synthesize: input => { calls++; return new MockTts().synthesize(input); } };
    const results = await Promise.all(Array.from({ length: 20 }, () => worker({ tts }).runJob(f.jobId)));
    assert.equal(results.filter(row => row.completed).length, 1); assert.equal(calls, 1);
    assert.equal((await fs.readdir(root)).length - before.length, 1);
    assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 1);
  });
  it("competing audio calls on the same claim keep one asset and remove the rejected candidate only", async () => {
    const f = await fixture(), w = worker(), claim = await w.claimJob(f.jobId), before = await fs.readdir(root);
    await w.prepareTranslation(f.jobId, claim.claimId);
    const results = await Promise.all([w.prepareAudio(f.jobId, claim.claimId), w.prepareAudio(f.jobId, claim.claimId)]);
    assert.equal(results.filter(row => row.completed).length, 1); assert.equal((await fs.readdir(root)).length - before.length, 1);
    assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 1);
  });
  it("TTS error/timeout/invalid bytes preserve READY text, mark FAILED and retry reuses text without duplicate audio", async () => {
    for (const mode of ["failure", "timeout", "invalid"]) {
      const f = await fixture(), tts = mode === "invalid" ? { synthesize: async () => Buffer.from("not a sound") } : new MockTts({ mode });
      const result = await worker({ tts, audioTimeoutMs: 25 }).runJob(f.jobId);
      assert.equal(result.completed, false); assert.equal((await jobs.get(actor, f.jobId)).status, "FAILED");
      assert.equal((await audio(f)).status, "FAILED"); assert.equal((await audio(f)).file_url, null);
      assert.equal((await jobs.get(actor, f.jobId)).translation.status, "READY");
      await jobs.retry(actor, f.jobId, {});
      assert.equal((await worker({ translator: { translate: () => assert.fail("Must reuse text") } }).runJob(f.jobId)).completed, true);
      assert.equal((await logs(f)).filter(row => row.action === "PREPARE_TRANSLATION").length, 1);
    }
  });
  it("storage error cannot publish audio and returns only a safe retryable worker reason", async () => {
    const f = await fixture(), failedStorage = Object.create(storage);
    failedStorage.put = async () => { throw new Error("SQL password=secret private path"); };
    const result = await worker({ mediaStorage: failedStorage }).runJob(f.jobId);
    assert.equal(result.reason, "MEDIA_STORAGE_FAILED"); assert.equal((await audio(f)).status, "FAILED");
    assert.equal(/password|secret|private path/.test(JSON.stringify(await jobs.get(actor, f.jobId)) + JSON.stringify(await logs(f))), false);
  });
  it("a storage adapter completing after timeout cannot publish and its late candidate is cleaned", { timeout: 10000 }, async () => {
    const f = await fixture(), before = await fs.readdir(root), late = Object.create(storage);
    let release, started, removed, written = false;
    const gate = new Promise(resolve => { release = resolve; }), called = new Promise(resolve => { started = resolve; });
    const cleaned = new Promise(resolve => { removed = resolve; });
    late.put = async (asset, bytes) => { started(); await gate; await storage.put(asset, bytes); written = true; };
    late.remove = async asset => { await storage.remove(asset); if (written) removed(); };
    const running = worker({ mediaStorage: late, audioTimeoutMs: 25 }).runJob(f.jobId);
    await called; assert.equal((await running).reason, "MEDIA_STORAGE_FAILED");
    release(); await cleaned;
    assert.equal((await jobs.get(actor, f.jobId)).status, "FAILED"); assert.deepEqual(await fs.readdir(root), before);
    assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 0);
  });
  it("valid current audio is verified on disk and reused without TTS or another file", async () => {
    const f = await fixture(), first = await worker().runJob(f.jobId), before = await fs.readdir(root);
    // Fixture models a job eligible to rerun while valid current results still exist.
    await db.query("UPDATE CONTENT_JOBS SET status = 'FAILED' WHERE job_id = ?", [f.jobId]); await jobs.retry(actor, f.jobId, {});
    const result = await worker({ tts: { synthesize: () => assert.fail("Valid audio should be reused") } }).runJob(f.jobId);
    assert.equal(result.reused, true); assert.equal(result.fileUrl, first.fileUrl); assert.deepEqual(await fs.readdir(root), before);
  });
  it("missing or corrupt stored audio is not reused and is replaced by one current metadata row", async () => {
    for (const corrupt of [false, true]) {
      const f = await fixture(), first = await worker().runJob(f.jobId), firstRow = await audio(f);
      if (corrupt) await fs.writeFile(path.join(root, key(first)), "corrupt"); else await storage.remove(key(first));
      await db.query("UPDATE CONTENT_JOBS SET status = 'FAILED' WHERE job_id = ?", [f.jobId]); await jobs.retry(actor, f.jobId, {});
      const second = await worker().runJob(f.jobId); assert.equal(second.completed, true); assert.notEqual(second.fileUrl, first.fileUrl);
      assert.equal((await audio(f)).audio_id, firstRow.audio_id); assert.equal((await audio(f)).status, "AVAILABLE");
    }
  });
  it("source edit after file save rejects old completion and removes only the uncommitted candidate", async () => {
    const f = await fixture(), before = await fs.readdir(root), changing = Object.create(storage);
    changing.put = async (...args) => { await storage.put(...args); await pois.save(actor, f.poiId, { ...f.body, audioScript: "Nguồn mới", expectedVersion: 1 }); };
    const result = await worker({ mediaStorage: changing }).runJob(f.jobId);
    assert.equal(result.reason, "CONTENT_SOURCE_OUTDATED"); assert.equal(await audio(f), undefined); assert.deepEqual(await fs.readdir(root), before);
  });
  it("old claim result after a retry/new completion cannot overwrite or remove the new file", async () => {
    const f = await fixture(), tts = deferredTts(), old = worker({ tts }), running = old.runJob(f.jobId); await tts.called;
    await db.query("UPDATE CONTENT_JOBS SET status = 'FAILED' WHERE job_id = ?", [f.jobId]); await jobs.retry(actor, f.jobId, {});
    const next = await worker().runJob(f.jobId), currentAudio = await audio(f);
    tts.resolve(await new MockTts().synthesize({ signal: new AbortController().signal }));
    assert.equal((await running).reason, "CLAIM_LOST"); assert.deepEqual(await audio(f), currentAudio);
    assert.equal(inspectWav(await storage.get(key(next))).duration, 1);
  });
  it("audio metadata or completion audit failure rolls SQL back and retains candidate for conservative reconciliation", async () => {
    for (const table of ["AUDIOS", "AUDIT_LOGS"]) {
      const f = await fixture(), w = worker(), claim = await w.claimJob(f.jobId); await w.prepareTranslation(f.jobId, claim.claimId);
      const before = await fs.readdir(root);
      await db.query("CREATE TRIGGER audio_fail BEFORE INSERT ON " + table + " FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private failure'");
      try { await assert.rejects(w.prepareAudio(f.jobId, claim.claimId), { code: "CONTENT_AUDIO_UNAVAILABLE" }); }
      finally { await db.query("DROP TRIGGER audio_fail"); }
      assert.equal((await jobs.get(actor, f.jobId)).status, "PROCESSING"); assert.equal(await audio(f), undefined);
      assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 0);
      assert.equal((await fs.readdir(root)).length - before.length, 1);
    }
  });
  it("lost completion acknowledgement keeps the committed file and does not permit a second completion", async () => {
    const f = await fixture(), w = worker(), claim = await w.claimJob(f.jobId); await w.prepareTranslation(f.jobId, claim.claimId);
    let writing = false;
    const normal = new ContentJobStore(db), proxy = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw new Error("lost reply"); }, rollback: () => connection.rollback(),
        release: () => connection.release(), destroy: () => connection.destroy() };
    } }, uncertain = new ContentJobStore(proxy);
    const special = new PipelineService({ withWorkerJob: (...args) => (writing ? uncertain : normal).withWorkerJob(...args) }, {
      mediaStorage: storage, tts: { provider: "MOCK", synthesize: input => { writing = true; return new MockTts().synthesize(input); } },
    });
    await assert.rejects(special.prepareAudio(f.jobId, claim.claimId), { code: "CONTENT_AUDIO_UNAVAILABLE" });
    const row = await audio(f); assert.equal(row.status, "AVAILABLE"); assert.equal((await jobs.get(actor, f.jobId)).status, "COMPLETED");
    assert.equal(inspectWav(await storage.get(row.file_url.split("/").pop())).duration, 1);
    assert.equal((await worker().prepareAudio(f.jobId, claim.claimId)).reason, "CLAIM_LOST");
    assert.equal((await logs(f)).filter(row => row.action === "COMPLETE_CONTENT_JOB").length, 1);
  });
  it("published media query excludes inactive POI/language, failed text/audio and outdated source", async () => {
    const f = await fixture(), result = await worker().runJob(f.jobId);
    for (const [sql, restore] of [
      ["UPDATE POIS SET status = 'INACTIVE' WHERE poi_id = ?", "UPDATE POIS SET status = 'ACTIVE' WHERE poi_id = ?"],
      ["UPDATE POIS SET content_version = 2 WHERE poi_id = ?", "UPDATE POIS SET content_version = 1 WHERE poi_id = ?"],
      ["UPDATE POI_TRANSLATIONS SET status = 'FAILED' WHERE poi_id = ? AND language_code = 'en'", "UPDATE POI_TRANSLATIONS SET status = 'READY' WHERE poi_id = ? AND language_code = 'en'"],
    ]) {
      await db.query(sql, [f.poiId]); await assert.rejects(media.getAudio(key(result), visit), { status: 404 }); await db.query(restore, [f.poiId]);
    }
    await db.query("UPDATE LANGUAGES SET is_active = 0 WHERE code = 'en'");
    try { await assert.rejects(media.getAudio(key(result), visit), { status: 404 }); }
    finally { await db.query("UPDATE LANGUAGES SET is_active = 1 WHERE code = 'en'"); }
    const row = await audio(f);
    await db.query("UPDATE AUDIOS SET status = 'FAILED' WHERE audio_id = ?", [row.audio_id]);
    await assert.rejects(media.getAudio(key(result), visit), { status: 404 });
    await db.query("UPDATE AUDIOS SET status = 'AVAILABLE', source_version = 2 WHERE audio_id = ?", [row.audio_id]);
    await assert.rejects(media.getAudio(key(result), visit), { status: 404 });
    await db.query("UPDATE AUDIOS SET source_version = 1 WHERE audio_id = ?", [row.audio_id]);
    await storage.remove(key(result)); await assert.rejects(media.getAudio(key(result), visit), { status: 503 });
  });
  it("CASH -> real visitor token -> protected HTTP downloads real bytes; invalid/revoked/expired/unpaid/internal tokens cannot", async () => {
    const f = await fixture(), result = await worker().runJob(f.jobId);
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store");
    const { memoryCashRedis } = require("./helpers/cash-exchange.fixture");
    const payment = new PaymentService(new PaymentStore(db), memoryCashRedis().redis, { price: () => "50000.00" });
    const session = (await payment.initialize({ paymentMethod: "CASH" }, randomUUID())).data.sessionId;
    await payment.confirmCash(actor, session); const code = await payment.issueCashCode(actor, session);
    const granted = await payment.exchangeCashCode(session, { shortedCode: code.shortedCode }, "192.0.2.201");
    const { createApp } = require("../server");
    const server = http.createServer(createApp({ authService: auth, paymentService: payment, mediaService: media }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const get = token => fetch(base + result.fileUrl, { headers: token ? { Authorization: "Bearer " + token } : {} });
    try {
      for (const token of [null, "invalid", (await auth.login({ email: "audio-admin@example.invalid", password: "AudioTestPassword123" })).accessToken]) {
        const response = await get(token); assert.equal(response.status, 401); assert.equal(response.headers.get("cache-control"), "no-store");
      }
      const response = await get(granted.token); assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /audio\/wav/); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await storage.get(key(result)));
      assert.equal((await fetch(base + result.fileUrl + "?token=" + granted.token)).status, 401);
      assert.equal((await fetch(base + "/demo/" + key(result))).status, 404);
      assert.equal((await fetch(base + "/api/media/audio/" + randomUUID() + ".wav", { headers: { Authorization: "Bearer " + granted.token } })).status, 404);
      await db.query("UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", [session]); assert.equal((await get(granted.token)).status, 401);
      await db.query("UPDATE VISIT_SESSIONS SET status = 'ACTIVE', expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE session_id = ?", [session]);
      assert.equal((await get(granted.token)).status, 401);
      await db.query("UPDATE VISIT_SESSIONS SET expires_at = UTC_TIMESTAMP() + INTERVAL 1 HOUR WHERE session_id = ?", [session]);
      await db.query("UPDATE PAYMENTS SET status = 'PENDING' WHERE session_id = ?", [session]); assert.equal((await get(granted.token)).status, 401);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
