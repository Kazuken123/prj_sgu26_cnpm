const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), http = require("node:http");
const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { randomUUID } = require("node:crypto");
const ContentStore = require("../stores/content.store"), PaymentStore = require("../stores/payment.store"), RedisStore = require("../stores/redis.store");
const { ContentService } = require("../services/content.service"), { PaymentService } = require("../services/payment.service");
const { PoiService } = require("../services/poi.service"), PoiStore = require("../stores/poi.store");
const { PipelineService } = require("../services/pipeline.service"), ContentJobStore = require("../stores/content_job.store");
const LocalMedia = require("../adapters/local-media"), MockTranslation = require("../adapters/mock-translation"), MockTts = require("../adapters/mock-tts");
const { MediaService } = require("../services/media.service"), MockGateway = require("../adapters/mock-gateway");
const utcPool = require("../config/utc-pool");
const realRedis = process.env.RUN_REDIS_TESTS === "1";
if (process.env.RUN_DB_TESTS === "1") describe("Guest bundle with MySQL snapshot/access logs and " + (realRedis ? "real Redis" : "Redis replacement"), { timeout: 120000 }, () => {
  let admin, db, auth, actor, pois, payment, gateway, root, server, base, content, afterAuth = async () => {};
  const name = "tcv_bundle_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_bundle_test:" + randomUUID() + ":";
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config); assert.match(name, /^tcv_bundle_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 12 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const SchemaStore = require("../stores/schema.store"); await new SchemaStore(db).migrateContentJobClaim(); await new SchemaStore(db).migrateContentJobLease();
    await db.query("INSERT INTO LANGUAGES (code, name, is_active) VALUES ('fr', 'Français', 1), ('de', 'Deutsch', 0)");
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), RefreshStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshStore(db) });
    const user = await auth.bootstrapAdmin({ email: "bundle-admin@example.invalid", password: "BundleTestPassword123" });
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" }; pois = new PoiService(new PoiStore(db));
    let redis;
    if (realRedis) {
      const store = new RedisStore({ cashCodePrefix: prefix + "cash:", onlineCodePrefix: prefix + "online:" });
      redis = Object.fromEntries(["ensureCashCode", "inspectCashCode", "removeCashCode", "ensureOnlineCode", "inspectOnlineCode", "removeOnlineCode"].map(key => [key, store[key].bind(store)]));
      redis.consumeLookup = (keys, options) => store.consumeLookup(keys.map(key => prefix + key), options);
    } else redis = { ...require("./helpers/cash-exchange.fixture").memoryCashRedis().redis, ...require("./helpers/online-checkout.fixture").memoryOnlineRedis().redis };
    gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => "bundle-webhook-test-only-at-least-32-bytes" });
    payment = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00" }); content = new ContentService(new ContentStore(db));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-bundle-sql-"));
    const { createApp } = require("../server");
    const paymentProxy = new Proxy(payment, { get(target, key) {
      if (key === "authenticateVisitor") return async token => { const visit = await target.authenticateVisitor(token); await afterAuth(visit); return visit; };
      return typeof target[key] === "function" ? target[key].bind(target) : target[key];
    } });
    server = http.createServer(createApp({ authService: auth, paymentService: paymentProxy,
      contentService: { getBundle: (...args) => content.getBundle(...args) }, mediaService: new MediaService(new ContentStore(db), new LocalMedia({ root })) }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end(); if (admin) await admin.end(); // Keep the isolated DB for evidence, never delete acceptance data.
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-bundle-sql-")) await fs.rm(root, { recursive: true, force: true });
  });
  async function request(url, { token, method = "GET", body, headers = {} } = {}) {
    if (token) headers = { ...headers, Authorization: "Bearer " + token };
    const response = await fetch(base + url, { method, headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    const json = await response.json(); return { response, json, data: json.data };
  }
  async function guest() {
    const sessionId = (await payment.initialize({ paymentMethod: "CASH" }, randomUUID())).data.sessionId;
    await payment.confirmCash(actor, sessionId); const code = await payment.issueCashCode(actor, sessionId);
    return { sessionId, ...await payment.exchangeCashCode(sessionId, { shortedCode: code.shortedCode }, "192.0.2.177") };
  }
  async function logs(sessionId) { const [rows] = await db.query("SELECT language_code FROM BUNDLE_ACCESS_LOGS WHERE session_id = ? ORDER BY access_id", [sessionId]); return rows; }
  const bundle = (g, languageCode = "en") => request("/api/content/bundle?languageCode=" + languageCode, { token: g.token });
  async function poi(status = "ACTIVE") { return (await pois.save(actor, null, { name: "Bundle fixture " + randomUUID(), category: "PLANT", description: "Nội dung thử",
    audioScript: "Kịch bản thử", latitude: 10.78, longitude: 106.70, status })).poiId; }
  async function prepare(poiId) {
    const pipeline = new PipelineService(new ContentJobStore(db), { translator: new MockTranslation(), tts: new MockTts(), mediaStorage: new LocalMedia({ root }) });
    const [jobs] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id = ? AND language_code IN ('vi','en') ORDER BY job_id", [poiId]);
    for (const job of jobs) assert.equal((await pipeline.runJob(job.job_id)).completed, true);
  }
  function instrument(hook, commitHook) {
    const wrapped = { ...db, getConnection: async () => {
      const connection = await db.getConnection();
      return new Proxy(connection, { get(target, key) {
        if (key === "query") return async (...args) => { await hook(args[0], target); return target.query(...args); };
        if (key === "commit" && commitHook) return () => commitHook(target);
        return typeof target[key] === "function" ? target[key].bind(target) : target[key];
      } });
    } };
    return new ContentService(new ContentStore(wrapped));
  }
  it("valid CASH visitor receives an empty real bundle with original expiry, no-store and one access log", async () => {
    const g = await guest(), result = await bundle(g); assert.equal(result.response.status, 200); assert.deepEqual(result.data.pois, []); assert.deepEqual(result.data.tours, []);
    assert.equal(result.data.expiresAt, g.expiresAt.toISOString()); assert.equal(result.response.headers.get("cache-control"), "no-store"); assert.equal(result.response.headers.get("etag"), null);
    assert.deepEqual(await logs(g.sessionId), [{ language_code: "en" }]);
  });
  it("HTTP MockGateway checkout -> signed webhook -> token -> bundle -> authenticated WAV works without exposing secrets", async () => {
    const id = await poi(); await prepare(id);
    const checkout = await request("/api/payments/online-checkout", { method: "POST", body: {}, headers: { "Idempotency-Key": randomUUID() } }); assert.equal(checkout.response.status, 201);
    const event = gateway.createWebhook({ paymentRef: checkout.data.paymentRef, amount: checkout.data.amount, currency: checkout.data.currency, status: "SUCCESS" });
    assert.equal((await request("/api/payments/webhooks/mock", { method: "POST", body: event.body, headers: { "X-Mock-Signature": event.signature } })).response.status, 200);
    const granted = await request(`/api/payments/sessions/${checkout.data.sessionId}/exchange-online-code`, { method: "POST", body: { authCode: checkout.data.authCode } }); assert.equal(granted.response.status, 200);
    const result = await bundle(granted.data), selected = result.data.pois.find(row => row.poiId === id); assert.equal(result.response.status, 200); assert.equal(selected.audio.mimeType, "audio/wav");
    const audio = await fetch(base + selected.audio.url, { headers: { Authorization: "Bearer " + granted.data.token }, signal: AbortSignal.timeout(10000) }); assert.equal(audio.status, 200);
    const bytes = Buffer.from(await audio.arrayBuffer()); assert.equal(bytes.length, 32044); assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal((await fetch(base + selected.audio.url)).status, 401);
    const encoded = JSON.stringify(result.data); for (const value of [granted.data.token, checkout.data.authCode, checkout.data.paymentRef, "tokenHash", "claimId", root]) assert.equal(encoded.includes(value), false);
    assert.deepEqual(await logs(checkout.data.sessionId), [{ language_code: "en" }]);
  });
  it("fallback uses current READY text/audio independently and excludes an inactive fallback language", async () => {
    const id = await poi(); await prepare(id); const g = await guest();
    await db.query("UPDATE AUDIOS a JOIN POI_TRANSLATIONS t USING (translation_id) SET a.status = 'FAILED' WHERE t.poi_id = ? AND t.language_code = 'en'", [id]);
    let selected = (await bundle(g, "fr")).data.pois.find(row => row.poiId === id); assert.equal(selected.text.languageCode, "en"); assert.equal(selected.audio.languageCode, "vi"); assert.equal(selected.audio.isFallback, true);
    await db.query("UPDATE LANGUAGES SET is_active = 0 WHERE code = 'en'");
    try { selected = (await bundle(g, "fr")).data.pois.find(row => row.poiId === id); assert.equal(selected.text.languageCode, "vi"); }
    finally { await db.query("UPDATE LANGUAGES SET is_active = 1 WHERE code = 'en'"); }
    await db.query("UPDATE POIS SET content_version = content_version + 1 WHERE poi_id = ?", [id]);
    selected = (await bundle(g, "fr")).data.pois.find(row => row.poiId === id); assert.equal(selected.text.status, "UNAVAILABLE"); assert.equal(selected.audio.url, null);
    assert.ok((await logs(g.sessionId)).every(row => row.language_code === "fr"));
  });
  it("tours preserve relative order/gaps, drop inactive POIs and empty tours but retain points with unavailable content", async () => {
    const inactive = await poi("INACTIVE"), first = await poi(), missing = await poi();
    const [tour] = await db.query("INSERT INTO TOURS (name) VALUES ('Shared tour label')"), [empty] = await db.query("INSERT INTO TOURS (name) VALUES ('Empty tour')");
    await db.query("INSERT INTO TOUR_POIS (tour_id, poi_id, sequence_no) VALUES (?, ?, 1), (?, ?, 3), (?, ?, 4), (?, ?, 1)",
      [tour.insertId, inactive, tour.insertId, first, tour.insertId, missing, empty.insertId, inactive]);
    const result = await bundle(await guest()), selected = result.data.tours.find(row => row.tourId === tour.insertId);
    assert.deepEqual(selected.items, [{ poiId: first, sequenceNo: 3 }, { poiId: missing, sequenceNo: 4 }]); assert.equal(selected.localization, "SHARED");
    assert.equal(result.data.tours.some(row => row.tourId === empty.insertId), false); assert.equal(result.data.pois.some(row => row.poiId === inactive), false);
    assert.equal(result.data.pois.find(row => row.poiId === missing).audio.status, "UNAVAILABLE");
  });
  it("invalid/expired/revoked/unpaid/internal tokens and query credentials do not grant bundles or access logs", async () => {
    const jwt = (await auth.login({ email: "bundle-admin@example.invalid", password: "BundleTestPassword123" })).accessToken;
    for (const token of [undefined, "wrong", "tcv_visit_" + "f".repeat(64), jwt]) assert.equal((await request("/api/content/bundle?languageCode=en", { token })).response.status, 401);
    for (const sql of ["UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", "UPDATE VISIT_SESSIONS SET expires_at = UTC_TIMESTAMP() WHERE session_id = ?", "UPDATE PAYMENTS SET status = 'PENDING' WHERE session_id = ?"]) {
      const g = await guest(); await db.query(sql, [g.sessionId]); assert.equal((await bundle(g)).response.status, 401); assert.equal((await logs(g.sessionId)).length, 0);
    }
    const g = await guest(); assert.equal((await request("/api/content/bundle?languageCode=en&token=" + g.token)).response.status, 401); assert.equal((await logs(g.sessionId)).length, 0);
  });
  it("invalid queries and unsupported/inactive languages return 400 without log writes", async () => {
    const g = await guest();
    for (const query of ["", "?languageCode=en&languageCode=vi", "?languageCode=en&page=1", "?languageCode=de", "?languageCode=zz", "?languageCode=%27%20OR%201%3D1"])
      assert.equal((await request("/api/content/bundle" + query, { token: g.token })).response.status, 400);
    assert.equal((await logs(g.sessionId)).length, 0);
  });
  it("revocation or token replacement after middleware is rejected by the transaction recheck", async () => {
    for (const change of ["status = 'REVOKED'", "token_hash = REPEAT('b', 64)"]) {
      const g = await guest(); afterAuth = async visit => { await db.query("UPDATE VISIT_SESSIONS SET " + change + " WHERE session_id = ?", [visit.sessionId]); };
      try { assert.equal((await bundle(g)).response.status, 401); assert.equal((await logs(g.sessionId)).length, 0); }
      finally { afterAuth = async () => {}; }
    }
  });
  it("expiry while building refuses the actual log INSERT and returns 401 without an access log", async () => {
    const g = await guest(); await db.query("UPDATE VISIT_SESSIONS SET expires_at = TIMESTAMPADD(SECOND, 2, UTC_TIMESTAMP(3)) WHERE session_id = ?", [g.sessionId]); let delayed = false;
    content = instrument(async sql => { if (!delayed && /FROM POIS WHERE status/.test(sql)) { delayed = true; await new Promise(resolve => setTimeout(resolve, 2100)); } });
    try { const result = await bundle(g); assert.equal(result.response.status, 401); assert.equal(result.json.code, "VISIT_SESSION_EXPIRED"); assert.equal(delayed, true); assert.equal((await logs(g.sessionId)).length, 0); }
    finally { content = new ContentService(new ContentStore(db)); }
  });
  it("a log write error rolls back and returns a fixed safe 503", async () => {
    const g = await guest(); content = instrument(async sql => { if (/INSERT INTO BUNDLE_ACCESS_LOGS/.test(sql)) throw new Error("private database password"); });
    try { const result = await bundle(g); assert.equal(result.response.status, 503); assert.equal(result.json.code, "BUNDLE_UNAVAILABLE"); assert.equal(JSON.stringify(result.json).includes("private"), false); assert.equal((await logs(g.sessionId)).length, 0); }
    finally { content = new ContentService(new ContentStore(db)); }
  });
  it("lost commit acknowledgement can leave one log despite 503; a new successful download is a separate access", async () => {
    const g = await guest(); content = instrument(async () => {}, async connection => { await connection.commit(); throw new Error("private lost acknowledgement"); });
    try { assert.equal((await bundle(g)).response.status, 503); assert.equal((await logs(g.sessionId)).length, 1); }
    finally { content = new ContentService(new ContentStore(db)); }
    assert.equal((await bundle(g)).response.status, 200); assert.equal((await logs(g.sessionId)).length, 2);
  });
  it("one consistent snapshot survives a source update committed between language and POI reads", async () => {
    const id = await poi(); await prepare(id); const g = await guest(); let changed = false;
    content = instrument(async (sql, connection) => {
      if (/SET TRANSACTION ISOLATION/.test(sql)) await connection.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
      if (!changed && /FROM POIS WHERE status/.test(sql)) { changed = true; await db.query("UPDATE POIS SET content_version = content_version + 1 WHERE poi_id = ?", [id]); }
    }, async connection => {
      await connection.commit(); const [settings] = await connection.query("SELECT @@transaction_isolation AS isolationLevel");
      await connection.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      assert.equal(settings[0].isolationLevel, "READ-COMMITTED"); // SET TRANSACTION did not change the session default.
    });
    try { const result = await bundle(g); assert.equal(changed, true); assert.equal(result.data.pois.find(row => row.poiId === id).text.status, "READY"); }
    finally { content = new ContentService(new ContentStore(db)); }
    assert.equal((await bundle(g)).data.pois.find(row => row.poiId === id).text.status, "UNAVAILABLE");
  });
  it("concurrent downloads produce one log each, canonicalize EN and never change payment, expiry or jobs", async () => {
    const g = await guest();
    const state = async () => { const [payments] = await db.query("SELECT * FROM PAYMENTS WHERE session_id = ?", [g.sessionId]); const [visits] = await db.query("SELECT * FROM VISIT_SESSIONS WHERE session_id = ?", [g.sessionId]); const [jobs] = await db.query("SELECT * FROM CONTENT_JOBS ORDER BY job_id"); return { payments, visits, jobs }; };
    const beforeState = await state(), results = await Promise.all(Array.from({ length: 8 }, () => bundle(g, "EN")));
    assert.ok(results.every(result => result.response.status === 200 && result.data.requestedLanguageCode === "en"));
    assert.equal((await logs(g.sessionId)).length, 8); assert.ok((await logs(g.sessionId)).every(row => row.language_code === "en")); assert.deepEqual(await state(), beforeState);
  });
  it("conditional GET still checks permission and returns a full 200 grant, never cached 304", async () => {
    const g = await guest(); const result = await request("/api/content/bundle?languageCode=en", { token: g.token, headers: { "If-None-Match": "*", "If-Modified-Since": "Wed, 01 Jan 2031 00:00:00 GMT" } });
    assert.equal(result.response.status, 200); assert.ok(Array.isArray(result.data.pois)); assert.equal(result.response.headers.get("etag"), null); assert.equal((await logs(g.sessionId)).length, 1);
    await db.query("UPDATE VISIT_SESSIONS SET status = 'REVOKED' WHERE session_id = ?", [g.sessionId]);
    assert.equal((await request("/api/content/bundle?languageCode=en", { token: g.token, headers: { "If-None-Match": "*" } })).response.status, 401); assert.equal((await logs(g.sessionId)).length, 1);
  });
});
