function getOnlineCodeTtlMs(env = process.env) {
  const raw = env.ONLINE_CODE_TTL_SECONDS ?? "900";
  const seconds = Number(raw);
  if (!/^[1-9]\d*$/.test(String(raw)) || !Number.isSafeInteger(seconds) || !Number.isSafeInteger(seconds * 1000)) {
    throw new Error("INVALID_ONLINE_CODE_TTL");
  }
  return seconds * 1000;
}
function getMockGatewayConfig(env = process.env) {
  // Mock payments must be explicitly enabled, including in a production-mode demo.
  if (env.PAYMENT_GATEWAY !== "mock") throw new Error("MOCK_GATEWAY_DISABLED");
  const url = new URL(env.MOCK_PAYMENT_BASE_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("INVALID_MOCK_PAYMENT_BASE_URL");
  }
  return { provider: "MOCK", publicBaseUrl: url.origin };
}
module.exports = { getOnlineCodeTtlMs, getMockGatewayConfig };
