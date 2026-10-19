const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { ContentJobService } = require("../services/content-job.service");
const ContentJobStore = require("../stores/content_job.store");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");

describe("UC-13 content status/retry with real MySQL", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  let admin, db, service, pois, actor, secondActor, auth, server, base;
  const name = "tcv_jobs_test_" + randomUUID().replaceAll("-", "");
  const config = { secret: "content-job-integration-test-only-at-least-32-bytes", issuer: "food-tour-api",
    audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 7 * 86400000 };
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(name, /^tcv_jobs_test_[a-f0-9]{32}$/); assert.notEqual(name, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database: name, multipleStatements: true, connectionLimit: 8 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db), config: () => config });
    const root = await auth.bootstrapAdmin({ email: "jobs-admin@example.invalid", password: "JobsTestPassword123" });
    const staff = await auth.createStaff(root.userId, { email: "jobs-staff@example.invalid", password: "JobsTestPassword123" });
    actor = { userId: staff.userId, role: "STAFF", status: "ACTIVE" };
    secondActor = { userId: root.userId, role: "ADMIN", status: "ACTIVE" };
    service = new ContentJobService(new ContentJobStore(db)); pois = new PoiService(new PoiStore(db));
    const { createApp } = require("../server");
    server = http.createServer(createApp({ authService: auth, poiService: pois, contentJobService: service }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}/api/admin/content-jobs`;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end();
    if (admin) {
      if (/^tcv_jobs_test_[a-f0-9]{32}$/.test(name) && name !== process.env.DB_NAME) await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
      await admin.end();
    }
  });
  const input = () => ({ name: "Nguồn thử " + randomUUID(), category: "PLANT", description: "Dữ liệu kiểm thử.",
    audioScript: "Kịch bản kiểm thử.", latitude: 10.78, longitude: 106.70, status: "INACTIVE" });
  async function fixture(status = "FAILED") {
    const body = input(), poi = await pois.save(actor, null, body);
    const [rows] = await db.query("SELECT job_id FROM CONTENT_JOBS WHERE poi_id = ? AND language_code = 'en'", [poi.poiId]);
    const jobId = rows[0].job_id;
    await db.query("UPDATE CONTENT_JOBS SET status = ?, error_message = 'provider details must remain private' WHERE job_id = ?", [status, jobId]);
    return { body, poi, jobId };
  }
  async function auditCount(id) {
    const [rows] = await db.query("SELECT COUNT(*) AS total FROM AUDIT_LOGS WHERE action = 'RETRY_CONTENT_JOB' AND resource_id = ?", [String(id)]);
    return Number(rows[0].total);
  }
  const code = value => error => error.code === value;
  it("lists actual status per language, filters/paginates and never exposes raw provider errors", async () => {
    const f = await fixture();
    await db.query("UPDATE CONTENT_JOBS SET error_message = 'SELECT password=secret raw-token' WHERE job_id = ?", [f.jobId]);
    const first = await service.list(actor, { poiId: f.poi.poiId, limit: 1 });
    assert.equal(first.total, 2); assert.equal(first.items.length, 1);
    const next = await service.list(actor, { poiId: f.poi.poiId, limit: 1, page: 2 });
    assert.notEqual(first.items[0].jobId, next.items[0].jobId);
    const filtered = await service.list(actor, { poiId: f.poi.poiId, languageCode: "en", status: "FAILED", currentOnly: true });
    assert.equal(filtered.total, 1); assert.equal(filtered.items[0].jobId, f.jobId);
    assert.equal(filtered.items[0].translation.status, null); assert.equal(filtered.items[0].audio.status, null);
    assert.equal(/SELECT|password|secret|raw-token/.test(JSON.stringify(filtered)), false);
    assert.equal(await auditCount(f.jobId), 0);
  });
  it("retry updates the same row once, clears error, keeps source/audio statuses and audits", async () => {
    const f = await fixture();
    const result = await service.retry(actor, f.jobId, {});
    assert.equal(result.status, "PENDING"); assert.equal(result.accepted, true);
    const [rows] = await db.query("SELECT status, error_message, source_version FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
    assert.equal(rows[0].status, "PENDING"); assert.equal(rows[0].error_message, null); assert.equal(rows[0].source_version, 1);
    const [counts] = await db.query("SELECT COUNT(*) AS total FROM CONTENT_JOBS WHERE poi_id = ?", [f.poi.poiId]);
    assert.equal(Number(counts[0].total), 2); assert.equal(await auditCount(f.jobId), 1);
    const [vi] = await db.query("SELECT status FROM POI_TRANSLATIONS WHERE poi_id = ? AND language_code = 'vi'", [f.poi.poiId]);
    assert.equal(vi[0].status, "READY");
    await assert.rejects(service.retry(actor, f.jobId, {}), code("CONTENT_JOB_NOT_FAILED"));
    assert.equal(await auditCount(f.jobId), 1);
  });
  it("PENDING/PROCESSING/COMPLETED cannot be retried", async () => {
    for (const status of ["PENDING", "PROCESSING", "COMPLETED"]) {
      const f = await fixture(status);
      await assert.rejects(service.retry(actor, f.jobId), code("CONTENT_JOB_NOT_FAILED"));
      assert.equal((await service.get(actor, f.jobId)).status, status); assert.equal(await auditCount(f.jobId), 0);
    }
  });
  it("source edit makes the old FAILED job and old text/audio ineligible", async () => {
    const f = await fixture();
    const [translated] = await db.query("INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status) VALUES (?, 'en', 'Fixture', 'Fixture', 'Fixture', 1, 'READY')", [f.poi.poiId]);
    await db.query("INSERT INTO AUDIOS (translation_id, file_url, source_version, status) VALUES (?, '/fixture-only-not-a-real-audio.mp3', 1, 'AVAILABLE')", [translated.insertId]);
    await pois.save(actor, f.poi.poiId, { ...f.body, audioScript: "Nguồn mới", expectedVersion: 1 });
    const old = await service.get(actor, f.jobId);
    assert.equal(old.isCurrent, false); assert.equal(old.canRetry, false);
    assert.equal(old.translation.status, "READY"); assert.equal(old.translation.isCurrent, false);
    assert.equal(old.audio.status, "AVAILABLE"); assert.equal(old.audio.isCurrent, false);
    await assert.rejects(service.retry(actor, f.jobId), code("CONTENT_JOB_OUTDATED"));
    const current = await service.list(actor, { poiId: f.poi.poiId, currentOnly: true });
    assert.equal(current.total, 2); assert.ok(current.items.every(row => row.sourceVersion === 2));
    assert.equal(await auditCount(f.jobId), 0);
  });
  it("audit failure rolls back retry and retains the old FAILED error", async () => {
    const f = await fixture();
    await db.query("CREATE TRIGGER jobs_test_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced audit failure'");
    try { await assert.rejects(service.retry(actor, f.jobId)); }
    finally { await db.query("DROP TRIGGER jobs_test_fail_audit"); }
    const [rows] = await db.query("SELECT status, error_message FROM CONTENT_JOBS WHERE job_id = ?", [f.jobId]);
    assert.equal(rows[0].status, "FAILED"); assert.equal(rows[0].error_message, "provider details must remain private");
    assert.equal(await auditCount(f.jobId), 0);
  });
  it("two different editors retry concurrently: one acceptance, one conflict, one audit", async () => {
    const f = await fixture();
    const outcomes = await Promise.allSettled([service.retry(actor, f.jobId), service.retry(secondActor, f.jobId)]);
    assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
    assert.equal(outcomes.find(row => row.status === "rejected").reason.code, "CONTENT_JOB_NOT_FAILED");
    assert.equal(await auditCount(f.jobId), 1);
    assert.equal((await service.get(actor, f.jobId)).status, "PENDING");
  });
  it("retry/source-edit race checks the current version under the POI lock", async () => {
    const f = await fixture();
    const outcomes = await Promise.allSettled([
      service.retry(secondActor, f.jobId),
      pois.save(actor, f.poi.poiId, { ...f.body, description: "Nguồn cập nhật đồng thời", expectedVersion: 1 }),
    ]);
    assert.equal(outcomes[1].status, "fulfilled");
    const old = await service.get(actor, f.jobId); assert.equal(old.isCurrent, false); assert.equal(old.canRetry, false);
    if (outcomes[0].status === "rejected") {
      assert.equal(outcomes[0].reason.code, "CONTENT_JOB_OUTDATED"); assert.equal(await auditCount(f.jobId), 0);
    } else {
      assert.equal(outcomes[0].value.sourceVersion, 1); assert.equal(await auditCount(f.jobId), 1);
    }
    await assert.rejects(service.retry(actor, f.jobId), code("CONTENT_JOB_OUTDATED"));
  });
  it("writes recheck the account; inactive POIs do not add an undocumented retry restriction", async () => {
    const f = await fixture();
    await db.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [actor.userId]);
    try { await assert.rejects(service.retry(actor, f.jobId), code("FORBIDDEN")); }
    finally { await db.query("UPDATE USERS SET status = 'ACTIVE' WHERE user_id = ?", [actor.userId]); }
    assert.equal(await auditCount(f.jobId), 0);
    // fixture POI is INACTIVE; staff may still prepare its current content.
    assert.equal((await service.retry(actor, f.jobId)).status, "PENDING");
  });
  it("retry waiting behind a source-edit lock reads the committed version, not an older snapshot", async () => {
    const f = await fixture();
    const editor = await db.getConnection();
    let reachedParent;
    const reached = new Promise(resolve => { reachedParent = resolve; });
    const proxy = { getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => {
        if (String(args[0]).startsWith("SELECT content_version FROM POIS")) reachedParent();
        return connection.query(...args);
      }, beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(),
      rollback: () => connection.rollback(), release: () => connection.release() };
    } };
    const retryService = new ContentJobService(new ContentJobStore(proxy));
    try {
      await editor.beginTransaction();
      // Model a committed source edit while retry is blocked on its parent row.
      await editor.query("UPDATE POIS SET content_version = 2 WHERE poi_id = ?", [f.poi.poiId]);
      const rejected = assert.rejects(retryService.retry(secondActor, f.jobId), code("CONTENT_JOB_OUTDATED"));
      await reached;
      await editor.commit();
      await rejected;
      assert.equal((await service.get(actor, f.jobId)).status, "FAILED");
      assert.equal(await auditCount(f.jobId), 0);
    } finally { await editor.rollback(); editor.release(); }
  });
  it("missing resources are 404 and reads never change task or audit", async () => {
    const f = await fixture();
    await service.get(actor, f.jobId); await service.list(actor, { poiId: f.poi.poiId });
    assert.equal((await service.get(actor, f.jobId)).status, "FAILED"); assert.equal(await auditCount(f.jobId), 0);
    await assert.rejects(service.get(actor, 2147483647), code("CONTENT_JOB_NOT_FOUND"));
    await assert.rejects(service.retry(actor, 2147483647), code("CONTENT_JOB_NOT_FOUND"));
  });
  it("HTTP rejects guest/revoked internal sessions and returns 202 for a real internal retry", async () => {
    const f = await fixture();
    const login = await auth.login({ email: "jobs-staff@example.invalid", password: "JobsTestPassword123" });
    const request = token => fetch(base + "/" + f.jobId + "/retry", { method: "POST", headers: {
      "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: "{}" });
    assert.equal((await request()).status, 401); assert.equal((await request("a".repeat(64))).status, 401);
    const accepted = await request(login.accessToken); assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).data.status, "PENDING");
    assert.equal((await request(login.accessToken)).status, 409);
    await auth.logout({ refreshToken: login.refreshToken });
    assert.equal((await request(login.accessToken)).status, 401);
  });
});
