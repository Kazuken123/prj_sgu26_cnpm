const path = require("node:path");
const { ADDITIONAL_POI_NAMES, SQL_FILE_PATH, loadSqlStatements } = require("../config/additional-pois-input");

function parseArgs(argv) {
  if (argv.some(arg => !["--apply", "--dry-run", "--list", "-l"].includes(arg))) throw new Error("ADDITIONAL_SEED_INVALID_ARGUMENT");
  const list = argv.includes("--list") || argv.includes("-l");
  const dryRun = argv.includes("--dry-run") || (!argv.includes("--apply") && !list);
  return { apply: argv.includes("--apply") && !dryRun && !list, dryRun, list };
}

async function runSeed(pool, options, dependencies = {}) {
  const Store = require("../stores/additional-pois-seed.store");
  const { AdditionalPoisSeedService } = require("../services/additional-pois-seed.service");
  const LocalMedia = require("../adapters/local-media");
  const media = dependencies.media || new LocalMedia({ root: process.env.MEDIA_ROOT || path.resolve(__dirname, "../../data/demo/additional-media") });
  return new AdditionalPoisSeedService(new Store(pool, dependencies.target || process.env.DB_NAME), media, dependencies).run(options);
}

async function main() {
  let pool;
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.list) {
      console.log(JSON.stringify({ outcome: "POI_LIST", total: 8, pois: ADDITIONAL_POI_NAMES, sqlFile: SQL_FILE_PATH }, null, 2));
      return;
    }
    require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
    if (!process.env.DB_HOST?.endsWith(".aivencloud.com") || process.env.DB_NAME !== "tcv_demo_review_20261020" || process.env.DB_SSL_MODE !== "verify_identity") throw new Error("ADDITIONAL_AIVEN_STAGING_CONFIGURATION_REQUIRED");
    if (options.apply && process.env.SEED_TARGET_CONFIRM !== process.env.DB_NAME) {
      throw new Error("ADDITIONAL_SEED_TARGET_CONFIRMATION_REQUIRED");
    }
    pool = require("../config/database");
    console.log(JSON.stringify(await runSeed(pool, options), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ outcome: "FAILED", error: /^ADDITIONAL_/.test(error.message || "") ? error.message : "ADDITIONAL_SEED_FAILED_STOP_AND_INSPECT" }));
    process.exitCode = 1;
  } finally { if (pool) await pool.end(); }
}

if (require.main === module) main();
module.exports = { ADDITIONAL_POI_NAMES, SQL_FILE_PATH, parseArgs, loadSqlStatements, runSeed };
