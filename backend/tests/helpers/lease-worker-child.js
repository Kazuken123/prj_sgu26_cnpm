// Isolated child process used only by the crash/heartbeat integration tests.
const mysql = require("mysql2/promise");
const utcPool = require("../../config/utc-pool");
const ContentJobStore = require("../../stores/content_job.store");
const { PipelineService } = require("../../services/pipeline.service");
const { withLeaseHeartbeat } = require("../../services/pipeline-lease");
const db = utcPool(mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME, timezone: "Z", connectionLimit: 2, connectTimeout: 3000 }));
(async () => {
  try {
    const service = new PipelineService(new ContentJobStore(db), { leaseConfig: () => ({ leaseSeconds: 3, heartbeatSeconds: 1 }) });
    const original = service.renewClaim.bind(service);
    service.renewClaim = async (...args) => { const renewed = await original(...args); process.send?.({ type: "heartbeat", renewed }); return renewed; };
    const claim = await service.claimJob(process.argv[2]);
    if (!claim.claimed) throw new Error("CHILD_CLAIM_FAILED");
    process.send?.({ type: "claimed", claimId: claim.claimId });
    await withLeaseHeartbeat(service, claim, () => new Promise(resolve => { process.on("message", message => { if (message === "stop") resolve(); }); }));
  } catch { process.send?.({ type: "failed" }); process.exitCode = 1; }
  finally { await db.end(); if (process.connected) process.disconnect(); }
})();
