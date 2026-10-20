const { it } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const HealthStore = require("../stores/health.store");
const RedisStore = require("../stores/redis.store");
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
