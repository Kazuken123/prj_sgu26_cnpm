const AppError = require("../utils/app-error");
const { id } = require("./poi.validation");
const STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];
function fail(message) { throw new AppError(400, "VALIDATION_ERROR", message); }
function filters(input = {}) {
  const page = id(input.page ?? 1), limit = id(input.limit ?? 20);
  if (page > 100000 || limit > 100) fail("Phân trang vượt giới hạn.");
  if (input.status !== undefined && !STATUSES.includes(input.status)) fail("Trạng thái tác vụ không hợp lệ.");
  if (input.languageCode !== undefined && (typeof input.languageCode !== "string" || !/^[a-zA-Z][a-zA-Z0-9-]{0,9}$/.test(input.languageCode))) {
    fail("Mã ngôn ngữ không hợp lệ.");
  }
  if (input.currentOnly !== undefined && ![true, false, "true", "false"].includes(input.currentOnly)) fail("currentOnly phải là true hoặc false.");
  return { page, limit, poiId: input.poiId === undefined ? null : id(input.poiId), status: input.status ?? null,
    languageCode: input.languageCode ?? null, currentOnly: input.currentOnly === true || input.currentOnly === "true" };
}
function retryBody(input) {
  if (input === undefined) return;
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
    fail("Thử lại tác vụ không nhận dữ liệu thay đổi trạng thái hoặc nội dung.");
  }
}
module.exports = { id, filters, retryBody };
