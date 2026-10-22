const { createClient } = require("redis");
const { timingSafeEqual } = require("node:crypto");
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

const devInMemoryState = {
  active: false,
  onlineCodes: new Map(),
  cashCodes: new Map()
};

function isDevMode(store) {
  return store.clientFactory === createClient && process.env.NODE_ENV === "development";
}

class RedisStore {
  constructor({ url = process.env.REDIS_URL || "redis://127.0.0.1:6379", clientFactory = createClient,
    cashCodePrefix = "tcv:cash-code:v1:", onlineCodePrefix = "tcv:online-code:v1:" } = {}) {
    this.url = url; this.clientFactory = clientFactory; this.cashCodePrefix = cashCodePrefix;
    this.onlineCodePrefix = onlineCodePrefix;
  }
  async execute(work) {
    if (isDevMode(this) && devInMemoryState.active) {
      return null;
    }
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
    } catch (err) {
      if (isDevMode(this) && (err.code === "ECONNREFUSED" || /connect ECONNREFUSED/.test(err?.message || "") || err.message === "REDIS_TIMEOUT")) {
        devInMemoryState.active = true;
        return null;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      if (client.isOpen) await client.disconnect();
    }
  }
  async consumeLookup(keys, { windowSeconds, ipLimit, sessionLimit }) {
    if (isDevMode(this) && devInMemoryState.active) return true;
    try {
      const result = await this.execute(async client => Number(await client.eval(consumeScript, { keys,
        arguments: [String(windowSeconds), String(ipLimit), String(sessionLimit)] })) === 1);
      if (isDevMode(this) && devInMemoryState.active) return true;
      return result;
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) return true;
      throw err;
    }
  }
  async ping() {
    if (isDevMode(this) && devInMemoryState.active) return "PONG";
    try {
      await this.execute(async client => {
        if (await client.ping() !== "PONG") throw new Error("INVALID_REDIS_PING_REPLY");
      });
      return "PONG";
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) return "PONG";
      throw err;
    }
  }
  async inspectOnlineCode(sessionId, authCode) {
    if (typeof authCode !== "string" || !/^[a-f0-9]{64}$/.test(authCode)) throw new Error("INVALID_ONLINE_CODE_INPUT");
    if (isDevMode(this) && devInMemoryState.active) {
      const record = devInMemoryState.onlineCodes.get(sessionId);
      if (!record || record.expiresAtMs <= Date.now()) return null;
      return timingSafeEqual(Buffer.from(authCode, "hex"), Buffer.from(record.authCode, "hex")) ? record : null;
    }
    try {
      return await this.execute(async client => {
        const reply = await client.eval(inspectOnlineCodeScript, { keys: [this.onlineCodePrefix + sessionId], arguments: [sessionId] });
        if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
        if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_ONLINE_CODE_STATE");
        const record = JSON.parse(reply[1]);
        if (record.sessionId !== sessionId || !/^[a-f0-9-]{36}$/.test(record.issueId) ||
            !Number.isSafeInteger(record.expiresAtMs) || !/^[a-f0-9]{64}$/.test(record.authCode)) throw new Error("INVALID_ONLINE_CODE_STATE");
        return timingSafeEqual(Buffer.from(authCode, "hex"), Buffer.from(record.authCode, "hex")) ? record : null;
      });
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const record = devInMemoryState.onlineCodes.get(sessionId);
        if (!record || record.expiresAtMs <= Date.now()) return null;
        return timingSafeEqual(Buffer.from(authCode, "hex"), Buffer.from(record.authCode, "hex")) ? record : null;
      }
      throw err;
    }
  }
  async removeOnlineCode(sessionId, issueId) {
    if (isDevMode(this) && devInMemoryState.active) {
      const record = devInMemoryState.onlineCodes.get(sessionId);
      if (record && record.issueId === issueId) devInMemoryState.onlineCodes.delete(sessionId);
      return 1;
    }
    try {
      return await this.execute(client => client.eval(removeCashCodeScript, { keys: [this.onlineCodePrefix + sessionId], arguments: [issueId] }));
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const record = devInMemoryState.onlineCodes.get(sessionId);
        if (record && record.issueId === issueId) devInMemoryState.onlineCodes.delete(sessionId);
        return 1;
      }
      throw err;
    }
  }
  async ensureOnlineCode(sessionId, candidate, allowCreate) {
    if (isDevMode(this) && devInMemoryState.active) {
      const existing = devInMemoryState.onlineCodes.get(sessionId);
      if (existing) {
        if (existing.sessionId !== candidate.sessionId || existing.issueId !== candidate.issueId ||
            existing.expiresAtMs !== candidate.expiresAtMs) {
          throw new Error("INVALID_ONLINE_CODE_STATE");
        }
        return existing;
      }
      if (!allowCreate) return null;
      devInMemoryState.onlineCodes.set(sessionId, candidate);
      return candidate;
    }
    try {
      const result = await this.execute(async client => {
        const reply = await client.eval(ensureOnlineCodeScript, { keys: [this.onlineCodePrefix + sessionId],
          arguments: [JSON.stringify(candidate), allowCreate ? "1" : "0"] });
        if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
        if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_ONLINE_CODE_STATE");
        const record = JSON.parse(reply[1]);
        if (record.sessionId !== sessionId || record.issueId !== candidate.issueId || record.expiresAtMs !== candidate.expiresAtMs ||
            !/^[a-f0-9]{64}$/.test(record.authCode)) throw new Error("INVALID_ONLINE_CODE_STATE");
        return record;
      });
      if (isDevMode(this) && devInMemoryState.active) {
        const existing = devInMemoryState.onlineCodes.get(sessionId);
        if (existing) return existing;
        if (!allowCreate) return null;
        devInMemoryState.onlineCodes.set(sessionId, candidate);
        return candidate;
      }
      return result;
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const existing = devInMemoryState.onlineCodes.get(sessionId);
        if (existing) return existing;
        if (!allowCreate) return null;
        devInMemoryState.onlineCodes.set(sessionId, candidate);
        return candidate;
      }
      throw err;
    }
  }
  async ensureCashCode(sessionId, candidate, ticketExpiresAtMs) {
    if (isDevMode(this) && devInMemoryState.active) {
      const existing = devInMemoryState.cashCodes.get(sessionId);
      if (existing && existing.expiresAtMs > Date.now()) {
        return { created: false, record: existing };
      }
      devInMemoryState.cashCodes.set(sessionId, candidate);
      return { created: true, record: candidate };
    }
    try {
      const result = await this.execute(async client => {
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
      if (isDevMode(this) && devInMemoryState.active) {
        const existing = devInMemoryState.cashCodes.get(sessionId);
        if (existing && existing.expiresAtMs > Date.now()) {
          return { created: false, record: existing };
        }
        devInMemoryState.cashCodes.set(sessionId, candidate);
        return { created: true, record: candidate };
      }
      return result;
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const existing = devInMemoryState.cashCodes.get(sessionId);
        if (existing && existing.expiresAtMs > Date.now()) {
          return { created: false, record: existing };
        }
        devInMemoryState.cashCodes.set(sessionId, candidate);
        return { created: true, record: candidate };
      }
      throw err;
    }
  }
  async inspectCashCode(sessionId, shortedCode) {
    if (isDevMode(this) && devInMemoryState.active) {
      const record = devInMemoryState.cashCodes.get(sessionId);
      if (!record || record.expiresAtMs <= Date.now() || record.shortedCode !== shortedCode) return null;
      return record;
    }
    try {
      return await this.execute(async client => {
        const reply = await client.eval(inspectCashCodeScript, { keys: [this.cashCodePrefix + sessionId],
          arguments: [sessionId, shortedCode] });
        if (Array.isArray(reply) && reply.length === 1 && Number(reply[0]) === 0) return null;
        if (!Array.isArray(reply) || Number(reply[0]) !== 1 || typeof reply[1] !== "string") throw new Error("INVALID_CASH_CODE_STATE");
        const record = JSON.parse(reply[1]);
        if (record.sessionId !== sessionId || record.shortedCode !== shortedCode ||
            !/^[a-f0-9-]{36}$/.test(record.issueId) || !/^[a-f0-9]{64}$/.test(record.authCode) ||
            !/^\d{6}$/.test(record.shortedCode) || !Number.isSafeInteger(record.expiresAtMs)) throw new Error("INVALID_CASH_CODE_STATE");
        return record;
      });
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const record = devInMemoryState.cashCodes.get(sessionId);
        if (!record || record.expiresAtMs <= Date.now() || record.shortedCode !== shortedCode) return null;
        return record;
      }
      throw err;
    }
  }
  async removeCashCode(sessionId, issueId) {
    if (isDevMode(this) && devInMemoryState.active) {
      const record = devInMemoryState.cashCodes.get(sessionId);
      if (record && record.issueId === issueId) devInMemoryState.cashCodes.delete(sessionId);
      return 1;
    }
    try {
      return await this.execute(client => client.eval(removeCashCodeScript, { keys: [this.cashCodePrefix + sessionId], arguments: [issueId] }));
    } catch (err) {
      if (isDevMode(this) && devInMemoryState.active) {
        const record = devInMemoryState.cashCodes.get(sessionId);
        if (record && record.issueId === issueId) devInMemoryState.cashCodes.delete(sessionId);
        return 1;
      }
      throw err;
    }
  }
}
module.exports = RedisStore;
module.exports.consumeScript = consumeScript;
module.exports.issueCashCodeScript = issueCashCodeScript;
module.exports.inspectCashCodeScript = inspectCashCodeScript;
module.exports.removeCashCodeScript = removeCashCodeScript;
module.exports.ensureOnlineCodeScript = ensureOnlineCodeScript;
module.exports.inspectOnlineCodeScript = inspectOnlineCodeScript;
