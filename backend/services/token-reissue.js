// UC-12 — Cấp lại token khách (Could Have, US-A04 AC4–AC5).
// Staff reconciles session_id + payment_ref + declared payment time with the
// server, then revokes the lost token and hands the visitor a one-time 6-digit
// pickup code. The visitor redeems it on the existing /payment code form, which
// mints the replacement token. The ticket deadline (expires_at) never changes.
const { randomUUID, randomBytes } = require("node:crypto");
const AppError = require("../utils/app-error");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;
const dateMs = value => value instanceof Date ? value.getTime() : NaN;
const MISMATCH = "Thông tin đối chiếu không khớp với giao dịch đã thanh toán. Kiểm tra lại session_id, payment_ref và thời điểm thanh toán.";

function invalid(message) { throw new AppError(400, "INVALID_REISSUE_INPUT", message); }
function parseInput(input, { requireReason }) {
  const allowed = ["sessionId", "paymentRef", "paidAt", "reason"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) {
    invalid("Chỉ gửi sessionId, paymentRef, paidAt và reason; hạn vé, số lần cấp lại do server xác định.");
  }
  if (typeof input.sessionId !== "string" || !uuid.test(input.sessionId.trim())) invalid("session_id không hợp lệ.");
  if (typeof input.paymentRef !== "string" || !uuid.test(input.paymentRef.trim())) invalid("payment_ref không hợp lệ.");
  if (typeof input.paidAt !== "string" || !isoUtc.test(input.paidAt) || !Number.isFinite(Date.parse(input.paidAt))) {
    invalid("Thời điểm thanh toán không hợp lệ.");
  }
  let reason = null;
  if (requireReason || input.reason !== undefined) {
    if (typeof input.reason !== "string") invalid("Vui lòng nhập lý do cấp lại (5–255 ký tự).");
    reason = input.reason.trim().replace(/\s+/g, " ");
    if (reason.length < 5 || reason.length > 255 || /[<>]/.test(reason)) invalid("Lý do cấp lại cần 5–255 ký tự, không chứa ký tự < >.");
  }
  return { sessionId: input.sessionId.trim().toLowerCase(), paymentRef: input.paymentRef.trim().toLowerCase(),
    paidAtMs: Date.parse(input.paidAt), reason };
}
function limits(service) {
  try {
    const config = service.reissueConfig();
    if (!Number.isSafeInteger(config.maxReissues) || config.maxReissues < 1 || !Number.isSafeInteger(config.paidAtToleranceMs)) throw new Error();
    return config;
  } catch { throw new AppError(503, "REISSUE_NOT_CONFIGURED", "Giới hạn cấp lại token chưa được cấu hình hợp lệ."); }
}
// Shared eligibility rules for verification (step 3) and recheck (step 5).
// Returns the pickup state: a pending pickup is a committed reissue whose code
// was lost/expired before the visitor redeemed it (token_hash NULL, count > 0).
function assertEligible(row, parsed, now, config) {
  // Unknown session and mismatched reconciliation data look identical, so the
  // form cannot be used to probe which session/payment pairs exist.
  if (!row || row.paymentRef !== parsed.paymentRef) throw new AppError(409, "REISSUE_VERIFICATION_FAILED", MISMATCH);
  if (row.paymentStatus !== "PAID") throw new AppError(409, "REISSUE_PAYMENT_NOT_PAID", "Vé chưa được thanh toán; không thể cấp lại token.");
  const paid = dateMs(row.paidAt), end = dateMs(row.expiresAt), current = dateMs(now);
  if (!Number.isFinite(paid) || !Number.isFinite(end) || !Number.isFinite(dateMs(row.activatedAt)) || !Number.isFinite(current)) {
    throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu thanh toán và phiên cần được đối soát.");
  }
  if (Math.abs(paid - parsed.paidAtMs) > config.paidAtToleranceMs) throw new AppError(409, "REISSUE_VERIFICATION_FAILED", MISMATCH);
  if (row.sessionStatus !== "ACTIVE") throw new AppError(409, "VISIT_SESSION_NOT_ACTIVE", "Phiên tham quan đã bị thu hồi hoặc không hoạt động.");
  if (end <= current) throw new AppError(409, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn; không cấp lại token.");
  const pendingPickup = row.tokenHash === null && row.reissueCount > 0;
  if (row.tokenHash === null && row.reissueCount === 0) {
    throw new AppError(409, "REISSUE_NOT_NEEDED", "Phiên chưa từng đổi token. Dùng luồng cấp mã thường (UC-11) hoặc mã online, không cấp lại.");
  }
  if (!pendingPickup && row.reissueCount >= config.maxReissues) {
    throw new AppError(409, "REISSUE_LIMIT_REACHED", `Vé đã được cấp lại ${row.reissueCount} lần, đạt giới hạn ${config.maxReissues} lần.`);
  }
  return { pendingPickup, end, current };
}
function summary(row, config, pendingPickup) {
  return { sessionId: row.sessionId, paymentRef: row.paymentRef, paymentMethod: row.paymentMethod,
    amount: String(row.amount), currency: row.currency, paidAt: row.paidAt, expiresAt: row.expiresAt,
    reissueCount: row.reissueCount, maxReissues: config.maxReissues,
    // A pending pickup renews only the code; the reissue was already counted.
    remainingAfter: pendingPickup ? config.maxReissues - row.reissueCount : config.maxReissues - row.reissueCount - 1,
    pendingPickup };
}

async function verifyTokenReissue(service, actor, input) {
  service.authorize(actor);
  const parsed = parseInput(input, { requireReason: false }), config = limits(service);
  let found;
  try { found = await service.store.lookupForReissue(actor.userId ?? actor.user_id, parsed.sessionId, service.authorize); }
  catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "REISSUE_LOOKUP_UNAVAILABLE", "Chưa đối chiếu được phiên; vui lòng thử lại.");
  }
  const { pendingPickup } = assertEligible(found.row, parsed, found.now, config);
  return summary(found.row, config, pendingPickup);
}

async function reissueToken(service, actor, input, { ipAddress = null } = {}) {
  service.authorize(actor);
  const parsed = parseInput(input, { requireReason: true }), config = limits(service);
  let ttl;
  try {
    ttl = service.cashCodeTtlMs();
    if (!Number.isSafeInteger(ttl) || ttl <= 0) throw new Error("INVALID_TTL");
  } catch { throw new AppError(503, "CASH_CODE_TTL_NOT_CONFIGURED", "Thời hạn mã chưa được cấu hình hợp lệ."); }
  const id = parsed.sessionId;
  let result;
  try {
    result = await service.store.withTokenReissue(actor.userId ?? actor.user_id, id, service.authorize, async (row, ops) => {
      // Recheck under the row lock: concurrent staff requests serialize here and
      // the second one sees the incremented count (AC5: no limit overrun).
      const { pendingPickup, end, current } = assertEligible(row, parsed, ops.now, config);
      const reissueNumber = pendingPickup ? row.reissueCount : row.reissueCount + 1;
      if (!pendingPickup && !(await ops.revoke({ previousTokenHash: row.tokenHash, previousCount: row.reissueCount }))) {
        throw new AppError(409, "REISSUE_CHANGED", "Phiên vừa thay đổi; hãy đối chiếu lại trước khi cấp lại.");
      }
      const candidate = { sessionId: id, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"),
        expiresAtMs: current + Math.min(ttl, end - current), purpose: "REISSUE", reissueNumber };
      let issued;
      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          candidate.shortedCode = service.cashCode();
          if (typeof candidate.shortedCode !== "string" || !/^\d{6}$/.test(candidate.shortedCode)) throw new Error("INVALID_CASH_CODE_GENERATOR");
          issued = await service.redis.ensureCashCode(id, candidate, end);
          // A still-valid pickup code for this same reissue is reused (lost reply
          // retry). A leftover first-issue cash code or an older reissue's code is
          // dropped (compare-by-issueId) so it can never redeem this reissue.
          if (issued?.record && (issued.record.purpose !== "REISSUE" || issued.record.reissueNumber !== reissueNumber)) {
            await service.redis.removeCashCode(id, issued.record.issueId);
            issued = await service.redis.ensureCashCode(id, candidate, end);
          }
          if (!issued?.collision) break;
        }
        if (issued?.collision) throw new Error("CASH_CODE_SPACE_BUSY");
      } catch { throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Chưa tạo được mã nhận vé; token cũ được giữ nguyên, chưa tính lần cấp lại. Hãy thử lại."); }
      const record = issued?.record;
      if (!record || record.sessionId !== id || record.purpose !== "REISSUE" || record.reissueNumber !== reissueNumber ||
          !/^\d{6}$/.test(record.shortedCode) || !Number.isSafeInteger(record.expiresAtMs) ||
          record.expiresAtMs <= current || record.expiresAtMs > end) {
        throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Trạng thái mã chưa hợp lệ; token cũ được giữ nguyên.");
      }
      const codeExpiresAt = new Date(record.expiresAtMs);
      await ops.audit({ issueId: record.issueId, reissueNumber, renewedCode: pendingPickup, reason: parsed.reason, codeExpiresAt, ipAddress });
      const { pendingPickup: _omit, ...base } = summary({ ...row, reissueCount: reissueNumber }, config, true);
      return { ...base, shortedCode: record.shortedCode, codeExpiresAt, renewedCode: pendingPickup, reissueNumber };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "REISSUE_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả cấp lại. Đối soát phiên trước khi thử lại; không tự cấp lại lần nữa.");
  }
  return result;
}
module.exports = { verifyTokenReissue, reissueToken };
