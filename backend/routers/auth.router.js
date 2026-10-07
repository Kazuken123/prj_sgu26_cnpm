const express = require("express");
const defaultAuthService = require("../services/auth.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");

function createAuthRouter(authService = defaultAuthService) {
  const router = express.Router();
  const { verifyToken } = createAuthMiddleware(authService);
  router.post("/register", async (req, res, next) => {
    try { res.status(201).json({ message: "Đăng ký thành công!", data: await authService.register(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/register-owner", async (req, res, next) => {
    try { res.status(201).json({ message: "Đăng ký chủ quán thành công! Vui lòng chờ admin duyệt.", data: await authService.registerOwner(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/login", async (req, res, next) => {
    try { res.json({ message: "Đăng nhập thành công!", data: await authService.login(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/refresh", async (req, res, next) => {
    try { res.json({ message: "Làm mới phiên thành công!", data: await authService.refresh(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/logout", async (req, res, next) => {
    try { await authService.logout(req.body); res.status(204).end(); }
    catch (error) { next(error); }
  });
  router.get("/me", verifyToken, (req, res) => {
    const { userId, ...user } = req.user;
    res.json({ data: user });
  });
  router.get("/owner-request/status", verifyToken, requireRole("OWNER"), async (req, res, next) => {
    try { res.json({ message: "Lấy trạng thái thành công!", data: await authService.getOwnerRequestStatus(req.user.userId) }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
