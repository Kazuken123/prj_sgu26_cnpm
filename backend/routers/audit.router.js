const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultAuditService = require("../services/audit.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createAuditRouter(authService = defaultAuthService, auditService = defaultAuditService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await auditService.list(req.user, req.query) }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createAuditRouter };
