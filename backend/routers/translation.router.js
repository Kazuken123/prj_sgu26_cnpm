const express = require("express");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createTranslationRouter(authService, translationService) {
  const router = express.Router();
  router.use("/:poiId/translations/:languageCode", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); },
    createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/:poiId/translations/:languageCode", async (req, res, next) => {
    try { res.json({ data: await translationService.get(req.user, req.params.poiId, req.params.languageCode) }); }
    catch (error) { next(error); }
  });
  router.put("/:poiId/translations/:languageCode", async (req, res, next) => {
    try { res.json({ data: await translationService.importReviewed(req.user, req.params.poiId, req.params.languageCode, req.body, { ipAddress: req.ip }) }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createTranslationRouter };
