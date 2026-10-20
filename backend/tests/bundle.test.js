const { it } = require("node:test");
const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const { languageOrder, buildContent } = require("../services/bundle-content");
const { ContentService } = require("../services/content.service");
const AuthStore = require("../stores/auth.store");
const AppError = require("../utils/app-error");
const token = "tcv_visit_" + "a".repeat(64), tokenHash = createHash("sha256").update(token).digest("hex");
const languages = [{ code: "en", name: "English" }, { code: "vi", name: "Tiếng Việt" }, { code: "fr", name: "Français" }];
const text = (code, patch = {}) => ({ poiId: 1, languageCode: code, status: "READY", sourceVersion: 2, name: "Name " + code,
  description: "Description " + code, audioScript: "Script " + code, audioStatus: "AVAILABLE", audioVersion: 2,
  fileUrl: "/api/media/audio/" + randomUUID() + ".wav", duration: 1, fileSize: 32044, ...patch });
function snapshot(translations = [text("en"), text("vi")]) {
  return { pois: [{ poiId: 1, originalName: "Tên Việt", contentVersion: 2, category: "PLANT", conservationStatus: null, activityHours: null,
    latitude: "10.78000000", longitude: "106.70000000", triggerRadius: 30, avatarUrl: null, displayOrder: 0, secret: "SECRET" }],
  translations, tours: [], items: [] };
}
function fixture(options = {}) {
  let records = 0, loads = 0;
  const visit = { sessionId: randomUUID(), status: "ACTIVE" };
  const ops = { visit: { tokenHash, sessionStatus: "ACTIVE", paymentStatus: "PAID", paidAt: new Date("2026-01-01Z"),
    activatedAt: new Date("2026-01-01Z"), expiresAt: new Date("2026-01-03Z"), ...options.visit }, nowUtc: new Date("2026-01-02Z"),
  languages: async () => languages, content: async () => { loads++; return snapshot(); }, recordAccess: async () => { records++; return true; }, ...options.ops };
  const store = { withBundleSnapshot: async (identity, work) => { assert.deepEqual(identity, { sessionId: visit.sessionId, tokenHash }); return work(ops); } };
  return { service: new ContentService(store), visit, ops, count: () => ({ records, loads }) };
}
it("bundle language priority is selected/en/vi with duplicates and inactive languages removed", () => {
  assert.deepEqual(languageOrder("fr", languages), ["fr", "en", "vi"]);
  assert.deepEqual(languageOrder("en", languages), ["en", "vi"]); assert.deepEqual(languageOrder("vi", languages), ["vi", "en"]);
  assert.deepEqual(languageOrder("fr", languages.filter(row => row.code !== "en")), ["fr", "vi"]);
});
it("text and audio fallback independently and name both actual languages", () => {
  const result = buildContent(snapshot([text("en", { audioStatus: "FAILED" }), text("vi")]), "en", languages).pois[0];
  assert.equal(result.text.languageCode, "en"); assert.equal(result.text.isFallback, false);
  assert.equal(result.audio.languageCode, "vi"); assert.equal(result.audio.isFallback, true); assert.equal(result.audio.mimeType, "audio/wav");
  const french = buildContent(snapshot(), "fr", languages).pois[0]; assert.equal(french.text.languageCode, "en"); assert.equal(french.text.isFallback, true);
});
it("stale, pending, failed or incomplete text never becomes published fallback", () => {
  for (const patch of [{ sourceVersion: 1 }, { status: "PENDING" }, { status: "FAILED" }, { description: " " }, { name: null }, { audioScript: "" }]) {
    const poi = buildContent(snapshot([text("en", patch), text("vi")]), "en", languages).pois[0]; assert.equal(poi.text.languageCode, "vi"); assert.equal(poi.audio.languageCode, "vi");
  }
});
it("audio rejects stale metadata, unsafe paths, missing size and unsupported files without losing text", () => {
  for (const patch of [{ audioVersion: 1 }, { fileUrl: "https://example.invalid/public.wav" }, { fileUrl: "/api/media/audio/../../private.wav" },
    { fileUrl: "/private/root.wav" }, { fileUrl: "/api/media/audio/" + randomUUID() + ".mp3" }, { fileSize: null }, { duration: -1 }]) {
    const poi = buildContent(snapshot([text("en", patch)]), "en", languages).pois[0]; assert.equal(poi.text.status, "READY");
    assert.deepEqual(poi.audio, { status: "UNAVAILABLE", languageCode: null, isFallback: false, url: null, mimeType: null, duration: null });
  }
});
it("unavailable content retains the ACTIVE POI with explicit null fields and the Vietnamese original name", () => {
  const poi = buildContent(snapshot([]), "en", languages).pois[0]; assert.equal(poi.originalName, "Tên Việt");
  assert.deepEqual(poi.text, { status: "UNAVAILABLE", languageCode: null, isFallback: false, name: null, description: null, audioScript: null });
  assert.equal(poi.audio.url, null);
});
it("tours retain sequence gaps and shared labels, exclude unknown POIs and omit empty tours", () => {
  const data = snapshot(); data.tours = [{ tourId: 2, name: "Tên dùng chung", description: null }, { tourId: 3, name: "Empty" }];
  data.items = [{ tourId: 2, poiId: 99, sequenceNo: 1 }, { tourId: 2, poiId: 1, sequenceNo: 3 }, { tourId: 3, poiId: 99, sequenceNo: 1 }];
  assert.deepEqual(buildContent(data, "en", languages).tours, [{ tourId: 2, name: "Tên dùng chung", description: null, localization: "SHARED", items: [{ poiId: 1, sequenceNo: 3 }] }]);
});
it("bundle serializes an allowlisted DTO, numeric coordinates, canonical requested language and original expiry", async () => {
  const f = fixture(), data = await f.service.getBundle(f.visit, { languageCode: "EN" }, token);
  assert.equal(data.requestedLanguageCode, "en"); assert.equal(data.expiresAt, f.ops.visit.expiresAt.toISOString());
  assert.equal(typeof data.pois[0].latitude, "number"); assert.equal(data.pois[0].conservationStatus, null);
  assert.deepEqual(f.count(), { records: 1, loads: 1 }); const json = JSON.stringify(data);
  for (const secret of [tokenHash, token, f.visit.sessionId, "SECRET", "contentVersion", "claimId"]) assert.equal(json.includes(secret), false);
});
it("query validation rejects omissions, duplicate/array values, extra filters and injection before Store", async () => {
  let calls = 0; const service = new ContentService({ withBundleSnapshot: async () => { calls++; } }), visit = fixture().visit;
  for (const query of [{}, { languageCode: ["vi", "en"] }, { languageCode: "en", page: "1" }, { languageCode: "' OR 1=1" },
    { languageCode: "en", sessionId: visit.sessionId }, { languageCode: "" }, { languageCode: 1 }]) await assert.rejects(service.getBundle(visit, query, token), { code: "VALIDATION_ERROR", status: 400 });
  assert.equal(calls, 0);
});
it("unsupported/inactive language fails without content read or access log", async () => {
  const f = fixture(); await assert.rejects(f.service.getBundle(f.visit, { languageCode: "de" }, token), { status: 400, code: "LANGUAGE_NOT_SUPPORTED" }); assert.deepEqual(f.count(), { records: 0, loads: 0 });
});
it("bundle rechecks paid, ACTIVE, expiry and token after middleware, before reading or logging content", async () => {
  for (const patch of [{ tokenHash: "b".repeat(64) }, { sessionStatus: "REVOKED" }, { paymentStatus: "PENDING" },
    { expiresAt: new Date("2026-01-02Z") }, { activatedAt: null }, { paidAt: null }]) {
    const f = fixture({ visit: patch }); await assert.rejects(f.service.getBundle(f.visit, { languageCode: "en" }, token), { status: 401 }); assert.deepEqual(f.count(), { records: 0, loads: 0 });
  }
});
it("expiry at log time refuses the bundle and Store errors cannot impersonate policy errors", async () => {
  const f = fixture({ ops: { recordAccess: async () => false } });
  await assert.rejects(f.service.getBundle(f.visit, { languageCode: "en" }, token), { status: 401, code: "VISIT_SESSION_EXPIRED" });
  const g = fixture({ ops: { languages: async () => { throw new AppError(400, "PRIVATE_SQL_ERROR", "secret"); } } });
  await assert.rejects(g.service.getBundle(g.visit, { languageCode: "en" }, token), error => error.code === "BUNDLE_UNAVAILABLE" && error.status === 503 && !error.message.includes("secret"));
});
it("a failed DTO cannot generate an access log", async () => {
  const f = fixture(); f.ops.content = async () => { const data = snapshot(); data.pois[0].latitude = "invalid"; return data; };
  await assert.rejects(f.service.getBundle(f.visit, { languageCode: "en" }, token), { status: 503, code: "BUNDLE_UNAVAILABLE" }); assert.equal(f.count().records, 0);
});
it("repeatable-read transaction setup is opt-in and a failed begin discards a configured connection", async () => {
  const events = [], connection = { query: async sql => events.push(sql), beginTransaction: async () => { throw new Error("begin failed"); },
    rollback: async () => events.push("rollback"), release: () => events.push("release"), destroy: () => events.push("destroy") };
  await assert.rejects(new AuthStore({ getConnection: async () => connection }).transaction(() => {}, { repeatableRead: true }));
  assert.match(events[0], /SET TRANSACTION ISOLATION LEVEL REPEATABLE READ/); assert.ok(events.includes("destroy")); assert.equal(events.includes("release"), false);
});
