const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const { getVisitValidityMs } = require("../config/payment");
const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
function fixture() {
  const row = { sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: "CASH", amount: "50000.00", currency: "VND",
    paymentStatus: "PENDING", sessionStatus: "PENDING", paidAt: null, confirmedBy: null, activatedAt: null, expiresAt: null,
    tokenHash: null, reissueCount: 0 };
  const state = { actor: staff, reads: 0, writes: 0, clocks: 0 };
  const store = { withCashConfirmation: async (actorId, sessionId, authorize, work) => {
    state.reads++; authorize(state.actor);
    return work(sessionId === row.sessionId ? row : undefined, {
      currentTime: async () => { state.clocks++; return new Date("2026-10-19T10:00:00.000Z"); },
      persist: async ({ paidAt, expiresAt }) => {
        state.writes++; Object.assign(row, { paymentStatus: "PAID", sessionStatus: "ACTIVE", confirmedBy: actorId,
          paidAt, activatedAt: paidAt, expiresAt }); return row;
      },
    });
  } };
  const service = new PaymentService(store, { consumeLookup: async () => { throw new Error("Redis must not be used"); } },
    { price: () => { throw new Error("Current price must not be used"); }, validityMs: () => getVisitValidityMs({}) });
  return { row, state, store, service };
}
it("ticket validity defaults to 24 hours, is configurable, and rejects invalid or unsafe values", () => {
  assert.equal(getVisitValidityMs({}), 86400000);
  assert.equal(getVisitValidityMs({ VISIT_VALIDITY_HOURS: "48" }), 172800000);
  assert.equal(getVisitValidityMs({ VISIT_VALIDITY_HOURS: "1" }), 3600000);
  for (const value of ["", "0", "-1", "1.5", "1e3", "0x18", "Infinity", "bad", "9999999999999999"]) {
    assert.throws(() => getVisitValidityMs({ VISIT_VALIDITY_HOURS: value }));
  }
});
it("cash confirmation activates the same visit for 24 hours from confirmation, returning no token or code", async () => {
  const f = fixture();
  const result = await f.service.confirmCash(staff, f.row.sessionId.toUpperCase(), {});
  assert.equal(result.sessionId, f.row.sessionId); assert.equal(result.paymentRef, f.row.paymentRef);
  assert.equal(result.amount, "50000.00"); assert.equal(result.paymentStatus, "PAID"); assert.equal(result.sessionStatus, "ACTIVE");
  assert.equal(result.alreadyConfirmed, false);
  assert.equal(result.activatedAt.getTime(), result.paidAt.getTime());
  assert.equal(result.expiresAt.getTime() - result.paidAt.getTime(), 86400000);
  assert.deepEqual(Object.keys(result).sort(), ["sessionId", "paymentRef", "paymentMethod", "amount", "currency", "sessionStatus", "paymentStatus", "paidAt", "activatedAt", "expiresAt", "alreadyConfirmed"].sort());
  assert.deepEqual([f.state.reads, f.state.writes, f.state.clocks], [1, 1, 1]);
  assert.equal(f.row.tokenHash, null); assert.equal(f.row.reissueCount, 0);
});
it("repeat confirmation preserves the first dates and actor even with changed or invalid configuration", async () => {
  const f = fixture();
  await f.service.confirmCash(staff, f.row.sessionId);
  const before = structuredClone(f.row);
  f.service.validityMs = () => { throw new Error("Bad config must not prevent reconciliation"); };
  const repeated = await f.service.confirmCash({ ...staff, userId: 8, role: "ADMIN" }, f.row.sessionId);
  assert.equal(repeated.alreadyConfirmed, true); assert.deepEqual(f.row, before);
  assert.deepEqual([f.state.writes, f.state.clocks], [1, 1]);
  f.row.sessionStatus = "REVOKED";
  assert.equal((await f.service.confirmCash(staff, f.row.sessionId)).sessionStatus, "REVOKED");
  assert.equal(f.state.writes, 1);
});
it("invalid confirmation payloads, identifiers and unauthorized actors fail before Store", async () => {
  const f = fixture();
  for (const body of [null, [], "", { amount: 1 }, { status: "PAID" }, { paymentRef: "other" }, { expiresAt: "2099" }, { token: "injected" }]) {
    await assert.rejects(f.service.confirmCash(staff, f.row.sessionId, body), { code: "INVALID_CASH_CONFIRMATION" });
  }
  for (const id of [undefined, null, "", "' OR 1=1 --", "<script>", "0"]) {
    await assert.rejects(f.service.confirmCash(staff, id), { code: "INVALID_SESSION_ID" });
  }
  for (const actor of [null, {}, { ...staff, role: "TOURIST" }, { ...staff, status: "LOCKED" },
    { ...staff, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(f.service.confirmCash(actor, f.row.sessionId), error => [401, 403].includes(error.status));
  }
  assert.equal(f.state.reads, 0);
});
it("confirmation rejects missing, ONLINE, failed, revoked, preactivated or inconsistent visits without writes", async () => {
  await assert.rejects(fixture().service.confirmCash(staff, randomUUID()), { code: "VISIT_SESSION_NOT_FOUND" });
  for (const patch of [{ paymentMethod: "ONLINE" }, { paymentStatus: "FAILED" }, { sessionStatus: "REVOKED" },
    { sessionStatus: "ACTIVE" }, { tokenHash: "existing-token-hash" }, { paidAt: new Date() }, { confirmedBy: 8 },
    { reissueCount: 1 }, { paymentStatus: "PAID" }]) {
    const f = fixture(); Object.assign(f.row, patch);
    const before = structuredClone(f.row);
    await assert.rejects(f.service.confirmCash(staff, f.row.sessionId), error => error.status === 409);
    assert.equal(f.state.writes, 0); assert.deepEqual(f.row, before);
  }
});
it("bad validity config and dates outside SQL range do not record money", async () => {
  for (const duration of [0, -1, 1.5, Number.NaN, 9007199254740991]) {
    const f = fixture(); f.service.validityMs = () => duration;
    await assert.rejects(f.service.confirmCash(staff, f.row.sessionId), { code: "VISIT_VALIDITY_NOT_CONFIGURED", status: 503 });
    assert.equal(f.state.writes, 0);
  }
});
it("confirmation checks current account inside Store and propagates persistence failures", async () => {
  const f = fixture(); f.state.actor = { ...staff, status: "LOCKED" };
  await assert.rejects(f.service.confirmCash(staff, f.row.sessionId), { code: "FORBIDDEN" });
  f.state.actor = undefined;
  await assert.rejects(f.service.confirmCash(staff, f.row.sessionId), { code: "MISSING_ACCESS_TOKEN" });
  f.store.withCashConfirmation = async () => { throw new Error("storage failure"); };
  await assert.rejects(f.service.confirmCash(staff, f.row.sessionId), /storage failure/);
  assert.equal(f.state.writes, 0);
});
it("confirmation HTTP requires real JWT, blocks expiry/logout/visitor tokens and returns safe no-store results", async t => {
  const jwt = require("jsonwebtoken");
  const { createFixture, staff: credentials, admin: adminCredentials } = require("./helpers/auth.fixture");
  const auth = createFixture(); await auth.addStaff();
  const login = await auth.service.login(credentials), adminLogin = await auth.service.login(adminCredentials);
  const f = fixture();
  const original = f.store.withCashConfirmation;
  f.store.withCashConfirmation = async (actorId, sessionId, authorize, work) => {
    f.state.actor = auth.state.users.find(user => user.user_id === actorId);
    return original(actorId, sessionId, authorize, work);
  };
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ authService: auth.service, paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = `/api/admin/payments/sessions/${f.row.sessionId}/confirm-cash`;
  const post = (token, body = {}, target = path) => fetch(base + target, { method: "POST", headers: {
    "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  assert.equal((await post()).status, 401);
  const payload = jwt.decode(login.accessToken); delete payload.iat; delete payload.exp; delete payload.iss; delete payload.aud;
  const sign = (data, secret = auth.config.secret, expiresIn = "1h") => jwt.sign({ ...data, iat: Math.floor(auth.service.now() / 1000) }, secret,
    { algorithm: "HS256", issuer: auth.config.issuer, audience: auth.config.audience, expiresIn });
  for (const token of ["bad", sign(payload, "bad-signature"), sign(payload, auth.config.secret, -1), sign({ ...payload, type: "visitor" })]) {
    assert.equal((await post(token)).status, 401);
  }
  const actor = auth.state.users.find(user => user.email === credentials.email);
  actor.status = "LOCKED"; assert.equal((await post(login.accessToken)).status, 403); actor.status = "ACTIVE";
  assert.equal((await post(login.accessToken, { amount: 1 })).status, 400);
  assert.equal((await post(login.accessToken, {}, "/api/admin/payments/sessions/bad/confirm-cash")).status, 400);
  assert.equal((await post(login.accessToken, {}, `/api/admin/payments/sessions/${randomUUID()}/confirm-cash`)).status, 404);
  f.row.paymentMethod = "ONLINE"; assert.equal((await post(login.accessToken)).status, 409); f.row.paymentMethod = "CASH";
  const first = await post(login.accessToken); assert.equal(first.status, 200); assert.equal(first.headers.get("cache-control"), "no-store");
  const data = (await first.json()).data; assert.equal(data.alreadyConfirmed, false); assert.equal(data.paidAt, data.activatedAt);
  assert.equal(data.expiresAt, "2026-10-20T10:00:00.000Z");
  assert.equal((await (await post(adminLogin.accessToken)).json()).data.alreadyConfirmed, true);
  assert.equal((await post(login.accessToken, {}, path.replace("/api/admin/", "/api/"))).status, 404);
  await auth.service.logout({ refreshToken: login.refreshToken }); assert.equal((await post(login.accessToken)).status, 401);
  f.store.withCashConfirmation = async () => { throw Object.assign(new Error("private SQL token"), { code: "ER_TEST" }); };
  const failed = await post(adminLogin.accessToken); assert.equal(failed.status, 500); assert.equal((await failed.text()).includes("private SQL"), false);
});
