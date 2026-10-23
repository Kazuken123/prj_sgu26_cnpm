const express = require("express");
const defaultPaymentService = require("../services/payment.service");
const defaultChatService = require("../services/chat.service");
const { createVisitorMiddleware } = require("../middlewares/visitor.middleware");
// Proposed contract (not yet mounted in server.js): POST /api/chat/questions
function createChatRouter(paymentService = defaultPaymentService, chatService = defaultChatService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(createVisitorMiddleware(paymentService));
  router.post("/questions", async (req, res, next) => {
    try { res.json({ data: await chatService.ask(req.visit, req.body, req.ip) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createChatRouter };
