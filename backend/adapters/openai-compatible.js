// HTTP adapters for providers exposing the OpenAI-compatible /embeddings and
// /chat/completions endpoints. Disabled unless rag.config enables an external
// provider. Errors carry only a code and HTTP status: never the key or the body.
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
function providerError(code, status) {
  const error = new Error(code); error.code = code; if (status) error.status = status; return error;
}
async function post(baseUrl, apiKey, path, body, signal) {
  let response;
  try {
    response = await fetch(baseUrl + path, { method: "POST", signal, redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey }, body: JSON.stringify(body) });
  } catch { throw providerError("PROVIDER_UNREACHABLE"); }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw providerError("PROVIDER_HTTP_" + response.status, response.status); }
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw providerError("PROVIDER_RESPONSE_TOO_LARGE");
  try { return JSON.parse(text); } catch { throw providerError("PROVIDER_INVALID_RESPONSE"); }
}
class OpenAiCompatibleEmbeddingAdapter {
  constructor({ baseUrl, apiKey, model }) { this.baseUrl = baseUrl; this.model = model; this.provider = "OPENAI_COMPATIBLE"; Object.defineProperty(this, "apiKey", { value: apiKey }); }
  async embed(texts, { signal } = {}) {
    const reply = await post(this.baseUrl, this.apiKey, "/embeddings", { model: this.model, input: texts, encoding_format: "float" }, signal);
    if (!Array.isArray(reply?.data)) throw providerError("PROVIDER_INVALID_RESPONSE");
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
