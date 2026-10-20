function parseOptions(args) {
  const options = { apply: false, limit: 100 };
  let sawLimit = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply" && !options.apply) options.apply = true;
    else if (args[i] === "--limit" && !sawLimit && /^[1-9]\d*$/.test(args[i + 1] || "") && Number(args[i + 1]) <= 1000) {
      options.limit = Number(args[++i]); sawLimit = true;
    } else throw Object.assign(new Error("INVALID_RECOVERY_ARGUMENTS"), { code: "INVALID_RECOVERY_ARGUMENTS" });
  }
  return options;
}
if (require.main === module) {
  require("dotenv").config({ quiet: true });
  const pool = require("../config/database");
  const { PipelineService } = require("../services/pipeline.service");
  (async () => {
    try { console.log(JSON.stringify(await new PipelineService().recoverExpiredJobs(parseOptions(process.argv.slice(2))))); }
    catch (error) { console.error("Kiểm tra/phục hồi tác vụ thất bại:", error.code || "CONTENT_RECOVERY_UNAVAILABLE"); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
module.exports = { parseOptions };
