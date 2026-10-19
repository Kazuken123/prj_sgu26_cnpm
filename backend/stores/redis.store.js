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
class RedisStore {
  constructor({ url = process.env.REDIS_URL || "redis://127.0.0.1:6379", clientFactory = createClient } = {}) {
    this.url = url; this.clientFactory = clientFactory;
  }
  async consumeLookup(keys, { windowSeconds, ipLimit, sessionLimit }) {
    const client = this.clientFactory({ url: this.url, disableOfflineQueue: true,
      socket: { connectTimeout: 1000, reconnectStrategy: false } });
    client.on("error", () => {}); // Never log Redis URLs/credentials.
    let timer;
    try {
      const work = async () => {
        await client.connect();
        return Number(await client.eval(consumeScript, { keys,
          arguments: [String(windowSeconds), String(ipLimit), String(sessionLimit)] })) === 1;
      };
      return await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("REDIS_TIMEOUT")), 2000);
      })]);
    } finally {
      clearTimeout(timer);
      if (client.isOpen) await client.disconnect();
    }
  }
}
module.exports = RedisStore;
module.exports.consumeScript = consumeScript;
