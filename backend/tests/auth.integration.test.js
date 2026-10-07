const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const http = require("node:http");
require("dotenv").config({ quiet: true });

describe("US-01–03 integration with a disposable MySQL database", { skip: process.env.RUN_DB_TESTS !== "1" }, () => {
  let admin, pool, server, base, service;
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
    const OwnerRequestStore = require("../stores/owner_request.store");
    const RefreshTokenStore = require("../stores/refresh_token.store");
    service = new AuthService({ authStore: new AuthStore(pool), users: new UserStore(pool),
      requests: new OwnerRequestStore(pool), tokens: new RefreshTokenStore(pool), config: () => config });
    const { createApp } = require("../server");
    const { HealthService } = require("../services/health.service");
    const HealthStore = require("../stores/health.store");
    server = http.createServer(createApp({ authService: service, healthService: new HealthService(new HealthStore(pool)) }));
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
  it("initializes 15 real tables and runs the additive migration twice without data loss", async () => {
    const [tables] = await pool.query("SHOW TABLES"); assert.equal(tables.length, 15);
    await service.register(credentials("migration@example.com"));
    const migration = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/001_refresh_tokens.sql"), "utf8");
    await pool.query(migration); await pool.query(migration);
    assert.ok(await service.users.getUserByEmail("migration@example.com"));
    assert.equal((await request("/health/ready")).status, 200);
  });
  it("registers, logs in, rotates and logs out through HTTP with real persistence", async () => {
    const input = credentials("integration@example.com");
    assert.equal((await request("/api/auth/register", input)).status, 201);
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
  it("handles concurrent duplicate email without creating two users", async () => {
    const input = credentials("duplicate@example.com");
    const responses = await Promise.all([request("/api/auth/register", input), request("/api/auth/register", input)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM USERS WHERE email = ?", [input.email]);
    assert.equal(rows[0].count, 1);
  });
  it("commits concurrent failures atomically and resets the expired lock cycle", async () => {
    const input = credentials("lock@example.com"); await service.register(input);
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
  it("rolls back a real user insert when owner-request insertion fails", async () => {
    await pool.query("CREATE TRIGGER auth_test_fail_owner BEFORE INSERT ON OWNER_REQUESTS FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced test failure'");
    const input = { ...credentials("rollback@example.com"), restaurantName: "Test", restaurantAddress: "Quận 4", phoneNumber: "0901234567" };
    try {
      assert.equal((await request("/api/auth/register-owner", input)).status, 500);
      assert.equal(await service.users.getUserByEmail(input.email), undefined);
    } finally { await pool.query("DROP TRIGGER auth_test_fail_owner"); }
    assert.equal((await request("/api/auth/register-owner", input)).status, 201);
  });
  it("pending owner can see their own request while a tourist is forbidden", async () => {
    const input = { ...credentials("pending@example.com"), restaurantName: "Test", restaurantAddress: "Quận 4", phoneNumber: "0901234567" };
    await service.registerOwner(input);
    const login = await service.login(input);
    assert.equal(login.user.status, "PENDING");
    const status = await request("/api/auth/owner-request/status", undefined, login.accessToken);
    assert.equal(status.status, 200); assert.equal((await status.json()).data.status, "PENDING");
    await assert.rejects(service.assertApprovedOwner(await service.authenticate(login.accessToken)), error => error.code === "OWNER_NOT_APPROVED");
    const touristInput = credentials("forbidden@example.com"); await service.register(touristInput);
    const touristLogin = await service.login(touristInput);
    assert.equal((await request("/api/auth/owner-request/status", undefined, touristLogin.accessToken)).status, 403);
  });
  it("blocks existing sessions immediately when an admin locks the account", async () => {
    const input = credentials("disabled@example.com"); await service.register(input);
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
