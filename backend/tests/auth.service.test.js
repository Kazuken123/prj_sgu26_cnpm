const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createFixture, staff, admin } = require("./helpers/auth.fixture");

const rejectsCode = (promise, code) => assert.rejects(promise, error => error.code === code);
describe("US-F01 internal account service behavior", () => {
  it("normalizes email, hashes password and ignores caller-supplied role/status", async () => {
    const f = createFixture();
    const result = await f.addStaff({ ...staff, email: " STAFF@EXAMPLE.COM ", role: "ADMIN", status: "LOCKED" });
    assert.equal(result.email, staff.email);
    assert.equal(result.role, "STAFF"); assert.equal(result.status, "ACTIVE");
    assert.notEqual(f.state.users.find(u => u.email === staff.email).password_hash, staff.password);
    assert.equal(await bcrypt.compare(staff.password, f.state.users.find(u => u.email === staff.email).password_hash), true);
  });
  it("rejects missing/invalid fields before creating any user", async () => {
    const f = createFixture();
    for (const input of [undefined, [], {}, { ...staff, email: "invalid" }, { ...staff, password: 123 },
      { ...staff, password: "short" }, { ...staff, password: "á".repeat(37) }]) {
      await rejectsCode(f.addStaff(input), "VALIDATION_ERROR");
    }
    assert.equal(f.state.users.filter(u => u.role === "STAFF").length, 0);
  });
  it("rejects invalid optional phone data", async () => {
    const f = createFixture();
    await rejectsCode(f.addStaff({ ...staff, phoneNumber: "not a phone" }), "VALIDATION_ERROR");
  });
  it("rejects duplicate email, including concurrent registration", async () => {
    const f = createFixture();
    const results = await Promise.allSettled([f.addStaff(staff), f.addStaff(staff)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.find(r => r.status === "rejected").reason.code, "EMAIL_EXISTS");
    assert.equal(f.state.users.filter(u => u.role === "STAFF").length, 1);
  });
  it("only lets an active ADMIN create STAFF and records an audit without secrets", async () => {
    const f = createFixture();
    await rejectsCode(f.service.createStaff(undefined, staff), "MISSING_ACCESS_TOKEN");
    const created = await f.addStaff(staff);
    await rejectsCode(f.service.createStaff(created.userId, { ...staff, email: "forbidden@example.com" }), "FORBIDDEN");
    const audit = f.state.audits[0];
    assert.equal(audit.action, "CREATE_STAFF"); assert.equal(audit.resourceId, String(created.userId));
    assert.equal(JSON.stringify(audit).includes(staff.password), false);
    f.state.users.find(u => u.email === admin.email).status = "LOCKED";
    await rejectsCode(f.service.createStaff(audit.userId, { ...staff, email: "blocked@example.com" }), "ACCOUNT_LOCKED");
  });
  it("rolls back STAFF creation when audit persistence fails", async () => {
    const f = createFixture(); await f.seedAdmin(); f.state.failAudit = true;
    await assert.rejects(f.addStaff(staff), /audit insert failed/);
    assert.equal(await f.service.users.getUserByEmail(staff.email), undefined);
    assert.equal(f.state.audits.length, 0);
  });
  it("rechecks ADMIN authority inside the account creation transaction", async () => {
    const f = createFixture(); const actorId = await f.seedAdmin();
    const original = f.service.authStore.createStaff;
    f.service.authStore.createStaff = (...args) => {
      f.state.users.find(u => u.user_id === actorId).role = "STAFF";
      return original(...args);
    };
    await rejectsCode(f.service.createStaff(actorId, staff), "FORBIDDEN");
    assert.equal(await f.service.users.getUserByEmail(staff.email), undefined);
    assert.equal(f.state.audits.length, 0);
  });
  it("returns access/refresh tokens and persists only a refresh hash", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const result = await f.service.login(staff);
    const decoded = jwt.verify(result.accessToken, f.config.secret);
    assert.equal(decoded.type, "access"); assert.equal(decoded.userId, result.user.id);
    assert.equal(result.refreshToken.length, 64);
    assert.equal(f.state.sessions.has(result.refreshToken), false);
    assert.equal(f.state.sessions.has(f.service.hashToken(result.refreshToken)), true);
    assert.equal((await f.service.authenticate(result.accessToken)).role, "STAFF");
  });
  it("rejects unknown accounts and malformed login without issuing sessions", async () => {
    const f = createFixture();
    await rejectsCode(f.service.login(staff), "INVALID_CREDENTIALS");
    await rejectsCode(f.service.login({}), "VALIDATION_ERROR");
    assert.equal(f.state.sessions.size, 0);
  });
  it("blocks an admin-locked account even with the correct password", async () => {
    const f = createFixture(); await f.addStaff(staff); f.state.users.find(u => u.email === staff.email).status = "LOCKED";
    await rejectsCode(f.service.login(staff), "ACCOUNT_LOCKED");
  });
  it("commits five failures, locks for 15 minutes and starts a new cycle after expiry", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const wrong = { ...staff, password: "WrongPassword123" };
    for (let i = 1; i <= 5; i++) {
      await rejectsCode(f.service.login(wrong), i < 5 ? "INVALID_CREDENTIALS" : "LOGIN_TEMPORARILY_LOCKED");
      assert.equal(f.state.users.find(u => u.email === staff.email).failed_login_count, i);
    }
    await rejectsCode(f.service.login(staff), "LOGIN_TEMPORARILY_LOCKED");
    f.advance(15 * 60000 + 1);
    await rejectsCode(f.service.login(wrong), "INVALID_CREDENTIALS");
    assert.equal(f.state.users.find(u => u.email === staff.email).failed_login_count, 1); assert.equal(f.state.users.find(u => u.email === staff.email).locked_until, null);
    await f.service.login(staff);
    assert.equal(f.state.users.find(u => u.email === staff.email).failed_login_count, 0);
  });
  it("does not lose failed attempts when requests overlap", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => f.service.login({ ...staff, password: "WrongPassword123" })));
    assert.equal(results.filter(r => r.status === "rejected").length, 5);
    assert.equal(f.state.users.find(u => u.email === staff.email).failed_login_count, 5); assert.ok(f.state.users.find(u => u.email === staff.email).locked_until);
  });
  it("rejects unsupported account roles", async () => {
    const f = createFixture(); await f.addStaff(staff);
    f.state.users.find(u => u.email === staff.email).role = "INVALID_ROLE";
    await rejectsCode(f.service.login(staff), "INVALID_ACCOUNT");
  });
  it("rotates refresh tokens and rejects reuse or simultaneous replay", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const login = await f.service.login(staff);
    const results = await Promise.allSettled([f.service.refresh(login), f.service.refresh(login)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.find(r => r.status === "rejected").reason.code, "INVALID_REFRESH_TOKEN");
    const next = results.find(r => r.status === "fulfilled").value;
    assert.notEqual(next.refreshToken, login.refreshToken);
    assert.equal((await f.service.authenticate(next.accessToken)).id, login.user.id);
    await rejectsCode(f.service.refresh(login), "INVALID_REFRESH_TOKEN");
  });
  it("expires a refresh session without extending its lifetime during rotation", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const login = await f.service.login(staff);
    const expiry = [...f.state.sessions.values()][0].expires_at.getTime();
    f.advance(86400000);
    const next = await f.service.refresh(login);
    assert.equal([...f.state.sessions.values()][0].expires_at.getTime(), expiry);
    f.advance(7 * 86400000);
    await rejectsCode(f.service.refresh(next), "INVALID_REFRESH_TOKEN");
    assert.equal(f.state.sessions.size, 0);
  });
  it("logout revokes both refresh and access for that session", async () => {
    const f = createFixture(); await f.addStaff(staff); const login = await f.service.login(staff);
    await f.service.logout(login);
    await rejectsCode(f.service.refresh(login), "INVALID_REFRESH_TOKEN");
    await rejectsCode(f.service.authenticate(login.accessToken), "SESSION_REVOKED");
    await f.service.logout(login); // Idempotent.
  });
  it("checks current role and account status instead of trusting stale claims", async () => {
    const f = createFixture(); await f.addStaff(staff); const login = await f.service.login(staff);
    f.state.users.find(u => u.email === staff.email).role = "ADMIN";
    assert.equal((await f.service.authenticate(login.accessToken)).role, "ADMIN");
    f.state.users.find(u => u.email === staff.email).status = "LOCKED";
    await rejectsCode(f.service.authenticate(login.accessToken), "ACCOUNT_LOCKED");
    await rejectsCode(f.service.refresh(login), "ACCOUNT_LOCKED");
    assert.equal(f.state.sessions.size, 0);
  });
  it("rejects tampered, expired and wrong-purpose JWTs", async () => {
    const f = createFixture(); await f.addStaff(staff); const login = await f.service.login(staff);
    await rejectsCode(f.service.authenticate(login.accessToken + "bad"), "INVALID_ACCESS_TOKEN");
    const sign = (payload, options = {}) => jwt.sign(payload, f.config.secret, {
      issuer: f.config.issuer, audience: f.config.audience, ...options,
    });
    await rejectsCode(f.service.authenticate(sign({ userId: 1, type: "access" }, { expiresIn: -1 })), "INVALID_ACCESS_TOKEN");
    await rejectsCode(f.service.authenticate(sign({ userId: 1, type: "refresh" })), "INVALID_ACCESS_TOKEN");
    await rejectsCode(f.service.authenticate(sign({ userId: login.user.id, type: "visit", sessionId: "guest-session" })), "INVALID_ACCESS_TOKEN");
  });
  it("bootstrap creates admin explicitly and never elevates existing STAFF", async () => {
    const f = createFixture(); await f.addStaff(staff);
    await rejectsCode(f.service.bootstrapAdmin(staff), "EMAIL_EXISTS");
    const input = { ...staff, email: "another-admin@example.com" };
    const first = await f.service.bootstrapAdmin(input); const again = await f.service.bootstrapAdmin(input);
    assert.equal(first.created, true); assert.equal(again.created, false);
    assert.equal(first.userId, again.userId);
  });
  it("explicit bootstrap repairs only a known placeholder and preserves a valid password", async () => {
    const f = createFixture();
    await f.service.bootstrapAdmin(admin);
    const account = f.state.users.find(u => u.email === admin.email);
    account.password_hash = "$2b$12$replace_with_real_bcrypt_hash";
    assert.equal((await f.service.bootstrapAdmin(admin)).repaired, true);
    assert.ok((await f.service.login(admin)).accessToken);
    const realHash = account.password_hash;
    await f.service.bootstrapAdmin({ ...admin, password: "AnotherPassword123" });
    assert.equal(account.password_hash, realHash);
  });
  it("logout with rotated refresh token R1 revokes session S and blocks A2 and R2", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const s1 = await f.service.login(staff);
    const s2 = await f.service.refresh({ refreshToken: s1.refreshToken });

    await f.service.logout({ refreshToken: s1.refreshToken });

    await rejectsCode(f.service.authenticate(s2.accessToken), "SESSION_REVOKED");
    await rejectsCode(f.service.refresh({ refreshToken: s2.refreshToken }), "INVALID_REFRESH_TOKEN");
  });
  it("logout with expired access token revokes session without affecting other sessions of same user", async () => {
    const f = createFixture(); await f.addStaff(staff);
    const s1 = await f.service.login(staff);
    const s2 = await f.service.login(staff);

    f.advance(2 * 3600 * 1000); // 2 hours later

    await rejectsCode(f.service.authenticate(s1.accessToken), "INVALID_ACCESS_TOKEN");
    await f.service.logout({}, { authorization: `Bearer ${s1.accessToken}` });

    await rejectsCode(f.service.refresh({ refreshToken: s1.refreshToken }), "INVALID_REFRESH_TOKEN");

    const s2Refreshed = await f.service.refresh({ refreshToken: s2.refreshToken });
    assert.ok(s2Refreshed.accessToken);
    const authUser = await f.service.authenticate(s2Refreshed.accessToken);
    assert.equal(authUser.email, staff.email);
  });
  it("runs dummy compare on non-existent account and returns identical error message to wrong password", async () => {
    const f = createFixture(); await f.addStaff(staff);
    let compareCalls = 0;
    const originalCompare = f.service.passwordHasher.compare;
    f.service.passwordHasher.compare = async (pass, hash) => {
      compareCalls++;
      return originalCompare(pass, hash);
    };

    let nonExistentError;
    try {
      await f.service.login({ email: "nonexistent@example.com", password: "SomePassword123" });
    } catch (err) {
      nonExistentError = err;
    }

    assert.equal(compareCalls, 1);
    assert.equal(nonExistentError?.code, "INVALID_CREDENTIALS");
    assert.equal(nonExistentError?.status, 401);

    let wrongPasswordError;
    try {
      await f.service.login({ email: staff.email, password: "WrongPassword123" });
    } catch (err) {
      wrongPasswordError = err;
    }

    assert.equal(compareCalls, 2);
    assert.equal(wrongPasswordError?.code, "INVALID_CREDENTIALS");
    assert.equal(wrongPasswordError?.status, 401);
    assert.equal(nonExistentError?.message, wrongPasswordError?.message);
  });
});
