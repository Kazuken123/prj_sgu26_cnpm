const { it } = require("node:test");
const assert = require("node:assert/strict");
const { MonitoringService } = require("../services/monitoring.service");
const { filters, windowAt } = require("../services/monitoring.validation");
const actor = { userId: 1, role: "ADMIN", status: "ACTIVE" };
const health = { ping: async () => {}, pingRedis: async () => {} };
function reader(overrides = {}) {
  return { now: new Date("2026-10-21T12:00:00Z"), activePaidVisits: async () => [{ total: 0 }], paidPayments: async () => [],
    bundleTotals: async () => [{ total: 0, uniqueSessions: 0 }], bundleLanguages: async () => [], jobs: async () => [], audios: async () => [], chatbot: async () => [], ...overrides };
}
const service = (overrides, checks = health) => new MonitoringService({ snapshot: work => work(reader(overrides)) }, checks);
it("monitoring default is exactly 24 hours using database UTC clock; explicit window is preserved", () => {
  const now = new Date("2026-10-21T12:00:00.123Z");
  assert.deepEqual(windowAt(filters(), now), { from: new Date("2026-10-20T12:00:00.123Z"), to: now });
  const selected = filters({ from: "2024-02-29T00:00:00Z", to: "2024-03-01T00:00:00.001Z" });
  assert.deepEqual(windowAt(selected, now), selected);
});
it("monitoring rejects ambiguous, malformed, repeated, reversed or empty time filters", () => {
  for (const input of [null, [], { extra: 1 }, { from: "2026-01-01T00:00:00Z" }, { to: "2026-01-01T00:00:00Z" },
    ...["2025-02-29T00:00:00Z", "2024-02-30T00:00:00Z", "2026-01-01", "2026-01-01T24:00:00Z", "2026-01-01T00:00:00+07:00", "0999-01-01T00:00:00Z", ["2026-01-01T00:00:00Z"]]
      .map(from => ({ from, to: "2026-03-01T00:00:00Z" })),
    { from: "2026-03-01T00:00:00Z", to: "2026-03-01T00:00:00Z" }, { from: "2026-04-01T00:00:00Z", to: "2026-03-01T00:00:00Z" }]) {
    assert.throws(() => filters(input), e => e.status === 400 && e.code === "VALIDATION_ERROR");
  }
});
it("monitoring rejects unauthorized actors and invalid filters before accessing sources", async () => {
  let calls = 0;
  const api = new MonitoringService({ snapshot: () => { calls++; } }, { ping: () => { calls++; }, pingRedis: () => { calls++; } });
  for (const user of [null, { ...actor, userId: "1" }, { ...actor, role: "STAFF" }, { ...actor, status: "LOCKED" }, { ...actor, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(api.get(user), e => [401, 403].includes(e.status));
  }
  await assert.rejects(api.get(actor, { to: "bad" }), e => e.status === 400); assert.equal(calls, 0);
});
it("empty sources including logged chatbot questions are available zeros", async () => {
  const data = await service().get(actor);
  assert.equal(data.health.readiness.status, "READY"); assert.equal(data.window.interval, "[from,to)");
  assert.equal(data.metrics.activePaidVisits.value, 0);
  assert.deepEqual(data.metrics.paidPayments.value, { count: 0, totals: [] });
  assert.deepEqual(data.metrics.bundleAccess.value, { total: 0, uniqueSessions: 0, byLanguage: [] });
  assert.equal(data.metrics.contentJobs.value.total, 0); assert.equal(data.metrics.audioRecords.value.total, 0);
  assert.equal(data.metrics.chatbot.status, "AVAILABLE");
  assert.deepEqual(data.metrics.chatbot.value, { total: 0, byStatus: { SUCCESS: 0, NO_CONTEXT: 0, FAILED: 0 } });
});
it("revenue retains exact decimal strings by currency and does not add different currencies", async () => {
  const data = await service({ paidPayments: async () => [{ currency: "USD", total: 2, amount: "12345678901234567890.12" }, { currency: "VND", total: "3", amount: "150000.00" }] }).get(actor);
  assert.deepEqual(data.metrics.paidPayments.value, { count: 5, totals: [{ currency: "USD", amount: "12345678901234567890.12" }, { currency: "VND", amount: "150000.00" }] });
});
it("an unavailable source remains null, never zero; other current metrics stay available", async () => {
  for (const missing of ["activePaidVisits", "paidPayments", "bundleTotals", "bundleLanguages", "jobs", "audios", "chatbot"]) {
    const data = await service({ [missing]: async () => null }).get(actor);
    const key = ({ bundleTotals: "bundleAccess", bundleLanguages: "bundleAccess", jobs: "contentJobs", audios: "audioRecords" })[missing] || missing;
    assert.equal(data.metrics[key].status, "UNAVAILABLE"); assert.equal(data.metrics[key].value, null); assert.equal(data.metrics[key].updatedAt, null);
    assert.equal(data.health.readiness.status, "NOT_READY");
  }
});
it("dependency failure and recovery are checked anew without hiding available statistics", async () => {
  let down = false;
  const api = service({ jobs: async () => [{ status: "FAILED", total: 2 }] }, { ...health, pingRedis: async () => { if (down) throw Error("private connection"); } });
  for (const state of [false, true, false]) {
    down = state; const data = await api.get(actor);
    assert.equal(data.health.redis.status, state ? "UNAVAILABLE" : "READY"); assert.equal(data.health.readiness.status, state ? "NOT_READY" : "READY");
    assert.equal(data.metrics.contentJobs.value.total, 2); assert.ok(!JSON.stringify(data).includes("private connection"));
  }
  assert.equal((await service({}, { ...health, ping: async () => { throw Error("SQL down"); } }).get(actor)).health.database.status, "UNAVAILABLE");
});
it("bad counts, unknown states, money and clocks produce safe 503 instead of misleading data", async () => {
  for (const overrides of [
    ...[null, true, "", -1, 1.5, "9007199254740992"].map(total => ({ activePaidVisits: async () => [{ total }] })),
    { jobs: async () => [{ status: "UNKNOWN", total: 1 }] }, { chatbot: async () => [{ status: "UNKNOWN", total: 1 }] }, { paidPayments: async () => [{ currency: "VND", amount: 1.5, total: 1 }] },
    { now: new Date("bad") }, { audios: async () => { throw Error("SQL private detail"); } },
  ]) await assert.rejects(service(overrides).get(actor), e => e.status === 503 && e.code === "MONITORING_UNAVAILABLE" && !e.message.includes("private"));
});
