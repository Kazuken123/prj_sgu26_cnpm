async function main() {
  const args = process.argv.slice(2);
  const valid = args[0] === "--database" && args[1] === "tcv_demo_review_20261020" &&
    ((args.length === 3 && args[2] === "--plan") || (args.length === 5 && args[2] === "--apply" && args[3] === "--expected" && /^[a-f0-9]{64}$/.test(args[4])));
  if (!valid) throw new Error("EXPLICIT_LOCATION_TARGET_PLAN_OR_APPLY_REQUIRED");
  require("dotenv").config({ quiet: true });
  if (process.env.DB_NAME !== args[1]) throw new Error("LOCATION_CONFIG_TARGET_MISMATCH");
  const pool = require("../config/database");
  try {
    const Service = require("../services/demo-location.service"), Store = require("../stores/demo-location.store");
    console.log(JSON.stringify(await new Service(new Store(pool, args[1])).apply({ apply: args[2] === "--apply", expectedHash: args[4] })));
  } finally { await pool.end(); }
}
if (require.main === module) main().catch(() => { console.error("LOCATION_UPDATE_STOPPED_RECONCILE_REQUIRED"); process.exitCode = 1; });
module.exports = { main };
