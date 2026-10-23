const AppError = require("../utils/app-error");
const MAX_QUESTION = 1000;
function fail(message) { throw new AppError(400, "INVALID_QUESTION", message); }
// Session and role come from the visitor middleware, never from the body.
function question(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Dữ liệu câu hỏi phải là JSON object.");
  if (Object.keys(input).some(key => key !== "question")) fail("Chỉ hỗ trợ trường question.");
  // Control characters (except tab/newline) are rejected rather than stored or forwarded.
  if (typeof input.question !== "string" || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(input.question)) fail("Câu hỏi không hợp lệ.");
  const value = input.question.trim();
  if (!value || value.length > MAX_QUESTION) fail(`Câu hỏi không được rỗng và tối đa ${MAX_QUESTION} ký tự.`);
  return value;
}
module.exports = { MAX_QUESTION, question };
