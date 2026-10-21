const AppError = require("../utils/app-error");
const INT_MAX = 2147483647;
function fail(message) { throw new AppError(400, "VALIDATION_ERROR", message); }
function id(value) {
  if (!["number", "string"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) || Number(value) > INT_MAX) fail("Mã phải là số nguyên dương hợp lệ.");
  return Number(value);
}
function object(input, allowed) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) {
    fail("Dữ liệu có cấu trúc hoặc trường không được hỗ trợ.");
  }
}
function create(input) {
  object(input, ["name", "description", "items"]);
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 255) fail("Tên tour bắt buộc, tối đa 255 ký tự.");
  if (input.description != null && (typeof input.description !== "string" || Buffer.byteLength(input.description, "utf8") > 65535)) {
    fail("Mô tả tour không hợp lệ hoặc vượt kích thước lưu trữ.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) fail("Tour phải có ít nhất một POI.");
  const poiIds = new Set(), sequences = new Set();
  const items = input.items.map(item => {
    object(item, ["poiId", "sequenceNo"]);
    if (!Number.isInteger(item.poiId) || !Number.isInteger(item.sequenceNo)) fail("Mã POI và thứ tự phải là số nguyên dương.");
    const poiId = id(item.poiId), sequenceNo = id(item.sequenceNo);
    if (poiIds.has(poiId) || sequences.has(sequenceNo)) fail("Không được trùng POI hoặc thứ tự trong cùng tour.");
    poiIds.add(poiId); sequences.add(sequenceNo);
    return { poiId, sequenceNo };
  }).sort((a, b) => a.sequenceNo - b.sequenceNo).map((item, index) => ({ ...item, sequenceNo: index + 1 }));
  return { name: input.name.trim(), description: input.description?.trim() || null, items };
}
function filters(input = {}) {
  object(input, ["page", "limit"]);
  const page = id(input.page ?? 1), limit = id(input.limit ?? 20);
  // Same technical pagination bounds as the existing POI API.
  if (page > 100000 || limit > 100) fail("Phân trang vượt giới hạn.");
  return { page, limit };
}
function update(input) {
  object(input, ["name", "description", "items", "expectedRevision"]);
  if (typeof input.expectedRevision !== "string" || !/^[a-f0-9]{64}$/.test(input.expectedRevision)) {
    fail("Cần expectedRevision hợp lệ từ bản tour đã tải trước khi cập nhật.");
  }
  return { ...create({ name: input.name, description: input.description, items: input.items }), expectedRevision: input.expectedRevision };
}
module.exports = { id, create, update, filters };
