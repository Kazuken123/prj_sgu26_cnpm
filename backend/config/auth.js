function getAuthConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && Buffer.byteLength(secret) < 32)) {
    throw new Error("JWT_SECRET phải được cấu hình; production cần ít nhất 32 bytes.");
  }
  return {
    secret,
    issuer: "food-tour-api",
    audience: "food-tour-client",
    accessTokenTtl: "1h",
    refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
  };
}
module.exports = { getAuthConfig };
