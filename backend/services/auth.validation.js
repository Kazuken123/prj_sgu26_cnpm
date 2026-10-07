const AppError = require("../utils/app-error");

function fail(message) {
  throw new AppError(400, "VALIDATION_ERROR", message);
}
function objectInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Dữ liệu phải là một JSON object.");
}
function text(value, label, max, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    fail(`${label} phải là chuỗi không rỗng, tối đa ${max} ký tự.`);
  }
  return value.trim();
}
function email(value) {
  const normalized = text(value, "Email", 255, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail("Email không hợp lệ.");
  return normalized;
}
function password(value) {
  if (typeof value !== "string" || value.length < 8 || Buffer.byteLength(value, "utf8") > 72) {
    fail("Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 bytes UTF-8.");
  }
  return value;
}
function phone(value, required) {
  const normalized = text(value, "Số điện thoại", 20, required);
  if (normalized !== null && (!/^\+?[\d ()-]+$/.test(normalized) ||
      normalized.replace(/\D/g, "").length < 8 || normalized.replace(/\D/g, "").length > 15)) {
    fail("Số điện thoại phải có từ 8 đến 15 chữ số.");
  }
  return normalized;
}
function registration(input, owner = false) {
  objectInput(input);
  const user = {
    email: email(input.email),
    password: password(input.password),
    fullName: text(input.fullName, "Họ tên", 100),
    phoneNumber: phone(input.phoneNumber, owner),
  };
  if (owner) {
    user.restaurantName = text(input.restaurantName, "Tên quán", 255, true);
    user.restaurantAddress = text(input.restaurantAddress, "Địa chỉ quán", 255, true);
  }
  return user;
}
function login(input) {
  objectInput(input);
  return { email: email(input.email), password: password(input.password) };
}
function refreshToken(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail("Refresh token không hợp lệ.");
  return value;
}
module.exports = { registration, login, refreshToken };
