// Fault injection only: block a poll and pool shutdown without touching any database.
require.cache[require.resolve("../../config/database")] = { exports: { end: () => new Promise(() => {}) } };
require.cache[require.resolve("../../services/pipeline.service")] = { exports: {
  PipelineService: class { pendingJobs() { return new Promise(() => {}); } },
} };
setInterval(() => {}, 1000); // Model a live socket that will not close; CLI deadline must terminate it.
// Windows child.kill("SIGTERM") force-terminates instead of delivering a signal.
// Exercise the same registered CLI shutdown handler through this test-only IPC hook.
if (process.platform === "win32") process.on("message", message => {
  if (message === "TEST_SIGTERM") process.emit("SIGTERM");
});
