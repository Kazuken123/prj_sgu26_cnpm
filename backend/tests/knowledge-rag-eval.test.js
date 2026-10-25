// NFR-17 evaluation harness. Default: MOCK adapters, which only prove backend
// invariants (sources come from retrieval, no forbidden output, every turn logged);
// their per-group scores are a flow baseline, NOT RAG quality.
// RAG_EVAL_REAL=1 + RAG_* provider settings runs the same 18 questions against the
// configured provider (sends the illustrative dataset out; needs approval and budget).
// Answer language is not auto-graded: the report keeps answers for manual review.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { ChatService } = require("../services/chat.service");
const { getRagConfig } = require("../services/rag.config");
const { chunkText, checkEmbeddings, withDeadline } = require("../services/rag-support");
const { createEmbeddingAdapter, createChatAdapter } = require("../services/rag-adapters");

const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/knowledge-rag-eval.json"), "utf8"));
function score(question, result, keyById) {
  const docs = result.sources.map(source => keyById.get(source.documentId));
  const answer = result.answer ?? "";
  const checks = { forbidden: !(question.forbidden ?? []).some(text => answer.includes(text)) };
  if (["answerable", "multilingual"].includes(question.group)) {
    checks.status = result.status === "SUCCESS";
    checks.sources = question.expectedDocuments.every(key => docs.includes(key));
    checks.facts = (question.expectedFacts ?? []).every(fact => answer.toLowerCase().includes(fact.toLowerCase()));
  } else {
    checks.status = result.status === "NO_CONTEXT";
    checks.sources = result.sources.length === 0;
  }
  return { id: question.id, group: question.group, language: question.language, status: result.status, documents: docs, answer,
    pass: Object.values(checks).every(Boolean), checks };
}
const real = process.env.RAG_EVAL_REAL === "1";
it(`NFR-17 dataset runs end to end (${real ? "configured provider" : "MOCK: flow baseline only"})`, { timeout: 600000 }, async t => {
  const config = real ? getRagConfig(process.env) : getRagConfig({});
  if (real) assert.notEqual(config.provider, "MOCK", "RAG_EVAL_REAL=1 needs RAG_PROVIDER set to a real provider");
  const embedding = createEmbeddingAdapter(config);
  const keyById = new Map(), rows = [];
  for (const [index, document] of dataset.documents.entries()) {
    keyById.set(index + 1, document.key);
    const texts = chunkText(document.content, config);
    const reply = await withDeadline(config.embeddingTimeoutMs, signal => embedding.embed(texts.map(text => document.title + "\n" + text), { signal }));
    checkEmbeddings(reply, texts.length, config).forEach((vector, i) => rows.push({ chunkId: String(rows.length + 1), documentId: index + 1,
      sourceVersion: 1, title: document.title, source: document.source, text: texts[i], embedding: vector }));
  }
  const logs = [];
  const service = new ChatService({ config, embedding, llm: createChatAdapter(config),
    store: { candidates: async () => rows, createLog: async entry => { logs.push(entry); } }, redis: { consumeLookup: async () => true } });
  const results = [];
  const requestedIds = real && process.env.RAG_EVAL_IDS ? process.env.RAG_EVAL_IDS.split(",") : null;
  if (requestedIds) assert.ok(requestedIds.length && new Set(requestedIds).size === requestedIds.length && requestedIds.every(id => dataset.questions.some(q => q.id === id)), "RAG_EVAL_IDS contains unknown or duplicate cases");
  const questions = requestedIds ? dataset.questions.filter(question => requestedIds.includes(question.id)) : dataset.questions;
  const interval = real ? Number(process.env.RAG_EVAL_INTERVAL_MS || 0) : 0;
  assert.ok(Number.isInteger(interval) && interval >= 0 && interval <= 60000, "RAG_EVAL_INTERVAL_MS must be 0..60000");
  for (const question of questions) {
    if (results.length && interval) await new Promise(resolve => setTimeout(resolve, interval));
    let result;
    try { result = await service.ask({ sessionId: randomUUID() }, { question: question.question }, "192.0.2.50"); }
    catch (error) { result = { status: "FAILED", answer: null, sources: [], code: error.code }; }
    // Invariants that must hold whatever the provider: sources are real retrieved chunks.
    for (const source of result.sources) assert.ok(rows.some(row => row.chunkId === source.chunkId && row.documentId === source.documentId));
    assert.ok(!/CANARY-7731|pay\.invalid/.test(result.answer), question.id + " must not leak injected content");
    results.push(score(question, result, keyById));
  }
  assert.equal(logs.length, questions.length);
  const groups = {};
  for (const result of results) {
    groups[result.group] ??= { pass: 0, total: 0 };
    groups[result.group].total++; if (result.pass) groups[result.group].pass++;
  }
  const label = config.provider === "MOCK" ? "provider=MOCK (flow only, not RAG quality)" : `provider=${config.provider} embedding=${config.embeddingModel} llm=${config.llmModel}`;
  t.diagnostic(label + " " + JSON.stringify(groups));
  for (const result of results) t.diagnostic(`${result.id} ${result.group} ${result.status} docs=${result.documents.join(",") || "-"} ${result.pass ? "PASS" : "FAIL"}`);
  if (process.env.RAG_EVAL_REPORT) {
    fs.writeFileSync(process.env.RAG_EVAL_REPORT, JSON.stringify({ provider: config.provider, embeddingModel: config.embeddingModel, llmModel: config.llmModel,
      datasetVersion: dataset.version, selectedQuestionIds: questions.map(question => question.id), languageGrading: "manual",
      ranAt: new Date().toISOString(), groups, results }, null, 2));
  }
  // A completed harness is not a passing provider evaluation. Preserve the
  // report first, then fail real runs that miss the pre-existing criteria.
  // Passing these checks still requires manual answer-language/factual review.
  if (real) assert.ok(results.every(result => result.pass), "Real RAG evaluation missed fixed criteria: " + results.filter(result => !result.pass).map(result => result.id).join(","));
});
