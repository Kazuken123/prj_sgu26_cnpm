const AppError = require("../utils/app-error");

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ code: "INVALID_JSON", error: "JSON không hợp lệ." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ code: "BODY_TOO_LARGE", error: "Dữ liệu vượt quá dung lượng cho phép." });
  }
  if (error instanceof AppError) return res.status(error.status).json({ code: error.code, error: error.message });
  // Avoid echoing SQL, credentials, token values or stack traces to clients/logs.
  console.error("Request failed:", error.code || error.name || "UNKNOWN_ERROR");
  res.status(500).json({ code: "INTERNAL_ERROR", error: "Máy chủ gặp lỗi. Vui lòng thử lại sau." });
}
module.exports = errorHandler;
