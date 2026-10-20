const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PipelineService } = require("../services/pipeline.service");
const ContentJobStore = require("../stores/content_job.store");
const { ContentJobService } = require("../services/content-job.service");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");
const utcPool = require("../config/utc-pool");
const MockTranslation = require("../adapters/mock-translation");

if (process.env.RUN_DB_TESTS === "1") describe("Worker claim with real SQL and POI/retry flows", () => {
  let admin, db, pipeline, second, jobs, pois, actor;
  const name = "tcv_claim_test_" + randomUUID().replaceAll("-", "");
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_claim_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = utcPool(mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 10 }));
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    await new (require("../stores/schema.store"))(db).migrateContentJobClaim();
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    const auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db) });
    const root = await auth.bootstrapAdmin({ email: "claim-admin@example.invalid", password: "ClaimTestPassword123" });
    actor = { userId: root.userId, role: "ADMIN", status: "ACTIVE" };
    pipeline = new PipelineService(new ContentJobStore(db)); second = new PipelineService(new ContentJobStore(db));
    jobs = new ContentJobService(new ContentJobStore(db)); pois = new PoiService(new PoiStore(db));
  });
  after(async () => {
    if (db) await db.end();
    if (admin) {
      if (/^tcv_claim_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  async function fixture(language = "en") {
    const body = { name: "Nguồn kiểm thử " + randomUUID(), category: "PLANT", description: "Dữ liệu thử.",
      audioScript: "Lời đọc thử.", latitude: 10.78, longitude: 106.70, status: "INACTIVE" };
    const poi = await pois.save(actor, null, body);
    const [rows] = await db.query("SELECT job_id AS jobId FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = ?", [poi.poiId, language]);
    return { body, poiId: poi.poiId, jobId: rows[0].jobId };
  }
  async function audit(id) {
    const [rows] = await db.query("SELECT user_id, action, details FROM AUDIT_LOGS WHERE resource_type = 'CONTENT_JOBS' AND resource_id = ? ORDER BY log_id", [String(id)]);
    return rows;
  }
  const unavailable = { code: "CONTENT_JOB_CLAIM_UNAVAILABLE", status: 503 };
  it("receives a POI-created task once, exposes PROCESSING to staff and does not fake completed text/audio", async () => {
    for (const language of ["vi", "en"]) {
      const f = await fixture(language);
      const [before] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY translation_id", [f.poiId]);
      assert.equal((await pipeline.claimJob(f.jobId)).claimed, true);
      const status = await jobs.get(actor, f.jobId);
      assert.equal(status.status, "PROCESSING"); assert.equal(status.canRetry, false);
      assert.equal(status.audio.status, null);
      assert.equal((await pipeline.claimJob(f.jobId)).reason, "NOT_PENDING");
      const [after] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? ORDER BY translation_id", [f.poiId]);
      assert.deepEqual(after, before);
      const logs = await audit(f.jobId);
      assert.equal(logs.length, 1); assert.equal(logs[0].action, "CLAIM_CONTENT_JOB"); assert.equal(logs[0].user_id, null);
      assert.equal(JSON.parse(logs[0].details).sourceVersion, 1);
    }
  });
  it("20 concurrent calls through two Stores claim exactly once with one audit", async () => {
    const f = await fixture();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? pipeline : second).claimJob(f.jobId)));
    assert.equal(results.filter(row => row.claimed).length, 1);
    assert.equal(results.filter(row => row.reason === "NOT_PENDING").length, 19);
    assert.equal((await audit(f.jobId)).length, 1);
  });
  it("old pending source becomes FAILED once, while the new source and new tasks remain unchanged", async () => {
    const f = await fixture();
    await pois.save(actor, f.poiId, { ...f.body, description: "Nguồn mới.", expectedVersion: 1 });
    const [before] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ?", [f.poiId]);
    assert.equal((await pipeline.claimJob(f.jobId)).reason, "CONTENT_SOURCE_OUTDATED");
    assert.equal((await pipeline.claimJob(f.jobId)).reason, "NOT_PENDING");
    const [row] = await db.query("SELECT status, error_message FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
    assert.deepEqual(row[0], { status: "FAILED", error_message: "CONTENT_SOURCE_OUTDATED" });
    const [after] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ?", [f.poiId]);
    assert.deepEqual(after, before);
    const [current] = await db.query("SELECT status FROM CONTENT_JOBS WHERE poi_id = ? AND source_version = 2", [f.poiId]);
    assert.ok(current.every(row => row.status === "PENDING"));
    assert.equal((await audit(f.jobId))[0].action, "FAIL_CONTENT_JOB");
    await assert.rejects(jobs.retry(actor, f.jobId, {}), { code: "CONTENT_JOB_OUTDATED" });
  });
  it("non-pending and unknown jobs cause no state changes or worker audit", async () => {
    for (const status of ["PROCESSING", "FAILED", "COMPLETED"]) {
      const f = await fixture();
      await db.query("UPDATE CONTENT_JOBS SET status = ?, error_message = 'existing error' WHERE job_id = ?", [status, f.jobId]);
      assert.equal((await pipeline.claimJob(f.jobId)).reason, "NOT_PENDING");
      const [rows] = await db.query("SELECT status, error_message FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
      assert.deepEqual(rows[0], { status, error_message: "existing error" });
      assert.equal((await audit(f.jobId)).length, 0);
    }
    assert.equal((await pipeline.claimJob(2147483647)).reason, "NOT_FOUND");
  });
  it("audit failure rolls back both a claim and outdated-job failure; retry claims only after rollback", async () => {
    const current = await fixture(), old = await fixture();
    await pois.save(actor, old.poiId, { ...old.body, description: "Bản mới.", expectedVersion: 1 });
    await db.query("CREATE TRIGGER claim_audit_fail BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private forced failure'");
    try {
      await assert.rejects(pipeline.claimJob(current.jobId), unavailable);
      await assert.rejects(pipeline.claimJob(old.jobId), unavailable);
    } finally { await db.query("DROP TRIGGER claim_audit_fail"); }
    for (const f of [current, old]) {
      assert.equal((await jobs.get(actor, f.jobId)).status, "PENDING"); assert.equal((await audit(f.jobId)).length, 0);
    }
    assert.equal((await pipeline.claimJob(current.jobId)).claimed, true);
  });
  it("job update failure does not append an audit or grant ownership", async () => {
    const f = await fixture();
    await db.query("CREATE TRIGGER claim_update_fail BEFORE UPDATE ON CONTENT_JOBS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private forced failure'");
    try { await assert.rejects(pipeline.claimJob(f.jobId), unavailable); }
    finally { await db.query("DROP TRIGGER claim_update_fail"); }
    assert.equal((await jobs.get(actor, f.jobId)).status, "PENDING"); assert.equal((await audit(f.jobId)).length, 0);
  });
  it("claim waiting on a source edit reads the committed version instead of its earlier snapshot", async () => {
    const f = await fixture(), editor = await db.getConnection();
    let reachedParent;
    const reached = new Promise(resolve => { reachedParent = resolve; });
    const proxy = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => {
        if (String(args[0]).startsWith("SELECT content_version FROM POIS")) reachedParent();
        return connection.query(...args);
      }, beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(),
      rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    const blocked = new PipelineService(new ContentJobStore(proxy));
    try {
      await editor.beginTransaction();
      await editor.query("UPDATE POIS SET content_version = 2 WHERE poi_id = ?", [f.poiId]);
      const result = blocked.claimJob(f.jobId);
      await reached;
      await editor.commit();
      assert.equal((await result).reason, "CONTENT_SOURCE_OUTDATED");
    } finally { await editor.rollback(); editor.release(); }
    assert.equal((await jobs.get(actor, f.jobId)).status, "FAILED");
  });
  it("losing commit acknowledgement grants no work; another Store cannot claim the committed PROCESSING job", async () => {
    const f = await fixture();
    const proxy = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw new Error("lost acknowledgement"); },
        rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    await assert.rejects(new PipelineService(new ContentJobStore(proxy)).claimJob(f.jobId), unavailable);
    assert.equal((await second.claimJob(f.jobId)).reason, "NOT_PENDING");
    assert.equal((await jobs.get(actor, f.jobId)).status, "PROCESSING"); assert.equal((await audit(f.jobId)).length, 1);
  });
  it("staff retry of a current FAILED job reuses the same row before one worker acquires it", async () => {
    const f = await fixture();
    await db.query("UPDATE CONTENT_JOBS SET status = 'FAILED', error_message = 'old safe code' WHERE job_id = ?", [f.jobId]);
    await jobs.retry(actor, f.jobId, {});
    assert.equal((await pipeline.claimJob(f.jobId)).claimed, true);
    const logs = await audit(f.jobId);
    assert.deepEqual(logs.map(row => row.action), ["RETRY_CONTENT_JOB", "CLAIM_CONTENT_JOB"]);
    await assert.rejects(jobs.retry(actor, f.jobId, {}), { code: "CONTENT_JOB_NOT_FAILED" });
  });
  const translating = (translator = new MockTranslation(), translationTimeoutMs = 1000) =>
    new PipelineService(new ContentJobStore(db), { translator, translationTimeoutMs });
  async function translation(poiId, language = "en") {
    const [rows] = await db.query("SELECT * FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = ?", [poiId, language]);
    return rows[0];
  }
  function deferredProvider() {
    let ready, resolve;
    const called = new Promise(r => { ready = r; });
    const answer = new Promise(r => { resolve = r; });
    return { called, resolve, provider: "TEST", translate: () => { ready(); return answer; } };
  }
  it("migration 005 preserves existing rows, leaves old claims NULL and can run twice", async () => {
    const f = await fixture();
    // Model a legacy schema in this disposable database only.
    await db.query("ALTER TABLE CONTENT_JOBS DROP COLUMN claim_id");
    const [before] = await db.query("SELECT * FROM CONTENT_JOBS ORDER BY job_id");
    const schema = new (require("../stores/schema.store"))(db);
    await schema.migrateContentJobClaim(); await schema.migrateContentJobClaim();
    const [after] = await db.query("SELECT * FROM CONTENT_JOBS ORDER BY job_id");
    assert.ok(after.every(row => row.claim_id === null));
    assert.deepEqual(after.map(({ claim_id, ...row }) => row), before);
    const claim = await pipeline.claimJob(f.jobId);
    const [saved] = await db.query("SELECT claim_id FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
    assert.equal(saved[0].claim_id, claim.claimId);
    assert.equal(JSON.stringify(await jobs.get(actor, f.jobId)).includes(claim.claimId), false);
    assert.equal(JSON.stringify(await audit(f.jobId)).includes(claim.claimId), false);
  });
  it("migration rejects an incompatible existing claim column instead of silently altering it", async () => {
    await db.query("ALTER TABLE CONTENT_JOBS MODIFY claim_id VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL");
    try { await assert.rejects(new (require("../stores/schema.store"))(db).migrateContentJobClaim(), { code: "CONTENT_JOB_CLAIM_SCHEMA_REQUIRED" }); }
    finally { await db.query("ALTER TABLE CONTENT_JOBS MODIFY claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL"); }
  });
  it("mock text commits READY with audit, but does not create audio or complete the job", async () => {
    const f = await fixture(), worker = translating();
    const result = await worker.runTranslation(f.jobId);
    assert.equal(result.prepared, true); assert.equal(result.status, "PROCESSING");
    const text = await translation(f.poiId);
    assert.equal(text.status, "READY"); assert.equal(text.source_version, 1); assert.match(text.audio_script, /^\[MOCK en\]/);
    const row = await jobs.get(actor, f.jobId);
    assert.equal(row.status, "PROCESSING"); assert.equal(row.audio.status, null);
    assert.deepEqual((await audit(f.jobId)).map(row => row.action), ["CLAIM_CONTENT_JOB", "PREPARE_TRANSLATION"]);
    assert.equal(JSON.parse((await audit(f.jobId))[1].details).provider, "MOCK");
  });
  it("Vietnamese and existing current text are reused without invoking the provider or duplicating audit", async () => {
    const worker = translating({ translate: () => assert.fail("No provider required") });
    const vi = await fixture("vi");
    const viBefore = await translation(vi.poiId, "vi");
    assert.equal((await worker.runTranslation(vi.jobId)).reused, true);
    assert.deepEqual(await translation(vi.poiId, "vi"), viBefore);
    const en = await fixture(); const claim = await pipeline.claimJob(en.jobId);
    await db.query(`INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
      VALUES (?, 'en', 'Existing', 'Existing description', 'Existing script', 1, 'READY')`, [en.poiId]);
    assert.equal((await worker.prepareTranslation(en.jobId, claim.claimId)).reused, true);
    assert.equal((await worker.prepareTranslation(en.jobId, claim.claimId)).reused, true);
    assert.equal((await audit(en.jobId)).length, 1);
  });
  it("20 workers still call the translation provider only once for one pending job", async () => {
    const f = await fixture(); let calls = 0;
    const mock = new MockTranslation();
    const worker = translating({ provider: "MOCK", translate: input => { calls++; return mock.translate(input); } });
    const results = await Promise.all(Array.from({ length: 20 }, () => worker.runTranslation(f.jobId)));
    assert.equal(results.filter(row => row.prepared).length, 1); assert.equal(calls, 1);
    assert.equal((await audit(f.jobId)).filter(row => row.action === "PREPARE_TRANSLATION").length, 1);
  });
  it("source edit while provider runs rejects the old result and preserves the new Vietnamese source", async () => {
    const f = await fixture(), adapter = deferredProvider(), worker = translating(adapter);
    const running = worker.runTranslation(f.jobId);
    await adapter.called;
    await pois.save(actor, f.poiId, { ...f.body, audioScript: "Kịch bản mới.", expectedVersion: 1 });
    adapter.resolve({ name: "Old", description: "Old", audioScript: "Old" });
    assert.equal((await running).reason, "CONTENT_SOURCE_OUTDATED");
    assert.equal(await translation(f.poiId), undefined);
    assert.equal((await translation(f.poiId, "vi")).audio_script, "Kịch bản mới.");
    assert.equal((await jobs.get(actor, f.jobId)).status, "FAILED");
  });
  it("a recovered/retried job has a new claim; delayed success and failure from the old attempt cannot write", async () => {
    for (const succeeds of [true, false]) {
      const f = await fixture(), adapter = deferredProvider(), oldWorker = translating(adapter);
      const running = oldWorker.runTranslation(f.jobId); await adapter.called;
      const [original] = await db.query("SELECT claim_id FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
      // Recovery is NOT implemented here: this fixture models the future safe reset.
      await db.query("UPDATE CONTENT_JOBS SET status = 'FAILED' WHERE job_id = ?", [f.jobId]);
      await jobs.retry(actor, f.jobId, {});
      const [reset] = await db.query("SELECT claim_id FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]); assert.equal(reset[0].claim_id, null);
      const next = await pipeline.claimJob(f.jobId); assert.notEqual(next.claimId, original[0].claim_id);
      assert.equal((await translating().prepareTranslation(f.jobId, next.claimId)).prepared, true);
      const current = await translation(f.poiId), before = await audit(f.jobId);
      adapter.resolve(succeeds ? { name: "Old result", description: "old", audioScript: "old" } : null);
      assert.equal((await running).reason, "CLAIM_LOST");
      assert.deepEqual(await translation(f.poiId), current); assert.deepEqual(await audit(f.jobId), before);
    }
  });
  it("provider failure/timeout leaves the POI and source intact, shows safe reason, and allows staff retry", async () => {
    for (const mode of ["failure", "timeout"]) {
      const f = await fixture(), worker = translating(new MockTranslation({ mode }), 25);
      const source = await translation(f.poiId, "vi");
      const result = await worker.runTranslation(f.jobId);
      const code = mode === "timeout" ? "TRANSLATION_TIMEOUT" : "TRANSLATION_PROVIDER_FAILED";
      assert.equal(result.reason, code); assert.deepEqual(await translation(f.poiId, "vi"), source);
      const visible = await jobs.get(actor, f.jobId); assert.equal(visible.error.code, code); assert.equal(visible.canRetry, true);
      await jobs.retry(actor, f.jobId, {});
      assert.equal((await translating().runTranslation(f.jobId)).prepared, true);
    }
  });
  it("a late resolution after timeout cannot overwrite the next attempt's text", async () => {
    const f = await fixture(), adapter = deferredProvider(), old = translating(adapter, 20);
    const failed = await old.runTranslation(f.jobId); assert.equal(failed.reason, "TRANSLATION_TIMEOUT");
    await jobs.retry(actor, f.jobId, {}); await translating().runTranslation(f.jobId);
    const current = await translation(f.poiId), before = await audit(f.jobId);
    adapter.resolve({ name: "Too late", description: "old", audioScript: "old" });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(await translation(f.poiId), current); assert.deepEqual(await audit(f.jobId), before);
  });
  it("translation SQL/audit failure rolls back the text and does not mark the job completed", async () => {
    for (const target of ["POI_TRANSLATIONS", "AUDIT_LOGS"]) {
      const f = await fixture(), worker = translating(), claim = await pipeline.claimJob(f.jobId);
      await db.query("CREATE TRIGGER translation_fail BEFORE INSERT ON " + target + " FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private SQL failure'");
      try { await assert.rejects(worker.prepareTranslation(f.jobId, claim.claimId), { code: "CONTENT_TRANSLATION_UNAVAILABLE" }); }
      finally { await db.query("DROP TRIGGER translation_fail"); }
      assert.equal(await translation(f.poiId), undefined);
      assert.equal((await jobs.get(actor, f.jobId)).status, "PROCESSING"); assert.equal((await audit(f.jobId)).length, 1);
      assert.equal((await worker.prepareTranslation(f.jobId, claim.claimId)).prepared, true);
    }
  });
  it("lost translation commit acknowledgement is reconciled by reusing the committed current text", async () => {
    const f = await fixture(), claim = await pipeline.claimJob(f.jobId);
    const proxy = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw new Error("lost reply"); },
        rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } };
    let invoked = false;
    // Only lose the write commit, not the preliminary read transaction.
    const normal = new ContentJobStore(db), uncertain = new ContentJobStore(proxy);
    const worker = new PipelineService({ withWorkerJob: (...args) => (invoked ? uncertain : normal).withWorkerJob(...args) }, {
      translator: { provider: "MOCK", translate: input => { invoked = true; return new MockTranslation().translate(input); } },
    });
    await assert.rejects(worker.prepareTranslation(f.jobId, claim.claimId), { code: "CONTENT_TRANSLATION_UNAVAILABLE" });
    assert.equal((await translation(f.poiId)).status, "READY");
    assert.equal((await translating({ translate: () => assert.fail("Must reuse") }).prepareTranslation(f.jobId, claim.claimId)).reused, true);
    assert.equal((await audit(f.jobId)).filter(row => row.action === "PREPARE_TRANSLATION").length, 1);
  });
  it("provider errors, missing source and invalid output never expose raw details or partial READY text", async () => {
    for (const type of ["source", "provider", "output"]) {
      const f = await fixture();
      if (type === "source") await db.query("UPDATE POI_TRANSLATIONS SET status = 'FAILED' WHERE poi_id = ? AND language_code = 'vi'", [f.poiId]);
      const worker = translating({ translate: async () => { if (type === "provider") throw new Error("password=secret SQL token"); return { name: "Partial" }; } });
      await worker.runTranslation(f.jobId);
      assert.equal((await jobs.get(actor, f.jobId)).status, "FAILED"); assert.equal(await translation(f.poiId), undefined);
      assert.equal(/secret|password|SQL token/.test(JSON.stringify(await jobs.get(actor, f.jobId)) + JSON.stringify(await audit(f.jobId))), false);
    }
  });
});
