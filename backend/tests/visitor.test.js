const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const http = require("node:http");
const { PaymentService } = require("../services/payment.service");
const PaymentStore = require("../stores/payment.store");
function fixture() {
  const now = Date.parse("2026-10-20T10:00:00Z"), token = "tcv_visit_" + randomBytes(32).toString("hex");
  const state = { calls: [], fail: false, row: { sessionId: randomUUID(), sessionStatus: "ACTIVE", paymentStatus: "PAID",
    paidAt: new Date(now - 60000), activatedAt: new Date(now - 60000), expiresAt: new Date(now + 3600000), nowUtc: new Date(now) } };
  const service = new PaymentService({ getVisitorByTokenHash: async hash => {
    state.calls.push(hash); if (state.fail) throw new Error("private SQL/raw secret");
    return hash === createHash("sha256").update(token).digest("hex") ? state.row : undefined;
  } });
  return { service, state, token };
}
it("guest authentication looks up only SHA-256 and returns the minimal original session/expiry", async () => {
  const f = fixture(), result = await f.service.authenticateVisitor(f.token);
  assert.deepEqual(result, { sessionId: f.state.row.sessionId, status: "ACTIVE", expiresAt: f.state.row.expiresAt });
  assert.deepEqual(f.state.calls, [createHash("sha256").update(f.token).digest("hex")]);
  assert.equal(JSON.stringify(result).includes(f.token), false);
});
it("guest authentication rejects raw codes, internal JWTs, injection and malformed tokens before SQL", async () => {
  for (const token of [null, undefined, "", "012345", "a".repeat(64), "eyJhbGciOiJIUzI1NiJ9.payload.signature", "' OR 1=1 --", "<script>",
    "tcv_visit_" + "A".repeat(64), "tcv_visit_" + "a".repeat(63), "tcv_visit_" + "a".repeat(65)]) {
    const f = fixture(); await assert.rejects(f.service.authenticateVisitor(token), { status: 401, code: "INVALID_VISITOR_TOKEN" });
    assert.equal(f.state.calls.length, 0);
  }
});
it("unknown and tampered well-formed tokens cannot authenticate", async () => {
  const f = fixture();
  await assert.rejects(f.service.authenticateVisitor("tcv_visit_" + "0".repeat(64)), { status: 401 });
  f.state.row = undefined; await assert.rejects(f.service.authenticateVisitor(f.token), { status: 401 });
});
it("guest access expires exactly at the SQL UTC deadline without relying on the app clock", async () => {
  const f = fixture(); f.service.now = () => 0;
  f.state.row.nowUtc = new Date(f.state.row.expiresAt.getTime() - 1);
  assert.equal((await f.service.authenticateVisitor(f.token)).status, "ACTIVE");
  f.state.row.nowUtc = new Date(f.state.row.expiresAt);
  await assert.rejects(f.service.authenticateVisitor(f.token), { code: "VISIT_SESSION_EXPIRED", status: 401 });
});
it("current revoked, unpaid and malformed session state is rechecked on every request", async () => {
  for (const patch of [{ sessionStatus: "REVOKED" }, { sessionStatus: "PENDING" }, { paymentStatus: "PENDING" },
    { paymentStatus: "FAILED" }, { paidAt: null }, { activatedAt: null }, { expiresAt: null }, { expiresAt: "bad date" }]) {
    const f = fixture(); await f.service.authenticateVisitor(f.token); Object.assign(f.state.row, patch);
    await assert.rejects(f.service.authenticateVisitor(f.token), { status: 401 }); assert.equal(f.state.calls.length, 2);
  }
});
it("SQL failure or unavailable database clock refuses guest access with safe 503", async () => {
  const f = fixture(); f.state.fail = true;
  await assert.rejects(f.service.authenticateVisitor(f.token), error => error.status === 503 && !error.message.includes("private"));
  f.state.fail = false; f.state.row.nowUtc = null;
  await assert.rejects(f.service.authenticateVisitor(f.token), { code: "VISITOR_AUTH_UNAVAILABLE" });
});
it("visitor Store uses a parameterized hash lookup, payment join and database UTC in one read", async () => {
  let statement, params;
  const store = new PaymentStore({ query: async (sql, values) => { statement = sql; params = values; return [[{ sessionId: "fixture" }]]; } });
  assert.equal((await store.getVisitorByTokenHash("fixture-hash")).sessionId, "fixture");
  assert.match(statement, /WHERE s.token_hash = \?/); assert.match(statement, /JOIN PAYMENTS/); assert.match(statement, /UTC_TIMESTAMP\(3\)/);
  assert.deepEqual(params, ["fixture-hash"]); assert.equal(statement.includes("fixture-hash"), false);
});
it("guest HTTP accepts only Bearer header, keeps no-store and separates real STAFF/ADMIN identities", async t => {
  const { createFixture, staff, admin } = require("./helpers/auth.fixture");
  const auth = createFixture(); await auth.addStaff();
  const staffToken = (await auth.service.login(staff)).accessToken, adminToken = (await auth.service.login(admin)).accessToken;
  const f = fixture(), { createApp } = require("../server");
  const server = http.createServer(createApp({ authService: auth.service, paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`, get = (authorization, suffix = "") => fetch(base + "/api/visits/me" + suffix,
    { headers: authorization ? { Authorization: authorization } : {} });
  for (const header of [undefined, "Basic " + f.token, "Bearer", "Bearer " + f.token + " extra", "Bearer " + staffToken, "Bearer " + adminToken]) {
    const response = await get(header); assert.equal(response.status, 401); assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await get(undefined, "?token=" + f.token)).status, 401);
  const response = await get("bearer " + f.token, "?sessionId=" + randomUUID());
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual((await response.json()).data, { sessionId: f.state.row.sessionId, status: "ACTIVE", expiresAt: f.state.row.expiresAt.toISOString() });
  assert.equal((await fetch(base + "/api/auth/me", { headers: { Authorization: "Bearer " + f.token } })).status, 401);
  assert.equal((await fetch(base + "/api/admin/payments/sessions/" + f.state.row.sessionId, { headers: { Authorization: "Bearer " + f.token } })).status, 401);
  f.state.row.sessionStatus = "REVOKED"; assert.equal((await get("Bearer " + f.token)).status, 401);
  f.state.fail = true; const unavailable = await get("Bearer " + f.token); assert.equal(unavailable.status, 503);
  const error = await unavailable.text(); assert.equal(error.includes(f.token), false); assert.equal(error.includes("private"), false);
});
