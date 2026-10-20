const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fork, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const ContentJobStore = require("../stores/content_job.store");
const SchemaStore = require("../stores/schema.store");
const { ContentJobService } = require("../services/content-job.service");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");
const utcPool = require("../config/utc-pool");
const MockTranslation = require("../adapters/mock-translation"), MockTts = require("../adapters/mock-tts"), LocalMedia = require("../adapters/local-media");

if (process.env.RUN_DB_TESTS === "1") describe("Interrupted job recovery with SQL leases and killed worker processes", () => {
  let admin, db, pipeline, jobs, pois, actor, root, legacy, legacyBefore;
  const children = new Set(), name = "tcv_lease_test_" + randomUUID().replaceAll("-", "");
  before(async () => {
    const mysql = require("mysql2/promise");
    const config = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(config); assert.match(name, /^tcv_lease_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...config, database: name, multipleStatements: true, connectionLimit: 10 }));
    await db.query(await fs.readFile(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    await new SchemaStore(db).migrateContentJobClaim();
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), TokenStore = require("../stores/refresh_token.store");
    const auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new TokenStore(db) });
    const user = await auth.bootstrapAdmin({ email: "lease-admin@example.invalid", password: "LeaseTestPassword123" });
    actor = { userId: user.userId, role: "ADMIN", status: "ACTIVE" }; pois = new PoiService(new PoiStore(db));
    legacy = await fixture();
    await db.query("UPDATE CONTENT_JOBS SET status = 'PROCESSING', claim_id = ? WHERE job_id = ?", [randomUUID(), legacy.jobId]);
    legacyBefore = await raw(legacy.jobId);
    await new SchemaStore(db).migrateContentJobLease();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "tcv-lease-sql-"));
    pipeline = worker(); jobs = new ContentJobService(new ContentJobStore(db));
  });
  after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await new Promise(resolve => child.once("exit", resolve)); }
    if (db) await db.end();
    if (admin) { if (/^tcv_lease_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`"); await admin.end(); }
    if (root && path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("tcv-lease-sql-")) await fs.rm(root, { recursive: true, force: true });
  });
  function worker(options = {}) { return new PipelineService(new ContentJobStore(db), { translator: new MockTranslation(), tts: new MockTts(), mediaStorage: new LocalMedia({ root }), ...options }); }
  async function fixture() {
    const body = { name: "Nguồn thử " + randomUUID(), category: "PLANT", description: "Mô tả thử", audioScript: "Lời đọc thử", latitude: 10.78, longitude: 106.70, status: "INACTIVE" };
    const poi = await pois.save(actor, null, body);
    const [rows] = await db.query("SELECT job_id AS jobId FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = 'en'", [poi.poiId]);
    return { body, poiId: poi.poiId, jobId: rows[0].jobId };
  }
  async function raw(id) { const [rows] = await db.query("SELECT * FROM CONTENT_JOBS WHERE job_id = ?", [id]); return rows[0]; }
  async function recoverLogs(id) { const [rows] = await db.query("SELECT * FROM AUDIT_LOGS WHERE action = 'RECOVER_CONTENT_JOB' AND resource_id = ?", [String(id)]); return rows; }
  async function expire(id) { await db.query("UPDATE CONTENT_JOBS SET lease_expires_at = UTC_TIMESTAMP(3) - INTERVAL 1 SECOND WHERE job_id = ?", [id]); }
  async function untilExpired(id) {
    for (let i = 0; i < 120; i++) {
      const [rows] = await db.query("SELECT lease_expires_at <= UTC_TIMESTAMP(3) AS expired FROM CONTENT_JOBS WHERE job_id = ?", [id]);
      if (rows[0].expired) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail("Test lease did not expire within its bounded wait");
  }
  function childFor(jobId) {
    const child = fork(path.resolve(__dirname, "helpers/lease-worker-child.js"), [String(jobId)], { cwd: root, windowsHide: true,
      env: { ...process.env, DB_NAME: name, DB_HOST: process.env.DB_HOST || "127.0.0.1", DB_USER: process.env.DB_USER || "root", DB_PASSWORD: process.env.DB_PASSWORD || "" },
      stdio: ["ignore", "ignore", "ignore", "ipc"] });
    children.add(child);
    const history = [], waiters = [];
    child.on("message", message => { history.push(message); for (const wake of [...waiters]) wake(); });
    const wait = async (type, count = 1) => {
      for (;;) {
        if (history.filter(message => message.type === type).length >= count) return history.find(message => message.type === type);
        if (history.some(message => message.type === "failed") || child.exitCode !== null || child.signalCode !== null) throw new Error("Test worker exited unexpectedly");
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { remove(); reject(new Error("Test worker IPC timeout")); }, 6000);
          const wake = () => { clearTimeout(timer); remove(); resolve(); };
          const remove = () => { const index = waiters.indexOf(wake); if (index >= 0) waiters.splice(index, 1); };
          waiters.push(wake);
        });
      }
    };
    const stop = async (kill = false) => { const done = new Promise(resolve => child.once("exit", resolve)); if (kill) child.kill("SIGKILL"); else child.send("stop"); await done; children.delete(child); };
    return { child, wait, stop };
  }
  it("migration 006 preserves legacy PROCESSING with NULL lease and reruns without resetting jobs", async () => {
    await new SchemaStore(db).migrateContentJobLease();
    const { lease_expires_at, ...after } = await raw(legacy.jobId);
    assert.equal(lease_expires_at, null); assert.deepEqual(after, legacyBefore);
    assert.ok((await pipeline.recoverExpiredJobs({ apply: true })).legacyProcessing >= 1);
    assert.equal((await raw(legacy.jobId)).status, "PROCESSING"); assert.equal((await recoverLogs(legacy.jobId)).length, 0);
  });
  it("migration rejects an incompatible lease column instead of silently changing it", async () => {
    await db.query("ALTER TABLE CONTENT_JOBS MODIFY lease_expires_at DATETIME NULL");
    try { await assert.rejects(new SchemaStore(db).migrateContentJobLease(), { code: "CONTENT_JOB_LEASE_SCHEMA_REQUIRED" }); }
    finally { await db.query("ALTER TABLE CONTENT_JOBS MODIFY lease_expires_at DATETIME(3) NULL"); }
  });
  it("claim and renewal use the SQL UTC clock; expired claims cannot renew or publish before recovery", async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId), row = await raw(f.jobId);
    const [clock] = await db.query("SELECT UTC_TIMESTAMP(3) AS nowUtc");
    assert.ok(row.lease_expires_at - clock[0].nowUtc > 110000); assert.ok(row.lease_expires_at - clock[0].nowUtc <= 120000);
    assert.equal(await pipeline.renewClaim(f.jobId, claim.claimId), true);
    await expire(f.jobId);
    assert.equal(await pipeline.renewClaim(f.jobId, claim.claimId), false);
    assert.equal((await pipeline.prepareTranslation(f.jobId, claim.claimId)).reason, "CLAIM_LOST");
    assert.equal((await pipeline.prepareAudio(f.jobId, claim.claimId)).reason, "CLAIM_LOST");
    assert.equal((await raw(f.jobId)).status, "PROCESSING");
  });
  it("dry-run changes nothing; apply recovers an expired job once without modifying READY text", async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId); await pipeline.prepareTranslation(f.jobId, claim.claimId); await expire(f.jobId);
    const before = await raw(f.jobId), [text] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY translation_id", [f.poiId]);
    assert.ok((await pipeline.recoverExpiredJobs()).inspected >= 1); assert.deepEqual(await raw(f.jobId), before);
    await pipeline.recoverExpiredJobs({ apply: true }); await pipeline.recoverExpiredJobs({ apply: true });
    const row = await raw(f.jobId); assert.equal(row.status, "FAILED"); assert.equal(row.claim_id, null); assert.equal(row.lease_expires_at, null);
    assert.equal((await jobs.get(actor, f.jobId)).error.code, "CONTENT_WORKER_INTERRUPTED"); assert.equal((await recoverLogs(f.jobId)).length, 1);
    const [after] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY translation_id", [f.poiId]); assert.deepEqual(after, text);
  });
  it("20 concurrent recovery callers record one recovery audit for the same expired claim", async () => {
    const f = await fixture(); await pipeline.claimJob(f.jobId); await expire(f.jobId);
    await Promise.all(Array.from({ length: 20 }, () => worker().recoverExpiredJobs({ apply: true })));
    assert.equal((await raw(f.jobId)).status, "FAILED"); assert.equal((await recoverLogs(f.jobId)).length, 1);
  });
  it("recovery audit failure rolls the job/claim/lease back, then retry recovers it", async () => {
    const f = await fixture(); await pipeline.claimJob(f.jobId); await expire(f.jobId); const before = await raw(f.jobId);
    await db.query("CREATE TRIGGER recovery_audit_fail BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private failure'");
    try { await assert.rejects(pipeline.recoverExpiredJobs({ apply: true }), { code: "CONTENT_RECOVERY_UNAVAILABLE" }); }
    finally { await db.query("DROP TRIGGER recovery_audit_fail"); }
    assert.deepEqual(await raw(f.jobId), before); assert.equal((await recoverLogs(f.jobId)).length, 0);
    await pipeline.recoverExpiredJobs({ apply: true }); assert.equal((await raw(f.jobId)).status, "FAILED");
  });
  it("lost recovery commit acknowledgement does not recover the same claim twice", async () => {
    const f = await fixture(); await pipeline.claimJob(f.jobId); await expire(f.jobId);
    const proxy = { ...db, getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw new Error("lost reply"); }, rollback: () => connection.rollback(),
        release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    await assert.rejects(new PipelineService(new ContentJobStore(proxy)).recoverExpiredJobs({ apply: true }), { code: "CONTENT_RECOVERY_UNAVAILABLE" });
    assert.equal((await raw(f.jobId)).status, "FAILED"); await pipeline.recoverExpiredJobs({ apply: true });
    assert.equal((await recoverLogs(f.jobId)).length, 1);
  });
  it("operator command defaults to dry-run and only --apply changes expired jobs", async () => {
    const f = await fixture(); await pipeline.claimJob(f.jobId); await expire(f.jobId);
    const command = args => promisify(execFile)(process.execPath, [path.resolve(__dirname, "../scripts/recover-content-jobs.js"), ...args], {
      cwd: root, windowsHide: true, timeout: 6000, env: { ...process.env, DB_NAME: name,
        DB_HOST: process.env.DB_HOST || "127.0.0.1", DB_USER: process.env.DB_USER || "root", DB_PASSWORD: process.env.DB_PASSWORD || "" },
    });
    assert.equal(JSON.parse((await command([])).stdout).dryRun, true); assert.equal((await raw(f.jobId)).status, "PROCESSING");
    assert.equal(JSON.parse((await command(["--apply", "--limit", "1000"])).stdout).dryRun, false);
    assert.equal((await raw(f.jobId)).status, "FAILED"); assert.equal((await recoverLogs(f.jobId)).length, 1);
  });
  it("a scanner's stale candidate cannot revoke a renewed lease committed while it waits", { timeout: 10000 }, async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId);
    await db.query("UPDATE CONTENT_JOBS SET lease_expires_at = UTC_TIMESTAMP(3) + INTERVAL 2 SECOND WHERE job_id = ?", [f.jobId]);
    let commitReady, releaseCommit, lockReached;
    const ready = new Promise(resolve => { commitReady = resolve; }), release = new Promise(resolve => { releaseCommit = resolve; });
    const reached = new Promise(resolve => { lockReached = resolve; });
    const held = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { commitReady(); await release; return connection.commit(); }, rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    const observing = { ...db, getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => { if (String(args[0]).startsWith("SELECT content_version FROM POIS")) lockReached(); return connection.query(...args); },
        beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(), rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    const renewed = new PipelineService(new ContentJobStore(held)).renewClaim(f.jobId, claim.claimId);
    try {
      await ready; await untilExpired(f.jobId);
      const recovery = new PipelineService(new ContentJobStore(observing)).recoverExpiredJobs({ apply: true });
      await reached; releaseCommit(); await recovery; assert.equal(await renewed, true);
    } finally { releaseCommit(); }
    assert.equal((await raw(f.jobId)).status, "PROCESSING"); assert.equal((await recoverLogs(f.jobId)).length, 0);
  });
  it("recovery winning against a late heartbeat cannot be undone by that old claim", async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId); await expire(f.jobId);
    const [, renewed] = await Promise.all([pipeline.recoverExpiredJobs({ apply: true }), pipeline.renewClaim(f.jobId, claim.claimId)]);
    assert.equal(renewed, false); assert.equal((await raw(f.jobId)).status, "FAILED");
    await jobs.retry(actor, f.jobId, {}); const next = await pipeline.claimJob(f.jobId);
    assert.notEqual(next.claimId, claim.claimId); assert.equal(await pipeline.renewClaim(f.jobId, claim.claimId), false);
  });
  it("worker writes recheck deadline at persistence even if its earlier locked snapshot was live", async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId), store = new ContentJobStore(db);
    const result = await store.withWorkerJob(f.jobId, async ({ job, renewLease, saveTranslation }) => {
      assert.equal(job.leaseValid, true);
      // The controlled fixture expires its own connection's row after the snapshot.
      await renewLease(claim.claimId, -1);
      return saveTranslation(claim.claimId, { name: "Too late", description: "late", audioScript: "late" }, "MOCK");
    });
    assert.equal(result, false);
    const [text] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = 'en'", [f.poiId]); assert.equal(text.length, 0);
  });
  it("source changed while interrupted recovers only the old job, which STAFF cannot retry", async () => {
    const f = await fixture(); await pipeline.claimJob(f.jobId); await expire(f.jobId);
    await pois.save(actor, f.poiId, { ...f.body, audioScript: "Nguồn mới", expectedVersion: 1 });
    await pipeline.recoverExpiredJobs({ apply: true });
    await assert.rejects(jobs.retry(actor, f.jobId, {}), { code: "CONTENT_JOB_OUTDATED" });
    const [current] = await db.query("SELECT status FROM CONTENT_JOBS WHERE poi_id = ? AND source_version = 2", [f.poiId]); assert.ok(current.every(row => row.status === "PENDING"));
  });
  it("a real live worker renews beyond the initial lease and is not recovered", { timeout: 15000 }, async () => {
    const f = await fixture(), child = childFor(f.jobId); await child.wait("claimed");
    try {
      await child.wait("heartbeat", 4);
      await pipeline.recoverExpiredJobs({ apply: true });
      assert.equal((await raw(f.jobId)).status, "PROCESSING"); assert.equal((await recoverLogs(f.jobId)).length, 0);
    } finally { await child.stop(); }
  });
  it("kill a real worker -> lease expires -> FAILED -> STAFF retry completes and old claim cannot publish", { timeout: 15000 }, async () => {
    const f = await fixture(), child = childFor(f.jobId), claim = await child.wait("claimed");
    await child.wait("heartbeat"); await child.stop(true); await untilExpired(f.jobId);
    await pipeline.recoverExpiredJobs({ apply: true }); assert.equal((await raw(f.jobId)).status, "FAILED");
    await jobs.retry(actor, f.jobId, {}); assert.equal((await pipeline.runJob(f.jobId)).completed, true);
    assert.equal((await pipeline.prepareTranslation(f.jobId, claim.claimId)).reason, "CLAIM_LOST");
    assert.equal((await pipeline.prepareAudio(f.jobId, claim.claimId)).reason, "CLAIM_LOST");
    assert.equal((await recoverLogs(f.jobId)).length, 1);
  });
});
