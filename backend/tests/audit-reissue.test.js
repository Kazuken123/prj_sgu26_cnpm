// UC-17 read projection for the UC-12 audit actions.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const { project } = require("../services/audit-details");
const { ACTIONS, filters } = require("../services/audit.validation");

const reissue = { sessionId: "11111111-1111-4111-8111-111111111111", paymentRef: "22222222-2222-4222-8222-222222222222",
  issueId: "33333333-3333-4333-8333-333333333333", reissueNumber: 1, renewedCode: false, reason: "Khách đổi điện thoại",
  codeExpiresAt: "2026-10-20T10:10:00.000Z" };

it("REISSUE_VISITOR_TOKEN is a supported audit filter", () => {
  assert.ok(ACTIONS.includes("REISSUE_VISITOR_TOKEN"));
  assert.equal(filters({ action: "REISSUE_VISITOR_TOKEN" }).action, "REISSUE_VISITOR_TOKEN");
});
it("projects every allow-listed reissue detail including the staff reason", () => {
  assert.deepEqual(project("REISSUE_VISITOR_TOKEN", JSON.stringify(reissue)), { details: reissue, detailsOmitted: false });
});
it("drops markup in the reason and unknown keys such as raw tokens or codes", () => {
  const result = project("REISSUE_VISITOR_TOKEN", { ...reissue, reason: "<img src=x onerror=alert(1)>", token: "tcv_visit_secret", shortedCode: "123456" });
  assert.equal(result.details.reason, undefined); assert.equal(result.details.token, undefined); assert.equal(result.details.shortedCode, undefined);
  assert.equal(result.detailsOmitted, true);
});
it("visitor token issue records the reissue number only when it is a positive integer", () => {
  const base = { paymentRef: reissue.paymentRef, issueId: reissue.issueId };
  assert.deepEqual(project("ISSUE_VISITOR_TOKEN", base).details, base);
  assert.deepEqual(project("ISSUE_VISITOR_TOKEN", { ...base, reissueNumber: 2 }).details, { ...base, reissueNumber: 2 });
  assert.equal(project("ISSUE_VISITOR_TOKEN", { ...base, reissueNumber: 0 }).detailsOmitted, true);
});
