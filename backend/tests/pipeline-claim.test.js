const { it } = require("node:test");
const assert = require("node:assert/strict");
const { PipelineService } = require("../services/pipeline.service");

function fixture(overrides = {}) {
  const job = { jobId: 7, poiId: 3, languageCode: "en", sourceVersion: 1, currentVersion: 1, status: "PENDING", ...overrides };
  const writes = [];
  const service = new PipelineService({ withWorkerJob: async (id, work) => {
    assert.equal(id, 7);
    return work({ job, transition: async (status, error) => { writes.push({ status, error }); return true; } });
  } });
  return { service, writes };
}
it("worker claim returns only the job identity/version after a successful PROCESSING transition", async () => {
  const { service, writes } = fixture({ rawProviderError: "secret must not escape" });
  assert.deepEqual(await service.claimJob("7"), { claimed: true, jobId: 7, poiId: 3, languageCode: "en", sourceVersion: 1, status: "PROCESSING" });
  assert.deepEqual(writes, [{ status: "PROCESSING", error: null }]);
});
it("worker claim never resets PROCESSING, COMPLETED or FAILED, even if their source is old", async () => {
  for (const status of ["PROCESSING", "COMPLETED", "FAILED"]) {
    const { service, writes } = fixture({ status, currentVersion: 2 });
    assert.deepEqual(await service.claimJob(7), { claimed: false, reason: "NOT_PENDING", jobId: 7 });
    assert.equal(writes.length, 0);
  }
});
it("an outdated pending job ends FAILED with a fixed safe code instead of being claimed", async () => {
  const { service, writes } = fixture({ currentVersion: 2 });
  assert.deepEqual(await service.claimJob(7), { claimed: false, reason: "CONTENT_SOURCE_OUTDATED", jobId: 7, status: "FAILED" });
  assert.deepEqual(writes, [{ status: "FAILED", error: "CONTENT_SOURCE_OUTDATED" }]);
});
it("missing worker job is not reported as acquired and performs no write", async () => {
  const service = new PipelineService({ withWorkerJob: async (id, work) => work({ job: undefined }) });
  assert.deepEqual(await service.claimJob(9), { claimed: false, reason: "NOT_FOUND", jobId: 9 });
});
it("invalid or injected job identifiers are rejected before the Store is reached", async () => {
  const service = new PipelineService({ withWorkerJob: () => assert.fail("Store must not be called") });
  for (const input of [undefined, null, 0, -1, 1.1, {}, [], "1 OR 1=1", "01", "9007199254740992"]) {
    await assert.rejects(service.claimJob(input), { code: "VALIDATION_ERROR", status: 400 });
  }
});
it("failed conditional writes cannot be reported as a successful claim or stale-job retirement", async () => {
  for (const currentVersion of [1, 2]) {
    const service = new PipelineService({ withWorkerJob: (id, work) => work({
      job: { jobId: id, status: "PENDING", sourceVersion: 1, currentVersion }, transition: async () => false,
    }) });
    await assert.rejects(service.claimJob(7), { code: "CONTENT_JOB_CLAIM_UNAVAILABLE", status: 503 });
  }
});
it("SQL, audit or uncertain commit failures expose only a safe claim error", async () => {
  const service = new PipelineService({ withWorkerJob: async () => { throw new Error("SQL password=secret provider-key"); } });
  await assert.rejects(service.claimJob(7), error => {
    assert.equal(error.code, "CONTENT_JOB_CLAIM_UNAVAILABLE");
    assert.equal(/SQL|password|secret|provider-key/.test(JSON.stringify(error)), false);
    return true;
  });
});
