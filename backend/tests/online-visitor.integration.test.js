const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
it("real Redis deduplicates browsers across workers, expires silent clients and rate limits without touching other data", { skip: process.env.RUN_REDIS_TESTS !== "1" }, async () => {
  const prefix = "tcv:test:online:" + randomUUID();
  const first = new RedisStore({ onlineVisitorPrefix: prefix });
  const second = new RedisStore({ onlineVisitorPrefix: prefix });
  const one = "a".repeat(64), two = "b".repeat(64), ip = "c".repeat(64);
  try {
    assert.equal((await first.countOnlineVisitors(120)).count, 0);
    await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? first : second).touchOnlineVisitor(one, ip, 120)));
    assert.equal((await first.countOnlineVisitors(120)).count, 1);
    await first.touchOnlineVisitor(two, ip, 120); assert.equal((await second.countOnlineVisitors(120)).count, 2);
    const clock = await first.countOnlineVisitors(120);
    await first.execute(client => client.zAdd(prefix, [{ score: clock.nowMs - 120001, value: one }]));
    assert.equal((await first.countOnlineVisitors(120)).count, 1);
    await first.touchOnlineVisitor(one, ip, 120); assert.equal((await second.countOnlineVisitors(120)).count, 2);
    await first.execute(client => client.set(prefix + ":rate:" + ip, "120", { EX: 60 }));
    assert.equal(await first.touchOnlineVisitor("d".repeat(64), ip, 120), "RATE_LIMITED");
    assert.equal((await first.countOnlineVisitors(120)).count, 2);
  } finally { await first.execute(client => client.del([prefix, prefix + ":rate:" + ip])); }
});
