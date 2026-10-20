const { it } = require("node:test");
const assert = require("node:assert/strict");
const utcPool = require("../config/utc-pool");

it("UTC is established before query, execute and transaction checkout", async () => {
  const calls = [];
  const connection = {
    query: async statement => { calls.push(typeof statement === "object" ? statement.sql : statement); return [42]; },
    execute: async statement => { calls.push(statement); return [43]; },
    release: () => calls.push("release"), destroy: () => calls.push("destroy"),
  };
  const db = utcPool({ getConnection: async () => connection, end: async () => calls.push("end") });
  assert.deepEqual(await db.query("read"), [42]);
  assert.deepEqual(await db.execute("write"), [43]);
  (await db.getConnection()).release();
  await db.end();
  const utc = "SET SESSION time_zone = '+00:00'";
  assert.deepEqual(calls, [utc, "read", "release", utc, "write", "release", utc, "release", "end"]);
});

it("UTC setup failure discards the connection without executing business SQL", async () => {
  const calls = [], failure = new Error("setup failed");
  const connection = {
    query: async () => { calls.push("setup"); throw failure; },
    destroy: () => calls.push("destroy"), release: () => calls.push("release"),
  };
  const db = utcPool({ getConnection: async () => connection });
  await assert.rejects(db.query("must not execute"), error => error === failure);
  assert.deepEqual(calls, ["setup", "destroy"]);
});

it("business query failure releases an initialized connection and preserves the error", async () => {
  let released = 0;
  const failure = new Error("query failed");
  const db = utcPool({ getConnection: async () => ({
    query: async sql => { if (typeof sql === "string") throw failure; },
    release: () => { released++; },
  }) });
  await assert.rejects(db.query("bad SQL"), error => error === failure);
  assert.equal(released, 1);
});

it("SQL defaults remain UTC after a non-UTC connection is reused", { skip: process.env.RUN_DB_TESTS !== "1" }, async () => {
  const mysql = require("mysql2/promise");
  const raw = mysql.createPool({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", timezone: "Z", connectionLimit: 1, connectTimeout: 3000 });
  const db = utcPool(raw);
  try {
    await raw.query("SET SESSION time_zone = '+07:00'");
    const [rows] = await db.query("SELECT @@session.time_zone AS zone, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), CURRENT_TIMESTAMP) AS offsetSeconds");
    assert.equal(rows[0].zone, "+00:00"); assert.equal(rows[0].offsetSeconds, 0);
    const connection = await db.getConnection();
    try { await connection.query("SET SESSION time_zone = '-05:00'"); } finally { connection.release(); }
    const next = await db.getConnection();
    try {
      await next.beginTransaction();
      const [again] = await next.query("SELECT @@session.time_zone AS zone");
      assert.equal(again[0].zone, "+00:00");
      await next.rollback();
    } finally { next.release(); }
  } finally { await db.end(); }
});
