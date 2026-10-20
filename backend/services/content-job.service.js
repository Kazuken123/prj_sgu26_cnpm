const ContentJobStore = require("../stores/content_job.store");
const AppError = require("../utils/app-error");
const { assertContentEditor } = require("./internal-access");
const validation = require("./content-job.validation");
const workerErrors = {
  CONTENT_SOURCE_OUTDATED: "Phiên bản nguồn không còn phù hợp.",
  CONTENT_SOURCE_UNAVAILABLE: "Nội dung nguồn chưa sẵn sàng hoặc không hợp lệ.",
  TRANSLATION_TIMEOUT: "Dịch vụ dịch vượt thời gian chờ.",
  TRANSLATION_PROVIDER_FAILED: "Dịch vụ dịch tạm thời không xử lý được tác vụ.",
  TRANSLATION_RESULT_INVALID: "Kết quả dịch không đủ nội dung hợp lệ.",
  CONTENT_TRANSLATION_NOT_READY: "Văn bản chưa sẵn sàng để tạo âm thanh.",
  TTS_TIMEOUT: "Dịch vụ âm thanh vượt thời gian chờ.",
  TTS_PROVIDER_FAILED: "Dịch vụ âm thanh tạm thời không xử lý được tác vụ.",
  TTS_RESULT_INVALID: "Tệp âm thanh trả về không hợp lệ.",
  MEDIA_STORAGE_FAILED: "Chưa lưu hoặc kiểm tra được tệp âm thanh.",
};

function publicJob(row) {
  const isCurrent = row.sourceVersion === row.currentVersion;
  return {
    jobId: row.jobId, poiId: row.poiId, languageCode: row.languageCode, sourceVersion: row.sourceVersion,
    currentVersion: row.currentVersion, isCurrent, status: row.status, canRetry: isCurrent && row.status === "FAILED",
    createdAt: row.createdAt, updatedAt: row.updatedAt,
    translation: { status: row.translationStatus ?? null, sourceVersion: row.translationVersion ?? null,
      isCurrent: row.translationVersion === row.currentVersion },
    audio: { status: row.audioStatus ?? null, sourceVersion: row.audioVersion ?? null,
      isCurrent: row.audioVersion === row.currentVersion && row.translationVersion === row.currentVersion },
    // Only reviewed fixed worker codes may escape; never return provider/legacy text.
    error: row.status === "FAILED" ? {
      code: Object.hasOwn(workerErrors, row.errorCode) ? row.errorCode : "CONTENT_PROCESSING_FAILED",
      message: Object.hasOwn(workerErrors, row.errorCode) ? workerErrors[row.errorCode] : "Tác vụ xử lý nội dung thất bại; kiểm tra trạng thái và yêu cầu thử lại nếu còn hợp lệ.",
    } : null,
  };
}
class ContentJobService {
  constructor(store = new ContentJobStore()) { this.store = store; }
  async list(actor, query) {
    assertContentEditor(actor);
    const result = await this.store.list(validation.filters(query));
    return { ...result, items: result.items.map(publicJob) };
  }
  async get(actor, rawId) {
    assertContentEditor(actor);
    const row = await this.store.get(validation.id(rawId));
    if (!row) throw new AppError(404, "CONTENT_JOB_NOT_FOUND", "Không tìm thấy tác vụ.");
    return publicJob(row);
  }
  async retry(actor, rawId, input, { ipAddress = null } = {}) {
    assertContentEditor(actor); validation.retryBody(input);
    const id = validation.id(rawId);
    return this.store.withLockedJob(actor.userId ?? actor.user_id, id, assertContentEditor, async ({ job, enqueue }) => {
      if (!job) throw new AppError(404, "CONTENT_JOB_NOT_FOUND", "Không tìm thấy tác vụ.");
      if (job.sourceVersion !== job.currentVersion) {
        throw new AppError(409, "CONTENT_JOB_OUTDATED", "Tác vụ thuộc phiên bản cũ; tải lại trạng thái nội dung.");
      }
      if (job.status !== "FAILED") {
        throw new AppError(409, "CONTENT_JOB_NOT_FAILED", "Chỉ tác vụ FAILED mới được thử lại; tải lại trạng thái hiện tại.");
      }
      const pending = await enqueue(ipAddress);
      if (!pending) throw new AppError(409, "CONTENT_JOB_CHANGED", "Tác vụ đã thay đổi; tải lại trạng thái.");
      return { jobId: pending.jobId, poiId: pending.poiId, languageCode: pending.languageCode,
        sourceVersion: pending.sourceVersion, currentVersion: pending.currentVersion,
        status: pending.status, accepted: true };
    });
  }
}
module.exports = new ContentJobService();
module.exports.ContentJobService = ContentJobService;
