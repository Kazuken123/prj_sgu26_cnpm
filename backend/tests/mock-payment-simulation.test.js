const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { webhookFixture } = require("./helpers/online-webhook.fixture");
const { isMockSimulationEnabled } = require("../config/online-payment");

function fixture() {
  const f = webhookFixture();
  f.service.simulationEnabled = () => true;
  f.service.redis = { consumeLookup: async () => true };
  f.store.getMockCheckout = async ref => ref === f.state.row.paymentRef ? { ...f.state.row } : undefined;
  f.simulate = (status = "SUCCESS") => f.service.simulateMockPayment(f.state.row.paymentRef, { status }, "192.0.2.230");
  return f;
}
it("browser simulation is opt-in, independent of NODE_ENV and still requires MockGateway", async () => {
  for (const value of [undefined, "", "false", "1", "TRUE"]) {
    assert.equal(isMockSimulationEnabled({ MOCK_PAYMENT_SIMULATION_ENABLED: value, NODE_ENV: "development" }), false);
  }
  assert.equal(isMockSimulationEnabled({ MOCK_PAYMENT_SIMULATION_ENABLED: "true" }), true);
  const f = fixture(); f.service.simulationEnabled = () => false;
  await assert.rejects(f.simulate(), { status: 404, code: "MOCK_SIMULATION_DISABLED" });
  assert.equal(f.state.reads, 0); assert.equal(f.state.row.paymentStatus, "PENDING");
  f.service.simulationEnabled = () => true;
  f.gateway.config = () => { throw new Error("disabled gateway private config"); };
  await assert.rejects(f.simulate(), { status: 503, code: "ONLINE_GATEWAY_NOT_CONFIGURED" });
  assert.equal(f.state.audits.length, 0);
});
it("simulation rejects absent, invalid and extra fields instead of defaulting to SUCCESS", async () => {
  const f = fixture();
  for (const input of [undefined, null, [], {}, { status: "success" }, { status: "PAID" }, { status: "" },
    { status: "SUCCESS", amount: "0.01" }, { status: "SUCCESS", token: "chosen" }]) {
    await assert.rejects(f.service.simulateMockPayment(f.state.row.paymentRef, input, "192.0.2.230"), { status: 400 });
  }
  for (const ref of ["bad", "' OR 1=1 --", randomUUID()]) {
    await assert.rejects(f.service.simulateMockPayment(ref, { status: "SUCCESS" }, "192.0.2.230"));
  }
  assert.equal(f.state.audits.length, 0); assert.equal(f.state.row.paymentStatus, "PENDING");
});
it("simulation fails closed on unavailable protection, exceeded limit and missing signing configuration", async () => {
  const f = fixture();
  f.service.redis.consumeLookup = async () => { throw new Error("private Redis credentials"); };
  await assert.rejects(f.simulate(), { status: 503, code: "MOCK_SIMULATION_PROTECTION_UNAVAILABLE" });
  f.service.redis.consumeLookup = async () => false;
  await assert.rejects(f.simulate(), { status: 429, code: "MOCK_SIMULATION_RATE_LIMITED" });
  f.service.redis.consumeLookup = async () => true;
  await assert.rejects(f.service.simulateMockPayment(f.state.row.paymentRef, { status: "SUCCESS" }, null), { status: 503 });
  f.gateway.webhookSecret = () => "short";
  await assert.rejects(f.simulate(), { status: 503, code: "MOCK_SIMULATION_UNAVAILABLE" });
  assert.equal(f.state.audits.length, 0); assert.equal(f.state.row.paymentStatus, "PENDING");
});
it("simulation reuses verified webhook rules, including FAILED to PAID, duplicates and revoked sessions", async () => {
  const f = fixture();
  assert.equal((await f.simulate("FAILED")).paymentStatus, "FAILED");
  assert.equal(f.state.row.sessionStatus, "PENDING");
  assert.equal((await f.simulate()).paymentStatus, "PAID");
  const saved = structuredClone(f.state.row);
  assert.equal((await f.simulate()).duplicate, true);
  assert.equal((await f.simulate("FAILED")).paymentStatus, "PAID");
  assert.deepEqual(f.state.row, saved); assert.equal(f.state.row.tokenHash, null);
  f.state.row.sessionStatus = "REVOKED";
  assert.equal((await f.simulate()).sessionStatus, "REVOKED");
});
it("20 concurrent browser simulations activate only once and cannot double record revenue", async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 20 }, () => f.simulate()));
  assert.equal(results.filter(result => !result.duplicate).length, 1);
  assert.equal(f.state.audits.length, 1); assert.equal(f.state.row.tokenHash, null);
});
it("simulation cannot bypass amount, CASH or unprepared checkout checks in the existing payment service", async () => {
  const f = fixture();
  f.store.getMockCheckout = async () => ({ ...f.state.row, amount: "1.00" });
  await assert.rejects(f.simulate(), { status: 409, code: "WEBHOOK_PAYMENT_MISMATCH" });
  f.store.getMockCheckout = async () => ({ ...f.state.row });
  f.state.row.paymentMethod = "CASH";
  await assert.rejects(f.simulate(), { status: 404, code: "MOCK_CHECKOUT_NOT_FOUND" });
  f.state.row.paymentMethod = "ONLINE"; f.state.prepared = false;
  await assert.rejects(f.simulate(), { status: 409, code: "ONLINE_CHECKOUT_NOT_PREPARED" });
  assert.equal(f.state.audits.length, 0); assert.equal(f.state.row.paymentStatus, "PENDING");
});
it("simulation persistence failure rolls back and a retry after a lost reply does not activate twice", async () => {
  const f = fixture(); f.state.failAudit = true;
  await assert.rejects(f.simulate(), { status: 503, code: "WEBHOOK_PERSISTENCE_UNAVAILABLE" });
  assert.equal(f.state.row.paymentStatus, "PENDING");
  f.state.failAudit = false; f.state.lostReply = true;
  await assert.rejects(f.simulate(), { status: 503 });
  assert.equal((await f.simulate()).duplicate, true); assert.equal(f.state.audits.length, 1);
});
it("HTTP simulation is no-store, defaults off and never exposes a webhook signature, secret, code or token", async t => {
  const f = fixture(), { createApp } = require("../server");
  const server = http.createServer(createApp({ paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/payments/mock-checkout/${f.state.row.paymentRef}/pay`;
  const post = body => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  f.service.simulationEnabled = () => false;
  assert.equal((await post({ status: "SUCCESS" })).status, 404);
  f.service.simulationEnabled = () => true;
  assert.equal((await post({})).status, 400);
  const response = await post({ status: "SUCCESS" });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text(); assert.equal(JSON.parse(body).data.paymentStatus, "PAID");
  assert.equal(body.includes(f.secret), false); assert.equal(body.includes("sha256="), false);
  for (const field of ["token", "authCode", "signature"]) assert.equal(Object.hasOwn(JSON.parse(body).data, field), false);
});
