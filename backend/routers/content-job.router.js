const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultContentJobService = require("../services/content-job.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createContentJobRouter(authService = defaultAuthService, contentJobService = defaultContentJobService) {
  const router = express.Router();
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await contentJobService.list(req.user, req.query) }); } catch (error) { next(error); }
  });
  router.get("/:id", async (req, res, next) => {
    try { res.json({ data: await contentJobService.get(req.user, req.params.id) }); } catch (error) { next(error); }
  });
  router.post("/:id/retry", async (req, res, next) => {
    try { res.status(202).json({ message: "Đã tiếp nhận yêu cầu thử lại; nội dung chưa được xác nhận hoàn tất.",
      data: await contentJobService.retry(req.user, req.params.id, req.body, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createContentJobRouter };
