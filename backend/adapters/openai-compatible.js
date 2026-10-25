// HTTP adapters for providers exposing the OpenAI-compatible /embeddings and
// /chat/completions endpoints. Disabled unless rag.config enables an external
// provider. Errors carry only a code and HTTP status: never the key or the body.
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
function providerError(code, status) {
  const error = new Error(code); error.code = code; if (status) error.status = status; return error;
}
async function readBoundedJson(response) {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw providerError("PROVIDER_RESPONSE_TOO_LARGE");
  }
  const reader = response.body?.getReader();
  if (!reader) throw providerError("PROVIDER_INVALID_RESPONSE");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        throw providerError("PROVIDER_RESPONSE_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks, size).toString("utf8")); }
  catch { throw providerError("PROVIDER_INVALID_RESPONSE"); }
}
async function post(baseUrl, apiKey, path, body, signal) {
  let response;
  try {
    response = await fetch(baseUrl + path, { method: "POST", signal, redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey }, body: JSON.stringify(body) });
  } catch { throw providerError("PROVIDER_UNREACHABLE"); }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw providerError("PROVIDER_HTTP_" + response.status, response.status); }
  return readBoundedJson(response);
}
class OpenAiCompatibleEmbeddingAdapter {
  constructor({ baseUrl, apiKey, model, singleInput = false }) { this.baseUrl = baseUrl; this.model = model; this.singleInput = singleInput; this.provider = "OPENAI_COMPATIBLE"; Object.defineProperty(this, "apiKey", { value: apiKey }); }
  async embed(texts, { signal } = {}) {
    // Gemini's compatibility API omits indices. One request per text keeps the
    // association unambiguous; never guess the order of an unindexed batch.
    if (this.singleInput) {
      const vectors = [];
      for (const text of texts) {
        if (signal?.aborted) throw providerError("PROVIDER_UNREACHABLE");
        const reply = await post(this.baseUrl, this.apiKey, "/embeddings", { model: this.model, input: text, encoding_format: "float" }, signal);
        if (!Array.isArray(reply?.data) || reply.data.length !== 1 || !reply.data[0] ||
          (reply.data[0].index !== undefined && reply.data[0].index !== 0)) throw providerError("PROVIDER_INVALID_RESPONSE");
        vectors.push(reply.data[0].embedding);
      }
      return { model: this.model, vectors };
    }
    const reply = await post(this.baseUrl, this.apiKey, "/embeddings", { model: this.model, input: texts, encoding_format: "float" }, signal);
    if (!Array.isArray(reply?.data) || reply.data.length !== texts.length ||
      !reply.data.every(item => item && Number.isInteger(item.index) && item.index >= 0 && item.index < texts.length) ||
      new Set(reply.data.map(item => item.index)).size !== texts.length) throw providerError("PROVIDER_INVALID_RESPONSE");
    const items = [...reply.data].sort((a, b) => a.index - b.index);
    // Shape, count, numbers and dimensions are validated by the Service.
    return { model: this.model, vectors: items.map(item => item?.embedding) };
  }
}
class OpenAiCompatibleChatAdapter {
  constructor({ baseUrl, apiKey, model }) { this.baseUrl = baseUrl; this.model = model; this.provider = "OPENAI_COMPATIBLE"; Object.defineProperty(this, "apiKey", { value: apiKey }); }
  async generate({ prompt, signal }) {
    const reply = await post(this.baseUrl, this.apiKey, "/chat/completions", { model: this.model, temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }] }, signal);
    const content = reply?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw providerError("PROVIDER_INVALID_RESPONSE");
    try { return JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); }
    catch { throw providerError("PROVIDER_INVALID_RESPONSE"); }
  }
}
module.exports = { OpenAiCompatibleEmbeddingAdapter, OpenAiCompatibleChatAdapter };
