const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const { getPipelineLeaseConfig } = require("../config/pipeline");
const { parseOptions } = require("../scripts/recover-content-jobs");
it("approved lease/heartbeat defaults are configurable with finite safety bounds", () => {
  assert.deepEqual(getPipelineLeaseConfig({}), { leaseSeconds: 120, heartbeatSeconds: 15 });
  assert.deepEqual(getPipelineLeaseConfig({ CONTENT_JOB_LEASE_SECONDS: "3", CONTENT_JOB_HEARTBEAT_SECONDS: "1" }), { leaseSeconds: 3, heartbeatSeconds: 1 });
  for (const env of [{ CONTENT_JOB_LEASE_SECONDS: "0" }, { CONTENT_JOB_LEASE_SECONDS: "1.5" },
    { CONTENT_JOB_LEASE_SECONDS: "3601" }, { CONTENT_JOB_HEARTBEAT_SECONDS: "0" },
    { CONTENT_JOB_LEASE_SECONDS: "3", CONTENT_JOB_HEARTBEAT_SECONDS: "2" }]) assert.throws(() => getPipelineLeaseConfig(env));
});
it("operator recovery is dry-run by default; apply and a bounded limit must be explicit", () => {
  assert.deepEqual(parseOptions([]), { apply: false, limit: 100 });
  assert.deepEqual(parseOptions(["--apply", "--limit", "10"]), { apply: true, limit: 10 });
  for (const args of [["--all"], ["--limit"], ["--limit", "1001"], ["--limit", "1 OR 1=1"],
    ["--apply", "--apply"], ["--limit", "2", "--limit", "3"]]) assert.throws(() => parseOptions(args));
});
it("dry-run reports expired/legacy jobs without opening write transactions", async () => {
  const service = new PipelineService({ listExpiredClaims: async limit => { assert.equal(limit, 100); return [{ jobId: 1, claimId: randomUUID() }]; },
    countLegacyProcessing: async () => 2, withWorkerJob: () => assert.fail("Dry-run must not change state") });
  assert.deepEqual(await service.recoverExpiredJobs(), { dryRun: true, inspected: 1, recovered: 0, skipped: 0, legacyProcessing: 2 });
});
it("recovery rechecks status, claim and lease instead of trusting its earlier candidate list", async () => {
  const claimId = randomUUID();
  for (const job of [null, { status: "COMPLETED", claimId }, { status: "PROCESSING", claimId: randomUUID() },
    { status: "PROCESSING", claimId, leaseValid: true }, { status: "PROCESSING", claimId, leaseValid: false, leaseExpiresAt: null }]) {
    const service = new PipelineService({ listExpiredClaims: async () => [{ jobId: 1, claimId }], countLegacyProcessing: async () => 0,
      withWorkerJob: (id, work) => work({ job, recoverExpired: () => assert.fail("Cannot recover this job") }) });
    assert.equal((await service.recoverExpiredJobs({ apply: true })).skipped, 1);
  }
});
it("renewal cannot resurrect expired, replaced or finished claims", async () => {
  const claimId = randomUUID();
  for (const job of [null, { status: "FAILED", claimId }, { status: "PROCESSING", claimId: randomUUID(), leaseValid: true },
    { status: "PROCESSING", claimId, leaseValid: false }]) {
    const service = new PipelineService({ withWorkerJob: (id, work) => work({ job, renewLease: () => assert.fail("Must not renew") }) });
    assert.equal(await service.renewClaim(1, claimId), false);
  }
});
it("only the live matching claim may renew for the configured duration", async () => {
  const claimId = randomUUID();
  const service = new PipelineService({ withWorkerJob: (id, work) => work({ job: { status: "PROCESSING", claimId, leaseValid: true },
    renewLease: async (claim, seconds) => { assert.equal(claim, claimId); assert.equal(seconds, 120); return true; } }) });
  assert.equal(await service.renewClaim(1, claimId), true);
});
it("invalid recovery options and invalid lease configuration cannot reach SQL", async () => {
  const service = new PipelineService({ listExpiredClaims: () => assert.fail("Invalid input") });
  for (const input of [null, [], { apply: "true" }, { limit: 1001 }, { claimId: randomUUID() }]) await assert.rejects(service.recoverExpiredJobs(input));
  service.leaseConfig = () => ({ leaseSeconds: 3, heartbeatSeconds: 2 });
  await assert.rejects(service.claimJob(1), { code: "CONTENT_LEASE_UNAVAILABLE" });
});
it("database/recovery errors expose safe codes without claiming the whole batch rolled back", async () => {
  const service = new PipelineService({ listExpiredClaims: async () => { throw new Error("SQL password=secret"); },
    withWorkerJob: async () => { throw new Error("SQL password=secret"); } });
  for (const action of [() => service.recoverExpiredJobs({ apply: true }), () => service.renewClaim(1, randomUUID())]) {
    await assert.rejects(action(), error => { assert.equal(error.status, 503); assert.equal(/SQL|secret|password/.test(JSON.stringify(error)), false); return true; });
  }
});
