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
module.exports = { getLookupConfig, getVisitPrice };
