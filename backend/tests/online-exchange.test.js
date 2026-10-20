const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { exchangeFixture } = require("./helpers/cash-exchange.fixture");
const { memoryOnlineRedis } = require("./helpers/online-checkout.fixture");
const { getOnlineExchangeConfig } = require("../config/online-payment");
function fixture() {
  const f = exchangeFixture(), memory = memoryOnlineRedis(() => f.state.now), code = randomBytes(32).toString("hex");
  f.state.row.paymentMethod = "ONLINE"; f.state.row.confirmedBy = null;
  f.state.preparation = { sessionId: f.id, issueId: randomUUID(), expiresAtMs: f.state.now + 900000 }; f.state.ready = true;
  memory.state.codes.set(f.id, { ...f.state.preparation, authCode: code });
  f.store.withOnlineTokenExchange = (id, work) => f.store.withCashTokenExchange(id, (row, ops) => work(row, {
    ...ops, preparation: f.state.preparation, ready: f.state.ready,
  }));
  f.service.redis = memory.redis;
  return { ...f, code, redis: memory.redis, redisState: memory.state, body: { authCode: code },
    send: (body = { authCode: code }, ip = "192.0.2.200") => f.service.exchangeOnlineCode(f.id, body, ip) };
}
it("online exchange has independent configurable limits with finite defaults and rejects invalid config", () => {
  assert.deepEqual(getOnlineExchangeConfig({}), { windowSeconds: 60, ipLimit: 30, sessionLimit: 5 });
  for (const key of ["ONLINE_EXCHANGE_WINDOW_SECONDS", "ONLINE_EXCHANGE_IP_LIMIT", "ONLINE_EXCHANGE_SESSION_LIMIT"]) {
    for (const value of ["", "0", "-1", "1.5", "1e3", "bad", "10001"]) assert.throws(() => getOnlineExchangeConfig({ [key]: value }));
  }
});
it("online code yields one random visitor token, only its hash/audit are persisted and original expiry is preserved", async () => {
  const f = fixture(), before = structuredClone(f.state.row), result = await f.send();
  assert.deepEqual(Object.keys(result).sort(), ["sessionId", "token", "tokenType", "expiresAt"].sort());
  assert.match(result.token, /^tcv_visit_[a-f0-9]{64}$/); assert.notEqual(result.token, f.code);
  assert.equal(f.state.row.tokenHash, createHash("sha256").update(result.token).digest("hex"));
  assert.deepEqual({ ...f.state.row, tokenHash: null }, before); assert.equal(result.expiresAt.getTime(), before.expiresAt.getTime());
  assert.equal(f.redisState.codes.has(f.id), false); assert.equal(JSON.stringify(f.state.audits).includes(result.token), false);
  await assert.rejects(f.send(), { code: "VISIT_TOKEN_ALREADY_ISSUED" }); assert.equal(f.state.audits.length, 1);
});
it("PENDING/FAILED checks do not inspect or consume online code, then a confirmed visit may exchange it", async () => {
  const f = fixture(), original = structuredClone(f.redisState.codes.get(f.id)); f.state.row.paymentStatus = "PENDING"; f.state.row.sessionStatus = "PENDING";
  await assert.rejects(f.send(), { code: "ONLINE_PAYMENT_PENDING" });
  f.state.row.paymentStatus = "FAILED"; await assert.rejects(f.send(), { code: "ONLINE_PAYMENT_NOT_PAID" });
  assert.equal(f.redisState.inspections, 0); assert.deepEqual(f.redisState.codes.get(f.id), original);
  f.state.row.paymentStatus = "PAID"; f.state.row.sessionStatus = "ACTIVE";
  assert.ok((await f.send()).token);
});
it("20 concurrent online exchanges allow exactly one success and one token audit", async () => {
  const f = fixture(); f.service.onlineExchangeConfig = () => ({ windowSeconds: 60, ipLimit: 100, sessionLimit: 100 });
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => f.send()));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason.code === "VISIT_TOKEN_ALREADY_ISSUED").length, 19);
  assert.equal(f.state.audits.length, 1);
});
it("wrong, missing, expired and cross-session online codes are refused without replacement or token", async () => {
  const f = fixture(); await assert.rejects(f.send({ authCode: "0".repeat(64) }), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
  assert.equal(f.redisState.codes.has(f.id), true);
  const record = f.redisState.codes.get(f.id); record.sessionId = randomUUID();
  await assert.rejects(f.send(), { code: "ONLINE_CODE_UNAVAILABLE" });
  f.redisState.codes.delete(f.id); await assert.rejects(f.send(), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" });
  f.state.now = f.state.preparation.expiresAtMs;
  await assert.rejects(f.send(), { code: "ONLINE_CODE_INVALID_OR_EXPIRED" }); assert.equal(f.state.row.tokenHash, null);
});
it("CASH, revoked/expired tickets, missing checkout audit and inconsistent online data cannot mint a token", async () => {
  for (const patch of [{ paymentMethod: "CASH" }, { sessionStatus: "REVOKED" }, { expiresAt: new Date(0) }, { paidAt: null },
    { activatedAt: null }, { confirmedBy: 1 }, { tokenHash: "existing" }, { reissueCount: 1 }]) {
    const f = fixture(); Object.assign(f.state.row, patch); await assert.rejects(f.send(), error => error.status === 409);
    assert.equal(f.redisState.inspections, 0); assert.equal(f.state.audits.length, 0);
  }
  const f = fixture(); f.state.ready = false; await assert.rejects(f.send(), { code: "ONLINE_CHECKOUT_NOT_READY" });
  assert.equal(f.redisState.inspections, 0);
});
it("opaque code TTL may outlast a short ticket but token still has the original ticket deadline", async () => {
  const f = fixture(); f.state.row.expiresAt = new Date(f.state.now + 1000);
  assert.equal((await f.send()).expiresAt.getTime(), f.state.now + 1000);
});
it("SQL/audit failure retains paid state and code for retry; expiry at the write prevents persistence", async () => {
  for (const flag of ["failPersist", "failAudit"]) {
    const f = fixture(), before = structuredClone(f.state.row); f.state[flag] = true;
    await assert.rejects(f.send(), { code: "ONLINE_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
    assert.deepEqual(f.state.row, before); assert.equal(f.redisState.codes.has(f.id), true);
    f.state[flag] = false; assert.ok((await f.send()).token);
  }
  const f = fixture(); f.state.expiredAtWrite = true;
  await assert.rejects(f.send(), { code: "ONLINE_EXCHANGE_CHANGED" }); assert.equal(f.state.row.tokenHash, null);
});
it("Redis protection/inspection outages fail closed, but cleanup after commit cannot hide the only token", async () => {
  for (const flag of ["protectionDown", "inspectionDown"]) {
    const f = fixture(); f.redisState[flag] = true;
    await assert.rejects(f.send(), error => error.status === 503); assert.equal(f.state.row.tokenHash, null);
  }
  const f = fixture(); f.redisState.cleanupDown = true; assert.ok((await f.send()).token);
  assert.equal(f.redisState.codes.has(f.id), true); await assert.rejects(f.send(), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
});
it("commit response lost after issuing online token never permits a second token or renewal", async () => {
  const f = fixture(); f.state.lostCommitReply = true;
  await assert.rejects(f.send(), { code: "ONLINE_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
  const saved = structuredClone(f.state.row); f.state.lostCommitReply = false;
  await assert.rejects(f.send(), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.deepEqual(f.state.row, saved); assert.equal(f.state.audits.length, 1);
});
it("online rate limits count malformed/wrong/pending attempts and resist rotating IP or session", async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) await assert.rejects(f.send({ authCode: "bad" }), { status: 400 });
  await assert.rejects(f.send(f.body, "192.0.2.201"), { status: 429 }); assert.equal(f.state.reads, 0);
  f.state.now += 60000; assert.ok((await f.send()).token);
  const g = fixture();
  for (let i = 0; i < 30; i++) await assert.rejects(g.service.exchangeOnlineCode(randomUUID(), g.body, "192.0.2.202"), { status: 404 });
  await assert.rejects(g.send(g.body, "192.0.2.202"), { status: 429 }); assert.equal(g.state.row.tokenHash, null);
});
it("online exchange rejects injected fields, invalid identifiers, missing IP and invalid config safely", async () => {
  for (const input of [null, [], {}, "code", { authCode: "' OR 1=1 --" }, { authCode: "0".repeat(64), token: "chosen" }, { shortedCode: "012345" }]) {
    const f = fixture(); await assert.rejects(f.send(input), { status: 400 }); assert.equal(f.state.reads, 0);
  }
  const f = fixture(); await assert.rejects(f.service.exchangeOnlineCode("bad", f.body, "192.0.2.203"), { status: 400 });
  await assert.rejects(f.service.exchangeOnlineCode(f.id, f.body, null), { status: 503 });
  f.service.onlineExchangeConfig = () => { throw new Error("invalid config"); };
  await assert.rejects(f.send(), { code: "ONLINE_EXCHANGE_PROTECTION_UNAVAILABLE" }); assert.equal(f.state.reads, 0);
});
it("online exchange HTTP is public and no-store, returns safe data and never accepts client-controlled token", async t => {
  const f = fixture(), { createApp } = require("../server"), server = http.createServer(createApp({ paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(base + `/api/payments/sessions/${f.id}/exchange-online-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ ...f.body, token: "injected" })).status, 400);
  const response = await post(f.body); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const data = (await response.json()).data; assert.equal(data.expiresAt, f.state.row.expiresAt.toISOString());
  const replay = await post(f.body); assert.equal(replay.status, 409); const error = await replay.text();
  assert.equal(error.includes(data.token), false); assert.equal(error.includes(f.code), false); assert.equal(error.includes(f.state.row.tokenHash), false);
});
