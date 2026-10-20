function getPipelineLeaseConfig(env = process.env) {
  const positive = (raw, fallback, maximum) => {
    const value = raw ?? String(fallback), number = Number(value);
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(number) || number > maximum) throw new Error("INVALID_CONTENT_LEASE_CONFIG");
    return number;
  };
  const leaseSeconds = positive(env.CONTENT_JOB_LEASE_SECONDS, 120, 3600);
  const heartbeatSeconds = positive(env.CONTENT_JOB_HEARTBEAT_SECONDS, 15, 1200);
  if (heartbeatSeconds * 3 > leaseSeconds) throw new Error("INVALID_CONTENT_LEASE_CONFIG");
  return { leaseSeconds, heartbeatSeconds };
}
module.exports = { getPipelineLeaseConfig };
