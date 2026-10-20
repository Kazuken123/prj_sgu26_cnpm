// Fault injection only: block a poll and pool shutdown without touching any database.
require.cache[require.resolve("../../config/database")] = { exports: { end: () => new Promise(() => {}) } };
require.cache[require.resolve("../../services/pipeline.service")] = { exports: {
  PipelineService: class { pendingJobs() { return new Promise(() => {}); } },
} };
setInterval(() => {}, 1000); // Model a live socket that will not close; CLI deadline must terminate it.
