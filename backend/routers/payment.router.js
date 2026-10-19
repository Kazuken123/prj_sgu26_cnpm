const express = require("express");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createPaymentRouter(paymentService) {
  const router = express.Router();
  router.post("/", async (req, res, next) => {
    try {
      const result = await paymentService.initialize(req.body, req.get("Idempotency-Key"));
      res.set("Cache-Control", "no-store").status(result.created ? 201 : 200).json({ data: result.data });
    } catch (error) { next(error); }
  });
  router.get("/sessions/:sessionId", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.status(req.params.sessionId, req.ip) }); }
    catch (error) { next(error); }
  });
  return router;
}
function createStaffPaymentRouter(authService, paymentService) {
  const router = express.Router();
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/sessions/:sessionId", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.lookupCash(req.user, req.params.sessionId) }); }
    catch (error) { next(error); }
  });
  router.post("/", async (req, res, next) => {
    try {
      const result = await paymentService.initialize(req.body, req.get("Idempotency-Key"), req.user);
      res.set("Cache-Control", "no-store").status(result.created ? 201 : 200).json({ data: result.data });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createPaymentRouter, createStaffPaymentRouter };
