const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { createFrontendRouter } = require("../routers/frontend.router");

test("compiled React app supports deep links without exposing source or masking API errors", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-web-test-"));
  // The project may live below a hidden parent directory such as .gemini.
  const dist = path.join(directory, ".hidden", "dist");
  await fs.mkdir(path.join(dist, "assets"), { recursive: true });
  await fs.writeFile(path.join(dist, "index.html"), '<html><div id="root"></div><script src="/assets/app.js"></script></html>');
  await fs.writeFile(path.join(dist, "assets/app.js"), 'console.log("compiled")');
  await fs.writeFile(path.join(directory, "package.json"), '{"private":true}');
  const app = express();
  app.get("/api/test", (req, res) => res.json({ data: "backend" }));
  app.use(createFrontendRouter(dist));
  const server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ["/", "/payment", "/explore", "/internal/pois/1/edit", "/demo/", "/demo/explore"]) {
    const response = await fetch(base + route, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), /id="root"/);
    assert.equal(response.headers.get("cache-control"), "no-cache");
  }
  assert.equal((await fetch(base + "/assets/app.js")).status, 200);
  assert.deepEqual(await (await fetch(base + "/api/test")).json(), { data: "backend" });
  for (const route of ["/api/missing", "/health/missing", "/src/main.tsx", "/package.json", "/.env", "/assets/missing.js"]) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
  await fs.unlink(path.join(dist, "index.html"));
  const missing = await fetch(base + "/demo/");
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, "FRONTEND_NOT_BUILT");
});
