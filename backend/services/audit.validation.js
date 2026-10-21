const AppError = require("../utils/app-error");
const ACTIONS = Object.freeze([
  "CREATE_STAFF", "CREATE_POI", "UPDATE_POI", "DEACTIVATE_POI", "CREATE_TOUR", "UPDATE_TOUR",
  "CREATE_PENDING_PAYMENT", "CONFIRM_CASH_PAYMENT", "ISSUE_CASH_CODE", "PREPARE_ONLINE_CHECKOUT",
  "ONLINE_CHECKOUT_READY", "CONFIRM_ONLINE_PAYMENT", "FAIL_ONLINE_PAYMENT", "ISSUE_VISITOR_TOKEN",
  "RETRY_CONTENT_JOB", "CLAIM_CONTENT_JOB", "FAIL_CONTENT_JOB", "RECOVER_CONTENT_JOB",
  "PREPARE_TRANSLATION", "COMPLETE_CONTENT_JOB", "SEED_APPROVED_DEMO",
]);
function fail() { throw new AppError(400, "VALIDATION_ERROR", "Bộ lọc nhật ký không hợp lệ; dùng thời gian UTC YYYY-MM-DDTHH:mm:ssZ và hành động được hỗ trợ."); }
function timestamp(value) {
  if (value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) ||
      value.slice(0, 4) < "1000" || !Number.isFinite(Date.parse(value))) fail();
  if (new Date(value).toISOString() !== value.replace("Z", ".000Z")) fail();
  return value;
}
function positive(value, fallback, max) {
  if (value === undefined) return fallback;
  if (!["string", "number"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) || Number(value) > max) fail();
  return Number(value);
}
function filters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => !["from", "to", "action", "page", "limit"].includes(key))) fail();
  const from = timestamp(input.from), to = timestamp(input.to);
  if (from && to && from > to) fail();
  if (input.action !== undefined && !ACTIONS.includes(input.action)) fail();
  return { from, to, action: input.action ?? null, page: positive(input.page, 1, 100000), limit: positive(input.limit, 20, 100) };
}
module.exports = { ACTIONS, filters };
