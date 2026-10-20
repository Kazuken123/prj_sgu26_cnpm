const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const AppError = require("../utils/app-error");
const { ContentJobService } = require("../services/content-job.service");
const validation = require("../services/content-job.validation");
const actor = { userId: 1, user_id: 1, role: "STAFF", status: "ACTIVE" };
function fixture(overrides = {}) {
  const state = { row: { jobId: 1, poiId: 2, languageCode: "en", sourceVersion: 3, currentVersion: 3,
    status: "FAILED", translationStatus: "READY", translationVersion: 2, audioStatus: "AVAILABLE", audioVersion: 2,
    error_message: "SELECT db_password=secret raw-token", ...overrides }, writes: 0, audits: 0, failAudit: false, currentActor: { ...actor } };
  const store = {
    get: async () => state.row,
    list: async filters => ({ items: state.row ? [state.row] : [], total: state.row ? 1 : 0, page: filters.page, limit: filters.limit }),
    withLockedJob: async (actorId, id, authorize, work) => {
      authorize(state.currentActor);
      const before = structuredClone(state);
      try { return await work({ job: state.row, enqueue: async () => {
        state.writes++; state.row.status = "PENDING"; state.row.error_message = null;
        if (state.failAudit) throw new Error("audit failed");
        state.audits++; return state.row;
      } }); } catch (error) { Object.assign(state, before); throw error; }
    },
  };
  return { state, service: new ContentJobService(store) };
}
const code = expected => error => error.code === expected;

it("Store retry conflict is mapped by Service and rolls back without audit", async () => {
  const ContentJobStore = require("../stores/content_job.store");
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"), commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"), release: () => calls.push("release"),
    query: async sql => {
      if (sql.startsWith("SELECT * FROM USERS")) return [[actor]];
      if (sql.startsWith("SELECT poi_id")) return [[{ poi_id: 2 }]];
      if (sql.startsWith("SELECT content_version")) return [[{ content_version: 3 }]];
      if (sql.startsWith("SELECT job_id")) return [[{ jobId: 1, poiId: 2, sourceVersion: 3, status: "FAILED" }]];
      if (sql.startsWith("UPDATE CONTENT_JOBS")) return [{ affectedRows: 0 }];
      throw new Error("Unexpected SQL: " + sql);
    },
  };
  const service = new ContentJobService(new ContentJobStore({ getConnection: async () => connection }));
  await assert.rejects(service.retry(actor, 1, {}), error => error.status === 409 && error.code === "CONTENT_JOB_CHANGED");
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});

it("UC-13 retry accepts only current FAILED, enqueues once and does not claim completion", async () => {
  const f = fixture();
  const result = await f.service.retry(actor, 1, {});
  assert.deepEqual(result, { jobId: 1, poiId: 2, languageCode: "en", sourceVersion: 3, currentVersion: 3, status: "PENDING", accepted: true });
  assert.equal(f.state.writes, 1); assert.equal(f.state.audits, 1); assert.equal(f.state.row.error_message, null);
  await assert.rejects(f.service.retry(actor, 1, {}), code("CONTENT_JOB_NOT_FAILED"));
  assert.equal(f.state.writes, 1); assert.equal(f.state.audits, 1);
});
it("UC-13 rejects PENDING, PROCESSING, COMPLETED and outdated FAILED without writing", async () => {
  for (const status of ["PENDING", "PROCESSING", "COMPLETED"]) {
    const f = fixture({ status }); await assert.rejects(f.service.retry(actor, 1), code("CONTENT_JOB_NOT_FAILED"));
    assert.equal(f.state.writes, 0);
  }
  const f = fixture({ sourceVersion: 2 });
  await assert.rejects(f.service.retry(actor, 1), code("CONTENT_JOB_OUTDATED"));
  assert.equal(f.state.writes, 0);
});
it("UC-13 missing jobs are 404 for reading and retrying", async () => {
  const f = fixture(); f.state.row = undefined;
  await assert.rejects(f.service.get(actor, 99), code("CONTENT_JOB_NOT_FOUND"));
  await assert.rejects(f.service.retry(actor, 99), code("CONTENT_JOB_NOT_FOUND"));
});
it("status distinguishes source versions, text and audio; provider errors are not exposed", async () => {
  const f = fixture(), result = await f.service.get(actor, 1);
  assert.equal(result.isCurrent, true); assert.equal(result.canRetry, true);
  assert.equal(result.translation.status, "READY"); assert.equal(result.translation.isCurrent, false);
  assert.equal(result.audio.status, "AVAILABLE"); assert.equal(result.audio.isCurrent, false);
  assert.equal(result.error.code, "CONTENT_PROCESSING_FAILED");
  assert.equal(/SELECT|db_password|raw-token|secret/.test(JSON.stringify(result)), false);
  const list = await f.service.list(actor, { poiId: "2", currentOnly: "true" });
  assert.equal(list.items[0].canRetry, true);
});
it("audio is not current when linked translation is from an old version", async () => {
  const f = fixture({ audioVersion: 3 }); assert.equal((await f.service.get(actor, 1)).audio.isCurrent, false);
});
it("UC-13 audit failure rolls retry status/error back; rights are rechecked inside transaction", async () => {
  const f = fixture(); f.state.failAudit = true;
  await assert.rejects(f.service.retry(actor, 1), /audit failed/);
  assert.equal(f.state.row.status, "FAILED"); assert.match(f.state.row.error_message, /raw-token/);
  assert.equal(f.state.writes, 0); assert.equal(f.state.audits, 0);
  f.state.currentActor.status = "LOCKED";
  await assert.rejects(f.service.retry(actor, 1), code("FORBIDDEN")); assert.equal(f.state.writes, 0);
});
it("input cannot choose retry status, source version, replacement text or invalid filters", async () => {
  for (const body of [null, [], "FAILED", { status: "PENDING" }, { sourceVersion: 3 }, { audioScript: "replacement" }]) {
    await assert.rejects(fixture().service.retry(actor, 1, body), code("VALIDATION_ERROR"));
  }
  for (const query of [{ status: "READY" }, { currentOnly: "1" }, { currentOnly: [] }, { page: 0 }, { limit: 101 },
    { poiId: "1 OR 1=1" }, { languageCode: "en'--" }, { languageCode: [] }]) {
    assert.throws(() => validation.filters(query), code("VALIDATION_ERROR"));
  }
  assert.deepEqual(validation.filters({ status: "FAILED", languageCode: "en", poiId: "2", currentOnly: "false" }),
    { page: 1, limit: 20, status: "FAILED", languageCode: "en", poiId: 2, currentOnly: false });
});
it("content-job HTTP requires internal permissions, validates input and returns 202 only when enqueued", async t => {
  const f = fixture();
  const { createApp } = require("../server");
  const app = createApp({ contentJobService: f.service, authService: { authenticate: async token => {
    if (token === "staff" || token === "admin") return { ...actor, role: token.toUpperCase() };
    if (token === "visitor") return { ...actor, role: "TOURIST" };
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ.");
  } } });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/admin/content-jobs`;
  const request = (method, suffix = "", body, token = "staff") => fetch(url + suffix, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal((await request("GET", "", undefined, null)).status, 401);
  assert.equal((await request("GET", "", undefined, "guest-random")).status, 401);
  assert.equal((await request("POST", "/1/retry", {}, "visitor")).status, 403);
  const read = await request("GET", "/1", undefined, "admin"); assert.equal(read.status, 200);
  assert.equal((await read.json()).data.canRetry, true); assert.equal(f.state.writes, 0);
  assert.equal((await request("GET", "?limit=101")).status, 400);
  assert.equal((await request("POST", "/0/retry", {})).status, 400);
  assert.equal((await request("POST", "/1/retry", { status: "COMPLETED" })).status, 400);
  const retry = await request("POST", "/1/retry", {}); assert.equal(retry.status, 202);
  assert.equal((await retry.json()).data.status, "PENDING");
  assert.equal((await request("POST", "/1/retry", {})).status, 409);
  assert.equal((await request("DELETE", "/1")).status, 404);
});
