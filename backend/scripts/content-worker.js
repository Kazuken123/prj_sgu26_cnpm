function parseOptions(args) {
  const result = { concurrency: 1, pollMs: 1000, shutdownMs: 30000 };
  const flags = { "--concurrency": ["concurrency", 1, 4], "--poll-ms": ["pollMs", 100, 60000], "--shutdown-ms": ["shutdownMs", 1000, 120000] };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error("INVALID_WORKER_ARGUMENTS");
    seen.add(flag);
    if (flag === "--mock") continue;
    const spec = Object.hasOwn(flags, flag) ? flags[flag] : undefined, value = args[++i];
    if (!spec || !/^[1-9]\d*$/.test(value || "") || !Number.isSafeInteger(Number(value)) || Number(value) < spec[1] || Number(value) > spec[2]) throw new Error("INVALID_WORKER_ARGUMENTS");
    result[spec[0]] = Number(value);
  }
  if (!seen.has("--mock")) throw new Error("WORKER_REQUIRES_EXPLICIT_MOCK");
  return result;
}
async function main() {
  let options;
  try { options = parseOptions(process.argv.slice(2)); }
  catch { console.error(JSON.stringify({ event: "configuration", code: "WORKER_REQUIRES_VALID_MOCK_OPTIONS" })); process.exitCode = 1; return; }
  require("dotenv").config({ quiet: true });
  const pool = require("../config/database");
  const path = require("node:path");
  const { PipelineService } = require("../services/pipeline.service");
  const { ContentWorker } = require("../workers/content-worker");
  const MockTranslation = require("../adapters/mock-translation"), MockTts = require("../adapters/mock-tts");
  const worker = new ContentWorker(new PipelineService(undefined, { translator: new MockTranslation(), tts: new MockTts() }),
    { ...options, report: event => console.log(JSON.stringify(event)) });
  let deadline;
  const stop = () => {
    if (worker.stopping) return;
    worker.stop();
    console.log(JSON.stringify({ event: "stopping" }));
    deadline = setTimeout(() => {
      console.error(JSON.stringify({ event: "stop_timeout", code: "CONTENT_WORKER_INTERRUPTED" }));
      process.exit(1); // Leave claim/lease for the existing recovery command; never force a SQL write.
    }, options.shutdownMs);
  };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try {
    if (!process.env.MEDIA_ROOT || !path.isAbsolute(process.env.MEDIA_ROOT)) throw new Error("MEDIA_ROOT_REQUIRED");
    console.log(JSON.stringify({ event: "started", provider: "MOCK", concurrency: options.concurrency }));
    await worker.run();
  } catch { console.error(JSON.stringify({ event: "worker_failed", code: "CONTENT_WORKER_UNAVAILABLE" })); process.exitCode = 1; }
  finally {
    await pool.end(); clearTimeout(deadline);
    process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
  }
}
if (require.main === module) main().catch(() => { console.error("CONTENT_WORKER_UNAVAILABLE"); process.exitCode = 1; });
module.exports = { parseOptions };
