const ContentJobStore = require("../stores/content_job.store");
const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");
const { randomUUID } = require("node:crypto");
const { prepareTranslation } = require("./pipeline-translation");
const { prepareAudio } = require("./pipeline-audio");
const LocalMediaStorage = require("../adapters/local-media");

// Internal worker entry point, deliberately not exposed by an HTTP Router.
class PipelineService {
  constructor(store = new ContentJobStore(), { translator, translationTimeoutMs = 10000, tts, mediaStorage = new LocalMediaStorage(), audioTimeoutMs = 10000 } = {}) {
    this.store = store; this.translator = translator; this.translationTimeoutMs = translationTimeoutMs;
    this.tts = tts; this.mediaStorage = mediaStorage; this.audioTimeoutMs = audioTimeoutMs;
  }
  async prepareAudio(jobId, claimId) { return prepareAudio(this, jobId, claimId); }
  async runJob(jobId) {
    const claim = await this.claimJob(jobId);
    if (!claim.claimed) return claim;
    const text = await this.prepareTranslation(claim.jobId, claim.claimId);
    return text.prepared ? this.prepareAudio(claim.jobId, claim.claimId) : text;
  }
  async prepareTranslation(jobId, claimId) { return prepareTranslation(this, jobId, claimId); }
  async runTranslation(jobId) {
    const claim = await this.claimJob(jobId);
    return claim.claimed ? this.prepareTranslation(claim.jobId, claim.claimId) : claim;
  }
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
        const claimId = randomUUID();
        const saved = await transition("PROCESSING", null, claimId);
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
