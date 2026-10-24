const { randomUUID, randomBytes } = require("node:crypto");
const { PaymentService } = require("../../services/payment.service");

function memoryCashRedis(clock = Date.now) {
  const codes = new Map(), buckets = new Map();
  const state = { codes, buckets, protectionDown: false, inspectionDown: false, cleanupDown: false, reads: 0 };
  const redis = {
    consumeLookup: async (keys, config) => {
      if (state.protectionDown) throw new Error("private Redis protection failure");
      let allowed = true;
      keys.forEach((key, i) => {
        let bucket = buckets.get(key);
        if (!bucket || bucket.end <= clock()) { bucket = { count: 0, end: clock() + config.windowSeconds * 1000 }; buckets.set(key, bucket); }
        if (++bucket.count > (i === 0 ? config.ipLimit : config.sessionLimit)) allowed = false;
      });
      return allowed;
    },
    ensureCashCode: async (id, candidate) => {
      let record = codes.get(id), created = false;
      if (!record || record.expiresAtMs <= clock()) { record = structuredClone(candidate); codes.set(id, record); created = true; }
      return { created, record: structuredClone(record) };
    },
    inspectCashCode: async (id, shortedCode) => {
      state.reads++;
      if (state.inspectionDown) throw new Error("private Redis inspection failure");
      const record = codes.get(id);
      return record && record.expiresAtMs > clock() && record.shortedCode === shortedCode ? structuredClone(record) : null;
    },
    resolveCashCode: async shortedCode => {
      if (state.inspectionDown) throw new Error("private Redis inspection failure");
      const record = [...codes.values()].find(item => item.shortedCode === shortedCode && item.expiresAtMs > clock());
      return record ? structuredClone(record) : null;
    },
    removeCashCode: async (id, issueId) => {
      if (state.cleanupDown) throw new Error("private Redis cleanup failure");
      if (codes.get(id)?.issueId === issueId) { codes.delete(id); return 1; }
      return 0;
    },
  };
  return { redis, state };
}
function exchangeFixture() {
  const state = { now: Date.parse("2026-10-20T10:00:00Z"), failAudit: false, failPersist: false, lostCommitReply: false,
    expiredAtWrite: false, reads: 0, audits: [], row: null };
  const sessionId = randomUUID();
  state.row = { sessionId, paymentRef: randomUUID(), paymentMethod: "CASH", paymentStatus: "PAID", sessionStatus: "ACTIVE",
    paidAt: new Date(state.now - 60000), activatedAt: new Date(state.now - 60000), expiresAt: new Date(state.now + 86400000), tokenHash: null, reissueCount: 0 };
  const memory = memoryCashRedis(() => state.now);
  memory.state.codes.set(sessionId, { sessionId, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"), shortedCode: "012345", expiresAtMs: state.now + 600000 });
  let queue = Promise.resolve();
  const store = { withCashTokenExchange: (id, work) => {
    const result = queue.then(async () => {
      state.reads++;
      const before = structuredClone({ row: state.row, audits: state.audits });
      let committed = false;
      try {
        const response = await work(id === state.row?.sessionId ? state.row : undefined, {
          now: new Date(state.now), persist: async entry => {
            if (state.failPersist) throw new Error("private SQL failure");
            if (state.expiredAtWrite) return false;
            state.row.tokenHash = entry.tokenHash;
            if (state.failAudit) throw new Error("private audit failure");
            state.audits.push({ issueId: entry.issueId }); return true;
          },
        });
        committed = true;
        if (state.lostCommitReply) throw new Error("commit response lost");
        return response;
      } catch (error) {
        if (!committed) Object.assign(state, before);
        throw error;
      }
    });
    queue = result.catch(() => {}); return result;
  } };
  const service = new PaymentService(store, memory.redis);
  return { service, store, state, redis: memory.redis, redisState: memory.state, id: sessionId };
}
module.exports = { exchangeFixture, memoryCashRedis };
