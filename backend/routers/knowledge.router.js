const express = require("express");
const defaultAuthService = require("../services/auth.service");
const defaultKnowledgeService = require("../services/knowledge.service");
const { createAuthMiddleware, requireRole } = require("../middlewares/auth.middleware");
// Proposed contract (not yet mounted in server.js): /api/admin/knowledge-documents
function createKnowledgeRouter(authService = defaultAuthService, knowledgeService = defaultKnowledgeService) {
  const router = express.Router();
  router.use(createAuthMiddleware(authService).verifyToken, requireRole("STAFF", "ADMIN"));
  router.get("/", async (req, res, next) => {
    try { res.json({ data: await knowledgeService.list(req.user, req.query) }); } catch (error) { next(error); }
  });
  router.get("/:id", async (req, res, next) => {
    try { res.json({ data: await knowledgeService.get(req.user, req.params.id) }); } catch (error) { next(error); }
  });
  router.post("/", async (req, res, next) => {
    try { res.status(201).json({ data: await knowledgeService.create(req.user, req.body, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  router.put("/:id", async (req, res, next) => {
    try { res.json({ data: await knowledgeService.update(req.user, req.params.id, req.body, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  router.post("/:id/deactivate", async (req, res, next) => {
    try { res.json({ data: await knowledgeService.deactivate(req.user, req.params.id, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  router.post("/:id/reprocess", async (req, res, next) => {
    try { res.json({ data: await knowledgeService.reprocess(req.user, req.params.id, { ipAddress: req.ip }) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createKnowledgeRouter };
