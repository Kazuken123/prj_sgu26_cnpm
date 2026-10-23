const { createHash, randomUUID, randomBytes, randomInt } = require("node:crypto");
const PaymentStore = require("../stores/payment.store");
const RedisStore = require("../stores/redis.store");
const { getVisitPrice, getLookupConfig, getVisitValidityMs, getCashCodeTtlMs, getCashExchangeConfig } = require("../config/payment");
const AppError = require("../utils/app-error");
const MockGateway = require("../adapters/mock-gateway");
const { getOnlineCodeTtlMs, getOnlineExchangeConfig, isMockSimulationEnabled } = require("../config/online-payment");
const { simulateMockPayment } = require("./mock-payment-simulation");
const { initializeOnline } = require("./online-checkout");
const { processMockWebhook } = require("./online-webhook");
const { exchangeOnlineCode } = require("./online-exchange");
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
  constructor(store = new PaymentStore(), redis = new RedisStore(), { price = getVisitPrice, lookupConfig = getLookupConfig,
    validityMs = getVisitValidityMs, cashCodeTtlMs = getCashCodeTtlMs, exchangeConfig = getCashExchangeConfig, now = () => Date.now(),
    gateway = new MockGateway(), onlineCodeTtlMs = getOnlineCodeTtlMs, gatewayTimeoutMs = 2000, onlineExchangeConfig = getOnlineExchangeConfig,
    simulationEnabled = isMockSimulationEnabled } = {}) {
    this.store = store; this.redis = redis; this.price = price; this.lookupConfig = lookupConfig; this.validityMs = validityMs;
    this.cashCodeTtlMs = cashCodeTtlMs; this.now = now;
    this.exchangeConfig = exchangeConfig;
    this.gateway = gateway; this.onlineCodeTtlMs = onlineCodeTtlMs; this.gatewayTimeoutMs = gatewayTimeoutMs;
    this.onlineExchangeConfig = onlineExchangeConfig;
    this.simulationEnabled = simulationEnabled;
  }
  async initializeOnline(input, requestKey) { return initializeOnline(this, input, requestKey); }
  quote() {
    try { return { amount: this.price(), currency: "VND" }; }
    catch { throw new AppError(503, "VISIT_PRICE_NOT_CONFIGURED", "Giá vé chưa được cấu hình hợp lệ."); }
  }
  async processMockWebhook(body, signature) { return processMockWebhook(this, body, signature); }
  async simulateMockPayment(paymentRef, input, ipAddress) { return simulateMockPayment(this, paymentRef, input, ipAddress); }
  async exchangeOnlineCode(sessionId, input, ipAddress) { return exchangeOnlineCode(this, sessionId, input, ipAddress); }
  async mockCheckout(paymentRef) {
    try { this.gateway.assertConfigured(); }
    catch { throw new AppError(503, "ONLINE_GATEWAY_NOT_CONFIGURED", "MockGateway chưa được bật."); }
    if (typeof paymentRef !== "string" || !uuid.test(paymentRef)) throw new AppError(400, "INVALID_PAYMENT_REF", "Mã tham chiếu không hợp lệ.");
    const row = await this.store.getMockCheckout(paymentRef.toLowerCase());
    if (!row || row.paymentMethod !== "ONLINE") throw new AppError(404, "MOCK_CHECKOUT_NOT_FOUND", "Không tìm thấy checkout mock.");
    return { provider: "MOCK", simulationOnly: true, paymentRef: row.paymentRef, amount: String(row.amount), currency: row.currency,
      paymentStatus: row.paymentStatus, message: "Checkout mô phỏng, không thu tiền thật. Mở URL không xác nhận thanh toán; kết quả phải qua webhook có chữ ký từ công cụ mock phía server." };
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
  async confirmCash(actor, sessionId, input = {}, { ipAddress = null } = {}) {
    authorize(actor);
    if (typeof sessionId !== "string" || !uuid.test(sessionId)) {
      throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
      throw new AppError(400, "INVALID_CASH_CONFIRMATION", "Không gửi số tiền, trạng thái hoặc thời hạn; dùng dữ liệu server.");
    }
    const result = await this.store.withCashConfirmation(actor.userId ?? actor.user_id, sessionId.toLowerCase(), authorize,
      async (row, operations) => {
        if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
        if (row.paymentMethod !== "CASH") throw new AppError(409, "CASH_PAYMENT_REQUIRED", "Phiên này không sử dụng thanh toán tiền mặt.");
        if (row.paymentStatus === "PAID") {
          if (!["ACTIVE", "REVOKED"].includes(row.sessionStatus) || !row.paidAt || !row.activatedAt || !row.expiresAt) {
            throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu thanh toán và phiên cần được đối soát.");
          }
          // Never renew a paid ticket, reactivate a revoked visit, or mint a token here.
          return { record: row, alreadyConfirmed: true };
        }
        if (row.paymentStatus !== "PENDING" || row.sessionStatus !== "PENDING" || row.paidAt !== null ||
            row.confirmedBy !== null || row.activatedAt !== null || row.expiresAt !== null || row.tokenHash !== null || row.reissueCount !== 0) {
          throw new AppError(409, "CASH_PAYMENT_NOT_CONFIRMABLE", "Phiên không ở trạng thái cho phép xác nhận tiền mặt.");
        }
        let duration;
        try {
          duration = this.validityMs();
          if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error("INVALID_DURATION");
        } catch { throw new AppError(503, "VISIT_VALIDITY_NOT_CONFIGURED", "Thời hạn vé chưa được cấu hình hợp lệ."); }
        // Read database UTC time after acquiring the locks, not before waiting for them.
        const paidAt = await operations.currentTime();
        const expiresAt = new Date(paidAt.getTime() + duration);
        if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getUTCFullYear() > 9999) {
          throw new AppError(503, "VISIT_VALIDITY_NOT_CONFIGURED", "Thời hạn vé vượt phạm vi dữ liệu cho phép.");
        }
        return { record: await operations.persist({ paidAt, expiresAt, ipAddress }), alreadyConfirmed: false };
      });
    const row = result.record;
    return { sessionId: row.sessionId, paymentRef: row.paymentRef, paymentMethod: row.paymentMethod,
      amount: String(row.amount), currency: row.currency, sessionStatus: row.sessionStatus, paymentStatus: row.paymentStatus,
      paidAt: row.paidAt, activatedAt: row.activatedAt, expiresAt: row.expiresAt, alreadyConfirmed: result.alreadyConfirmed };
  }
  async authenticateVisitor(token) {
    if (typeof token !== "string" || !/^tcv_visit_[a-f0-9]{64}$/.test(token)) {
      throw new AppError(401, "INVALID_VISITOR_TOKEN", "Token khách không hợp lệ.");
    }
    let row;
    try { row = await this.store.getVisitorByTokenHash(hash(token)); }
    catch { throw new AppError(503, "VISITOR_AUTH_UNAVAILABLE", "Chưa kiểm tra được phiên tham quan; vui lòng thử lại sau."); }
    if (!row) throw new AppError(401, "INVALID_VISITOR_TOKEN", "Token khách không hợp lệ.");
    const dateMs = value => value instanceof Date ? value.getTime() : NaN;
    const current = dateMs(row.nowUtc), expires = dateMs(row.expiresAt);
    if (!Number.isFinite(current)) throw new AppError(503, "VISITOR_AUTH_UNAVAILABLE", "Chưa kiểm tra được thời hạn phiên.");
    if (row.paymentStatus !== "PAID" || row.sessionStatus !== "ACTIVE" ||
        !Number.isFinite(dateMs(row.paidAt)) || !Number.isFinite(dateMs(row.activatedAt)) || !Number.isFinite(expires)) {
      throw new AppError(401, "INVALID_VISITOR_SESSION", "Phiên tham quan không còn hợp lệ.");
    }
    if (expires <= current) throw new AppError(401, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn.");
    return { sessionId: row.sessionId, status: row.sessionStatus, expiresAt: row.expiresAt };
  }
  async exchangeCashCode(sessionId, input, ipAddress) {
    const id = typeof sessionId === "string" && uuid.test(sessionId) ? sessionId.toLowerCase() : "invalid";
    if (typeof ipAddress !== "string" || !ipAddress || ipAddress.length > 100) {
      throw new AppError(503, "CASH_EXCHANGE_PROTECTION_UNAVAILABLE", "Chưa thể bảo vệ việc đổi mã.");
    }
    let allowed;
    try {
      allowed = await this.redis.consumeLookup(["cash-exchange:ip:" + hash(ipAddress), "cash-exchange:session:" + hash(id)], this.exchangeConfig());
    } catch { throw new AppError(503, "CASH_EXCHANGE_PROTECTION_UNAVAILABLE", "Đổi mã tạm ngừng; vui lòng thử lại sau."); }
    if (!allowed) throw new AppError(429, "CASH_EXCHANGE_RATE_LIMITED", "Đã vượt giới hạn thử mã; vui lòng đợi rồi thử lại.");
    if (id === "invalid") throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 ||
        typeof input.shortedCode !== "string" || !/^\d{6}$/.test(input.shortedCode)) {
      throw new AppError(400, "INVALID_CASH_EXCHANGE_INPUT", "Chỉ gửi shortedCode dạng chuỗi sáu chữ số.");
    }
    let result;
    try {
      result = await this.store.withCashTokenExchange(id, async (row, operations) => {
        if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
        if (row.paymentMethod !== "CASH") throw new AppError(409, "CASH_PAYMENT_REQUIRED", "Phiên không sử dụng thanh toán tiền mặt.");
        if (row.paymentStatus === "PENDING") throw new AppError(409, "CASH_PAYMENT_PENDING", "Đang chờ nhân viên xác nhận; không tạo thanh toán mới.");
        if (row.paymentStatus !== "PAID") throw new AppError(409, "CASH_PAYMENT_NOT_PAID", "Thanh toán chưa hợp lệ để đổi mã.");
        if (row.sessionStatus !== "ACTIVE") throw new AppError(409, "VISIT_SESSION_NOT_ACTIVE", "Phiên tham quan không hoạt động.");
        if (row.tokenHash !== null || row.reissueCount !== 0) {
          throw new AppError(409, "VISIT_TOKEN_ALREADY_ISSUED", "Phiên đã được cấp token. Nếu chưa nhận được token, hãy liên hệ nhân viên; không thanh toán lại.");
        }
        const end = row.expiresAt?.getTime(), current = operations.now.getTime();
        if (!row.paidAt || !row.activatedAt || !Number.isFinite(end)) throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu phiên cần được đối soát.");
        if (end <= current) throw new AppError(409, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn.");
        let record;
        try { record = await this.redis.inspectCashCode(id, input.shortedCode); }
        catch { throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Chưa kiểm tra được mã; kết quả thanh toán được giữ nguyên."); }
        if (!record) throw new AppError(401, "CASH_CODE_INVALID_OR_EXPIRED", "Mã không hợp lệ hoặc đã hết hạn; hãy kiểm tra với nhân viên.");
        if (record.sessionId !== id || record.shortedCode !== input.shortedCode ||
            !/^[a-f0-9-]{36}$/.test(record.issueId) || !/^[a-f0-9]{64}$/.test(record.authCode) ||
            !Number.isSafeInteger(record.expiresAtMs) || record.expiresAtMs > end) {
          throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Trạng thái mã chưa hợp lệ; kết quả thanh toán được giữ nguyên.");
        }
        if (record.expiresAtMs <= current) throw new AppError(401, "CASH_CODE_INVALID_OR_EXPIRED", "Mã không hợp lệ hoặc đã hết hạn.");
        const token = "tcv_visit_" + randomBytes(32).toString("hex");
        const saved = await operations.persist({ tokenHash: hash(token), issueId: record.issueId, codeExpiresAt: new Date(record.expiresAtMs), ipAddress });
        if (!saved) throw new AppError(409, "CASH_EXCHANGE_CHANGED", "Mã hoặc phiên không còn cho phép đổi; hãy kiểm tra lại trạng thái.");
        return { data: { sessionId: id, token, tokenType: "Bearer", expiresAt: row.expiresAt }, issueId: record.issueId };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE", "Chưa xác định được kết quả cấp token; hãy đối soát phiên trước khi thử lại, không thanh toán lại.");
    }
    // SQL commit is the one-time claim. A stale Redis record cannot bypass it.
    // Cleanup failure after commit must not hide the only returned copy of the token.
    try { await this.redis.removeCashCode(id, result.issueId); } catch { /* TTL cleans up the temporary mapping. */ }
    return result.data;
  }
  async issueCashCode(actor, sessionId, input = {}, { ipAddress = null } = {}) {
    authorize(actor);
    if (typeof sessionId !== "string" || !uuid.test(sessionId)) {
      throw new AppError(400, "INVALID_SESSION_ID", "session_id không hợp lệ.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
      throw new AppError(400, "INVALID_CASH_CODE_INPUT", "Mã và thời hạn do server xác định; không gửi thuộc tính trong body.");
    }
    const id = sessionId.toLowerCase();
    let result;
    try {
      result = await this.store.withCashCodeIssue(actor.userId ?? actor.user_id, id, authorize, async (row, operations) => {
        if (!row) throw new AppError(404, "VISIT_SESSION_NOT_FOUND", "Không tìm thấy phiên tham quan.");
        if (row.paymentMethod !== "CASH") throw new AppError(409, "CASH_PAYMENT_REQUIRED", "Phiên không sử dụng thanh toán tiền mặt.");
        if (row.paymentStatus !== "PAID") throw new AppError(409, "CASH_PAYMENT_NOT_PAID", "Chưa ghi nhận thanh toán; không thể cấp mã.");
        if (row.sessionStatus !== "ACTIVE") throw new AppError(409, "VISIT_SESSION_NOT_ACTIVE", "Phiên tham quan không còn hoạt động.");
        if (row.tokenHash !== null || row.reissueCount !== 0) {
          throw new AppError(409, "VISIT_TOKEN_ALREADY_ISSUED", "Phiên đã được cấp token; không cấp lại qua luồng mã tiền mặt.");
        }
        const end = row.expiresAt?.getTime(), current = operations.now.getTime();
        if (!row.paidAt || !row.activatedAt || !Number.isFinite(end)) {
          throw new AppError(409, "PAYMENT_SESSION_INCONSISTENT", "Dữ liệu thanh toán và phiên cần được đối soát.");
        }
        if (end <= current) throw new AppError(409, "VISIT_SESSION_EXPIRED", "Vé đã hết hạn; không cấp mã mới.");
        let duration;
        try {
          duration = this.cashCodeTtlMs();
          if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error("INVALID_TTL");
        } catch { throw new AppError(503, "CASH_CODE_TTL_NOT_CONFIGURED", "Thời hạn mã chưa được cấu hình hợp lệ."); }
        const candidate = { sessionId: id, issueId: randomUUID(), authCode: randomBytes(32).toString("hex"),
          shortedCode: String(randomInt(0, 1000000)).padStart(6, "0"), expiresAtMs: current + Math.min(duration, end - current) };
        let issued;
        try { issued = await this.redis.ensureCashCode(id, candidate, end); }
        catch { throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Chưa cấp được mã. Giao dịch đã thanh toán được giữ nguyên; hãy thử cấp mã lại trên phiên này."); }
        if (!issued?.record || issued.record.sessionId !== id || !/^\d{6}$/.test(issued.record.shortedCode) ||
            !Number.isSafeInteger(issued.record.expiresAtMs) || issued.record.expiresAtMs <= current || issued.record.expiresAtMs > end) {
          throw new AppError(503, "CASH_CODE_UNAVAILABLE", "Trạng thái mã chưa hợp lệ; kết quả đã thanh toán được giữ nguyên.");
        }
        const codeExpiresAt = new Date(issued.record.expiresAtMs);
        await operations.auditIssue({ issueId: issued.record.issueId, codeExpiresAt, ipAddress });
        return { sessionId: id, shortedCode: issued.record.shortedCode, codeExpiresAt,
          visitExpiresAt: row.expiresAt, reused: !issued.created };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "CASH_CODE_PERSISTENCE_UNAVAILABLE", "Chưa hoàn tất cấp mã; hãy đối soát và thử lại trên phiên hiện có, không tạo thanh toán mới.");
    }
    if (result.codeExpiresAt.getTime() <= this.now()) {
      throw new AppError(409, "CASH_CODE_EXPIRED_RETRY", "Mã đã hết hạn trước khi trả kết quả; hãy thử cấp mã lại trên cùng phiên.");
    }
    return result;
  }
}
module.exports = new PaymentService();
module.exports.PaymentService = PaymentService;
