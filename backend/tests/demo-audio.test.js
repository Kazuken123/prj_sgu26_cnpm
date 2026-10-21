const { it } = require("node:test");
const assert = require("node:assert/strict");
const { DemoAudioService } = require("../services/demo-audio.service");
const { parseOptions } = require("../scripts/publish-demo-audio");
const { project } = require("../services/audit-details"), { ACTIONS } = require("../services/audit.validation");
const approved = require("../../data/demo/piper-reviewed/manifest.json");
it("demo audio CLI requires the exact explicit target and one plan/apply/rollback mode", () => {
  assert.equal(parseOptions(["--database", "tcv_demo_review_20261020", "--plan", "manifest.json", "--output", "plan.json"]).mode, "plan");
  assert.equal(parseOptions(["--database", "tcv_demo_review_20261020", "--rollback", "plan.json"]).mode, "rollback");
  for (const args of [[], ["--database", "old_db", "--apply", "plan.json"], ["--database", "tcv_demo_review_20261020", "--force", "plan.json"],
    ["--database", "tcv_demo_review_20261020", "--apply", "plan.json", "--rollback", "plan.json"]]) assert.throws(() => parseOptions(args));
});
it("unapproved files, malformed input and wrong database are refused before accessing Store", async () => {
  const service = new DemoAudioService({ transaction: () => assert.fail("Invalid input must not reach Store") });
  for (const input of [null, {}, { ...approved, approved: false }, { ...approved, files: approved.files.slice(1) }]) await assert.rejects(service.plan("tcv_demo_review_20261020", input), { status: 400 });
  await assert.rejects(service.plan("production", approved), { status: 400 });
  await assert.rejects(service.apply("tcv_demo_review_20261020", {}), { status: 400 });
});
it("publication audit actions are filterable but hide the full rollback manifest and arbitrary fields", () => {
  for (const action of ["PUBLISH_DEMO_AUDIO", "ROLLBACK_DEMO_AUDIO"]) {
    assert.ok(ACTIONS.includes(action));
    const value = project(action, JSON.stringify({ operationId: "10000000-0000-4000-8000-000000000001", digest: "a".repeat(64), provider: "PIPER", audioCount: 4, rollback: action.startsWith("ROLLBACK"), oldAssets: [{ secret: "hidden" }] }));
    assert.equal(value.details.audioCount, 4); assert.equal(value.details.oldAssets, undefined); assert.equal(value.detailsOmitted, true);
  }
});
