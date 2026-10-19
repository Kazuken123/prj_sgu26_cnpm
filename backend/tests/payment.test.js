const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID, createHash } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const { getVisitPrice, getLookupConfig } = require("../config/payment");
const AppError = require("../utils/app-error");
const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
function fixture() {
  const records = new Map(), calls = [], limits = [];
  const store = {
    initialize: async args => {
      calls.push(args);
      if (args.actorId !== null) args.authorize(staff);
      const old = records.get(args.hash);
      if (old) return { record: old, created: false };
      const data = args.build();
      const record = { ...data, currency: "VND", sessionStatus: "PENDING", paymentStatus: "PENDING", createdBy: args.actorId };
      records.set(args.hash, record); return { record, created: true };
    },
    getStatus: async id => [...records.values()].find(row => row.sessionId === id),
  };
  const redis = { consumeLookup: async (keys, config) => { limits.push({ keys, config }); return true; } };
  const service = new PaymentService(store, redis, { price: () => getVisitPrice({ VISIT_PRICE_VND: "50000" }) });
  return { service, store, redis, records, calls, limits };
}
it("server price is a bounded positive decimal; missing, exponent and unsafe values fail", () => {
  for (const value of [undefined, "", "0", "-1", "1e5", "1.999", "10000000000", "Infinity", "50000<script>"]) {
    assert.throws(() => getVisitPrice({ VISIT_PRICE_VND: value }));
  }
  assert.equal(getVisitPrice({ VISIT_PRICE_VND: "50000" }), "50000.00");
  assert.equal(getVisitPrice({ VISIT_PRICE_VND: "9999999999.99" }), "9999999999.99");
  assert.equal(getVisitPrice({ VISIT_PRICE_VND: "0.01" }), "0.01");
  for (const value of [0, -1, 0.5, "NaN", 10001]) assert.throws(() => getLookupConfig({ VISIT_LOOKUP_IP_LIMIT: value }));
});
it("CASH and ONLINE share pending creation; no gateway URL, codes, token or activation are returned", async () => {
  const f = fixture();
  for (const paymentMethod of ["CASH", "ONLINE"]) {
    const result = await f.service.initialize({ paymentMethod }, randomUUID());
    assert.equal(result.created, true); assert.equal(result.data.amount, "50000.00");
    assert.equal(result.data.paymentStatus, "PENDING"); assert.equal(result.data.sessionStatus, "PENDING");
    assert.deepEqual(Object.keys(result.data).sort(), ["amount", "currency", "paymentMethod", "paymentRef", "paymentStatus", "sessionId", "sessionStatus"].sort());
    assert.notEqual(result.data.paymentRef, result.data.sessionId);
  }
});
it("only SHA-256 of a canonical request key reaches Store; retry keeps original ref and price", async () => {
  const f = fixture(), key = randomUUID();
  const first = await f.service.initialize({ paymentMethod: "CASH" }, key);
  f.service.price = () => { throw new Error("config changed or missing"); };
  const retry = await f.service.initialize({ paymentMethod: "CASH" }, key.toUpperCase());
  assert.equal(retry.created, false); assert.deepEqual(retry.data, first.data);
  assert.equal(f.calls[0].hash, createHash("sha256").update(key).digest("hex"));
  assert.equal(JSON.stringify(f.calls).includes(key), false);
});
it("reusing a key for another method or creator conflicts without changing existing payment", async () => {
  const f = fixture(), key = randomUUID();
  const first = await f.service.initialize({ paymentMethod: "CASH" }, key);
  await assert.rejects(f.service.initialize({ paymentMethod: "ONLINE" }, key), { code: "REQUEST_KEY_CONFLICT" });
  await assert.rejects(f.service.initialize({ paymentMethod: "CASH" }, key, staff), { code: "REQUEST_KEY_CONFLICT" });
  assert.equal(f.records.size, 1);
  assert.deepEqual((await f.service.initialize({ paymentMethod: "CASH" }, key)).data, first.data);
});
it("client price, status, session and SQL/HTML payloads are rejected before persistence", async () => {
  const f = fixture();
  for (const input of [null, [], {}, { paymentMethod: "CASH", amount: 1 }, { paymentMethod: "CASH", status: "PAID" },
    { paymentMethod: "CASH", sessionId: randomUUID() }, { paymentMethod: "CASH' OR 1=1" }, { paymentMethod: "<script>" }]) {
    await assert.rejects(f.service.initialize(input, randomUUID()), { code: "INVALID_PAYMENT_INPUT" });
  }
  for (const key of [undefined, "", "' OR 1=1 --", "<script>", "a".repeat(10000), "00000000-0000-0000-0000-000000000000"]) {
    await assert.rejects(f.service.initialize({ paymentMethod: "CASH" }, key), { code: "INVALID_REQUEST_KEY" });
  }
  assert.equal(f.calls.length, 0);
});
it("missing server price fails without creating records", async () => {
  const f = fixture(); f.service.price = () => { throw new Error("not configured"); };
  await assert.rejects(f.service.initialize({ paymentMethod: "ONLINE" }, randomUUID()), { code: "VISIT_PRICE_NOT_CONFIGURED", status: 503 });
  assert.equal(f.records.size, 0);
});
it("STAFF/ADMIN may create CASH; invalid, inactive or guest identities fail", async () => {
  const f = fixture();
  for (const role of ["STAFF", "ADMIN"]) assert.equal((await f.service.initialize({ paymentMethod: "CASH" }, randomUUID(), { ...staff, role })).created, true);
  await assert.rejects(f.service.initialize({ paymentMethod: "ONLINE" }, randomUUID(), staff), { code: "STAFF_CASH_ONLY" });
  for (const actor of [{}, { ...staff, userId: -1 }, { ...staff, role: "TOURIST" }, { ...staff, status: "LOCKED" },
    { ...staff, locked_until: new Date(Date.now() + 60000) }]) {
    await assert.rejects(f.service.initialize({ paymentMethod: "CASH" }, randomUUID(), actor), error => [401, 403].includes(error.status));
  }
});
it("lookup needs only random session ID and returns exactly minimal status fields", async () => {
  const f = fixture(), created = await f.service.initialize({ paymentMethod: "CASH" }, randomUUID());
  const result = await f.service.status(created.data.sessionId, "127.0.0.1");
  assert.deepEqual(result, { sessionId: created.data.sessionId, sessionStatus: "PENDING", paymentStatus: "PENDING" });
  assert.equal(f.limits.length, 1);
  assert.equal(JSON.stringify(f.limits).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(f.limits).includes(created.data.sessionId), false);
});
it("lookup limits even unknown/malformed IDs, returns 429 at limit, and fails closed on Redis outage", async () => {
  const f = fixture(); let reads = 0;
  f.store.getStatus = async () => { reads++; };
  await assert.rejects(f.service.status("bad", "127.0.0.1"), { status: 400 });
  await assert.rejects(f.service.status(randomUUID(), "127.0.0.1"), { status: 404 });
  assert.equal(f.limits.length, 2); assert.equal(reads, 1);
  f.redis.consumeLookup = async () => false;
  await assert.rejects(f.service.status(randomUUID(), "127.0.0.1"), { status: 429 });
  f.redis.consumeLookup = async () => { throw new Error("private redis URL"); };
  await assert.rejects(f.service.status(randomUUID(), "127.0.0.1"), { status: 503, code: "LOOKUP_PROTECTION_UNAVAILABLE" });
  f.service.lookupConfig = () => { throw new Error("bad config"); };
  await assert.rejects(f.service.status(randomUUID(), "127.0.0.1"), { status: 503 });
  assert.equal(reads, 1);
});
it("retry and lookup do not reset an existing PAID/ACTIVE or FAILED record", async () => {
  const f = fixture(), key = randomUUID();
  const first = await f.service.initialize({ paymentMethod: "ONLINE" }, key);
  const record = [...f.records.values()][0];
  for (const state of [{ paymentStatus: "PAID", sessionStatus: "ACTIVE" }, { paymentStatus: "FAILED", sessionStatus: "PENDING" }]) {
    Object.assign(record, state);
    assert.equal((await f.service.initialize({ paymentMethod: "ONLINE" }, key)).data.paymentStatus, state.paymentStatus);
    assert.equal((await f.service.status(first.data.sessionId, "127.0.0.1")).sessionStatus, state.sessionStatus);
    assert.equal(f.records.size, 1);
  }
});
it("HTTP contract supports public init, minimal no-store lookup, protected staff init and safe errors", async t => {
  const f = fixture();
  const { createApp } = require("../server");
  const app = createApp({ paymentService: f.service, authService: { authenticate: async token => {
    if (["STAFF", "ADMIN", "TOURIST"].includes(token)) return { ...staff, role: token };
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ hoặc hết hạn.");
  } } });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, key, token) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json",
    "Idempotency-Key": key, ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ paymentMethod: "CASH" }) });
  const key = randomUUID(), path = "/api/payments";
  const first = await post(path, key); assert.equal(first.status, 201);
  const id = (await first.json()).data.sessionId;
  assert.equal((await post(path, key)).status, 200);
  const response = await fetch(base + path + "/sessions/" + id);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys((await response.json()).data).sort(), ["paymentStatus", "sessionId", "sessionStatus"]);
  assert.equal((await post("/api/admin/payments", randomUUID())).status, 401);
  for (const token of ["invalid", "expired", "revoked", "guest-token"]) assert.equal((await post("/api/admin/payments", randomUUID(), token)).status, 401);
  assert.equal((await post("/api/admin/payments", randomUUID(), "TOURIST")).status, 403);
  for (const token of ["STAFF", "ADMIN"]) assert.equal((await post("/api/admin/payments", randomUUID(), token)).status, 201);
  f.redis.consumeLookup = async () => false;
  assert.equal((await fetch(base + path + "/sessions/" + id)).status, 429);
  f.redis.consumeLookup = async () => { throw new Error("private-url"); };
  const unavailable = await fetch(base + path + "/sessions/" + id);
  assert.equal(unavailable.status, 503); assert.equal((await unavailable.text()).includes("private-url"), false);
  f.store.initialize = async () => { throw Object.assign(new Error("sensitive SQL"), { code: "ER_TEST" }); };
  const failed = await post(path, randomUUID()); assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes("sensitive SQL"), false);
});
it("staff payment endpoint validates real JWT signatures, expiry, guest type and revoked sessions", async t => {
  const jwt = require("jsonwebtoken");
  const { createFixture, staff: credentials } = require("./helpers/auth.fixture");
  const auth = createFixture(); await auth.addStaff();
  const login = await auth.service.login(credentials);
  const actor = await auth.service.authenticate(login.accessToken);
  const f = fixture();
  // Replace only the persistence account recheck, retaining real AuthService/JWT validation.
  f.store.initialize = async args => {
    args.authorize(actor);
    const data = args.build();
    return { created: true, record: { ...data, currency: "VND", createdBy: actor.userId, paymentStatus: "PENDING", sessionStatus: "PENDING" } };
  };
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ authService: auth.service, paymentService: f.service }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const post = token => fetch(`http://127.0.0.1:${server.address().port}/api/admin/payments`, { method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID(), Authorization: "Bearer " + token },
    body: JSON.stringify({ paymentMethod: "CASH" }) });
  assert.equal((await post(login.accessToken)).status, 201);
  const payload = jwt.decode(login.accessToken); delete payload.iat; delete payload.exp; delete payload.iss; delete payload.aud;
  const sign = (data, secret = auth.config.secret, expiresIn = "1h") => jwt.sign({ ...data, iat: Math.floor(auth.service.now() / 1000) }, secret,
    { algorithm: "HS256", issuer: auth.config.issuer, audience: auth.config.audience, expiresIn });
  assert.equal((await post(sign(payload, "different-test-only-secret"))).status, 401);
  assert.equal((await post(sign(payload, auth.config.secret, -1))).status, 401);
  assert.equal((await post(sign({ ...payload, type: "visitor" }))).status, 401);
  auth.state.users.find(user => user.user_id === actor.userId).status = "LOCKED";
  assert.equal((await post(login.accessToken)).status, 403);
  auth.state.users.find(user => user.user_id === actor.userId).status = "ACTIVE";
  await auth.service.logout({ refreshToken: login.refreshToken });
  assert.equal((await post(login.accessToken)).status, 401);
});
