// Explicit operator entry point. No HTTP exposure or implicit database target.
function parseOptions(args) {
  if (args[0] !== "--database" || args[1] !== "tcv_demo_review_20261020" ||
      !((args.length === 3 && args[2] === "--plan") || (args.length === 5 && args[2] === "--apply" && args[3] === "--expected" && /^[a-f0-9]{64}$/.test(args[4])))) throw new Error("POI_LOCATION_EXPLICIT_TARGET_AND_MODE_REQUIRED");
  return { database: args[1], apply: args[2] === "--apply", expectedHash: args[4] };
}

async function main() {
  let pool;
  try {
    const options = parseOptions(process.argv.slice(2));
    require("dotenv").config({ path: require("node:path").resolve(__dirname, "../.env"), quiet: true, debug: false, override: false });
    if (process.env.DB_NAME !== options.database || !process.env.DB_HOST?.endsWith(".aivencloud.com") || process.env.DB_SSL_MODE !== "verify_identity") throw new Error("POI_LOCATION_STAGING_CONFIGURATION_REQUIRED");
    if (options.apply && process.env.SEED_TARGET_CONFIRM !== options.database) throw new Error("POI_LOCATION_TARGET_CONFIRMATION_REQUIRED");
    const { PoiLocationService } = require("../services/poi-location.service"), Store = require("../stores/poi-location.store");
    pool = Store.createDatabase({ ...process.env });
    console.log(JSON.stringify(await new PoiLocationService(new Store(pool, options.database)).apply(options), null, 2));
  } catch (error) {
    console.error(/^POI_LOCATION_/.test(error.message || "") ? error.message : "POI_LOCATION_STOPPED_RECONCILE_REQUIRED");
    process.exitCode = 1;
  } finally { if (pool) await pool.end(); }
}

if (require.main === module) main();
module.exports = { parseOptions, main };
