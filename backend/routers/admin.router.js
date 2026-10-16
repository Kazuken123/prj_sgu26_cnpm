const express = require("express");
const defaultAuthService = require("../services/auth.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");

function createAdminRouter(authService = defaultAuthService) {
  const router = express.Router();
  const { verifyToken } = createAuthMiddleware(authService);
  router.post("/staff", verifyToken, requireRole("ADMIN"), async (req, res, next) => {
    try {
      const data = await authService.createStaff(req.user.userId, req.body, { ipAddress: req.ip });
      res.status(201).json({ message: "Đã tạo tài khoản nhân viên.", data });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createAdminRouter };
