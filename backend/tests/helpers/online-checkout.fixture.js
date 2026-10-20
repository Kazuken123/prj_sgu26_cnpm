const { PaymentService } = require("../../services/payment.service");
const MockGateway = require("../../adapters/mock-gateway");
function memoryOnlineRedis(clock = Date.now) {
  const state = { codes: new Map(), down: false, lostReply: false, calls: [] };
  const redis = { ensureOnlineCode: async (id, candidate, allowCreate) => {
    state.calls.push({ id, allowCreate });
    if (state.down) throw new Error("private Redis URL");
    let record = state.codes.get(id);
    if (record && record.expiresAtMs <= clock()) { state.codes.delete(id); record = undefined; }
    if (candidate.expiresAtMs <= clock()) throw new Error("expired");
    if (record) {
      if (record.sessionId !== id || record.issueId !== candidate.issueId || record.expiresAtMs !== candidate.expiresAtMs) throw new Error("corrupt");
      return structuredClone(record);
    }
    if (!allowCreate) return null;
    record = structuredClone(candidate); state.codes.set(id, record);
    if (state.lostReply) { state.lostReply = false; throw new Error("Redis reply lost"); }
    return structuredClone(record);
  } };
  return { redis, state };
}
function onlineFixture() {
  const state = { now: Date.now(), rows: new Map(), preparations: new Map(), ready: new Set(), audits: [], gatewayCalls: [],
    failPrepare: false, failReady: false, failCommit: false, lostCommitReply: false, reads: 0 };
  let queue = Promise.resolve();
  const store = {
    initialize: async ({ hash, actorId, build }) => {
      let row = state.rows.get(hash);
      if (row) return { record: structuredClone(row), created: false };
      row = { ...build(), createdBy: actorId, currency: "VND", sessionStatus: "PENDING", paymentStatus: "PENDING",
        paidAt: null, confirmedBy: null, activatedAt: null, expiresAt: null, tokenHash: null, reissueCount: 0 };
      state.rows.set(hash, row); return { record: structuredClone(row), created: true };
    },
    withOnlineCheckout: (id, hash, work) => {
      const result = queue.then(async () => {
        state.reads++;
        const before = structuredClone({ preparations: state.preparations, ready: state.ready, audits: state.audits });
        let committed = false;
        try {
          const row = state.rows.get(hash), preparation = state.preparations.get(id) ?? null;
          const response = await work(row?.sessionId === id ? structuredClone(row) : undefined, {
            now: new Date(state.now), preparation: structuredClone(preparation), ready: preparation ? state.ready.has(preparation.issueId) : false,
            currentTime: async () => new Date(state.now),
            prepare: async entry => {
              if (state.failPrepare) throw new Error("private SQL prepare failed");
              state.preparations.set(id, structuredClone(entry)); state.audits.push({ action: "PREPARE_ONLINE_CHECKOUT", ...entry });
            },
            markReady: async () => {
              if (state.failReady) throw new Error("private SQL ready audit failed");
              state.ready.add(preparation.issueId); state.audits.push({ action: "ONLINE_CHECKOUT_READY", issueId: preparation.issueId });
            },
          });
          if (state.failCommit) throw new Error("commit failed before persistence");
          committed = true;
          if (state.lostCommitReply && state.ready.size) { state.lostCommitReply = false; throw new Error("commit reply lost"); }
          return response;
        } catch (error) { if (!committed) Object.assign(state, before); throw error; }
      });
      queue = result.catch(() => {}); return result;
    },
    getMockCheckout: async ref => structuredClone([...state.rows.values()].find(row => row.paymentRef === ref)),
  };
  const memory = memoryOnlineRedis(() => state.now);
  const gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), now: () => state.now });
  const original = gateway.createCheckout.bind(gateway);
  gateway.createCheckout = (...args) => { state.gatewayCalls.push(structuredClone(args[0])); return original(...args); };
  const service = new PaymentService(store, memory.redis, { gateway, now: () => state.now, price: () => "50000.00" });
  return { state, store, service, gateway, redis: memory.redis, redisState: memory.state };
}
module.exports = { onlineFixture, memoryOnlineRedis };
