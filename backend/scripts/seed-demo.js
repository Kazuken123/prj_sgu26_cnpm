// Operator-only import. No HTTP endpoint and no environment file is loaded here.
function parseOptions(args) {
  if (args.length !== 5 || args[0] !== "--manifest" || !args[1] || args[2] !== "--database" ||
      args[3] !== "tcv_demo_review_20261020" || args[4] !== "--apply") throw new Error("INVALID_DEMO_SEED_ARGUMENTS");
  return { manifestPath: args[1], database: args[3] };
}
async function main() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
    // Refuse the implicit/legacy database fallback before importing the pool.
    if (process.env.DB_NAME !== options.database) throw new Error("WRONG_DEMO_DATABASE");
  } catch { console.error("DEMO_SEED_REQUIRES_EXPLICIT_TARGET_AND_APPLY"); process.exitCode = 1; return; }
  const fs = require("node:fs/promises"), { DemoSeedService } = require("../services/demo-seed.service");
  const pool = require("../config/database");
  try {
    const bytes = await fs.readFile(options.manifestPath);
    if (bytes.length > 100000) throw new Error("MANIFEST_TOO_LARGE");
    const input = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
    console.log(JSON.stringify(await new DemoSeedService().seed(input, options.database)));
  } catch (error) {
    console.error(["INVALID_DEMO_MANIFEST", "DEMO_SEED_CONFLICT", "DEMO_LANGUAGES_UNAVAILABLE", "DEMO_SEED_UNAVAILABLE"].includes(error.code) ? error.code : "DEMO_SEED_UNAVAILABLE");
    process.exitCode = 1;
  } finally { await pool.end(); }
}
if (require.main === module) main().catch(() => { console.error("DEMO_SEED_UNAVAILABLE"); process.exitCode = 1; });
module.exports = { parseOptions };
