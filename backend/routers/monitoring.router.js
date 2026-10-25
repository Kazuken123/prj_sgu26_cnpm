const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultMonitoringService = require("../services/monitoring.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createMonitoringRouter(authService = defaultAuthService, monitoringService = defaultMonitoringService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await monitoringService.get(req.user, req.query) }); }
    catch (error) { next(error); }
  });
  return router;
}
function createPublicVisitSummaryRouter(monitoringService = defaultMonitoringService) {
  const router = express.Router();
  router.get("/summary", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await monitoringService.getPublicVisitSummary(req.query) }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createMonitoringRouter, createPublicVisitSummaryRouter };
