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
  const adminInput = { email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD };
  assert.ok(adminInput.email && adminInput.password, "Bootstrap credentials are required for the disposable release smoke test.");
  assert.equal((await request("/health/ready")).status, 200);
  for (const route of ["/", "/demo/", "/demo/explore", "/internal/account"]) {
    const page = await request(route);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /id="root"/);
    const script = html.match(/src="([^\"]+\.js)"/);
    assert.ok(script, "The release must contain compiled React assets");
    const asset = await request(script[1]);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type"), /javascript/);
  }
  assert.equal((await request("/src/main.tsx")).status, 404);
  assert.equal((await request("/api/auth/register", input)).status, 404);
  const adminLogin = await request("/api/auth/login", adminInput);
  assert.equal(adminLogin.status, 200);
  const administrator = (await adminLogin.json()).data;
  assert.equal(administrator.user.role, "ADMIN");
  assert.equal((await request("/api/admin/staff", input)).status, 401);
  const created = await request("/api/admin/staff", { ...input, role: "ADMIN" }, administrator.accessToken);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.role, "STAFF");
  const login = await request("/api/auth/login", input);
  assert.equal(login.status, 200);
  const tokens = (await login.json()).data;
  assert.equal(tokens.user.role, "STAFF");
  assert.ok(tokens.accessToken); assert.ok(tokens.refreshToken);
  assert.equal((await request("/api/auth/me", null, tokens.accessToken)).status, 200);
  assert.equal((await request("/api/admin/staff", { ...input, email: "forbidden-" + input.email }, tokens.accessToken)).status, 403);
  const refreshed = await request("/api/auth/refresh", { refreshToken: tokens.refreshToken });
  assert.equal(refreshed.status, 200);
  const next = (await refreshed.json()).data;
  assert.equal((await request("/api/auth/refresh", { refreshToken: tokens.refreshToken })).status, 401);
  assert.equal((await request("/api/auth/logout", { refreshToken: next.refreshToken })).status, 204);
  assert.equal((await request("/api/auth/me", null, next.accessToken)).status, 401);
  assert.equal((await request("/api/auth/logout", { refreshToken: administrator.refreshToken })).status, 204);
  console.log("Release readiness, ADMIN-created STAFF, role guards and auth lifecycle passed.");
})().catch(() => { console.error("Release auth smoke test failed."); process.exitCode = 1; });
