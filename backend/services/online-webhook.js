const AppError = require("../utils/app-error");
const dateMs = value => value instanceof Date ? value.getTime() : NaN;
async function processMockWebhook(service, body, signature) {
  let event;
  try { event = await service.gateway.verifyWebhook(body, signature); }
  catch (error) {
    if (error.code === "INVALID_MOCK_WEBHOOK_SIGNATURE") throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Chữ ký webhook không hợp lệ.");
    if (error.code === "INVALID_MOCK_WEBHOOK_PAYLOAD") throw new AppError(400, "INVALID_WEBHOOK_PAYLOAD", "Dữ liệu webhook không hợp lệ.");
    throw new AppError(503, "WEBHOOK_VERIFICATION_UNAVAILABLE", "Chưa xác minh được webhook; không ghi nhận thanh toán.");
  }
  if (!event || typeof event.paymentRef !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(event.paymentRef) ||
      typeof event.amount !== "string" || !/^(0|[1-9]\d{0,9})\.\d{2}$/.test(event.amount) || Number(event.amount) <= 0 ||
      event.currency !== "VND" || !["SUCCESS", "FAILED"].includes(event.status)) {
    throw new AppError(503, "WEBHOOK_VERIFICATION_UNAVAILABLE", "Kết quả xác minh webhook chưa hợp lệ.");
  }
  try {
    return await service.store.withOnlineWebhook(event.paymentRef, async (row, ops) => {
      if (!row || row.paymentRef !== event.paymentRef) throw new AppError(404, "WEBHOOK_PAYMENT_NOT_FOUND", "Không tìm thấy yêu cầu thanh toán.");
      if (row.paymentMethod !== "ONLINE") throw new AppError(409, "WEBHOOK_ONLINE_REQUIRED", "Webhook không được xác nhận thanh toán tiền mặt.");
      if (String(row.amount) !== event.amount || row.currency !== event.currency) throw new AppError(409, "WEBHOOK_PAYMENT_MISMATCH", "Webhook không khớp thông tin giao dịch.");
      if (!ops.checkoutPrepared) throw new AppError(409, "ONLINE_CHECKOUT_NOT_PREPARED", "Yêu cầu chưa khởi tạo checkout qua gateway.");
      if (row.paymentStatus === "PAID") {
        if (!["ACTIVE", "REVOKED"].includes(row.sessionStatus) || !Number.isFinite(dateMs(row.paidAt)) ||
            !Number.isFinite(dateMs(row.activatedAt)) || !Number.isFinite(dateMs(row.expiresAt)) || row.confirmedBy !== null) {
          throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu thanh toán và phiên cần được đối soát.");
        }
        return { accepted: true, paymentRef: event.paymentRef, paymentStatus: "PAID", sessionStatus: row.sessionStatus, duplicate: true };
      }
      if (!["PENDING", "FAILED"].includes(row.paymentStatus) || row.sessionStatus !== "PENDING" || row.paidAt !== null ||
          row.confirmedBy !== null || row.activatedAt !== null || row.expiresAt !== null || row.tokenHash !== null || row.reissueCount !== 0) {
        throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Phiên không ở trạng thái cho phép xác nhận online.");
      }
      if (event.status === "FAILED") {
        if (row.paymentStatus === "FAILED") return { accepted: true, paymentRef: event.paymentRef, paymentStatus: "FAILED", sessionStatus: "PENDING", duplicate: true };
        await ops.persist({ status: "FAILED" });
        return { accepted: true, paymentRef: event.paymentRef, paymentStatus: "FAILED", sessionStatus: "PENDING", duplicate: false };
      }
      let duration;
      try {
        duration = service.validityMs();
        if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error("INVALID_DURATION");
      } catch { throw new AppError(503, "VISIT_VALIDITY_NOT_CONFIGURED", "Thời hạn vé chưa được cấu hình hợp lệ."); }
      const paidAt = await ops.currentTime(), expiresAt = new Date(dateMs(paidAt) + duration);
      if (!Number.isFinite(dateMs(expiresAt)) || expiresAt.getUTCFullYear() > 9999) throw new AppError(503, "VISIT_VALIDITY_NOT_CONFIGURED", "Thời hạn vé vượt phạm vi cho phép.");
      await ops.persist({ status: "PAID", paidAt, expiresAt });
      return { accepted: true, paymentRef: event.paymentRef, paymentStatus: "PAID", sessionStatus: "ACTIVE", duplicate: false };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "WEBHOOK_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả lưu webhook; cần gửi lại/đối soát cùng giao dịch.");
  }
}
module.exports = { processMockWebhook };
