const AppError = require("../utils/app-error");
const CATEGORIES = ["ANIMAL", "PLANT", "HERITAGE", "AMENITY"];
function fail(message) { throw new AppError(400, "VALIDATION_ERROR", message); }
function id(value) {
  if ((typeof value !== "number" && typeof value !== "string") || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail("Mã phải là số nguyên dương.");
  return Number(value);
}
function text(value, label, max, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) fail(`${label} không hợp lệ (tối đa ${max} ký tự).`);
  return value.trim() || null;
}
function number(value, label, min, max, integer = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) fail(`${label} không hợp lệ.`);
  return value;
}
function poi(input, update = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Dữ liệu POI phải là JSON object.");
  const allowed = ["name", "category", "conservationStatus", "activityHours", "latitude", "longitude", "triggerRadius", "avatarUrl", "displayOrder", "status", "description", "audioScript", "expectedVersion"];
  if (Object.keys(input).some(key => !allowed.includes(key))) fail("Có trường không được hỗ trợ.");
  if (update && input.category == null) fail("Cần xác nhận phân loại khi cập nhật POI.");
  const category = input.category ?? "ANIMAL";
  if (!CATEGORIES.includes(category)) fail("Phân loại POI không hợp lệ.");
  const status = input.status ?? "INACTIVE";
  if (!["ACTIVE", "INACTIVE"].includes(status)) fail("Trạng thái POI không hợp lệ.");
  const avatarUrl = text(input.avatarUrl, "Đường dẫn ảnh", 500);
  if (avatarUrl && (!/^https?:\/\//i.test(avatarUrl) && !/^\/(?!\/)[^\\]*$/.test(avatarUrl))) fail("Ảnh phải dùng URL http/https hoặc đường dẫn bắt đầu bằng /.");
  if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
    try { const url = new URL(avatarUrl); if (url.username || url.password) fail("URL ảnh không được chứa tài khoản."); }
    catch { fail("Đường dẫn ảnh không hợp lệ."); }
  }
  return {
    name: text(input.name, "Tên", 255, true), category,
    conservationStatus: text(input.conservationStatus, "Tình trạng bảo tồn", 100),
    activityHours: text(input.activityHours, "Khung giờ hoạt động", 100),
    latitude: number(input.latitude, "Vĩ độ", -90, 90), longitude: number(input.longitude, "Kinh độ", -180, 180),
    triggerRadius: number(input.triggerRadius ?? 30, "Bán kính", 1, 2147483647, true),
    avatarUrl, displayOrder: number(input.displayOrder ?? 0, "Thứ tự", 0, 2147483647, true), status,
    description: text(input.description, "Nội dung tiếng Việt", 6000, true),
    audioScript: text(input.audioScript, "Kịch bản đọc tiếng Việt", 6000, true),
    expectedVersion: update ? id(input.expectedVersion) : undefined,
  };
}
function filters(input = {}) {
  const page = id(input.page ?? 1), limit = id(input.limit ?? 20);
  if (limit > 100 || page > 100000) fail("Phân trang vượt giới hạn.");
  if (input.category && !CATEGORIES.includes(input.category)) fail("Phân loại POI không hợp lệ.");
  if (input.status && !["ACTIVE", "INACTIVE"].includes(input.status)) fail("Trạng thái POI không hợp lệ.");
  return { page, limit, category: input.category || null, status: input.status || null };
}
module.exports = { id, poi, filters };
