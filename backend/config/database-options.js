const { X509Certificate } = require("node:crypto");
const { isIP } = require("node:net");

// Configuration only: callers keep the existing pool and UTC session wrapper.
function databaseOptions(env = process.env) {
  const options = {
    host: env.DB_HOST || "localhost", port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root", password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "food_tour_db", timezone: "Z",
    waitForConnections: true, connectionLimit: 10, connectTimeout: 3000, queueLimit: 0,
  };
  const mode = env.DB_SSL_MODE ?? "disabled", ca = env.DB_SSL_CA;
  if (mode === "disabled") {
    if (ca?.trim()) throw new Error("DB_TLS_MODE_REQUIRED");
    return options;
  }
  if (mode !== "verify_identity") throw new Error("INVALID_DB_TLS_CONFIG");
  try {
    // mysql2 verifies a DNS servername. Do not silently skip identity checking
    // by connecting to a numeric IP instead of the certificate's hostname.
    if (isIP(options.host) || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(options.host) ||
        typeof ca !== "string" || ca.length > 131072) throw new Error();
    const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    if (!certificates?.length || certificates.join("").replace(/\s/g, "") !== ca.replace(/\s/g, "") ||
        certificates.some(certificate => !new X509Certificate(certificate).ca)) throw new Error();
    options.ssl = { ca: certificates.join("\n"), rejectUnauthorized: true, verifyIdentity: true, minVersion: "TLSv1.2" };
    return options;
  } catch {
    // Never include host, credentials, CA contents or a driver error in logs.
    throw new Error("INVALID_DB_TLS_CONFIG");
  }
}
module.exports = { databaseOptions };
