const { it } = require("node:test");
const assert = require("node:assert/strict");
const { ContentWorker } = require("../workers/content-worker");
const { PipelineService } = require("../services/pipeline.service");
const ContentJobStore = require("../stores/content_job.store");
const { parseOptions } = require("../scripts/content-worker");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
it("worker requires explicit mock and strictly bounded, unique CLI options", () => {
  assert.deepEqual(parseOptions(["--mock"]), { concurrency: 1, pollMs: 1000, shutdownMs: 30000 });
  assert.equal(parseOptions(["--mock", "--concurrency", "4", "--poll-ms", "100", "--shutdown-ms", "1000"]).concurrency, 4);
  for (const args of [[], ["--concurrency", "1"], ["--mock", "--mock"], ["--mock", "--concurrency", "5"],
    ["--mock", "--poll-ms", "0"], ["--mock", "--shutdown-ms", "999"], ["--mock", "--unknown"], ["--mock", "constructor", "1"], ["--mock", "--concurrency", "1.5"]]) assert.throws(() => parseOptions(args));
});
it("worker rejects unbounded options before accessing the pipeline", () => {
  for (const options of [{ concurrency: 0 }, { concurrency: 5 }, { pollMs: 99 }, { pollMs: Infinity }]) assert.throws(() => new ContentWorker({}, options));
});
it("pending query is bounded, deterministic and selects only PENDING without altering lock order", async () => {
  const calls = [];
  const store = new ContentJobStore({ query: async (...args) => { calls.push(args); return [[{ jobId: 7 }]]; } });
  assert.deepEqual(await new PipelineService(store).pendingJobs(2), [{ jobId: 7 }]);
  assert.match(calls[0][0], /status = 'PENDING'.*ORDER BY created_at, job_id LIMIT \?/s); assert.deepEqual(calls[0][1], [2]);
  await assert.rejects(new PipelineService(store).pendingJobs(5), { code: "INVALID_WORKER_LIMIT" }); assert.equal(calls.length, 1);
});
it("polling errors are safe and the next poll recovers", async () => {
  const service = new PipelineService({ listPending: async () => { throw new Error("private SQL password"); } });
  await assert.rejects(service.pendingJobs(1), error => error.code === "CONTENT_QUEUE_UNAVAILABLE" && !error.message.includes("password"));
  let calls = 0; const events = [];
  const worker = new ContentWorker({ pendingJobs: async () => { if (++calls === 1) throw new Error("secret"); worker.stop(); return []; } }, { pollMs: 100, report: e => events.push(e) });
  await worker.run(); assert.equal(calls, 2); assert.deepEqual(events, [{ event: "poll", code: "CONTENT_QUEUE_UNAVAILABLE" }]);
});
it("batch completion limits active jobs and never overlaps polling batches", async () => {
  let active = 0, maximum = 0, polls = 0; const events = [];
  const worker = new ContentWorker({ pendingJobs: async limit => { assert.equal(limit, 2); assert.equal(active, 0); return ++polls <= 2 ? [{ jobId: polls * 2 }, { jobId: polls * 2 + 1 }] : []; },
    runJob: async () => { maximum = Math.max(maximum, ++active); await pause(10); active--; return { completed: true }; } },
  { concurrency: 2, pollMs: 100, report: e => { events.push(e); if (events.length === 4) worker.stop(); } });
  await worker.run(); assert.equal(maximum, 2); assert.equal(polls, 2); assert.equal(events.length, 4);
  await assert.rejects(worker.run(), /WORKER_ALREADY_STARTED/);
});
it("stopping drains in-flight work, wakes idle polling and stops accepting new jobs", async () => {
  let release, entered; const started = new Promise(resolve => { entered = resolve; });
  const worker = new ContentWorker({ pendingJobs: async () => [{ jobId: 1 }], runJob: async () => { entered(); await new Promise(resolve => { release = resolve; }); return { completed: true }; } });
  let finished = false; const running = worker.run().then(() => { finished = true; });
  await started; worker.stop(); await pause(5); assert.equal(finished, false); release(); await running;
  let pollDone; const polled = new Promise(resolve => { pollDone = resolve; });
  const idle = new ContentWorker({ pendingJobs: async () => { pollDone(); return []; } }, { pollMs: 60000 });
  const idleRun = idle.run(); await polled; await pause(5); idle.stop(); await idleRun;
});
it("stop during pending lookup does not claim work returned afterwards", async () => {
  let release, entered; const started = new Promise(resolve => { entered = resolve; });
  const worker = new ContentWorker({ pendingJobs: async () => { entered(); return new Promise(resolve => { release = resolve; }); }, runJob: () => assert.fail("stopped worker must not claim") });
  const running = worker.run(); await started; worker.stop(); release([{ jobId: 1 }]); await running;
});
it("job failure or unknown commit does not retry automatically or leak provider errors", async () => {
  const events = []; const worker = new ContentWorker({ pendingJobs: async () => [{ jobId: 1 }, { jobId: 2 }],
    runJob: async id => { if (id === 1) throw new Error("private token"); return { status: "FAILED", reason: "private provider detail" }; } },
  { concurrency: 2, report: e => { events.push(e); if (events.length === 2) worker.stop(); } });
  await worker.run(); assert.deepEqual(events.map(e => e.outcome).sort(), ["CHECK_REQUIRED", "FAILED"]); assert.equal(JSON.stringify(events).includes("private"), false);
});
it("CLI exits nonzero at the shutdown deadline even when a poll/socket is stuck", { timeout: 10000 }, async t => {
  const { fork } = require("node:child_process"), path = require("node:path"), os = require("node:os");
  const child = fork(path.resolve(__dirname, "../scripts/content-worker.js"), ["--mock", "--shutdown-ms", "1000"], {
    cwd: os.tmpdir(), windowsHide: true, execArgv: ["--require", path.resolve(__dirname, "helpers/worker-shutdown-preload.js")],
    env: { ...process.env, MEDIA_ROOT: os.tmpdir() }, stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "", errors = "";
  child.stderr.on("data", bytes => { errors += bytes; });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await exited; } });
  const started = new Promise(resolve => child.stdout.on("data", bytes => { output += bytes; if (output.includes('"started"')) resolve(); }));
  let startTimer;
  try { await Promise.race([started, new Promise((resolve, reject) => { startTimer = setTimeout(() => reject(new Error("CLI start timeout")), 4000); })]); }
  finally { clearTimeout(startTimer); }
  const before = Date.now(); child.kill("SIGTERM"); const result = await exited;
  assert.deepEqual(result, { code: 1, signal: null }); assert.ok(Date.now() - before < 5000);
  assert.match(output, /"stopping"/); assert.match(errors, /"stop_timeout"/); assert.match(errors, /CONTENT_WORKER_INTERRUPTED/);
});
