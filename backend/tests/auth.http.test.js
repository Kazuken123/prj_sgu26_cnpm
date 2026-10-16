const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
process.env.NODE_ENV = "test";
const { createApp } = require("../server");
const AppError = require("../utils/app-error");
const { createFixture, staff, admin } = require("./helpers/auth.fixture");
describe("US-F01 internal authentication HTTP contract", () => {
  let server, base, fixture;
  before(async () => {
    fixture = createFixture(); await fixture.addStaff();
    const app = createApp({ authService: fixture.service, healthService: {
      ready: async () => { throw new AppError(503, "DATABASE_UNAVAILABLE", "Database chưa sẵn sàng."); },
    } });
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const request = (path, body, token) => fetch(base + path, { method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const login = async input => (await (await request("/api/auth/login", input)).json()).data;
  it("logs in STAFF and returns the existing nested account/token contract", async () => {
    const data = await login(staff); assert.ok(data.accessToken); assert.ok(data.refreshToken);
    const me = await request("/api/auth/me", undefined, data.accessToken);
    assert.equal(me.status, 200);
    assert.deepEqual((await me.json()).data, { id: data.user.id, email: staff.email,
      fullName: staff.fullName, role: "STAFF", status: "ACTIVE" });
  });
  it("has no public registration or owner-request endpoints", async () => {
    for (const route of ["/api/auth/register", "/api/auth/register-owner"]) assert.equal((await request(route, staff)).status, 404);
    assert.equal((await request("/api/auth/owner-request/status")).status, 404);
  });
  it("rejects missing/bad identity and STAFF access to the ADMIN endpoint", async () => {
    assert.equal((await request("/api/admin/staff", staff)).status, 401);
    assert.equal((await request("/api/admin/staff", staff, "bad")).status, 401);
    const data = await login(staff);
    assert.equal((await request("/api/admin/staff", staff, data.accessToken)).status, 403);
  });
  it("ADMIN creates ACTIVE STAFF, ignores injected role/status, and writes a safe audit entry", async () => {
    const data = await login(admin);
    const input = { ...staff, email: "http-staff@example.com", role: "ADMIN", status: "LOCKED" };
    const response = await request("/api/admin/staff", input, data.accessToken);
    assert.equal(response.status, 201);
    const created = (await response.json()).data;
    assert.equal(created.role, "STAFF"); assert.equal(created.status, "ACTIVE");
    assert.equal(created.password, undefined); assert.equal(created.passwordHash, undefined);
    const audit = fixture.state.audits.at(-1);
    assert.equal(audit.userId, data.user.id); assert.equal(audit.resourceId, String(created.userId));
    assert.equal(JSON.stringify(audit).includes(input.password), false);
  });
  it("returns validation/conflict responses and hides malformed JSON details", async () => {
    const data = await login(admin);
    const missing = await request("/api/admin/staff", {}, data.accessToken);
    assert.equal(missing.status, 400); assert.equal((await missing.json()).code, "VALIDATION_ERROR");
    assert.equal((await request("/api/admin/staff", staff, data.accessToken)).status, 409);
    const malformed = await fetch(base + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    });
    assert.equal(malformed.status, 400); assert.equal((await malformed.json()).code, "INVALID_JSON");
  });
  it("checks current ADMIN role instead of trusting an earlier JWT", async () => {
    const data = await login(admin);
    const actor = fixture.state.users.find(u => u.email === admin.email); actor.role = "STAFF";
    try { assert.equal((await request("/api/admin/staff", { ...staff, email: "blocked@example.com" }, data.accessToken)).status, 403); }
    finally { actor.role = "ADMIN"; }
  });
  it("refreshes once, rejects replay, and revokes access on logout", async () => {
    const data = await login(staff);
    const refreshed = await request("/api/auth/refresh", { refreshToken: data.refreshToken }); assert.equal(refreshed.status, 200);
    const next = (await refreshed.json()).data;
    assert.equal((await request("/api/auth/refresh", { refreshToken: data.refreshToken })).status, 401);
    assert.equal((await request("/api/auth/logout", { refreshToken: next.refreshToken })).status, 204);
    assert.equal((await request("/api/auth/me", undefined, next.accessToken)).status, 401);
  });
  it("distinguishes liveness from readiness", async () => {
    assert.equal((await request("/health")).status, 200);
    const response = await request("/health/ready"); assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "DATABASE_UNAVAILABLE");
  });
  it("returns controlled errors for unexpected persistence failures", async () => {
    const original = fixture.service.authStore.withLockedUser;
    fixture.service.authStore.withLockedUser = async () => { throw Object.assign(new Error("private database details"), { code: "DB_TEST_FAILURE" }); };
    try {
      const response = await request("/api/auth/login", staff);
      assert.equal(response.status, 500); assert.equal((await response.json()).error.includes("private"), false);
    } finally { fixture.service.authStore.withLockedUser = original; }
  });
});
