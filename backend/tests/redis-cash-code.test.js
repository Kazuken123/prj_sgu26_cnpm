const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
function candidate(id, milliseconds = 10000) {
  return { sessionId: id, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"), shortedCode: "012345", expiresAtMs: Date.now() + milliseconds };
}
it("Redis cash code Store uses one atomic script, enforces record shape and disconnects its client", async () => {
  const id = randomUUID(), record = candidate(id); let received;
  const client = { isOpen: true, on: () => {}, connect: async () => {}, disconnect: async () => { client.isOpen = false; },
    eval: async (script, args) => { received = { script, args }; return [1, JSON.stringify(record)]; } };
  const store = new RedisStore({ clientFactory: () => client, cashCodePrefix: "test:" });
  const result = await store.ensureCashCode(id, record, Date.now() + 60000);
  assert.equal(result.created, true); assert.deepEqual(result.record, record); assert.equal(client.isOpen, false);
  assert.deepEqual(received.args.keys, ["test:" + id]); assert.match(received.script, /PTTL/); assert.match(received.script, /TIME/);
  assert.match(received.script, /'PX'/);
});
it("Redis cash code Store refuses expired, corrupt or cross-session replies without returning their contents", async () => {
  const id = randomUUID(), record = candidate(id), end = Date.now() + 60000;
  for (const reply of [[-1], [-2], [1, "not-json"], [1, JSON.stringify({ ...record, sessionId: randomUUID() })],
    [0, JSON.stringify({ ...record, authCode: "bad" })], [0, JSON.stringify({ ...record, expiresAtMs: end + 1 })]]) {
    const client = { isOpen: true, on: () => {}, connect: async () => {}, eval: async () => reply,
      disconnect: async () => { client.isOpen = false; } };
    await assert.rejects(new RedisStore({ clientFactory: () => client }).ensureCashCode(id, record, end));
    assert.equal(client.isOpen, false);
  }
});
describe("Real Redis cash-code atomic creation, expiry and retry", { skip: process.env.RUN_REDIS_TESTS !== "1" }, () => {
  const prefix = "tcv_test_cash_lua:" + randomUUID() + ":", tracked = new Set();
  let admin, store;
  const id = () => { const value = randomUUID(); tracked.add(value); return value; };
  before(async () => {
    admin = require("redis").createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
    admin.on("error", () => {}); await admin.connect(); store = new RedisStore({ cashCodePrefix: prefix });
  });
  after(async () => { if (admin?.isOpen) { if (tracked.size) await admin.del([...tracked].map(value => prefix + value)); await admin.disconnect(); } });
  it("24 parallel candidates for one session have one winner and a real expiring auth-code mapping", async () => {
    const session = id(), end = Date.now() + 60000;
    const results = await Promise.all(Array.from({ length: 24 }, () => store.ensureCashCode(session, candidate(session), end)));
    assert.equal(results.filter(row => row.created).length, 1);
    assert.equal(new Set(results.map(row => row.record.issueId)).size, 1);
    assert.equal(new Set(results.map(row => row.record.authCode)).size, 1);
    assert.ok(await admin.pTTL(prefix + session) > 0);
    assert.deepEqual(JSON.parse(await admin.get(prefix + session)), results[0].record);
  });
  it("retry preserves the code and exact deadline rather than refreshing TTL", async () => {
    const session = id(), end = Date.now() + 60000, first = await store.ensureCashCode(session, candidate(session, 10000), end);
    const ttl = await admin.pTTL(prefix + session);
    await new Promise(resolve => setTimeout(resolve, 100));
    const retry = await store.ensureCashCode(session, candidate(session, 30000), end);
    assert.equal(retry.created, false); assert.deepEqual(retry.record, first.record);
    assert.ok(await admin.pTTL(prefix + session) < ttl);
  });
  it("actual TTL expiry allows a new issue ID and auth code on the same session", async () => {
    const session = id(), end = Date.now() + 60000;
    const first = await store.ensureCashCode(session, candidate(session, 1000), end);
    await new Promise(resolve => setTimeout(resolve, 1200)); assert.equal(await admin.get(prefix + session), null);
    const second = await store.ensureCashCode(session, candidate(session, 10000), end);
    assert.equal(second.created, true); assert.notEqual(second.record.issueId, first.record.issueId);
    assert.notEqual(second.record.authCode, first.record.authCode);
  });
  it("the same short code on different sessions has independent auth-code mappings", async () => {
    const one = id(), two = id(), end = Date.now() + 60000;
    const a = await store.ensureCashCode(one, candidate(one), end), b = await store.ensureCashCode(two, candidate(two), end);
    assert.equal(a.record.shortedCode, b.record.shortedCode); assert.notEqual(a.record.authCode, b.record.authCode);
    assert.equal(a.record.sessionId, one); assert.equal(b.record.sessionId, two);
  });
  it("expired tickets and missing-TTL/corrupt Redis state fail closed", async () => {
    const session = id(); await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() - 1));
    assert.equal(await admin.get(prefix + session), null);
    await admin.set(prefix + session, JSON.stringify(candidate(session)));
    await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() + 60000));
    await admin.set(prefix + session, "broken-json", { PX: 10000 });
    await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() + 60000));
  });
});
