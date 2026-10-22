const AppError = require("../utils/app-error");
const { id } = require("./poi.validation");
function fail() { throw new AppError(400, "INVALID_REVIEWED_TRANSLATION", "Cần sourceVersion, name, description và audioScript hợp lệ; chỉ nhập bản EN đã duyệt."); }
function language(value) {
  if (value !== "en") throw new AppError(400, "UNSUPPORTED_MANUAL_LANGUAGE", "Mốc nhập thủ công hiện chỉ hỗ trợ EN; tiếng Việt dùng API nguồn POI.");
  return value;
}
function text(value, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) fail();
  return value.trim();
}
function input(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== 4 || Object.keys(value).some(key => !["sourceVersion", "name", "description", "audioScript"].includes(key)) ||
      !Number.isSafeInteger(value.sourceVersion) || value.sourceVersion < 1 || value.sourceVersion > 2147483647) fail();
  return { sourceVersion: value.sourceVersion, name: text(value.name, 255),
    description: text(value.description, 6000), audioScript: text(value.audioScript, 6000) };
}
module.exports = { id, language, input };
