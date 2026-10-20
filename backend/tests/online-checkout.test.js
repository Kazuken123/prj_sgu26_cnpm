const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const http = require("node:http");
const { onlineFixture } = require("./helpers/online-checkout.fixture");
const { getOnlineCodeTtlMs, getMockGatewayConfig } = require("../config/online-payment");
const MockGateway = require("../adapters/mock-gateway");

it("online TTL defaults to 15 minutes and mock gateway requires explicit safe public origin", () => {
  assert.equal(getOnlineCodeTtlMs({}), 900000); assert.equal(getOnlineCodeTtlMs({ ONLINE_CODE_TTL_SECONDS: "300" }), 300000);
  for (const value of ["", "0", "-1", "1.5", "1e3", "bad", "999999999999999999"]) assert.throws(() => getOnlineCodeTtlMs({ ONLINE_CODE_TTL_SECONDS: value }));
  for (const url of [undefined, "javascript:alert(1)", "file:///tmp", "https://user:secret@example.invalid", "https://example.invalid/path", "https://example.invalid/?key=secret", "https://example.invalid/#token"]) {
    assert.throws(() => getMockGatewayConfig({ PAYMENT_GATEWAY: "mock", MOCK_PAYMENT_BASE_URL: url }));
  }
  assert.throws(() => getMockGatewayConfig({}));
  assert.deepEqual(getMockGatewayConfig({ PAYMENT_GATEWAY: "mock", MOCK_PAYMENT_BASE_URL: "https://demo.example.invalid/" }),
    { provider: "MOCK", publicBaseUrl: "https://demo.example.invalid" });
});
it("mock adapter is idempotent by paymentRef and validates amount, deadline and cancellation", async () => {
  const now = Date.now(), gateway = new MockGateway({ config: () => ({ provider: "MOCK", publicBaseUrl: "http://localhost:3000" }), now: () => now });
  const input = { paymentRef: randomUUID(), amount: "50000.00", currency: "VND", expiresAt: new Date(now + 900000) };
  assert.deepEqual(await gateway.createCheckout(input), await gateway.createCheckout(input));
  for (const patch of [{ amount: "0.00" }, { amount: "1e3" }, { currency: "USD" }, { paymentRef: "bad" }, { expiresAt: new Date(now) }]) {
    await assert.rejects(gateway.createCheckout({ ...input, ...patch }));
  }
  const abort = new AbortController(); abort.abort(); await assert.rejects(gateway.createCheckout(input, { signal: abort.signal }));
});
it("online checkout stays PENDING, uses server price, creates a random code and omits secrets from gateway/audit/URL", async () => {
  const f = onlineFixture(), key = randomUUID(), result = await f.service.initializeOnline({}, key);
  assert.equal(result.created, true); assert.equal(result.data.provider, "MOCK");
  assert.equal(result.data.amount, "50000.00"); assert.equal(result.data.paymentStatus, "PENDING"); assert.equal(result.data.sessionStatus, "PENDING");
  assert.match(result.data.authCode, /^[a-f0-9]{64}$/); assert.equal(result.data.codeExpiresAt.getTime() - f.state.now, 900000);
  assert.deepEqual(Object.keys(result.data).sort(), ["sessionId", "paymentRef", "paymentMethod", "amount", "currency", "paymentStatus", "sessionStatus", "provider", "authCode", "codeExpiresAt", "paymentUrl"].sort());
  assert.equal(result.data.paymentUrl.includes(result.data.authCode), false);
  for (const value of [f.state.audits, f.state.gatewayCalls, [...f.state.rows]]) {
    assert.equal(JSON.stringify(value).includes(result.data.authCode), false); assert.equal(JSON.stringify(value).includes(key), false);
  }
  const row = [...f.state.rows.values()][0]; assert.equal(row.tokenHash, null); assert.equal(row.paidAt, null); assert.equal(row.expiresAt, null);
});
it("retry and 20 concurrent initializations preserve one payment, code, fixed deadline and two setup audits", async () => {
  const f = onlineFixture(), key = randomUUID(), first = await f.service.initializeOnline({}, key);
  f.state.now += 30000; f.service.onlineCodeTtlMs = () => 1800000; f.service.price = () => { throw new Error("price changed"); };
  const retries = await Promise.all(Array.from({ length: 20 }, () => f.service.initializeOnline({}, key.toUpperCase())));
  for (const result of retries) { assert.equal(result.created, false); assert.deepEqual(result.data, first.data); }
  assert.equal(f.state.rows.size, 1); assert.equal(f.redisState.codes.size, 1); assert.equal(f.state.audits.length, 2);
});
it("legacy ONLINE/PENDING request can start its first checkout but CASH key cannot be repurposed", async () => {
  const f = onlineFixture(), online = randomUUID(), cash = randomUUID();
  const pending = await f.service.initialize({ paymentMethod: "ONLINE" }, online);
  assert.equal((await f.service.initializeOnline({}, online)).data.sessionId, pending.data.sessionId);
  await f.service.initialize({ paymentMethod: "CASH" }, cash);
  await assert.rejects(f.service.initializeOnline({}, cash), { code: "REQUEST_KEY_CONFLICT" });
  assert.equal(f.state.rows.size, 2);
});
it("expired or missing issued online codes are not replaced even if TTL configuration increases", async () => {
  const f = onlineFixture(), key = randomUUID(), first = await f.service.initializeOnline({}, key), before = structuredClone([...f.state.rows]);
  f.redisState.codes.delete(first.data.sessionId);
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CODE_MISSING" });
  assert.equal(f.redisState.codes.size, 0);
  f.state.now = first.data.codeExpiresAt.getTime(); f.service.onlineCodeTtlMs = () => 3600000;
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CODE_EXPIRED" });
  assert.deepEqual([...f.state.rows], before); assert.equal(f.state.audits.length, 2);
});
it("Redis outage before first issuance retries within the original reserved deadline", async () => {
  const f = onlineFixture(), key = randomUUID(); f.redisState.down = true;
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CODE_UNAVAILABLE" });
  const prepared = structuredClone([...f.state.preparations.values()][0]);
  assert.equal(f.state.audits.length, 1); assert.equal(f.state.rows.size, 1); assert.equal(f.redisState.codes.size, 0);
  f.redisState.down = false; f.state.now += 10000; f.service.onlineCodeTtlMs = () => 3600000;
  const retry = await f.service.initializeOnline({}, key);
  assert.equal(retry.data.codeExpiresAt.getTime(), prepared.expiresAtMs); assert.equal(f.state.rows.size, 1);
});
it("lost Redis reply and failed ready audit recover the same unexpired code without duplicate orders", async () => {
  const f = onlineFixture(), key = randomUUID(); f.redisState.lostReply = true;
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CODE_UNAVAILABLE" });
  const original = structuredClone([...f.redisState.codes.values()][0]); f.state.failReady = true;
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" });
  assert.equal(f.state.ready.size, 0); assert.equal(f.state.audits.length, 1);
  f.state.failReady = false; const retry = await f.service.initializeOnline({}, key);
  assert.equal(retry.data.authCode, original.authCode); assert.equal(retry.data.codeExpiresAt.getTime(), original.expiresAtMs);
  assert.equal(f.state.rows.size, 1); assert.equal(f.state.audits.length, 2);
});
it("prepare audit failure leaves pending payment but no Redis/gateway effects and retries safely", async () => {
  const f = onlineFixture(), key = randomUUID(); f.state.failPrepare = true;
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" });
  assert.equal(f.redisState.calls.length, 0); assert.equal(f.state.gatewayCalls.length, 0); assert.equal(f.state.preparations.size, 0);
  f.state.failPrepare = false; assert.ok((await f.service.initializeOnline({}, key)).data.authCode); assert.equal(f.state.rows.size, 1);
});
it("gateway error, timeout and invalid URL return safe errors, preserve pending state and fixed code for retry", async () => {
  for (const mode of ["error", "timeout", "unsafe", "wrong-origin"]) {
    const f = onlineFixture(), key = randomUUID(), original = f.gateway.createCheckout;
    f.service.gatewayTimeoutMs = 20; let aborted = false;
    f.gateway.createCheckout = async (input, { signal }) => {
      if (mode === "error") throw new Error("private gateway secret");
      if (mode === "timeout") { signal.addEventListener("abort", () => { aborted = true; }); return new Promise(() => {}); }
      return { provider: "MOCK", paymentUrl: mode === "unsafe" ? "javascript:alert(1)" : "https://elsewhere.invalid/checkout" };
    };
    await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_GATEWAY_UNAVAILABLE" });
    if (mode === "timeout") assert.equal(aborted, true);
    const record = structuredClone([...f.redisState.codes.values()][0]); assert.equal(f.state.ready.size, 0);
    f.gateway.createCheckout = original;
    const retry = await f.service.initializeOnline({}, key); assert.equal(retry.data.authCode, record.authCode); assert.equal(f.state.rows.size, 1);
  }
});
it("already PAID, FAILED, revoked, activated or tokenized sessions never return a fresh checkout", async () => {
  for (const patch of [{ paymentStatus: "PAID" }, { paymentStatus: "FAILED" }, { sessionStatus: "ACTIVE" },
    { sessionStatus: "REVOKED" }, { paidAt: new Date() }, { expiresAt: new Date() }, { tokenHash: "issued" }, { reissueCount: 1 }]) {
    const f = onlineFixture(), key = randomUUID(); await f.service.initialize({ paymentMethod: "ONLINE" }, key);
    Object.assign([...f.state.rows.values()][0], patch);
    await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CHECKOUT_NOT_PENDING" });
    assert.equal(f.redisState.calls.length, 0); assert.equal(f.state.gatewayCalls.length, 0);
  }
});
it("invalid body, request key, gateway config and TTL cannot expose secrets or return a checkout", async () => {
  for (const input of [null, [], "", { amount: 1 }, { authCode: "injected" }, { paymentMethod: "ONLINE" }, { returnUrl: "javascript:alert(1)" }]) {
    const f = onlineFixture(); await assert.rejects(f.service.initializeOnline(input, randomUUID()), { status: 400 }); assert.equal(f.state.rows.size, 0);
  }
  const f = onlineFixture(); await assert.rejects(f.service.initializeOnline({}, "' OR 1=1 --"), { code: "INVALID_REQUEST_KEY" });
  f.gateway.assertConfigured = () => { throw new Error("private gateway URL"); };
  await assert.rejects(f.service.initializeOnline({}, randomUUID()), { code: "ONLINE_GATEWAY_NOT_CONFIGURED" }); assert.equal(f.state.rows.size, 0);
  const g = onlineFixture(); g.service.onlineCodeTtlMs = () => 0;
  await assert.rejects(g.service.initializeOnline({}, randomUUID()), { code: "ONLINE_CODE_TTL_NOT_CONFIGURED" });
  assert.equal(g.state.preparations.size, 0); assert.equal(g.state.gatewayCalls.length, 0);
});
it("checkout expiry during gateway work and ambiguous ready commit cannot renew or reissue the order", async () => {
  const f = onlineFixture(), key = randomUUID(), original = f.gateway.createCheckout;
  f.gateway.createCheckout = async (...args) => { const result = await original(...args); f.state.now += 900001; return result; };
  await assert.rejects(f.service.initializeOnline({}, key), { code: "ONLINE_CODE_EXPIRED" }); assert.equal(f.state.ready.size, 0);
  const g = onlineFixture(), other = randomUUID(); g.state.lostCommitReply = true;
  await assert.rejects(g.service.initializeOnline({}, other), { code: "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE" });
  const stored = [...g.redisState.codes.values()][0], retry = await g.service.initializeOnline({}, other);
  assert.equal(retry.data.authCode, stored.authCode); assert.equal(g.state.audits.length, 2);
});
it("online checkout HTTP is no-store; mock URL GET cannot simulate a payment or expose the exchange code", async t => {
  const f = onlineFixture(), { createApp } = require("../server");
  const server = http.createServer(createApp({ paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`; f.gateway.config = () => ({ provider: "MOCK", publicBaseUrl: base });
  const key = randomUUID(), post = body => fetch(base + "/api/payments/online-checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  assert.equal((await post({ amount: 1 })).status, 400);
  const first = await post({}); assert.equal(first.status, 201); assert.equal(first.headers.get("cache-control"), "no-store");
  const data = (await first.json()).data;
  const retry = await post({}); assert.equal(retry.status, 200); assert.deepEqual((await retry.json()).data, data);
  const before = structuredClone([...f.state.rows]);
  for (const outcome of ["SUCCESS", "FAILED"]) {
    const response = await fetch(data.paymentUrl + "?result=" + outcome); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    const text = await response.text(); assert.equal(text.includes(data.authCode), false); assert.equal(JSON.parse(text).data.simulationOnly, true);
  }
  assert.deepEqual([...f.state.rows], before);
  assert.equal((await fetch(base + "/api/visits/me", { headers: { Authorization: "Bearer " + data.authCode } })).status, 401);
  assert.equal((await fetch(base + "/api/payments/mock-checkout/bad")).status, 400);
  assert.equal((await fetch(base + "/api/payments/mock-checkout/" + randomUUID())).status, 404);
});
