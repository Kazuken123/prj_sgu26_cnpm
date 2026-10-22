const { it } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const HealthStore = require("../stores/health.store");
const RedisStore = require("../stores/redis.store");
const { randomUUID } = require("node:crypto");
const { HealthService } = require("../services/health.service");
if (process.env.RUN_REDIS_TESTS === "1") it("real Redis readiness succeeds, refuses an unreachable endpoint and recovers on the live endpoint", async () => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const store = new HealthStore({ query: async () => {} }, new RedisStore());
  const service = new HealthService(store);
  assert.equal((await service.ready()).redis, "ready");
  store.redis = new RedisStore({ url: `redis://127.0.0.1:${port}` });
  await assert.rejects(service.ready(), { status: 503, code: "REDIS_UNAVAILABLE" });
  store.redis = new RedisStore(); assert.equal((await service.ready()).status, "ok");
});
if (process.env.RUN_REDIS_TESTS === "1") it("development mode fails closed on real Redis outage, retains limits and reconnects after recovery", async () => {
  const previous = process.env.NODE_ENV;
  const key = "tcv_test_dev_readiness:" + randomUUID();
  const live = new RedisStore();
  try {
    process.env.NODE_ENV = "development";
    const probe = net.createServer(); await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const store = new HealthStore({ query: async () => {} }, new RedisStore({ url: `redis://127.0.0.1:${port}` }));
    const service = new HealthService(store);
    await assert.rejects(service.ready(), { status: 503, code: "REDIS_UNAVAILABLE" });
    await assert.rejects(store.redis.consumeLookup([key], { windowSeconds: 2, ipLimit: 1, sessionLimit: 1 }));
    store.redis = live;
    assert.equal((await service.ready()).redis, "ready");
    assert.equal(await live.consumeLookup([key], { windowSeconds: 2, ipLimit: 1, sessionLimit: 1 }), true);
    assert.equal(await live.consumeLookup([key], { windowSeconds: 2, ipLimit: 1, sessionLimit: 1 }), false);
  } finally {
    await live.execute(client => client.del(key));
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
