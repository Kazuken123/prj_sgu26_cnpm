const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { TranslationService } = require("../services/translation.service");
const { filters } = require("../services/audit.validation");
const { project } = require("../services/audit-details");
const actor = { userId: 7, role: "STAFF", status: "ACTIVE" };
const text = { sourceVersion: 1, name: "Reviewed title", description: "Reviewed introduction.", audioScript: "Reviewed narration." };
function fixture() {
  const state = { actor: { ...actor }, parent: { contentVersion: 1 }, language: { active: 1 },
    source: { ...text, status: "READY" }, translation: undefined, job: { jobId: 3, status: "PENDING" }, writes: 0 };
  let reads = 0;
  const store = { withTranslation: async (userId, id, language, work) => {
    reads++;
    return work({ ...state, persist: async value => { state.translation = { ...value, status: "READY" }; state.writes++; } });
  } };
  return { state, store, service: new TranslationService(store), reads: () => reads };
}
it("reviewed translation rejects unauthorized actors before validation or storage", async () => {
  const f = fixture();
  for (const user of [undefined, { ...actor, userId: 0 }, { ...actor, role: "TOURIST" }, { ...actor, status: "LOCKED" },
    { ...actor, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(f.service.importReviewed(user, "bad", "vi", null), error => [401, 403].includes(error.status));
  }
  assert.equal(f.reads(), 0);
});
it("translation input requires approved language codes, exact fields, bounded text and integer version", async () => {
  const f = fixture();
  for (const input of [undefined, null, [], {}, { ...text, sourceVersion: "1" }, { ...text, sourceVersion: 0 },
    { ...text, sourceVersion: 1.5 }, { ...text, sourceVersion: 2147483648 }, { ...text, name: " " },
    { ...text, name: "x".repeat(256) }, { ...text, description: "x".repeat(6001) }, { ...text, audioScript: null },
    { ...text, status: "READY" }, { ...text, provider: "approved" }]) {
    await assert.rejects(f.service.importReviewed(actor, 1, "en", input), { status: 400 });
  }
  for (const language of ["vi", "EN", "zh", "zh-CN", "zh-Hant", "zh-hans", "pt", "pt-br", "pt-PT", "DE", "en' OR 1=1 --"]) {
    await assert.rejects(f.service.importReviewed(actor, 1, language, text), { status: 400 });
  }
  assert.equal(f.reads(), 0);
});
it("all fourteen reviewed target languages retain version, enablement, processing and publication guards", async () => {
  for (const language of ["en", "zh-Hans", "ko", "ja", "ru", "fr", "de", "es", "it", "pt-BR", "nl", "pl", "cs", "tr"]) {
    const f = fixture();
    const result = await f.service.importReviewed(actor, 1, language, text);
    assert.equal(result.languageCode, language); assert.equal(result.outcome, "IMPORTED");
    assert.equal((await f.service.get(actor, 1, language)).translation.audioScript, text.audioScript);
    assert.equal((await f.service.importReviewed(actor, 1, language, text)).outcome, "UNCHANGED");
    await assert.rejects(f.service.importReviewed(actor, 1, language, { ...text, name: "Different" }), { code: "TRANSLATION_READY_CONFLICT" });
    f.state.parent.contentVersion = 2;
    await assert.rejects(f.service.importReviewed(actor, 1, language, text), { code: "TRANSLATION_SOURCE_CONFLICT" });
    f.state.parent.contentVersion = 1; f.state.language = undefined;
    await assert.rejects(f.service.importReviewed(actor, 1, language, text), { code: "TRANSLATION_LANGUAGE_DISABLED" });
    f.state.language = { active: 0 };
    await assert.rejects(f.service.importReviewed(actor, 1, language, text), { code: "TRANSLATION_LANGUAGE_DISABLED" });
    f.state.language.active = 1; f.state.job.status = "PROCESSING";
    await assert.rejects(f.service.importReviewed(actor, 1, language, text), { code: "TRANSLATION_JOB_PROCESSING" });
    assert.equal(f.state.writes, 1);
  }
});
it("GET returns source, target and current job only; it does not import, retry or expose internal values", async () => {
  const f = fixture(); f.state.source.internalKey = "private";
  const result = await f.service.get(actor, 1, "en");
  assert.equal(result.sourceVersion, 1); assert.equal(result.source.internalKey, undefined);
  assert.equal(result.translation, null); assert.equal(result.job.canRetry, false); assert.equal(f.state.writes, 0);
});
it("import stores READY at the source version but leaves FAILED job for explicit existing retry", async () => {
  const f = fixture(); f.state.job.status = "FAILED";
  const result = await f.service.importReviewed(actor, 1, "en", text);
  assert.equal(result.outcome, "IMPORTED"); assert.equal(result.translation.status, "READY");
  assert.equal(result.job.status, "FAILED"); assert.equal(result.job.canRetry, true); assert.equal(f.state.writes, 1);
});
it("identical retries are UNCHANGED; different READY content cannot overwrite text, job or audio", async () => {
  const f = fixture(); await f.service.importReviewed(actor, 1, "en", text);
  f.state.job.status = "COMPLETED"; f.state.audio = { sourceVersion: 1, status: "AVAILABLE", fileUrl: "private.wav" };
  const before = structuredClone(f.state);
  assert.equal((await f.service.importReviewed(actor, 1, "en", text)).outcome, "UNCHANGED");
  await assert.rejects(f.service.importReviewed(actor, 1, "en", { ...text, audioScript: "Other wording" }), { status: 409, code: "TRANSLATION_READY_CONFLICT" });
  assert.deepEqual(f.state, before);
});
it("old-source imports, disabled languages and current processing never write", async () => {
  const f = fixture(); f.state.parent.contentVersion = 2;
  await assert.rejects(f.service.importReviewed(actor, 1, "en", text), { code: "TRANSLATION_SOURCE_CONFLICT" });
  f.state.parent.contentVersion = 1; f.state.language.active = 0;
  await assert.rejects(f.service.importReviewed(actor, 1, "en", text), { code: "TRANSLATION_LANGUAGE_DISABLED" });
  f.state.language.active = 1; f.state.job.status = "PROCESSING";
  await assert.rejects(f.service.importReviewed(actor, 1, "en", text), { code: "TRANSLATION_JOB_PROCESSING" });
  assert.equal(f.state.writes, 0);
});
it("missing source, future translation versions, inconsistent completed jobs and published audio fail closed", async () => {
  for (const patch of [{ source: null }, { translation: { ...text, sourceVersion: 2 } },
    { translation: { ...text, status: "READY", audioScript: "" } },
    { translation: { ...text, status: "FAILED" } }, { translation: { ...text, status: "PENDING" } },
    { job: null }, { job: { jobId: 3, status: "COMPLETED" } }, { audio: { status: "AVAILABLE", sourceVersion: 1 } }]) {
    const f = fixture(); Object.assign(f.state, patch);
    await assert.rejects(f.service.importReviewed(actor, 1, "en", text), { status: 409 }); assert.equal(f.state.writes, 0);
  }
});
it("missing POI and revoked current editor are checked inside the transaction; storage errors are safe", async () => {
  const f = fixture(); f.state.parent = null;
  await assert.rejects(f.service.get(actor, 1, "en"), { status: 404 });
  f.state.actor.status = "LOCKED";
  await assert.rejects(f.service.get(actor, 1, "en"), { status: 403 });
  f.store.withTranslation = async () => { throw new Error("private SQL password"); };
  await assert.rejects(f.service.get(actor, 1, "en"), error => error.status === 503 && !error.message.includes("private"));
});
it("manual import audit action is filterable and projects only safe version metadata", () => {
  assert.equal(filters({ action: "IMPORT_REVIEWED_TRANSLATION" }).action, "IMPORT_REVIEWED_TRANSLATION");
  assert.deepEqual(project("IMPORT_REVIEWED_TRANSLATION", { poiId: 1, languageCode: "en", sourceVersion: 2, token: "private" }),
    { details: { poiId: 1, languageCode: "en", sourceVersion: 2 }, detailsOmitted: true });
});
it("reviewed translation HTTP requires internal authentication, supports STAFF and retains no-store", async t => {
  const { createFixture, staff } = require("./helpers/auth.fixture"), { createApp } = require("../server");
  const auth = createFixture(); await auth.addStaff();
  const token = (await auth.service.login(staff)).accessToken, f = fixture();
  const server = http.createServer(createApp({ authService: auth.service, translationService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/admin/pois/1/translations/en`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: "Bearer visitor-opaque-token" } })).status, 401);
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const first = await fetch(url, { method: "PUT", headers, body: JSON.stringify(text) });
  assert.equal(first.status, 200); assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal((await first.json()).data.outcome, "IMPORTED");
  const get = await fetch(url, { headers }); assert.equal(get.status, 200); assert.equal((await get.json()).data.translation.name, text.name);
  assert.equal((await fetch(url, { method: "PUT", headers, body: JSON.stringify({ ...text, name: "Conflict" }) })).status, 409);
});
