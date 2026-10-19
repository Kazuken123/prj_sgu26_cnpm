const { it, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
it("Redis Store uses one atomic script, sets bounded connection options and releases its client", async () => {
  const calls = []; let options;
  const client = { isOpen: true, on: () => {}, connect: async () => calls.push("connect"),
    eval: async (script, args) => { calls.push({ script, args }); return 0; },
    disconnect: async () => { calls.push("disconnect"); client.isOpen = false; } };
  const store = new RedisStore({ clientFactory: config => { options = config; return client; } });
  assert.equal(await store.consumeLookup(["ip", "session"], { windowSeconds: 60, ipLimit: 2, sessionLimit: 1 }), false);
  assert.equal(options.socket.reconnectStrategy, false); assert.equal(options.disableOfflineQueue, true);
  assert.deepEqual(calls[1].args, { keys: ["ip", "session"], arguments: ["60", "2", "1"] });
  assert.match(calls[1].script, /EXPIRE/); assert.equal(calls.at(-1), "disconnect");
});
it("Redis errors and command timeouts propagate; open sockets are closed", async () => {
  for (const mode of ["error", "timeout"]) {
    const client = { isOpen: true, on: () => {}, connect: async () => {},
      eval: async () => { if (mode === "error") throw new Error("unavailable"); return new Promise(() => {}); },
      disconnect: async () => { client.isOpen = false; } };
    await assert.rejects(new RedisStore({ clientFactory: () => client }).consumeLookup(["ip", "session"], { windowSeconds: 1, ipLimit: 1, sessionLimit: 1 }));
    assert.equal(client.isOpen, false);
  }
});
describe("Real Redis atomic lookup rate limits", { skip: process.env.RUN_REDIS_TESTS !== "1" }, () => {
  let admin, store;
  const prefix = "tcv_test_lookup:" + randomUUID() + ":";
  const tracked = new Set();
  const keys = (...suffixes) => suffixes.map(suffix => { const key = prefix + suffix; tracked.add(key); return key; });
  before(async () => {
    admin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
    admin.on("error", () => {}); await admin.connect(); store = new RedisStore();
  });
  after(async () => {
    if (admin?.isOpen) { if (tracked.size) await admin.del([...tracked]); await admin.disconnect(); }
  });
  it("20 simultaneous consumes allow exactly 5 and every counter has TTL", async () => {
    const pair = keys("concurrent-ip", "concurrent-session");
    const config = { windowSeconds: 10, ipLimit: 5, sessionLimit: 5 };
    const outcomes = await Promise.all(Array.from({ length: 20 }, () => store.consumeLookup(pair, config)));
    assert.equal(outcomes.filter(Boolean).length, 5);
    for (const key of pair) { assert.equal(await admin.get(key), "20"); assert.ok(await admin.ttl(key) > 0); }
  });
  it("rotating sessions cannot bypass IP limit; changing IP cannot bypass session limit", async () => {
    const config = { windowSeconds: 10, ipLimit: 1, sessionLimit: 1 };
    assert.equal(await store.consumeLookup(keys("one-ip", "first-session"), config), true);
    assert.equal(await store.consumeLookup(keys("one-ip", "second-session"), config), false);
    assert.equal(await store.consumeLookup(keys("second-ip", "first-session"), config), false);
  });
  it("expired buckets allow a new lookup without manual deletion", async () => {
    const pair = keys("expire-ip", "expire-session"), config = { windowSeconds: 1, ipLimit: 1, sessionLimit: 1 };
    assert.equal(await store.consumeLookup(pair, config), true);
    assert.equal(await store.consumeLookup(pair, config), false);
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await store.consumeLookup(pair, config), true);
  });
});
