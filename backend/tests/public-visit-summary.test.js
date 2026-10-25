const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { MonitoringService } = require("../services/monitoring.service");
const now = new Date("2026-10-25T08:00:00.123Z");
const service = (rows = [{ total: "12" }], clock = now) => new MonitoringService({
  snapshot: work => work({ now: clock, activePaidVisits: async (paid, active) => {
    assert.equal(paid, "PAID"); assert.equal(active, "ACTIVE"); return rows;
  } })
});

test("public summary reuses paid/active counting and exposes only count and SQL timestamp, including a genuine zero", async () => {
  for (const total of [0, "12"]) assert.deepEqual(await service([{ total, sessionId: "PRIVATE", amount: "PRIVATE" }]).getPublicVisitSummary({}),
    { activePaidVisits: Number(total), generatedAt: now.toISOString() });
});

test("public summary rejects filters before accessing the database", async () => {
  const api = new MonitoringService({ snapshot: () => assert.fail("No query for invalid filters") });
  for (const query of [null, [], "bad", { from: "2026-01-01" }, { token: "private" }]) {
    await assert.rejects(api.getPublicVisitSummary(query), e => e.status === 400);
  }
});

test("public summary returns safe 503 for failed or malformed sources and recovers on the next request", async () => {
  for (const rows of [null, [], [{ total: -1 }], [{ total: null }], [{ total: true }], [{ total: "9007199254740992" }]]) {
    await assert.rejects(service(rows).getPublicVisitSummary(), e => e.status === 503 && e.code === "VISIT_SUMMARY_UNAVAILABLE");
  }
  await assert.rejects(service([{ total: 1 }], new Date("bad")).getPublicVisitSummary(), e => e.status === 503);
  let down = true;
  const api = new MonitoringService({ snapshot: work => {
    if (down) throw Error("PRIVATE_SQL_PASSWORD");
    return work({ now, activePaidVisits: async () => [{ total: 3 }] });
  } });
  await assert.rejects(api.getPublicVisitSummary(), e => e.status === 503 && !JSON.stringify(e).includes("PRIVATE_SQL"));
  down = false;
  assert.equal((await api.getPublicVisitSummary()).activePaidVisits, 3);
});

test("public HTTP aggregate needs no token, forbids filters, preserves private route authentication and safe failures", async t => {
  const api = service();
  const server = http.createServer(require("../server").createApp({ monitoringService: api }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = path => fetch(base + path, { signal: AbortSignal.timeout(5000) });
  let response = await request("/api/visits/summary");
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { data: { activePaidVisits: 12, generatedAt: now.toISOString() } });
  assert.equal((await request("/api/visits/summary?from=bad")).status, 400);
  assert.equal((await request("/api/admin/monitoring")).status, 401);
  assert.equal((await request("/api/visits/me")).status, 401);
  api.store.snapshot = () => { throw Error("PRIVATE_SQL_PASSWORD"); };
  response = await request("/api/visits/summary");
  assert.equal(response.status, 503);
  const error = await response.json();
  assert.equal(error.code, "VISIT_SUMMARY_UNAVAILABLE");
  assert.ok(!JSON.stringify(error).includes("PRIVATE_SQL"));
});
