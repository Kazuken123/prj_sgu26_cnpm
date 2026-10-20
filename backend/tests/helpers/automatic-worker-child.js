// Crash fixture: uses the real automatic loop and holds a provider call until killed.
const { PipelineService } = require("../../services/pipeline.service");
const { ContentWorker } = require("../../workers/content-worker");
const MockTts = require("../../adapters/mock-tts");
const pool = require("../../config/database");
const pipeline = new PipelineService(undefined, {
  translator: { provider: "MOCK", translate: async () => { process.send?.({ event: "provider_entered" }); return new Promise(() => {}); } },
  tts: new MockTts(), leaseConfig: () => ({ leaseSeconds: 3, heartbeatSeconds: 1 }),
});
new ContentWorker(pipeline, { pollMs: 100 }).run().catch(async () => { await pool.end(); process.exitCode = 1; });
