// UC-12 — Cấp lại token khách (US-A04 AC4–AC5; QT-05; NFR-05/NFR-18).
const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { PaymentService } = require("../services/payment.service");
const { memoryCashRedis } = require("./helpers/cash-exchange.fixture");
const sha = value => createHash("sha256").update(value).digest("hex");
const ip = "192.0.2.10";
const staff = { userId: 7, role: "STAFF", status: "ACTIVE", locked_until: null };

function reissueFixture({ method = "CASH" } = {}) {
  const state = { now: Date.parse("2026-10-20T10:00:00Z"), audits: [], visitorAudits: [], failAudit: false, lostCommitReply: false, codeSeq: 0 };
  const oldToken = "tcv_visit_" + randomBytes(32).toString("hex");
  state.row = { sessionId: randomUUID(), paymentRef: randomUUID(), paymentMethod: method, amount: "50000.00", currency: "VND",
    paymentStatus: "PAID", sessionStatus: "ACTIVE", confirmedBy: method === "CASH" ? 7 : null,
    paidAt: new Date(state.now - 3600000), activatedAt: new Date(state.now - 3600000), expiresAt: new Date(state.now + 20 * 3600000),
    tokenHash: sha(oldToken), reissueCount: 0 };
  const memory = memoryCashRedis(() => state.now);
  let queue = Promise.resolve();
  // Serialize like InnoDB FOR UPDATE and roll back everything on error.
  const locked = work => { const run = queue.then(work); queue = run.catch(() => {}); return run; };
  const transactional = async (body) => {
    const before = structuredClone({ row: state.row, audits: state.audits, visitorAudits: state.visitorAudits });
    let committed = false;
    try { const result = await body(); committed = true; if (state.lostCommitReply) throw new Error("commit response lost"); return result; }
    catch (error) { if (!committed) Object.assign(state, before); throw error; }
  };
  const store = {
    lookupForReissue: async (actorId, id, authorize) => { authorize(staff); return { row: id === state.row.sessionId ? structuredClone(state.row) : undefined, now: new Date(state.now) }; },
    withTokenReissue: (actorId, id, authorize, work) => locked(() => transactional(async () => {
      authorize(staff);
      return work(id === state.row.sessionId ? structuredClone(state.row) : undefined, {
        now: new Date(state.now),
        revoke: async ({ previousTokenHash, previousCount }) => {
          if (state.row.tokenHash !== previousTokenHash || state.row.reissueCount !== previousCount) return false;
          state.row.tokenHash = null; state.row.reissueCount++; return true;
        },
        audit: async entry => { if (state.failAudit) throw new Error("private audit failure"); state.audits.push(entry); },
      });
    })),
    withCashTokenExchange: (id, work) => locked(() => transactional(async () => work(id === state.row.sessionId ? structuredClone(state.row) : undefined, {
      now: new Date(state.now),
      persist: async ({ tokenHash, issueId, reissueCount = 0 }) => {
        if (state.row.tokenHash !== null || state.row.reissueCount !== reissueCount) return false;
        state.row.tokenHash = tokenHash; state.visitorAudits.push({ issueId, reissueCount }); return true;
      },
    }))),
    getVisitorByTokenHash: async tokenHash => state.row.tokenHash === tokenHash
      ? { ...structuredClone(state.row), nowUtc: new Date(state.now) } : undefined,
  };
  const codes = ["111111", "222222", "333333", "444444", "555555"];
  const service = new PaymentService(store, memory.redis, { now: () => state.now, cashCode: () => codes[state.codeSeq++ % codes.length] });
  const input = (extra = {}) => ({ sessionId: state.row.sessionId, paymentRef: state.row.paymentRef,
    paidAt: new Date(state.row.paidAt.getTime() + 5 * 60000).toISOString(), reason: "Khách đổi điện thoại, mất token", ...extra });
  return { service, state, store, redis: memory.redis, redisState: memory.state, oldToken, input };
}

it("verify matches session + payment_ref + paid time within ±10 minutes and reports the remaining budget", async () => {
  const f = reissueFixture();
  const result = await f.service.verifyTokenReissue(staff, f.input({ reason: undefined }));
  assert.equal(result.sessionId, f.state.row.sessionId); assert.equal(result.reissueCount, 0);
  assert.equal(result.maxReissues, 2); assert.equal(result.remainingAfter, 1); assert.equal(result.pendingPickup, false);
  assert.equal(result.expiresAt.getTime(), f.state.row.expiresAt.getTime());
  assert.equal(Object.hasOwn(result, "tokenHash"), false);
  assert.equal(f.state.row.reissueCount, 0); assert.equal(f.state.audits.length, 0); // Verification never mutates.
});
it("mismatched payment_ref, paid time beyond tolerance and unknown sessions fail identically (E3)", async () => {
  const f = reissueFixture();
  for (const body of [f.input({ paymentRef: randomUUID() }), f.input({ paidAt: new Date(f.state.row.paidAt.getTime() + 11 * 60000).toISOString() }),
    f.input({ sessionId: randomUUID() })]) {
    await assert.rejects(f.service.verifyTokenReissue(staff, body), { status: 409, code: "REISSUE_VERIFICATION_FAILED" });
    await assert.rejects(f.service.reissueToken(staff, body, { ipAddress: ip }), { status: 409, code: "REISSUE_VERIFICATION_FAILED" });
  }
  assert.equal(f.state.row.tokenHash, sha(f.oldToken)); assert.equal(f.state.row.reissueCount, 0); assert.equal(f.state.audits.length, 0);
});
it("invalid input, missing reason and server-owned fields are rejected before reading data (E2)", async () => {
  const f = reissueFixture();
  for (const body of [null, [], {}, f.input({ sessionId: "nope" }), f.input({ paymentRef: "x" }), f.input({ paidAt: "hôm qua" }),
    f.input({ reason: "abc" }), f.input({ reason: "<script>alert(1)</script>" }), f.input({ expiresAt: "2099-01-01T00:00:00Z" }),
    f.input({ reissueCount: 0 })]) {
    await assert.rejects(f.service.reissueToken(staff, body, { ipAddress: ip }), { status: 400 });
  }
  const { reason, ...withoutReason } = f.input();
  await assert.rejects(f.service.reissueToken(staff, withoutReason, { ipAddress: ip }), { status: 400 });
  assert.ok(reason);
  assert.equal(f.state.row.reissueCount, 0);
});
it("only active STAFF/ADMIN can verify or reissue (E1)", async () => {
  const f = reissueFixture();
  await assert.rejects(f.service.reissueToken(null, f.input(), { ipAddress: ip }), { status: 401 });
  for (const actor of [{ ...staff, role: "VISITOR" }, { ...staff, status: "LOCKED" }, { ...staff, locked_until: new Date(f.state.now + 3600000 * 1000) }]) {
    await assert.rejects(f.service.verifyTokenReissue(actor, f.input()), { status: 403 });
    await assert.rejects(f.service.reissueToken(actor, f.input(), { ipAddress: ip }), { status: 403 });
  }
  assert.equal(f.state.row.reissueCount, 0);
});
it("reissue revokes the old token, counts once, audits the reason and keeps the original ticket deadline", async () => {
  const f = reissueFixture(), expiry = f.state.row.expiresAt.getTime();
  const result = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
  assert.match(result.shortedCode, /^\d{6}$/); assert.equal(result.reissueNumber, 1); assert.equal(result.reissueCount, 1);
  assert.equal(result.remainingAfter, 1); assert.equal(result.renewedCode, false);
  assert.equal(result.expiresAt.getTime(), expiry); assert.ok(result.codeExpiresAt.getTime() <= expiry);
  assert.equal(f.state.row.tokenHash, null); assert.equal(f.state.row.reissueCount, 1); assert.equal(f.state.row.expiresAt.getTime(), expiry);
  assert.equal(f.state.audits.length, 1);
  assert.deepEqual({ reason: f.state.audits[0].reason, reissueNumber: f.state.audits[0].reissueNumber, ipAddress: f.state.audits[0].ipAddress },
    { reason: "Khách đổi điện thoại, mất token", reissueNumber: 1, ipAddress: ip });
  assert.equal(JSON.stringify(f.state.audits).includes(f.oldToken), false);
  // The old token is rejected at the next protected request (QT-05).
  await assert.rejects(f.service.authenticateVisitor(f.oldToken), { status: 401 });
});
it("the visitor redeems the pickup code once on the existing 6-digit form; count and deadline stay unchanged", async () => {
  for (const method of ["CASH", "ONLINE"]) {
    const f = reissueFixture({ method }), expiry = f.state.row.expiresAt.getTime();
    const { shortedCode } = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
    const visit = await f.service.exchangeCashCodeOnly({ shortedCode }, ip);
    assert.match(visit.token, /^tcv_visit_[a-f0-9]{64}$/); assert.notEqual(visit.token, f.oldToken);
    assert.equal(visit.expiresAt.getTime(), expiry);
    assert.equal(f.state.row.reissueCount, 1); assert.equal(f.state.row.tokenHash, sha(visit.token));
    assert.deepEqual(f.state.visitorAudits.map(a => a.reissueCount), [1]);
    assert.equal((await f.service.authenticateVisitor(visit.token)).sessionId, f.state.row.sessionId);
    await assert.rejects(f.service.exchangeCashCodeOnly({ shortedCode }, ip), { status: 401 });
  }
});
it("at most two reissues per ticket (AC5); the third is rejected without changing the token", async () => {
  const f = reissueFixture();
  for (let n = 1; n <= 2; n++) {
    const { shortedCode } = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
    await f.service.exchangeCashCodeOnly({ shortedCode }, ip);
    assert.equal(f.state.row.reissueCount, n);
  }
  const current = f.state.row.tokenHash;
  await assert.rejects(f.service.verifyTokenReissue(staff, f.input()), { code: "REISSUE_LIMIT_REACHED" });
  await assert.rejects(f.service.reissueToken(staff, f.input(), { ipAddress: ip }), { status: 409, code: "REISSUE_LIMIT_REACHED" });
  assert.equal(f.state.row.tokenHash, current); assert.equal(f.state.audits.length, 2);
});
it("concurrent staff confirmations serialize: one reissue is counted, the other renews the same pending pickup", async () => {
  const f = reissueFixture();
  const [a, b] = await Promise.all([f.service.reissueToken(staff, f.input(), { ipAddress: ip }), f.service.reissueToken(staff, f.input(), { ipAddress: ip })]);
  assert.equal(f.state.row.reissueCount, 1);
  assert.deepEqual([a.renewedCode, b.renewedCode].sort(), [false, true]);
  assert.equal(a.shortedCode, b.shortedCode); // The still-valid pickup code is reused, not a second grant.
});
it("a lost or expired pickup code can be renewed without consuming another reissue (E4 recovery)", async () => {
  const f = reissueFixture();
  const first = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
  f.state.now += 11 * 60000; // Pickup code TTL (10 min) elapsed before the visitor used it.
  await assert.rejects(f.service.exchangeCashCodeOnly({ shortedCode: first.shortedCode }, ip), { status: 401 });
  const verify = await f.service.verifyTokenReissue(staff, f.input({ paidAt: f.state.row.paidAt.toISOString() }));
  assert.equal(verify.pendingPickup, true); assert.equal(verify.remainingAfter, 1);
  const renewed = await f.service.reissueToken(staff, f.input({ paidAt: f.state.row.paidAt.toISOString() }), { ipAddress: ip });
  assert.equal(renewed.renewedCode, true); assert.equal(renewed.reissueNumber, 1); assert.notEqual(renewed.shortedCode, first.shortedCode);
  assert.equal(f.state.row.reissueCount, 1); assert.equal(f.state.audits.length, 2);
  assert.ok((await f.service.exchangeCashCodeOnly({ shortedCode: renewed.shortedCode }, ip)).token);
});
it("Redis or audit failure rolls back: the old token keeps working and no reissue is counted (E4)", async () => {
  const f = reissueFixture();
  f.redis.ensureCashCode = async () => { throw new Error("private Redis failure"); };
  await assert.rejects(f.service.reissueToken(staff, f.input(), { ipAddress: ip }), error => error.status === 503 && !error.message.includes("private"));
  assert.equal(f.state.row.tokenHash, sha(f.oldToken)); assert.equal(f.state.row.reissueCount, 0);
  assert.ok(await f.service.authenticateVisitor(f.oldToken));
  const g = reissueFixture(); g.state.failAudit = true;
  await assert.rejects(g.service.reissueToken(staff, g.input(), { ipAddress: ip }), { code: "REISSUE_PERSISTENCE_UNAVAILABLE" });
  assert.equal(g.state.row.tokenHash, sha(g.oldToken)); assert.equal(g.state.row.reissueCount, 0);
  // The orphan Redis pickup cannot redeem anything while SQL still holds the old token.
  const orphan = [...g.redisState.codes.values()][0];
  await assert.rejects(g.service.exchangeCashCodeOnly({ shortedCode: orphan.shortedCode }, ip), { status: 409 });
  g.state.failAudit = false;
  const retry = await g.service.reissueToken(staff, g.input(), { ipAddress: ip });
  assert.equal(retry.shortedCode, orphan.shortedCode); assert.equal(g.state.row.reissueCount, 1);
});
it("a leftover first-issue cash code is dropped and can never redeem the reissue", async () => {
  const f = reissueFixture();
  f.redisState.codes.set(f.state.row.sessionId, { sessionId: f.state.row.sessionId, issueId: randomUUID(),
    authCode: randomBytes(32).toString("hex"), shortedCode: "999999", expiresAtMs: f.state.now + 300000 });
  const result = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
  assert.notEqual(result.shortedCode, "999999");
  await assert.rejects(f.service.exchangeCashCodeOnly({ shortedCode: "999999" }, ip), { status: 401 });
  assert.ok((await f.service.exchangeCashCodeOnly({ shortedCode: result.shortedCode }, ip)).token);
});
it("unpaid, revoked, expired, never-exchanged and inconsistent tickets are not reissued", async () => {
  const cases = [[{ paymentStatus: "PENDING" }, "REISSUE_PAYMENT_NOT_PAID"], [{ sessionStatus: "REVOKED" }, "VISIT_SESSION_NOT_ACTIVE"],
    [{ expiresAt: new Date(Date.parse("2026-10-20T09:00:00Z")) }, "VISIT_SESSION_EXPIRED"], [{ tokenHash: null }, "REISSUE_NOT_NEEDED"],
    [{ activatedAt: null }, "PAYMENT_SESSION_INCONSISTENT"]];
  for (const [patch, code] of cases) {
    const f = reissueFixture(); Object.assign(f.state.row, patch);
    await assert.rejects(f.service.reissueToken(staff, f.input(), { ipAddress: ip }), { status: 409, code });
    assert.equal(f.state.row.reissueCount, 0); assert.equal(f.state.audits.length, 0); assert.equal(f.redisState.codes.size, 0);
  }
});
it("lost commit acknowledgement is reported as undetermined, and a retry does not count a second reissue", async () => {
  const f = reissueFixture(); f.state.lostCommitReply = true;
  await assert.rejects(f.service.reissueToken(staff, f.input(), { ipAddress: ip }), { code: "REISSUE_PERSISTENCE_UNAVAILABLE" });
  assert.equal(f.state.row.reissueCount, 1);
  f.state.lostCommitReply = false;
  const retry = await f.service.reissueToken(staff, f.input(), { ipAddress: ip });
  assert.equal(retry.renewedCode, true); assert.equal(f.state.row.reissueCount, 1);
});
