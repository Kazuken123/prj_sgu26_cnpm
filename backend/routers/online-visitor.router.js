const express = require("express");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createOnlineHeartbeatRouter(service) {
  const router = express.Router();
  router.post("/heartbeat", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await service.heartbeat(req.body, req.ip) }); } catch (error) { next(error); }
  });
  return router;
}
function createOnlineVisitorAdminRouter(authService, service) {
  const router = express.Router();
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("ADMIN"));
  router.get("/", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await service.summary(req.user, req.query) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createOnlineHeartbeatRouter, createOnlineVisitorAdminRouter };
