const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { PoiService } = require("../services/poi.service");
const PoiStore = require("../stores/poi.store");
const SchemaStore = require("../stores/schema.store");
const validation = require("../services/poi.validation");
const AppError = require("../utils/app-error");
const staff = { userId: 1, user_id: 1, role: "STAFF", status: "ACTIVE" };
const input = () => ({ name: "Điểm minh họa", category: "PLANT", description: "Nội dung nguồn thử nghiệm.",
  audioScript: "Kịch bản đọc thử nghiệm.", latitude: 10.78, longitude: 106.70 });
const code = expected => error => error.code === expected;

// Keep real Router/Service/Store and transaction control; substitute only SQL
// execution. Real MySQL coverage lives in poi.integration.test.js.
function fixture() {
  const state = { pois: [], vi: [], jobs: [], audits: [], actor: { ...staff }, failAudit: false, nextId: 1, committed: 0, rolledBack: 0 };
  const languages = ["vi", "en"];
  function joined(row) {
    if (!row) return undefined;
    const vi = state.vi.find(item => item.poiId === row.poiId) || {};
    return { ...row, ...vi };
  }
  const db = { async query(sql, p = []) {
    if (sql.startsWith("SELECT * FROM USERS")) return [[{ ...state.actor }]];
    if (sql.startsWith("SELECT poi_id")) return [state.pois.filter(row => row.poiId === p[0]).map(row => ({ poi_id: row.poiId, status: row.status }))];
    if (sql.startsWith("SELECT p.poi_id")) {
      if (sql.includes("WHERE p.poi_id")) return [[joined(state.pois.find(row => row.poiId === p[0]))].filter(Boolean)];
      const rows = state.pois.filter(row => (!p[0] || row.category === p[0]) && (!p[2] || row.status === p[2]));
      return [rows.sort((a, b) => a.displayOrder - b.displayOrder || a.poiId - b.poiId).slice(p[5], p[5] + p[4]).map(joined)];
    }
    if (sql.startsWith("SELECT COUNT(*)")) return [[{ total: state.pois.filter(row => (!p[0] || row.category === p[0]) && (!p[2] || row.status === p[2])).length }]];
    if (sql.startsWith("INSERT INTO POIS") || sql.startsWith("UPDATE POIS SET name")) {
      const isNew = sql.startsWith("INSERT"), id = isNew ? state.nextId++ : p[11];
      const row = { poiId: id, name: p[0], category: p[1], conservationStatus: p[2], activityHours: p[3], latitude: p[4], longitude: p[5], triggerRadius: p[6], avatarUrl: p[7], displayOrder: p[8], status: p[9], contentVersion: p[10] };
      if (isNew) state.pois.push(row); else Object.assign(state.pois.find(item => item.poiId === id), row);
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (sql.startsWith("INSERT INTO POI_TRANSLATIONS")) {
      let row = state.vi.find(item => item.poiId === p[0]);
      if (!row) { row = { poiId: p[0] }; state.vi.push(row); }
      Object.assign(row, { description: p[2], audioScript: p[3], sourceVersion: p[4], translatedName: p[1] });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("INSERT INTO CONTENT_JOBS")) {
      for (const language of languages) {
        if (!state.jobs.some(job => job.poiId === p[0] && job.language === language && job.version === p[1])) state.jobs.push({ poiId: p[0], language, version: p[1], status: "PENDING" });
      }
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("INSERT INTO AUDIT_LOGS")) {
      if (state.failAudit) throw new Error("forced audit failure");
      state.audits.push({ userId: p[0], action: p[1], resourceType: p[2], resourceId: p[3], details: p[4] });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("UPDATE POIS SET status")) {
      state.pois.find(row => row.poiId === p[0]).status = "INACTIVE";
      return [{ affectedRows: 1 }];
    }
    throw new Error("Unexpected POI test query: " + sql);
  }, async getConnection() {
    let snapshot;
    return { query: (...args) => db.query(...args), beginTransaction: async () => { snapshot = structuredClone(state); },
      commit: async () => { state.committed++; }, rollback: async () => { Object.assign(state, snapshot); state.rolledBack++; }, release() {} };
  } };
  return { state, service: new PoiService(new PoiStore(db)) };
}

it("missing POI deactivation maps to HTTP 404 in Service without writing", async () => {
  const f = fixture();
  await assert.rejects(f.service.deactivate(staff, 999), error => error.status === 404 && error.code === "POI_NOT_FOUND");
  assert.equal(f.state.audits.length, 0);
});

it("UC-13 create saves POI + Vietnamese source + jobs + audit in one transaction", async () => {
  const f = fixture(), result = await f.service.save(staff, null, input());
  assert.equal(result.triggerRadius, 30); assert.equal(result.status, "INACTIVE");
  assert.equal(result.contentVersion, 1); assert.equal(result.processing, "PENDING");
  assert.equal(f.state.vi[0].translatedName, result.name);
  assert.deepEqual(f.state.jobs.map(job => job.language), ["vi", "en"]);
  assert.equal(f.state.audits[0].action, "CREATE_POI"); assert.equal(f.state.committed, 1);
});
it("UC-13 source edit increments version and queues once; metadata-only edit reuses results", async () => {
  const f = fixture(), data = input();
  await f.service.save(staff, null, data);
  const metadata = { ...data, latitude: 10.79, triggerRadius: 25, category: "HERITAGE", conservationStatus: "Nội dung thử", activityHours: "Minh họa", expectedVersion: 1 };
  assert.equal((await f.service.save(staff, 1, metadata)).processing, "UNCHANGED");
  assert.equal(f.state.jobs.length, 2);
  const source = { ...metadata, name: "Tên nguồn mới", audioScript: "Kịch bản mới" };
  const result = await f.service.save(staff, 1, source);
  assert.equal(result.contentVersion, 2); assert.equal(f.state.jobs.length, 4);
  assert.equal(f.state.vi[0].translatedName, "Tên nguồn mới");
  await f.service.save(staff, 1, { ...source, expectedVersion: 2 });
  assert.equal(f.state.jobs.length, 4);
});
it("UC-13 rejects stale source versions before any write", async () => {
  const f = fixture(), data = input(); await f.service.save(staff, null, data);
  await f.service.save(staff, 1, { ...data, name: "Mới", expectedVersion: 1 });
  await assert.rejects(f.service.save(staff, 1, { ...data, expectedVersion: 1 }), code("POI_VERSION_CONFLICT"));
  assert.equal(f.state.pois[0].name, "Mới"); assert.equal(f.state.audits.length, 2);
});
it("UC-13 rolls back POI, source, jobs and audit together when audit insert fails", async () => {
  const f = fixture(); f.state.failAudit = true;
  await assert.rejects(f.service.save(staff, null, input()), /forced audit failure/);
  for (const key of ["pois", "vi", "jobs", "audits"]) assert.equal(f.state[key].length, 0);
  assert.equal(f.state.rolledBack, 1); assert.equal(f.state.committed, 0);
});
it("UC-13 rechecks current account state inside the write transaction", async () => {
  const f = fixture(); f.state.actor.status = "LOCKED";
  await assert.rejects(f.service.save(staff, null, input()), code("FORBIDDEN"));
  assert.equal(f.state.pois.length, 0);
});
it("UC-13 update audit failure restores old source, version, jobs and metadata", async () => {
  const f = fixture(); await f.service.save(staff, null, input());
  f.state.failAudit = true;
  await assert.rejects(f.service.save(staff, 1, { ...input(), name: "Không được giữ", category: "ANIMAL", expectedVersion: 1 }), /forced audit failure/);
  assert.equal(f.state.pois[0].name, input().name); assert.equal(f.state.pois[0].category, "PLANT");
  assert.equal(f.state.pois[0].contentVersion, 1); assert.equal(f.state.vi[0].translatedName, input().name);
  assert.equal(f.state.jobs.length, 2); assert.equal(f.state.audits.length, 1);
});
it("UC-13 deactivate audit failure restores ACTIVE status", async () => {
  const f = fixture(); await f.service.save(staff, null, { ...input(), status: "ACTIVE" }); f.state.failAudit = true;
  await assert.rejects(f.service.deactivate(staff, 1), /forced audit failure/);
  assert.equal(f.state.pois[0].status, "ACTIVE");
});
it("UC-13 deactivate is soft and repeatable; content, jobs and version survive", async () => {
  const f = fixture(); await f.service.save(staff, null, { ...input(), status: "ACTIVE" });
  const result = await f.service.deactivate(staff, 1);
  assert.equal(result.status, "INACTIVE"); assert.equal(result.contentVersion, 1);
  assert.equal(f.state.vi.length, 1); assert.equal(f.state.jobs.length, 2);
  await f.service.deactivate(staff, 1);
  assert.equal(f.state.audits.length, 2);
  await assert.rejects(f.service.deactivate(staff, 99), code("POI_NOT_FOUND"));
});
it("UC-13 list filters, paginates and returns missing detail as 404", async () => {
  const f = fixture(); await f.service.save(staff, null, input());
  await f.service.save(staff, null, { ...input(), category: "ANIMAL", status: "ACTIVE" });
  const result = await f.service.list(staff, { category: "ANIMAL", status: "ACTIVE", limit: "1" });
  assert.equal(result.total, 1); assert.equal(result.items[0].poiId, 2);
  await assert.rejects(f.service.get(staff, "99"), code("POI_NOT_FOUND"));
});
it("POI input rejects invalid coordinates, radius, category, status, URLs, IDs and injected fields", () => {
  for (const fields of [{ latitude: 91 }, { longitude: -181 }, { triggerRadius: 0 }, { triggerRadius: 1.5 },
    { latitude: "10.78" }, { category: "TEMPLE" }, { status: "READY" }, { avatarUrl: "javascript:alert(1)" },
    { avatarUrl: "//untrusted.test/a" }, { contentVersion: 10 }, { description: " " }, { audioScript: null }]) {
    assert.throws(() => validation.poi({ ...input(), ...fields }), code("VALIDATION_ERROR"));
  }
  assert.throws(() => validation.poi(input(), true), code("VALIDATION_ERROR"));
  for (const value of ["1 OR 1=1", "1.2", -1, [1], null]) assert.throws(() => validation.id(value), code("VALIDATION_ERROR"));
  assert.throws(() => validation.filters({ limit: 101 }), code("VALIDATION_ERROR"));
});
it("migration 003 resumes and reruns without replacing old radius or classification", async () => {
  const columns = new Set(["category"]), calls = [];
  const schema = new SchemaStore({ query: async (sql, params) => {
    if (sql.startsWith("SHOW TABLES")) return [[{ table: "POIS" }]];
    if (sql.startsWith("SHOW COLUMNS")) return [columns.has(params[0]) ? [{}] : []];
    calls.push(sql); const match = sql.match(/ADD COLUMN (\w+)/); if (match) columns.add(match[1]);
    return [{}];
  } });
  await schema.migratePois(); await schema.migratePois();
  assert.equal(calls.filter(sql => sql.includes("ADD COLUMN")).length, 2);
  assert.equal(calls.some(sql => /UPDATE|DELETE|DROP/i.test(sql)), false);
  assert.equal(calls.filter(sql => sql.includes("trigger_radius SET DEFAULT 30")).length, 2);
});
it("POI HTTP routes require internal STAFF/ADMIN; guest tokens fail", async t => {
  const f = fixture();
  const { createApp } = require("../server");
  const app = createApp({ poiService: f.service, authService: { authenticate: async token => {
    if (token === "staff" || token === "admin") return { ...staff, role: token.toUpperCase() };
    if (token === "visitor") return { ...staff, role: "TOURIST" };
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ.");
  } } });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/admin/pois`;
  const request = (method, suffix = "", body, token) => fetch(url + suffix, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal((await request("GET")).status, 401);
  assert.equal((await request("GET", "", undefined, "guest-random")).status, 401);
  assert.equal((await request("GET", "", undefined, "visitor")).status, 403);
  const created = await request("POST", "", input(), "staff"); assert.equal(created.status, 201);
  assert.equal((await created.json()).data.triggerRadius, 30);
  assert.equal((await request("GET", "/1", undefined, "admin")).status, 200);
  assert.equal((await request("GET", "/0", undefined, "staff")).status, 400);
  assert.equal((await request("GET", "/999", undefined, "staff")).status, 404);
  const updated = await request("PUT", "/1", { ...input(), status: "ACTIVE", expectedVersion: 1 }, "staff");
  assert.equal(updated.status, 200);
  assert.equal((await request("POST", "/1/deactivate", {}, "staff")).status, 200);
  assert.equal((await request("DELETE", "/1", undefined, "admin")).status, 404);
});
