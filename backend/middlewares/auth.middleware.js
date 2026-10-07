const defaultAuthService = require("../services/auth.service");
const AppError = require("../utils/app-error");

function createAuthMiddleware(authService = defaultAuthService) {
  async function verifyToken(req, res, next) {
    const header = req.headers.authorization;
    if (typeof header !== "string" || !/^Bearer [^\s]+$/.test(header)) {
      return next(new AppError(401, "MISSING_ACCESS_TOKEN", "Thiếu token xác thực."));
    }
    try { req.user = await authService.authenticate(header.slice(7)); next(); }
    catch (error) { next(error); }
  }
  async function requireApprovedOwner(req, res, next) {
    try { await authService.assertApprovedOwner(req.user); next(); }
    catch (error) { next(error); }
  }
  return { verifyToken, requireApprovedOwner };
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, "MISSING_ACCESS_TOKEN", "Thiếu token xác thực."));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Bạn không có quyền thực hiện hành động này."));
    }
    next();
  };
}
module.exports = { ...createAuthMiddleware(), requireRole, createAuthMiddleware };
