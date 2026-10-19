const { createClient } = require("redis");
// Both buckets are updated atomically, with expiry assigned in the same script.
const consumeScript = `
local allowed = 1
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, ARGV[1]) end
  if count > tonumber(ARGV[i + 1]) then allowed = 0 end
end
return allowed`;
// One expiring record binds (session_id, shorted_code) to auth_code. Lua makes
// create-or-reuse atomic; a retry must not refresh the original deadline.
const issueCashCodeScript = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local ticketEnd = tonumber(ARGV[2])
if not ticketEnd or ticketEnd <= now then return {-1} end
local existing = redis.call('GET', KEYS[1])
if existing then
  local record = cjson.decode(existing)
  if type(record.expiresAtMs) ~= 'number' then return {-2} end
  if record.expiresAtMs > ticketEnd or redis.call('PTTL', KEYS[1]) <= 0 then return {-2} end
  if record.expiresAtMs > now then return {0, existing} end
  redis.call('DEL', KEYS[1])
end
local candidate = cjson.decode(ARGV[1])
if type(candidate.expiresAtMs) ~= 'number' or candidate.expiresAtMs > ticketEnd then return {-2} end
local ttl = candidate.expiresAtMs - now
if ttl <= 0 then return {-1} end
redis.call('SET', KEYS[1], ARGV[1], 'PX', string.format('%.0f', ttl))
return {1, ARGV[1]}`;
class RedisStore {
  constructor({ url = process.env.REDIS_URL || "redis://127.0.0.1:6379", clientFactory = createClient,
    cashCodePrefix = "tcv:cash-code:v1:" } = {}) {
    this.url = url; this.clientFactory = clientFactory; this.cashCodePrefix = cashCodePrefix;
  }
  async execute(work) {
    const client = this.clientFactory({ url: this.url, disableOfflineQueue: true,
      socket: { connectTimeout: 1000, reconnectStrategy: false } });
    client.on("error", () => {}); // Never log Redis URLs/credentials.
    let timer;
    try {
      const run = async () => {
        await client.connect();
        return work(client);
      };
      return await Promise.race([run(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("REDIS_TIMEOUT")), 2000);
      })]);
    } finally {
      clearTimeout(timer);
      if (client.isOpen) await client.disconnect();
    }
  }
  async consumeLookup(keys, { windowSeconds, ipLimit, sessionLimit }) {
    return this.execute(async client => Number(await client.eval(consumeScript, { keys,
      arguments: [String(windowSeconds), String(ipLimit), String(sessionLimit)] })) === 1);
  }
  async ensureCashCode(sessionId, candidate, ticketExpiresAtMs) {
    return this.execute(async client => {
      const reply = await client.eval(issueCashCodeScript, { keys: [this.cashCodePrefix + sessionId],
        arguments: [JSON.stringify(candidate), String(ticketExpiresAtMs)] });
      if (!Array.isArray(reply) || ![0, 1].includes(Number(reply[0])) || typeof reply[1] !== "string") {
        throw new Error("CASH_CODE_STATE_UNAVAILABLE");
      }
      const record = JSON.parse(reply[1]);
      if (record.sessionId !== sessionId || !/^[a-f0-9-]{36}$/.test(record.issueId) ||
          !/^[a-f0-9]{64}$/.test(record.authCode) || !/^\d{6}$/.test(record.shortedCode) ||
          !Number.isSafeInteger(record.expiresAtMs) || record.expiresAtMs > ticketExpiresAtMs) {
        throw new Error("INVALID_CASH_CODE_STATE");
      }
      return { created: Number(reply[0]) === 1, record };
    });
  }
}
module.exports = RedisStore;
module.exports.consumeScript = consumeScript;
module.exports.issueCashCodeScript = issueCashCodeScript;
