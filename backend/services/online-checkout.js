const { createHash, randomUUID, randomBytes } = require("node:crypto");
const AppError = require("../utils/app-error");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function pending(row) {
  if (!row || row.paymentMethod !== "ONLINE" || row.paymentStatus !== "PENDING" || row.sessionStatus !== "PENDING" ||
      row.paidAt !== null || row.confirmedBy !== null || row.activatedAt !== null || row.expiresAt !== null || row.tokenHash !== null || row.reissueCount !== 0) {
    throw new AppError(409, "ONLINE_CHECKOUT_NOT_PENDING", "Phiên không còn cho phép khởi tạo checkout; hãy đối soát, không tạo thanh toán mới.");
  }
}
function preparationValid(preparation, id) {
  return preparation && preparation.sessionId === id && typeof preparation.issueId === "string" && uuid.test(preparation.issueId) &&
    Number.isSafeInteger(preparation.expiresAtMs) && preparation.expiresAtMs > 0 && preparation.expiresAtMs <= 253402300799000;
}
async function boundedCheckout(gateway, input, timeoutMs) {
  const controller = new AbortController(); let timer;
  try {
    return await Promise.race([gateway.createCheckout(input, { signal: controller.signal }), new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("GATEWAY_TIMEOUT")); }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
async function initializeOnline(service, input = {}, requestKey) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
    throw new AppError(400, "INVALID_ONLINE_CHECKOUT_INPUT", "Body để trống; giá và thông tin checkout do server xác định.");
  }
  let config;
  try {
    config = service.gateway.assertConfigured();
    const base = new URL(config.publicBaseUrl);
    if (config.provider !== "MOCK" || !["http:", "https:"].includes(base.protocol) || base.username || base.password ||
        !Number.isSafeInteger(service.gatewayTimeoutMs) || service.gatewayTimeoutMs < 1 || service.gatewayTimeoutMs > 10000) throw new Error("INVALID_GATEWAY_CONFIG");
  } catch { throw new AppError(503, "ONLINE_GATEWAY_NOT_CONFIGURED", "MockGateway chưa được cấu hình hợp lệ."); }
  let initialized;
  try { initialized = await service.initialize({ paymentMethod: "ONLINE" }, requestKey); }
  catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả tạo phiên; đối soát bằng cùng Idempotency-Key.");
  }
  const id = initialized.data.sessionId, requestHash = createHash("sha256").update(requestKey.toLowerCase()).digest("hex");
  try {
    // Commit a secret-free deadline before any Redis/gateway side effect.
    // Retrying a failed first setup never starts a new validity window.
    await service.store.withOnlineCheckout(id, requestHash, async (row, ops) => {
      pending(row);
      if (ops.preparation) {
        if (!preparationValid(ops.preparation, id)) throw new Error("INVALID_PREPARATION");
        if (ops.preparation.expiresAtMs <= ops.now.getTime()) throw new AppError(409, "ONLINE_CODE_EXPIRED", "Mã online đã hết hạn; giữ giao dịch để đối soát, không thanh toán lại.");
        return;
      }
      let duration;
      try {
        duration = service.onlineCodeTtlMs();
        if (!Number.isSafeInteger(duration) || duration <= 0 || duration > 253402300799000 - ops.now.getTime()) throw new Error("INVALID_TTL");
      } catch { throw new AppError(503, "ONLINE_CODE_TTL_NOT_CONFIGURED", "Thời hạn mã online chưa hợp lệ."); }
      await ops.prepare({ sessionId: id, issueId: randomUUID(), expiresAtMs: ops.now.getTime() + duration });
    });
    const data = await service.store.withOnlineCheckout(id, requestHash, async (row, ops) => {
      pending(row);
      const prepared = ops.preparation;
      if (!preparationValid(prepared, id)) throw new Error("INVALID_PREPARATION");
      if (prepared.expiresAtMs <= ops.now.getTime()) throw new AppError(409, "ONLINE_CODE_EXPIRED", "Mã online đã hết hạn; giữ giao dịch để đối soát.");
      let record;
      try {
        record = await service.redis.ensureOnlineCode(id, { ...prepared, authCode: randomBytes(32).toString("hex") }, !ops.ready);
      } catch { throw new AppError(503, "ONLINE_CODE_UNAVAILABLE", "Chưa kiểm tra/lưu được mã online; giữ giao dịch và thử lại với cùng Idempotency-Key."); }
      if (!record) throw new AppError(409, "ONLINE_CODE_MISSING", "Mã online đã phát hành không còn trong Redis; cần đối soát, không tự tạo mã hoặc giao dịch thay thế.");
      if (record.sessionId !== id || record.issueId !== prepared.issueId || record.expiresAtMs !== prepared.expiresAtMs || !/^[a-f0-9]{64}$/.test(record.authCode)) {
        throw new AppError(503, "ONLINE_CODE_UNAVAILABLE", "Dữ liệu mã online không hợp lệ; giữ giao dịch để đối soát.");
      }
      let checkout;
      try {
        checkout = await boundedCheckout(service.gateway, { paymentRef: row.paymentRef, amount: String(row.amount), currency: row.currency,
          expiresAt: new Date(prepared.expiresAtMs) }, service.gatewayTimeoutMs);
        const url = new URL(checkout.paymentUrl);
        if (checkout.provider !== "MOCK" || url.origin !== new URL(config.publicBaseUrl).origin || url.username || url.password || url.hash || url.search ||
            url.pathname !== "/api/payments/mock-checkout/" + row.paymentRef) throw new Error("INVALID_GATEWAY_URL");
      } catch { throw new AppError(503, "ONLINE_GATEWAY_UNAVAILABLE", "Chưa khởi tạo được URL mock; thử lại cùng yêu cầu, không tự tạo giao dịch mới."); }
      if ((await ops.currentTime()).getTime() >= prepared.expiresAtMs) throw new AppError(409, "ONLINE_CODE_EXPIRED", "Mã đã hết hạn trong khi chuẩn bị checkout; không trả URL mới.");
      if (!ops.ready) await ops.markReady();
      return { ...initialized.data, provider: "MOCK", paymentUrl: checkout.paymentUrl, authCode: record.authCode, codeExpiresAt: new Date(prepared.expiresAtMs) };
    });
    if (data.codeExpiresAt.getTime() <= service.now()) throw new AppError(409, "ONLINE_CODE_EXPIRED", "Mã đã hết hạn trước khi trả kết quả; cần đối soát.");
    return { created: initialized.created, data };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "ONLINE_CHECKOUT_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả khởi tạo; giữ cùng Idempotency-Key để đối soát, không thanh toán lại.");
  }
}
module.exports = { initializeOnline };
