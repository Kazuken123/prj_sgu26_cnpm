const express = require('express');
const { createAuthMiddleware, requireRole } = require('../middlewares/auth.middleware');
const defaultService = require('../services/operations.service');
function createOperationsRouter(authService, service = defaultService) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(createAuthMiddleware(authService).verifyToken, requireRole('STAFF', 'ADMIN'));
  router.get('/', async (req, res, next) => {
    try { res.json({ data: await service.get(req.user, req.query) }); } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createOperationsRouter };
