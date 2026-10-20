const { randomUUID } = require("node:crypto");
const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");
const { inspectWav } = require("../utils/pcm-wav");
const { assetKey } = require("../adapters/local-media");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const prefix = "/api/media/audio/";
function keyFromUrl(url) { const key = typeof url === "string" && url.startsWith(prefix) ? url.slice(prefix.length) : ""; return assetKey.test(key) ? key : null; }
function unavailable() { return new AppError(503, "CONTENT_AUDIO_UNAVAILABLE", "Chưa xác định được kết quả âm thanh; kiểm tra trạng thái trước khi tiếp tục."); }
async function limited(work, ms, code, onLate) {
  const controller = new AbortController(); let timer, expired = false;
  const operation = Promise.resolve().then(() => work(controller.signal));
  operation.then(() => { if (expired && onLate) Promise.resolve().then(onLate).catch(() => {}); }, () => {});
  try { return await Promise.race([operation, new Promise((resolve, reject) => { timer = setTimeout(() => {
    expired = true; controller.abort(); reject(Object.assign(new Error(code), { code }));
  }, ms); })]); } finally { clearTimeout(timer); }
}
async function current(service, jobId, claimId, work) {
  return service.store.withWorkerJob(jobId, async ops => {
    const job = ops.job;
    if (!job || job.status !== "PROCESSING" || job.claimId !== claimId || job.leaseValid !== true) return { completed: false, reason: "CLAIM_LOST", jobId };
    if (job.sourceVersion !== job.currentVersion) {
      if (!await ops.failClaim(claimId, "CONTENT_SOURCE_OUTDATED")) throw new Error("CLAIM_CHANGED");
      return { completed: false, reason: "CONTENT_SOURCE_OUTDATED", jobId, status: "FAILED" };
    }
    const text = await ops.getContent(job.languageCode);
    if (!text || text.status !== "READY" || text.sourceVersion !== job.sourceVersion ||
        ![text.name, text.description, text.audioScript].every(value => typeof value === "string" && value.trim())) {
      if (!await ops.failClaim(claimId, "CONTENT_TRANSLATION_NOT_READY")) throw new Error("CLAIM_CHANGED");
      return { completed: false, reason: "CONTENT_TRANSLATION_NOT_READY", jobId, status: "FAILED" };
    }
    return work(job, text, ops);
  });
}
async function prepareAudio(service, rawId, claimId) {
  const jobId = id(rawId);
  if (typeof claimId !== "string" || !uuid.test(claimId)) throw new AppError(400, "INVALID_CONTENT_CLAIM", "Mã lượt xử lý không hợp lệ.");
  const timeout = service.audioTimeoutMs;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120000) throw unavailable();
  let input;
  try { input = await current(service, jobId, claimId, async (job, text, ops) => ({ job, text, audio: await ops.getAudio(text.translationId) })); }
  catch { throw unavailable(); }
  if (!input.job) return input;
  const storage = service.mediaStorage;
  let asset, reused = false, candidateKey, failure;
  const clean = key => limited(() => storage.remove(key), timeout, "MEDIA_CLEANUP_TIMEOUT").catch(() => {});
  try {
    if (!storage || !["put", "get", "remove"].every(method => typeof storage[method] === "function")) throw new Error("MEDIA_STORAGE_FAILED");
    const old = input.audio, oldKey = keyFromUrl(old?.fileUrl);
    if (old?.status === "AVAILABLE" && old.sourceVersion === input.job.sourceVersion && oldKey) {
      let bytes;
      try { bytes = await limited(() => storage.get(oldKey), timeout, "MEDIA_STORAGE_TIMEOUT"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (bytes) {
        let info;
        try { info = inspectWav(bytes); } catch { /* A corrupt file is not reusable. */ }
        if (info && info.fileSize === old.fileSize && info.duration === old.duration) { asset = old; reused = true; }
      }
    }
    if (!reused) {
      let bytes;
      try {
        if (!service.tts || typeof service.tts.synthesize !== "function") throw new Error("TTS_NOT_CONFIGURED");
        bytes = await limited(signal => service.tts.synthesize({ text: input.text.audioScript, languageCode: input.job.languageCode, signal }), timeout, "TTS_TIMEOUT");
      } catch (error) { failure = error.code === "TTS_TIMEOUT" ? "TTS_TIMEOUT" : "TTS_PROVIDER_FAILED"; throw error; }
      let info;
      try { info = inspectWav(bytes); }
      catch (error) { failure = "TTS_RESULT_INVALID"; throw error; }
      candidateKey = randomUUID() + ".wav";
      await limited(signal => storage.put(candidateKey, bytes, { signal }), timeout, "MEDIA_STORAGE_TIMEOUT", () => clean(candidateKey));
      asset = { fileUrl: prefix + candidateKey, fileSize: info.fileSize, duration: info.duration };
    }
  } catch {
    if (candidateKey) await clean(candidateKey);
    try {
      return await current(service, jobId, claimId, async (job, text, ops) => {
        if (!await ops.failAudio(claimId, text.translationId, failure || "MEDIA_STORAGE_FAILED")) throw new Error("CLAIM_CHANGED");
        return { completed: false, reason: failure || "MEDIA_STORAGE_FAILED", jobId, status: "FAILED" };
      });
    } catch { throw unavailable(); }
  }
  let result;
  try {
    result = await current(service, jobId, claimId, async (job, text, ops) => {
      if (text.translationId !== input.text.translationId || text.audioScript !== input.text.audioScript) throw new Error("TEXT_CHANGED");
      if (reused) {
        const latest = await ops.getAudio(text.translationId);
        if (!latest || latest.status !== "AVAILABLE" || latest.sourceVersion !== job.sourceVersion || latest.fileUrl !== asset.fileUrl ||
            latest.fileSize !== asset.fileSize || latest.duration !== asset.duration) throw new Error("AUDIO_CHANGED");
      }
      if (!await ops.completeAudio(claimId, text.translationId, asset, reused ? "REUSED" : service.tts.provider === "MOCK" ? "MOCK" : "ADAPTER", reused)) throw new Error("CLAIM_CHANGED");
      return { completed: true, jobId, status: "COMPLETED", fileUrl: asset.fileUrl, reused };
    });
  } catch {
    // SQL may already have committed. Never delete a possibly referenced asset.
    throw unavailable();
  }
  if (!result.completed && candidateKey) await clean(candidateKey);
  return result;
}
module.exports = { prepareAudio, keyFromUrl, limited };
