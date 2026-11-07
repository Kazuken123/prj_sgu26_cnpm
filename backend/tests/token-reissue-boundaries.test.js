// UC-12 must not open side doors: after a staff reissue (token cleared, count > 0)
// only the REISSUE pickup code can mint the next token.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");

const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
const now = new Date("2026-10-20T10:00:00Z");
const reissuedRow = method => ({ sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: method, amount: "50000.00", currency: "VND",
  paymentStatus: "PAID", sessionStatus: "ACTIVE", confirmedBy: method === "CASH" ? 7 : null, paidAt: new Date(now - 3600000),
  activatedAt: new Date(now - 3600000), expiresAt: new Date(now.getTime() + 86400000), tokenHash: null, reissueCount: 1 });
function redisSpy() {
  const calls = [];
  return { calls, redis: new Proxy({}, { get: (_, name) => async (...args) => { calls.push(name); return name === "consumeLookup" ? true : null; } }) };
}

it("UC-11 cash code issuance refuses a reissued session without touching Redis", async () => {
  const row = reissuedRow("CASH"), spy = redisSpy();
  const store = { withCashCodeIssue: async (actorId, id, authorize, work) => { authorize(staff); return work(row, { now, auditIssue: async () => assert.fail("no audit") }); } };
  const service = new PaymentService(store, spy.redis);
  await assert.rejects(service.issueCashCode(staff, row.sessionId), { status: 409, code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.deepEqual(spy.calls, []);
});
it("online auth-code exchange refuses a reissued session before inspecting any code", async () => {
  const row = reissuedRow("ONLINE"), spy = redisSpy();
  const store = { withOnlineTokenExchange: async (id, work) => work(row, { now, preparation: null, ready: false, persist: async () => assert.fail("no write") }) };
  const service = new PaymentService(store, spy.redis);
  await assert.rejects(service.exchangeOnlineCode(row.sessionId, { authCode: randomBytes(32).toString("hex") }, "192.0.2.7"),
    { status: 409, code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.deepEqual(spy.calls, ["consumeLookup"]);
});
it("a pickup code from an earlier reissue cannot redeem the current one", async () => {
  const row = { ...reissuedRow("CASH"), reissueCount: 2 };
  const record = { sessionId: row.sessionId, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"), shortedCode: "135790",
    expiresAtMs: now.getTime() + 300000, purpose: "REISSUE", reissueNumber: 1 };
  const redis = { consumeLookup: async () => true, inspectCashCode: async () => record };
  let writes = 0;
  const store = { withCashTokenExchange: async (id, work) => work(row, { now, persist: async () => { writes++; return true; } }) };
  const service = new PaymentService(store, redis);
  await assert.rejects(service.exchangeCashCode(row.sessionId, { shortedCode: "135790" }, "192.0.2.8"), { status: 401, code: "CASH_CODE_INVALID_OR_EXPIRED" });
  assert.equal(writes, 0);
});
