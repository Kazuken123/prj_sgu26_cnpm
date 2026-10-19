const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultPoiService = require("../services/poi.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createPoiRouter(authService = defaultAuthService, poiService = defaultPoiService) {
  const router = express.Router();
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await poiService.list(req.user, req.query) }); } catch (error) { next(error); }
  });
  router.get("/:id", async (req, res, next) => {
    try { res.json({ data: await poiService.get(req.user, req.params.id) }); } catch (error) { next(error); }
  });
  router.post("/", async (req, res, next) => {
    try { res.status(201).json({ data: await poiService.save(req.user, null, req.body, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  router.put("/:id", async (req, res, next) => {
    try { res.json({ data: await poiService.save(req.user, req.params.id, req.body, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  router.post("/:id/deactivate", async (req, res, next) => {
    try { res.json({ data: await poiService.deactivate(req.user, req.params.id, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createPoiRouter };
