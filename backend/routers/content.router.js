const express = require("express");
const { createVisitorMiddleware } = require("../middlewares/visitor.middleware");
function createContentRouter(paymentService, contentService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/map", async (req, res, next) => {
    try {
      const data = await contentService.getMap(req.query);
      res.set("Content-Type", "application/json; charset=utf-8").end(JSON.stringify({ data }));
    } catch (error) { next(error); }
  });
  router.use(createVisitorMiddleware(paymentService));
  router.get("/bundle", async (req, res, next) => {
    try {
      const data = await contentService.getBundle(req.visit, req.query, req.headers.authorization.slice(7));
      // A grant must remain a full response, never an automatic ETag/304 cache hit.
      res.set("Content-Type", "application/json; charset=utf-8").end(JSON.stringify({ data }));
    }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createContentRouter };
