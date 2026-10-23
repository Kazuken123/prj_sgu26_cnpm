// Render-only entry point. No worker, provider calls, credential values or raw errors in output.
async function main() {
  if (process.env.STAGING_DEMO_MODE !== "frozen-20261023" || process.env.DB_NAME !== "tcv_demo_review_20261020" ||
      !process.env.DB_HOST?.endsWith(".aivencloud.com") || process.env.DB_SSL_MODE !== "verify_identity") throw new Error("STAGING_CONFIGURATION_REQUIRED");
  const external = new URL(process.env.RENDER_EXTERNAL_URL);
  if (external.protocol !== "https:" || external.username || external.password || external.pathname !== "/" || external.search || external.hash) throw new Error("STAGING_PUBLIC_URL_REQUIRED");
  if (!process.env.MOCK_PAYMENT_BASE_URL) process.env.MOCK_PAYMENT_BASE_URL = external.origin;
  if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = external.origin;
  require("../config/auth").getAuthConfig();
  const { StagingService } = require("../services/staging.service");
  console.log(JSON.stringify({ stagingRuntime: await new StagingService().prepareRuntime(), worker: "DISABLED_FROZEN_DEMO" }));
  if (process.env.BOOTSTRAP_ADMIN_PASSWORD) await require("../services/auth.service").bootstrapAdmin({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, fullName: "Admin Staging Demo",
  });
  const app = require("../server");
  app.listen(process.env.PORT || 3000, () => console.log("STAGING_HTTP_STARTED"));
}
if (require.main === module) main().catch(async () => {
  console.error("STAGING_START_FAILED_STOP_AND_INSPECT"); process.exitCode = 1;
  try { await require("../config/database").end(); } catch { /* Configuration may have failed before a pool existed. */ }
});
module.exports = { main };
