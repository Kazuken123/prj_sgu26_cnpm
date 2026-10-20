const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const http = require("node:http");
require("dotenv").config({ quiet: true });

describe("US-F01 integration with the 16-table schema and a disposable MySQL database", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  let admin, pool, server, base, service, actorId, actorToken;
  const testDatabase = "food_tour_auth_test_" + randomUUID().replaceAll("-", "");
  const config = { secret: "integration-test-only-secret-at-least-32-bytes", issuer: "food-tour-api",
    audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 7 * 86400000 };
  const connection = {
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
    timezone: "Z", connectTimeout: 3000,
  };
  const credentials = email => ({ email, password: "SecurePassword123" });
  const request = (route, body, token) => fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  before(async () => {
    process.env.NODE_ENV = "test";
    const mysql = require("mysql2/promise");
    admin = await mysql.createConnection(connection);
    assert.match(testDatabase, /^food_tour_auth_test_[a-f0-9]{32}$/);
    assert.notEqual(testDatabase, process.env.DB_NAME);
    await admin.query("CREATE DATABASE `" + testDatabase + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    pool = mysql.createPool({ ...connection, database: testDatabase, connectionLimit: 10, multipleStatements: true });
    await pool.query(fs.readFileSync(path.resolve(__dirname, "../../database/init_db.sql"), "utf8"));
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    service = new AuthService({ authStore: new AuthStore(pool), users: new UserStore(pool),
      tokens: new RefreshTokenStore(pool), config: () => config });
    const administrator = credentials("integration-admin@example.com");
    actorId = (await service.bootstrapAdmin(administrator)).userId;
    actorToken = (await service.login(administrator)).accessToken;
    const { createApp } = require("../server");
    const { HealthService } = require("../services/health.service");
    const HealthStore = require("../stores/health.store");
    const healthRedis = process.env.RUN_REDIS_TESTS === "1" ? undefined : { ping: async () => {} };
    server = http.createServer(createApp({ authService: service, healthService: new HealthService(new HealthStore(pool, healthRedis)) }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (pool) await pool.end();
    if (admin) {
      // Only the generated database is removed, even when a setup/assertion fails.
      if (/^food_tour_auth_test_[a-f0-9]{32}$/.test(testDatabase) && testDatabase !== process.env.DB_NAME) {
        await admin.query("DROP DATABASE IF EXISTS `" + testDatabase + "`");
      }
      await admin.end();
    }
  });
  it("initializes 16 real tables and safely reruns the refresh-token migration", async () => {
    const [tables] = await pool.query("SHOW TABLES"); assert.equal(tables.length, 16);
    await service.createStaff(actorId, credentials("migration@example.com"));
    const migration = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/001_refresh_tokens.sql"), "utf8");
    await pool.query(migration); await pool.query(migration);
    assert.ok(await service.users.getUserByEmail("migration@example.com"));
    assert.equal((await request("/health/ready")).status, 200);
  });
  it("creates STAFF with audit, logs in, rotates and logs out using real persistence", async () => {
    const input = credentials("integration@example.com");
    const created = await request("/api/admin/staff", { ...input, role: "ADMIN", status: "LOCKED" }, actorToken);
    assert.equal(created.status, 201);
    const staffUser = (await created.json()).data;
    assert.equal(staffUser.role, "STAFF"); assert.equal(staffUser.status, "ACTIVE");
    const [audit] = await pool.query("SELECT * FROM AUDIT_LOGS WHERE action = 'CREATE_STAFF' AND resource_id = ?", [String(staffUser.userId)]);
    assert.equal(audit.length, 1); assert.equal(audit[0].user_id, actorId);
    assert.equal(JSON.stringify(audit).includes(input.password), false);
    const { data } = await (await request("/api/auth/login", input)).json();
    assert.ok(data.accessToken); assert.ok(data.refreshToken);
    const [rows] = await pool.query("SELECT token_hash FROM REFRESH_TOKENS WHERE user_id = ?", [data.user.id]);
    assert.equal(rows[0].token_hash, service.hashToken(data.refreshToken));
    assert.notEqual(rows[0].token_hash, data.refreshToken);
    const attempts = await Promise.all([
      request("/api/auth/refresh", { refreshToken: data.refreshToken }),
      request("/api/auth/refresh", { refreshToken: data.refreshToken }),
    ]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [200, 401]);
    const next = (await attempts.find(r => r.status === 200).json()).data;
    assert.equal((await request("/api/auth/logout", { refreshToken: next.refreshToken })).status, 204);
    assert.equal((await request("/api/auth/me", undefined, next.accessToken)).status, 401);
  });
  it("revokes old refresh history across Store instances and preserves another session", async () => {
    const input = credentials("rotation-history@example.com");
    await service.createStaff(actorId, input);
    const first = await service.login(input), other = await service.login(input);
    const second = await service.refresh({ refreshToken: first.refreshToken });
    const third = await service.refresh({ refreshToken: second.refreshToken });
    // Construct a fresh runtime: no in-memory history can be reused.
    const { AuthService } = require("../services/auth.service");
    const AuthStore = require("../stores/auth.store");
    const UserStore = require("../stores/user.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    const restarted = new AuthService({ authStore: new AuthStore(pool), users: new UserStore(pool),
      tokens: new RefreshTokenStore(pool), config: () => config });
    await assert.rejects(restarted.refresh({ refreshToken: first.refreshToken }), error => error.status === 401);
    await restarted.logout({ refreshToken: first.refreshToken });
    await restarted.logout({ refreshToken: first.refreshToken });
    for (const access of [first.accessToken, second.accessToken, third.accessToken]) {
      await assert.rejects(restarted.authenticate(access), error => error.code === "SESSION_REVOKED");
    }
    await assert.rejects(restarted.refresh({ refreshToken: third.refreshToken }), error => error.status === 401);
    assert.ok(await restarted.authenticate(other.accessToken));
    assert.ok((await restarted.refresh({ refreshToken: other.refreshToken })).accessToken);
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM REFRESH_TOKENS WHERE user_id = ?", [first.user.id]);
    assert.equal(rows[0].count, 1);
  });
  it("upgrades the legacy token table without losing active sessions and safely reruns", async () => {
    const SchemaStore = require("../stores/schema.store");
    const input = credentials("history-migration@example.com");
    await service.createStaff(actorId, input);
    const login = await service.login(input);
    // This suite owns a disposable database. Dropping the new column models 001.
    await pool.query("ALTER TABLE REFRESH_TOKENS DROP COLUMN rotated_token_hashes");
    await new SchemaStore(pool).migrateRefreshTokens();
    await new SchemaStore(pool).migrateRefreshTokens();
    assert.ok(await service.authenticate(login.accessToken));
    const next = await service.refresh({ refreshToken: login.refreshToken });
    await service.logout({ refreshToken: login.refreshToken });
    await assert.rejects(service.authenticate(next.accessToken), error => error.code === "SESSION_REVOKED");
  });
  it("concurrent refresh and logout using the old refresh token leave no usable session", async () => {
    const input = credentials("logout-race@example.com");
    await service.createStaff(actorId, input);
    const first = await service.login(input);
    const outcomes = await Promise.allSettled([
      service.refresh({ refreshToken: first.refreshToken }),
      service.logout({ refreshToken: first.refreshToken }),
    ]);
    assert.equal(outcomes[1].status, "fulfilled");
    await assert.rejects(service.authenticate(first.accessToken), error => error.code === "SESSION_REVOKED");
    if (outcomes[0].status === "fulfilled") {
      const next = outcomes[0].value;
      await assert.rejects(service.authenticate(next.accessToken), error => error.code === "SESSION_REVOKED");
      await assert.rejects(service.refresh({ refreshToken: next.refreshToken }), error => error.status === 401);
    } else assert.equal(outcomes[0].reason.status, 401);
  });
  it("handles concurrent duplicate email without creating two users", async () => {
    const input = credentials("duplicate@example.com");
    const responses = await Promise.all([request("/api/admin/staff", input, actorToken), request("/api/admin/staff", input, actorToken)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM USERS WHERE email = ?", [input.email]);
    assert.equal(rows[0].count, 1);
  });
  it("commits concurrent failures atomically and resets the expired lock cycle", async () => {
    const input = credentials("lock@example.com"); await service.createStaff(actorId, input);
    const responses = await Promise.all(Array.from({ length: 5 }, () =>
      request("/api/auth/login", { ...input, password: "WrongPassword123" })));
    assert.deepEqual(responses.map(r => r.status).sort(), [401, 401, 401, 401, 423]);
    const user = await service.users.getUserByEmail(input.email);
    assert.equal(user.failed_login_count, 5); assert.ok(user.locked_until);
    assert.equal((await request("/api/auth/login", input)).status, 423);
    await pool.query("UPDATE USERS SET locked_until = ? WHERE user_id = ?", [new Date(Date.now() - 1000), user.user_id]);
    assert.equal((await request("/api/auth/login", { ...input, password: "WrongPassword123" })).status, 401);
    assert.equal((await service.users.getUserByEmail(input.email)).failed_login_count, 1);
    assert.equal((await request("/api/auth/login", input)).status, 200);
    assert.equal((await service.users.getUserByEmail(input.email)).failed_login_count, 0);
  });
  it("rolls back the new STAFF when a real audit insert fails", async () => {
    await pool.query("CREATE TRIGGER auth_test_fail_audit BEFORE INSERT ON AUDIT_LOGS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced test failure'");
    const input = credentials("rollback@example.com");
    try {
      const response = await request("/api/admin/staff", input, actorToken);
      assert.equal(response.status, 500);
      assert.equal((await response.json()).error.includes("forced"), false);
      assert.equal(await service.users.getUserByEmail(input.email), undefined);
    } finally { await pool.query("DROP TRIGGER auth_test_fail_audit"); }
    assert.equal((await request("/api/admin/staff", input, actorToken)).status, 201);
  });
  it("forbids unauthenticated and STAFF creation, and removes legacy public registration", async () => {
    const input = credentials("permissions@example.com");
    const created = await service.createStaff(actorId, input);
    const login = await service.login(input);
    const another = credentials("not-created@example.com");
    assert.equal((await request("/api/admin/staff", another)).status, 401);
    assert.equal((await request("/api/admin/staff", another, login.accessToken)).status, 403);
    assert.equal((await request("/api/auth/register", another)).status, 404);
    assert.equal((await request("/api/auth/register-owner", another)).status, 404);
    assert.equal((await request("/api/auth/owner-request/status", undefined, login.accessToken)).status, 404);
    await assert.rejects(service.bootstrapAdmin(input), error => error.code === "EMAIL_EXISTS");
    assert.equal((await service.users.getUserById(created.userId)).role, "STAFF");
    assert.equal(await service.users.getUserByEmail(another.email), undefined);
  });
  it("blocks existing sessions immediately when an admin locks the account", async () => {
    const input = credentials("disabled@example.com"); await service.createStaff(actorId, input);
    const login = await service.login(input);
    await pool.query("UPDATE USERS SET status = 'LOCKED' WHERE user_id = ?", [login.user.id]);
    assert.equal((await request("/api/auth/me", undefined, login.accessToken)).status, 403);
    assert.equal((await request("/api/auth/login", input)).status, 403);
    assert.equal((await request("/api/auth/refresh", { refreshToken: login.refreshToken })).status, 403);
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM REFRESH_TOKENS WHERE user_id = ?", [login.user.id]);
    assert.equal(rows[0].count, 0);
  });
  it("can explicitly bootstrap/repair an admin without changing a valid existing password", async () => {
    const input = credentials("bootstrap@example.com");
    const adminUser = await service.bootstrapAdmin(input);
    assert.equal(adminUser.created, true);
    await pool.query("UPDATE USERS SET password_hash = ? WHERE user_id = ?", ["$2b$12$replace_with_real_bcrypt_hash", adminUser.userId]);
    assert.equal((await service.bootstrapAdmin(input)).repaired, true);
    const login = await service.login(input);
    assert.equal((await service.authenticate(login.accessToken)).role, "ADMIN");
    const hash = (await service.users.getUserByEmail(input.email)).password_hash;
    await service.bootstrapAdmin({ ...input, password: "AnotherPassword123" });
    assert.equal((await service.users.getUserByEmail(input.email)).password_hash, hash);
  });
});
