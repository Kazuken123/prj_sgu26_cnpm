// UC-15/UC-08 against real MySQL (disposable database) and, with RUN_REDIS_TESTS=1,
// real Redis. Authentication is real (AuthService JWT, cash-flow visitor token).
// Embedding/LLM are MOCK adapters: this checks transactions and wiring, not RAG quality.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict"), http = require("node:http");
const fs = require("node:fs/promises"), path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const KnowledgeStore = require("../stores/knowledge.store"), ChatStore = require("../stores/chat.store");
const PaymentStore = require("../stores/payment.store"), RedisStore = require("../stores/redis.store");
const { KnowledgeService } = require("../services/knowledge.service"), { ChatService } = require("../services/chat.service");
const { PaymentService } = require("../services/payment.service"), { getRagConfig } = require("../services/rag.config");
const MockEmbeddingAdapter = require("../adapters/mock-embedding"), MockChatModelAdapter = require("../adapters/mock-llm");
const MockGateway = require("../adapters/mock-gateway");
const { createKnowledgeRouter } = require("../routers/knowledge.router"), { createChatRouter } = require("../routers/chat.router");
const { createAuthRouter } = require("../routers/auth.router"), errorHandler = require("../middlewares/error.middleware");
const utcPool = require("../config/utc-pool");
const realRedis = process.env.RUN_REDIS_TESTS === "1";

if (process.env.RUN_DB_TESTS === "1") describe("Knowledge base and RAG chat with MySQL and " + (realRedis ? "real Redis" : "Redis replacement"), { timeout: 120000 }, () => {
  let admin, db, auth, actor, payment, server, base, adminToken, knowledge, embedding;
  const name = "tcv_knowledge_test_" + randomUUID().replaceAll("-", ""), prefix = "tcv_knowledge_test:" + randomUUID() + ":";
  const config = { ...getRagConfig({}), embeddingTimeoutMs: 2000, llmTimeoutMs: 2000, rate: { windowSeconds: 60, sessionLimit: 3, ipLimit: 1000 } };
  const credentials = { email: "knowledge-admin@example.invalid", password: "KnowledgeTestPassword123" };
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_knowledge_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 12 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), RefreshStore = require("../stores/refresh_token.store");
    // Test-only JWT settings, the same shape as the auth fixture; no real secret is read.
    const authConfig = { secret: "knowledge-test-only-secret-at-least-32-bytes", issuer: "food-tour-api", audience: "food-tour-client",
      accessTokenTtl: "1h", refreshTokenTtlMs: 86400000 };
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshStore(db), config: () => authConfig });
    const user = await auth.bootstrapAdmin(credentials);
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" };
    let redis;
    if (realRedis) {
      const store = new RedisStore({ cashCodePrefix: prefix + "cash:", onlineCodePrefix: prefix + "online:" });
      redis = Object.fromEntries(["ensureCashCode", "inspectCashCode", "removeCashCode", "ensureOnlineCode", "inspectOnlineCode", "removeOnlineCode"].map(key => [key, store[key].bind(store)]));
      redis.consumeLookup = (keys, options) => store.consumeLookup(keys.map(key => prefix + key), options);
    } else redis = { ...require("./helpers/cash-exchange.fixture").memoryCashRedis().redis, ...require("./helpers/online-checkout.fixture").memoryOnlineRedis().redis };
    const gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => "knowledge-webhook-test-only-at-least-32-bytes" });
    payment = new PaymentService(new PaymentStore(db), redis, { gateway, price: () => "50000.00" });
    embedding = new MockEmbeddingAdapter({ model: config.embeddingModel, dimensions: config.embeddingDimensions });
    knowledge = new KnowledgeService({ store: new KnowledgeStore(db), embedding, config });
    const chat = new ChatService({ store: new ChatStore(db), redis, embedding, llm: new MockChatModelAdapter(), config });
    // server.js is not changed by this package: mount the proposed routes on a test app with the shared parsers/error handler.
    const app = express(); app.use(express.json({ limit: "32kb" }));
    app.use("/api/auth", createAuthRouter(auth));
    app.use("/api/admin/knowledge-documents", createKnowledgeRouter(auth, knowledge));
    app.use("/api/chat", createChatRouter(payment, chat));
    app.use(errorHandler);
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    adminToken = (await (await request("/api/auth/login", { method: "POST", body: credentials })).json).data.accessToken;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_knowledge_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  async function request(url, { token, method = "GET", body } = {}) {
    const response = await fetch(base + url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return { response, json: await response.json() };
  }
  async function guest() {
    const sessionId = (await payment.initialize({ paymentMethod: "CASH" }, randomUUID())).data.sessionId;
    await payment.confirmCash(actor, sessionId); const code = await payment.issueCashCode(actor, sessionId);
    return { sessionId, ...await payment.exchangeCashCode(sessionId, { shortedCode: code.shortedCode }, "192.0.2." + (10 + Math.floor(Math.random() * 200))) };
  }
  const rows = async (sql, values = []) => (await db.query(sql, values))[0];
  const chunks = id => rows("SELECT source_version, embedding_model, embedding FROM KNOWLEDGE_CHUNKS WHERE document_id = ? ORDER BY chunk_id", [id]);
  const audits = id => rows("SELECT action FROM AUDIT_LOGS WHERE resource_type = 'KNOWLEDGE_DOCUMENTS' AND resource_id = ? ORDER BY log_id", [String(id)]);
  const doc = label => ({ title: "Hồ sơ " + label, content: `Tài liệu kiểm thử ${label}. Hươu cao cổ ăn lá cây keo. `.repeat(40), source: "Dữ liệu minh họa kiểm thử" });
  function blocking() {
    const gate = {}; gate.started = new Promise(resolve => { gate.markStarted = resolve; });
    return { gate, service: new KnowledgeService({ store: new KnowledgeStore(db), config, embedding: { embed: async (texts, options) => {
      gate.markStarted(); await new Promise(resolve => { gate.release = resolve; }); return embedding.embed(texts, options);
    } } }) };
  }
  async function trigger(table, condition, work) {
    await db.query(`CREATE TRIGGER kb_test_fail BEFORE INSERT ON ${table} FOR EACH ROW BEGIN IF ${condition} THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private test failure'; END IF; END`);
    try { return await work(); } finally { await db.query("DROP TRIGGER IF EXISTS kb_test_fail"); }
  }

  it("create commits phase 1, then publishes numeric embeddings of the current version with audits", async () => {
    const result = await knowledge.create(actor, doc("A"), { ipAddress: "192.0.2.1" });
    assert.equal(result.processing.result, "PUBLISHED"); assert.equal(result.document.processingStatus, "READY");
    const stored = await chunks(result.document.documentId);
    assert.ok(stored.length > 1); assert.equal(stored.length, result.document.chunkCount);
    for (const chunk of stored) {
      assert.equal(chunk.source_version, 1); assert.equal(chunk.embedding_model, config.embeddingModel);
      assert.equal(chunk.embedding.length, config.embeddingDimensions); assert.ok(chunk.embedding.every(Number.isFinite));
    }
    assert.deepEqual((await audits(result.document.documentId)).map(a => a.action), ["CREATE_KNOWLEDGE_DOCUMENT", "PUBLISH_KNOWLEDGE_DOCUMENT"]);
  });
  it("phase 1 audit failure rolls back the new document (E3)", async () => {
    const before = (await rows("SELECT COUNT(*) AS n FROM KNOWLEDGE_DOCUMENTS"))[0].n;
    await trigger("AUDIT_LOGS", "NEW.action = 'CREATE_KNOWLEDGE_DOCUMENT'", () => assert.rejects(knowledge.create(actor, doc("rollback"))));
    assert.equal((await rows("SELECT COUNT(*) AS n FROM KNOWLEDGE_DOCUMENTS"))[0].n, before);
  });
  it("a failing chunk row or publish audit rolls back the whole phase 2; reprocess then publishes once (E4)", async () => {
    for (const [table, condition] of [["KNOWLEDGE_CHUNKS", "NEW.chunk_text LIKE '%Hươu%'"], ["AUDIT_LOGS", "NEW.action = 'PUBLISH_KNOWLEDGE_DOCUMENT'"]]) {
      const result = await trigger(table, condition, () => knowledge.create(actor, doc("phase2 " + table)));
      const id = result.document.documentId;
      assert.equal(result.processing.result, "FAILED"); assert.equal(result.processing.code, "PUBLISH_FAILED");
      assert.equal(result.document.processingStatus, "FAILED"); assert.equal(result.document.status, "INACTIVE");
      assert.equal((await chunks(id)).length, 0);
      const retried = await knowledge.reprocess(actor, id);
      assert.equal(retried.processing.result, "PUBLISHED");
      const published = await chunks(id);
      assert.equal(published.length, retried.document.chunkCount);
      // Reprocessing an ACTIVE document that fails keeps the published set: the DELETE is rolled back too.
      const again = await trigger(table, condition, () => knowledge.reprocess(actor, id));
      assert.equal(again.processing.result, "FAILED"); assert.equal(again.document.status, "ACTIVE");
      assert.deepEqual(await chunks(id), published);
    }
  });
  it("an edit during embedding supersedes the stale result; only new-version chunks remain", async () => {
    const created = await knowledge.create(actor, doc("edit"));
    const id = created.document.documentId, { gate, service } = blocking();
    const stale = service.reprocess(actor, id);
    await gate.started;
    const edited = await knowledge.update(actor, id, { ...doc("edit v2"), expectedVersion: 1 });
    assert.equal(edited.processing.result, "PUBLISHED"); assert.equal(edited.document.contentVersion, 2);
    gate.release();
    assert.equal((await stale).processing.result, "SUPERSEDED");
    const stored = await chunks(id);
    assert.ok(stored.length && stored.every(chunk => chunk.source_version === 2));
  });
  it("deactivation during embedding cannot be undone by the in-flight result; reprocess is refused", async () => {
    const created = await knowledge.create(actor, doc("deactivate"));
    const id = created.document.documentId, { gate, service } = blocking();
    const stale = service.reprocess(actor, id);
    await gate.started;
    const off = await knowledge.deactivate(actor, id);
    assert.equal(off.processingStatus, "DEACTIVATED"); assert.equal(off.contentVersion, 2);
    gate.release();
    assert.equal((await stale).processing.result, "SUPERSEDED");
    assert.equal((await rows("SELECT status FROM KNOWLEDGE_DOCUMENTS WHERE document_id = ?", [id]))[0].status, "INACTIVE");
    await assert.rejects(knowledge.reprocess(actor, id), { code: "KNOWLEDGE_DOCUMENT_DEACTIVATED" });
  });
  it("concurrent stale edits yield one 409; concurrent reprocess never duplicates chunks", async () => {
    const created = await knowledge.create(actor, doc("concurrent"));
    const id = created.document.documentId;
    const outcomes = await Promise.allSettled(["X", "Y"].map(label => knowledge.update(actor, id, { ...doc(label), expectedVersion: 1 })));
    assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1);
    assert.equal(outcomes.find(o => o.status === "rejected").reason.code, "KNOWLEDGE_VERSION_CONFLICT");
    const expected = (await chunks(id)).length;
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => knowledge.reprocess(actor, id)));
    assert.ok(results.every(r => r.processing.result === "PUBLISHED"));
    assert.equal((await chunks(id)).length, expected);
  });
  it("retrieval excludes inactive documents, old versions and other embedding models", async () => {
    const created = await knowledge.create(actor, { title: "Cá sấu", content: "Cá sấu nước ngọt phơi nắng ven hồ.", source: null });
    const id = created.document.documentId, vector = JSON.stringify(embedding.vector("x"));
    await db.query("INSERT INTO KNOWLEDGE_CHUNKS (document_id, chunk_text, source_version, embedding, embedding_model) VALUES (?, 'old', 99, ?, ?), (?, 'other model', 1, ?, 'other-model')",
      [id, vector, config.embeddingModel, id, vector]);
    let candidates = (await new ChatStore(db).candidates(config.embeddingModel)).filter(c => c.documentId === id);
    assert.deepEqual(candidates.map(c => c.text), ["Cá sấu nước ngọt phơi nắng ven hồ."]);
    assert.ok(Array.isArray(candidates[0].embedding));
    await knowledge.deactivate(actor, id);
    candidates = (await new ChatStore(db).candidates(config.embeddingModel)).filter(c => c.documentId === id);
    assert.equal(candidates.length, 0);
  });
  it("HTTP: STAFF/ADMIN manage the knowledge base, a paid visitor asks, and CHAT_LOGS records the turn without tokens", async () => {
    const created = await request("/api/admin/knowledge-documents", { method: "POST", token: adminToken,
      body: { title: "Chim hồng hạc", content: "Chim hồng hạc có màu hồng nhờ sắc tố trong thức ăn như tôm nhỏ và tảo.", source: "https://example.invalid/hong-hac" } });
    assert.equal(created.response.status, 201);
    const docId = created.json.data.document.documentId;
    const visitor = await guest();
    const answer = await request("/api/chat/questions", { method: "POST", token: visitor.token, body: { question: "Vì sao chim hồng hạc có màu hồng?" } });
    assert.equal(answer.response.status, 200);
    assert.equal(answer.json.data.status, "SUCCESS"); assert.equal(answer.json.data.sources[0].documentId, docId);
    assert.equal(answer.json.data.sources[0].source, "https://example.invalid/hong-hac");
    const [log] = await rows("SELECT * FROM CHAT_LOGS WHERE session_id = ?", [visitor.sessionId]);
    assert.equal(log.status, "SUCCESS"); assert.equal(log.sources[0].documentId, docId);
    assert.ok(!JSON.stringify(log).includes(visitor.token) && !JSON.stringify(log).includes(adminToken));
    const outside = await request("/api/chat/questions", { method: "POST", token: visitor.token, body: { question: "Giá cổ phiếu hôm nay bao nhiêu?" } });
    assert.equal(outside.json.data.status, "NO_CONTEXT"); assert.deepEqual(outside.json.data.sources, []);
    // Credentials of one kind never substitute for the other (QT-01).
    assert.equal((await request("/api/admin/knowledge-documents", { token: visitor.token })).response.status, 401);
    assert.equal((await request("/api/chat/questions", { method: "POST", token: adminToken, body: { question: "Voi?" } })).response.status, 401);
    await request(`/api/admin/knowledge-documents/${docId}/deactivate`, { method: "POST", token: adminToken });
    const gone = await request("/api/chat/questions", { method: "POST", token: visitor.token, body: { question: "Vì sao chim hồng hạc có màu hồng?" } });
    assert.equal(gone.json.data.status, "NO_CONTEXT", "deactivated document is no longer retrieved");
    const limited = await request("/api/chat/questions", { method: "POST", token: visitor.token, body: { question: "Vì sao chim hồng hạc có màu hồng?" } });
    assert.equal(limited.response.status, 429, "fourth question in the window exceeds sessionLimit 3");
    const statuses = (await rows("SELECT status FROM CHAT_LOGS WHERE session_id = ? ORDER BY chat_log_id", [visitor.sessionId])).map(r => r.status);
    assert.deepEqual(statuses, ["SUCCESS", "NO_CONTEXT", "NO_CONTEXT"], "the rate-limited request is not logged");
  });
  it("HTTP: an expired visit is refused before any question is processed (E1)", async () => {
    const visitor = await guest();
    await db.query("UPDATE VISIT_SESSIONS SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE session_id = ?", [visitor.sessionId]);
    const result = await request("/api/chat/questions", { method: "POST", token: visitor.token, body: { question: "Voi?" } });
    assert.equal(result.response.status, 401); assert.equal(result.json.code, "VISIT_SESSION_EXPIRED");
    assert.equal((await rows("SELECT COUNT(*) AS n FROM CHAT_LOGS WHERE session_id = ?", [visitor.sessionId]))[0].n, 0);
  });
  it("unreachable Redis is a 503 and never disables the chat rate limit", async () => {
    const down = new RedisStore({ url: "redis://127.0.0.1:1" });
    const chat = new ChatService({ store: new ChatStore(db), redis: down, embedding, llm: new MockChatModelAdapter(), config });
    const visitor = await guest();
    await assert.rejects(chat.ask({ sessionId: visitor.sessionId }, { question: "Voi?" }, "192.0.2.5"), { status: 503, code: "CHAT_PROTECTION_UNAVAILABLE" });
  });
});
