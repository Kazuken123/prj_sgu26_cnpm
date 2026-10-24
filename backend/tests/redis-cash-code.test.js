const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
let sequence = 10000;
function candidate(id, milliseconds = 10000) {
  return { sessionId: id, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"), shortedCode: String(sequence++).padStart(6, "0"), expiresAtMs: Date.now() + milliseconds };
}
it("Redis cash code Store uses one atomic script, enforces record shape and disconnects its client", async () => {
  const id = randomUUID(), record = candidate(id); let received;
  const client = { isOpen: true, on: () => {}, connect: async () => {}, disconnect: async () => { client.isOpen = false; },
    eval: async (script, args) => { received = { script, args }; return [1, JSON.stringify(record)]; } };
  const store = new RedisStore({ clientFactory: () => client, cashCodePrefix: "test:" });
  const result = await store.ensureCashCode(id, record, Date.now() + 60000);
  assert.equal(result.created, true); assert.deepEqual(result.record, record); assert.equal(client.isOpen, false);
  assert.deepEqual(received.args.keys, ["test:" + id, "test:lookup:" + createHash("sha1").update(record.shortedCode).digest("hex")]); assert.match(received.script, /PTTL/); assert.match(received.script, /TIME/);
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
it("Redis exchange inspection validates its reply and cleanup uses a compare-delete script", async () => {
  const session = randomUUID(), record = candidate(session); let reply = [1, JSON.stringify(record)], received;
  const client = { isOpen: true, on: () => {}, connect: async () => { client.isOpen = true; },
    disconnect: async () => { client.isOpen = false; }, eval: async (script, args) => { received = { script, args }; return reply; } };
  const store = new RedisStore({ clientFactory: () => client, cashCodePrefix: "test:" });
  assert.deepEqual(await store.inspectCashCode(session, record.shortedCode), record);
  assert.match(received.script, /TIME/); assert.match(received.script, /PTTL/);
  assert.deepEqual(received.args.arguments, [session, record.shortedCode]);
  assert.equal(received.script.includes("'DEL'"), false);
  reply = [0]; assert.equal(await store.inspectCashCode(session, "999999"), null);
  for (const bad of [[-1], [1, "broken-json"], [1, JSON.stringify({ ...record, sessionId: randomUUID() })],
    [1, JSON.stringify({ ...record, authCode: "bad" })], [1, JSON.stringify({ ...record, shortedCode: "999999" })]]) {
    reply = bad; await assert.rejects(store.inspectCashCode(session, record.shortedCode));
  }
  reply = 1; await store.removeCashCode(session, record.issueId);
  assert.deepEqual(received.args.arguments, [record.issueId]);
  assert.match(received.script, /record.issueId/); assert.match(received.script, /'DEL'/);
  assert.equal(client.isOpen, false);
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
  it("the same short code cannot be assigned to two live sessions, even in parallel", async () => {
    const one = id(), two = id(), end = Date.now() + 60000;
    const shared = "012345";
    const results = await Promise.all([store.ensureCashCode(one, { ...candidate(one), shortedCode: shared }, end),
      store.ensureCashCode(two, { ...candidate(two), shortedCode: shared }, end)]);
    assert.equal(results.filter(value => value.created).length, 1);
    assert.equal(results.filter(value => value.collision).length, 1);
    const winner = results.find(value => value.created).record;
    assert.equal((await store.resolveCashCode(shared)).sessionId, winner.sessionId);
    await store.removeCashCode(winner.sessionId, winner.issueId);
    assert.equal(await store.resolveCashCode(shared), null);
    const another = id();
    const again = await store.ensureCashCode(another, { ...candidate(another), shortedCode: shared }, end);
    assert.equal(again.collision, true); // Keep a used code reserved until its original deadline.
  });
  it("expired tickets and missing-TTL/corrupt Redis state fail closed", async () => {
    const session = id(); await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() - 1));
    assert.equal(await admin.get(prefix + session), null);
    await admin.set(prefix + session, JSON.stringify(candidate(session)));
    await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() + 60000));
    await admin.set(prefix + session, "broken-json", { PX: 10000 });
    await assert.rejects(store.ensureCashCode(session, candidate(session), Date.now() + 60000));
  });
  it("inspection binds the exact pair without consuming the code or renewing its TTL", async () => {
    const session = id(), record = (await store.ensureCashCode(session, candidate(session), Date.now() + 60000)).record;
    const ttl = await admin.pTTL(prefix + session);
    assert.equal(await store.inspectCashCode(session, "999999"), null);
    assert.equal(await store.inspectCashCode(id(), record.shortedCode), null);
    assert.deepEqual(await store.inspectCashCode(session, record.shortedCode), record);
    assert.ok(await admin.pTTL(prefix + session) <= ttl);
    assert.equal(await store.removeCashCode(session, randomUUID()), 0);
    assert.deepEqual(await store.inspectCashCode(session, record.shortedCode), record);
    assert.equal(await store.removeCashCode(session, record.issueId), 1);
    assert.equal(await store.inspectCashCode(session, record.shortedCode), null);
  });
  it("inspection rejects missing TTL and corrupt mapping, and actual expiry returns no valid code", async () => {
    const session = id(), record = candidate(session, 1000);
    await admin.set(prefix + session, JSON.stringify(record));
    await assert.rejects(store.inspectCashCode(session, record.shortedCode));
    await admin.set(prefix + session, "broken-json", { PX: 10000 });
    await assert.rejects(store.inspectCashCode(session, record.shortedCode));
    await admin.del(prefix + session);
    await store.ensureCashCode(session, candidate(session, 500), Date.now() + 60000);
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal(await store.inspectCashCode(session, record.shortedCode), null);
  });
  it("lookup-only resolution verifies both records and deadlines without extending TTL", async () => {
    const session = id(), item = candidate(session, 1000), end = Date.now() + 60000;
    const issued = (await store.ensureCashCode(session, item, end)).record;
    assert.deepEqual(await store.resolveCashCode(issued.shortedCode), issued);
    const key = prefix + "lookup:" + createHash("sha1").update(item.shortedCode).digest("hex");
    const ttl = await admin.pTTL(key);
    await store.resolveCashCode(issued.shortedCode); assert.ok(await admin.pTTL(key) <= ttl);
    await admin.set(prefix + session, JSON.stringify({ ...issued, issueId: randomUUID() }), { PX: 1000 });
    await assert.rejects(store.resolveCashCode(issued.shortedCode));
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await store.resolveCashCode(issued.shortedCode), null);
    const nextSession = id();
    assert.equal((await store.ensureCashCode(nextSession, { ...candidate(nextSession), shortedCode: item.shortedCode }, end)).created, true);
  });
  it("legacy v1 session-bound codes remain valid for old clients without entering the new global lookup", async () => {
    const session = randomUUID(), old = candidate(session, 2000), legacyKey = "tcv:cash-code:v1:" + session;
    const compatible = new RedisStore();
    await admin.set(legacyKey, JSON.stringify(old), { PX: 2000 });
    assert.deepEqual(await compatible.inspectCashCode(session, old.shortedCode), old);
    assert.equal(await compatible.resolveCashCode(old.shortedCode), null);
    // The rollout must drain v1 codes before exposing the new form on staging.
  });
});
