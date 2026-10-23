const AppError = require("../utils/app-error");
// The global JSON body limit (32 KB, server.js) caps content before this check;
// 20 000 characters keeps typical Vietnamese text within that limit.
const LIMITS = Object.freeze({ title: 255, content: 20000, source: 1000 });
function fail(message) { throw new AppError(400, "VALIDATION_ERROR", message); }
function id(value) {
  if ((typeof value !== "number" && typeof value !== "string") || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail("Mã phải là số nguyên dương.");
  return Number(value);
}
function text(value, label, max, required) {
  if (value == null && !required) return null;
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    fail(`${label} ${required ? "là bắt buộc và " : ""}tối đa ${max} ký tự.`);
  }
  return value.trim() || null;
}
function document(input, update = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Dữ liệu tài liệu phải là JSON object.");
  const allowed = ["title", "content", "source", ...(update ? ["expectedVersion"] : [])];
  if (Object.keys(input).some(key => !allowed.includes(key))) fail("Có trường không được hỗ trợ.");
  if (update && (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1)) fail("Cần expectedVersion là số nguyên dương khi sửa tài liệu.");
  return {
    title: text(input.title, "Tiêu đề", LIMITS.title, true),
    content: text(input.content, "Nội dung", LIMITS.content, true),
    // UC-15 step 5 recommends a source; E2 and the schema only require title/content.
    source: text(input.source, "Nguồn", LIMITS.source, false),
    ...(update ? { expectedVersion: input.expectedVersion } : {}),
  };
}
function filters(query = {}) {
  if (Object.keys(query).some(key => !["status", "page", "limit"].includes(key))) fail("Có tham số lọc không được hỗ trợ.");
  if (query.status !== undefined && !["ACTIVE", "INACTIVE"].includes(query.status)) fail("Trạng thái không hợp lệ.");
  const positive = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max) fail("Phân trang không hợp lệ.");
    return Number(value);
  };
  return { status: query.status ?? null, page: positive(query.page, 1, 100000), limit: positive(query.limit, 20, 100) };
}
module.exports = { LIMITS, id, document, filters };
