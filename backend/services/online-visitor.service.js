const { createHash } = require("node:crypto");
const RedisStore = require("../stores/redis.store");
const AppError = require("../utils/app-error");
const WINDOW_SECONDS = 120;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash = value => createHash("sha256").update(value).digest("hex");
class OnlineVisitorService {
  constructor(store = new RedisStore()) { this.store = store; }
  async heartbeat(input, ipAddress) {
    if (!input || Array.isArray(input) || typeof input !== "object" || Object.keys(input).length !== 1 || typeof input.visitorId !== "string" || !uuid.test(input.visitorId)) {
      throw new AppError(400, "INVALID_ONLINE_HEARTBEAT", "Thông tin phiên truy cập không hợp lệ.");
    }
    if (typeof ipAddress !== "string" || !ipAddress || ipAddress.length > 100) {
      throw new AppError(503, "ONLINE_VISITORS_UNAVAILABLE", "Chưa ghi nhận được hoạt động truy cập.");
    }
    let result;
    try { result = await this.store.touchOnlineVisitor(hash(input.visitorId.toLowerCase()), hash(ipAddress), WINDOW_SECONDS); }
    catch { throw new AppError(503, "ONLINE_VISITORS_UNAVAILABLE", "Chưa ghi nhận được hoạt động truy cập."); }
    if (result === "RATE_LIMITED") throw new AppError(429, "ONLINE_HEARTBEAT_RATE_LIMITED", "Vui lòng thử lại sau.");
    if (result !== "ACCEPTED") throw new AppError(503, "ONLINE_VISITORS_UNAVAILABLE", "Chưa ghi nhận được hoạt động truy cập.");
    return { accepted: true, windowSeconds: WINDOW_SECONDS };
  }
  async summary(actor, query = {}) {
    if (!actor || !Number.isSafeInteger(actor.userId) || actor.userId < 1) throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
    if (actor.role !== "ADMIN" || actor.status !== "ACTIVE" || (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
      throw new AppError(403, "FORBIDDEN", "Chỉ ADMIN được xem thống kê.");
    }
    if (!query || Array.isArray(query) || typeof query !== "object" || Object.keys(query).length) throw new AppError(400, "VALIDATION_ERROR", "Thống kê online không nhận bộ lọc.");
    try {
      const row = await this.store.countOnlineVisitors(WINDOW_SECONDS);
      if (!Number.isSafeInteger(row.count) || row.count < 0 || row.count > 10000 || !Number.isSafeInteger(row.nowMs) || !Number.isFinite(new Date(row.nowMs).getTime())) throw new Error();
      return { count: row.count, generatedAt: new Date(row.nowMs).toISOString(), windowSeconds: WINDOW_SECONDS, measurement: "BROWSER_SESSIONS" };
    } catch { throw new AppError(503, "ONLINE_VISITORS_UNAVAILABLE", "Chưa cập nhật được số khách online."); }
  }
}
module.exports = { OnlineVisitorService, WINDOW_SECONDS };
