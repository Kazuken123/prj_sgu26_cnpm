const { createHash, randomUUID } = require("node:crypto");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const { getVisitPrice, getLookupConfig } = require("../config/payment");
const AppError = require("../utils/app-error");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash = value => createHash("sha256").update(value).digest("hex");
function authorize(actor) {
  if (!actor || !Number.isSafeInteger(actor.userId ?? actor.user_id) || (actor.userId ?? actor.user_id) < 1) {
    throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
  }
  if (!["STAFF", "ADMIN"].includes(actor.role) || actor.status !== "ACTIVE" ||
      (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
    throw new AppError(403, "FORBIDDEN", "Không có quyền hỗ trợ thanh toán cho khách.");
  }
}
class PaymentService {
  constructor(store = new PaymentStore(), redis = new RedisStore(), { price = getVisitPrice, lookupConfig = getLookupConfig } = {}) {
    this.store = store; this.redis = redis; this.price = price; this.lookupConfig = lookupConfig;
  }
  async initialize(input, requestKey, actor = null) {
    if (actor !== null) authorize(actor);
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).some(key => key !== "paymentMethod") || !["CASH", "ONLINE"].includes(input.paymentMethod)) {
      throw new AppError(400, "INVALID_PAYMENT_INPUT", "Chỉ gửi paymentMethod CASH hoặc ONLINE; số tiền do server xác định.");
    }
    if (actor !== null && input.paymentMethod !== "CASH") {
      throw new AppError(400, "STAFF_CASH_ONLY", "Luồng hỗ trợ nhân viên chỉ tạo phiên tiền mặt.");
    }
    if (typeof requestKey !== "string" || !uuid.test(requestKey)) {
      throw new AppError(400, "INVALID_REQUEST_KEY", "Idempotency-Key phải là UUID v4 ngẫu nhiên; giữ nguyên khi thử lại cùng yêu cầu.");
    }
    const actorId = actor === null ? null : actor.userId ?? actor.user_id;
    const result = await this.store.initialize({ hash: hash(requestKey.toLowerCase()), actorId, authorize,
      build: () => {
        let amount;
        try { amount = this.price(); }
        catch { throw new AppError(503, "VISIT_PRICE_NOT_CONFIGURED", "Giá vé chưa được cấu hình hợp lệ."); }
        return { sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: input.paymentMethod, amount };
      } });
    const row = result.record;
    if (row.paymentMethod !== input.paymentMethod || row.createdBy !== actorId) {
      throw new AppError(409, "REQUEST_KEY_CONFLICT", "Khóa yêu cầu đã được sử dụng cho một yêu cầu khác.");
    }
    return { created: result.created, data: { sessionId: row.sessionId, paymentRef: row.paymentRef,
      paymentMethod: row.paymentMethod, amount: String(row.amount), currency: row.currency,
      sessionStatus: row.sessionStatus, paymentStatus: row.paymentStatus } };
  }
  async status(sessionId, ipAddress) {
    // Limit before validating the identifier, so random/invalid IDs cannot bypass the IP bucket.
    if (typeof ipAddress !== "string" || !ipAddress || ipAddress.length > 100) {
      throw new AppError(503, "LOOKUP_PROTECTION_UNAVAILABLE", "Chưa thể bảo vệ tra cứu phiên.");
    }
    const normalized = typeof sessionId === "string" && uuid.test(sessionId) ? sessionId.toLowerCase() : "invalid";
    let allowed;
    try {
      allowed = await this.redis.consumeLookup(["visit-lookup:ip:" + hash(ipAddress), "visit-lookup:session:" + hash(normalized)], this.lookupConfig());
    } catch { throw new AppError(503, "LOOKUP_PROTECTION_UNAVAILABLE", "Tra cứu tạm ngừng; vui lòng thử lại sau."); }
    if (!allowed) throw new AppError(429, "LOOKUP_RATE_LIMITED", "Tra cứu quá nhiều lần; vui lòng thử lại sau.");
    if (normalized === "invalid") throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
    const row = await this.store.getStatus(normalized);
    if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
    return { sessionId: row.sessionId, sessionStatus: row.sessionStatus, paymentStatus: row.paymentStatus };
  }
  async lookupCash(actor, sessionId) {
    authorize(actor);
    if (typeof sessionId !== "string" || !uuid.test(sessionId)) {
      throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
    }
    const row = await this.store.lookupForStaff(actor.userId ?? actor.user_id, sessionId.toLowerCase(), authorize);
    if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
    if (row.paymentMethod !== "CASH") {
      throw new AppError(409, "CASH_PAYMENT_REQUIRED", "Phiên này không sử dụng thanh toán tiền mặt.");
    }
    // Lookup is not confirmation: preserve PAID/FAILED and ACTIVE/REVOKED states.
    return { sessionId: row.sessionId, paymentRef: row.paymentRef, paymentMethod: row.paymentMethod,
      amount: String(row.amount), currency: row.currency, sessionStatus: row.sessionStatus, paymentStatus: row.paymentStatus };
  }
}
module.exports = new PaymentService();
module.exports.PaymentService = PaymentService;
