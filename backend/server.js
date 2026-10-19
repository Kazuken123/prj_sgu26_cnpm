const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });
const { createAuthRouter } = require("./routers/auth.router");
const { createAdminRouter } = require("./routers/admin.router");
const { createPoiRouter } = require("./routers/poi.router");
const defaultPoiService = require("./services/poi.service");
const defaultAuthService = require("./services/auth.service");
const defaultHealthService = require("./services/health.service");
const errorHandler = require("./middlewares/error.middleware");
const { getAuthConfig } = require("./config/auth");
const path = require("node:path");

function createApp({ authService = defaultAuthService, healthService = defaultHealthService, poiService = defaultPoiService } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const origins = (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500").split(",").map(value => value.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/auth", createAuthRouter(authService));
  app.use("/api/admin", createAdminRouter(authService));
  app.use("/api/admin/pois", createPoiRouter(authService, poiService));
  app.get("/", (req, res) => res.send("API Hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn đang hoạt động."));
  app.get("/health", (req, res) => res.json({ status: "ok", service: "food-tour-api", timestamp: new Date().toISOString() }));
  app.get("/health/ready", async (req, res, next) => {
    try { res.json(await healthService.ready()); } catch (error) { next(error); }
  });
  app.use("/demo", express.static(path.join(__dirname, "../frontend")));
  app.use(errorHandler);
  return app;
}
const app = createApp();
if (require.main === module) {
  try {
    getAuthConfig();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Backend đang chạy tại http://localhost:${port}`));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = app;
module.exports.createApp = createApp;
