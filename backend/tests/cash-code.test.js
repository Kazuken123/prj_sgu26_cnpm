const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { cashCodeFixture } = require("./helpers/cash-code.fixture");
const { getCashCodeTtlMs } = require("../config/payment");
it("cash code config defaults to 600 seconds and rejects invalid/unsafe TTL", () => {
  assert.equal(getCashCodeTtlMs({}), 600000);
  assert.equal(getCashCodeTtlMs({ CASH_CODE_TTL_SECONDS: "300" }), 300000);
  for (const value of ["", "0", "-1", "1.5", "1e3", "bad", "9999999999999999999"]) {
    assert.throws(() => getCashCodeTtlMs({ CASH_CODE_TTL_SECONDS: value }));
  }
});
it("paid cash code is random, session-bound, lasts 10 minutes, and returns only the short code to staff", async () => {
  const f = cashCodeFixture(), before = structuredClone(f.state.row);
  const result = await f.service.issueCashCode(f.staff, f.state.row.sessionId.toUpperCase());
  const saved = f.state.codes.get(result.sessionId);
  assert.match(result.shortedCode, /^\d{6}$/); assert.match(saved.authCode, /^[a-f0-9]{64}$/);
  assert.equal(saved.sessionId, result.sessionId); assert.equal(result.codeExpiresAt.getTime() - f.state.now, 600000);
  assert.equal(result.visitExpiresAt.getTime(), before.expiresAt.getTime()); assert.equal(result.reused, false);
  assert.deepEqual(Object.keys(result).sort(), ["codeExpiresAt", "reused", "sessionId", "shortedCode", "visitExpiresAt"]);
  assert.equal(JSON.stringify(result).includes(saved.authCode), false);
  assert.equal(JSON.stringify([...f.state.audits.values()]).includes(saved.authCode), false);
  assert.equal(JSON.stringify([...f.state.audits.values()]).includes('"shortedCode"'), false);
  assert.deepEqual(f.state.row, before); assert.equal(f.state.audits.size, 1);
});
it("cash code reuse and 20 concurrent retries keep one code, audit and fixed expiry", async () => {
  const f = cashCodeFixture(), id = f.state.row.sessionId;
  const first = await f.service.issueCashCode(f.staff, id);
  f.state.now += 30000; f.service.cashCodeTtlMs = () => 900000;
  const results = await Promise.all(Array.from({ length: 20 }, () => f.service.issueCashCode({ ...f.staff, role: "ADMIN" }, id)));
  for (const result of results) {
    assert.equal(result.reused, true); assert.equal(result.shortedCode, first.shortedCode);
    assert.equal(result.codeExpiresAt.getTime(), first.codeExpiresAt.getTime());
  }
  assert.equal(f.state.codes.size, 1); assert.equal(f.state.audits.size, 1);
});
it("expired unused code can be replaced on the same paid visit without extending the ticket", async () => {
  const f = cashCodeFixture(), id = f.state.row.sessionId;
  const first = await f.service.issueCashCode(f.staff, id), old = structuredClone(f.state.codes.get(id));
  f.state.now = first.codeExpiresAt.getTime();
  const second = await f.service.issueCashCode(f.staff, id), saved = f.state.codes.get(id);
  assert.equal(second.reused, false); assert.notEqual(saved.issueId, old.issueId); assert.notEqual(saved.authCode, old.authCode);
  assert.equal(second.visitExpiresAt.getTime(), first.visitExpiresAt.getTime()); assert.equal(f.state.audits.size, 2);
  f.state.now = second.codeExpiresAt.getTime(); f.state.row.tokenHash = "already-issued-token-hash";
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "VISIT_TOKEN_ALREADY_ISSUED" });
  assert.equal(f.state.audits.size, 2);
});
it("code deadline is capped at ticket expiry and an expired/revoked ticket cannot obtain a code", async () => {
  const f = cashCodeFixture(); f.state.row.expiresAt = new Date(f.state.now + 45000);
  const result = await f.service.issueCashCode(f.staff, f.state.row.sessionId);
  assert.equal(result.codeExpiresAt.getTime(), f.state.row.expiresAt.getTime());
  f.state.now = f.state.row.expiresAt.getTime();
  await assert.rejects(f.service.issueCashCode(f.staff, f.state.row.sessionId), { code: "VISIT_SESSION_EXPIRED" });
  f.state.row.sessionStatus = "REVOKED";
  await assert.rejects(f.service.issueCashCode(f.staff, f.state.row.sessionId), { code: "VISIT_SESSION_NOT_ACTIVE" });
});
it("unpaid, online, already-tokenized and inconsistent sessions are rejected before Redis", async () => {
  for (const patch of [{ paymentMethod: "ONLINE" }, { paymentStatus: "PENDING" }, { paymentStatus: "FAILED" },
    { sessionStatus: "PENDING" }, { tokenHash: "hash" }, { reissueCount: 1 }, { paidAt: null }, { expiresAt: null }]) {
    const f = cashCodeFixture(); Object.assign(f.state.row, patch);
    await assert.rejects(f.service.issueCashCode(f.staff, f.state.row.sessionId), error => error.status === 409);
    assert.equal(f.state.redisCalls, 0); assert.equal(f.state.audits.size, 0);
  }
});
it("cash code endpoint validates body, ID, role and current actor without leaking state", async () => {
  const f = cashCodeFixture(), id = f.state.row.sessionId;
  for (const actor of [null, {}, { ...f.staff, role: "TOURIST" }, { ...f.staff, status: "LOCKED" }]) {
    await assert.rejects(f.service.issueCashCode(actor, id), error => [401, 403].includes(error.status));
  }
  for (const body of [null, [], "", { shortedCode: "123456" }, { ttl: 999999 }, { token: "injected" }]) {
    await assert.rejects(f.service.issueCashCode(f.staff, id, body), { code: "INVALID_CASH_CODE_INPUT" });
  }
  for (const bad of [undefined, "", "<script>", "' OR 1=1 --"]) await assert.rejects(f.service.issueCashCode(f.staff, bad), { code: "INVALID_SESSION_ID" });
  assert.equal(f.state.reads, 0);
  f.state.actor = { ...f.staff, status: "LOCKED" };
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "FORBIDDEN" });
  f.state.actor = undefined;
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "MISSING_ACCESS_TOKEN" });
  f.state.actor = f.staff;
  await assert.rejects(f.service.issueCashCode(f.staff, randomUUID()), { code: "VISIT_SESSION_NOT_FOUND" });
  assert.equal(f.state.redisCalls, 0);
});
it("invalid TTL, Redis outage, timeout and malformed reply fail closed without changing paid visit", async () => {
  const f = cashCodeFixture(), before = structuredClone(f.state.row), id = f.state.row.sessionId;
  f.service.cashCodeTtlMs = () => { throw new Error("invalid TTL"); };
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "CASH_CODE_TTL_NOT_CONFIGURED" });
  f.service.cashCodeTtlMs = () => 600000; f.state.redisDown = true;
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "CASH_CODE_UNAVAILABLE", status: 503 });
  f.state.redisDown = false;
  f.redis.ensureCashCode = async () => ({ created: true, record: { sessionId: id, shortedCode: "bad", expiresAtMs: f.state.now + 10 } });
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "CASH_CODE_UNAVAILABLE" });
  assert.deepEqual(f.state.row, before); assert.equal(f.state.audits.size, 0);
});
it("lost Redis response and audit failure recover the stored code without a second payment or duplicate audit", async () => {
  const f = cashCodeFixture(), id = f.state.row.sessionId, before = structuredClone(f.state.row);
  f.state.lostReply = true;
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "CASH_CODE_UNAVAILABLE" });
  const saved = structuredClone(f.state.codes.get(id)); assert.equal(f.state.audits.size, 0);
  f.state.failAudit = true;
  await assert.rejects(f.service.issueCashCode(f.staff, id), { code: "CASH_CODE_PERSISTENCE_UNAVAILABLE", status: 503 });
  assert.equal(f.state.audits.size, 0); assert.deepEqual(f.state.codes.get(id), saved);
  f.state.failAudit = false;
  const retry = await f.service.issueCashCode(f.staff, id);
  assert.equal(retry.reused, true); assert.equal(retry.shortedCode, saved.shortedCode); assert.equal(f.state.audits.size, 1);
  await f.service.issueCashCode(f.staff, id); assert.equal(f.state.audits.size, 1); assert.deepEqual(f.state.row, before);
});
it("code expiring during response preparation is never returned as usable", async () => {
  const f = cashCodeFixture(); f.service.now = () => f.state.now + 600001;
  await assert.rejects(f.service.issueCashCode(f.staff, f.state.row.sessionId), { code: "CASH_CODE_EXPIRED_RETRY" });
});
it("cash code HTTP uses real JWT validation and returns only protected no-store short-code data", async t => {
  const jwt = require("jsonwebtoken");
  const { createFixture, staff, admin } = require("./helpers/auth.fixture");
  const auth = createFixture(); await auth.addStaff();
  const login = await auth.service.login(staff), adminLogin = await auth.service.login(admin);
  const f = cashCodeFixture(), original = f.store.withCashCodeIssue;
  f.store.withCashCodeIssue = (...args) => { f.state.actor = auth.state.users.find(user => user.user_id === args[0]); return original(...args); };
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ authService: auth.service, paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = `/api/admin/payments/sessions/${f.state.row.sessionId}/cash-code`;
  const post = (token, body = {}, target = path) => fetch(base + target, { method: "POST", headers: { "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  assert.equal((await post()).status, 401);
  const payload = jwt.decode(login.accessToken); delete payload.iat; delete payload.exp; delete payload.iss; delete payload.aud;
  const sign = (data, secret = auth.config.secret, expiresIn = "1h") => jwt.sign({ ...data, iat: Math.floor(auth.service.now() / 1000) }, secret,
    { algorithm: "HS256", issuer: auth.config.issuer, audience: auth.config.audience, expiresIn });
  for (const token of ["bad", sign(payload, "wrong"), sign(payload, auth.config.secret, -1), sign({ ...payload, type: "visitor" })]) assert.equal((await post(token)).status, 401);
  const actor = auth.state.users.find(user => user.email === staff.email);
  actor.status = "LOCKED"; assert.equal((await post(login.accessToken)).status, 403); actor.status = "ACTIVE";
  assert.equal((await post(login.accessToken, { ttl: 1 })).status, 400);
  assert.equal((await post(login.accessToken, {}, path.replace(f.state.row.sessionId, "bad"))).status, 400);
  assert.equal((await post(login.accessToken, {}, path.replace(f.state.row.sessionId, randomUUID()))).status, 404);
  const first = await post(login.accessToken); assert.equal(first.status, 200); assert.equal(first.headers.get("cache-control"), "no-store");
  const data = (await first.json()).data;
  assert.deepEqual(Object.keys(data).sort(), ["codeExpiresAt", "reused", "sessionId", "shortedCode", "visitExpiresAt"]);
  assert.equal((await (await post(adminLogin.accessToken)).json()).data.reused, true);
  assert.equal((await post(login.accessToken, {}, path.replace("/api/admin/", "/api/"))).status, 404);
  await auth.service.logout({ refreshToken: login.refreshToken }); assert.equal((await post(login.accessToken)).status, 401);
  f.state.redisDown = true;
  const unavailable = await post(adminLogin.accessToken); assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.text()).includes("private Redis"), false);
});
