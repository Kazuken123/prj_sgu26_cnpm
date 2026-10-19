const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../../services/payment.service");
const { getCashCodeTtlMs } = require("../../config/payment");
const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
function cashCodeFixture() {
  const current = Date.parse("2026-10-19T10:00:00.000Z");
  const state = { now: current, actor: staff, reads: 0, redisCalls: 0, failAudit: false, redisDown: false, lostReply: false,
    audits: new Map(), codes: new Map(), row: { sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: "CASH",
      paymentStatus: "PAID", sessionStatus: "ACTIVE", paidAt: new Date(current - 60000), activatedAt: new Date(current - 60000),
      expiresAt: new Date(current + 86400000), tokenHash: null, reissueCount: 0 } };
  let queue = Promise.resolve();
  const store = { withCashCodeIssue: (actorId, sessionId, authorize, work) => {
    state.reads++;
    const result = queue.then(async () => {
      authorize(state.actor);
      const auditsBefore = structuredClone(state.audits);
      try {
        return await work(sessionId === state.row.sessionId ? state.row : undefined, {
          now: new Date(state.now), auditIssue: async entry => {
            if (state.failAudit) throw new Error("private SQL audit failure");
            if (!state.audits.has(entry.issueId)) state.audits.set(entry.issueId, { ...entry, actorId });
          },
        });
      } catch (error) { state.audits = auditsBefore; throw error; }
    });
    queue = result.catch(() => {}); return result;
  } };
  const redis = { ensureCashCode: async (id, candidate) => {
    state.redisCalls++;
    if (state.redisDown) throw new Error("private Redis URL");
    const old = state.codes.get(id);
    if (old && old.expiresAtMs > state.now) return { created: false, record: structuredClone(old) };
    state.codes.set(id, structuredClone(candidate));
    if (state.lostReply) { state.lostReply = false; throw new Error("reply lost after Redis write"); }
    return { created: true, record: structuredClone(candidate) };
  } };
  const service = new PaymentService(store, redis, { cashCodeTtlMs: () => getCashCodeTtlMs({}), now: () => state.now });
  return { service, store, redis, state, staff };
}
module.exports = { cashCodeFixture };
