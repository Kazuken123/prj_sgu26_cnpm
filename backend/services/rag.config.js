// Knowledge/RAG limits. Kept beside the subsystem until the integration owner
// decides whether it moves to config/ and which names enter .env.example.
// Only the mock provider exists; a real provider needs an approved adapter.
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
function getRagConfig(env = process.env) {
  const provider = env.RAG_PROVIDER || "MOCK";
  if (provider !== "MOCK") throw new Error("INVALID_RAG_CONFIG:RAG_PROVIDER");
  const model = env.RAG_EMBEDDING_MODEL || "mock-hash-v1";
  if (!/^[A-Za-z0-9._:/-]{1,100}$/.test(model)) throw new Error("INVALID_RAG_CONFIG:RAG_EMBEDDING_MODEL");
  const chunkSize = integer(env.RAG_CHUNK_SIZE, 800, 200, 4000, "RAG_CHUNK_SIZE");
  const chunkOverlap = integer(env.RAG_CHUNK_OVERLAP, 120, 0, 1000, "RAG_CHUNK_OVERLAP");
  if (chunkOverlap >= chunkSize / 2) throw new Error("INVALID_RAG_CONFIG:RAG_CHUNK_OVERLAP");
  return {
    provider, embeddingModel: model,
    embeddingDimensions: integer(env.RAG_EMBEDDING_DIMENSIONS, 256, 8, 8192, "RAG_EMBEDDING_DIMENSIONS"),
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
}
module.exports = { getRagConfig };
