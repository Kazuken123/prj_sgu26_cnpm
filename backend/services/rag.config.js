// Knowledge/RAG limits. Kept beside the subsystem until the integration owner
// decides whether it moves to config/. MOCK is the default; an external provider
// is used only when RAG_ALLOW_EXTERNAL_PROVIDER=true and its URL/key/models are set.
const PROVIDERS = ["MOCK", "OPENAI_COMPATIBLE"];
function integer(value, fallback, min, max, name) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < min || Number(value) > max) throw new Error("INVALID_RAG_CONFIG:" + name);
  return Number(value);
}
function score(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(String(value)) || number < -1 || number > 1) throw new Error("INVALID_RAG_CONFIG:" + name);
  return number;
}
const modelName = (value, name) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:/@-]{1,100}$/.test(value)) throw new Error("INVALID_RAG_CONFIG:" + name);
  return value;
};
function baseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("INVALID_RAG_CONFIG:RAG_API_BASE_URL"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Credentials travel in a header, so plain HTTP is allowed only to this machine.
  if (url.username || url.password || url.search || url.hash || !(url.protocol === "https:" || (url.protocol === "http:" && local))) {
    throw new Error("INVALID_RAG_CONFIG:RAG_API_BASE_URL");
  }
  return url.href.replace(/\/+$/, "");
}
function getRagConfig(env = process.env) {
  const provider = env.RAG_PROVIDER || "MOCK";
  if (!PROVIDERS.includes(provider)) throw new Error("INVALID_RAG_CONFIG:RAG_PROVIDER");
  const external = provider !== "MOCK";
  // Sending documents/questions out is a data-sharing decision, never a default.
  if (external && env.RAG_ALLOW_EXTERNAL_PROVIDER !== "true") throw new Error("INVALID_RAG_CONFIG:RAG_ALLOW_EXTERNAL_PROVIDER");
  const chunkSize = integer(env.RAG_CHUNK_SIZE, 800, 200, 4000, "RAG_CHUNK_SIZE");
  const chunkOverlap = integer(env.RAG_CHUNK_OVERLAP, 120, 0, 1000, "RAG_CHUNK_OVERLAP");
  if (chunkOverlap >= chunkSize / 2) throw new Error("INVALID_RAG_CONFIG:RAG_CHUNK_OVERLAP");
  if (external && !env.RAG_EMBEDDING_DIMENSIONS) throw new Error("INVALID_RAG_CONFIG:RAG_EMBEDDING_DIMENSIONS");
  const config = {
    provider,
    embeddingModel: external ? modelName(env.RAG_EMBEDDING_MODEL, "RAG_EMBEDDING_MODEL") : modelName(env.RAG_EMBEDDING_MODEL || "mock-hash-v1", "RAG_EMBEDDING_MODEL"),
    embeddingDimensions: integer(env.RAG_EMBEDDING_DIMENSIONS, 256, 8, 8192, "RAG_EMBEDDING_DIMENSIONS"),
    llmModel: external ? modelName(env.RAG_LLM_MODEL, "RAG_LLM_MODEL") : "mock-echo",
    apiBaseUrl: external ? baseUrl(env.RAG_API_BASE_URL) : null,
    embeddingTimeoutMs: integer(env.RAG_EMBEDDING_TIMEOUT_MS, 10000, 100, 60000, "RAG_EMBEDDING_TIMEOUT_MS"),
    llmTimeoutMs: integer(env.RAG_LLM_TIMEOUT_MS, 20000, 100, 120000, "RAG_LLM_TIMEOUT_MS"),
    chunkSize, chunkOverlap,
    maxChunks: integer(env.RAG_MAX_CHUNKS, 64, 1, 500, "RAG_MAX_CHUNKS"),
    topK: integer(env.RAG_TOP_K, 4, 1, 20, "RAG_TOP_K"),
    minScore: score(env.RAG_MIN_SCORE, 0.2, "RAG_MIN_SCORE"),
    rate: {
      windowSeconds: integer(env.CHAT_RATE_WINDOW_SECONDS, 60, 1, 3600, "CHAT_RATE_WINDOW_SECONDS"),
      sessionLimit: integer(env.CHAT_RATE_SESSION_LIMIT, 10, 1, 1000, "CHAT_RATE_SESSION_LIMIT"),
      ipLimit: integer(env.CHAT_RATE_IP_LIMIT, 30, 1, 10000, "CHAT_RATE_IP_LIMIT"),
    },
  };
  if (external && !env.RAG_API_KEY) throw new Error("INVALID_RAG_CONFIG:RAG_API_KEY");
  // Non-enumerable: the key never appears when a config object is serialized or logged.
  Object.defineProperty(config, "apiKey", { value: external ? env.RAG_API_KEY : null, enumerable: false });
  return config;
}
module.exports = { getRagConfig, PROVIDERS };
