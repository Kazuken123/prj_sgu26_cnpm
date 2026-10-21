// Operator-only demo transition. No HTTP, implicit target, force reset or raw SQL.
function parseOptions(args) {
  if (args[0] !== "--database" || args[1] !== "tcv_demo_review_20261020") throw Error("INVALID_DEMO_AUDIO_ARGUMENTS");
  if (args.length === 6 && args[2] === "--plan" && args[3] && args[4] === "--output" && args[5]) return { mode: "plan", database: args[1], input: args[3], output: args[5] };
  if (args.length === 4 && ["--apply", "--rollback"].includes(args[2]) && args[3]) return { mode: args[2].slice(2), database: args[1], input: args[3] };
  throw Error("INVALID_DEMO_AUDIO_ARGUMENTS");
}
async function main() {
  let options;
  try { options = parseOptions(process.argv.slice(2)); if (process.env.DB_NAME !== options.database) throw Error("WRONG_TARGET"); }
  catch { console.error("DEMO_AUDIO_REQUIRES_EXPLICIT_TARGET_AND_MODE"); process.exitCode = 1; return; }
  const fs = require("node:fs/promises"), path = require("node:path"), pool = require("../config/database");
  const { DemoAudioService } = require("../services/demo-audio.service"), LocalMedia = require("../adapters/local-media");
  try {
    const bytes = await fs.readFile(options.input); if (bytes.length > 100000) throw Error("MANIFEST_TOO_LARGE");
    const input = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
    const service = new DemoAudioService(undefined, new LocalMedia(), new LocalMedia({ root: process.env.DEMO_AUDIO_CANDIDATE_ROOT || path.resolve(__dirname, "../../data/demo/piper-reviewed") }));
    if (options.mode === "plan") {
      const plan = await service.plan(options.database, input);
      await fs.writeFile(options.output, JSON.stringify(plan, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      console.log(JSON.stringify({ status: "PLANNED", operationId: plan.operationId, audioCount: 4 }));
    } else console.log(JSON.stringify(await service.apply(options.database, input, options.mode === "rollback")));
  } catch (error) { console.error(["INVALID_DEMO_AUDIO_TARGET", "INVALID_DEMO_AUDIO_MANIFEST", "INVALID_DEMO_AUDIO_PLAN", "DEMO_AUDIO_CONFLICT", "DEMO_AUDIO_UNAVAILABLE"].includes(error.code) ? error.code : "DEMO_AUDIO_UNAVAILABLE"); process.exitCode = 1; }
  finally { await pool.end(); }
}
if (require.main === module) main().catch(() => { console.error("DEMO_AUDIO_UNAVAILABLE"); process.exitCode = 1; });
module.exports = { parseOptions };
