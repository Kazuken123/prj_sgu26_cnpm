const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { OnlineVisitorService } = require("../services/online-visitor.service");
const AppError = require("../utils/app-error");
const actor = { userId: 1, role: "ADMIN", status: "ACTIVE" };
it("online heartbeat accepts only one UUID, stores hashes and never needs payment or GPS", async () => {
  let call;
  const service = new OnlineVisitorService({ touchOnlineVisitor: async (...args) => { call = args; return "ACCEPTED"; } });
  const id = randomUUID();
  assert.deepEqual(await service.heartbeat({ visitorId: id }, "127.0.0.1"), { accepted: true, windowSeconds: 120 });
  assert.match(call[0], /^[a-f0-9]{64}$/); assert.match(call[1], /^[a-f0-9]{64}$/); assert.equal(call[2], 120);
  for (const input of [null, [], {}, { visitorId: "bad" }, { visitorId: [id] }, { visitorId: id, role: "ADMIN" }]) {
    await assert.rejects(service.heartbeat(input, "127.0.0.1"), e => e.status === 400);
  }
});
it("online count rejects STAFF/guests before accessing Redis, validates counts and never invents a zero", async () => {
  let calls = 0, down = false;
  const service = new OnlineVisitorService({ countOnlineVisitors: async () => { calls++; if (down) throw Error("private Redis URL"); return { count: 4, nowMs: 1792990000000 }; } });
  for (const user of [null, { ...actor, role: "STAFF" }, { ...actor, status: "LOCKED" }]) await assert.rejects(service.summary(user), e => [401, 403].includes(e.status));
  await assert.rejects(service.summary(actor, { count: "fake" }), e => e.status === 400); assert.equal(calls, 0);
  assert.equal((await service.summary(actor)).count, 4);
  down = true; await assert.rejects(service.summary(actor), e => e.status === 503 && !e.message.includes("private"));
  down = false; assert.equal((await service.summary(actor)).count, 4);
  for (const count of [-1, null, "4", NaN, 10001]) {
    const invalid = new OnlineVisitorService({ countOnlineVisitors: async () => ({ count, nowMs: Date.now() }) });
    await assert.rejects(invalid.summary(actor), e => e.status === 503);
  }
});
it("heartbeat rate limit and Redis outage return bounded safe errors", async () => {
  const service = result => new OnlineVisitorService({ touchOnlineVisitor: async () => { if (result === "THROW") throw Error("secret"); return result; } });
  for (const result of ["RATE_LIMITED", "UNAVAILABLE", "THROW"]) await assert.rejects(service(result).heartbeat({ visitorId: randomUUID() }, "127.0.0.1"), e => e.status === (result === "RATE_LIMITED" ? 429 : 503) && !e.message.includes("secret"));
});
it("HTTP wires public heartbeat separately from ADMIN-only count and never exposes identities", async t => {
  const service = new OnlineVisitorService({ touchOnlineVisitor: async () => "ACCEPTED", countOnlineVisitors: async () => ({ count: 4, nowMs: Date.now() }) });
  const auth = { authenticate: async token => {
    if (!["admin-test", "staff-test"].includes(token)) throw new AppError(401, "INVALID_ACCESS_TOKEN", "Sai token.");
    return { ...actor, role: token === "admin-test" ? "ADMIN" : "STAFF" };
  } };
  const app = require("../server").createApp({ authService: auth, onlineVisitorService: service });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [token, expected] of [[null, 401], ["guest-test", 401], ["staff-test", 403], ["admin-test", 200]]) {
    const response = await fetch(base + "/api/admin/online-visitors", { headers: token ? { Authorization: "Bearer " + token } : {} });
    assert.equal(response.status, expected);
    if (expected === 200) { const data = (await response.json()).data; assert.equal(data.count, 4); assert.deepEqual(Object.keys(data).sort(), ["count", "generatedAt", "measurement", "windowSeconds"]); }
  }
  const heartbeat = await fetch(base + "/api/presence/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: randomUUID() }) });
  assert.equal(heartbeat.status, 200); assert.deepEqual((await heartbeat.json()).data, { accepted: true, windowSeconds: 120 });
});
