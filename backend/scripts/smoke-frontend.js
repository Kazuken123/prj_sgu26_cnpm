const assert = require("node:assert/strict");
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
async function get(route, headers = {}) {
  return fetch(base + route, { headers, signal: AbortSignal.timeout(10000) });
}
(async () => {
  assert.equal((await get("/health/ready")).status, 200);
  const page = await get("/", { Accept: "text/html" });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="root"/);
  assert.ok(!html.includes("/src/main.tsx"), "Release must serve the compiled frontend.");
  const script = html.match(/<script[^>]*src="(\/assets\/[^\"]+\.js)"/);
  assert.ok(script, "Compiled frontend entry is missing.");
  const asset = await get(script[1]);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /javascript/);
  for (const route of ["/payment", "/explore", "/internal/account"]) {
    const response = await get(route, { Accept: "text/html" });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="root"/);
  }
  for (const route of ["/api/not-found", "/src/main.tsx", "/package.json", "/assets/missing.js"]) {
    assert.equal((await get(route, { Accept: "text/html" })).status, 404);
  }
  console.log("Compiled frontend, assets, client-route reload and API/source isolation passed.");
})().catch(() => { console.error("Release frontend smoke failed; check build, routes and static assets."); process.exitCode = 1; });
