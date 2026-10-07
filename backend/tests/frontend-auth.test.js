const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function client(fetch) {
  const storage = new Map();
  const window = {};
  const context = vm.createContext({ window, fetch,
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../frontend/auth.js"), "utf8"), context);
  return { auth: window.FoodTourAuth, storage };
}
it("demo client uses the real auth contract, renews an expired access token once and sends Bearer", async () => {
  const calls = [];
  const f = client(async (url, options) => {
    calls.push({ url, ...options });
    if (calls.length === 1) return { status: 401, ok: false, json: async () => ({ error: "expired" }) };
    if (url === "/api/auth/refresh") return { status: 200, ok: true, json: async () => ({ data: { accessToken: "new-access", refreshToken: "new-refresh" } }) };
    return { status: 200, ok: true, json: async () => ({ data: { email: "test@example.com" } }) };
  });
  f.auth.saveSession({ accessToken: "old-access", refreshToken: "old-refresh" });
  const result = await f.auth.request("/me", { authenticated: true });
  assert.equal(result.data.email, "test@example.com");
  assert.equal(calls[0].headers.Authorization, "Bearer old-access");
  assert.equal(calls[1].url, "/api/auth/refresh");
  assert.equal(JSON.parse(calls[1].body).refreshToken, "old-refresh");
  assert.equal(calls[2].headers.Authorization, "Bearer new-access");
});
it("demo logout revokes the session on the server before removing stored tokens", async () => {
  let revoked = false;
  const f = client(async (url, options) => {
    assert.equal(url, "/api/auth/logout"); assert.equal(JSON.parse(options.body).refreshToken, "refresh");
    revoked = true; return { status: 204, ok: true };
  });
  f.auth.saveSession({ accessToken: "access", refreshToken: "refresh" });
  await f.auth.logout();
  assert.equal(revoked, true); assert.equal(f.auth.hasSession(), false);
});
it("demo retains its session when logout cannot reach the server, allowing a retry", async () => {
  const f = client(async () => { throw new Error("network error"); });
  f.auth.saveSession({ accessToken: "access", refreshToken: "refresh" });
  await assert.rejects(f.auth.logout(), /network error/);
  assert.equal(f.auth.hasSession(), true);
});
it("all inline demo scripts have valid JavaScript syntax", () => {
  for (const name of ["index.html", "register.html", "account.html"]) {
    const html = fs.readFileSync(path.resolve(__dirname, "../../frontend", name), "utf8");
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});
