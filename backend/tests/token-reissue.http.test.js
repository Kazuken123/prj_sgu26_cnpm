// UC-12 HTTP boundary: routes are mounted on the existing staff payment router,
// require STAFF/ADMIN, never cache, and pass the authenticated actor through.
const { it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const AppError = require("../utils/app-error");

const staff = { userId: 7, role: "STAFF", status: "ACTIVE" };
const authService = { authenticate: async token => {
  if (token === "staff-token") return staff;
  if (token === "visitor-role-token") return { userId: 9, role: "VISITOR", status: "ACTIVE" };
  throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ hoặc đã hết hạn.");
} };
async function start(t, paymentService) {
  const { createApp } = require("../server");
  const server = http.createServer(createApp({ authService, paymentService }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}/api/admin/payments`;
  return (path, token, body = {}) => fetch(base + path, { method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
}

it("verify and reissue require an internal STAFF/ADMIN session", async t => {
  const calls = [];
  const post = await start(t, { verifyTokenReissue: async () => { calls.push("verify"); return {}; }, reissueToken: async () => { calls.push("reissue"); return {}; } });
  for (const path of ["/reissue/verify", "/reissue"]) {
    assert.equal((await post(path)).status, 401);
    assert.equal((await post(path, "bad-token")).status, 401);
    assert.equal((await post(path, "visitor-role-token")).status, 403);
  }
  assert.deepEqual(calls, []);
});
it("passes the authenticated actor, body and client IP, and never caches the pickup code", async t => {
  let seen;
  const post = await start(t, {
    verifyTokenReissue: async (actor, body) => ({ actor: actor.userId, echoed: body.sessionId }),
    reissueToken: async (actor, body, options) => { seen = { actor, body, options }; return { shortedCode: "123456" }; },
  });
  const verify = await post("/reissue/verify", "staff-token", { sessionId: "s-1" });
  assert.equal(verify.status, 200); assert.equal(verify.headers.get("cache-control"), "no-store");
  assert.deepEqual((await verify.json()).data, { actor: 7, echoed: "s-1" });
  const reissue = await post("/reissue", "staff-token", { sessionId: "s-1", reason: "Mất điện thoại" });
  assert.equal(reissue.status, 200); assert.equal(reissue.headers.get("cache-control"), "no-store");
  assert.equal((await reissue.json()).data.shortedCode, "123456");
  assert.equal(seen.actor, staff); assert.equal(seen.body.reason, "Mất điện thoại");
  assert.equal(typeof seen.options.ipAddress, "string");
});
it("maps service rejections to their HTTP status and error code without leaking internals", async t => {
  const post = await start(t, {
    verifyTokenReissue: async () => { throw new AppError(409, "REISSUE_LIMIT_REACHED", "Đạt giới hạn."); },
    reissueToken: async () => { throw new Error("private SQL failure"); },
  });
  const limited = await post("/reissue/verify", "staff-token");
  assert.equal(limited.status, 409); assert.equal((await limited.json()).code, "REISSUE_LIMIT_REACHED");
  const crashed = await post("/reissue", "staff-token");
  assert.equal(crashed.status, 500); assert.doesNotMatch(await crashed.text(), /private SQL/);
});
