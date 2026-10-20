const express = require("express");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
function createPaymentRouter(paymentService) {
  const router = express.Router();
  router.post("/online-checkout", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try {
      const result = await paymentService.initializeOnline(req.body, req.get("Idempotency-Key"));
      res.status(result.created ? 201 : 200).json({ data: result.data });
    } catch (error) { next(error); }
  });
  router.get("/mock-checkout/:paymentRef", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.mockCheckout(req.params.paymentRef) }); }
    catch (error) { next(error); }
  });
  router.post("/sessions/:sessionId/exchange-cash-code", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.exchangeCashCode(req.params.sessionId, req.body, req.ip) }); }
    catch (error) { next(error); }
  });
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
  router.post("/sessions/:sessionId/confirm-cash", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.confirmCash(req.user, req.params.sessionId, req.body, { ipAddress: req.ip }) }); }
    catch (error) { next(error); }
  });
  router.post("/sessions/:sessionId/cash-code", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ data: await paymentService.issueCashCode(req.user, req.params.sessionId, req.body, { ipAddress: req.ip }) }); }
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
