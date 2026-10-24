const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const { exchangeFixture } = require("./helpers/cash-exchange.fixture");
const { getCashExchangeConfig } = require("../config/payment");
const ip = "192.0.2.1", input = { shortedCode: "012345" };

it("code-only exchange resolves its own session, preserves leading zero and returns no second token", async () => {
  const f = exchangeFixture(), expiry = f.state.row.expiresAt.getTime();
  const result = await f.service.exchangeCashCodeOnly(input, ip);
  assert.equal(result.sessionId, f.id); assert.equal(result.expiresAt.getTime(), expiry);
  assert.equal(f.state.audits.length, 1);
  await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), { code: "CASH_CODE_INVALID_OR_EXPIRED" });
  assert.equal(f.state.audits.length, 1);
});
it("code-only wrong, expired, consumed and malformed codes cannot identify or mutate another session", async () => {
  for (const body of [{ shortedCode: "999999" }, {}, null, { shortedCode: 12345 }, { shortedCode: "12345" }, { shortedCode: "012345", sessionId: "chosen-by-client" }]) {
    const f = exchangeFixture();
    await assert.rejects(f.service.exchangeCashCodeOnly(body, ip), error => [400, 401].includes(error.status));
    assert.equal(f.state.row.tokenHash, null); assert.equal(f.state.reads, 0);
  }
  const f = exchangeFixture(); f.state.now += 600001;
  await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), { code: "CASH_CODE_INVALID_OR_EXPIRED" });
});
it("code-only access fails closed on Redis outage, rate limits and corrupted session binding", async () => {
  for (const mode of ["protectionDown", "inspectionDown"]) {
    const f = exchangeFixture(); f.redisState[mode] = true;
    await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), error => error.status === 503 && !error.message.includes("private"));
    assert.equal(f.state.reads, 0);
  }
  const f = exchangeFixture(); f.redis.resolveCashCode = async () => ({ sessionId: "bad", issueId: "bad", shortedCode: "012345" });
  await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), { code: "CASH_CODE_UNAVAILABLE" });
  assert.equal(f.state.reads, 0);
  const limited = exchangeFixture();
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(limited.service.exchangeCashCodeOnly({ shortedCode: "999999" }, ip), error => error.status === 401);
  await assert.rejects(limited.service.exchangeCashCodeOnly({ shortedCode: "999999" }, ip), error => error.status === 429);
});
it("code-only exchange rechecks payment/session state, SQL rollback and lost commit acknowledgement", async () => {
  for (const change of [row => { row.paymentStatus = "PENDING"; }, row => { row.sessionStatus = "REVOKED"; }, row => { row.expiresAt = new Date(0); }]) {
    const f = exchangeFixture(); change(f.state.row);
    await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), error => error.status === 409);
    assert.equal(f.state.row.tokenHash, null);
  }
  const failed = exchangeFixture(); failed.state.failAudit = true;
  await assert.rejects(failed.service.exchangeCashCodeOnly(input, ip), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
  assert.equal(failed.state.row.tokenHash, null); assert.equal(failed.redisState.codes.has(failed.id), true);
  failed.state.failAudit = false; assert.ok((await failed.service.exchangeCashCodeOnly(input, ip)).token);
  const uncertain = exchangeFixture(); uncertain.state.lostCommitReply = true;
  await assert.rejects(uncertain.service.exchangeCashCodeOnly(input, ip), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
  const original = uncertain.state.row.tokenHash;
  uncertain.state.lostCommitReply = false;
  await assert.rejects(uncertain.service.exchangeCashCodeOnly(input, ip), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.equal(uncertain.state.row.tokenHash, original);
});
it("code-only resolution cannot switch to a new issue while waiting for the SQL lock", async () => {
  const f = exchangeFixture(), original = structuredClone(f.redisState.codes.get(f.id));
  f.redis.resolveCashCode = async () => { f.redisState.codes.set(f.id, { ...original, issueId: randomUUID() }); return original; };
  await assert.rejects(f.service.exchangeCashCodeOnly(input, ip), { code: "CASH_CODE_UNAVAILABLE" });
  assert.equal(f.state.row.tokenHash, null);
});

it("cash exchange limits default to 5/session and 30/IP per minute and reject invalid config", () => {
  assert.deepEqual(getCashExchangeConfig({}), { windowSeconds: 60, ipLimit: 30, sessionLimit: 5 });
  assert.deepEqual(getCashExchangeConfig({ CASH_EXCHANGE_WINDOW_SECONDS: "120", CASH_EXCHANGE_IP_LIMIT: "10", CASH_EXCHANGE_SESSION_LIMIT: "2" }),
    { windowSeconds: 120, ipLimit: 10, sessionLimit: 2 });
  for (const key of ["CASH_EXCHANGE_WINDOW_SECONDS", "CASH_EXCHANGE_IP_LIMIT", "CASH_EXCHANGE_SESSION_LIMIT"]) {
    for (const value of ["", "0", "-1", "1.5", "bad", "10001"]) assert.throws(() => getCashExchangeConfig({ [key]: value }));
  }
});
it("valid cash code returns one random guest token, only stores its hash and retains original ticket expiry", async () => {
  const f = exchangeFixture(), before = structuredClone(f.state.row), record = f.redisState.codes.get(f.id);
  const result = await f.service.exchangeCashCode(f.id.toUpperCase(), input, ip);
  assert.deepEqual(Object.keys(result).sort(), ["expiresAt", "sessionId", "token", "tokenType"]);
  assert.match(result.token, /^tcv_visit_[a-f0-9]{64}$/); assert.equal(result.tokenType, "Bearer");
  assert.equal(result.sessionId, f.id); assert.equal(result.expiresAt.getTime(), before.expiresAt.getTime());
  assert.equal(f.state.row.tokenHash, createHash("sha256").update(result.token).digest("hex"));
  assert.notEqual(result.token, record.authCode);
  assert.deepEqual({ ...f.state.row, tokenHash: null }, before);
  assert.equal(JSON.stringify(f.state.audits).includes(result.token), false);
  assert.equal(f.redisState.codes.has(f.id), false);
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
});
it("20 simultaneous cash exchanges yield one token and one audit", async () => {
  const f = exchangeFixture(); f.service.exchangeConfig = () => ({ windowSeconds: 60, sessionLimit: 100, ipLimit: 100 });
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => f.service.exchangeCashCode(f.id, input, ip)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason.code === "VISIT_TOKEN_ALREADY_ISSUED").length, 19);
  assert.equal(f.state.audits.length, 1);
});
it("wrong, expired, unknown and cross-session codes cannot mint a token or consume the real code", async () => {
  const f = exchangeFixture();
  await assert.rejects(f.service.exchangeCashCode(f.id, { shortedCode: "654321" }, ip), { status: 401 });
  await assert.rejects(f.service.exchangeCashCode(randomUUID(), input, ip), { status: 404 });
  const other = exchangeFixture();
  other.redisState.codes.set(other.id, { ...f.redisState.codes.get(f.id), sessionId: f.id });
  await assert.rejects(other.service.exchangeCashCode(other.id, input, ip), { status: 503 });
  assert.equal(f.redisState.codes.has(f.id), true);
  f.state.now += 600000;
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "CASH_CODE_INVALID_OR_EXPIRED" });
  assert.equal(f.state.row.tokenHash, null); assert.equal(f.state.audits.length, 0);
});
it("PENDING, failed, online, revoked, expired and inconsistent visits never inspect or consume a code", async () => {
  for (const patch of [{ paymentStatus: "PENDING" }, { paymentStatus: "FAILED" }, { paymentMethod: "ONLINE" },
    { sessionStatus: "REVOKED" }, { expiresAt: new Date(0) }, { paidAt: null }, { activatedAt: null }, { expiresAt: null }, { reissueCount: 1 }]) {
    const f = exchangeFixture(); Object.assign(f.state.row, patch);
    await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), error => error.status === 409);
    assert.equal(f.redisState.reads, 0); assert.equal(f.redisState.codes.has(f.id), true); assert.equal(f.state.audits.length, 0);
  }
});
it("rate budgets apply to wrong and malformed codes, reset at the boundary and include random session IDs", async () => {
  const f = exchangeFixture();
  for (let i = 0; i < 5; i++) await assert.rejects(f.service.exchangeCashCode(f.id, { shortedCode: "bad" }, ip), { status: 400 });
  await assert.rejects(f.service.exchangeCashCode(f.id, input, "192.0.2.2"), { status: 429 });
  assert.equal(f.state.reads, 0);
  f.state.now += 60000;
  assert.ok((await f.service.exchangeCashCode(f.id, input, ip)).token);
  const g = exchangeFixture();
  for (let i = 0; i < 30; i++) await assert.rejects(g.service.exchangeCashCode(randomUUID(), input, ip), { status: 404 });
  await assert.rejects(g.service.exchangeCashCode(g.id, input, ip), { status: 429 });
  assert.equal(g.state.row.tokenHash, null);
});
it("invalid IDs and injected or non-string fields are rejected before reading SQL and cannot bypass IP limits", async () => {
  for (const body of [null, [], {}, "012345", { shortedCode: 12345 }, { shortedCode: "012345", token: "injected" },
    { shortedCode: "<script>" }, { shortedCode: "' OR 1=1 --" }]) {
    const f = exchangeFixture(); await assert.rejects(f.service.exchangeCashCode(f.id, body, ip), { status: 400 }); assert.equal(f.state.reads, 0);
  }
  const f = exchangeFixture(); await assert.rejects(f.service.exchangeCashCode("invalid", input, ip), { status: 400 });
  assert.equal(f.state.reads, 0); assert.equal(f.redisState.buckets.size, 2);
});
it("protection/Redis errors fail closed; SQL or audit rollback retains code and allows a safe retry", async () => {
  for (const flag of ["protectionDown", "inspectionDown"]) {
    const f = exchangeFixture(); f.redisState[flag] = true;
    await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { status: 503 });
    assert.equal(f.state.row.tokenHash, null); assert.equal(f.redisState.codes.has(f.id), true);
  }
  for (const flag of ["failPersist", "failAudit"]) {
    const f = exchangeFixture(); f.state[flag] = true;
    await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
    assert.equal(f.state.row.tokenHash, null); assert.equal(f.state.audits.length, 0); assert.equal(f.redisState.codes.has(f.id), true);
    f.state[flag] = false; assert.ok((await f.service.exchangeCashCode(f.id, input, ip)).token);
  }
});
it("deadline crossing during persistence rejects exchange without losing the code", async () => {
  const f = exchangeFixture(); f.state.expiredAtWrite = true;
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "CASH_EXCHANGE_CHANGED" });
  assert.equal(f.state.row.tokenHash, null); assert.equal(f.redisState.codes.has(f.id), true);
});
it("missing IP or invalid protection config refuses exchange without accessing SQL", async () => {
  const f = exchangeFixture();
  await assert.rejects(f.service.exchangeCashCode(f.id, input, null), { code: "CASH_EXCHANGE_PROTECTION_UNAVAILABLE" });
  f.service.exchangeConfig = () => { throw new Error("invalid config"); };
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "CASH_EXCHANGE_PROTECTION_UNAVAILABLE" });
  assert.equal(f.state.reads, 0); assert.equal(f.state.row.tokenHash, null);
});
it("cleanup outage cannot hide an already committed token or allow a second exchange", async () => {
  const f = exchangeFixture(); f.redisState.cleanupDown = true;
  const result = await f.service.exchangeCashCode(f.id, input, ip);
  assert.ok(result.token); assert.equal(f.redisState.codes.has(f.id), true);
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.equal(f.state.audits.length, 1);
});
it("lost commit response never reissues a token or charges again on retry", async () => {
  const f = exchangeFixture(), before = structuredClone(f.state.row); f.state.lostCommitReply = true;
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE" });
  const originalHash = f.state.row.tokenHash; assert.match(originalHash, /^[a-f0-9]{64}$/);
  f.state.lostCommitReply = false;
  await assert.rejects(f.service.exchangeCashCode(f.id, input, ip), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.equal(f.state.row.tokenHash, originalHash); assert.equal(f.state.audits.length, 1);
  assert.deepEqual({ ...f.state.row, tokenHash: null }, before);
});
it("guest exchange HTTP is public, no-store, never returns hashes and visitor token cannot access staff APIs", async t => {
  const f = exchangeFixture();
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(base + `/api/payments/sessions/${f.id}/exchange-cash-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ shortedCode: "999999" })).status, 401);
  const response = await post(input); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const data = (await response.json()).data;
  assert.deepEqual(Object.keys(data).sort(), ["expiresAt", "sessionId", "token", "tokenType"]);
  assert.equal(data.expiresAt, f.state.row.expiresAt.toISOString());
  const replay = await post(input); assert.equal(replay.status, 409); const error = await replay.text();
  assert.equal(error.includes(data.token), false); assert.equal(error.includes(f.state.row.tokenHash), false);
  assert.equal((await fetch(base + `/api/admin/payments/sessions/${f.id}`, { headers: { Authorization: "Bearer " + data.token } })).status, 401);
});
