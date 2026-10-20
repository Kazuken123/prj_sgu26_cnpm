const { it, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
const candidate = (sessionId, ms = 10000) => ({ sessionId, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"), expiresAtMs: Date.now() + ms });
it("online Redis Store uses one atomic TTL script and validates exact checkout identity and deadline", async () => {
  const id = randomUUID(), record = candidate(id); let received, reply = [1, JSON.stringify(record)];
  const client = { isOpen: true, on: () => {}, connect: async () => { client.isOpen = true; },
    disconnect: async () => { client.isOpen = false; }, eval: async (script, args) => { received = { script, args }; return reply; } };
  const store = new RedisStore({ clientFactory: () => client, onlineCodePrefix: "test:" });
  assert.deepEqual(await store.ensureOnlineCode(id, record, true), record);
  assert.deepEqual(received.args.keys, ["test:" + id]); assert.equal(received.args.arguments[1], "1");
  assert.match(received.script, /TIME/); assert.match(received.script, /PTTL/); assert.match(received.script, /'PX'/);
  reply = [0]; assert.equal(await store.ensureOnlineCode(id, record, false), null); assert.equal(received.args.arguments[1], "0");
  assert.equal(client.isOpen, false);
});
it("online Redis Store refuses unavailable, corrupt, mismatched and invalid code replies", async () => {
  const id = randomUUID(), record = candidate(id);
  for (const reply of [[-1], [-2], "bad", [1, "not-json"], [1, JSON.stringify({ ...record, sessionId: randomUUID() })],
    [1, JSON.stringify({ ...record, issueId: randomUUID() })], [1, JSON.stringify({ ...record, expiresAtMs: record.expiresAtMs + 1 })],
    [1, JSON.stringify({ ...record, authCode: "bad" })]]) {
    const client = { isOpen: true, on: () => {}, connect: async () => {}, eval: async () => reply, disconnect: async () => { client.isOpen = false; } };
    await assert.rejects(new RedisStore({ clientFactory: () => client }).ensureOnlineCode(id, record, true));
    assert.equal(client.isOpen, false);
  }
});
it("online code inspection compares opaque secrets, never consumes on read, and cleanup compares issue ID", async () => {
  const id = randomUUID(), record = candidate(id); let reply = [1, JSON.stringify(record)], received;
  const client = { isOpen: true, on: () => {}, connect: async () => { client.isOpen = true; }, disconnect: async () => { client.isOpen = false; },
    eval: async (script, args) => { received = { script, args }; return reply; } };
  const store = new RedisStore({ clientFactory: () => client, onlineCodePrefix: "test:" });
  assert.deepEqual(await store.inspectOnlineCode(id, record.authCode), record);
  assert.deepEqual(received.args.arguments, [id]); assert.equal(received.script.includes("'DEL'"), false);
  assert.equal(await store.inspectOnlineCode(id, "0".repeat(64)), null);
  for (const bad of [[-1], [1, "bad-json"], [1, JSON.stringify({ ...record, sessionId: randomUUID() })], [1, JSON.stringify({ ...record, authCode: "bad" })]]) {
    reply = bad; await assert.rejects(store.inspectOnlineCode(id, record.authCode));
  }
  await assert.rejects(store.inspectOnlineCode(id, "short"));
  reply = 1; assert.equal(await store.removeOnlineCode(id, record.issueId), 1);
  assert.deepEqual(received.args.keys, ["test:" + id]); assert.deepEqual(received.args.arguments, [record.issueId]); assert.match(received.script, /record.issueId/);
});
describe("Real Redis online code fixed deadline and no replacement after issuance", { skip: process.env.RUN_REDIS_TESTS !== "1" }, () => {
  const prefix = "tcv_test_online_lua:" + randomUUID() + ":", tracked = new Set(); let admin, store;
  const id = () => { const value = randomUUID(); tracked.add(value); return value; };
  before(async () => {
    admin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
    admin.on("error", () => {}); await admin.connect(); store = new RedisStore({ onlineCodePrefix: prefix });
  });
  after(async () => { if (admin?.isOpen) { if (tracked.size) await admin.del([...tracked].map(value => prefix + value)); await admin.disconnect(); } });
  it("20 parallel setup candidates share one secret; issued retries keep the original TTL", async () => {
    const session = id(), record = candidate(session);
    const results = await Promise.all(Array.from({ length: 20 }, () => store.ensureOnlineCode(session, { ...record, authCode: randomBytes(32).toString("hex") }, true)));
    assert.equal(new Set(results.map(row => row.authCode)).size, 1);
    const ttl = await admin.pTTL(prefix + session); assert.ok(ttl > 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(await store.ensureOnlineCode(session, record, false), results[0]);
    assert.ok(await admin.pTTL(prefix + session) < ttl);
  });
  it("lost or expired issued records cannot be recreated; an expired preparation cannot start anew", async () => {
    const session = id(), record = candidate(session, 1000);
    await store.ensureOnlineCode(session, record, true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await admin.get(prefix + session), null);
    assert.equal(await store.ensureOnlineCode(session, { ...record, expiresAtMs: Date.now() + 10000 }, false), null);
    assert.equal(await admin.get(prefix + session), null);
    await assert.rejects(store.ensureOnlineCode(session, record, true));
    const missing = id(); assert.equal(await store.ensureOnlineCode(missing, candidate(missing), false), null);
    assert.equal(await admin.get(prefix + missing), null);
  });
  it("missing TTL, corrupt state, another issue ID or deadline never overwrites a checkout", async () => {
    const session = id(), record = candidate(session);
    await admin.set(prefix + session, JSON.stringify(record));
    await assert.rejects(store.ensureOnlineCode(session, record, true));
    await admin.set(prefix + session, "broken-json", { PX: 10000 });
    await assert.rejects(store.ensureOnlineCode(session, record, true));
    await admin.del(prefix + session); await store.ensureOnlineCode(session, record, true);
    for (const changed of [{ ...record, issueId: randomUUID() }, { ...record, expiresAtMs: record.expiresAtMs + 1000 }]) {
      await assert.rejects(store.ensureOnlineCode(session, changed, true));
      assert.deepEqual(JSON.parse(await admin.get(prefix + session)), record);
    }
  });
  it("read validates exact session/code, preserves TTL and compare-delete cannot erase another issue", async () => {
    const session = id(), record = candidate(session); await store.ensureOnlineCode(session, record, true);
    const ttl = await admin.pTTL(prefix + session);
    assert.equal(await store.inspectOnlineCode(session, "0".repeat(64)), null);
    assert.equal(await store.inspectOnlineCode(id(), record.authCode), null);
    assert.deepEqual(await store.inspectOnlineCode(session, record.authCode), record);
    assert.ok(await admin.pTTL(prefix + session) <= ttl);
    assert.equal(await store.removeOnlineCode(session, randomUUID()), 0);
    assert.deepEqual(await store.inspectOnlineCode(session, record.authCode), record);
    assert.equal(await store.removeOnlineCode(session, record.issueId), 1);
    assert.equal(await store.inspectOnlineCode(session, record.authCode), null);
  });
  it("inspection rejects missing TTL/corrupt state and recognizes actual expiry without consumption", async () => {
    const session = id(), record = candidate(session);
    await admin.set(prefix + session, JSON.stringify(record)); await assert.rejects(store.inspectOnlineCode(session, record.authCode));
    await admin.set(prefix + session, "bad-json", { PX: 10000 }); await assert.rejects(store.inspectOnlineCode(session, record.authCode));
    await admin.del(prefix + session);
    await store.ensureOnlineCode(session, { ...record, expiresAtMs: Date.now() + 1000 }, true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await store.inspectOnlineCode(session, record.authCode), null);
  });
});
