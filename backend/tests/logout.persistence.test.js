const { it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AuthService } = require("../services/auth.service");
const AuthStore = require("../stores/auth.store");
const RefreshTokenStore = require("../stores/refresh_token.store");
const SchemaStore = require("../stores/schema.store");

// Fake query executor only: keep the real Service, AuthStore and token Store
// wiring. MySQL JSON/locking semantics are covered by the integration suite.
function runtime() {
  const rows = [];
  const user = { user_id: 1, email: "logout@example.com", role: "STAFF", status: "ACTIVE" };
  const db = {
    async query(sql, params) {
      if (sql.startsWith("SELECT * FROM USERS")) return [[user]];
      if (sql.startsWith("SELECT") && sql.includes("WHERE token_hash")) {
        return [rows.filter(row => row.token_hash === params[0]).map(row => structuredClone(row))];
      }
      if (sql.startsWith("SELECT") && sql.includes("WHERE session_id")) {
        return [rows.filter(row => row.session_id === params[0]).map(row => structuredClone(row))];
      }
      if (sql.startsWith("UPDATE REFRESH_TOKENS")) {
        const row = rows.find(item => item.token_id === params[1]);
        if (!row) return [{ affectedRows: 0 }];
        if (sql.includes("JSON_ARRAY_APPEND")) (row.rotated_token_hashes ??= []).push(row.token_hash);
        row.token_hash = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("DELETE FROM REFRESH_TOKENS")) {
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          const matches = sql.includes("WHERE token_hash")
            ? row.token_hash === params[0] || (sql.includes("JSON_CONTAINS") && row.rotated_token_hashes?.includes(params[1]))
            : row.session_id === params[0] && (!params[1] || row.user_id === params[1]);
          if (matches) { rows.splice(i, 1); count++; }
        }
        return [{ affectedRows: count }];
      }
      throw new Error("Unexpected query in logout test");
    },
    async getConnection() {
      return { query: (...args) => db.query(...args), beginTransaction: async () => {},
        commit: async () => {}, rollback: async () => {}, release() {} };
    },
  };
  let now = Date.now();
  const config = { secret: "logout-test-only-secret-at-least-32-bytes", issuer: "food-tour-api",
    audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 7 * 86400000 };
  const service = () => new AuthService({ users: { getUserById: async () => user },
    authStore: new AuthStore(db), tokens: new RefreshTokenStore(db), config: () => config, now: () => now });
  const first = service();
  function seed(token, id = randomUUID()) {
    rows.push({ token_id: rows.length + 1, user_id: 1, session_id: id,
      token_hash: first.hashToken(token), expires_at: new Date(now + config.refreshTokenTtlMs) });
    return first.accessToken(user, id);
  }
  return { rows, first, service, seed, advance: ms => { now += ms; } };
}

it("real Stores revoke a rotated session using R1 after runtime reconstruction; another session survives", async () => {
  const f = runtime(), r1 = "1".repeat(64), other = "2".repeat(64);
  const originalAccess = f.seed(r1), otherAccess = f.seed(other);
  const r2 = await f.first.refresh({ refreshToken: r1 });
  const r3 = await f.first.refresh({ refreshToken: r2.refreshToken });
  const restarted = f.service();
  await assert.rejects(restarted.refresh({ refreshToken: r1 }), error => error.status === 401);
  await restarted.logout({ refreshToken: r1 });
  for (const access of [originalAccess, r2.accessToken, r3.accessToken]) {
    await assert.rejects(restarted.authenticate(access), error => error.code === "SESSION_REVOKED");
  }
  await assert.rejects(restarted.refresh({ refreshToken: r3.refreshToken }), error => error.status === 401);
  await restarted.logout({ refreshToken: r1 }); // idempotent
  assert.ok(await restarted.authenticate(otherAccess));
  assert.ok((await restarted.refresh({ refreshToken: other })).accessToken);
  assert.equal(f.rows.length, 1);
});

it("expired signed access revokes only its session even if the body names another session", async () => {
  const f = runtime(), r1 = "3".repeat(64), other = "4".repeat(64);
  const access = f.seed(r1); f.seed(other);
  const next = await f.first.refresh({ refreshToken: r1 });
  f.advance(3601000);
  await f.service().logout({ refreshToken: other }, { authorization: "Bearer " + access });
  await assert.rejects(f.first.refresh({ refreshToken: next.refreshToken }), error => error.status === 401);
  assert.ok((await f.first.refresh({ refreshToken: other })).accessToken);
});

it("forged access and a guessed session ID cannot revoke an unrelated session", async () => {
  const f = runtime(), refresh = "5".repeat(64);
  const access = f.seed(refresh);
  await f.first.logout({ refreshToken: "6".repeat(64), sessionId: f.rows[0].session_id },
    { authorization: "Bearer " + access + "tampered" });
  assert.ok(await f.first.authenticate(access));
});

it("a valid Bearer logout ignores an invalid optional refresh body", async () => {
  const f = runtime(), access = f.seed("7".repeat(64));
  await f.first.logout({ refreshToken: "broken" }, { authorization: "Bearer " + access });
  await assert.rejects(f.first.authenticate(access), error => error.code === "SESSION_REVOKED");
});

it("migration adds durable rotation history once and can be rerun", async () => {
  let present = false, alters = 0;
  const db = { query: async sql => {
    if (sql.startsWith("SHOW COLUMNS")) return [present ? [{ Field: "rotated_token_hashes" }] : []];
    if (sql.includes("ALTER TABLE")) { alters++; present = true; }
    return [{}];
  } };
  const schema = new SchemaStore(db);
  await schema.migrateRefreshTokens(); await schema.migrateRefreshTokens();
  assert.equal(alters, 1);
});
