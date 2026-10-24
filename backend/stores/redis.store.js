const { createClient } = require("redis");
const { timingSafeEqual, createHash } = require("node:crypto");
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
  if record.expiresAtMs > now then
    local lookup = ARGV[3] .. redis.sha1hex(record.shortedCode)
    if redis.call('GET', lookup) ~= existing or redis.call('PTTL', lookup) <= 0 then return {-2} end
    return {0, existing}
  end
  redis.call('DEL', KEYS[1])
end
local candidate = cjson.decode(ARGV[1])
if type(candidate.expiresAtMs) ~= 'number' or candidate.expiresAtMs > ticketEnd then return {-2} end
local ttl = candidate.expiresAtMs - now
if ttl <= 0 then return {-1} end
if redis.call('GET', KEYS[2]) then return {-3} end
redis.call('SET', KEYS[2], ARGV[1], 'PX', string.format('%.0f', ttl))
redis.call('SET', KEYS[1], ARGV[1], 'PX', string.format('%.0f', ttl))
return {1, ARGV[1]}`;
// Lookup reservations survive successful redemption until their original TTL.
// An immediate retry of a used code must never resolve to another visitor.
const resolveCashCodeScript = `
local value = redis.call('GET', KEYS[1])
if not value then return {0} end
local record = cjson.decode(value)
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
if type(record.expiresAtMs) ~= 'number' or redis.call('PTTL', KEYS[1]) <= 0 then return {-1} end
if record.expiresAtMs <= now then return {0} end
local sessionKey = ARGV[1] .. record.sessionId
local current = redis.call('GET', sessionKey)
if not current then return {0} end
if current ~= value or redis.call('PTTL', sessionKey) <= 0 then return {-1} end
return {1, value}`;
// Inspection never consumes a code: SQL must commit the unique token first.
const inspectCashCodeScript = `
local value = redis.call('GET', KEYS[1])
if not value then return {0} end
local record = cjson.decode(value)
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
if type(record.expiresAtMs) ~= 'number' or redis.call('PTTL', KEYS[1]) <= 0 then return {-1} end
if record.expiresAtMs <= now then return {0} end
if record.sessionId ~= ARGV[1] or record.shortedCode ~= ARGV[2] then return {0} end
return {1, value}`;
// Compare the issue ID, so a delayed cleanup cannot erase a different code.
const removeCashCodeScript = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local record = cjson.decode(value)
if record.issueId ~= ARGV[1] then return 0 end
return redis.call('DEL', KEYS[1])`;
const inspectOnlineCodeScript = `
local value = redis.call('GET', KEYS[1])
if not value then return {0} end
local record = cjson.decode(value)
if type(record.expiresAtMs) ~= 'number' or redis.call('PTTL', KEYS[1]) <= 0 then return {-1} end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
if record.expiresAtMs <= now or record.sessionId ~= ARGV[1] then return {0} end
return {1, value}`;
const ensureOnlineCodeScript = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local candidate = cjson.decode(ARGV[1])
if type(candidate.expiresAtMs) ~= 'number' or candidate.expiresAtMs <= now then return {-1} end
local existing = redis.call('GET', KEYS[1])
if existing then
  local record = cjson.decode(existing)
  if record.sessionId ~= candidate.sessionId or record.issueId ~= candidate.issueId or record.expiresAtMs ~= candidate.expiresAtMs or redis.call('PTTL', KEYS[1]) <= 0 then return {-2} end
  return {1, existing}
end
if ARGV[2] ~= '1' then return {0} end
redis.call('SET', KEYS[1], ARGV[1], 'PX', string.format('%.0f', candidate.expiresAtMs - now))
return {1, ARGV[1]}`;
class RedisStore {
  constructor({ url = process.env.REDIS_URL || "redis://127.0.0.1:6379", clientFactory = createClient,
    cashCodePrefix = "tcv:cash-code:v2:", onlineCodePrefix = "tcv:online-code:v1:" } = {}) {
    this.url = url; this.clientFactory = clientFactory; this.cashCodePrefix = cashCodePrefix;
    this.onlineCodePrefix = onlineCodePrefix;
    this.cashLookupPrefix = cashCodePrefix + "lookup:";
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
  async ping() {
    return this.execute(async client => {
      if (await client.ping() !== "PONG") throw new Error("INVALID_REDIS_PING_REPLY");
    });
  }
  async inspectOnlineCode(sessionId, authCode) {
    if (typeof authCode !== "string" || !/^[a-f0-9]{64}$/.test(authCode)) throw new Error("INVALID_ONLINE_CODE_INPUT");
    return this.execute(async client => {
      const reply = await client.eval(inspectOnlineCodeScript, { keys: [this.onlineCodePrefix + sessionId], arguments: [sessionId] });
      if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
      if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_ONLINE_CODE_STATE");
      const record = JSON.parse(reply[1]);
      if (record.sessionId !== sessionId || !/^[a-f0-9-]{36}$/.test(record.issueId) ||
          !Number.isSafeInteger(record.expiresAtMs) || !/^[a-f0-9]{64}$/.test(record.authCode)) throw new Error("INVALID_ONLINE_CODE_STATE");
      return timingSafeEqual(Buffer.from(authCode, "hex"), Buffer.from(record.authCode, "hex")) ? record : null;
    });
  }
  async removeOnlineCode(sessionId, issueId) {
    return this.execute(client => client.eval(removeCashCodeScript, { keys: [this.onlineCodePrefix + sessionId], arguments: [issueId] }));
  }
  async ensureOnlineCode(sessionId, candidate, allowCreate) {
    return this.execute(async client => {
      const reply = await client.eval(ensureOnlineCodeScript, { keys: [this.onlineCodePrefix + sessionId],
        arguments: [JSON.stringify(candidate), allowCreate ? "1" : "0"] });
      if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
      if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_ONLINE_CODE_STATE");
      const record = JSON.parse(reply[1]);
      if (record.sessionId !== sessionId || record.issueId !== candidate.issueId || record.expiresAtMs !== candidate.expiresAtMs ||
          !/^[a-f0-9]{64}$/.test(record.authCode)) throw new Error("INVALID_ONLINE_CODE_STATE");
      return record;
    });
  }
  async ensureCashCode(sessionId, candidate, ticketExpiresAtMs) {
    return this.execute(async client => {
      const lookupKey = this.cashLookupPrefix + createHash("sha1").update(candidate.shortedCode).digest("hex");
      const reply = await client.eval(issueCashCodeScript, { keys: [this.cashCodePrefix + sessionId, lookupKey],
        arguments: [JSON.stringify(candidate), String(ticketExpiresAtMs), this.cashLookupPrefix] });
      if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === -3) return { collision: true };
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
  async resolveCashCode(shortedCode) {
    if (typeof shortedCode !== "string" || !/^\d{6}$/.test(shortedCode)) throw new Error("INVALID_CASH_CODE_INPUT");
    return this.execute(async client => {
      const key = this.cashLookupPrefix + createHash("sha1").update(shortedCode).digest("hex");
      const reply = await client.eval(resolveCashCodeScript, { keys: [key], arguments: [this.cashCodePrefix] });
      if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
      if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_CASH_CODE_STATE");
      const record = JSON.parse(reply[1]);
      if (!/^[a-f0-9-]{36}$/.test(record.sessionId) || record.shortedCode !== shortedCode ||
          !/^[a-f0-9-]{36}$/.test(record.issueId) || !/^[a-f0-9]{64}$/.test(record.authCode) ||
          !Number.isSafeInteger(record.expiresAtMs)) throw new Error("INVALID_CASH_CODE_STATE");
      return record;
    });
  }
  async inspectCashCode(sessionId, shortedCode) {
    const current = await this.inspectCashCodeAt(this.cashCodePrefix, sessionId, shortedCode);
    if (current || this.cashCodePrefix !== "tcv:cash-code:v2:") return current;
    // Old clients still send session_id; do not invalidate their v1 codes.
    return this.inspectCashCodeAt("tcv:cash-code:v1:", sessionId, shortedCode);
  }
  async inspectCashCodeAt(prefix, sessionId, shortedCode) {
    return this.execute(async client => {
      const reply = await client.eval(inspectCashCodeScript, { keys: [prefix + sessionId],
        arguments: [sessionId, shortedCode] });
      if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
      if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_CASH_CODE_STATE");
      const record = JSON.parse(reply[1]);
      if (record.sessionId !== sessionId || record.shortedCode !== shortedCode ||
          !/^[a-f0-9-]{36}$/.test(record.issueId) || !/^[a-f0-9]{64}$/.test(record.authCode) ||
          !/^\d{6}$/.test(record.shortedCode) || !Number.isSafeInteger(record.expiresAtMs)) throw new Error("INVALID_CASH_CODE_STATE");
      return record;
    });
  }
  async removeCashCode(sessionId, issueId) {
    return this.execute(client => client.eval(removeCashCodeScript, { keys: [this.cashCodePrefix + sessionId], arguments: [issueId] }));
  }
}
module.exports = RedisStore;
module.exports.consumeScript = consumeScript;
module.exports.issueCashCodeScript = issueCashCodeScript;
module.exports.inspectCashCodeScript = inspectCashCodeScript;
module.exports.removeCashCodeScript = removeCashCodeScript;
module.exports.ensureOnlineCodeScript = ensureOnlineCodeScript;
module.exports.inspectOnlineCodeScript = inspectOnlineCodeScript;
