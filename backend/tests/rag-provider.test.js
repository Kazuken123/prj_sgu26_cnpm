// OpenAI-compatible adapters against a LOCAL fake provider (127.0.0.1). No external
// service, no real key: this checks the HTTP contract and safety, not model quality.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
process.env.NODE_ENV = "test";
const { getRagConfig } = require("../services/rag.config");
const { createEmbeddingAdapter, createChatAdapter } = require("../services/rag-adapters");
const { withDeadline, checkEmbeddings } = require("../services/rag-support");
const { KnowledgeService } = require("../services/knowledge.service");
const { ChatService } = require("../services/chat.service");
const MockEmbeddingAdapter = require("../adapters/mock-embedding");

const KEY = "test-only-not-a-real-key-" + randomUUID();
const vectors = new MockEmbeddingAdapter({ dimensions: 64 });
describe("OpenAI-compatible provider adapters (local fake provider)", () => {
  let server, base, mode = "ok";
  const seen = [];
  before(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const json = JSON.parse(body); seen.push({ url: req.url, auth: req.headers.authorization, json });
        if (mode === "hang") return;
        if (mode === "500") { res.writeHead(500); return res.end(JSON.stringify({ error: "upstream echo " + KEY })); }
        if (mode === "redirect") { res.writeHead(302, { Location: "http://127.0.0.1:1/" }); return res.end(); }
        if (mode === "garbage") { res.writeHead(200); return res.end("not json"); }
        res.writeHead(200, { "Content-Type": "application/json" });
        if (req.url === "/v1/embeddings") {
          // Deliberately out of order: the adapter must sort by index.
          return res.end(JSON.stringify({ model: json.model, data: json.input.map((text, index) => ({ index, embedding: vectors.vector(text) })).reverse() }));
        }
        const id = /<chunk id="(\d+)"/.exec(json.messages[1].content)?.[1];
        const content = id ? "```json\n" + JSON.stringify({ decision: "ANSWER", answer: "Voi ăn cỏ.", citations: [id] }) + "\n```"
          : JSON.stringify({ decision: "NO_CONTEXT", answer: "Chưa có thông tin.", citations: [] });
        res.end(JSON.stringify({ choices: [{ message: { content } }] }));
      });
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}/v1`;
  });
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const env = extra => ({ RAG_PROVIDER: "OPENAI_COMPATIBLE", RAG_ALLOW_EXTERNAL_PROVIDER: "true", RAG_API_BASE_URL: base, RAG_API_KEY: KEY,
    RAG_EMBEDDING_MODEL: "fake-embed", RAG_EMBEDDING_DIMENSIONS: "64", RAG_LLM_MODEL: "fake-chat", RAG_EMBEDDING_TIMEOUT_MS: "300", RAG_LLM_TIMEOUT_MS: "300", ...extra });

  it("an external provider needs explicit permission, HTTPS (or localhost), a key and named models", () => {
    assert.throws(() => getRagConfig(env({ RAG_ALLOW_EXTERNAL_PROVIDER: undefined })), /RAG_ALLOW_EXTERNAL_PROVIDER/);
    assert.throws(() => getRagConfig(env({ RAG_API_BASE_URL: "http://provider.example/v1" })), /RAG_API_BASE_URL/);
    assert.throws(() => getRagConfig(env({ RAG_API_BASE_URL: "https://user:pass@provider.example/v1" })), /RAG_API_BASE_URL/);
    assert.throws(() => getRagConfig(env({ RAG_API_KEY: "" })), /RAG_API_KEY/);
    for (const name of ["RAG_EMBEDDING_MODEL", "RAG_EMBEDDING_DIMENSIONS", "RAG_LLM_MODEL"]) assert.throws(() => getRagConfig(env({ [name]: undefined })), new RegExp(name));
    const config = getRagConfig(env({ RAG_API_BASE_URL: "https://provider.example/v1/" }));
    assert.equal(config.apiBaseUrl, "https://provider.example/v1"); assert.equal(config.apiKey, KEY);
    assert.doesNotMatch(JSON.stringify(config), new RegExp(KEY), "key is not serialized");
    assert.equal(getRagConfig({}).provider, "MOCK");
  });
  it("embeddings: sends the key as Bearer, keeps input order and passes the Service checks", async () => {
    mode = "ok"; const config = getRagConfig(env());
    const adapter = createEmbeddingAdapter(config);
    assert.doesNotMatch(JSON.stringify(adapter), new RegExp(KEY));
    const reply = await adapter.embed(["voi", "hổ", "sếu"]);
    assert.equal(checkEmbeddings(reply, 3, config).length, 3);
    assert.deepEqual(reply.vectors[0], vectors.vector("voi"));
    const request = seen.at(-1);
    assert.equal(request.url, "/v1/embeddings"); assert.equal(request.auth, "Bearer " + KEY); assert.equal(request.json.model, "fake-embed");
  });
  it("provider HTTP errors, redirects and invalid JSON become codes without the body or key", async () => {
    const adapter = createEmbeddingAdapter(getRagConfig(env()));
    for (const [current, code] of [["500", "PROVIDER_HTTP_500"], ["redirect", "PROVIDER_UNREACHABLE"], ["garbage", "PROVIDER_INVALID_RESPONSE"]]) {
      mode = current;
      const error = await adapter.embed(["voi"]).then(() => null, value => value);
      assert.equal(error.code, code); assert.doesNotMatch(String(error.message) + JSON.stringify(error), new RegExp(KEY));
    }
  });
  it("a hanging provider is aborted by the deadline", async () => {
    mode = "hang"; const adapter = createChatAdapter(getRagConfig(env()));
    const started = Date.now();
    await assert.rejects(withDeadline(200, signal => adapter.generate({ prompt: { system: "s", user: "u" }, signal })), { code: "PROVIDER_TIMEOUT" });
    assert.ok(Date.now() - started < 1500);
  });
  it("end to end: documents are embedded and chat answers with retrieved sources through the HTTP adapters", async () => {
    mode = "ok"; const config = getRagConfig(env());
    const docs = new Map(), chunks = [], logs = [];
    const actorUser = { user_id: 1, role: "STAFF", status: "ACTIVE" };
    const store = {
      get: async id => docs.get(id), recordFailure: async () => {},
      mutate: async (actorId, id, authorize, work) => { authorize(actorUser); return work({ current: undefined, persist: async data => {
        docs.set(1, { documentId: 1, ...data, chunkCount: 0, lifecycleAction: "CREATE_KNOWLEDGE_DOCUMENT" }); return docs.get(1);
      } }); },
      publish: async (actorId, id, version, items) => {
        items.forEach((item, index) => chunks.push({ chunkId: String(index + 1), documentId: id, sourceVersion: version, text: item.text, embedding: item.embedding, title: docs.get(id).title, source: docs.get(id).source }));
        docs.get(id).status = "ACTIVE"; return { published: true, document: { ...docs.get(id), chunkCount: items.length } };
      },
    };
    const knowledge = new KnowledgeService({ store, config });
    const created = await knowledge.create({ userId: 1, role: "STAFF", status: "ACTIVE" }, { title: "Voi châu Á", content: "Voi châu Á ăn cỏ và lá cây.", source: "Dữ liệu minh họa" });
    assert.equal(created.processing.result, "PUBLISHED");
    const chat = new ChatService({ config, redis: { consumeLookup: async () => true },
      store: { candidates: async () => chunks, createLog: async entry => { logs.push(entry); } } });
    const result = await chat.ask({ sessionId: randomUUID() }, { question: "Voi châu Á ăn gì?" }, "192.0.2.1");
    assert.equal(result.status, "SUCCESS"); assert.equal(result.sources[0].documentId, 1); assert.equal(result.answer, "Voi ăn cỏ.");
    const chatRequest = seen.find(request => request.url === "/v1/chat/completions");
    assert.equal(chatRequest.json.model, "fake-chat"); assert.equal(chatRequest.json.messages[0].role, "system");
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(KEY));
  });
  it("invalid RAG configuration is 503 RAG_NOT_CONFIGURED before any document is written", async () => {
    let writes = 0;
    const knowledge = new KnowledgeService({ store: { mutate: async () => { writes++; } } });
    const original = process.env.RAG_PROVIDER; process.env.RAG_PROVIDER = "OPENAI_COMPATIBLE";
    try {
      await assert.rejects(knowledge.create({ userId: 1, role: "STAFF", status: "ACTIVE" }, { title: "t", content: "c" }), { status: 503, code: "RAG_NOT_CONFIGURED" });
      const chat = new ChatService({ redis: { consumeLookup: async () => true }, store: {} });
      await assert.rejects(chat.ask({ sessionId: randomUUID() }, { question: "Voi?" }, "192.0.2.1"), { status: 503, code: "RAG_NOT_CONFIGURED" });
    } finally { if (original === undefined) delete process.env.RAG_PROVIDER; else process.env.RAG_PROVIDER = original; }
    assert.equal(writes, 0);
  });
});
