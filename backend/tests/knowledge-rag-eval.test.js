// NFR-17 evaluation harness. With the MOCK adapters it only proves backend
// invariants (sources come from retrieval, no forbidden output, every turn logged)
// and prints per-group scores as a flow baseline. Those scores are NOT RAG quality:
// grounded answers, refusals and language must be judged with a real embedding/LLM.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { ChatService } = require("../services/chat.service");
const { getRagConfig } = require("../services/rag.config");
const { chunkText } = require("../services/rag-support");
const MockEmbeddingAdapter = require("../adapters/mock-embedding");
const MockChatModelAdapter = require("../adapters/mock-llm");

const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/knowledge-rag-eval.json"), "utf8"));
function score(question, result, keyById) {
  const docs = result.sources.map(source => keyById.get(source.documentId));
  const answer = result.answer ?? "";
  const checks = { forbidden: !(question.forbidden ?? []).some(text => answer.includes(text)) };
  if (["answerable", "multilingual"].includes(question.group)) {
    checks.status = result.status === "SUCCESS";
    checks.sources = question.expectedDocuments.every(key => docs.includes(key));
  } else {
    checks.status = result.status === "NO_CONTEXT";
    checks.sources = result.sources.length === 0;
  }
  return { id: question.id, group: question.group, status: result.status, documents: docs, pass: Object.values(checks).every(Boolean), checks };
}
it("NFR-17 dataset runs end to end; MOCK scores are reported as a flow baseline only", async t => {
  const config = getRagConfig({});
  const embedding = new MockEmbeddingAdapter({ model: config.embeddingModel, dimensions: config.embeddingDimensions });
  const keyById = new Map(), rows = [];
  dataset.documents.forEach((document, index) => {
    keyById.set(index + 1, document.key);
    for (const text of chunkText(document.content, config)) {
      rows.push({ chunkId: String(rows.length + 1), documentId: index + 1, sourceVersion: 1, title: document.title, source: document.source, text,
        embedding: embedding.vector(document.title + "\n" + text) });
    }
  });
  const logs = [];
  const service = new ChatService({ config, embedding, llm: new MockChatModelAdapter(),
    store: { candidates: async () => rows, createLog: async entry => { logs.push(entry); } }, redis: { consumeLookup: async () => true } });
  const results = [];
  for (const question of dataset.questions) {
    const result = await service.ask({ sessionId: randomUUID() }, { question: question.question }, "192.0.2.50");
    // Invariants that must hold whatever the provider: sources are real retrieved chunks.
    for (const source of result.sources) assert.ok(rows.some(row => row.chunkId === source.chunkId && row.documentId === source.documentId));
    assert.ok(!/CANARY-7731|pay\.invalid/.test(result.answer), question.id + " must not leak injected content");
    results.push(score(question, result, keyById));
  }
  assert.equal(logs.length, dataset.questions.length);
  const groups = {};
  for (const result of results) {
    groups[result.group] ??= { pass: 0, total: 0 };
    groups[result.group].total++; if (result.pass) groups[result.group].pass++;
  }
  t.diagnostic("provider=MOCK (flow only, not RAG quality) " + JSON.stringify(groups));
  for (const result of results) t.diagnostic(`${result.id} ${result.group} ${result.status} docs=${result.documents.join(",") || "-"} ${result.pass ? "PASS" : "FAIL"}`);
  if (process.env.RAG_EVAL_REPORT) {
    fs.writeFileSync(process.env.RAG_EVAL_REPORT, JSON.stringify({ provider: "MOCK", embeddingModel: config.embeddingModel, datasetVersion: dataset.version,
      ranAt: new Date().toISOString(), groups, results }, null, 2));
  }
});
