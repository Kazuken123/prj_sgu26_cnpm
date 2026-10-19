const express = require("express");
const defaultAuthService = require("../services/auth.service");
const { createAuthMiddleware } = require("../middlewares/auth.middleware");

function createAuthRouter(authService = defaultAuthService) {
  const router = express.Router();
  const { verifyToken } = createAuthMiddleware(authService);
  router.post("/login", async (req, res, next) => {
    try { res.json({ message: "Đăng nhập thành công!", data: await authService.login(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/refresh", async (req, res, next) => {
    try { res.json({ message: "Làm mới phiên thành công!", data: await authService.refresh(req.body) }); }
    catch (error) { next(error); }
  });
  router.post("/logout", async (req, res, next) => {
    try {
      await authService.logout(req.body, { authorization: req.headers.authorization });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  router.get("/me", verifyToken, (req, res) => {
    const { userId, ...user } = req.user;
    res.json({ data: user });
  });
  return router;
}
module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
