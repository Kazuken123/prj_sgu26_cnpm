const express = require("express");
const path = require("node:path");
const fs = require("node:fs");

// Publish only compiled assets, never source files, environment files or tests.
function createFrontendRouter(distDirectory) {
  const router = express.Router();
  const indexFile = path.join(distDirectory, "index.html");
  const staticFiles = express.static(distDirectory, { index: false, dotfiles: "deny" });
  router.use((req, res, next) => {
    if (/^\/(api|health)(\/|$)/.test(req.path)) return next("router");
    let decodedPath;
    try { decodedPath = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (/(^|\/)\./.test(decodedPath)) return next("router");
    next();
  });
  router.use("/demo", staticFiles);
  router.use(staticFiles);
  router.get(/.*/, (req, res, next) => {
    if (!req.accepts("html") || path.extname(req.path)) return next();
    if (!fs.existsSync(indexFile)) {
      return res.status(503).json({ code: "FRONTEND_NOT_BUILT", error: "Run npm ci and npm run build in frontend before starting the web application." });
    }
    res.set("Cache-Control", "no-cache");
    res.sendFile(indexFile);
  });
  return router;
}

module.exports = { createFrontendRouter };
