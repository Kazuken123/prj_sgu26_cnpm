const AppError = require("../utils/app-error");
const { id } = require("./content-job.validation");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function settings(service) {
  try {
    const value = service.leaseConfig();
    if (!Number.isSafeInteger(value.leaseSeconds) || value.leaseSeconds < 1 || value.leaseSeconds > 3600 ||
        !Number.isSafeInteger(value.heartbeatSeconds) || value.heartbeatSeconds < 1 || value.heartbeatSeconds * 3 > value.leaseSeconds) throw new Error("invalid");
    return value;
  } catch { throw new AppError(503, "CONTENT_LEASE_UNAVAILABLE", "Cấu hình quyền xử lý tác vụ chưa hợp lệ."); }
}
async function renewClaim(service, rawId, claimId) {
  const jobId = id(rawId), config = settings(service);
  if (typeof claimId !== "string" || !uuid.test(claimId)) throw new AppError(400, "INVALID_CONTENT_CLAIM", "Mã lượt xử lý không hợp lệ.");
  try {
    return await service.store.withWorkerJob(jobId, async ({ job, renewLease }) => {
      if (!job || job.status !== "PROCESSING" || job.claimId !== claimId || !job.leaseValid) return false;
      return renewLease(claimId, config.leaseSeconds);
    });
  } catch { throw new AppError(503, "CONTENT_LEASE_UNAVAILABLE", "Chưa xác định được kết quả gia hạn tác vụ."); }
}
async function withLeaseHeartbeat(service, claim, work) {
  const config = settings(service);
  let stopped = false, timer, pending = Promise.resolve();
  const schedule = () => { timer = setTimeout(() => {
    pending = service.renewClaim(claim.jobId, claim.claimId).then(renewed => {
      if (!renewed) stopped = true;
    }).catch(() => { stopped = true; }).finally(() => { if (!stopped) schedule(); });
  }, config.heartbeatSeconds * 1000); };
  schedule();
  try { return await work(); }
  finally { stopped = true; clearTimeout(timer); await pending; }
}
async function recoverExpiredJobs(service, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some(key => !["limit", "apply"].includes(key)) ||
      (options.apply !== undefined && typeof options.apply !== "boolean")) throw new AppError(400, "INVALID_RECOVERY_OPTIONS", "Chỉ nhận limit và apply.");
  const limit = id(options.limit ?? 100);
  if (limit > 1000) throw new AppError(400, "INVALID_RECOVERY_OPTIONS", "Mỗi lượt kiểm tra tối đa 1000 tác vụ.");
  try {
    const candidates = await service.store.listExpiredClaims(limit);
    const result = { dryRun: options.apply !== true, inspected: candidates.length, recovered: 0, skipped: 0,
      legacyProcessing: await service.store.countLegacyProcessing() };
    if (result.dryRun) return result;
    for (const candidate of candidates) {
      const recovered = await service.store.withWorkerJob(candidate.jobId, async ({ job, recoverExpired }) => {
        if (!job || job.status !== "PROCESSING" || !job.claimId || job.claimId !== candidate.claimId || job.leaseValid ||
            !(job.leaseExpiresAt instanceof Date) || !Number.isFinite(job.leaseExpiresAt.getTime())) return false;
        return recoverExpired(candidate.claimId);
      });
      if (recovered) result.recovered++; else result.skipped++;
    }
    return result;
  } catch { throw new AppError(503, "CONTENT_RECOVERY_UNAVAILABLE", "Chưa xác định đầy đủ kết quả phục hồi; đối chiếu trạng thái và audit trước khi chạy lại."); }
}
module.exports = { settings, renewClaim, withLeaseHeartbeat, recoverExpiredJobs };
