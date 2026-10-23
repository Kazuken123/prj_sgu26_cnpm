// The official createApp() from server.js exposes both routes with the shared
// parsers, auth middlewares and error handler, and existing routes keep working.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createHash, randomUUID } = require("node:crypto");
process.env.NODE_ENV = "test";
const { createApp } = require("../server");
const { PaymentService } = require("../services/payment.service");
const { createFixture, staff } = require("./helpers/auth.fixture");

describe("server.js mounts UC-15 and UC-08 routes", () => {
  let server, base, staffToken;
  const visitorToken = "tcv_visit_" + "c".repeat(64), sessionId = randomUUID();
  const calls = [];
  before(async () => {
    const fixture = createFixture(); await fixture.addStaff();
    const now = new Date();
    const visits = new Map([[createHash("sha256").update(visitorToken).digest("hex"), { sessionId, sessionStatus: "ACTIVE", activatedAt: now,
      expiresAt: new Date(now.getTime() + 3600000), paymentStatus: "PAID", paidAt: now, nowUtc: now }]]);
    const paymentService = new PaymentService({ getVisitorByTokenHash: async hash => visits.get(hash) }, { consumeLookup: async () => true });
    const knowledgeService = { list: async (actor, query) => { calls.push(["list", actor.role, { ...query }]); return { items: [], total: 0, page: 1, limit: 20 }; } };
    const chatService = { ask: async (visit, body) => { calls.push(["ask", visit.sessionId, body]); return { status: "NO_CONTEXT", answer: "x", sources: [] }; } };
    server = http.createServer(createApp({ authService: fixture.service, paymentService, knowledgeService, chatService, frontendDir: "/nonexistent" }));
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staff) });
    staffToken = (await login.json()).data.accessToken;
  });
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const call = (path, { method = "GET", token, body } = {}) => fetch(base + path, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body && JSON.stringify(body) });
  it("STAFF reaches the knowledge routes; missing or visitor tokens are 401 with the shared error shape", async () => {
    assert.equal((await call("/api/admin/knowledge-documents?page=1", { token: staffToken })).status, 200);
    assert.deepEqual(calls.at(-1), ["list", "STAFF", { page: "1" }]);
    const missing = await call("/api/admin/knowledge-documents");
    assert.equal(missing.status, 401); assert.deepEqual(Object.keys(await missing.json()).sort(), ["code", "error"]);
    assert.equal((await call("/api/admin/knowledge-documents", { token: visitorToken })).status, 401);
  });
  it("a paid visitor reaches the chat route; staff JWT is refused; oversized bodies are rejected by the shared parser", async () => {
    const answer = await call("/api/chat/questions", { method: "POST", token: visitorToken, body: { question: "Voi?" } });
    assert.equal(answer.status, 200); assert.equal(answer.headers.get("cache-control"), "no-store");
    assert.deepEqual(calls.at(-1), ["ask", sessionId, { question: "Voi?" }]);
    assert.equal((await call("/api/chat/questions", { method: "POST", token: staffToken, body: { question: "Voi?" } })).status, 401);
    const large = await call("/api/chat/questions", { method: "POST", token: visitorToken, body: { question: "x".repeat(40000) } });
    assert.equal(large.status, 413);
  });
  it("existing routes are unaffected", async () => {
    assert.equal((await call("/health")).status, 200);
    assert.equal((await call("/api/auth/me", { token: staffToken })).status, 200);
    assert.equal((await call("/api/admin/pois")).status, 401);
  });
});
