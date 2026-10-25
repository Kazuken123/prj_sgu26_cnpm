// Pure helpers shared by the knowledge and chat services: provider deadlines,
// embedding validation, similarity, chunking and secret redaction.
class ProviderError extends Error {
  constructor(code) { super(code); this.name = "ProviderError"; this.code = code; }
}
// HTTP adapters report failures as a fixed "PROVIDER_*" code; anything else
// (driver errors, messages that may echo input) collapses to the fallback.
function providerCode(error, fallback) {
  if (error instanceof ProviderError) return error.code;
  return typeof error?.code === "string" && /^PROVIDER_[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : fallback;
}
async function withDeadline(ms, work) {
  // The adapter receives the signal; the race still bounds adapters that ignore it.
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ProviderError("PROVIDER_TIMEOUT")); }, ms);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
function isVector(value, dimensions) {
  if (!Array.isArray(value) || value.length !== dimensions) return false;
  let norm = 0;
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) return false;
    norm += item * item;
  }
  return norm > 0;
}
// Accept a provider reply only when it matches the configured model and shape.
function checkEmbeddings(reply, count, { embeddingModel, embeddingDimensions }) {
  if (!reply || typeof reply !== "object" || reply.model !== embeddingModel) throw new ProviderError("EMBEDDING_MODEL_MISMATCH");
  if (!Array.isArray(reply.vectors) || reply.vectors.length !== count) throw new ProviderError("EMBEDDING_COUNT_MISMATCH");
  if (!reply.vectors.every(vector => isVector(vector, embeddingDimensions))) throw new ProviderError("EMBEDDING_INVALID_VECTOR");
  return reply.vectors;
}
function cosine(a, b) {
  let dot = 0, left = 0, right = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; left += a[i] * a[i]; right += b[i] * b[i]; }
  return dot / (Math.sqrt(left) * Math.sqrt(right));
}
function chunkText(text, { chunkSize, chunkOverlap }) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/[ \t\f\v]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      // Prefer a paragraph, then a sentence, then a word boundary in the last 40% of the window.
      const window = normalized.slice(start + Math.floor(chunkSize * 0.6), end);
      const offset = start + Math.floor(chunkSize * 0.6);
      const breaks = [window.lastIndexOf("\n\n"), Math.max(...[". ", "! ", "? ", ".\n", "。"].map(mark => window.lastIndexOf(mark))), window.lastIndexOf(" ")];
      const found = breaks.find(index => index > 0);
      if (found !== undefined) end = offset + found + 1;
    }
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    let next = Math.max(end - chunkOverlap, start + 1);
    // Start the overlap on a word boundary so a chunk never begins mid-word.
    while (next < end && normalized[next - 1] !== " " && normalized[next - 1] !== "\n") next++;
    start = next;
  }
  return chunks;
}
const SECRET_PATTERNS = [
  /tcv_visit_[a-f0-9]{64}/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\b(?:api[_-]?key|secret|password|mật khẩu)\s*[:=]\s*\S+/gi,
  /\b[a-f0-9]{64}\b/gi,
];
// Questions/answers are stored and sent to providers; raw tokens and keys must not be.
function redactSecrets(text) {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "[ĐÃ ẨN]"), text);
}
module.exports = { ProviderError, providerCode, withDeadline, isVector, checkEmbeddings, cosine, chunkText, redactSecrets };
