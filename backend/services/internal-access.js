const AppError = require("../utils/app-error");
function assertContentEditor(actor) {
  if (!actor || !Number.isSafeInteger(actor.userId ?? actor.user_id) || (actor.userId ?? actor.user_id) < 1) {
    throw new AppError(401, "MISSING_ACCESS_TOKEN", "Chưa xác thực tài khoản nội bộ.");
  }
  if (!["STAFF", "ADMIN"].includes(actor.role) || actor.status !== "ACTIVE" ||
      (actor.locked_until && new Date(actor.locked_until).getTime() > Date.now())) {
    throw new AppError(403, "FORBIDDEN", "Không có quyền quản lý nội dung.");
  }
}
module.exports = { assertContentEditor };
