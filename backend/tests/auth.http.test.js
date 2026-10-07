const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
process.env.NODE_ENV = "test";
const { createApp } = require("../server");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
const AppError = require("../utils/app-error");
const { createFixture, tourist, owner } = require("./helpers/auth.fixture");

describe("Auth HTTP contract and role guards", () => {
  let server, base, fixture;
  before(async () => {
    fixture = createFixture();
    const app = createApp({ authService: fixture.service, healthService: { ready: async () => { throw new AppError(503, "DATABASE_UNAVAILABLE", "Database chưa sẵn sàng."); } } });
    const guards = createAuthMiddleware(fixture.service);
    // Mount before the final error handler for the test-only protected routes.
    const protectedApp = require("express")();
    protectedApp.get("/admin", guards.verifyToken, requireRole("ADMIN"), (req, res) => res.json({ ok: true }));
    protectedApp.get("/owner", guards.verifyToken, guards.requireApprovedOwner, (req, res) => res.json({ ok: true }));
    protectedApp.use(require("../middlewares/error.middleware"));
    const parent = require("express")(); parent.use("/protected", protectedApp); parent.use(app);
    server = http.createServer(parent);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const request = (path, body, token) => fetch(base + path, { method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  it("register/login/me use the documented nested data contract", async () => {
    assert.equal((await request("/api/auth/register", tourist)).status, 201);
    const response = await request("/api/auth/login", tourist); assert.equal(response.status, 200);
    const { data } = await response.json(); assert.ok(data.accessToken); assert.ok(data.refreshToken);
    const me = await request("/api/auth/me", undefined, data.accessToken);
    assert.equal(me.status, 200); assert.equal((await me.json()).data.email, tourist.email);
  });
  it("returns 400 validation and 409 conflict without internal details", async () => {
    const missing = await request("/api/auth/register", {});
    assert.equal(missing.status, 400); assert.equal((await missing.json()).code, "VALIDATION_ERROR");
    assert.equal((await request("/api/auth/register", tourist)).status, 409);
    const malformed = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400); assert.equal((await malformed.json()).code, "INVALID_JSON");
  });
  it("returns 401 for missing/bad tokens and 403 for the wrong role", async () => {
    assert.equal((await request("/protected/admin")).status, 401);
    assert.equal((await request("/protected/admin", undefined, "bad")).status, 401);
    const { data } = await (await request("/api/auth/login", tourist)).json();
    assert.equal((await request("/protected/admin", undefined, data.accessToken)).status, 403);
    fixture.state.users[0].role = "ADMIN";
    assert.equal((await request("/protected/admin", undefined, data.accessToken)).status, 200);
    fixture.state.users[0].role = "TOURIST";
    assert.equal((await request("/api/auth/owner-request/status", undefined, data.accessToken)).status, 403);
  });
  it("pending owner can read own status but cannot use an owner business route", async () => {
    assert.equal((await request("/api/auth/register-owner", owner)).status, 201);
    const { data } = await (await request("/api/auth/login", owner)).json();
    const status = await request("/api/auth/owner-request/status", undefined, data.accessToken);
    assert.equal(status.status, 200); assert.equal((await status.json()).data.status, "PENDING");
    assert.equal((await request("/protected/owner", undefined, data.accessToken)).status, 403);
  });
  it("refresh/logout work and logout makes the old access token unusable", async () => {
    const { data } = await (await request("/api/auth/login", tourist)).json();
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
  it("unexpected persistence failures are reported as 500, not credential errors", async () => {
    const original = fixture.service.authStore.withLockedUser;
    fixture.service.authStore.withLockedUser = async () => { throw Object.assign(new Error("private database details"), { code: "DB_TEST_FAILURE" }); };
    try {
      const response = await request("/api/auth/login", tourist);
      assert.equal(response.status, 500);
      assert.equal((await response.json()).error.includes("private"), false);
    } finally { fixture.service.authStore.withLockedUser = original; }
  });
});
