const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { ContentService } = require("../services/content.service");
const ContentStore = require("../stores/content.store");
const { createContentRouter } = require("../routers/content.router");
const AppError = require("../utils/app-error");
function fixture(patch = {}) {
  const ops = { nowUtc: new Date("2026-10-24T00:00:00Z"),
    languages: [{ code: "vi", name: "Việt" }, { code: "en", name: "English" }, { code: "fr", name: "Français" }],
    content: async () => ({ pois: [{ poiId: 1, originalName: "Hươu", latitude: "10.78", longitude: "106.70",
      category: "ANIMAL", triggerRadius: 30, avatarUrl: null, displayOrder: 1, token: "PRIVATE" }],
    translations: [{ poiId: 1, languageCode: "vi", name: "Hươu", description: "Giới thiệu", audioScript: "PRIVATE", fileUrl: "PRIVATE" },
      { poiId: 1, languageCode: "en", name: "Giraffe", description: "Introduction" }] }), ...patch };
  return new ContentService({ withMapSnapshot: work => work(ops) });
}
it("public map uses an allowlist, has no narration/media/private data and marks fallback truthfully", async () => {
  const data = await fixture().getMap({ languageCode: "FR" });
  assert.equal(data.requestedLanguageCode, "fr"); assert.equal(data.expiresAt, null); assert.deepEqual(data.tours, []);
  const poi = data.pois[0]; assert.equal(poi.latitude, 10.78); assert.equal(poi.text.languageCode, "en");
  assert.equal(poi.text.isFallback, true); assert.equal(poi.text.audioScript, null); assert.equal(poi.audio.status, "UNAVAILABLE");
  assert.equal(poi.audio.url, null); assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
  assert.deepEqual(Object.keys(poi).sort(), ["poiId", "originalName", "category", "conservationStatus", "activityHours", "latitude", "longitude", "triggerRadius", "avatarUrl", "displayOrder", "locationNote", "text", "audio"].sort());
});
it("public map validates query before Store and rejects unsupported language without a content read", async () => {
  let calls = 0; const service = new ContentService({ withMapSnapshot: () => { calls++; } });
  for (const query of [{}, { languageCode: ["vi", "en"] }, { languageCode: "vi", token: "x" }, { languageCode: "' OR 1=1" }]) {
    await assert.rejects(service.getMap(query), { status: 400, code: "VALIDATION_ERROR" });
  }
  assert.equal(calls, 0);
  await assert.rejects(fixture({ content: () => assert.fail("must not read") }).getMap({ languageCode: "de" }), { status: 400, code: "LANGUAGE_NOT_SUPPORTED" });
});
it("public map handles empty introductions and masks driver errors rather than trusting their status", async () => {
  const service = fixture({ content: async () => ({ pois: [{ poiId: 1, latitude: 10, longitude: 106 }], translations: [] }) });
  assert.equal((await service.getMap({ languageCode: "vi" })).pois[0].text.status, "UNAVAILABLE");
  const bad = new ContentService({ withMapSnapshot: () => { throw new AppError(400, "SQL_PRIVATE", "password PRIVATE"); } });
  await assert.rejects(bad.getMap({ languageCode: "vi" }), error => error.status === 503 && error.code === "MAP_UNAVAILABLE" && !error.message.includes("PRIVATE"));
});
it("public SQL projection uses a repeatable snapshot and excludes scripts, audio, sessions and access logs", async () => {
  const statements = [];
  const connection = { query: async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("nowUtc")) return [[{ nowUtc: new Date() }]];
    if (sql.includes("SELECT code")) return [[{ code: "vi", name: "Việt" }]];
    return [[]];
  }, beginTransaction: async () => {}, commit: async () => {}, release: () => {}, rollback: async () => {} };
  const service = new ContentService(new ContentStore({ getConnection: async () => connection }));
  assert.deepEqual((await service.getMap({ languageCode: "vi" })).pois, []);
  const sql = statements.map(item => item.sql).join("\n");
  assert.match(sql, /REPEATABLE READ/); assert.match(sql, /t.source_version = p.content_version/);
  assert.match(sql, /t.status = 'READY'/); assert.match(sql, /p.status = 'ACTIVE'/);
  assert.doesNotMatch(sql, /audio_script|AUDIOS|PAYMENTS|VISIT_SESSIONS|BUNDLE_ACCESS_LOGS|INSERT|UPDATE /);
  assert.deepEqual(statements.at(-1).params, ["vi"]);
});
it("anonymous/stale tokens can view map, while bundle remains behind visitor authentication", async () => {
  let authCalls = 0;
  const app = express();
  app.use("/api/content", createContentRouter({ authenticateVisitor: async () => { authCalls++; throw new AppError(401, "INVALID_VISITOR_TOKEN", "Invalid"); } }, fixture()));
  app.use((error, req, res, next) => { res.status(error.status || 500).json({ code: error.code }); });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const headers of [{}, { Authorization: "Bearer stale-token" }]) {
      const response = await fetch(base + "/api/content/map?languageCode=vi", { headers });
      assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).data.pois[0].audio.url, null);
    }
    assert.equal(authCalls, 0);
    assert.equal((await fetch(base + "/api/content/bundle?languageCode=vi")).status, 401);
    assert.equal((await fetch(base + "/api/content/bundle?languageCode=vi", { headers: { Authorization: "Bearer stale-token" } })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
