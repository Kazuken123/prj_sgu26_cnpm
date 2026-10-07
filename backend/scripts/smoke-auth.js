const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const input = { email: "smoke-" + randomUUID() + "@example.invalid", password: randomUUID() + "Aa1!" };
async function request(route, body, token) {
  const response = await fetch(base + route, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return response;
}
(async () => {
  assert.equal((await request("/health/ready")).status, 200);
  assert.equal((await request("/api/auth/register", input)).status, 201);
  const login = await request("/api/auth/login", input);
  assert.equal(login.status, 200);
  const tokens = (await login.json()).data;
  assert.ok(tokens.accessToken); assert.ok(tokens.refreshToken);
  assert.equal((await request("/api/auth/me", null, tokens.accessToken)).status, 200);
  const refreshed = await request("/api/auth/refresh", { refreshToken: tokens.refreshToken });
  assert.equal(refreshed.status, 200);
  const next = (await refreshed.json()).data;
  assert.equal((await request("/api/auth/logout", { refreshToken: next.refreshToken })).status, 204);
  assert.equal((await request("/api/auth/me", null, next.accessToken)).status, 401);
  console.log("Release readiness and auth lifecycle passed.");
})().catch(() => { console.error("Release auth smoke test failed."); process.exitCode = 1; });
