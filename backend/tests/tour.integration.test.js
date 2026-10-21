const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const TourStore = require("../stores/tour.store");
const { TourService } = require("../services/tour.service");

describe("UC-14.1 real MySQL: create/read, transaction guards and existing bundle", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  const database = "tcv_tour_test_" + randomUUID().replaceAll("-", "");
  const jwtConfig = { secret: "tour-integration-test-only-secret-at-least-32-bytes", issuer: "food-tour-api",
    audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 86400000 };
  let admin, db, service, auth, staff, administrator, staffToken, adminToken, server, base;
  const credentials = email => ({ email, password: "TourTestOnlyPassword1!" });
  const request = (route, body, token = staffToken, method) => fetch(base + route, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000)
  });
  async function poi(status = "ACTIVE") {
    const [result] = await db.query("INSERT INTO POIS (name, latitude, longitude, status) VALUES (?, 10, 106, ?)", ["TEST tour POI " + randomUUID(), status]);
    return result.insertId;
  }
  async function input(name = "TEST tour " + randomUUID()) {
    return { name, description: "Fixture riêng, không phải tour chính thức.", items: [{ poiId: await poi(), sequenceNo: 2 }, { poiId: await poi(), sequenceNo: 1 }] };
  }
  async function counts() {
    const [rows] = await db.query("SELECT (SELECT COUNT(*) FROM TOURS) AS tours, (SELECT COUNT(*) FROM TOUR_POIS) AS items, (SELECT COUNT(*) FROM AUDIT_LOGS WHERE action='CREATE_TOUR') AS audits, (SELECT COUNT(*) FROM AUDIT_LOGS WHERE action='UPDATE_TOUR') AS updates");
    return rows[0];
  }
  async function guest() {
    const sessionId = randomUUID(), token = "tcv_visit_" + randomBytes(32).toString("hex"), hash = createHash("sha256").update(token).digest("hex");
    await db.query("INSERT INTO VISIT_SESSIONS (session_id,status,token_hash,activated_at,expires_at) VALUES (?,'ACTIVE',?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [sessionId, hash]);
    await db.query("INSERT INTO PAYMENTS (payment_ref,session_id,payment_method,amount,status,paid_at) VALUES (?,?,'CASH',50000,'PAID',UTC_TIMESTAMP())", [randomUUID(), sessionId]);
    return { sessionId, token };
  }
  async function bundle(person, language = "vi") {
    const response = await request("/api/content/bundle?languageCode=" + language, undefined, person.token);
    assert.equal(response.status, 200); return (await response.json()).data;
  }
  before(async () => {
    const mysql = require("mysql2/promise");
    const connection = { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectTimeout: 3000 };
    admin = await mysql.createConnection(connection);
    assert.match(database, /^tcv_tour_test_[a-f0-9]{32}$/); assert.notEqual(database, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    db = mysql.createPool({ ...connection, database, multipleStatements: true, connectionLimit: 8 });
    await db.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store"), UserStore = require("../stores/user.store"), RefreshTokenStore = require("../stores/refresh_token.store");
    const bcrypt = require("bcrypt");
    auth = new AuthService({ authStore: new AuthStore(db), users: new UserStore(db), tokens: new RefreshTokenStore(db),
      config: () => jwtConfig, passwordHasher: { hash: value => bcrypt.hash(value, 4), compare: bcrypt.compare } });
    const adminInput = credentials("tour-admin@example.invalid"), staffInput = credentials("tour-staff@example.invalid");
    const adminId = (await auth.bootstrapAdmin(adminInput)).userId;
    const staffId = (await auth.createStaff(adminId, staffInput)).userId;
    administrator = { userId: adminId, role: "ADMIN", status: "ACTIVE" }; staff = { userId: staffId, role: "STAFF", status: "ACTIVE" };
    adminToken = (await auth.login(adminInput)).accessToken; staffToken = (await auth.login(staffInput)).accessToken;
    service = new TourService(new TourStore(db));
    const { createApp } = require("../server");
    const { ContentService } = require("../services/content.service"), ContentStore = require("../stores/content.store");
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store");
    server = http.createServer(createApp({ authService: auth, tourService: service,
      paymentService: new PaymentService(new PaymentStore(db)), contentService: new ContentService(new ContentStore(db)) }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end();
    if (admin) await admin.end(); // Retain this uniquely named fixture DB for evidence.
    await require("../config/database").end();
  });
  it("STAFF creates and reads a tour with ordered POIs and one audit; ADMIN can also read/create", async () => {
    const data = await input();
    const response = await request("/api/admin/tours", data);
    assert.equal(response.status, 201); assert.equal(response.headers.get("cache-control"), "no-store");
    const created = (await response.json()).data;
    assert.equal(created.name, data.name); assert.deepEqual(created.items.map(item => item.sequenceNo), [1, 2]);
    assert.deepEqual(created.items.map(item => item.poiId), [data.items[1].poiId, data.items[0].poiId]);
    const detail = await request("/api/admin/tours/" + created.tourId, undefined, adminToken);
    assert.deepEqual((await detail.json()).data, created);
    const [audits] = await db.query("SELECT user_id,resource_type,resource_id,details FROM AUDIT_LOGS WHERE action='CREATE_TOUR' AND resource_id=?", [String(created.tourId)]);
    assert.equal(audits.length, 1); assert.equal(audits[0].user_id, staff.userId); assert.equal(audits[0].resource_type, "TOURS");
    assert.ok(!JSON.stringify(audits).includes(staffToken));
    assert.equal((await request("/api/admin/tours", await input(), adminToken)).status, 201);
  });
  it("listing is paginated and unknown/missing/invalid resources are safe", async () => {
    const listed = await request("/api/admin/tours?page=1&limit=1");
    const result = (await listed.json()).data;
    assert.equal(listed.status, 200); assert.equal(result.items.length, 1); assert.ok(result.total >= 2);
    assert.equal(result.page, 1); assert.equal(result.limit, 1);
    assert.equal((await request("/api/admin/tours/2147483647")).status, 404);
    assert.equal((await request("/api/admin/tours/1%20OR%201=1")).status, 400);
    assert.equal((await request("/api/admin/tours?limit=101")).status, 400);
    assert.equal((await request("/api/admin/tours/1", {}, staffToken, "PUT")).status, 400);
    assert.equal((await request("/api/admin/tours/1", {}, staffToken, "PATCH")).status, 404);
    assert.equal((await request("/api/admin/tours/1", undefined, staffToken, "DELETE")).status, 404);
  });
  it("HTTP rejects missing, invalid, visitor, expired and revoked tokens without writes", async () => {
    const data = await input(), beforeCount = await counts();
    const jwt = require("jsonwebtoken"), decoded = jwt.decode(staffToken);
    const expired = jwt.sign({ ...decoded, exp: Math.floor(Date.now() / 1000) - 60 }, jwtConfig.secret);
    for (const token of [null, "invalid", "tcv_visit_" + "a".repeat(64), expired]) {
      assert.equal((await request("/api/admin/tours", data, token)).status, 401);
      assert.equal((await request("/api/admin/tours", undefined, token)).status, 401);
      assert.equal((await request("/api/admin/tours/1", data, token, "PUT")).status, 401);
    }
    const fresh = await auth.login(credentials("tour-staff@example.invalid"));
    await auth.logout({ refreshToken: fresh.refreshToken });
    assert.equal((await request("/api/admin/tours", data, fresh.accessToken)).status, 401);
    assert.equal((await request("/api/admin/tours/1", data, fresh.accessToken, "PUT")).status, 401);
    assert.deepEqual(await counts(), beforeCount);
  });
  it("malformed, missing or inactive POIs never create partial tours", async () => {
    const data = await input(), beforeCount = await counts();
    for (const invalid of [{ ...data, name: " " }, { ...data, items: [] },
      { ...data, items: [data.items[0], data.items[0]] },
      { ...data, items: [{ poiId: data.items[0].poiId, sequenceNo: 0 }] }]) {
      assert.equal((await request("/api/admin/tours", invalid)).status, 400);
    }
    for (const poiId of [2147483647, await poi("INACTIVE")]) {
      const rejected = await request("/api/admin/tours", { ...data, items: [{ poiId, sequenceNo: 1 }] });
      assert.equal(rejected.status, 409); assert.equal((await rejected.json()).code, "TOUR_POIS_UNAVAILABLE");
    }
    assert.deepEqual(await counts(), beforeCount);
  });
  for (const table of ["TOURS", "TOUR_POIS", "AUDIT_LOGS"]) {
    it("MySQL failure in " + table + " rolls back tour, order and audit", async () => {
      const data = await input(), beforeCount = await counts();
      await db.query(`CREATE TRIGGER tour_test_fail BEFORE INSERT ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced tour failure'`);
      try {
        const response = await request("/api/admin/tours", data);
        assert.equal(response.status, 503);
        const failure = await response.json(); assert.equal(failure.code, "TOUR_SAVE_UNAVAILABLE");
        assert.ok(!JSON.stringify(failure).includes("forced tour failure"));
      } finally { await db.query("DROP TRIGGER tour_test_fail"); }
      assert.deepEqual(await counts(), beforeCount);
    });
  }
  it("the current actor is rechecked inside the write transaction", async () => {
    const data = await input(), beforeCount = await counts();
    await db.query("UPDATE USERS SET status='LOCKED' WHERE user_id=?", [staff.userId]);
    try { await assert.rejects(service.create(staff, data), error => error.status === 403); }
    finally { await db.query("UPDATE USERS SET status='ACTIVE' WHERE user_id=?", [staff.userId]); }
    assert.deepEqual(await counts(), beforeCount);
  });
  it("concurrent creates sharing POIs retain independent complete tour orders", async () => {
    const data = await input(), beforeCount = await counts();
    const results = await Promise.all([service.create(staff, data), service.create(administrator, { ...data, items: [...data.items].reverse() })]);
    assert.notEqual(results[0].tourId, results[1].tourId);
    assert.deepEqual(results[0].items, results[1].items);
    const afterCount = await counts();
    assert.equal(afterCount.tours - beforeCount.tours, 2); assert.equal(afterCount.items - beforeCount.items, 4); assert.equal(afterCount.audits - beforeCount.audits, 2);
  });
  it("POI deactivation committed while creation waits is rechecked before saving", { timeout: 15000 }, async () => {
    const data = await input(), beforeCount = await counts(), blocker = await db.getConnection();
    let entered;
    const lockRead = new Promise(resolve => { entered = resolve; });
    const gated = new TourStore({ getConnection: async () => {
      const connection = await db.getConnection();
      return { beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(), rollback: () => connection.rollback(),
        release: () => connection.release(), destroy: () => connection.destroy(), query: (sql, values) => {
          if (sql.includes("FROM POIS") && sql.includes("FOR UPDATE")) entered();
          return connection.query(sql, values);
        } };
    } });
    let pending;
    try {
      await blocker.beginTransaction();
      await blocker.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id=?", [data.items[0].poiId]);
      pending = new TourService(gated).create(staff, data);
      const settled = pending.then(() => null, error => error);
      await lockRead;
      await blocker.commit();
      assert.equal((await settled).code, "TOUR_POIS_UNAVAILABLE");
    } finally { await blocker.rollback(); blocker.release(); if (pending) await pending.catch(() => {}); }
    assert.deepEqual(await counts(), beforeCount);
  });
  it("lost commit acknowledgment keeps the saved tour and allows read-back without automatic re-create", async () => {
    const data = await input(), beforeCount = await counts();
    const uncertainStore = new TourStore({ getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw Object.assign(new Error("lost commit acknowledgment"), { code: "ECONNRESET" }); },
        rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } });
    await assert.rejects(new TourService(uncertainStore).create(staff, data), error => error.code === "TOUR_SAVE_UNAVAILABLE");
    const afterCount = await counts(); assert.equal(afterCount.tours - beforeCount.tours, 1); assert.equal(afterCount.audits - beforeCount.audits, 1);
    const [rows] = await db.query("SELECT tour_id FROM TOURS WHERE name=?", [data.name]);
    assert.equal(rows.length, 1); assert.equal((await service.get(staff, rows[0].tour_id)).name, data.name);
  });
  it("existing authenticated bundle includes new tour order and filters inactive points/empty tours", async () => {
    const data = await input(), created = await service.create(staff, data);
    const sessionId = randomUUID(), token = "tcv_visit_" + randomBytes(32).toString("hex"), hash = createHash("sha256").update(token).digest("hex");
    await db.query("INSERT INTO VISIT_SESSIONS (session_id,status,token_hash,activated_at,expires_at) VALUES (?,'ACTIVE',?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [sessionId, hash]);
    await db.query("INSERT INTO PAYMENTS (payment_ref,session_id,payment_method,amount,status,paid_at) VALUES (?,?,'CASH',50000,'PAID',UTC_TIMESTAMP())", [randomUUID(), sessionId]);
    const bundle = async () => {
      const response = await request("/api/content/bundle?languageCode=vi", undefined, token);
      assert.equal(response.status, 200); return (await response.json()).data;
    };
    let result = await bundle();
    assert.deepEqual(result.tours.find(tour => tour.tourId === created.tourId).items, [...data.items].sort((a, b) => a.sequenceNo - b.sequenceNo));
    await db.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id=?", [data.items[0].poiId]);
    result = await bundle(); assert.equal(result.tours.find(tour => tour.tourId === created.tourId).items.length, 1);
    await db.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id=?", [data.items[1].poiId]);
    result = await bundle(); assert.ok(!result.tours.some(tour => tour.tourId === created.tourId));
    assert.equal((await request("/api/admin/tours", undefined, token)).status, 401);
  });
  it("create normalizes sparse submitted sequence numbers to stored 1..N as Word 4.4.4 requires", async () => {
    const data = await input(); data.items[0].sequenceNo = 90; data.items[1].sequenceNo = 10;
    const created = await service.create(staff, data);
    assert.deepEqual(created.items.map(item => [item.poiId, item.sequenceNo]), [[data.items[1].poiId, 1], [data.items[0].poiId, 2]]);
    const [rows] = await db.query("SELECT sequence_no FROM TOUR_POIS WHERE tour_id=? ORDER BY sequence_no", [created.tourId]);
    assert.deepEqual(rows.map(row => row.sequence_no), [1, 2]);
  });
  it("PUT keeps tour_id/createdAt and atomically swaps, adds and removes ordered POIs with an audit", async () => {
    const created = await service.create(staff, await input()), beforeCount = await counts(), extra = await poi();
    const firstBody = { name: "TEST edited tour", description: null, expectedRevision: created.revision,
      items: [{ poiId: created.items[1].poiId, sequenceNo: 10 }, { poiId: created.items[0].poiId, sequenceNo: 20 }, { poiId: extra, sequenceNo: 30 }] };
    const response = await request("/api/admin/tours/" + created.tourId, firstBody, staffToken, "PUT");
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    const updated = (await response.json()).data;
    assert.equal(updated.tourId, created.tourId); assert.equal(updated.createdAt, created.createdAt.toISOString());
    assert.equal(updated.name, firstBody.name); assert.equal(updated.description, null); assert.notEqual(updated.revision, created.revision);
    assert.deepEqual(updated.items.map(item => [item.poiId, item.sequenceNo]), [[created.items[1].poiId, 1], [created.items[0].poiId, 2], [extra, 3]]);
    const [audit] = await db.query("SELECT user_id,details FROM AUDIT_LOGS WHERE action='UPDATE_TOUR' AND resource_id=?", [String(created.tourId)]);
    assert.equal(audit.length, 1); assert.equal(audit[0].user_id, staff.userId);
    assert.equal(JSON.parse(audit[0].details).previousRevision, created.revision);
    assert.equal(JSON.parse(audit[0].details).revision, updated.revision);
    const removed = await service.update(administrator, created.tourId, { name: updated.name, expectedRevision: updated.revision,
      items: [{ poiId: extra, sequenceNo: 50 }] });
    assert.deepEqual(removed.items.map(item => [item.poiId, item.sequenceNo]), [[extra, 1]]);
    const afterCount = await counts(); assert.equal(afterCount.tours, beforeCount.tours); assert.equal(afterCount.updates - beforeCount.updates, 2);
  });
  it("PUT rejects missing revision, stale content, missing tours and invalid POIs without altering data", async () => {
    const created = await service.create(staff, await input()), beforeCount = await counts();
    const body = { name: "TEST rejected edit", expectedRevision: created.revision, items: [{ poiId: created.items[0].poiId, sequenceNo: 1 }] };
    assert.equal((await request("/api/admin/tours/" + created.tourId, { ...body, expectedRevision: undefined }, staffToken, "PUT")).status, 400);
    assert.equal((await request("/api/admin/tours/2147483647", body, staffToken, "PUT")).status, 404);
    const stale = await request("/api/admin/tours/" + created.tourId, { ...body, expectedRevision: "0".repeat(64) }, staffToken, "PUT");
    assert.equal(stale.status, 409); assert.equal((await stale.json()).code, "TOUR_REVISION_CONFLICT");
    for (const poiId of [2147483647, await poi("INACTIVE")]) {
      const unavailable = await request("/api/admin/tours/" + created.tourId, { ...body, items: [{ poiId, sequenceNo: 1 }] }, staffToken, "PUT");
      assert.equal(unavailable.status, 409); assert.equal((await unavailable.json()).code, "TOUR_POIS_UNAVAILABLE");
    }
    assert.deepEqual(await service.get(staff, created.tourId), created); assert.deepEqual(await counts(), beforeCount);
  });
  for (const table of ["TOURS", "TOUR_POIS", "AUDIT_LOGS"]) {
    it("UPDATE rollback restores original content/order/revision after a failure in " + table, async () => {
      const created = await service.create(staff, await input()), beforeCount = await counts();
      const body = { name: "TEST must roll back", expectedRevision: created.revision,
        items: [...created.items].reverse().map((item, index) => ({ poiId: item.poiId, sequenceNo: index + 1 })) };
      const event = table === "TOURS" ? "UPDATE" : "INSERT";
      const action = table === "TOUR_POIS" ? "BEGIN IF NEW.sequence_no = 2 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced partial replacement'; END IF; END" : "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced update failure'";
      await db.query(`CREATE TRIGGER tour_update_fail BEFORE ${event} ON ${table} FOR EACH ROW ${action}`);
      try {
        const response = await request("/api/admin/tours/" + created.tourId, body, staffToken, "PUT");
        assert.equal(response.status, 503); assert.equal((await response.json()).code, "TOUR_SAVE_UNAVAILABLE");
      } finally { await db.query("DROP TRIGGER tour_update_fail"); }
      assert.deepEqual(await service.get(staff, created.tourId), created); assert.deepEqual(await counts(), beforeCount);
    });
  }
  it("two real editors with one revision produce one success and one conflict, never a mixed order", async () => {
    const created = await service.create(staff, await input()), beforeCount = await counts();
    const drafts = ["TEST editor A", "TEST editor B"].map((name, index) => ({ name, expectedRevision: created.revision,
      items: (index ? [...created.items].reverse() : created.items).map((item, i) => ({ poiId: item.poiId, sequenceNo: i + 1 })) }));
    const responses = await Promise.all(drafts.map((body, index) => request("/api/admin/tours/" + created.tourId, body, index ? adminToken : staffToken, "PUT")));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    const winner = responses.findIndex(response => response.status === 200), loser = 1 - winner;
    assert.equal((await responses[loser].json()).code, "TOUR_REVISION_CONFLICT");
    const final = await service.get(staff, created.tourId);
    assert.equal(final.name, drafts[winner].name);
    assert.deepEqual(final.items.map(item => ({ poiId: item.poiId, sequenceNo: item.sequenceNo })), drafts[winner].items);
    const afterCount = await counts(); assert.equal(afterCount.updates - beforeCount.updates, 1); assert.equal(afterCount.tours, beforeCount.tours);
  });
  it("UPDATE checks the current actor in its transaction and restores content when forbidden", async () => {
    const created = await service.create(staff, await input());
    await db.query("UPDATE USERS SET status='LOCKED' WHERE user_id=?", [staff.userId]);
    try {
      await assert.rejects(service.update(staff, created.tourId, { ...created, items: created.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })) }), error => error.code === "VALIDATION_ERROR");
      await assert.rejects(service.update(staff, created.tourId, { name: "Rejected", expectedRevision: created.revision,
        items: created.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })) }), error => error.code === "FORBIDDEN");
    } finally { await db.query("UPDATE USERS SET status='ACTIVE' WHERE user_id=?", [staff.userId]); }
    assert.deepEqual(await service.get(staff, created.tourId), created);
  });
  it("UPDATE with a lost commit acknowledgment is read back; replaying its stale revision cannot write twice", async () => {
    const created = await service.create(staff, await input()), beforeCount = await counts();
    const body = { name: "TEST committed despite lost reply", expectedRevision: created.revision,
      items: created.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })) };
    const uncertain = new TourStore({ getConnection: async () => {
      const connection = await db.getConnection();
      return { query: (...args) => connection.query(...args), beginTransaction: () => connection.beginTransaction(),
        commit: async () => { await connection.commit(); throw Object.assign(new Error("lost update acknowledgment"), { code: "ECONNRESET" }); },
        rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy() };
    } });
    await assert.rejects(new TourService(uncertain).update(staff, created.tourId, body), error => error.code === "TOUR_SAVE_UNAVAILABLE");
    const saved = await service.get(staff, created.tourId); assert.equal(saved.name, body.name); assert.notEqual(saved.revision, body.expectedRevision);
    await assert.rejects(service.update(staff, created.tourId, body), error => error.code === "TOUR_REVISION_CONFLICT");
    const afterCount = await counts(); assert.equal(afterCount.updates - beforeCount.updates, 1); assert.equal(afterCount.tours, beforeCount.tours);
  });
  it("UPDATE waiting for a newly selected POI refuses its committed deactivation and retains the old tour", { timeout: 15000 }, async () => {
    const created = await service.create(staff, await input()), extra = await poi(), beforeCount = await counts();
    const blocker = await db.getConnection();
    let enter;
    const entered = new Promise(resolve => { enter = resolve; });
    const wrapped = new TourStore({ getConnection: async () => {
      const connection = await db.getConnection();
      return { beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(), rollback: () => connection.rollback(),
        release: () => connection.release(), destroy: () => connection.destroy(), query: (sql, args) => {
          if (typeof sql === "string" && sql.includes("FROM POIS") && sql.includes("FOR UPDATE")) enter();
          return connection.query(sql, args);
        } };
    } });
    let pending;
    try {
      await blocker.beginTransaction();
      await blocker.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id=?", [extra]);
      pending = new TourService(wrapped).update(staff, created.tourId, { name: "Must not replace old tour", expectedRevision: created.revision,
        items: [{ poiId: extra, sequenceNo: 1 }] }).then(() => null, error => error);
      await Promise.race([entered, pending.then(error => { throw error || new Error("Update finished before lock gate"); })]);
      await blocker.commit();
      assert.equal((await pending).code, "TOUR_POIS_UNAVAILABLE");
    } finally { await blocker.rollback(); blocker.release(); if (pending) await pending; }
    assert.deepEqual(await service.get(staff, created.tourId), created); assert.deepEqual(await counts(), beforeCount);
  });
  it("updated tour reaches VI/EN bundles; old bundle stays unchanged and inactive filtering retains relative sequence", async () => {
    const created = await service.create(staff, await input()), person = await guest(), oldBundle = await bundle(person);
    const third = await poi();
    const updated = await service.update(staff, created.tourId, { name: "TEST new shared tour", description: "Shared tour description", expectedRevision: created.revision,
      items: [{ poiId: third, sequenceNo: 40 }, { poiId: created.items[0].poiId, sequenceNo: 50 }, { poiId: created.items[1].poiId, sequenceNo: 60 }] });
    for (const language of ["vi", "en"]) {
      const current = (await bundle(person, language)).tours.find(tour => tour.tourId === created.tourId);
      assert.equal(current.name, updated.name); assert.equal(current.description, updated.description); assert.equal(current.localization, "SHARED");
      assert.deepEqual(current.items, updated.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })));
      assert.equal(current.revision, undefined);
    }
    assert.equal(oldBundle.tours.find(tour => tour.tourId === created.tourId).name, created.name);
    await db.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id=?", [third]);
    let publicTour = (await bundle(person)).tours.find(tour => tour.tourId === created.tourId);
    assert.deepEqual(publicTour.items.map(item => item.sequenceNo), [2, 3]);
    await db.query("UPDATE POIS SET status='INACTIVE' WHERE poi_id IN (?,?)", created.items.map(item => item.poiId));
    assert.ok(!(await bundle(person)).tours.some(tour => tour.tourId === created.tourId));
    const management = await service.get(staff, created.tourId);
    assert.equal(management.items.length, 3); assert.equal(management.revision, updated.revision);
  });
  it("tour changes do not bypass guest rights: staff JWT, invalid, expired, revoked and unpaid guests cannot fetch bundle", async () => {
    const person = await guest();
    for (const token of [null, "invalid", staffToken]) assert.equal((await request("/api/content/bundle?languageCode=vi", undefined, token)).status, 401);
    for (const state of ["expired", "revoked", "unpaid"]) {
      try {
        if (state === "expired") await db.query("UPDATE VISIT_SESSIONS SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE session_id=?", [person.sessionId]);
        if (state === "revoked") await db.query("UPDATE VISIT_SESSIONS SET status='REVOKED' WHERE session_id=?", [person.sessionId]);
        if (state === "unpaid") await db.query("UPDATE PAYMENTS SET status='PENDING',paid_at=NULL WHERE session_id=?", [person.sessionId]);
        assert.equal((await request("/api/content/bundle?languageCode=vi", undefined, person.token)).status, 401);
      } finally {
        await db.query("UPDATE VISIT_SESSIONS SET status='ACTIVE',expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE session_id=?", [person.sessionId]);
        await db.query("UPDATE PAYMENTS SET status='PAID',paid_at=UTC_TIMESTAMP() WHERE session_id=?", [person.sessionId]);
      }
    }
  });
  it("a bundle snapshot concurrent with PUT contains either complete old or complete new tour content", { timeout: 15000 }, async () => {
    const created = await service.create(staff, await input()), person = await guest();
    let enter, resume;
    const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { resume = resolve; });
    const wrapped = { getConnection: async () => {
      const connection = await db.getConnection();
      return { beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(), rollback: () => connection.rollback(),
        release: () => connection.release(), destroy: () => connection.destroy(), query: async (sql, args) => {
          const result = await connection.query(sql, args);
          if (typeof sql === "string" && sql.includes("FROM TOURS ORDER BY tour_id")) { enter(); await resumed; }
          return result;
        } };
    } };
    const { ContentService } = require("../services/content.service"), ContentStore = require("../stores/content.store");
    const { PaymentService } = require("../services/payment.service"), PaymentStore = require("../stores/payment.store");
    const visit = await new PaymentService(new PaymentStore(db)).authenticateVisitor(person.token);
    const pending = new ContentService(new ContentStore(wrapped)).getBundle(visit, { languageCode: "vi" }, person.token);
    let updated;
    try {
      await Promise.race([entered, pending.then(() => { throw new Error("Bundle finished before snapshot gate"); })]);
      updated = await service.update(administrator, created.tourId, { name: "TEST after snapshot", expectedRevision: created.revision,
        items: [...created.items].reverse().map((item, index) => ({ poiId: item.poiId, sequenceNo: index + 1 })) });
    } finally { resume(); }
    const during = (await pending).tours.find(tour => tour.tourId === created.tourId);
    assert.equal(during.name, created.name);
    assert.deepEqual(during.items, created.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })));
    const after = (await bundle(person)).tours.find(tour => tour.tourId === created.tourId);
    assert.equal(after.name, updated.name); assert.deepEqual(after.items, updated.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo })));
  });
});
