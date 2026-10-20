const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { fork } = require("node:child_process"), { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service"), { ContentWorker } = require("../workers/content-worker");
const ContentJobStore = require("../stores/content_job.store"), SchemaStore = require("../stores/schema.store");
const { PoiService } = require("../services/poi.service"), PoiStore = require("../stores/poi.store");
const { ContentJobService } = require("../services/content-job.service");
const MockTranslation = require("../adapters/mock-translation"), MockTts = require("../adapters/mock-tts"), LocalMedia = require("../adapters/local-media");
const utcPool = require("../config/utc-pool");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { if (await check()) return; await pause(30); }
  assert.fail("Automatic worker condition did not become true within 15 seconds");
}
if (process.env.RUN_DB_TESTS === "1") describe("Automatic worker with isolated MySQL jobs, private audio and real processes", { timeout: 120000 }, () => {
  let admin, db, actor, pois, jobs, root;
  const children = new Set(), name = "tcv_auto_test_" + randomUUID().replaceAll("-", "");
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config); assert.match(name, /^tcv_auto_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 10 }));
    // init is confined to this newly-created disposable database, never the acceptance database.
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    await new SchemaStore(db).migrateContentJobClaim(); await new SchemaStore(db).migrateContentJobLease();
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), TokenStore = require("../stores/refresh_token.store");
    const user = await new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new TokenStore(db) })
      .bootstrapAdmin({ email: "auto-admin@example.invalid", password: "AutoTestPassword123" });
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" }; pois = new PoiService(new PoiStore(db)); jobs = new ContentJobService(new ContentJobStore(db));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-auto-sql-"));
  });
  after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGKILL"); await exited;
    }
    if (db) await db.end(); if (admin) await admin.end();
    // Keep this named test database for evidence; no acceptance DB/container/volume is deleted.
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-auto-sql-")) await fs.rm(root, { recursive: true, force: true });
  });
  const pipeline = (options = {}) => new PipelineService(new ContentJobStore(db), {
    translator: new MockTranslation(), tts: new MockTts(), mediaStorage: new LocalMedia({ root }), ...options,
  });
  async function fixture() {
    const poi = await pois.save(actor, null, { name: "Worker fixture " + randomUUID(), category: "PLANT", description: "Nội dung thử",
      audioScript: "Kịch bản thử", latitude: 10.78, longitude: 106.70, status: "INACTIVE" });
    return poi.poiId;
  }
  async function rows(poiId) { const [result] = await db.query("SELECT job_id AS jobId, status, language_code AS languageCode, claim_id AS claimId FROM CONTENT_JOBS WHERE poi_id = ? ORDER BY job_id", [poiId]); return result; }
  async function all(poiId, status) { return (await rows(poiId)).every(row => row.status === status); }
  async function runUntil(service, check, options = {}) {
    const worker = new ContentWorker(service, { pollMs: 100, ...options }), running = worker.run();
    try { await until(check); } finally { worker.stop(); await running; }
  }
  async function expire(jobId) { await db.query("UPDATE CONTENT_JOBS SET lease_expires_at = UTC_TIMESTAMP(3) - INTERVAL 1 SECOND WHERE job_id = ?", [jobId]); }
  function startChild(hold = false, extraArgs = []) {
    const script = hold ? "helpers/automatic-worker-child.js" : "../scripts/content-worker.js";
    const child = fork(path.resolve(__dirname, script), hold ? [] : ["--mock", "--poll-ms", "100", "--shutdown-ms", "5000", ...extraArgs], {
      cwd: root, windowsHide: true, env: { ...process.env, DB_NAME: name, MEDIA_ROOT: root }, stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    children.add(child); const events = []; let buffer = "";
    child.on("message", event => events.push(event));
    child.stdout.on("data", bytes => { buffer += bytes.toString(); const lines = buffer.split("\n"); buffer = lines.pop(); for (const line of lines) { try { events.push(JSON.parse(line)); } catch { /* no sensitive output */ } } });
    child.stderr.resume();
    const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
    return { child, events, exited, stop: async signal => {
      let timer;
      try {
        child.kill(signal); const result = await Promise.race([exited, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error("Worker child stop timeout")), 8000); })]);
        children.delete(child); return result;
      } finally { clearTimeout(timer); }
    } };
  }
  it("automatically consumes VI/EN PENDING to text plus playable private WAV and does not reprocess completed jobs", async () => {
    const poiId = await fixture(); await runUntil(pipeline(), () => all(poiId, "COMPLETED"), { concurrency: 2 });
    const [audios] = await db.query("SELECT a.file_url, a.status, a.source_version, t.language_code FROM AUDIOS a JOIN POI_TRANSLATIONS t USING (translation_id) WHERE t.poi_id = ?", [poiId]);
    assert.equal(audios.length, 2);
    for (const audio of audios) { assert.equal(audio.status, "AVAILABLE"); const bytes = await fs.readFile(path.join(root, audio.file_url.split("/").pop())); assert.equal(bytes.subarray(0, 4).toString(), "RIFF"); }
    assert.equal((await pipeline().pendingJobs(4)).length, 0);
  });
  it("translation provider failure stays FAILED until explicit STAFF/ADMIN retry, then completes the same row", async () => {
    const poiId = await fixture(); await runUntil(pipeline({ translator: new MockTranslation({ mode: "failure" }) }), async () => (await rows(poiId)).every(row => ["COMPLETED", "FAILED"].includes(row.status)));
    const failed = (await rows(poiId)).find(row => row.languageCode === "en"); assert.equal(failed.status, "FAILED");
    assert.equal((await pipeline().pendingJobs(4)).some(row => row.jobId === failed.jobId), false);
    await jobs.retry(actor, failed.jobId); await runUntil(pipeline(), () => all(poiId, "COMPLETED"));
    assert.equal((await rows(poiId)).find(row => row.languageCode === "en").jobId, failed.jobId);
  });
  it("TTS timeout is finite and retry reuses prepared translation without creating duplicate current audio", async () => {
    const poiId = await fixture(); await runUntil(pipeline({ tts: new MockTts({ mode: "timeout" }), audioTimeoutMs: 50 }), () => all(poiId, "FAILED"));
    for (const row of await rows(poiId)) await jobs.retry(actor, row.jobId);
    await runUntil(pipeline({ translator: { translate: () => assert.fail("prepared translation should be reused") } }), () => all(poiId, "COMPLETED"));
    const [count] = await db.query("SELECT COUNT(*) AS total FROM AUDIOS a JOIN POI_TRANSLATIONS t USING (translation_id) WHERE t.poi_id = ?", [poiId]); assert.equal(Number(count[0].total), 2);
  });
  it("two automatic workers seeing identical candidates claim and complete each job only once", async () => {
    const poiId = await fixture(); let readers = 0, release; const barrier = new Promise(resolve => { release = resolve; });
    const make = () => { const service = pipeline(), original = service.pendingJobs.bind(service); let first = true;
      service.pendingJobs = async limit => { const candidates = await original(limit); if (first) { first = false; if (++readers === 2) release(); await barrier; } return candidates; }; return service; };
    await Promise.all([runUntil(make(), () => all(poiId, "COMPLETED"), { concurrency: 2 }), runUntil(make(), () => all(poiId, "COMPLETED"), { concurrency: 2 })]);
    for (const row of await rows(poiId)) {
      const [logs] = await db.query("SELECT action FROM AUDIT_LOGS WHERE resource_type = 'CONTENT_JOBS' AND resource_id = ?", [String(row.jobId)]);
      assert.equal(logs.filter(log => log.action === "CLAIM_CONTENT_JOB").length, 1); assert.equal(logs.filter(log => log.action === "COMPLETE_CONTENT_JOB").length, 1);
    }
  });
  it("an old automatic worker cannot publish after lease loss, recovery, retry and completion by a new worker", async () => {
    const poiId = await fixture(); let release, entered; const waiting = new Promise(resolve => { entered = resolve; });
    const real = new MockTranslation(); const old = pipeline({ translator: { provider: "MOCK", translate: async input => { entered(); await new Promise(resolve => { release = resolve; }); return real.translate(input); } } });
    const events = [], worker = new ContentWorker(old, { pollMs: 100, report: event => events.push(event) }), running = worker.run();
    let timer;
    try {
      await Promise.race([waiting, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error("Provider entry timeout")), 10000); })]);
      clearTimeout(timer);
      worker.stop(); const row = (await rows(poiId)).find(item => item.languageCode === "en"); assert.equal(row.status, "PROCESSING");
      await expire(row.jobId); assert.equal((await pipeline().recoverExpiredJobs({ apply: true })).recovered, 1);
      await jobs.retry(actor, row.jobId); await runUntil(pipeline(), () => all(poiId, "COMPLETED"));
      const [before] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = 'en'", [poiId]);
      release(); await running;
      const [after] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = 'en'", [poiId]); assert.deepEqual(after, before);
      assert.ok(events.some(event => event.jobId === row.jobId && event.outcome === "SKIPPED"));
    } finally { clearTimeout(timer); worker.stop(); release?.(); await running; }
  });
  it("SIGKILL interruption survives restart; new process handles PENDING, expired job requires recovery/retry; SIGTERM drains cleanly", async () => {
    const poiId = await fixture(), held = startChild(true);
    await until(() => held.events.some(event => event.event === "provider_entered"));
    const interrupted = (await rows(poiId)).find(row => row.languageCode === "en"); assert.equal(interrupted.status, "PROCESSING"); assert.ok(interrupted.claimId);
    assert.equal((await held.stop("SIGKILL")).signal, "SIGKILL");
    const other = await fixture(), restarted = startChild();
    await until(() => all(other, "COMPLETED")); assert.equal((await rows(poiId)).find(row => row.jobId === interrupted.jobId).status, "PROCESSING");
    assert.equal((await restarted.stop("SIGTERM")).code, 0);
    await expire(interrupted.jobId); assert.equal((await pipeline().recoverExpiredJobs({ apply: true })).recovered, 1);
    await jobs.retry(actor, interrupted.jobId);
    const retried = startChild(); await until(() => all(poiId, "COMPLETED")); assert.equal((await retried.stop("SIGTERM")).code, 0);
  });
});
