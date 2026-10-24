const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os"), http = require("node:http");
const { randomUUID } = require("node:crypto");
const { TranslationService } = require("../services/translation.service"), TranslationStore = require("../stores/translation.store");
const { PoiService } = require("../services/poi.service"), PoiStore = require("../stores/poi.store");
const { PipelineService } = require("../services/pipeline.service"), JobStore = require("../stores/content_job.store");
const { ContentJobService } = require("../services/content-job.service");
const LocalMedia = require("../adapters/local-media"), MockTts = require("../adapters/mock-tts");
const utcPool = require("../config/utc-pool");
const reviewed = { sourceVersion: 1, name: "Test point", description: "This is reviewed test content, not information about the zoo.",
  audioScript: "This is a reviewed English narration used only to test the manual translation workflow." };
if (process.env.RUN_DB_TESTS === "1") describe("Reviewed multilingual import with MySQL 8, version locks and private audio", () => {
  const database = "tcv_translation_test_" + randomUUID().replaceAll("-", "");
  let admin, db, auth, actor, translations, pois, jobs, storage, root;
  before(async () => {
    const mysql = require("mysql2/promise"), options = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(options);
    assert.match(database, /^tcv_translation_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...options, database, multipleStatements: true, connectionLimit: 12 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const schema = new (require("../stores/schema.store"))(db); await schema.migrateContentJobClaim(); await schema.migrateContentJobLease();
    const { AuthService } = require("../services/auth.service");
    auth = new AuthService({ authStore: new (require("../stores/auth.store"))(db), users: new (require("../stores/user.store"))(db),
      tokens: new (require("../stores/refresh_token.store"))(db) });
    const user = await auth.bootstrapAdmin({ email: "manual-admin@example.invalid", password: "ManualTestOnly123" });
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" };
    translations = new TranslationService(new TranslationStore(db)); pois = new PoiService(new PoiStore(db)); jobs = new ContentJobService(new JobStore(db));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-manual-test-")); storage = new LocalMedia({ root });
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_translation_test_[a-f0-9]{32}$/.test(database) && database !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + database + "`");
      await admin.end();
    }
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-manual-test-")) await fs.rm(root, { recursive: true, force: true });
  });
  async function fixture() {
    const body = { name: "Điểm thử nghiệm " + randomUUID(), category: "PLANT", description: "Chỉ là dữ liệu kiểm thử, không phải nội dung thực địa.",
      audioScript: "Đây là lời đọc thử nghiệm.", latitude: 0, longitude: 0, status: "ACTIVE" };
    const poi = await pois.save(actor, null, body);
    const [rows] = await db.query("SELECT job_id AS jobId FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = 'en'", [poi.poiId]);
    return { poiId: poi.poiId, jobId: rows[0].jobId, body };
  }
  const worker = () => new PipelineService(new JobStore(db), { mediaStorage: storage, tts: new MockTts(),
    translator: { translate: () => assert.fail("Reviewed EN must be reused, not translated") } });
  async function snapshot(poiId) {
    const [texts] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY language_code", [poiId]);
    const [records] = await db.query("SELECT * FROM CONTENT_JOBS WHERE poi_id = ? ORDER BY job_id", [poiId]);
    const [audios] = await db.query("SELECT a.* FROM AUDIOS a JOIN POI_TRANSLATIONS t ON t.translation_id=a.translation_id WHERE t.poi_id=?", [poiId]);
    return { texts, records, audios };
  }
  async function audits(poiId) {
    const [rows] = await db.query("SELECT * FROM AUDIT_LOGS WHERE action='IMPORT_REVIEWED_TRANSLATION' AND JSON_UNQUOTE(JSON_EXTRACT(details, '$.poiId'))=? ORDER BY log_id", [String(poiId)]); return rows;
  }
  it("thirteen additional language routes preserve Unicode, serialize retries and reuse reviewed text with mock audio", async t => {
    const samples = [
      ["zh-Hans", "简体中文", "测试地点", "这是测试介绍。", "这是用于测试的讲解，不是动物园的正式内容。"],
      ["ko", "한국어", "시험 장소", "시험용 소개입니다.", "이것은 동물원 안내가 아닌 시험용 음성 대본입니다."],
      ["ja", "日本語", "テスト地点", "テスト用の紹介です。", "これは動物園の正式な案内ではなく、テスト用の原稿です。"],
      ["ru", "Русский", "Тестовая точка", "Тестовое описание.", "Это тестовый текст, а не утверждённый рассказ о зоопарке."],
      ["fr", "Français", "Point de test", "Présentation de test.", "Ce texte sert uniquement à tester le système, pas à présenter le zoo."],
      ["de", "Deutsch", "Prüfpunkt", "Nur ein Test.", "Dies ist ein Testtext, keine Beschreibung eines Tieres."],
      ["es", "Español", "Punto de prueba", "Solo una prueba.", "Este texto es una prueba, no describe un animal real."],
      ["it", "Italiano", "Punto di prova", "Solo una prova.", "Questo testo è una prova, non descrive un animale reale."],
      ["pt-BR", "Português (Brasil)", "Ponto de teste", "Apenas um teste.", "Este é um texto de teste, não descreve um animal real."],
      ["nl", "Nederlands", "Testpunt", "Alleen een test.", "Dit is een testtekst, geen beschrijving van een echt dier."],
      ["pl", "Polski", "Punkt próbny", "To tylko próba.", "To jest tekst testowy, nie opis prawdziwego zwierzęcia."],
      ["cs", "Čeština", "Zkušební bod", "Pouze zkouška.", "Toto je zkušební text, nikoli popis skutečného zvířete."],
      ["tr", "Türkçe", "Deneme noktası", "Yalnızca bir deneme.", "Bu bir deneme metnidir, gerçek bir hayvanı anlatmaz."],
    ];
    // Only this suite's randomly named database; no demo language registration.
    for (const [code, name] of samples) await db.query("INSERT INTO LANGUAGES(code,name,is_active) VALUES(?,?,1)", [code, name]);
    t.after(async () => { for (const [code] of samples) await db.query("UPDATE LANGUAGES SET is_active=0 WHERE code=?", [code]); });
    const { createApp } = require("../server"), f = await fixture();
    const server = http.createServer(createApp({ authService: auth, translationService: translations }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const login = await auth.login({ email: "manual-admin@example.invalid", password: "ManualTestOnly123" });
    const headers = { Authorization: "Bearer " + login.accessToken, "Content-Type": "application/json" };
    const base = `http://127.0.0.1:${server.address().port}/api/admin/pois/${f.poiId}/translations/`;
    const sourceBefore = (await snapshot(f.poiId)).texts.find(row => row.language_code === "vi");
    for (const [code, , name, description, audioScript] of samples) {
      const body = { sourceVersion: 1, name, description, audioScript };
      assert.equal((await fetch(base + code)).status, 401);
      assert.equal((await fetch(base + code, { headers: { Authorization: "Bearer visitor-opaque-token" } })).status, 401);
      const replies = await Promise.all(Array.from({ length: 4 }, () => fetch(base + code, { method: "PUT", headers, body: JSON.stringify(body) })));
      assert.ok(replies.every(reply => reply.status === 200));
      const outcomes = await Promise.all(replies.map(reply => reply.json()));
      assert.equal(outcomes.filter(reply => reply.data.outcome === "IMPORTED").length, 1);
      assert.equal(outcomes.filter(reply => reply.data.outcome === "UNCHANGED").length, 3);
      assert.ok(replies.every(reply => reply.headers.get("cache-control") === "no-store"));
      const get = await fetch(base + code, { headers });
      assert.equal(get.status, 200); assert.equal((await get.json()).data.translation.audioScript, audioScript);
      const before = await snapshot(f.poiId);
      const conflict = await fetch(base + code, { method: "PUT", headers, body: JSON.stringify({ ...body, name: name + " changed" }) });
      assert.equal(conflict.status, 409); assert.equal((await conflict.json()).code, "TRANSLATION_READY_CONFLICT");
      assert.deepEqual(await snapshot(f.poiId), before);
      const current = await translations.get(actor, f.poiId, code);
      assert.equal((await worker().runJob(current.job.jobId)).completed, true);
      const after = await translations.get(actor, f.poiId, code);
      assert.deepEqual(after.translation, { ...body, status: "READY" });
      const record = (await snapshot(f.poiId)).audios.find(row => row.translation_id === before.texts.find(row => row.language_code === code).translation_id);
      assert.equal(record.status, "AVAILABLE"); assert.equal(record.source_version, 1);
      const bytes = await storage.get(record.file_url.split("/").pop());
      assert.ok(require("../utils/pcm-wav").inspectWav(bytes).duration > 0);
    }
    const final = await snapshot(f.poiId), logs = await audits(f.poiId);
    assert.deepEqual(final.texts.find(row => row.language_code === "vi"), sourceBefore);
    assert.equal(final.texts.filter(row => samples.some(([code]) => code === row.language_code)).length, samples.length);
    assert.equal(final.audios.length, samples.length); assert.equal(logs.length, samples.length);
    assert.deepEqual(logs.map(log => JSON.parse(log.details).languageCode).sort(), samples.map(([code]) => code).sort());
    // Catalogue enablement alone must never expand the approved API allowlist.
    await db.query("INSERT INTO LANGUAGES(code,name,is_active) VALUES('sv','Svenska',1)");
    assert.equal((await fetch(base + "sv", { headers })).status, 400);
    for (const code of ["pt", "pt-br", "pt-PT"]) assert.equal((await fetch(base + code, { headers })).status, 400);
    assert.equal((await fetch(base + "zh", { headers })).status, 400);
    assert.deepEqual(await snapshot(f.poiId), final);
  });
  it("import and audit commit together, repeat leaves all rows unchanged and never requeues", async () => {
    const f = await fixture();
    const result = await translations.importReviewed(actor, f.poiId, "en", reviewed, { ipAddress: "192.0.2.240" });
    assert.equal(result.outcome, "IMPORTED"); assert.equal(result.job.status, "PENDING");
    const before = await snapshot(f.poiId), log = await audits(f.poiId);
    assert.equal(before.audios.length, 0); assert.equal(log.length, 1); assert.equal(log[0].user_id, actor.userId);
    assert.deepEqual(JSON.parse(log[0].details), { poiId: f.poiId, languageCode: "en", sourceVersion: 1 });
    assert.equal((await translations.importReviewed(actor, f.poiId, "en", reviewed)).outcome, "UNCHANGED");
    assert.deepEqual(await snapshot(f.poiId), before); assert.deepEqual(await audits(f.poiId), log);
  });
  it("concurrent identical requests insert one translation/audit; competing content cannot overwrite the winner", async () => {
    const f = await fixture(), second = new TranslationService(new TranslationStore(db));
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => (i % 2 ? translations : second).importReviewed(actor, f.poiId, "en", reviewed)));
    assert.equal(results.filter(result => result.outcome === "IMPORTED").length, 1); assert.equal((await audits(f.poiId)).length, 1);
    const other = await fixture();
    const competitors = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => second.importReviewed(actor, other.poiId, "en", { ...reviewed, name: "Candidate " + i })));
    assert.equal(competitors.filter(result => result.status === "fulfilled").length, 1);
    assert.ok(competitors.filter(result => result.status === "rejected").every(result => result.reason.code === "TRANSLATION_READY_CONFLICT"));
    assert.equal((await audits(other.poiId)).length, 1);
  });
  it("source edits make old EN/audio stale; importing the new version preserves old files and never relabels audio", async () => {
    const f = await fixture(); await translations.importReviewed(actor, f.poiId, "en", reviewed); await worker().runJob(f.jobId);
    const old = await snapshot(f.poiId), original = old.audios[0];
    await pois.save(actor, f.poiId, { ...f.body, audioScript: "Nguồn thử đã được sửa.", expectedVersion: 1 });
    await assert.rejects(translations.importReviewed(actor, f.poiId, "en", reviewed), { code: "TRANSLATION_SOURCE_CONFLICT" });
    await translations.importReviewed(actor, f.poiId, "en", { ...reviewed, sourceVersion: 2, audioScript: "The reviewed source has changed." });
    const fresh = await snapshot(f.poiId);
    assert.equal(fresh.texts.find(text => text.language_code === "en").source_version, 2);
    assert.deepEqual(fresh.audios[0], original); assert.ok((await storage.get(original.file_url.split("/").pop())).length > 0);
    assert.equal(fresh.records.find(job => job.source_version === 2 && job.language_code === "en").status, "PENDING");
  });
  it("an existing same-version PENDING or FAILED text is preserved for reconciliation", async () => {
    const f = await fixture();
    await db.query("INSERT INTO POI_TRANSLATIONS(poi_id,language_code,source_version,status) VALUES(?,'en',1,'PENDING')", [f.poiId]);
    for (const status of ["PENDING", "FAILED"]) {
      await db.query("UPDATE POI_TRANSLATIONS SET status=? WHERE poi_id=? AND language_code='en'", [status, f.poiId]);
      const before = await snapshot(f.poiId);
      await assert.rejects(translations.importReviewed(actor, f.poiId, "en", reviewed), { status: 409, code: "TRANSLATION_EXISTING_CONFLICT" });
      assert.deepEqual(await snapshot(f.poiId), before); assert.equal((await audits(f.poiId)).length, 0);
    }
  });
  it("a source edit racing an import cannot attach old EN to a new VI version", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      pois.save(actor, f.poiId, { ...f.body, name: "Nguồn mới", expectedVersion: 1 }),
      translations.importReviewed(actor, f.poiId, "en", reviewed),
    ]);
    assert.equal(results[0].status, "fulfilled");
    if (results[1].status === "rejected") assert.equal(results[1].reason.code, "TRANSLATION_SOURCE_CONFLICT");
    const latest = await translations.get(actor, f.poiId, "en"); assert.equal(latest.sourceVersion, 2);
    assert.ok(latest.translation === null || latest.translation.sourceVersion === 1);
  });
  it("worker claim and import serialize; importing during PROCESSING cannot alter worker input", async () => {
    const f = await fixture(), pipeline = worker();
    const results = await Promise.allSettled([pipeline.claimJob(f.jobId), translations.importReviewed(actor, f.poiId, "en", reviewed)]);
    assert.equal(results[0].status, "fulfilled"); assert.equal(results[0].value.claimed, true);
    if (results[1].status === "rejected") assert.equal(results[1].reason.code, "TRANSLATION_JOB_PROCESSING");
    const before = await snapshot(f.poiId);
    await assert.rejects(translations.importReviewed(actor, f.poiId, "en", reviewed), { code: "TRANSLATION_JOB_PROCESSING" });
    assert.deepEqual(await snapshot(f.poiId), before);
  });
  it("missing EN fails without inventing text; manual import keeps FAILED until an explicit staff retry", async () => {
    const f = await fixture(), pipeline = new PipelineService(new JobStore(db), { mediaStorage: storage, tts: new MockTts() });
    const missing = await pipeline.runJob(f.jobId);
    assert.equal(missing.status, "FAILED"); assert.equal(missing.reason, "CONTENT_TRANSLATION_NOT_READY");
    const imported = await translations.importReviewed(actor, f.poiId, "en", reviewed);
    assert.equal(imported.job.status, "FAILED"); assert.equal(imported.job.canRetry, true);
    assert.equal((await pipeline.runJob(f.jobId)).claimed, false);
    await jobs.retry(actor, f.jobId, {}); assert.equal((await worker().runJob(f.jobId)).completed, true);
    const done = await snapshot(f.poiId); assert.equal(done.texts.find(text => text.language_code === "en").audio_script, reviewed.audioScript);
    assert.equal((await translations.importReviewed(actor, f.poiId, "en", reviewed)).outcome, "UNCHANGED");
    assert.deepEqual(await snapshot(f.poiId), done);
  });
  it("audit failure rolls back text and a later explicit retry can import once", async () => {
    const f = await fixture(), before = await snapshot(f.poiId);
    await db.query("CREATE TRIGGER manual_import_audit_failure BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW BEGIN IF NEW.action='IMPORT_REVIEWED_TRANSLATION' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced audit failure'; END IF; END");
    try { await assert.rejects(translations.importReviewed(actor, f.poiId, "en", reviewed), { status: 503 }); }
    finally { await db.query("DROP TRIGGER manual_import_audit_failure"); }
    assert.deepEqual(await snapshot(f.poiId), before); assert.equal((await audits(f.poiId)).length, 0);
    assert.equal((await translations.importReviewed(actor, f.poiId, "en", reviewed)).outcome, "IMPORTED");
    assert.equal((await translations.importReviewed(actor, f.poiId, "en", reviewed)).outcome, "UNCHANGED");
  });
  it("a lost commit acknowledgement reports uncertainty; retry reconciles the committed text without a second audit", async () => {
    const f = await fixture();
    const lostReply = { getConnection: async () => {
      const connection = await db.getConnection();
      return new Proxy(connection, { get(target, key) {
        if (key === "commit") return async () => { await target.commit(); throw new Error("lost SQL acknowledgement"); };
        const value = target[key]; return typeof value === "function" ? value.bind(target) : value;
      } });
    } };
    const uncertain = new TranslationService(new TranslationStore(lostReply));
    await assert.rejects(uncertain.importReviewed(actor, f.poiId, "en", reviewed), { status: 503, code: "TRANSLATION_STORAGE_UNAVAILABLE" });
    assert.equal((await translations.get(actor, f.poiId, "en")).translation.status, "READY");
    assert.equal((await translations.importReviewed(actor, f.poiId, "en", reviewed)).outcome, "UNCHANGED");
    assert.equal((await audits(f.poiId)).length, 1);
  });
  it("current editor permissions and language enablement are rechecked before mutation", async () => {
    const allowed = await fixture(), f = await fixture();
    const [user] = await db.query("INSERT INTO USERS(email,password_hash,role,status) VALUES('manual-staff@example.invalid','test-only','STAFF','ACTIVE')");
    const staff = { userId: user.insertId, role: "STAFF", status: "ACTIVE" };
    assert.equal((await translations.importReviewed(staff, allowed.poiId, "en", reviewed)).outcome, "IMPORTED");
    await db.query("UPDATE USERS SET status='LOCKED' WHERE user_id=?", [staff.userId]);
    await assert.rejects(translations.importReviewed(staff, f.poiId, "en", reviewed), { status: 403 });
    await db.query("UPDATE LANGUAGES SET is_active=0 WHERE code='en'");
    try { await assert.rejects(translations.importReviewed(actor, f.poiId, "en", reviewed), { code: "TRANSLATION_LANGUAGE_DISABLED" }); }
    finally { await db.query("UPDATE LANGUAGES SET is_active=1 WHERE code='en'"); }
    assert.equal((await audits(f.poiId)).length, 0);
  });
  it("HTTP import -> " + (process.env.RUN_PIPER_TESTS === "1" ? "real Piper" : "mock WAV") + " -> MockGateway token -> EN bundle -> protected audio", { timeout: 150000 }, async t => {
    const { createApp } = require("../server"), { ContentService } = require("../services/content.service"), ContentStore = require("../stores/content.store");
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store");
    const RedisStore = require("../stores/redis.store"), MockGateway = require("../adapters/mock-gateway"), { MediaService } = require("../services/media.service");
    const prefix = "tcv_manual_test:" + randomUUID() + ":", limits = new Set(), sessions = new Set(), actualRedis = new RedisStore({ onlineCodePrefix: prefix });
    const redis = { ensureOnlineCode: (...args) => { sessions.add(args[0]); return actualRedis.ensureOnlineCode(...args); },
      inspectOnlineCode: (...args) => actualRedis.inspectOnlineCode(...args), removeOnlineCode: (...args) => actualRedis.removeOnlineCode(...args),
      consumeLookup: (keys, config) => actualRedis.consumeLookup(keys.map(key => { const scoped = prefix + key; limits.add(scoped); return scoped; }), config) };
    const gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => "manual-demo-test-only-signing-key-over-32-bytes" });
    const payment = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00" });
    const media = new MediaService(new ContentStore(db), storage), content = new ContentService(new ContentStore(db));
    const server = http.createServer(createApp({ authService: auth, translationService: translations, paymentService: payment, contentService: content, mediaService: media }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => {
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      await actualRedis.execute(client => client.del([...limits, ...[...sessions].map(id => prefix + id)]));
    });
    const base = `http://127.0.0.1:${server.address().port}`, f = await fixture();
    const login = await auth.login({ email: "manual-admin@example.invalid", password: "ManualTestOnly123" });
    const route = `/api/admin/pois/${f.poiId}/translations/en`;
    const imported = await fetch(base + route, { method: "PUT", headers: { Authorization: "Bearer " + login.accessToken, "Content-Type": "application/json" }, body: JSON.stringify(reviewed) });
    assert.equal(imported.status, 200); assert.equal((await imported.json()).data.outcome, "IMPORTED");
    const tts = process.env.RUN_PIPER_TESTS === "1" ? new (require("../adapters/piper-tts"))() : new MockTts();
    const pipeline = new PipelineService(new JobStore(db), { translator: { translate: () => assert.fail("Must reuse reviewed EN") }, tts, mediaStorage: storage, audioTimeoutMs: 120000 });
    assert.equal((await pipeline.runJob(f.jobId)).completed, true);
    const checkout = (await payment.initializeOnline({}, randomUUID())).data;
    const notification = gateway.createWebhook({ paymentRef: checkout.paymentRef, amount: checkout.amount, currency: checkout.currency, status: "SUCCESS" });
    await payment.processMockWebhook(notification.body, notification.signature);
    const visitor = await payment.exchangeOnlineCode(checkout.sessionId, { authCode: checkout.authCode }, "192.0.2.241");
    const headers = { Authorization: "Bearer " + visitor.token };
    const bundle = await fetch(base + "/api/content/bundle?languageCode=en", { headers });
    assert.equal(bundle.status, 200); const poi = (await bundle.json()).data.pois.find(p => p.poiId === f.poiId);
    assert.equal(poi.text.name, reviewed.name); assert.equal(poi.text.audioScript, reviewed.audioScript); assert.equal(poi.audio.languageCode, "en");
    const audio = await fetch(base + poi.audio.url, { headers }); assert.equal(audio.status, 200);
    const bytes = Buffer.from(await audio.arrayBuffer()); assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.ok(require("../utils/pcm-wav").inspectWav(bytes).duration > 0);
    assert.equal((await fetch(base + poi.audio.url)).status, 401);
    assert.equal((await fetch(base + poi.audio.url, { headers: { Authorization: "Bearer " + login.accessToken } })).status, 401);
    assert.equal((await fetch(base + route, { headers })).status, 401);
    await db.query("UPDATE VISIT_SESSIONS SET status='REVOKED' WHERE session_id=?", [checkout.sessionId]);
    assert.equal((await fetch(base + poi.audio.url, { headers })).status, 401);
    const current = await translations.get(actor, f.poiId, "en"); assert.equal(current.translation.audioScript, reviewed.audioScript);
    assert.equal(current.job.status, "COMPLETED");
  });
});
