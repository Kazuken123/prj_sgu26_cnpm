const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultTourService = require("../services/tour.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createTourRouter(authService = defaultAuthService, tourService = defaultTourService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await tourService.list(req.user, req.query) }); }
    catch (error) { next(error); }
  });
  router.get("/:id", async (req, res, next) => {
    try { res.json({ data: await tourService.get(req.user, req.params.id) }); }
    catch (error) { next(error); }
  });
  router.post("/", async (req, res, next) => {
    try { res.status(201).json({ data: await tourService.create(req.user, req.body, { ipAddress: req.ip }) }); }
    catch (error) { next(error); }
  });
  router.put("/:id", async (req, res, next) => {
    try { res.json({ data: await tourService.update(req.user, req.params.id, req.body, { ipAddress: req.ip }) }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createTourRouter };
