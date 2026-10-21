const AppError = require("../utils/app-error");
function fail() { throw new AppError(400, "VALIDATION_ERROR", "Cần khoảng UTC hợp lệ: from < to, dạng YYYY-MM-DDTHH:mm:ss[.sss]Z; gửi đủ cả hai hoặc bỏ cả hai để xem 24 giờ gần nhất."); }
function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || value.slice(0, 4) < "1000") fail();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== (value.includes(".") ? value : value.replace("Z", ".000Z"))) fail();
  return date;
}
function filters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !["from", "to"].includes(key))) fail();
  if (input.from === undefined && input.to === undefined) return { from: null, to: null };
  const from = timestamp(input.from), to = timestamp(input.to);
  if (from >= to) fail();
  return { from, to };
}
function windowAt(selected, now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("INVALID_MONITORING_CLOCK");
  return { from: selected.from || new Date(now.getTime() - 86400000), to: selected.to || now };
}
module.exports = { filters, windowAt };
