// Unit/HTTP tests for UC-15 with an in-memory Store and MOCK embeddings.
// They check the flow and rules only; MySQL behaviour is in knowledge-rag.integration.test.js.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
process.env.NODE_ENV = "test";
const validation = require("../services/knowledge.validation");
const { KnowledgeService } = require("../services/knowledge.service");
const { LIFECYCLE } = require("../stores/knowledge.store");
const { chunkText, checkEmbeddings, withDeadline, ProviderError } = require("../services/rag-support");
const { getRagConfig } = require("../services/rag.config");
const MockEmbeddingAdapter = require("../adapters/mock-embedding");
const { createKnowledgeRouter } = require("../routers/knowledge.router");
const { createAuthRouter } = require("../routers/auth.router");
const errorHandler = require("../middlewares/error.middleware");
const { createFixture, staff } = require("./helpers/auth.fixture");

const config = { ...getRagConfig({}), embeddingDimensions: 32, embeddingTimeoutMs: 200 };
const staffUser = { user_id: 7, role: "STAFF", status: "ACTIVE" };
function memoryStore({ users = new Map([[7, staffUser]]) } = {}) {
  const state = { docs: new Map(), chunks: [], audits: [], nextId: 1, nextChunk: 1, failAudit: null, failChunks: false };
  let queue = Promise.resolve();
  const serial = work => {
    const result = queue.then(async () => {
      const before = structuredClone({ docs: state.docs, chunks: state.chunks, audits: state.audits });
      try { return await work(); } catch (error) { Object.assign(state, before); throw error; }
    });
    queue = result.catch(() => {});
    return result;
  };
  const audit = entry => {
    if (state.failAudit === entry.action) throw new Error("private audit failure");
    state.audits.push({ ...entry });
  };
  const latest = (id, actions) => state.audits.filter(a => a.resourceId === String(id) && actions.includes(a.action)).at(-1);
  const get = id => {
    const doc = state.docs.get(id);
    if (!doc) return undefined;
    const current = state.chunks.filter(c => c.documentId === id && c.sourceVersion === doc.contentVersion);
    const processing = latest(id, ["PUBLISH_KNOWLEDGE_DOCUMENT", "FAIL_KNOWLEDGE_PROCESSING"]);
    return structuredClone({ ...doc, chunkCount: current.length, embeddingModel: current[0]?.model ?? null,
      lifecycleAction: latest(id, LIFECYCLE)?.action ?? null, processingAction: processing?.action ?? null, processingDetails: processing?.details ?? null });
  };
  const store = {
    get: async id => get(id),
    list: async ({ page, limit }) => ({ items: [...state.docs.keys()].map(get), total: state.docs.size, page, limit }),
    mutate: (actorId, id, authorize, work) => serial(async () => {
      authorize(users.get(actorId));
      return work({ current: id === null ? undefined : get(id), persist: async (data, entry) => {
        const documentId = id ?? state.nextId++;
        state.docs.set(documentId, { documentId, title: data.title, content: data.content, source: data.source, status: data.status, contentVersion: data.contentVersion });
        audit({ ...entry, userId: actorId, resourceId: String(documentId) });
        return get(documentId);
      } });
    }),
    publish: (actorId, id, version, chunks, authorize, entry) => serial(async () => {
      authorize(users.get(actorId));
      const current = get(id);
      if (!current || current.contentVersion !== version || current.lifecycleAction === "DEACTIVATE_KNOWLEDGE_DOCUMENT") return { published: false, document: current };
      state.chunks = state.chunks.filter(c => c.documentId !== id);
      for (const chunk of chunks) {
        if (state.failChunks) throw new Error("private chunk failure");
        state.chunks.push({ chunkId: state.nextChunk++, documentId: id, sourceVersion: version, ...chunk });
      }
      state.docs.get(id).status = "ACTIVE";
      audit({ ...entry, userId: actorId, resourceId: String(id) });
      return { published: true, document: get(id) };
    }),
    recordFailure: async (actorId, id, entry) => audit({ ...entry, userId: actorId, resourceId: String(id) }),
  };
  return { store, state, users };
}
function blockingEmbedding() {
  const inner = new MockEmbeddingAdapter({ dimensions: 32 });
  const gate = {}; gate.started = new Promise(resolve => { gate.markStarted = resolve; });
  gate.release = null;
  return { gate, adapter: { embed: async (texts, options) => {
    gate.markStarted(); await new Promise(resolve => { gate.release = resolve; }); return inner.embed(texts, options);
  } } };
}
const doc = { title: "Voi châu Á", content: "Voi châu Á sống theo đàn. Voi ăn cỏ, lá cây và trái cây.", source: "Dữ liệu minh họa kiểm thử" };

describe("UC-15 validation, chunking and embedding checks", () => {
  it("requires title and content, bounds lengths, rejects unknown fields and needs expectedVersion on update", () => {
    assert.throws(() => validation.document({ content: "x" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "  ", content: "x" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "t", content: "" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "x".repeat(256), content: "x" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "t", content: "x".repeat(20001) }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "t", content: "x", source: 5 }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "t", content: "x", status: "ACTIVE" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document({ title: "t", content: "x" }, true), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.document([], false), { code: "VALIDATION_ERROR" });
    assert.deepEqual(validation.document({ title: " t ", content: " c " }), { title: "t", content: "c", source: null });
    assert.equal(validation.document({ title: "t", content: "c", expectedVersion: 3 }, true).expectedVersion, 3);
    assert.throws(() => validation.id("1 OR 1=1"), { code: "VALIDATION_ERROR" });
    assert.throws(() => validation.filters({ status: "DELETED" }), { code: "VALIDATION_ERROR" });
  });
  it("chunks with bounded size and overlap, never starting mid-word", () => {
    const text = Array.from({ length: 300 }, (_, i) => "từ" + i).join(" ");
    const chunks = chunkText(text, { chunkSize: 200, chunkOverlap: 40 });
    assert.ok(chunks.length > 5);
    for (const chunk of chunks) { assert.ok(chunk.length <= 200); assert.match(chunk, /^từ\d+/); }
    for (let i = 1; i < chunks.length; i++) assert.ok(chunks[i - 1].includes(chunks[i].split(" ")[0]), "consecutive chunks overlap");
    assert.deepEqual(chunkText("   ", { chunkSize: 200, chunkOverlap: 40 }), []);
  });
  it("rejects provider vectors with non-finite values, wrong size, wrong count or another model", async () => {
    for (const mode of ["nan", "short", "missing", "wrong-model"]) {
      const reply = await new MockEmbeddingAdapter({ dimensions: 32, mode }).embed(["a", "b"]);
      assert.throws(() => checkEmbeddings(reply, 2, config), ProviderError, mode);
    }
    assert.throws(() => checkEmbeddings({ model: config.embeddingModel, vectors: [new Array(32).fill(0)] }, 1, config), { code: "EMBEDDING_INVALID_VECTOR" });
    assert.throws(() => checkEmbeddings({ model: config.embeddingModel, vectors: [Array(32).fill("1")] }, 1, config), { code: "EMBEDDING_INVALID_VECTOR" });
    const ok = await new MockEmbeddingAdapter({ dimensions: 32 }).embed(["a"]);
    assert.equal(checkEmbeddings(ok, 1, config).length, 1);
  });
  it("bounds a provider that never answers", async () => {
    const started = Date.now();
    await assert.rejects(withDeadline(50, () => new Promise(() => {})), { code: "PROVIDER_TIMEOUT" });
    assert.ok(Date.now() - started < 1000);
  });
  it("rejects invalid RAG configuration instead of guessing", () => {
    assert.throws(() => getRagConfig({ RAG_PROVIDER: "OPENAI" }), /RAG_PROVIDER/);
    assert.throws(() => getRagConfig({ RAG_CHUNK_OVERLAP: "500", RAG_CHUNK_SIZE: "800" }), /RAG_CHUNK_OVERLAP/);
    assert.throws(() => getRagConfig({ CHAT_RATE_SESSION_LIMIT: "0" }), /CHAT_RATE_SESSION_LIMIT/);
  });
});

describe("UC-15 service flow with in-memory Store and MOCK embeddings", () => {
  const actor = { userId: 7, role: "STAFF", status: "ACTIVE" };
  const make = (embedding = new MockEmbeddingAdapter({ dimensions: 32 })) => {
    const memory = memoryStore();
    return { ...memory, service: new KnowledgeService({ store: memory.store, embedding, config }) };
  };
  it("create audits phase 1, chunks, embeds and publishes the version as ACTIVE", async () => {
    const { service, state } = make();
    const result = await service.create(actor, doc, { ipAddress: "192.0.2.1" });
    assert.equal(result.processing.result, "PUBLISHED");
    assert.equal(result.document.status, "ACTIVE"); assert.equal(result.document.processingStatus, "READY");
    assert.equal(result.document.contentVersion, 1); assert.ok(result.document.chunkCount >= 1);
    assert.deepEqual(state.audits.map(a => a.action), ["CREATE_KNOWLEDGE_DOCUMENT", "PUBLISH_KNOWLEDGE_DOCUMENT"]);
    assert.ok(state.chunks.every(c => c.sourceVersion === 1 && c.model === config.embeddingModel && c.embedding.length === 32));
  });
  it("only ACTIVE STAFF/ADMIN may manage documents; the Store re-checks the stored account", async () => {
    const { service, users, state } = make();
    await assert.rejects(service.create({ userId: 7, role: "VISITOR", status: "ACTIVE" }, doc), { status: 403 });
    await assert.rejects(service.create({ role: "STAFF", status: "ACTIVE" }, doc), { status: 401 });
    users.set(7, { ...staffUser, status: "LOCKED" });
    await assert.rejects(service.create(actor, doc), { status: 403 });
    assert.equal(state.docs.size, 0);
  });
  it("phase 1 audit failure rolls back the document (UC-15 E3)", async () => {
    const { service, state } = make(); state.failAudit = "CREATE_KNOWLEDGE_DOCUMENT";
    await assert.rejects(service.create(actor, doc), /private audit failure/);
    assert.equal(state.docs.size, 0); assert.equal(state.audits.length, 0);
  });
  for (const mode of ["failure", "timeout", "nan", "short", "missing", "wrong-model"]) {
    it(`embedding ${mode} keeps the saved INACTIVE document, records the error and allows reprocess (E4)`, async () => {
      const embedding = new MockEmbeddingAdapter({ dimensions: 32, mode });
      const { service, state } = make(embedding);
      const result = await service.create(actor, doc);
      assert.equal(result.processing.result, "FAILED");
      assert.equal(result.document.status, "INACTIVE"); assert.equal(result.document.processingStatus, "FAILED");
      assert.ok(result.document.lastError); assert.equal(state.chunks.length, 0);
      embedding.mode = "success";
      const retried = await service.reprocess(actor, result.document.documentId);
      assert.equal(retried.processing.result, "PUBLISHED"); assert.equal(retried.document.processingStatus, "READY");
      assert.equal(retried.document.lastError, null);
    });
  }
  it("HTTP adapter codes are kept for retry triage; other errors never leak their message into audit", async () => {
    const failing = error => ({ embed: async () => { throw error; } });
    const http429 = Object.assign(new Error("PROVIDER_HTTP_429"), { code: "PROVIDER_HTTP_429" });
    const leaky = Object.assign(new Error("connect failed sk-secretsecretsecret1234"), { code: "ECONNRESET" });
    for (const [error, code] of [[http429, "PROVIDER_HTTP_429"], [leaky, "EMBEDDING_PROVIDER_ERROR"]]) {
      const { service, state } = make(failing(error));
      const result = await service.create(actor, doc);
      assert.equal(result.processing.code, code); assert.equal(result.document.lastError, code);
      const audit = state.audits.find(entry => entry.action === "FAIL_KNOWLEDGE_PROCESSING");
      assert.deepEqual(JSON.parse(audit.details), { contentVersion: 1, code });
      assert.doesNotMatch(JSON.stringify(state.audits), /sk-secret|connect failed/);
    }
  });
  it("a failed reprocess of a READY document keeps it in service without reporting an error state", async () => {
    const embedding = new MockEmbeddingAdapter({ dimensions: 32 });
    const { service, state } = make(embedding);
    const created = await service.create(actor, doc);
    embedding.mode = "timeout";
    const again = await service.reprocess(actor, created.document.documentId);
    assert.equal(again.processing.result, "FAILED"); assert.equal(again.processing.code, "PROVIDER_TIMEOUT");
    assert.equal(again.document.status, "ACTIVE"); assert.equal(again.document.processingStatus, "READY");
    assert.equal(again.document.lastError, null); assert.equal(again.document.chunkCount, created.document.chunkCount);
    assert.equal(state.chunks.length, created.document.chunkCount);
  });
  it("chunk write or publish audit failure rolls back phase 2 entirely", async () => {
    for (const failure of ["chunks", "audit"]) {
      const { service, state } = make();
      if (failure === "chunks") state.failChunks = true; else state.failAudit = "PUBLISH_KNOWLEDGE_DOCUMENT";
      const result = await service.create(actor, doc);
      assert.equal(result.processing.result, "FAILED"); assert.equal(result.processing.code, "PUBLISH_FAILED");
      assert.equal(state.chunks.length, 0); assert.equal(state.docs.get(1).status, "INACTIVE");
    }
  });
  it("an edit during processing supersedes the old result; only the new version is published", async () => {
    const { gate, adapter } = blockingEmbedding();
    const { service, state } = make(adapter);
    const first = service.create(actor, doc);
    await gate.started;
    const releaseFirst = gate.release;
    gate.started = new Promise(resolve => { gate.markStarted = resolve; });
    const second = service.update(actor, 1, { ...doc, content: "Nội dung mới về voi.", expectedVersion: 1 });
    await gate.started; const releaseSecond = gate.release;
    releaseSecond(); const newer = await second;
    releaseFirst(); const older = await first;
    assert.equal(newer.processing.result, "PUBLISHED"); assert.equal(older.processing.result, "SUPERSEDED");
    assert.equal(state.docs.get(1).contentVersion, 2);
    assert.ok(state.chunks.length >= 1 && state.chunks.every(c => c.sourceVersion === 2));
  });
  it("deactivation during processing wins: the stale result cannot reactivate, and reprocess is refused", async () => {
    const { gate, adapter } = blockingEmbedding();
    const { service, state } = make(adapter);
    const pending = service.create(actor, doc);
    await gate.started;
    const deactivated = await service.deactivate(actor, 1);
    assert.equal(deactivated.processingStatus, "DEACTIVATED"); assert.equal(deactivated.contentVersion, 2);
    gate.release();
    assert.equal((await pending).processing.result, "SUPERSEDED");
    assert.equal(state.docs.get(1).status, "INACTIVE"); assert.equal(state.chunks.length, 0);
    await assert.rejects(service.reprocess(actor, 1), { code: "KNOWLEDGE_DOCUMENT_DEACTIVATED" });
    assert.equal((await service.deactivate(actor, 1)).contentVersion, 2, "repeat deactivation is a no-op");
    assert.equal(state.audits.filter(a => a.action === "DEACTIVATE_KNOWLEDGE_DOCUMENT").length, 1);
  });
  it("deactivating an ACTIVE document removes it from service; editing it makes a new version that is processed again", async () => {
    const { service } = make();
    await service.create(actor, doc);
    const off = await service.deactivate(actor, 1);
    assert.equal(off.status, "INACTIVE"); assert.equal(off.chunkCount, 0, "old-version chunks no longer count as current");
    const revived = await service.update(actor, 1, { ...doc, expectedVersion: off.contentVersion });
    assert.equal(revived.processing.result, "PUBLISHED"); assert.equal(revived.document.contentVersion, 3);
  });
  it("concurrent stale edits: one wins, the other gets 409; repeated reprocess never duplicates chunks", async () => {
    const { service, state } = make();
    await service.create(actor, doc);
    const outcomes = await Promise.allSettled([
      service.update(actor, 1, { ...doc, title: "A", expectedVersion: 1 }), service.update(actor, 1, { ...doc, title: "B", expectedVersion: 1 })]);
    assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1);
    assert.equal(outcomes.find(o => o.status === "rejected").reason.code, "KNOWLEDGE_VERSION_CONFLICT");
    const once = state.chunks.length;
    await Promise.all([1, 2, 3].map(() => service.reprocess(actor, 1)));
    assert.equal(state.chunks.length, once);
  });
  it("404 for unknown documents", async () => {
    const { service } = make();
    await assert.rejects(service.get(actor, 99), { code: "KNOWLEDGE_DOCUMENT_NOT_FOUND" });
    await assert.rejects(service.update(actor, 99, { ...doc, expectedVersion: 1 }), { code: "KNOWLEDGE_DOCUMENT_NOT_FOUND" });
    await assert.rejects(service.deactivate(actor, 99), { code: "KNOWLEDGE_DOCUMENT_NOT_FOUND" });
    await assert.rejects(service.reprocess(actor, 99), { code: "KNOWLEDGE_DOCUMENT_NOT_FOUND" });
  });
});

describe("UC-15 HTTP router with real internal-token middleware", () => {
  let server, base, staffToken, fixture;
  before(async () => {
    fixture = createFixture(); await fixture.addStaff();
    // The Store's account re-check reads the same accounts the auth fixture authenticates.
    const users = { get: id => fixture.state.users.find(u => u.user_id === id) };
    const service = new KnowledgeService({ store: memoryStore({ users }).store, embedding: new MockEmbeddingAdapter({ dimensions: 32 }), config });
    const app = express(); app.use(express.json({ limit: "32kb" }));
    app.use("/api/auth", createAuthRouter(fixture.service));
    app.use("/api/admin/knowledge-documents", createKnowledgeRouter(fixture.service, service));
    app.use(errorHandler);
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staff) });
    staffToken = (await login.json()).data.accessToken;
  });
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const call = (path, { method = "GET", body, token } = {}) => fetch(base + "/api/admin/knowledge-documents" + path, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  it("missing, malformed or visitor tokens are 401 and never reach the Service", async () => {
    assert.equal((await call("")).status, 401);
    assert.equal((await call("", { token: "not-a-jwt" })).status, 401);
    const visitor = await call("", { method: "POST", body: doc, token: "tcv_visit_" + "a".repeat(64) });
    assert.equal(visitor.status, 401);
  });
  it("STAFF creates, lists, reads, updates, deactivates and reprocesses with the agreed response shape", async () => {
    const created = await call("", { method: "POST", body: doc, token: staffToken });
    assert.equal(created.status, 201);
    const { data } = await created.json();
    assert.equal(data.processing.result, "PUBLISHED"); assert.equal(data.document.processingStatus, "READY");
    const id = data.document.documentId;
    assert.equal((await (await call("", { token: staffToken })).json()).data.total, 1);
    assert.equal((await (await call("/" + id, { token: staffToken })).json()).data.content, doc.content);
    const stale = await call("/" + id, { method: "PUT", body: { ...doc, expectedVersion: 9 }, token: staffToken });
    assert.equal(stale.status, 409); assert.equal((await stale.json()).code, "KNOWLEDGE_VERSION_CONFLICT");
    const invalid = await call("/" + id, { method: "PUT", body: { title: "", content: "x", expectedVersion: 1 }, token: staffToken });
    assert.equal(invalid.status, 400);
    const off = await call("/" + id + "/deactivate", { method: "POST", token: staffToken });
    assert.equal((await off.json()).data.processingStatus, "DEACTIVATED");
    const refused = await call("/" + id + "/reprocess", { method: "POST", token: staffToken });
    assert.equal(refused.status, 409);
  });
});
