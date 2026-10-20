const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os"), http = require("node:http");
const { randomUUID } = require("node:crypto");
const { DemoSeedService, validate, SAVED_LABEL } = require("../services/demo-seed.service"), DemoSeedStore = require("../stores/demo-seed.store");
const { parseOptions } = require("../scripts/seed-demo");
function fixture(database) {
  return { datasetId: "TCV_DEMO_POIS_V1", database, approved: true, audio: "MOCK_TEST_TONE_NOT_SPEECH",
    locationLabel: "vị trí tham khảo từ OpenStreetMap, chưa khảo sát thực địa", osmCheckedAt: "2026-10-20T00:00:00.000Z",
    pois: ["giraffe", "asian-elephant"].map((key, index) => ({ key, osmNode: ["6045633938", "6045634869"][index], latitude: 10, longitude: 106,
      text: Object.fromEntries(["vi", "en"].map(language => [language, { name: `TEST ONLY ${key} ${language}`, description: `TEST ONLY description ${language}`, audioScript: `TEST ONLY script ${language}` }])) })),
    tour: { name: "Lộ trình demo do nhóm đề xuất — TEST ONLY", description: "TEST ONLY: không phải tuyến đi thực địa." } };
}
function savedFixture(database) {
  const value = fixture(database); value.osmCheckedAt = null; value.locationLabel = SAVED_LABEL;
  value.locationEvidence = { mode: "SAVED_SOURCE_ACCEPTED", acceptedForBrowserDemo: true };
  value.pois.forEach((poi, index) => { poi.savedOsmSource = { nodeId: poi.osmNode, url: "https://www.openstreetmap.org/node/" + poi.osmNode,
    version: [5, 3][index], readOn: "2026-10-20", name: "TEST ONLY saved node", zoo: "enclosure", latitude: poi.latitude, longitude: poi.longitude }; });
  return value;
}
describe("Demo seed input/CLI guard", () => {
  it("requires exact database, explicit apply and manifest path", () => {
    assert.throws(() => parseOptions([]));
    assert.throws(() => parseOptions(["--manifest", "fixture.json", "--database", "old_db", "--apply"]));
    assert.deepEqual(parseOptions(["--manifest", "fixture.json", "--database", "tcv_demo_review_20261020", "--apply"]), { manifestPath: "fixture.json", database: "tcv_demo_review_20261020" });
  });
  it("rejects unapproved content, missing source check and implicit database before touching Store", async () => {
    const service = new DemoSeedService({ transaction: () => assert.fail("Store must not be called") }), name = "tcv_demo_review_20261020";
    for (const value of [{ ...fixture(name), approved: false }, { ...fixture(name), osmCheckedAt: null }, fixture("old_db")]) {
      await assert.rejects(service.seed(value, value.database), { code: "INVALID_DEMO_MANIFEST" });
    }
  });
  it("accepts explicit saved-source limitation without inventing a current check timestamp", () => {
    const result = validate(savedFixture("tcv_demo_review_20261020"), "tcv_demo_review_20261020");
    assert.equal(result.osmCheckedAt, null); assert.equal(result.locationLabel, SAVED_LABEL);
    assert.equal(result.pois[0].savedOsmSource.version, 5);
  });
  it("saved-source acceptance still requires consent, both evidence records and matching coordinates", () => {
    for (const mutate of [v => { v.locationEvidence.acceptedForBrowserDemo = false; }, v => { delete v.pois[1].savedOsmSource; },
      v => { v.pois[0].latitude += 1; }, v => { v.osmCheckedAt = "2026-10-20T12:00:00Z"; }, v => { v.pois[0].savedOsmSource.url = "https://example.invalid"; }]) {
      const value = savedFixture("tcv_demo_review_20261020"); mutate(value);
      assert.throws(() => validate(value, value.database), { code: "INVALID_DEMO_MANIFEST" });
    }
  });
  it("packaged approved data has traceable saved OSM records and uses no new source timestamp", () => {
    const input = require("../../data/demo/draft03.json"), result = validate(input, "tcv_demo_review_20261020");
    assert.equal(result.osmCheckedAt, null);
    assert.deepEqual(result.pois.map(poi => [poi.savedOsmSource.nodeId, poi.savedOsmSource.version]), [["6045633938", 5], ["6045634869", 3]]);
    assert.deepEqual(result.pois.map(poi => poi.text.vi.name), ["Hươu cao cổ", "Voi châu Á"]);
  });
});
if (process.env.RUN_DB_TESTS === "1") describe("Insert-only demo seed on isolated MySQL; synthetic TEST ONLY content", { timeout: 120000 }, () => {
  let admin;
  const pools = [], servers = [], redisPrefix = "tcv-seed-test:" + randomUUID() + ":";
  const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
  before(async () => { admin = await require("mysql2/promise").createConnection(config); });
  after(async () => {
    for (const server of servers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    for (const pool of pools) await pool.end();
    await admin?.end(); // Preserve all isolated fixture databases and evidence.
  });
  async function setup() {
    const name = "tcv_seed_test_" + randomUUID().replaceAll("-", "");
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    const db = require("../config/utc-pool")(require("mysql2/promise").createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 12 })); pools.push(db);
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const schema = new (require("../stores/schema.store"))(db); await schema.migrateContentJobClaim(); await schema.migrateContentJobLease();
    const store = new DemoSeedStore(db); return { name, db, store, input: fixture(name), service: new DemoSeedService(store) };
  }
  async function counts(db) {
    const result = {};
    for (const table of ["POIS", "POI_TRANSLATIONS", "CONTENT_JOBS", "AUDIOS", "TOURS", "TOUR_POIS", "AUDIT_LOGS"]) result[table] = Number((await db.query("SELECT COUNT(*) AS n FROM " + table))[0][0].n);
    return result;
  }
  it("inserts two ACTIVE POIs, four reviewed texts/jobs and ordered tour; leaves audio unpublished", async () => {
    const f = await setup(), result = await f.service.seed(f.input, f.name);
    assert.equal(result.status, "CREATED");
    assert.deepEqual(await counts(f.db), { POIS: 2, POI_TRANSLATIONS: 4, CONTENT_JOBS: 4, AUDIOS: 0, TOURS: 1, TOUR_POIS: 2, AUDIT_LOGS: 1 });
    assert.equal((await f.db.query("SELECT COUNT(*) AS n FROM POIS WHERE status='ACTIVE' AND content_version=1 AND conservation_status IS NULL AND activity_hours IS NULL AND avatar_url IS NULL"))[0][0].n, 2);
    assert.deepEqual((await f.db.query("SELECT poi_id FROM TOUR_POIS ORDER BY sequence_no"))[0].map(row => row.poi_id), result.poiIds);
  });
  it("repeat and JSON key reorder leave every record/version/job untouched", async () => {
    const f = await setup(), first = await f.service.seed(f.input, f.name), before = await counts(f.db);
    const again = await f.service.seed(Object.fromEntries(Object.entries(f.input).reverse()), f.name);
    assert.equal(again.status, "UNCHANGED"); assert.deepEqual(again.poiIds, first.poiIds); assert.deepEqual(await counts(f.db), before);
  });
  it("accepted saved-source dataset repeats UNCHANGED without weakening target or conflict guards", async () => {
    const f = await setup(), input = savedFixture(f.name);
    assert.equal((await f.service.seed(input, f.name)).status, "CREATED");
    const before = await counts(f.db); assert.equal((await f.service.seed(input, f.name)).status, "UNCHANGED"); assert.deepEqual(await counts(f.db), before);
    input.pois[0].text.en.description += " changed";
    await assert.rejects(f.service.seed(input, f.name), { code: "DEMO_SEED_CONFLICT" });
    await assert.rejects(f.service.seed(savedFixture("old_db"), "old_db"), { code: "INVALID_DEMO_MANIFEST" });
  });
  it("ten simultaneous seed calls commit one dataset and audit marker", async () => {
    const f = await setup(), results = await Promise.all(Array.from({ length: 10 }, () => f.service.seed(f.input, f.name)));
    assert.equal(results.filter(row => row.status === "CREATED").length, 1); assert.equal((await counts(f.db)).POIS, 2); assert.equal((await counts(f.db)).AUDIT_LOGS, 1);
  });
  it("changed manifest is refused without overwriting existing approved text", async () => {
    const f = await setup(); await f.service.seed(f.input, f.name); const before = await counts(f.db);
    f.input.pois[0].text.en.description = "changed";
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_CONFLICT" }); assert.deepEqual(await counts(f.db), before);
    assert.equal((await f.db.query("SELECT description FROM POI_TRANSLATIONS WHERE language_code='en' ORDER BY poi_id LIMIT 1"))[0][0].description, "TEST ONLY description en");
  });
  it("unowned name collision preserves the old POI and imports nothing", async () => {
    const f = await setup(); await f.db.query("INSERT INTO POIS(name, latitude, longitude) VALUES (?, 0, 0)", [f.input.pois[0].text.vi.name]);
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_CONFLICT" });
    assert.deepEqual(await counts(f.db), { POIS: 1, POI_TRANSLATIONS: 0, CONTENT_JOBS: 0, AUDIOS: 0, TOURS: 0, TOUR_POIS: 0, AUDIT_LOGS: 0 });
  });
  it("unowned differently named content also stops import into a nonempty demo DB", async () => {
    const f = await setup(); await f.db.query("INSERT INTO POIS(name, latitude, longitude) VALUES ('TEST ONLY old renamed data', 0, 0)");
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_CONFLICT" });
    assert.equal((await counts(f.db)).POIS, 1); assert.equal((await counts(f.db)).AUDIT_LOGS, 0);
  });
  it("audit failure rolls back POIs/text/jobs/tour together", async () => {
    const f = await setup(); f.store.audit.create = async () => { throw new Error("private SQL detail"); };
    await assert.rejects(f.service.seed(f.input, f.name), error => error.code === "DEMO_SEED_UNAVAILABLE" && !error.message.includes("private"));
    assert.equal(Object.values(await counts(f.db)).reduce((sum, value) => sum + value, 0), 0);
  });
  it("wrong physical database is refused before write", async () => {
    const f = await setup(), other = "tcv_seed_test_" + randomUUID().replaceAll("-", "");
    await assert.rejects(f.service.seed(fixture(other), other), { code: "DEMO_SEED_UNAVAILABLE" }); assert.equal((await counts(f.db)).POIS, 0);
  });
  it("a competing operator lock has a finite wait and imports nothing", async () => {
    const f = await setup(), connection = await f.db.getConnection();
    const lock = require("node:crypto").createHash("sha256").update(f.name + ":TCV_DEMO_POIS_V1").digest("hex");
    try {
      await connection.query("SELECT GET_LOCK(?, 0)", [lock]);
      await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_UNAVAILABLE" });
      assert.equal((await counts(f.db)).POIS, 0);
    } finally { await connection.query("SELECT RELEASE_LOCK(?)", [lock]); connection.release(); }
    assert.equal((await f.service.seed(f.input, f.name)).status, "CREATED");
  });
  it("disabled English blocks import without silently altering language configuration", async () => {
    const f = await setup(); await f.db.query("UPDATE LANGUAGES SET is_active=0 WHERE code='en'");
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_LANGUAGES_UNAVAILABLE" }); assert.equal((await counts(f.db)).POIS, 0);
    assert.equal((await f.db.query("SELECT is_active FROM LANGUAGES WHERE code='en'"))[0][0].is_active, 0);
  });
  it("manual edit or lost ownership marker stops reconciliation instead of duplicating", async () => {
    const f = await setup(); await f.service.seed(f.input, f.name);
    await f.db.query("UPDATE POI_TRANSLATIONS SET description='manual edit' WHERE language_code='en'");
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_CONFLICT" });
    await f.db.query("UPDATE AUDIT_LOGS SET action='TEST_ONLY_HIDDEN_MARKER'");
    await assert.rejects(f.service.seed(f.input, f.name), { code: "DEMO_SEED_CONFLICT" }); assert.equal((await counts(f.db)).POIS, 2);
  });
  it("lost commit acknowledgement is recoverable by rereading the committed marker", async () => {
    const f = await setup(); let once = true;
    const wrapped = { getConnection: async () => {
      const connection = await f.db.getConnection(); return new Proxy(connection, { get(target, key) {
        if (key === "commit") return async () => { await target.commit(); if (once) { once = false; throw new Error("lost commit reply"); } };
        return typeof target[key] === "function" ? target[key].bind(target) : target[key];
      } });
    } };
    await assert.rejects(new DemoSeedService(new DemoSeedStore(wrapped)).seed(f.input, f.name), { code: "DEMO_SEED_UNAVAILABLE" });
    assert.equal((await f.service.seed(f.input, f.name)).status, "UNCHANGED"); assert.equal((await counts(f.db)).AUDIT_LOGS, 1);
  });
  it("lost lock acknowledgement discards the session so retry can acquire the lock", async () => {
    const f = await setup(); let destroyed = false;
    const wrapped = { getConnection: async () => {
      const connection = await f.db.getConnection(); return new Proxy(connection, { get(target, key) {
        if (key === "query") return async (...args) => { const result = await target.query(...args); if (String(args[0]).includes("GET_LOCK")) throw new Error("lost lock reply"); return result; };
        if (key === "destroy") return () => { destroyed = true; target.destroy(); };
        return typeof target[key] === "function" ? target[key].bind(target) : target[key];
      } });
    } };
    await assert.rejects(new DemoSeedService(new DemoSeedStore(wrapped)).seed(f.input, f.name), { code: "DEMO_SEED_UNAVAILABLE" });
    assert.equal(destroyed, true); assert.equal((await f.service.seed(f.input, f.name)).status, "CREATED");
  });
  it("unknown BEGIN acknowledgement rolls back before releasing the connection", async () => {
    const f = await setup(); let rollbacks = 0;
    const wrapped = { getConnection: async () => {
      const connection = await f.db.getConnection(); return new Proxy(connection, { get(target, key) {
        if (key === "beginTransaction") return async () => { await target.beginTransaction(); throw new Error("lost begin reply"); };
        if (key === "rollback") return async () => { rollbacks++; return target.rollback(); };
        return typeof target[key] === "function" ? target[key].bind(target) : target[key];
      } });
    } };
    await assert.rejects(new DemoSeedService(new DemoSeedStore(wrapped)).seed(f.input, f.name), { code: "DEMO_SEED_UNAVAILABLE" });
    assert.equal(rollbacks, 1); assert.equal((await f.service.seed(f.input, f.name)).status, "CREATED");
  });
  it("worker preserves reviewed VI/EN; publishes real WAVs then online HTTP -> token -> bundle -> protected audio and denials", async () => {
    const f = await setup(), seeded = await f.service.seed(f.input, f.name), root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-seed-test-media-"));
    const LocalMedia = require("../adapters/local-media"), MockTts = require("../adapters/mock-tts"), MockTranslation = require("../adapters/mock-translation");
    let translationCalls = 0;
    const translator = new MockTranslation(); translator.translate = async () => { translationCalls++; throw new Error("must reuse reviewed EN"); };
    const { PipelineService } = require("../services/pipeline.service"), { ContentWorker } = require("../workers/content-worker");
    const pipeline = new PipelineService(new (require("../stores/content_job.store"))(f.db), { translator, tts: new MockTts(), mediaStorage: new LocalMedia({ root }) });
    let completed = 0;
    const worker = new ContentWorker(pipeline, { concurrency: 2, pollMs: 100, report: event => { if (event.outcome === "COMPLETED" && ++completed === 4) worker.stop(); } });
    const deadline = setTimeout(() => worker.stop(), 20000); try { await worker.run(); } finally { clearTimeout(deadline); }
    assert.equal(completed, 4); assert.equal(translationCalls, 0); assert.equal((await f.service.seed(f.input, f.name)).status, "UNCHANGED");
    const [texts] = await f.db.query("SELECT name, description, audio_script FROM POI_TRANSLATIONS ORDER BY poi_id, language_code DESC");
    assert.deepEqual(texts, f.input.pois.flatMap(poi => ["vi", "en"].map(language => ({ name: poi.text[language].name, description: poi.text[language].description, audio_script: poi.text[language].audioScript }))));
    const [audios] = await f.db.query("SELECT file_url, file_size, duration, status FROM AUDIOS");
    assert.equal(audios.length, 4);
    for (const audio of audios) { const bytes = await new LocalMedia({ root }).get(audio.file_url.split("/").at(-1)); assert.equal(audio.status, "AVAILABLE"); assert.deepEqual(require("../utils/pcm-wav").inspectWav(bytes), { duration: audio.duration, fileSize: audio.file_size, contentType: "audio/wav" }); }
    const gateway = new (require("../adapters/mock-gateway"))({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => "seed-test-only-webhook-at-least-32-bytes" });
    let redis;
    if (process.env.RUN_REDIS_TESTS === "1") {
      const store = new (require("../stores/redis.store"))({ onlineCodePrefix: redisPrefix + "online:" });
      redis = Object.fromEntries(["ensureOnlineCode", "inspectOnlineCode", "removeOnlineCode"].map(key => [key, store[key].bind(store)]));
      redis.consumeLookup = (keys, options) => store.consumeLookup(keys.map(key => redisPrefix + key), options);
    } else redis = require("./helpers/online-checkout.fixture").memoryOnlineRedis().redis;
    const payment = new (require("../services/payment.service").PaymentService)(new (require("../stores/payment.store"))(f.db), redis, { gateway, price: () => "50000.00" });
    const contentStore = new (require("../stores/content.store"))(f.db);
    const server = http.createServer(require("../server").createApp({ paymentService: payment, contentService: new (require("../services/content.service").ContentService)(contentStore),
      mediaService: new (require("../services/media.service").MediaService)(contentStore, new LocalMedia({ root })) })); servers.push(server);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const base = "http://127.0.0.1:" + server.address().port;
    async function request(url, { method = "GET", body, token, headers = {} } = {}) {
      const response = await fetch(base + url, { method, headers: { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
      return { status: response.status, response };
    }
    const checkout = await request("/api/payments/online-checkout", { method: "POST", body: {}, headers: { "Idempotency-Key": randomUUID() } }); assert.equal(checkout.status, 201);
    const data = (await checkout.response.json()).data, exchangeUrl = `/api/payments/sessions/${data.sessionId}/exchange-online-code`;
    assert.equal((await request(exchangeUrl, { method: "POST", body: { authCode: data.authCode } })).status, 409);
    const event = gateway.createWebhook({ paymentRef: data.paymentRef, amount: data.amount, currency: data.currency, status: "SUCCESS" });
    assert.equal((await request("/api/payments/webhooks/mock", { method: "POST", body: event.body, headers: { "X-Mock-Signature": "bad" } })).status, 401);
    assert.equal((await request("/api/payments/webhooks/mock", { method: "POST", body: event.body, headers: { "X-Mock-Signature": event.signature } })).status, 200);
    const grant = await request(exchangeUrl, { method: "POST", body: { authCode: data.authCode } }); assert.equal(grant.status, 200); const guest = (await grant.response.json()).data;
    assert.equal((await request(exchangeUrl, { method: "POST", body: { authCode: data.authCode } })).status, 409);
    const result = await request("/api/content/bundle?languageCode=en", { token: guest.token }); assert.equal(result.status, 200); const bundle = (await result.response.json()).data;
    assert.deepEqual(bundle.tours[0].items.map(item => item.poiId), seeded.poiIds); assert.equal(bundle.pois.length, 2);
    for (const poi of bundle.pois) { assert.equal(poi.text.languageCode, "en"); assert.equal(poi.text.isFallback, false); assert.equal(poi.audio.status, "AVAILABLE"); }
    const audioUrl = bundle.pois[0].audio.url;
    assert.equal((await request(audioUrl, { token: guest.token })).status, 200);
    const staffJwt = require("jsonwebtoken").sign({ userId: 1, role: "STAFF", sessionId: randomUUID() }, process.env.JWT_SECRET,
      { issuer: "food-tour-api", audience: "food-tour-client", expiresIn: "1h" });
    for (const token of [undefined, "invalid-guest-token", staffJwt]) {
      assert.equal((await request("/api/content/bundle?languageCode=en", { token })).status, 401);
      assert.equal((await request(audioUrl, { token })).status, 401);
    }
    assert.equal((await request("/api/admin/pois", { token: guest.token })).status, 401);
    for (const update of ["UPDATE PAYMENTS SET status='PENDING' WHERE session_id=?", "UPDATE VISIT_SESSIONS SET status='REVOKED' WHERE session_id=?", "UPDATE VISIT_SESSIONS SET status='ACTIVE', expires_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE session_id=?"]) {
      await f.db.query(update, [data.sessionId]);
      assert.equal((await request("/api/content/bundle?languageCode=en", { token: guest.token })).status, 401);
      assert.equal((await request(audioUrl, { token: guest.token })).status, 401);
      await f.db.query("UPDATE PAYMENTS SET status='PAID' WHERE session_id=?", [data.sessionId]);
    }
  });
});
