const { it } = require("node:test");
const assert = require("node:assert/strict");
const AuthStore = require("../stores/auth.store");
it("owner request insert failure rolls back user insert and releases the connection", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    query: async sql => {
      if (sql.startsWith("INSERT INTO USERS")) { calls.push("user insert"); return [{ insertId: 42 }]; }
      calls.push("request insert"); throw new Error("request insert failure");
    },
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
  };
  const store = new AuthStore({ getConnection: async () => connection });
  await assert.rejects(store.register({ email: "owner@example.com", passwordHash: "hash", role: "OWNER", status: "PENDING" }, {}), /request insert failure/);
  assert.deepEqual(calls, ["begin", "user insert", "request insert", "rollback", "release"]);
});
it("retries a rolled-back deadlock but never retries an unknown persistence error", async () => {
  let begins = 0, rollbacks = 0, releases = 0, commits = 0;
  const connection = {
    beginTransaction: async () => { begins++; },
    commit: async () => { commits++; },
    rollback: async () => { rollbacks++; },
    release: () => { releases++; },
  };
  const store = new AuthStore({ getConnection: async () => connection });
  const result = await store.transaction(async () => {
    if (begins === 1) throw Object.assign(new Error("deadlock"), { code: "ER_LOCK_DEADLOCK" });
    return 42;
  });
  assert.equal(result, 42);
  assert.deepEqual([begins, rollbacks, releases, commits], [2, 1, 2, 1]);
  await assert.rejects(store.transaction(async () => { throw new Error("unknown error"); }), /unknown error/);
  assert.equal(begins, 3);
});
it("bounds conflict retries and stops when rollback itself fails", async () => {
  let attempts = 0;
  const connection = {
    beginTransaction: async () => { attempts++; }, commit: async () => {},
    rollback: async () => {}, release: () => {},
  };
  const store = new AuthStore({ getConnection: async () => connection });
  const conflict = () => { throw Object.assign(new Error("deadlock"), { code: "ER_LOCK_DEADLOCK" }); };
  await assert.rejects(store.transaction(conflict), /deadlock/);
  assert.equal(attempts, 3);
  connection.rollback = async () => { throw new Error("rollback failed"); };
  await assert.rejects(store.transaction(conflict), /deadlock/);
  assert.equal(attempts, 4);
});
