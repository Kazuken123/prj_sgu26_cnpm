const PoiStore = require("../stores/poi.store");
const AppError = require("../utils/app-error");
const validation = require("./poi.validation");

class PoiService {
  constructor(store = new PoiStore()) { this.store = store; }
  authorize(actor) {
    if (!actor || !Number.isSafeInteger(actor.userId ?? actor.user_id) || (actor.userId ?? actor.user_id) < 1) {
      throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
    }
    if (!["STAFF", "ADMIN"].includes(actor.role) || actor.status !== "ACTIVE" ||
        (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
      throw new AppError(403, "FORBIDDEN", "Không có quyền quản lý POI.");
    }
  }
  async list(actor, query) { this.authorize(actor); return this.store.list(validation.filters(query)); }
  async get(actor, rawId) {
    this.authorize(actor);
    const result = await this.store.get(validation.id(rawId));
    if (!result) throw new AppError(404, "POI_NOT_FOUND", "Không tìm thấy POI.");
    return result;
  }
  async save(actor, rawId, input, { ipAddress = null } = {}) {
    this.authorize(actor);
    const poiId = rawId == null ? null : validation.id(rawId);
    const data = validation.poi(input, poiId !== null);
    return this.store.mutate(actor.userId ?? actor.user_id, poiId, user => this.authorize(user), async ({ current, persist }) => {
      if (poiId !== null && !current) throw new AppError(404, "POI_NOT_FOUND", "Không tìm thấy POI.");
      if (current && current.contentVersion !== data.expectedVersion) {
        throw new AppError(409, "POI_VERSION_CONFLICT", "POI đã thay đổi; tải lại trước khi lưu.");
      }
      const sourceChanged = !current || current.name !== data.name || current.description !== data.description || current.audioScript !== data.audioScript;
      const version = current ? current.contentVersion + Number(sourceChanged) : 1;
      return persist(data, version, sourceChanged, {
        action: current ? "UPDATE_POI" : "CREATE_POI", ipAddress,
        details: JSON.stringify({ sourceChanged, contentVersion: version }),
      });
    });
  }
  async deactivate(actor, rawId, { ipAddress = null } = {}) {
    this.authorize(actor);
    return this.store.deactivate(actor.userId ?? actor.user_id, validation.id(rawId), user => this.authorize(user), ipAddress);
  }
}
module.exports = new PoiService();
module.exports.PoiService = PoiService;
