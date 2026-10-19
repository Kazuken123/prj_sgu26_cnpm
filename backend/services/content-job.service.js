const ContentJobStore = require("../stores/content_job.store");
const AppError = require("../utils/app-error");
const { assertContentEditor } = require("./internal-access");
const validation = require("./content-job.validation");

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
    // Provider/legacy error_message may contain SQL, keys or raw tokens. Never
    // return it directly. A worker can introduce reviewed safe error codes later.
    error: row.status === "FAILED" ? { code: "CONTENT_PROCESSING_FAILED", message: "Tác vụ xử lý nội dung thất bại; kiểm tra trạng thái và yêu cầu thử lại nếu còn hợp lệ." } : null,
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
      return { jobId: pending.jobId, poiId: pending.poiId, languageCode: pending.languageCode,
        sourceVersion: pending.sourceVersion, currentVersion: pending.currentVersion,
        status: pending.status, accepted: true };
    });
  }
}
module.exports = new ContentJobService();
module.exports.ContentJobService = ContentJobService;
