const TourStore = require("../stores/tour.store");
const AppError = require("../utils/app-error");
const validation = require("./tour.validation");
const { assertContentEditor } = require("./internal-access");
const { revision, withRevision } = require("./tour-revision");

class TourService {
  constructor(store = new TourStore()) { this.store = store; }
  async list(actor, query) {
    assertContentEditor(actor);
    const filters = validation.filters(query);
    try {
      const result = await this.store.list(filters);
      return { ...result, items: result.items.map(withRevision) };
    }
    catch { throw new AppError(503, "TOURS_UNAVAILABLE", "Chưa thể tải danh sách tour."); }
  }
  async get(actor, rawId) {
    assertContentEditor(actor);
    const id = validation.id(rawId);
    let result;
    try { const row = await this.store.get(id); result = row ? withRevision(row) : undefined; }
    catch { throw new AppError(503, "TOURS_UNAVAILABLE", "Chưa thể tải tour."); }
    if (!result) throw new AppError(404, "TOUR_NOT_FOUND", "Không tìm thấy tour; vui lòng tải lại danh sách.");
    return result;
  }
  async create(actor, input, { ipAddress = null } = {}) {
    assertContentEditor(actor);
    const data = validation.create(input);
    const policyErrors = new Set();
    const policy = error => { policyErrors.add(error); throw error; };
    try {
      const result = await this.store.withCreate(actor.userId ?? actor.user_id, data.items.map(item => item.poiId), async ops => {
        try { assertContentEditor(ops.actor); }
        catch (error) { policy(error); }
        const active = new Set(ops.pois.filter(poi => poi.status === "ACTIVE").map(poi => poi.poiId));
        if (data.items.some(item => !active.has(item.poiId))) {
          policy(new AppError(409, "TOUR_POIS_UNAVAILABLE", "Có POI không tồn tại hoặc đã ngừng hoạt động; vui lòng tải lại trước khi lưu."));
        }
        return ops.persist(data, { action: "CREATE_TOUR", ipAddress,
          details: JSON.stringify({ items: data.items }) });
      });
      return withRevision(result);
    } catch (error) {
      if (policyErrors.has(error)) throw error;
      throw new AppError(503, "TOUR_SAVE_UNAVAILABLE", "Chưa xác nhận lưu tour; tải lại danh sách để đối soát trước khi gửi lại.");
    }
  }
  async update(actor, rawId, input, { ipAddress = null } = {}) {
    assertContentEditor(actor);
    const id = validation.id(rawId), { expectedRevision, ...data } = validation.update(input);
    const policyErrors = new Set();
    const policy = error => { policyErrors.add(error); throw error; };
    try {
      const result = await this.store.withUpdate(actor.userId ?? actor.user_id, id, data.items.map(item => item.poiId), async ops => {
        try { assertContentEditor(ops.actor); }
        catch (error) { policy(error); }
        if (!ops.current) policy(new AppError(404, "TOUR_NOT_FOUND", "Không tìm thấy tour; vui lòng tải lại danh sách."));
        if (revision(ops.current) !== expectedRevision) {
          policy(new AppError(409, "TOUR_REVISION_CONFLICT", "Tour đã thay đổi; tải lại và đối chiếu trước khi lưu. Không tự ghi đè."));
        }
        const active = new Set(ops.pois.filter(poi => poi.status === "ACTIVE").map(poi => poi.poiId));
        if (data.items.some(item => !active.has(item.poiId))) {
          policy(new AppError(409, "TOUR_POIS_UNAVAILABLE", "Có POI không tồn tại hoặc đã ngừng hoạt động; vui lòng tải lại trước khi lưu."));
        }
        return ops.persist(data, { action: "UPDATE_TOUR", ipAddress,
          details: JSON.stringify({ previousRevision: expectedRevision, revision: revision({ ...data, tourId: id }), items: data.items }) });
      });
      return withRevision(result);
    } catch (error) {
      if (policyErrors.has(error)) throw error;
      throw new AppError(503, "TOUR_SAVE_UNAVAILABLE", "Chưa xác nhận cập nhật tour; tải lại chi tiết để đối soát trước khi gửi lại.");
    }
  }
}
module.exports = new TourService();
module.exports.TourService = TourService;
