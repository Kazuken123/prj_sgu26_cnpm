const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { HealthService } = require("../services/health.service");
const HealthStore = require("../stores/health.store");
const RedisStore = require("../stores/redis.store");
it("readiness needs both SQL and Redis and names both ready dependencies", async () => {
  const calls = [];
  const service = new HealthService({ ping: async () => calls.push("sql"), pingRedis: async () => calls.push("redis") });
  assert.deepEqual(await service.ready(), { status: "ok", service: "food-tour-api", database: "ready", redis: "ready" });
  assert.deepEqual(calls, ["sql", "redis"]);
});
it("MySQL failure preserves DATABASE_UNAVAILABLE and cannot produce a healthy response", async () => {
  const service = new HealthService({ ping: async () => { throw new Error("private SQL credentials"); }, pingRedis: () => assert.fail("SQL already failed") });
  await assert.rejects(service.ready(), error => error.status === 503 && error.code === "DATABASE_UNAVAILABLE" && !error.message.includes("private"));
});
it("health Store keeps existing SQL schema probes/timeouts and delegates Redis through its Store", async () => {
  const queries = []; let pings = 0;
  const store = new HealthStore({ query: async query => queries.push(query) }, { ping: async () => { pings++; } });
  await store.ping(); await store.pingRedis();
  assert.equal(queries.length, 16); assert.ok(queries.every(query => query.timeout === 2000));
  assert.equal(new Set(queries.map(query => query.sql.match(/FROM (\w+)/)[1])).size, 16);
  assert.match(queries[1].sql, /rotated_token_hashes/); assert.match(queries[7].sql, /request_key_hash/); assert.equal(pings, 1);
});
it("each newly required table fails readiness safely and recovery restores HTTP 200", async t => {
  let missing = null;
  const store = new HealthStore({ query: async ({ sql }) => { if (missing && sql.includes(`FROM ${missing} `)) throw Error("private SQL connection"); } }, { ping: async () => {} });
  const server = http.createServer(require("../server").createApp({ healthService: new HealthService(store) }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/health/ready`;
  assert.equal((await fetch(url)).status, 200);
  for (const table of ["VISIT_SESSIONS", "AUDIOS", "TOURS", "TOUR_POIS", "KNOWLEDGE_DOCUMENTS", "KNOWLEDGE_CHUNKS", "CHAT_LOGS", "BUNDLE_ACCESS_LOGS"]) {
    missing = table; const response = await fetch(url);
    assert.equal(response.status, 503); assert.equal((await response.json()).code, "DATABASE_UNAVAILABLE");
    missing = null; assert.equal((await fetch(url)).status, 200);
  }
});
it("a stalled SQL driver cannot hold readiness beyond its overall deadline", async () => {
  let calls = 0;
  const store = new HealthStore({ query: () => { calls++; return new Promise(() => {}); } }, { ping: async () => {} });
  const started = Date.now();
  await assert.rejects(store.ping(), /READINESS_TIMEOUT/);
  assert.ok(Date.now() - started < 7000); assert.equal(calls, 1);
});
it("Redis PING requires PONG, uses bounded no-reconnect settings and closes each client", async () => {
  for (const reply of ["PONG", "OK"]) {
    let config; const client = { isOpen: false, on: () => {}, connect: async () => { client.isOpen = true; },
      ping: async () => reply, disconnect: async () => { client.isOpen = false; } };
    const store = new RedisStore({ clientFactory: options => { config = options; return client; } });
    if (reply === "PONG") await store.ping(); else await assert.rejects(store.ping(), /INVALID_REDIS_PING_REPLY/);
    assert.equal(config.socket.connectTimeout, 1000); assert.equal(config.socket.reconnectStrategy, false);
    assert.equal(config.disableOfflineQueue, true); assert.equal(client.isOpen, false);
  }
});
it("stalled Redis PING fails within the existing finite deadline and disconnects", async () => {
  const client = { isOpen: true, on: () => {}, connect: async () => {}, ping: async () => new Promise(() => {}),
    disconnect: async () => { client.isOpen = false; } };
  await assert.rejects(new RedisStore({ clientFactory: () => client }).ping(), /REDIS_TIMEOUT/);
  assert.equal(client.isOpen, false);
});
it("readiness HTTP follows Redis up/down/up without restart and never exposes connection secrets", async t => {
  let down = false;
  const service = new HealthService({ ping: async () => {}, pingRedis: async () => { if (down) throw new Error("redis://user:private-password@host"); } });
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ healthService: service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [outage, expected] of [[false, 200], [true, 503], [false, 200]]) {
    down = outage; const response = await fetch(base + "/health/ready"), body = await response.json();
    assert.equal(response.status, expected);
    if (outage) assert.deepEqual(body, { code: "REDIS_UNAVAILABLE", error: "Redis chưa sẵn sàng." });
    else assert.equal(body.redis, "ready");
    assert.equal(JSON.stringify(body).includes("private-password"), false);
    assert.equal((await fetch(base + "/health")).status, 200);
  }
});
