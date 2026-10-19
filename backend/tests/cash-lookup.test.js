const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
function fixture() {
  const row = { sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: "CASH", amount: "50000.00",
    currency: "VND", sessionStatus: "PENDING", paymentStatus: "PENDING", createdBy: null,
    token_hash: "must-not-return", request_key_hash: "must-not-return", confirmedBy: 9 };
  const calls = [];
  const store = { lookupForStaff: async (id, sessionId, authorize) => {
    calls.push({ id, sessionId }); authorize(staff); return row;
  } };
  const service = new PaymentService(store, { consumeLookup: async () => { throw new Error("Redis must not be called"); } },
    { price: () => { throw new Error("Price configuration must not be read"); } });
  return { row, calls, store, service };
}
it("cash lookup returns only reconciliation fields and saved price for STAFF and ADMIN", async () => {
  const f = fixture();
  for (const role of ["STAFF", "ADMIN"]) {
    const result = await f.service.lookupCash({ ...staff, role }, f.row.sessionId.toUpperCase());
    assert.deepEqual(result, { sessionId: f.row.sessionId, paymentRef: f.row.paymentRef, paymentMethod: "CASH",
      amount: "50000.00", currency: "VND", sessionStatus: "PENDING", paymentStatus: "PENDING" });
  }
  assert.deepEqual(f.calls, Array.from({ length: 2 }, () => ({ id: staff.userId, sessionId: f.row.sessionId })));
});
it("cash lookup rejects invalid/currently unauthorized actors and malformed identifiers before Store", async () => {
  const f = fixture();
  for (const actor of [null, {}, { ...staff, userId: -1 }, { ...staff, role: "TOURIST" }, { ...staff, status: "LOCKED" },
    { ...staff, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(f.service.lookupCash(actor, f.row.sessionId), error => [401, 403].includes(error.status));
  }
  for (const id of [undefined, null, [], {}, "", "0", "' OR 1=1 --", "<script>", "a".repeat(10000)]) {
    await assert.rejects(f.service.lookupCash(staff, id), { status: 400, code: "INVALID_SESSION_ID" });
  }
  assert.equal(f.calls.length, 0);
});
it("cash lookup rechecks actor from Store, rejects missing and ONLINE sessions", async () => {
  const f = fixture();
  f.store.lookupForStaff = async (id, sessionId, authorize) => authorize({ ...staff, status: "LOCKED" });
  await assert.rejects(f.service.lookupCash(staff, f.row.sessionId), { status: 403 });
  f.store.lookupForStaff = async () => undefined;
  await assert.rejects(f.service.lookupCash(staff, f.row.sessionId), { status: 404, code: "VISIT_SESSION_NOT_FOUND" });
  f.store.lookupForStaff = async () => ({ ...f.row, paymentMethod: "ONLINE" });
  await assert.rejects(f.service.lookupCash(staff, f.row.sessionId), { status: 409, code: "CASH_PAYMENT_REQUIRED" });
});
it("cash lookup preserves already-paid, failed and revoked states without claiming confirmation", async () => {
  const f = fixture();
  for (const state of [{ sessionStatus: "ACTIVE", paymentStatus: "PAID" },
    { sessionStatus: "PENDING", paymentStatus: "FAILED" }, { sessionStatus: "REVOKED", paymentStatus: "PAID" }]) {
    Object.assign(f.row, state); const before = structuredClone(f.row);
    assert.equal((await f.service.lookupCash(staff, f.row.sessionId)).paymentStatus, state.paymentStatus);
    assert.deepEqual(f.row, before);
  }
});
it("cash lookup HTTP requires real internal JWT and protects against expiry, logout, wrong role/type and signature", async t => {
  const jwt = require("jsonwebtoken");
  const { createFixture, staff: credentials, admin: adminCredentials } = require("./helpers/auth.fixture");
  const auth = createFixture(); await auth.addStaff();
  const login = await auth.service.login(credentials), adminLogin = await auth.service.login(adminCredentials);
  const actor = await auth.service.authenticate(login.accessToken);
  const f = fixture();
  f.store.lookupForStaff = async (actorId, sessionId, authorize) => {
    authorize(auth.state.users.find(user => user.user_id === actorId));
    return sessionId === f.row.sessionId ? f.row : undefined;
  };
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ authService: auth.service, paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}/api/admin/payments/sessions/`;
  const get = (token, id = f.row.sessionId) => fetch(base + id, { headers: token ? { Authorization: "Bearer " + token } : {} });
  assert.equal((await get()).status, 401);
  for (const token of [login.accessToken, adminLogin.accessToken]) {
    const response = await get(token); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Object.keys((await response.json()).data).sort(), ["amount", "currency", "paymentMethod", "paymentRef", "paymentStatus", "sessionId", "sessionStatus"].sort());
  }
  const payload = jwt.decode(login.accessToken); delete payload.iat; delete payload.exp; delete payload.iss; delete payload.aud;
  const sign = (data, secret = auth.config.secret, expiresIn = "1h") => jwt.sign({ ...data, iat: Math.floor(auth.service.now() / 1000) }, secret,
    { algorithm: "HS256", issuer: auth.config.issuer, audience: auth.config.audience, expiresIn });
  for (const token of ["bad-token", sign(payload, "wrong-secret"), sign(payload, auth.config.secret, -1), sign({ ...payload, type: "visitor" })]) {
    assert.equal((await get(token)).status, 401);
  }
  const user = auth.state.users.find(item => item.user_id === actor.userId);
  // TOURIST is not an internal account role; AuthService rejects that identity.
  user.role = "TOURIST"; assert.equal((await get(login.accessToken)).status, 401); user.role = "STAFF";
  user.status = "LOCKED"; assert.equal((await get(login.accessToken)).status, 403); user.status = "ACTIVE";
  assert.equal((await get(login.accessToken, "invalid")).status, 400);
  assert.equal((await get(login.accessToken, randomUUID())).status, 404);
  f.row.paymentMethod = "ONLINE"; assert.equal((await get(login.accessToken)).status, 409); f.row.paymentMethod = "CASH";
  await auth.service.logout({ refreshToken: login.refreshToken });
  assert.equal((await get(login.accessToken)).status, 401);
  assert.equal((await get(adminLogin.accessToken)).status, 200);
  f.store.lookupForStaff = async () => { throw Object.assign(new Error("private SQL and request key"), { code: "ER_TEST" }); };
  const failed = await get(adminLogin.accessToken); assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes("private SQL"), false);
});
