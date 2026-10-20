const ContentJobStore = require("../stores/content_job.store");
const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");
const { randomUUID } = require("node:crypto");
const { prepareTranslation } = require("./pipeline-translation");
const { prepareAudio } = require("./pipeline-audio");
const LocalMediaStorage = require("../adapters/local-media");
const { getPipelineLeaseConfig } = require("../config/pipeline");
const lease = require("./pipeline-lease");

// Internal worker entry point, deliberately not exposed by an HTTP Router.
class PipelineService {
  constructor(store = new ContentJobStore(), { translator, translationTimeoutMs = 10000, tts, mediaStorage = new LocalMediaStorage(), audioTimeoutMs = 10000,
    leaseConfig = getPipelineLeaseConfig } = {}) {
    this.store = store; this.translator = translator; this.translationTimeoutMs = translationTimeoutMs;
    this.tts = tts; this.mediaStorage = mediaStorage; this.audioTimeoutMs = audioTimeoutMs;
    this.leaseConfig = leaseConfig;
  }
  async renewClaim(jobId, claimId) { return lease.renewClaim(this, jobId, claimId); }
  async pendingJobs(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4) throw new AppError(400, "INVALID_WORKER_LIMIT", "Mỗi worker xử lý từ 1 đến 4 tác vụ đồng thời.");
    try { return await this.store.listPending(limit); }
    catch { throw new AppError(503, "CONTENT_QUEUE_UNAVAILABLE", "Chưa đọc được danh sách tác vụ chờ."); }
  }
  async recoverExpiredJobs(options) { return lease.recoverExpiredJobs(this, options); }
  async prepareAudio(jobId, claimId) { return prepareAudio(this, jobId, claimId); }
  async runJob(jobId) {
    const claim = await this.claimJob(jobId);
    if (!claim.claimed) return claim;
    return lease.withLeaseHeartbeat(this, claim, async () => {
      const text = await this.prepareTranslation(claim.jobId, claim.claimId);
      return text.prepared ? this.prepareAudio(claim.jobId, claim.claimId) : text;
    });
  }
  async prepareTranslation(jobId, claimId) { return prepareTranslation(this, jobId, claimId); }
  async runTranslation(jobId) {
    const claim = await this.claimJob(jobId);
    return claim.claimed ? lease.withLeaseHeartbeat(this, claim, () => this.prepareTranslation(claim.jobId, claim.claimId)) : claim;
  }
  async claimJob(rawId) {
    const jobId = id(rawId);
    const config = lease.settings(this);
    try {
      return await this.store.withWorkerJob(jobId, async ({ job, transition }) => {
        if (!job) return { claimed: false, reason: "NOT_FOUND", jobId };
        if (job.status !== "PENDING") return { claimed: false, reason: "NOT_PENDING", jobId };
        if (job.sourceVersion !== job.currentVersion) {
          const saved = await transition("FAILED", "CONTENT_SOURCE_OUTDATED");
          if (!saved) throw new Error("CONTENT_JOB_CLAIM_CONFLICT");
          return { claimed: false, reason: "CONTENT_SOURCE_OUTDATED", jobId, status: "FAILED" };
        }
        const claimId = randomUUID();
        const saved = await transition("PROCESSING", null, claimId, config.leaseSeconds);
        if (!saved) throw new Error("CONTENT_JOB_CLAIM_CONFLICT");
        return { claimed: true, claimId, jobId: job.jobId, poiId: job.poiId, languageCode: job.languageCode,
          sourceVersion: job.sourceVersion, status: "PROCESSING" };
      });
    } catch {
      // A lost commit acknowledgement must never grant work to a second caller.
      throw new AppError(503, "CONTENT_JOB_CLAIM_UNAVAILABLE", "Chưa xác định được kết quả nhận tác vụ; kiểm tra trạng thái trước khi tiếp tục.");
    }
  }
}
module.exports = { PipelineService };
