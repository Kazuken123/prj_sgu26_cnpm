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
function getMockWebhookSecret(env = process.env) {
  const secret = env.MOCK_WEBHOOK_SECRET;
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32 || Buffer.byteLength(secret, "utf8") > 1024) {
    throw new Error("INVALID_MOCK_WEBHOOK_SECRET");
  }
  return secret;
}
function getOnlineExchangeConfig(env = process.env) {
  const integer = (value, fallback, maximum) => {
    const raw = value ?? String(fallback), parsed = Number(raw);
    if (!/^[1-9]\d*$/.test(String(raw)) || !Number.isSafeInteger(parsed) || parsed > maximum) throw new Error("INVALID_ONLINE_EXCHANGE_CONFIG");
    return parsed;
  };
  return { windowSeconds: integer(env.ONLINE_EXCHANGE_WINDOW_SECONDS, 60, 3600),
    ipLimit: integer(env.ONLINE_EXCHANGE_IP_LIMIT, 30, 10000), sessionLimit: integer(env.ONLINE_EXCHANGE_SESSION_LIMIT, 5, 10000) };
}
function isMockSimulationEnabled(env = process.env) {
  return env.MOCK_PAYMENT_SIMULATION_ENABLED === "true";
}
module.exports = { getOnlineCodeTtlMs, getMockGatewayConfig, getMockWebhookSecret, getOnlineExchangeConfig, isMockSimulationEnabled };
