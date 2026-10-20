const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const MockTts = require("../adapters/mock-tts");
const { MediaService } = require("../services/media.service");
const { inspectWav } = require("../utils/pcm-wav");
function fixture({ tts = new MockTts(), audioTimeoutMs = 100 } = {}) {
  const claimId = randomUUID(), files = new Map();
  const state = { job: { jobId: 1, languageCode: "en", sourceVersion: 1, currentVersion: 1, status: "PROCESSING", claimId, leaseValid: true },
    text: { translationId: 2, name: "Name", description: "Description", audioScript: "Script", status: "READY", sourceVersion: 1 }, failures: [], completed: 0 };
  const storage = { put: async (key, bytes) => { files.set(key, Buffer.from(bytes)); },
    get: async key => { if (!files.has(key)) throw Object.assign(new Error("missing"), { code: "ENOENT" }); return files.get(key); }, remove: async key => { files.delete(key); } };
  const store = { withWorkerJob: async (id, work) => work({ job: { ...state.job }, getContent: async () => state.text,
    getAudio: async () => state.audio,
    failClaim: async (claim, code) => { state.failures.push(code); state.job.status = "FAILED"; return true; },
    failAudio: async (claim, translation, code) => { state.failures.push(code); state.job.status = "FAILED"; return true; },
    completeAudio: async (claim, translation, asset) => { state.completed++; state.job.status = "COMPLETED"; state.audio = asset; return true; },
  }) };
  return { state, files, storage, claimId, service: new PipelineService(store, { tts, mediaStorage: storage, audioTimeoutMs }) };
}
it("audio publication requires valid bytes, a stored file and the current processing claim", async () => {
  const f = fixture(), result = await f.service.prepareAudio(1, f.claimId);
  assert.equal(result.completed, true); assert.equal(f.state.completed, 1); assert.equal(f.files.size, 1);
  assert.equal(inspectWav([...f.files.values()][0]).duration, 1);
});
it("invalid claim, timeout configuration or missing READY text cannot synthesize or publish", async () => {
  const f = fixture({ tts: { synthesize: () => assert.fail("Must not synthesize") } });
  await assert.rejects(f.service.prepareAudio(1, "invalid"), { code: "INVALID_CONTENT_CLAIM" });
  assert.equal((await f.service.prepareAudio(1, randomUUID())).reason, "CLAIM_LOST");
  f.service.audioTimeoutMs = 0; await assert.rejects(f.service.prepareAudio(1, f.claimId), { code: "CONTENT_AUDIO_UNAVAILABLE" });
  f.service.audioTimeoutMs = 100; f.state.text = null;
  assert.equal((await f.service.prepareAudio(1, f.claimId)).reason, "CONTENT_TRANSLATION_NOT_READY"); assert.equal(f.files.size, 0);
});
it("TTS failure, timeout and invalid bytes only persist reviewed safe codes", async () => {
  for (const [tts, expected] of [[new MockTts({ mode: "failure" }), "TTS_PROVIDER_FAILED"],
    [new MockTts({ mode: "timeout" }), "TTS_TIMEOUT"], [{ synthesize: async () => Buffer.from("private invalid body") }, "TTS_RESULT_INVALID"]]) {
    const f = fixture({ tts, audioTimeoutMs: 20 });
    assert.equal((await f.service.prepareAudio(1, f.claimId)).reason, expected);
    assert.deepEqual(f.state.failures, [expected]); assert.equal(f.state.completed, 0); assert.equal(f.files.size, 0);
  }
});
it("storage failure cannot mark audio AVAILABLE or job COMPLETED", async () => {
  const f = fixture(); f.storage.put = async () => { throw new Error("private path and credentials"); };
  assert.equal((await f.service.prepareAudio(1, f.claimId)).reason, "MEDIA_STORAGE_FAILED"); assert.equal(f.state.completed, 0);
});
it("media Service validates key, SQL eligibility, bytes and metadata before returning content", async () => {
  const key = randomUUID() + ".wav", bytes = await new MockTts().synthesize({ signal: new AbortController().signal });
  const row = { duration: 1, fileSize: bytes.length }, visit = { status: "ACTIVE" };
  const service = new MediaService({ getPublishedAudio: async url => { assert.equal(url, "/api/media/audio/" + key); return row; } }, { get: async () => bytes });
  await assert.rejects(service.getAudio(key, null), { status: 401 });
  await assert.rejects(service.getAudio("../.env", visit), { status: 400 });
  assert.deepEqual(await service.getAudio(key, visit), bytes);
  row.fileSize++; await assert.rejects(service.getAudio(key, visit), { code: "AUDIO_UNAVAILABLE" });
  const missing = new MediaService({ getPublishedAudio: async () => null }, { get: () => assert.fail("Do not read unpublished file") });
  await assert.rejects(missing.getAudio(key, visit), { status: 404 });
});
