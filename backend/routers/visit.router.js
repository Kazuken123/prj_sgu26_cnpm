const express = require("express");
const { createVisitorMiddleware } = require("../middlewares/visitor.middleware");

function createVisitRouter(paymentService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(createVisitorMiddleware(paymentService));
  router.get("/me", (req, res) => res.json({ data: req.visit }));
  return router;
}
module.exports = { createVisitRouter };
