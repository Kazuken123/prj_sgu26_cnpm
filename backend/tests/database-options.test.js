const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { rootCertificates } = require("node:tls");
const { databaseOptions } = require("../config/database-options");
const ca = rootCertificates[0]; // Public CA, not an account credential.
test("database configuration preserves local defaults and UTC pool bounds", () => {
  assert.deepEqual(databaseOptions({}), { host: "localhost", port: 3306, user: "root", password: "", database: "food_tour_db",
    timezone: "Z", waitForConnections: true, connectionLimit: 10, connectTimeout: 3000, queueLimit: 0 });
});
test("verified TLS keeps configured database credentials and requires both chain and hostname checks", () => {
  const options = databaseOptions({ DB_HOST: "db.example.test", DB_PORT: "12834", DB_USER: "TEST user", DB_PASSWORD: "TEST password",
    DB_NAME: "TEST db", DB_SSL_MODE: "verify_identity", DB_SSL_CA: ca });
  assert.equal(options.port, 12834); assert.equal(options.password, "TEST password"); assert.equal(options.database, "TEST db");
  assert.deepEqual(options.ssl, { ca, rejectUnauthorized: true, verifyIdentity: true, minVersion: "TLSv1.2" });
});
test("TLS cannot downgrade to permissive modes or silently ignore a supplied CA", () => {
  for (const mode of ["required", "true", "false", "verify_ca", "insecure", ""]) assert.throws(() => databaseOptions({ DB_SSL_MODE: mode, DB_SSL_CA: ca }), /INVALID_DB_TLS_CONFIG/);
  assert.throws(() => databaseOptions({ DB_SSL_CA: ca }), /DB_TLS_MODE_REQUIRED/);
});
test("missing, corrupted, extraneous or oversized CA input fails without revealing configuration", () => {
  for (const bad of [undefined, "", "TEST secret text", "-----BEGIN CERTIFICATE-----\nbad\n-----END CERTIFICATE-----", ca + "unexpected", ca.repeat(Math.ceil(131073 / ca.length))]) {
    assert.throws(() => databaseOptions({ DB_HOST: "db.example.test", DB_SSL_MODE: "verify_identity", DB_SSL_CA: bad, DB_PASSWORD: "TEST must not leak" }),
      error => error.message === "INVALID_DB_TLS_CONFIG");
  }
});
test("numeric addresses and malformed hosts cannot bypass mysql2 hostname verification", () => {
  for (const host of ["127.0.0.1", "::1", "user:TEST@db", "db/path", "https://db.example.test"]) assert.throws(() => databaseOptions({ DB_HOST: host, DB_SSL_MODE: "verify_identity", DB_SSL_CA: ca }), /INVALID_DB_TLS_CONFIG/);
});
test("CA chains and CRLF certificate files remain accepted with strict verification", () => {
  const options = databaseOptions({ DB_HOST: "db.example.test", DB_SSL_MODE: "verify_identity", DB_SSL_CA: " \n" + [ca, rootCertificates[1]].join("\n").replace(/\n/g, "\r\n") + "\n" });
  assert.equal(options.ssl.verifyIdentity, true); assert.equal(options.ssl.rejectUnauthorized, true);
});

if (process.env.RUN_DB_TLS_TESTS === "1") describe("Real MySQL verified TLS on a disposable test server", () => {
  const mysql = require("mysql2/promise"), fs = require("node:fs");
  const testCa = fs.readFileSync(process.env.TEST_MYSQL_CA_FILE, "utf8");
  const env = { ...process.env, DB_NAME: "mysql", DB_SSL_MODE: "verify_identity", DB_SSL_CA: testCa };
  async function read(overrides) {
    const pool = mysql.createPool(databaseOptions({ ...env, ...overrides }));
    try { return await pool.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'"); } finally { await pool.end(); }
  }
  test("valid CA and matching DNS produce an encrypted SQL connection", async () => {
    const [rows] = await read({}); assert.ok(rows[0].Value);
  });
  test("untrusted CA is rejected instead of falling back to cleartext", async () => {
    await assert.rejects(read({ DB_SSL_CA: ca }));
  });
  test("trusted CA with the wrong DNS is rejected", async () => {
    await assert.rejects(read({ DB_HOST: "wrong-database" }));
  });
});
