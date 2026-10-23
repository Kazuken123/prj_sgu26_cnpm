function parseOptions(args) {
  if (args.length !== 3 || args[0] !== "--database" || args[1] !== "tcv_demo_review_20261020" || args[2] !== "--apply") throw new Error("STAGING_SEED_EXPLICIT_TARGET_REQUIRED");
  return args[1];
}
async function main() {
  const target = parseOptions(process.argv.slice(2));
  if (process.env.DB_NAME !== target || process.env.STAGING_DEMO_MODE !== "frozen-20261023" ||
      !process.env.DB_HOST?.endsWith(".aivencloud.com") || process.env.DB_SSL_MODE !== "verify_identity") throw new Error("STAGING_CONFIGURATION_REQUIRED");
  const { StagingService } = require("../services/staging.service");
  console.log(JSON.stringify(await new StagingService().ensure()));
}
if (require.main === module) main().catch(() => { console.error("STAGING_SEED_STOPPED_NO_RESET"); process.exitCode = 1; })
  .finally(async () => { try { await require("../config/database").end(); } catch { /* No pool if configuration failed. */ } });
module.exports = { parseOptions, main };
