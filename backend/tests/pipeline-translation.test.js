const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const MockTranslation = require("../adapters/mock-translation");
function fixture({ language = "en", translator = new MockTranslation(), timeout = 100 } = {}) {
  const claimId = randomUUID();
  const state = { job: { jobId: 1, poiId: 2, languageCode: language, sourceVersion: 1, currentVersion: 1, status: "PROCESSING", claimId, leaseValid: true },
    source: { name: "Nguồn", description: "Mô tả", audioScript: "Lời đọc", sourceVersion: 1, status: "READY" }, target: null, writes: 0, failures: [] };
  const store = { withWorkerJob: async (id, work) => work({ job: { ...state.job },
    getContent: async code => code === "vi" ? state.source : state.target,
    failClaim: async (claim, code) => {
      assert.equal(claim, state.job.claimId); state.job.status = "FAILED"; state.job.claimId = null; state.failures.push(code); return true;
    },
    saveTranslation: async (claim, text, provider) => {
      assert.equal(claim, state.job.claimId); state.target = { ...text, sourceVersion: 1, status: "READY" }; state.writes++; state.provider = provider; return true;
    },
  }) };
  return { state, store, claimId, service: new PipelineService(store, { translator, translationTimeoutMs: timeout }) };
}
it("translation mock is explicit simulation; text may become READY but job never becomes COMPLETED", async () => {
  const f = fixture();
  assert.deepEqual(await f.service.prepareTranslation(1, f.claimId), { prepared: true, jobId: 1, stage: "TRANSLATION_READY", status: "PROCESSING", reused: false });
  assert.match(f.state.target.audioScript, /^\[MOCK en\]/); assert.equal(f.state.provider, "MOCK");
  assert.equal(f.state.job.status, "PROCESSING");
});
it("Vietnamese uses the original source and current text is reused without invoking translation", async () => {
  for (const language of ["vi", "en"]) {
    const f = fixture({ language, translator: { translate: () => assert.fail("No translation required") } });
    f.state.target = { ...f.state.source };
    assert.equal((await f.service.prepareTranslation(1, f.claimId)).reused, true); assert.equal(f.state.writes, 0);
  }
});
it("wrong/missing/malformed claim cannot read provider or update another processing attempt", async () => {
  const f = fixture({ translator: { translate: () => assert.fail("Wrong claim") } });
  assert.equal((await f.service.prepareTranslation(1, randomUUID())).reason, "CLAIM_LOST");
  for (const claim of [null, "1 OR 1=1", f.claimId.toUpperCase()]) {
    await assert.rejects(f.service.prepareTranslation(1, claim), { code: "INVALID_CONTENT_CLAIM" });
  }
  assert.equal(f.state.writes, 0); assert.equal(f.state.failures.length, 0);
});
it("source must be READY, current and complete before provider processing", async () => {
  for (const source of [null, { status: "FAILED" }, { status: "READY", sourceVersion: 2 }, { status: "READY", sourceVersion: 1, name: "" }]) {
    const f = fixture({ translator: { translate: () => assert.fail("Invalid source") } }); f.state.source = source;
    assert.equal((await f.service.prepareTranslation(1, f.claimId)).reason, "CONTENT_SOURCE_UNAVAILABLE");
    assert.equal(f.state.job.claimId, null); assert.equal(f.state.writes, 0);
  }
});
it("invalid provider output fails with a safe code and never stores partial text", async () => {
  for (const output of [null, {}, { name: "n", description: "d" }, { name: "n", description: "d", audioScript: " " },
    { name: "x".repeat(256), description: "d", audioScript: "a" }, { name: "n", description: "💚".repeat(17000), audioScript: "a" }]) {
    const f = fixture({ translator: { translate: async () => output } });
    assert.equal((await f.service.prepareTranslation(1, f.claimId)).reason, "TRANSLATION_RESULT_INVALID"); assert.equal(f.state.writes, 0);
  }
});
it("provider failure/timeout has finite wait, aborts the mock and stores only a reviewed error code", async () => {
  for (const mode of ["failure", "timeout"]) {
    const f = fixture({ translator: new MockTranslation({ mode }), timeout: 20 });
    assert.equal((await f.service.prepareTranslation(1, f.claimId)).reason, mode === "timeout" ? "TRANSLATION_TIMEOUT" : "TRANSLATION_PROVIDER_FAILED");
    assert.equal(f.state.writes, 0); assert.equal(f.state.failures.length, 1);
  }
  const f = fixture({ translator: { translate: async () => { throw new Error("password=secret SELECT provider-key"); } } });
  assert.equal((await f.service.prepareTranslation(1, f.claimId)).reason, "TRANSLATION_PROVIDER_FAILED");
  assert.equal(/secret|SELECT|password/.test(JSON.stringify(f.state)), false);
});
it("timeout configuration must be finite and positive before reading the Store", async () => {
  for (const timeout of [0, -1, Infinity, 120001, "10"]) {
    const service = new PipelineService({ withWorkerJob: () => assert.fail("Invalid config") }, { translationTimeoutMs: timeout });
    await assert.rejects(service.prepareTranslation(1, randomUUID()), { code: "CONTENT_TRANSLATION_UNAVAILABLE" });
  }
});
it("an injected provider is required; no production default silently enables mock translations", async () => {
  const f = fixture(); f.service.translator = undefined;
  assert.equal((await f.service.prepareTranslation(1, f.claimId)).reason, "CONTENT_TRANSLATION_NOT_READY"); assert.equal(f.state.writes, 0);
});
it("SQL failures expose no raw details and cannot report translation success", async () => {
  const service = new PipelineService({ withWorkerJob: async () => { throw new Error("SQL secret-key"); } });
  await assert.rejects(service.prepareTranslation(1, randomUUID()), error => {
    assert.equal(error.code, "CONTENT_TRANSLATION_UNAVAILABLE"); assert.equal(/SQL|secret/.test(JSON.stringify(error)), false); return true;
  });
});
