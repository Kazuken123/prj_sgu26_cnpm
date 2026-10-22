const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const safeError = () => new AppError(503, "CONTENT_TRANSLATION_UNAVAILABLE", "Chưa xác định được kết quả chuẩn bị văn bản; kiểm tra trạng thái tác vụ trước khi tiếp tục.");
function validText(text) {
  return !!text && ["name", "description", "audioScript"].every(key => typeof text[key] === "string" && text[key].trim().length > 0 &&
    (key === "name" ? [...text[key]].length <= 255 : Buffer.byteLength(text[key], "utf8") <= 65535));
}
const owned = (job, claimId) => job && job.status === "PROCESSING" && job.claimId === claimId && job.leaseValid === true;
async function checkedWork(service, jobId, claimId, work) {
  return service.store.withWorkerJob(jobId, async ops => {
    const job = ops.job;
    if (!owned(job, claimId)) return { prepared: false, reason: "CLAIM_LOST", jobId };
    if (job.sourceVersion !== job.currentVersion) {
      if (!await ops.failClaim(claimId, "CONTENT_SOURCE_OUTDATED")) throw new Error("CLAIM_CHANGED");
      return { prepared: false, reason: "CONTENT_SOURCE_OUTDATED", jobId, status: "FAILED" };
    }
    return work(job, ops);
  });
}
async function prepareTranslation(service, rawId, claimId) {
  const jobId = id(rawId);
  if (typeof claimId !== "string" || !uuid.test(claimId)) throw new AppError(400, "INVALID_CONTENT_CLAIM", "Mã lượt xử lý không hợp lệ.");
  const timeoutMs = service.translationTimeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw safeError();
  let input;
  try {
    input = await checkedWork(service, jobId, claimId, async (job, ops) => {
      const source = await ops.getContent("vi");
      if (!source || source.status !== "READY" || source.sourceVersion !== job.sourceVersion || !validText(source)) {
        if (!await ops.failClaim(claimId, "CONTENT_SOURCE_UNAVAILABLE")) throw new Error("CLAIM_CHANGED");
        return { prepared: false, reason: "CONTENT_SOURCE_UNAVAILABLE", jobId, status: "FAILED" };
      }
      const current = job.languageCode === "vi" ? source : await ops.getContent(job.languageCode);
      if (current && current.status === "READY" && current.sourceVersion === job.sourceVersion && validText(current)) {
        return { prepared: true, jobId, stage: "TRANSLATION_READY", status: "PROCESSING", reused: true };
      }
      return { job, source: { name: source.name, description: source.description, audioScript: source.audioScript } };
    });
  } catch { throw safeError(); }
  if (!input.job) return input;
  const controller = new AbortController();
  let timer, text, failure;
  try {
    const adapter = service.translator;
    if (!adapter || typeof adapter.translate !== "function") {
      failure = "CONTENT_TRANSLATION_NOT_READY";
      throw new Error("NO_TRANSLATOR");
    }
    text = await Promise.race([
      Promise.resolve().then(() => adapter.translate({ sourceLanguage: "vi", targetLanguage: input.job.languageCode,
        source: input.source, signal: controller.signal })),
      new Promise((resolve, reject) => { timer = setTimeout(() => {
        failure = "TRANSLATION_TIMEOUT"; controller.abort(); reject(new Error("timeout"));
      }, timeoutMs); }),
    ]);
    if (!validText(text)) failure = "TRANSLATION_RESULT_INVALID";
  } catch { failure ||= "TRANSLATION_PROVIDER_FAILED"; }
  finally { clearTimeout(timer); }
  if (failure) {
    try {
      return await checkedWork(service, jobId, claimId, async (job, ops) => {
        if (!await ops.failClaim(claimId, failure)) throw new Error("CLAIM_CHANGED");
        return { prepared: false, reason: failure, jobId, status: "FAILED" };
      });
    } catch { throw safeError(); }
  }
  // Copy only validated fields. Provider-controlled metadata/errors never enter SQL/audit.
  const result = { name: text.name, description: text.description, audioScript: text.audioScript };
  try {
    return await checkedWork(service, jobId, claimId, async (job, ops) => {
      const current = await ops.getContent(job.languageCode);
      if (current && current.status === "READY" && current.sourceVersion === job.sourceVersion && validText(current)) {
        return { prepared: true, jobId, stage: "TRANSLATION_READY", status: "PROCESSING", reused: true };
      }
      if (!await ops.saveTranslation(claimId, result, service.translator.provider === "MOCK" ? "MOCK" : "ADAPTER")) throw new Error("CLAIM_CHANGED");
      return { prepared: true, jobId, stage: "TRANSLATION_READY", status: "PROCESSING", reused: false };
    });
  } catch { throw safeError(); }
}
module.exports = { prepareTranslation };
