function positiveInteger(value, fallback, maximum) {
  const number = Number(value ?? fallback);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new Error("INVALID_RATE_LIMIT_CONFIG");
  return number;
}
function getLookupConfig(env = process.env) {
  return {
    windowSeconds: positiveInteger(env.VISIT_LOOKUP_WINDOW_SECONDS, 60, 3600),
    ipLimit: positiveInteger(env.VISIT_LOOKUP_IP_LIMIT, 60, 10000),
    sessionLimit: positiveInteger(env.VISIT_LOOKUP_SESSION_LIMIT, 20, 10000),
  };
}
function getVisitPrice(env = process.env) {
  const price = env.VISIT_PRICE_VND;
  // Decimal strings avoid floating point rounding and match DECIMAL(12,2).
  if (typeof price !== "string" || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    throw new Error("VISIT_PRICE_NOT_CONFIGURED");
  }
  return Number(price).toFixed(2);
}
function getVisitValidityMs(env = process.env) {
  const raw = env.VISIT_VALIDITY_HOURS ?? "24";
  const hours = Number(raw);
  if (!/^[1-9]\d*$/.test(String(raw)) || !Number.isSafeInteger(hours) || !Number.isSafeInteger(hours * 3600000)) {
    throw new Error("INVALID_VISIT_VALIDITY_CONFIG");
  }
  return hours * 3600000;
}
function getCashCodeTtlMs(env = process.env) {
  const raw = env.CASH_CODE_TTL_SECONDS ?? "600";
  const seconds = Number(raw);
  if (!/^[1-9]\d*$/.test(String(raw)) || !Number.isSafeInteger(seconds) || !Number.isSafeInteger(seconds * 1000)) {
    throw new Error("INVALID_CASH_CODE_TTL_CONFIG");
  }
  return seconds * 1000;
}
function getCashExchangeConfig(env = process.env) {
  return {
    windowSeconds: positiveInteger(env.CASH_EXCHANGE_WINDOW_SECONDS, 60, 3600),
    ipLimit: positiveInteger(env.CASH_EXCHANGE_IP_LIMIT, 30, 10000),
    sessionLimit: positiveInteger(env.CASH_EXCHANGE_SESSION_LIMIT, 5, 10000),
  };
}
module.exports = { getLookupConfig, getVisitPrice, getVisitValidityMs, getCashCodeTtlMs, getCashExchangeConfig };
