const ContentJobStore = require("../stores/content_job.store");
const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");

// Internal worker entry point, deliberately not exposed by an HTTP Router.
class PipelineService {
  constructor(store = new ContentJobStore()) { this.store = store; }
  async claimJob(rawId) {
    const jobId = id(rawId);
    try {
      return await this.store.withWorkerJob(jobId, async ({ job, transition }) => {
        if (!job) return { claimed: false, reason: "NOT_FOUND", jobId };
        if (job.status !== "PENDING") return { claimed: false, reason: "NOT_PENDING", jobId };
        if (job.sourceVersion !== job.currentVersion) {
          const saved = await transition("FAILED", "CONTENT_SOURCE_OUTDATED");
          if (!saved) throw new Error("CONTENT_JOB_CLAIM_CONFLICT");
          return { claimed: false, reason: "CONTENT_SOURCE_OUTDATED", jobId, status: "FAILED" };
        }
        const saved = await transition("PROCESSING", null);
        if (!saved) throw new Error("CONTENT_JOB_CLAIM_CONFLICT");
        return { claimed: true, jobId: job.jobId, poiId: job.poiId, languageCode: job.languageCode,
          sourceVersion: job.sourceVersion, status: "PROCESSING" };
      });
    } catch {
      // A lost commit acknowledgement must never grant work to a second caller.
      throw new AppError(503, "CONTENT_JOB_CLAIM_UNAVAILABLE", "Chưa xác định được kết quả nhận tác vụ; kiểm tra trạng thái trước khi tiếp tục.");
    }
  }
}
module.exports = { PipelineService };
