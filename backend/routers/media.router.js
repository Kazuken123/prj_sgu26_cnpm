const express = require("express");
const { createVisitorMiddleware } = require("../middlewares/visitor.middleware");
function createMediaRouter(paymentService, mediaService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); next(); });
  router.use(createVisitorMiddleware(paymentService));
  router.get("/audio/:key", async (req, res, next) => {
    try {
      const bytes = await mediaService.getAudio(req.params.key, req.visit);
      res.type("audio/wav").set("Content-Disposition", 'inline; filename="' + req.params.key + '"').send(bytes);
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createMediaRouter };
