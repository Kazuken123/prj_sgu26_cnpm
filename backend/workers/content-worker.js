// A bounded polling loop. Claiming, leases and all writes remain in PipelineService/Store.
class ContentWorker {
  constructor(pipeline, { concurrency = 1, pollMs = 1000, report = () => {} } = {}) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4 ||
        !Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60000) throw new Error("INVALID_WORKER_OPTIONS");
    this.pipeline = pipeline; this.concurrency = concurrency; this.pollMs = pollMs; this.report = report;
    this.stopping = false; this.started = false;
  }
  emit(event) { try { this.report(event); } catch { /* Logging must not abandon claimed work. */ } }
  stop() { this.stopping = true; this.wake?.(); }
  async run() {
    if (this.started) throw new Error("WORKER_ALREADY_STARTED");
    this.started = true;
    while (!this.stopping) {
      try {
        const candidates = await this.pipeline.pendingJobs(this.concurrency);
        if (!this.stopping) await Promise.all(candidates.map(async ({ jobId }) => {
          if (this.stopping) return;
          try {
            const result = await this.pipeline.runJob(jobId);
            const outcome = result.completed ? "COMPLETED" : result.status === "FAILED" ? "FAILED" : "SKIPPED";
            this.emit({ event: "job", jobId, outcome });
          } catch {
            // Do not retry unknown commits here. PROCESSING is reconciled by lease recovery.
            this.emit({ event: "job", jobId, outcome: "CHECK_REQUIRED" });
          }
        }));
      } catch { this.emit({ event: "poll", code: "CONTENT_QUEUE_UNAVAILABLE" }); }
      if (!this.stopping) await new Promise(resolve => {
        const timer = setTimeout(() => { this.wake = undefined; resolve(); }, this.pollMs);
        this.wake = () => { clearTimeout(timer); this.wake = undefined; resolve(); };
      });
    }
  }
}
module.exports = { ContentWorker };
