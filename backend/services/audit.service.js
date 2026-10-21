const AuditLogStore = require("../stores/audit_log.store");
const AppError = require("../utils/app-error");
const { ACTIONS, filters } = require("./audit.validation");
const { project } = require("./audit-details");
class AuditService {
  constructor(store = new AuditLogStore()) { this.store = store; }
  async list(actor, query) {
    if (!actor || !Number.isSafeInteger(actor.userId) || actor.userId < 1) throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
    if (actor.role !== "ADMIN" || actor.status !== "ACTIVE" || (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
      throw new AppError(403, "FORBIDDEN", "Chỉ ADMIN được xem nhật ký.");
    }
    const selected = filters(query);
    try {
      const result = await this.store.list(selected);
      return { ...result, items: result.items.map(({ details, ...row }) => ({ ...row, ...project(row.action, details) })),
        filters: { from: selected.from, to: selected.to, action: selected.action }, actions: [...ACTIONS] };
    } catch { throw new AppError(503, "AUDIT_LOGS_UNAVAILABLE", "Chưa thể tải nhật ký; giữ bộ lọc và thử lại."); }
  }
}
module.exports = new AuditService();
module.exports.AuditService = AuditService;
