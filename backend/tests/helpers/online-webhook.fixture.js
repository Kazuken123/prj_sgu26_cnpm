const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../../services/payment.service");
const MockGateway = require("../../adapters/mock-gateway");
const secret = "mock-webhook-test-only-secret-at-least-32-bytes";
function webhookFixture() {
  const state = { now: Date.now(), prepared: true, reads: 0, audits: [], failPayment: false, failVisit: false, failAudit: false,
    lostReply: false, row: { sessionId: randomUUID(), paymentRef: randomUUID(), amount: "50000.00", currency: "VND",
      paymentMethod: "ONLINE", paymentStatus: "PENDING", sessionStatus: "PENDING", paidAt: null, confirmedBy: null,
      activatedAt: null, expiresAt: null, tokenHash: null, reissueCount: 0 } };
  let queue = Promise.resolve();
  const store = { withOnlineWebhook: (ref, work) => {
    const result = queue.then(async () => {
      state.reads++;
      const before = structuredClone({ row: state.row, audits: state.audits }); let committed = false;
      try {
        const response = await work(ref === state.row.paymentRef ? structuredClone(state.row) : undefined, {
          checkoutPrepared: state.prepared, currentTime: async () => new Date(state.now),
          persist: async ({ status, paidAt = null, expiresAt = null }) => {
            if (state.failPayment) throw new Error("private payment SQL error");
            const previousStatus = state.row.paymentStatus;
            state.row.paymentStatus = status; state.row.paidAt = paidAt;
            if (status === "PAID") {
              if (state.failVisit) throw new Error("private visit SQL error");
              Object.assign(state.row, { sessionStatus: "ACTIVE", activatedAt: paidAt, expiresAt });
            }
            if (state.failAudit) throw new Error("private audit SQL error");
            state.audits.push({ status, previousStatus, userId: null });
          },
        });
        committed = true;
        if (state.lostReply) { state.lostReply = false; throw new Error("commit response lost"); }
        return response;
      } catch (error) { if (!committed) Object.assign(state, before); throw error; }
    });
    queue = result.catch(() => {}); return result;
  } };
  const gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), webhookSecret: () => secret });
  const service = new PaymentService(store, {}, { gateway });
  const payload = (status = "SUCCESS", overrides = {}) => ({ paymentRef: state.row.paymentRef, amount: "50000.00", currency: "VND", status, ...overrides });
  const send = (status = "SUCCESS", overrides = {}) => {
    const event = gateway.createWebhook(payload(status, overrides)); return service.processMockWebhook(event.body, event.signature);
  };
  return { state, store, service, gateway, send, payload, secret };
}
module.exports = { webhookFixture, secret };
