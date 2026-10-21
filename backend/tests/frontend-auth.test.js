const { it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");

// Auth regressions now exercise React's API module in frontend/test/auth-regression.test.js.
let root, server, base;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-frontend-http-"));
  const dist = path.join(root, "dist");
  await fs.mkdir(path.join(dist, "assets"), { recursive: true });
  await fs.writeFile(path.join(dist, "index.html"), '<!doctype html><div id="root"></div><script type="module" src="/assets/app.js"></script>');
  await fs.writeFile(path.join(dist, "assets", "app.js"), 'console.log("built frontend");');
  await fs.writeFile(path.join(root, "private.txt"), "not a public asset");
  server = createApp({ frontendDir: dist }).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (root) await fs.rm(root, { recursive: true, force: true });
  await require("../config/database").end();
});
it("browser root serves the built shell while the existing API probe remains text", async () => {
  const page = await fetch(base + "/", { headers: { Accept: "text/html" } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /\/assets\/app.js/);
  const probe = await fetch(base + "/");
  assert.equal(probe.status, 200);
  assert.match(await probe.text(), /API/);
});
it("React routes support direct navigation and reload", async () => {
  for (const route of ["/payment", "/explore", "/internal/account", "/internal/pois/12/edit", "/internal/jobs"]) {
    const result = await fetch(base + route, { headers: { Accept: "text/html" } });
    assert.equal(result.status, 200, route);
    assert.match(await result.text(), /id="root"/);
  }
});
it("only built assets are public; missing API, source and assets never receive HTML", async () => {
  const asset = await fetch(base + "/assets/app.js");
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /javascript/);
  for (const route of ["/api/not-found", "/src/main.tsx", "/package.json", "/.env", "/private.txt", "/assets/missing.js"]) {
    const result = await fetch(base + route, { headers: { Accept: "text/html" } });
    assert.equal(result.status, 404, route);
    assert.doesNotMatch(await result.text(), /id="root"/);
  }
});
it("demo entry serves the React shell", async () => {
  const result = await fetch(base + "/demo", { redirect: "manual" });
  assert.equal(result.status, 200);
  assert.match(await result.text(), /id="root"/);
});
it("missing frontend build returns a safe 503 without affecting API health", async () => {
  const missing = createApp({ frontendDir: path.join(root, "not-built") }).listen(0, "127.0.0.1");
  await new Promise(resolve => missing.once("listening", resolve));
  const url = `http://127.0.0.1:${missing.address().port}`;
  try {
    const page = await fetch(url + "/", { headers: { Accept: "text/html" } });
    assert.equal(page.status, 503);
    const error = await page.json();
    assert.equal(error.code, "FRONTEND_NOT_BUILT");
    assert.ok(!JSON.stringify(error).includes(root));
    assert.equal((await fetch(url + "/health")).status, 200);
  } finally { await new Promise(resolve => missing.close(resolve)); }
});
