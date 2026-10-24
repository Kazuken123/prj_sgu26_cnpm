const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), http = require("node:http");
const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { randomUUID, createHash } = require("node:crypto"), { fork } = require("node:child_process");
const Piper = require("../adapters/piper-tts"), { getPiperConfig } = require("../config/piper");
const { PipelineService } = require("../services/pipeline.service"), ContentJobStore = require("../stores/content_job.store");
const { PoiService } = require("../services/poi.service"), PoiStore = require("../stores/poi.store");
const { ContentJobService } = require("../services/content-job.service");
const ContentStore = require("../stores/content.store"), LocalMedia = require("../adapters/local-media");
const { inspectWav } = require("../utils/pcm-wav"), utcPool = require("../config/utc-pool");
const draft = require("../../data/demo/draft03.json");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Optional provider acceptance. Default CI still runs all mock/process-boundary tests;
// the dedicated Piper runtime enables this suite explicitly, with real MySQL/Redis.
if (process.env.RUN_PIPER_TESTS === "1") describe("Piper real local speech with isolated SQL and authenticated guest HTTP", { timeout: 600000 }, () => {
  const database = "tcv_piper_test_" + randomUUID().replaceAll("-", "");
  let connection, db, auth, actor, pois, jobs, root, storage, server, base, gateway, payment;
  const children = new Set(), piper = new Piper(), ids = [];
  const pipeline = tts => new PipelineService(new ContentJobStore(db), { tts: tts || piper, mediaStorage: storage, audioTimeoutMs: getPiperConfig().timeoutMs });
  async function fixture(text, withEnglish = true) {
    const created = await pois.save(actor, null, { name: text.vi.name, description: text.vi.description, audioScript: text.vi.audioScript,
      category: "ANIMAL", latitude: 0, longitude: 0, status: "ACTIVE" }); // TEST fixture coordinates only; no demo/GPS claims.
    if (withEnglish) await db.query("INSERT INTO POI_TRANSLATIONS(poi_id,language_code,name,description,audio_script,source_version,status) VALUES(?,'en',?,?,?,1,'READY')", [created.poiId, text.en.name, text.en.description, text.en.audioScript]);
    return created.poiId;
  }
  async function textRows() { return (await db.query("SELECT poi_id,language_code,name,description,audio_script,source_version,status FROM POI_TRANSLATIONS ORDER BY poi_id,language_code"))[0]; }
  async function audioRows() { return (await db.query("SELECT t.poi_id,t.language_code,a.* FROM AUDIOS a JOIN POI_TRANSLATIONS t USING(translation_id) ORDER BY t.poi_id,t.language_code"))[0]; }
  async function startWorker() {
    const child = fork(path.resolve(__dirname, "../scripts/content-worker.js"), ["--piper", "--poll-ms", "100", "--shutdown-ms", "10000"], {
      cwd: root, windowsHide: true, env: { ...process.env, DB_NAME: database, MEDIA_ROOT: root }, stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    children.add(child); let output = "", errors = "";
    child.stdout.on("data", bytes => { output += bytes; }); child.stderr.on("data", bytes => { errors += bytes; });
    const exited = new Promise(resolve => child.once("exit", code => resolve(code)));
    // demo7 preflight loads phonemizers before signal handlers/polling are ready.
    // A restart check must observe real startup, rather than killing preflight.
    const startupDeadline = Date.now() + getPiperConfig().timeoutMs + 5000;
    while (!output.includes('"event":"started"')) {
      assert.equal(child.exitCode, null, "Worker exited before startup");
      assert.equal(child.signalCode, null, "Worker was interrupted before startup");
      assert.ok(Date.now() < startupDeadline, "Worker startup deadline exceeded");
      await pause(50);
    }
    return { child, stop: async () => { child.kill("SIGTERM"); assert.equal(await exited, 0); children.delete(child); assert.ok(!errors, "Worker emitted an error"); assert.match(output, /"provider":"PIPER"/); } };
  }
  before(async () => {
    assert.equal(process.env.RUN_DB_TESTS, "1"); assert.equal(process.env.RUN_REDIS_TESTS, "1");
    const mysql = require("mysql2/promise"), options = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    connection = await mysql.createConnection(options); assert.match(database, /^tcv_piper_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await connection.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...options, database, multipleStatements: true, connectionLimit: 10 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const SchemaStore = require("../stores/schema.store"); await new SchemaStore(db).migrateContentJobClaim(); await new SchemaStore(db).migrateContentJobLease();
    const { AuthService } = require("../services/auth.service"), AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), TokenStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new TokenStore(db) });
    const admin = await auth.bootstrapAdmin({ email: "piper-admin@example.invalid", password: "PiperTestOnlyPassword123" });
    actor = { userId: admin.userId, role: "ADMIN", status: "ACTIVE" }; pois = new PoiService(new PoiStore(db)); jobs = new ContentJobService(new ContentJobStore(db));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-piper-sql-")); storage = new LocalMedia({ root });
    await piper.assertConfigured();
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store"), RedisStore = require("../stores/redis.store"), MockGateway = require("../adapters/mock-gateway");
    gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => "piper-http-test-only-webhook-secret-32-bytes" });
    payment = new PaymentService(new PaymentStore(db), new RedisStore({ onlineCodePrefix: "tcv:piper-test:" + randomUUID() + ":" }), { gateway, price: () => "50000.00" });
    server = http.createServer(require("../server").createApp({ authService: auth, paymentService: payment,
      contentService: new (require("../services/content.service").ContentService)(new ContentStore(db)),
      mediaService: new (require("../services/media.service").MediaService)(new ContentStore(db), storage) }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) { const ended = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGKILL"); await ended; }
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end(); if (connection) await connection.end(); // Preserve the isolated UUID database.
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-piper-sql-")) await fs.rm(root, { recursive: true, force: true });
    await require("../config/database").end();
  });
  it("actual CLI worker creates four speech WAVs from unchanged DRAFT-03 VI/EN and restart preserves files", { timeout: 150000 }, async () => {
    for (const poi of draft.pois) ids.push(await fixture(poi.text));
    const before = await textRows(), worker = await startWorker();
    try {
      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        const [rows] = await db.query("SELECT status FROM CONTENT_JOBS");
        if (rows.every(row => row.status === "COMPLETED")) break;
        if (rows.some(row => row.status === "FAILED")) assert.fail("Real Piper worker failed a fixture job");
        await pause(200);
      }
      assert.deepEqual((await db.query("SELECT status FROM CONTENT_JOBS"))[0].map(row => row.status), Array(4).fill("COMPLETED"));
    } finally { await worker.stop(); }
    assert.deepEqual(await textRows(), before);
    const audios = await audioRows(); assert.equal(audios.length, 4);
    for (const row of audios) {
      const bytes = await storage.get(row.file_url.split("/").pop()), info = inspectWav(bytes);
      assert.ok(info.duration > 2); assert.equal(row.status, "AVAILABLE"); assert.equal(info.fileSize, row.file_size);
      if (process.env.PIPER_EVIDENCE_DIR) {
        await fs.mkdir(process.env.PIPER_EVIDENCE_DIR, { recursive: true });
        await fs.writeFile(path.join(process.env.PIPER_EVIDENCE_DIR, `${row.poi_id}-${row.language_code}.wav`), bytes);
      }
    }
    const hash = createHash("sha256").update(JSON.stringify(audios)).digest("hex"), restarted = await startWorker();
    await pause(1000); await restarted.stop();
    assert.equal(createHash("sha256").update(JSON.stringify(await audioRows())).digest("hex"), hash); assert.deepEqual(await textRows(), before);
  });
  it("two claimants invoke real Piper only once for the same job", async () => {
    const poiId = await fixture(draft.pois[0].text), [rows] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id=? AND language_code='en'", [poiId]);
    let calls = 0, enter, release;
    const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { release = resolve; });
    const tts = { provider: "PIPER", synthesize: async input => { calls++; enter(); await resumed; return piper.synthesize(input); } };
    const running = pipeline(tts).runJob(rows[0].job_id);
    try { await entered; assert.equal((await pipeline(tts).runJob(rows[0].job_id)).reason, "NOT_PENDING"); }
    finally { release(); }
    assert.equal((await running).completed, true); assert.equal(calls, 1);
  });
  it("provider failure records safe FAILED then explicit retry creates speech without changing reviewed text", async () => {
    const poiId = await fixture(draft.pois[1].text), [rows] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id=? AND language_code='en'", [poiId]), jobId = rows[0].job_id;
    const before = await textRows(), broken = new Piper(getPiperConfig(), async () => { throw Error("private local path"); });
    assert.equal((await pipeline(broken).runJob(jobId)).reason, "TTS_PROVIDER_FAILED");
    assert.equal((await jobs.get(actor, jobId)).status, "FAILED");
    await jobs.retry(actor, jobId, {}); assert.equal((await pipeline().runJob(jobId)).completed, true); assert.deepEqual(await textRows(), before);
  });
  it("Piper mode never invents a missing English translation or calls TTS for it", async () => {
    const poiId = await fixture(draft.pois[0].text, false), [rows] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id=? AND language_code='en'", [poiId]);
    const result = await pipeline({ synthesize: () => assert.fail("No READY translation") }).runJob(rows[0].job_id);
    assert.equal(result.reason, "CONTENT_TRANSLATION_NOT_READY");
    assert.equal((await db.query("SELECT COUNT(*) AS total FROM POI_TRANSLATIONS WHERE poi_id=? AND language_code='en'", [poiId]))[0][0].total, 0);
  });
  it("a delayed Piper result cannot publish after lease recovery and retry assigns a new claim", async () => {
    const poiId = await fixture(draft.pois[0].text), [rows] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id=? AND language_code='en'", [poiId]), jobId = rows[0].job_id;
    let enter, release;
    const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { release = resolve; });
    const delayed = { provider: "PIPER", synthesize: async input => { const bytes = await piper.synthesize(input); enter(); await resumed; return bytes; } };
    const old = pipeline(delayed), claim = await old.claimJob(jobId), pending = old.prepareAudio(jobId, claim.claimId);
    try {
      await entered;
      await db.query("UPDATE CONTENT_JOBS SET lease_expires_at=UTC_TIMESTAMP(3)-INTERVAL 1 SECOND WHERE job_id=?", [jobId]);
      assert.equal((await old.recoverExpiredJobs({ apply: true })).recovered, 1);
      await jobs.retry(actor, jobId, {}); assert.equal((await pipeline().runJob(jobId)).completed, true);
    } finally { release(); }
    const before = (await audioRows()).find(row => row.poi_id === poiId);
    assert.equal((await pending).reason, "CLAIM_LOST");
    assert.deepEqual((await audioRows()).find(row => row.poi_id === poiId), before);
  });
  it("MockGateway -> guest token -> VI/EN bundle -> actual speech requires authentication and valid paid session", async () => {
    const json = async (url, method = "GET", body, token, headers = {}) => {
      const response = await fetch(base + url, { method, headers: { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
      return { response, body: await response.json() };
    };
    const checkout = await json("/api/payments/online-checkout", "POST", {}, null, { "Idempotency-Key": randomUUID() }); assert.equal(checkout.response.status, 201);
    const c = checkout.body.data, event = gateway.createWebhook({ paymentRef: c.paymentRef, amount: c.amount, currency: c.currency, status: "SUCCESS" });
    const webhook = await json("/api/payments/webhooks/mock", "POST", event.body, null, { "X-Mock-Signature": event.signature }); assert.equal(webhook.response.status, 200);
    const granted = await json(`/api/payments/sessions/${c.sessionId}/exchange-online-code`, "POST", { authCode: c.authCode }); assert.equal(granted.response.status, 200);
    const token = granted.body.data.token;
    for (const languageCode of ["vi", "en"]) {
      const bundle = await json("/api/content/bundle?languageCode=" + languageCode, "GET", undefined, token); assert.equal(bundle.response.status, 200);
      const poi = bundle.body.data.pois.find(row => row.poiId === ids[0]); assert.ok(poi.audio.url);
      const url = poi.audio.url;
      for (const invalid of [null, "tcv_visit_" + "a".repeat(64)]) assert.equal((await fetch(base + url, { headers: invalid ? { Authorization: "Bearer " + invalid } : {} })).status, 401);
      const response = await fetch(base + url, { headers: { Authorization: "Bearer " + token } }); assert.equal(response.status, 200);
      assert.ok(inspectWav(Buffer.from(await response.arrayBuffer())).duration > 2);
    }
    await db.query("UPDATE VISIT_SESSIONS SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE session_id=?", [c.sessionId]);
    assert.equal((await json("/api/content/bundle?languageCode=vi", "GET", undefined, token)).response.status, 401);
  });
  if (process.env.RUN_PIPER_DEMO7_TESTS === "1" || process.env.RUN_PIPER_DEMO15_TESTS === "1") it("multilingual actual worker preserves reviewed Unicode through restart and serves exact-language audio bundles", { timeout: 480000 }, async () => {
    const fifteen = process.env.RUN_PIPER_DEMO15_TESTS === "1";
    assert.equal(getPiperConfig().voiceSet, fifteen ? "demo15" : "demo7");
    const samples = [
      ["zh-Hans", "简体中文", "这是测试，不是正式导览。"],
      ["ko", "한국어", "이것은 시험용 음성입니다."],
      ["ja", "日本語", "これはテスト用の音声です。"],
      ["ru", "Русский", "Это тестовая запись."],
      ["fr", "Français", "Ceci est un test audio."],
    ];
    if (fifteen) samples.push(
      ["de", "Deutsch", "Dies ist eine Testaufnahme."],
      ["es", "Español", "Esta es una grabación de prueba."],
      ["it", "Italiano", "Questa è una registrazione di prova."],
      ["pt-BR", "Português (Brasil)", "Esta é uma gravação de teste."],
      ["nl", "Nederlands", "Dit is een testopname."],
      ["pl", "Polski", "To jest nagranie próbne."],
      ["cs", "Čeština", "Toto je zkušební nahrávka."],
      ["tr", "Türkçe", "Bu bir deneme kaydıdır."]);
    for (const [code, name] of samples) await db.query("INSERT INTO LANGUAGES(code,name,is_active) VALUES(?,?,1)", [code, name]);
    const poiId = await fixture(draft.pois[0].text);
    const translations = new (require("../services/translation.service").TranslationService)(new (require("../stores/translation.store"))(db));
    for (const [code, name, script] of samples) await translations.importReviewed(actor, poiId, code,
      { sourceVersion: 1, name, description: script, audioScript: script });
    const before = await textRows(), worker = await startWorker();
    try {
      // The worker also drains pending VI fixtures from the preceding error cases.
      // This queue deadline is separate from each unchanged provider timeout.
      const deadline = Date.now() + (fifteen ? 360000 : 180000);
      while (Date.now() < deadline) {
        const [rows] = await db.query("SELECT status FROM CONTENT_JOBS WHERE poi_id=?", [poiId]);
        if (rows.every(row => row.status === "COMPLETED")) break;
        if (rows.some(row => row.status === "FAILED")) assert.fail("A real multilingual job failed");
        await pause(200);
      }
      const [rows] = await db.query("SELECT status FROM CONTENT_JOBS WHERE poi_id=?", [poiId]);
      assert.equal(rows.length, samples.length + 2); assert.ok(rows.every(row => row.status === "COMPLETED"));
    } finally { await worker.stop(); }
    assert.deepEqual(await textRows(), before);
    const original = (await audioRows()).filter(row => row.poi_id === poiId);
    assert.equal(original.length, samples.length + 2);
    const restarted = await startWorker();
    await pause(1000); await restarted.stop();
    assert.deepEqual((await audioRows()).filter(row => row.poi_id === poiId), original);
    const checkout = (await payment.initializeOnline({}, randomUUID())).data;
    const event = gateway.createWebhook({ paymentRef: checkout.paymentRef, amount: checkout.amount, currency: checkout.currency, status: "SUCCESS" });
    await payment.processMockWebhook(event.body, event.signature);
    const visit = await payment.exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.246");
    const headers = { Authorization: "Bearer " + visit.token };
    for (const code of ["vi", "en", ...samples.map(row => row[0])]) {
      const response = await fetch(base + "/api/content/bundle?languageCode=" + code, { headers });
      assert.equal(response.status, 200);
      const poi = (await response.json()).data.pois.find(row => row.poiId === poiId);
      assert.equal(poi.text.languageCode, code); assert.equal(poi.audio.languageCode, code);
      const audio = await fetch(base + poi.audio.url, { headers }); assert.equal(audio.status, 200);
      assert.ok(inspectWav(Buffer.from(await audio.arrayBuffer())).duration > 0);
      assert.equal((await fetch(base + poi.audio.url)).status, 401);
    }
    await db.query("UPDATE VISIT_SESSIONS SET status='REVOKED' WHERE session_id=?", [checkout.sessionId]);
    const url = original[0].file_url;
    assert.equal((await fetch(base + url, { headers })).status, 401);
    assert.deepEqual(await textRows(), before);
  });
});
