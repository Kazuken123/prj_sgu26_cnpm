const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID, createHmac } = require("node:crypto");
const { webhookFixture } = require("./helpers/online-webhook.fixture");
const { getMockWebhookSecret } = require("../config/online-payment");
it("mock webhook secret is explicit, separate from JWT and at least 32 bytes", () => {
  for (const value of [undefined, "", "short", "x".repeat(1025)]) assert.throws(() => getMockWebhookSecret({ MOCK_WEBHOOK_SECRET: value }));
  assert.equal(getMockWebhookSecret({ MOCK_WEBHOOK_SECRET: "a".repeat(32) }), "a".repeat(32));
});
it("webhook checks HMAC over exact bytes before parsing and cannot be forged with a changed body or signature", async () => {
  const f = webhookFixture(), signed = f.gateway.createWebhook(f.payload());
  for (const signature of [undefined, "", "bad", "sha256=00", "sha256=" + "0".repeat(64)]) {
    await assert.rejects(f.service.processMockWebhook(signed.body, signature), { status: 401, code: "INVALID_WEBHOOK_SIGNATURE" });
  }
  await assert.rejects(f.service.processMockWebhook(Buffer.from(signed.body.toString() + " "), signed.signature), { status: 401 });
  assert.equal(f.state.reads, 0);
  const spaced = Buffer.from(JSON.stringify(f.payload(), null, 2));
  const signature = "sha256=" + createHmac("sha256", f.secret).update(spaced).digest("hex");
  assert.equal((await f.service.processMockWebhook(spaced, signature)).paymentStatus, "PAID");
});
it("validly signed malformed or injected payloads never reach SQL", async () => {
  const f = webhookFixture();
  for (const body of ["broken-json", "null", "[]", JSON.stringify({ ...f.payload(), token: "injected" }),
    JSON.stringify({ ...f.payload(), amount: 50000 }), JSON.stringify({ ...f.payload(), amount: "1e5" }),
    JSON.stringify({ ...f.payload(), currency: "USD" }), JSON.stringify({ ...f.payload(), status: "PAID" }),
    JSON.stringify({ ...f.payload(), paymentRef: "' OR 1=1 --" })]) {
    const raw = Buffer.from(body), signature = "sha256=" + createHmac("sha256", f.secret).update(raw).digest("hex");
    await assert.rejects(f.service.processMockWebhook(raw, signature), { status: 400, code: "INVALID_WEBHOOK_PAYLOAD" });
  }
  assert.equal(f.state.reads, 0);
});
it("SUCCESS activates the same online visit with one server-time deadline and does not mint a token", async () => {
  const f = webhookFixture(), id = f.state.row.sessionId, result = await f.send();
  assert.deepEqual(result, { accepted: true, paymentRef: f.state.row.paymentRef, paymentStatus: "PAID", sessionStatus: "ACTIVE", duplicate: false });
  assert.equal(f.state.row.sessionId, id); assert.equal(f.state.row.tokenHash, null); assert.equal(f.state.row.confirmedBy, null);
  assert.equal(f.state.row.paidAt.getTime(), f.state.now); assert.equal(f.state.row.activatedAt.getTime(), f.state.now);
  assert.equal(f.state.row.expiresAt.getTime() - f.state.now, 86400000); assert.equal(f.state.audits.length, 1);
});
it("FAILED does not grant access, repeated failure is idempotent, and late valid SUCCESS upgrades the same payment", async () => {
  const f = webhookFixture();
  assert.equal((await f.send("FAILED")).paymentStatus, "FAILED");
  assert.equal(f.state.row.sessionStatus, "PENDING"); assert.equal(f.state.row.expiresAt, null);
  assert.equal((await f.send("FAILED")).duplicate, true); assert.equal(f.state.audits.length, 1);
  f.state.now += 900000;
  assert.equal((await f.send("SUCCESS")).paymentStatus, "PAID"); assert.equal(f.state.audits.length, 2);
  assert.equal(f.state.audits[1].previousStatus, "FAILED"); assert.equal(f.state.row.paidAt.getTime(), f.state.now);
});
it("PAID absorbs repeated/old SUCCESS and FAILED without renewal or reactivating a revoked visit", async () => {
  const f = webhookFixture(); await f.send();
  const before = structuredClone(f.state.row); f.state.now += 900000;
  for (const outcome of ["SUCCESS", "FAILED"]) assert.equal((await f.send(outcome)).duplicate, true);
  assert.deepEqual(f.state.row, before); assert.equal(f.state.audits.length, 1);
  f.state.row.sessionStatus = "REVOKED";
  assert.equal((await f.send()).sessionStatus, "REVOKED"); assert.equal(f.state.row.expiresAt.getTime(), before.expiresAt.getTime());
  f.state.row.sessionStatus = "ACTIVE"; f.state.now = before.expiresAt.getTime() + 1;
  await f.send(); assert.equal(f.state.row.expiresAt.getTime(), before.expiresAt.getTime());
});
it("20 concurrent mixed callbacks end PAID with one activation regardless of which outcome arrives first", async () => {
  const f = webhookFixture();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => f.send(i % 2 ? "SUCCESS" : "FAILED")));
  assert.equal(f.state.row.paymentStatus, "PAID"); assert.equal(f.state.row.sessionStatus, "ACTIVE");
  assert.equal(f.state.audits.filter(a => a.status === "PAID").length, 1);
  assert.ok(results.every(r => ["PAID", "FAILED"].includes(r.paymentStatus)));
});
it("mismatched amount, unknown ref, CASH, unprepared checkout or inconsistent state cannot be activated", async () => {
  const f = webhookFixture();
  await assert.rejects(f.send("SUCCESS", { amount: "50001.00" }), { code: "WEBHOOK_PAYMENT_MISMATCH" });
  await assert.rejects(f.send("SUCCESS", { paymentRef: randomUUID() }), { status: 404 });
  f.state.row.paymentMethod = "CASH"; await assert.rejects(f.send(), { code: "WEBHOOK_ONLINE_REQUIRED" });
  f.state.row.paymentMethod = "ONLINE"; f.state.prepared = false;
  await assert.rejects(f.send(), { code: "ONLINE_CHECKOUT_NOT_PREPARED" });
  f.state.prepared = true; f.state.row.tokenHash = "inconsistent";
  await assert.rejects(f.send(), { code: "PAYMENT_SESSION_INCONSISTENT" }); assert.equal(f.state.audits.length, 0);
});
it("late callback after code expiry or Redis outage still verifies payment without creating a token or code", async () => {
  const f = webhookFixture(); f.state.now += 3600000;
  f.service.redis = new Proxy({}, { get: () => { throw new Error("must not access Redis"); } });
  const result = await f.send(); assert.equal(result.paymentStatus, "PAID"); assert.equal(f.state.row.tokenHash, null);
});
it("payment, visit and audit failures roll back together and a lost commit reply never activates twice", async () => {
  for (const flag of ["failPayment", "failVisit", "failAudit"]) {
    const f = webhookFixture(), before = structuredClone(f.state.row); f.state[flag] = true;
    await assert.rejects(f.send(), { code: "WEBHOOK_PERSISTENCE_UNAVAILABLE", status: 503 });
    assert.deepEqual(f.state.row, before); assert.equal(f.state.audits.length, 0);
    f.state[flag] = false; await f.send(); assert.equal(f.state.audits.length, 1);
  }
  const f = webhookFixture(); f.state.lostReply = true;
  await assert.rejects(f.send(), { code: "WEBHOOK_PERSISTENCE_UNAVAILABLE" });
  const saved = structuredClone(f.state.row); assert.equal((await f.send()).duplicate, true);
  assert.deepEqual(f.state.row, saved); assert.equal(f.state.audits.length, 1);
});
it("invalid verification result, missing secret or invalid validity configuration fails closed", async () => {
  const f = webhookFixture(); f.gateway.webhookSecret = () => "short";
  await assert.rejects(f.service.processMockWebhook(Buffer.from("{}"), "sha256=" + "0".repeat(64)), { code: "WEBHOOK_VERIFICATION_UNAVAILABLE" });
  assert.equal(f.state.reads, 0);
  const g = webhookFixture(); g.gateway.verifyWebhook = () => ({ ...g.payload(), status: "unknown" });
  await assert.rejects(g.service.processMockWebhook(Buffer.from("{}"), "bad"), { status: 503 }); assert.equal(g.state.reads, 0);
  const h = webhookFixture(); h.service.validityMs = () => 0;
  await assert.rejects(h.send(), { code: "VISIT_VALIDITY_NOT_CONFIGURED" }); assert.equal(h.state.row.paymentStatus, "PENDING");
});
it("webhook HTTP uses raw JSON HMAC, not JWT or redirect; operator helper can demonstrate success safely", async t => {
  const f = webhookFixture(), { createApp } = require("../server"), { runMockPayment } = require("../scripts/mock-payment");
  f.store.getMockCheckout = async ref => ref === f.state.row.paymentRef ? { ...f.state.row } : undefined;
  const server = http.createServer(createApp({ paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`; f.gateway.config = () => ({ provider: "MOCK", publicBaseUrl: base });
  const signed = f.gateway.createWebhook(f.payload());
  const post = (body, signature, extra = {}) => fetch(base + "/api/payments/webhooks/mock", { method: "POST", headers: { "Content-Type": "application/json",
    ...(signature ? { "X-Mock-Signature": signature } : {}), ...extra }, body });
  assert.equal((await post(signed.body, undefined, { Authorization: "Bearer fake-internal-token" })).status, 401);
  assert.equal((await post(Buffer.from(signed.body.toString() + " "), signed.signature)).status, 401);
  assert.equal((await post(require("node:zlib").gzipSync(signed.body), signed.signature, { "Content-Encoding": "gzip" })).status, 415);
  assert.equal(f.state.row.paymentStatus, "PENDING");
  const pretty = Buffer.from(JSON.stringify(f.payload(), null, 2)), signature = "sha256=" + createHmac("sha256", f.secret).update(pretty).digest("hex");
  const response = await post(pretty, signature); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).data.paymentStatus, "PAID");
  const operator = await runMockPayment([f.state.row.paymentRef, "SUCCESS"], { gateway: f.gateway });
  assert.equal(operator.paymentStatus, "PAID"); assert.equal(operator.duplicate, true); assert.equal(JSON.stringify(operator).includes(f.secret), false);
  const failure = await post(signed.body, "sha256=" + "0".repeat(64)); assert.equal(failure.status, 401);
  const error = await failure.text(); assert.equal(error.includes(f.secret), false); assert.equal(error.includes(signed.signature), false);
  assert.equal((await post(Buffer.alloc(33000, 32), signed.signature)).status, 413);
});
