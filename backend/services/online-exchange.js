const { createHash, randomBytes } = require("node:crypto");
const AppError = require("../utils/app-error");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash = value => createHash("sha256").update(value).digest("hex");
const dateMs = value => value instanceof Date ? value.getTime() : NaN;
async function exchangeOnlineCode(service, sessionId, input, ipAddress) {
  const id = typeof sessionId === "string" && uuid.test(sessionId) ? sessionId.toLowerCase() : "invalid";
  if (typeof ipAddress !== "string" || !ipAddress || ipAddress.length > 100) throw new AppError(503, "ONLINE_EXCHANGE_PROTECTION_UNAVAILABLE", "Chưa thể bảo vệ việc đổi mã.");
  let allowed;
  try {
    allowed = await service.redis.consumeLookup(["online-exchange:ip:" + hash(ipAddress), "online-exchange:session:" + hash(id)], service.onlineExchangeConfig());
  } catch { throw new AppError(503, "ONLINE_EXCHANGE_PROTECTION_UNAVAILABLE", "Đổi mã online tạm ngừng; vui lòng thử lại sau."); }
  if (!allowed) throw new AppError(429, "ONLINE_EXCHANGE_RATE_LIMITED", "Đã vượt giới hạn thử mã; vui lòng đợi rồi thử lại.");
  if (id === "invalid") throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 ||
      typeof input.authCode !== "string" || !/^[a-f0-9]{64}$/.test(input.authCode)) throw new AppError(400, "INVALID_ONLINE_EXCHANGE_INPUT", "Chỉ gửi authCode đã nhận khi khởi tạo checkout.");
  let result;
  try {
    result = await service.store.withOnlineTokenExchange(id, async (row, ops) => {
      if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
      if (row.paymentMethod !== "ONLINE") throw new AppError(409, "ONLINE_PAYMENT_REQUIRED", "Phiên không sử dụng thanh toán online.");
      if (row.paymentStatus === "PENDING") throw new AppError(409, "ONLINE_PAYMENT_PENDING", "Đang chờ xác nhận thanh toán; không tạo giao dịch mới.");
      if (row.paymentStatus !== "PAID") throw new AppError(409, "ONLINE_PAYMENT_NOT_PAID", "Giao dịch chưa được xác nhận thành công.");
      if (row.sessionStatus !== "ACTIVE") throw new AppError(409, "VISIT_SESSION_NOT_ACTIVE", "Phiên tham quan không hoạt động.");
      if (row.tokenHash !== null || row.reissueCount !== 0) throw new AppError(409, "VISIT_TOKEN_ALREADY_ISSUED", "Phiên đã cấp token. Nếu chưa nhận được token, hãy liên hệ nhân viên; không thanh toán lại.");
      const current = dateMs(ops.now), end = dateMs(row.expiresAt);
      if (!Number.isFinite(current) || !Number.isFinite(end) || !Number.isFinite(dateMs(row.paidAt)) ||
          !Number.isFinite(dateMs(row.activatedAt)) || row.confirmedBy !== null) throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu thanh toán và phiên cần đối soát.");
      if (end <= current) throw new AppError(409, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn.");
      const prepared = ops.preparation;
      if (!ops.ready || !prepared || prepared.sessionId !== id || typeof prepared.issueId !== "string" || !uuid.test(prepared.issueId) ||
          !Number.isSafeInteger(prepared.expiresAtMs) || prepared.expiresAtMs <= 0) throw new AppError(409, "ONLINE_CHECKOUT_NOT_READY", "Chưa có checkout đã phát hành hợp lệ; cần đối soát.");
      if (prepared.expiresAtMs <= current) throw new AppError(401, "ONLINE_CODE_INVALID_OR_EXPIRED", "Mã online không hợp lệ hoặc đã hết hạn; không thanh toán lại khi chưa đối soát.");
      let record;
      try { record = await service.redis.inspectOnlineCode(id, input.authCode); }
      catch { throw new AppError(503, "ONLINE_CODE_UNAVAILABLE", "Chưa kiểm tra được mã; kết quả thanh toán được giữ nguyên."); }
      if (!record) throw new AppError(401, "ONLINE_CODE_INVALID_OR_EXPIRED", "Mã online không hợp lệ hoặc đã hết hạn; cần đối soát.");
      if (record.sessionId !== id || record.issueId !== prepared.issueId || record.expiresAtMs !== prepared.expiresAtMs || record.authCode !== input.authCode) {
        throw new AppError(503, "ONLINE_CODE_UNAVAILABLE", "Trạng thái mã chưa khớp dữ liệu đã phát hành.");
      }
      const token = "tcv_visit_" + randomBytes(32).toString("hex");
      const saved = await ops.persist({ tokenHash: hash(token), issueId: record.issueId,
        codeExpiresAt: new Date(Math.min(record.expiresAtMs, end)), ipAddress });
      if (!saved) throw new AppError(409, "ONLINE_EXCHANGE_CHANGED", "Mã hoặc phiên không còn cho phép đổi; cần kiểm tra lại trạng thái.");
      return { data: { sessionId: id, token, tokenType: "Bearer", expiresAt: row.expiresAt }, issueId: record.issueId };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "ONLINE_EXCHANGE_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả cấp token; đối soát phiên trước khi thử lại, không thanh toán lại.");
  }
  // A committed SQL token hash is the one-time claim; cleanup is not a second grant.
  try { await service.redis.removeOnlineCode(id, result.issueId); } catch { /* Temporary mapping still expires; SQL blocks replay. */ }
  return result.data;
}
module.exports = { exchangeOnlineCode };
