const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createFixture, tourist, owner } = require("./helpers/auth.fixture");

const rejectsCode = (promise, code) => assert.rejects(promise, error => error.code === code);
describe("US-01–03 service behavior", () => {
  it("normalizes email, hashes password and ignores caller-supplied role/status", async () => {
    const f = createFixture();
    const result = await f.service.register({ ...tourist, email: " TOURIST@EXAMPLE.COM ", role: "ADMIN", status: "LOCKED" });
    assert.equal(result.email, tourist.email);
    assert.equal(result.role, "TOURIST"); assert.equal(result.status, "ACTIVE");
    assert.notEqual(f.state.users[0].password_hash, tourist.password);
    assert.equal(await bcrypt.compare(tourist.password, f.state.users[0].password_hash), true);
  });
  it("rejects missing/invalid fields before creating any user", async () => {
    const f = createFixture();
    for (const input of [undefined, [], {}, { ...tourist, email: "invalid" }, { ...tourist, password: 123 },
      { ...tourist, password: "short" }, { ...tourist, password: "á".repeat(37) }]) {
      await rejectsCode(f.service.register(input), "VALIDATION_ERROR");
    }
    assert.equal(f.state.users.length, 0);
  });
  it("requires owner name, address and valid phone", async () => {
    const f = createFixture();
    for (const field of ["restaurantName", "restaurantAddress", "phoneNumber"]) {
      await rejectsCode(f.service.registerOwner({ ...owner, [field]: "" }), "VALIDATION_ERROR");
    }
    await rejectsCode(f.service.registerOwner({ ...owner, phoneNumber: "not a phone" }), "VALIDATION_ERROR");
    assert.equal(f.state.users.length, 0);
  });
  it("rejects duplicate email, including concurrent registration", async () => {
    const f = createFixture();
    const results = await Promise.allSettled([f.service.register(tourist), f.service.register(tourist)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.find(r => r.status === "rejected").reason.code, "EMAIL_EXISTS");
    assert.equal(f.state.users.length, 1);
  });
  it("registers owner as pending with a matching request", async () => {
    const f = createFixture();
    const result = await f.service.registerOwner(owner);
    assert.equal(result.status, "PENDING"); assert.equal(result.role, "OWNER");
    assert.equal(f.state.requests[0].user_id, result.userId);
    assert.equal((await f.service.getOwnerRequestStatus(result.userId)).status, "PENDING");
  });
  it("returns access/refresh tokens and persists only a refresh hash", async () => {
    const f = createFixture(); await f.service.register(tourist);
    const result = await f.service.login(tourist);
    const decoded = jwt.verify(result.accessToken, f.config.secret);
    assert.equal(decoded.type, "access"); assert.equal(decoded.userId, result.user.id);
    assert.equal(result.refreshToken.length, 64);
    assert.equal(f.state.sessions.has(result.refreshToken), false);
    assert.equal(f.state.sessions.has(f.service.hashToken(result.refreshToken)), true);
    assert.equal((await f.service.authenticate(result.accessToken)).role, "TOURIST");
  });
  it("rejects unknown accounts and malformed login without issuing sessions", async () => {
    const f = createFixture();
    await rejectsCode(f.service.login(tourist), "INVALID_CREDENTIALS");
    await rejectsCode(f.service.login({}), "VALIDATION_ERROR");
    assert.equal(f.state.sessions.size, 0);
  });
  it("blocks an admin-locked account even with the correct password", async () => {
    const f = createFixture(); await f.service.register(tourist); f.state.users[0].status = "LOCKED";
    await rejectsCode(f.service.login(tourist), "ACCOUNT_LOCKED");
  });
  it("commits five failures, locks for 15 minutes and starts a new cycle after expiry", async () => {
    const f = createFixture(); await f.service.register(tourist);
    const wrong = { ...tourist, password: "WrongPassword123" };
    for (let i = 1; i <= 5; i++) {
      await rejectsCode(f.service.login(wrong), i < 5 ? "INVALID_CREDENTIALS" : "LOGIN_TEMPORARILY_LOCKED");
      assert.equal(f.state.users[0].failed_login_count, i);
    }
    await rejectsCode(f.service.login(tourist), "LOGIN_TEMPORARILY_LOCKED");
    f.advance(15 * 60000 + 1);
    await rejectsCode(f.service.login(wrong), "INVALID_CREDENTIALS");
    assert.equal(f.state.users[0].failed_login_count, 1); assert.equal(f.state.users[0].locked_until, null);
    await f.service.login(tourist);
    assert.equal(f.state.users[0].failed_login_count, 0);
  });
  it("does not lose failed attempts when requests overlap", async () => {
    const f = createFixture(); await f.service.register(tourist);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => f.service.login({ ...tourist, password: "WrongPassword123" })));
    assert.equal(results.filter(r => r.status === "rejected").length, 5);
    assert.equal(f.state.users[0].failed_login_count, 5); assert.ok(f.state.users[0].locked_until);
  });
  it("allows a pending owner to view status but blocks the business guard", async () => {
    const f = createFixture(); await f.service.registerOwner(owner);
    const result = await f.service.login(owner);
    const user = await f.service.authenticate(result.accessToken);
    assert.equal((await f.service.getOwnerRequestStatus(user.userId)).status, "PENDING");
    await rejectsCode(f.service.assertApprovedOwner(user), "OWNER_NOT_APPROVED");
    f.state.users[0].status = "ACTIVE"; f.state.requests[0].status = "APPROVED";
    await f.service.assertApprovedOwner(await f.service.authenticate(result.accessToken));
    f.state.requests[0].status = "REJECTED";
    await rejectsCode(f.service.assertApprovedOwner(await f.service.authenticate(result.accessToken)), "OWNER_NOT_APPROVED");
  });
  it("owner guard requires authentication before checking approval", async () => {
    const f = createFixture();
    await rejectsCode(f.service.assertApprovedOwner(undefined), "MISSING_ACCESS_TOKEN");
  });
  it("rotates refresh tokens and rejects reuse or simultaneous replay", async () => {
    const f = createFixture(); await f.service.register(tourist);
    const login = await f.service.login(tourist);
    const results = await Promise.allSettled([f.service.refresh(login), f.service.refresh(login)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.find(r => r.status === "rejected").reason.code, "INVALID_REFRESH_TOKEN");
    const next = results.find(r => r.status === "fulfilled").value;
    assert.notEqual(next.refreshToken, login.refreshToken);
    assert.equal((await f.service.authenticate(next.accessToken)).id, login.user.id);
    await rejectsCode(f.service.refresh(login), "INVALID_REFRESH_TOKEN");
  });
  it("expires a refresh session without extending its lifetime during rotation", async () => {
    const f = createFixture(); await f.service.register(tourist);
    const login = await f.service.login(tourist);
    const expiry = [...f.state.sessions.values()][0].expires_at.getTime();
    f.advance(86400000);
    const next = await f.service.refresh(login);
    assert.equal([...f.state.sessions.values()][0].expires_at.getTime(), expiry);
    f.advance(7 * 86400000);
    await rejectsCode(f.service.refresh(next), "INVALID_REFRESH_TOKEN");
    assert.equal(f.state.sessions.size, 0);
  });
  it("logout revokes both refresh and access for that session", async () => {
    const f = createFixture(); await f.service.register(tourist); const login = await f.service.login(tourist);
    await f.service.logout(login);
    await rejectsCode(f.service.refresh(login), "INVALID_REFRESH_TOKEN");
    await rejectsCode(f.service.authenticate(login.accessToken), "SESSION_REVOKED");
    await f.service.logout(login); // Idempotent.
  });
  it("checks current role and account status instead of trusting stale claims", async () => {
    const f = createFixture(); await f.service.register(tourist); const login = await f.service.login(tourist);
    f.state.users[0].role = "ADMIN";
    assert.equal((await f.service.authenticate(login.accessToken)).role, "ADMIN");
    f.state.users[0].status = "LOCKED";
    await rejectsCode(f.service.authenticate(login.accessToken), "ACCOUNT_LOCKED");
    await rejectsCode(f.service.refresh(login), "ACCOUNT_LOCKED");
    assert.equal(f.state.sessions.size, 0);
  });
  it("rejects tampered, expired and wrong-purpose JWTs", async () => {
    const f = createFixture(); await f.service.register(tourist); const login = await f.service.login(tourist);
    await rejectsCode(f.service.authenticate(login.accessToken + "bad"), "INVALID_ACCESS_TOKEN");
    const sign = (payload, options = {}) => jwt.sign(payload, f.config.secret, {
      issuer: f.config.issuer, audience: f.config.audience, ...options,
    });
    await rejectsCode(f.service.authenticate(sign({ userId: 1, type: "access" }, { expiresIn: -1 })), "INVALID_ACCESS_TOKEN");
    await rejectsCode(f.service.authenticate(sign({ userId: 1, type: "refresh" })), "INVALID_ACCESS_TOKEN");
  });
  it("bootstrap creates admin explicitly and never elevates an existing tourist", async () => {
    const f = createFixture(); await f.service.register(tourist);
    await rejectsCode(f.service.bootstrapAdmin(tourist), "EMAIL_EXISTS");
    const input = { ...tourist, email: "admin@example.com" };
    const first = await f.service.bootstrapAdmin(input); const again = await f.service.bootstrapAdmin(input);
    assert.equal(first.created, true); assert.equal(again.created, false);
    assert.equal(first.userId, again.userId);
  });
  it("explicit bootstrap repairs only the known fake seed hash and preserves a real admin password", async () => {
    const f = createFixture();
    const input = { ...tourist, email: "admin@example.com" };
    await f.service.bootstrapAdmin(input);
    f.state.users[0].password_hash = "$2b$12$replace_with_real_bcrypt_hash";
    const repaired = await f.service.bootstrapAdmin(input);
    assert.equal(repaired.repaired, true);
    assert.ok((await f.service.login(input)).accessToken);
    const realHash = f.state.users[0].password_hash;
    await f.service.bootstrapAdmin({ ...input, password: "AnotherPassword123" });
    assert.equal(f.state.users[0].password_hash, realHash);
  });
});
