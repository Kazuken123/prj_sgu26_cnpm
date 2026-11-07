// UC-12 configuration: limits must come from validated env values only.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const { getTokenReissueConfig } = require("../config/payment");

it("defaults to two reissues and a ten-minute payment time tolerance", () => {
  assert.deepEqual(getTokenReissueConfig({}), { maxReissues: 2, paidAtToleranceMs: 600000 });
});
it("accepts bounded positive integer overrides", () => {
  assert.deepEqual(getTokenReissueConfig({ VISIT_TOKEN_REISSUE_LIMIT: "3", VISIT_TOKEN_REISSUE_PAID_AT_TOLERANCE_MINUTES: "15" }),
    { maxReissues: 3, paidAtToleranceMs: 900000 });
});
it("rejects zero, negative, fractional, non-numeric and out-of-range values", () => {
  for (const env of [{ VISIT_TOKEN_REISSUE_LIMIT: "0" }, { VISIT_TOKEN_REISSUE_LIMIT: "-1" }, { VISIT_TOKEN_REISSUE_LIMIT: "1.5" },
    { VISIT_TOKEN_REISSUE_LIMIT: "two" }, { VISIT_TOKEN_REISSUE_LIMIT: "11" },
    { VISIT_TOKEN_REISSUE_PAID_AT_TOLERANCE_MINUTES: "0" }, { VISIT_TOKEN_REISSUE_PAID_AT_TOLERANCE_MINUTES: "1441" }]) {
    assert.throws(() => getTokenReissueConfig(env), /INVALID_RATE_LIMIT_CONFIG/);
  }
});
it("an invalid configuration fails closed in the service instead of allowing unlimited reissues", async () => {
  const { PaymentService } = require("../services/payment.service");
  const service = new PaymentService({}, {}, { reissueConfig: () => { throw new Error("bad env"); } });
  const staff = { userId: 1, role: "STAFF", status: "ACTIVE" };
  const input = { sessionId: "11111111-1111-4111-8111-111111111111", paymentRef: "22222222-2222-4222-8222-222222222222", paidAt: "2026-10-20T09:00:00.000Z" };
  await assert.rejects(service.verifyTokenReissue(staff, input), { status: 503, code: "REISSUE_NOT_CONFIGURED" });
});
