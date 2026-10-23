const { it } = require("node:test");
const assert = require("node:assert/strict");
const { AuditService } = require("../services/audit.service");
const { filters, ACTIONS } = require("../services/audit.validation");
const { project } = require("../services/audit-details");
const AppError = require("../utils/app-error");
const admin = { userId: 1, role: "ADMIN", status: "ACTIVE" };
it("knowledge audit actions are filterable and expose only approved processing metadata", () => {
  for (const action of ["CREATE_KNOWLEDGE_DOCUMENT", "UPDATE_KNOWLEDGE_DOCUMENT", "DEACTIVATE_KNOWLEDGE_DOCUMENT", "PUBLISH_KNOWLEDGE_DOCUMENT", "FAIL_KNOWLEDGE_PROCESSING"]) {
    assert.equal(filters({ action }).action, action);
    const projected = project(action, { contentVersion: 2, content: "PRIVATE_CONTENT", apiKey: "PRIVATE_KEY" });
    assert.deepEqual(projected.details, { contentVersion: 2 }); assert.equal(projected.detailsOmitted, true);
  }
  assert.deepEqual(project("PUBLISH_KNOWLEDGE_DOCUMENT", { contentVersion: 2, chunkCount: 3, embeddingModel: "mock-embedding-v1" }).details,
    { contentVersion: 2, chunkCount: 3, embeddingModel: "mock-embedding-v1" });
  assert.deepEqual(project("FAIL_KNOWLEDGE_PROCESSING", { contentVersion: 2, code: "PROVIDER_UNAVAILABLE", message: "PRIVATE" }).details,
    { contentVersion: 2, code: "PROVIDER_UNAVAILABLE" });
});
it("audit defaults and supported actions are explicit without mutating filters", () => {
  assert.deepEqual(filters(), { from: null, to: null, action: null, page: 1, limit: 20 });
  const input = { page: "2", limit: "100", action: "UPDATE_TOUR", from: "2024-02-29T00:00:00Z", to: "2024-02-29T00:00:00Z" };
  assert.equal(filters(input).page, 2); assert.equal(input.page, "2"); assert.equal(new Set(ACTIONS).size, ACTIONS.length);
});
it("audit rejects malformed dates, invalid intervals, action and pagination rather than guessing", () => {
  for (const input of [null, [], { extra: 1 }, { from: "2025-02-29T00:00:00Z" }, { from: "2024-02-30T00:00:00Z" },
    { from: "2026-10-21" }, { from: "2026-10-21T00:00:00+07:00" }, { from: "2026-10-21T24:00:00Z" },
    { from: "2026-10-21T00:00:00.000Z" }, { from: "0999-01-01T00:00:00Z" }, { to: ["2026-10-21T00:00:00Z"] },
    { from: "2026-10-22T00:00:00Z", to: "2026-10-21T00:00:00Z" }, { action: "UNKNOWN_ACTION" },
    { action: "CREATE_TOUR' OR 1=1 --" }, { action: ["CREATE_TOUR"] }, { page: 0 }, { page: "01" }, { page: 100001 },
    { limit: 101 }, { limit: [20] }, { page: 1.2 }, { limit: true }]) {
    assert.throws(() => filters(input), error => error.status === 400 && error.code === "VALIDATION_ERROR");
  }
});
it("audit service enforces ADMIN before parsing or accessing Store", async () => {
  let reads = 0;
  const service = new AuditService({ list: () => { reads++; } });
  for (const actor of [undefined, { ...admin, userId: 0 }, { ...admin, userId: "1" },
    { ...admin, role: "STAFF" }, { ...admin, status: "LOCKED" }, { ...admin, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(service.list(actor, { action: "BAD" }), error => [401, 403].includes(error.status));
  }
  assert.equal(reads, 0);
});
it("audit invalid filters never reach Store and unknown storage errors become safe 503", async () => {
  let reads = 0;
  const service = new AuditService({ list: async () => { reads++; throw new AppError(409, "SQL_SECRET", "TEST hidden driver detail"); } });
  await assert.rejects(service.list(admin, { limit: 0 }), error => error.status === 400); assert.equal(reads, 0);
  await assert.rejects(service.list(admin), error => error.status === 503 && error.code === "AUDIT_LOGS_UNAVAILABLE" && !error.message.includes("SQL_SECRET"));
});
it("audit projects only permitted fields, preserves metadata and returns available actions", async () => {
  const raw = JSON.stringify({ sourceChanged: true, contentVersion: 3, password: "TEST_ONLY_SECRET", nested: { token: "TEST_ONLY_SECRET" } });
  const source = { logId: "9007199254740993", userId: null, action: "UPDATE_POI", details: raw };
  const service = new AuditService({ list: async () => ({ items: [source], total: 1, page: 1, limit: 20 }) });
  const result = await service.list(admin);
  assert.deepEqual(result.items[0].details, { sourceChanged: true, contentVersion: 3 });
  assert.equal(result.items[0].detailsOmitted, true); assert.equal(result.items[0].logId, source.logId);
  assert.ok(!JSON.stringify(result).includes("TEST_ONLY_SECRET")); assert.equal(source.details, raw);
  assert.deepEqual(result.actions, ACTIONS); assert.deepEqual(result.filters, { from: null, to: null, action: null });
});
it("audit hides free-form, malformed, unknown and wrongly typed details without failing the list", () => {
  for (const value of ["TEST_ONLY_SECRET", "{bad", "[]", "null", "123"]) assert.deepEqual(project("CREATE_STAFF", value), { details: null, detailsOmitted: true });
  assert.deepEqual(project("UNKNOWN_ACTION", '{"token":"TEST_ONLY_SECRET"}'), { details: null, detailsOmitted: true });
  assert.deepEqual(project("constructor", '{"token":"TEST_ONLY_SECRET"}'), { details: null, detailsOmitted: true });
  assert.deepEqual(project("UPDATE_POI", '{"contentVersion":"TEST_ONLY_SECRET","sourceChanged":true}').details, { sourceChanged: true });
  assert.deepEqual(project("CREATE_STAFF", null), { details: null, detailsOmitted: false });
  assert.equal(project("UPDATE_POI", '{"contentVersion":1,"sourceChanged":true}').detailsOmitted, false);
});
it("audit strips nested tour fields and rejects unsafe typed item values", () => {
  const raw = { items: [{ poiId: 2, sequenceNo: 1, token: "TEST_ONLY_SECRET" }], revision: "a".repeat(64), authCode: "TEST_ONLY_SECRET" };
  assert.deepEqual(project("UPDATE_TOUR", JSON.stringify(raw)).details, { revision: "a".repeat(64), items: [{ poiId: 2, sequenceNo: 1 }] });
  assert.deepEqual(project("CREATE_TOUR", '{"items":[{"poiId":"TEST_ONLY_SECRET","sequenceNo":1}]}').details, {});
});
it("audit supports safe payment, pipeline and seed fields without exposing access codes or claims", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  assert.deepEqual(project("CONFIRM_CASH_PAYMENT", JSON.stringify({ sessionId: id, amount: "50000.00", currency: "VND", token: "TEST_ONLY_SECRET" })).details,
    { sessionId: id, amount: "50000.00", currency: "VND" });
  assert.deepEqual(project("COMPLETE_CONTENT_JOB", '{"poiId":2,"provider":"MOCK","reused":false,"claimId":"TEST_ONLY_SECRET"}').details,
    { poiId: 2, provider: "MOCK", reused: false });
  assert.deepEqual(project("SEED_APPROVED_DEMO", '{"tourId":1,"poiIds":[1,2],"jobIds":[3,4]}').details, { tourId: 1, poiIds: [1,2], jobIds: [3,4] });
});
