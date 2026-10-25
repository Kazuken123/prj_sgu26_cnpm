const { createHash } = require("node:crypto");
const ChatStore = require("../stores/chat.store");
const RedisStore = require("../stores/redis.store");
const { createEmbeddingAdapter, createChatAdapter } = require("./rag-adapters");
const AppError = require("../utils/app-error");
const validation = require("./chat.validation");
const { buildPrompt } = require("./chat-prompt");
const { classifyQuestion, isInstructionLike, SCOPE_REFUSAL } = require("./chat-policy");
const { getRagConfig } = require("./rag.config");
const { ProviderError, providerCode, withDeadline, checkEmbeddings, isVector, cosine, redactSecrets } = require("./rag-support");

const hash = value => createHash("sha256").update(value).digest("hex");
const MAX_ANSWER = 4000;
// Used whenever the model's own wording cannot be trusted as a grounded refusal.
const NO_CONTEXT_ANSWER = "Kho kiến thức hiện chưa có thông tin chính thức về câu hỏi này; vui lòng hỏi nhân viên Thảo Cầm Viên. " +
  "/ The knowledge base has no official information on this yet; please ask Saigon Zoo staff.";
function modelReply(reply) {
  if (!reply || typeof reply !== "object" || !["ANSWER", "NO_CONTEXT", "REFUSE"].includes(reply.decision) ||
      typeof reply.answer !== "string" || !reply.answer.trim() ||
      (reply.citations !== undefined && (!Array.isArray(reply.citations) || !reply.citations.every(id => typeof id === "string")))) {
    throw new ProviderError("LLM_INVALID_REPLY");
  }
  return { decision: reply.decision, answer: reply.answer.trim().slice(0, MAX_ANSWER), citations: reply.citations ?? [] };
}
// A link counts only if it appears in a retrieved source; the model cannot invent citations.
function stripUnlistedLinks(answer, sources) {
  return answer.replace(/https?:\/\/[^\s)\]>"']+/gi, link => sources.some(source => (source.source || "").includes(link)) ? link : "[liên kết đã loại]");
}
class ChatService {
  constructor({ store = new ChatStore(), redis = new RedisStore(), embedding, llm, config } = {}) {
    this.store = store; this.redis = redis; this.embeddingAdapter = embedding; this.llmAdapter = llm; this.ragConfig = config;
  }
  // Lazy, so an invalid RAG setup disables only this feature, never the whole app.
  config() {
    try { return this.ragConfig ??= getRagConfig(); }
    catch (error) {
      console.error("RAG configuration invalid:", error.message); // variable name only, never its value
      throw new AppError(503, "RAG_NOT_CONFIGURED", "Trợ lý AI chưa được cấu hình hợp lệ.");
    }
  }
  embedding() { return this.embeddingAdapter ??= createEmbeddingAdapter(this.config()); }
  llm() { return this.llmAdapter ??= createChatAdapter(this.config()); }
  async ask(visit, input, ipAddress) {
    if (!visit || typeof visit.sessionId !== "string") throw new AppError(401, "MISSING_VISITOR_TOKEN", "Thiếu phiên tham quan hợp lệ.");
    const question = validation.question(input), config = this.config();
    if (typeof ipAddress !== "string" || !ipAddress || ipAddress.length > 100) {
      throw new AppError(503, "CHAT_PROTECTION_UNAVAILABLE", "Chưa thể kiểm tra giới hạn hỏi đáp; vui lòng thử lại sau.");
    }
    let allowed;
    try {
      allowed = await this.redis.consumeLookup(["chat:ip:" + hash(ipAddress), "chat:session:" + hash(visit.sessionId)], config.rate);
    } catch {
      // NFR-07: an unavailable counter never means "no limit".
      throw new AppError(503, "CHAT_PROTECTION_UNAVAILABLE", "Chưa thể kiểm tra giới hạn hỏi đáp; vui lòng thử lại sau.");
    }
    if (!allowed) throw new AppError(429, "CHAT_RATE_LIMITED", "Bạn gửi câu hỏi quá nhanh; vui lòng chờ ít giây rồi hỏi tiếp.");
    const safeQuestion = redactSecrets(question);
    let outcome;
    try { outcome = await this.answer(safeQuestion, config); }
    catch (error) { outcome = { status: "FAILED", answer: null, sources: [], code: providerCode(error, "CHAT_PROCESSING_ERROR") }; }
    try {
      await this.store.createLog({ sessionId: visit.sessionId, question: safeQuestion, answer: outcome.answer, sources: outcome.sources, status: outcome.status });
    } catch {
      throw new AppError(503, "CHAT_LOG_UNAVAILABLE", "Chưa ghi nhận được lượt hỏi đáp; vui lòng thử lại sau.");
    }
    if (outcome.status === "FAILED") {
      // CHAT_LOGS has no error column; the code (never the question or provider body) goes to the server log.
      console.error("Chat question failed:", outcome.code);
      throw new AppError(503, "CHAT_PROVIDER_UNAVAILABLE", "Trợ lý AI tạm thời gián đoạn; bản đồ và thuyết minh vẫn sử dụng bình thường.");
    }
    return { status: outcome.status, answer: outcome.answer, sources: outcome.sources, mode: config.provider === "MOCK" ? "MOCK" : "AI" };
  }
  async retrieve(vector, config) {
    let rows;
    try { rows = await this.store.candidates(config.embeddingModel); } catch { throw new ProviderError("RETRIEVAL_FAILED"); }
    return rows.filter(row => typeof row.text === "string" && row.text.trim() && isVector(row.embedding, config.embeddingDimensions) &&
        !isInstructionLike(row.text) && !isInstructionLike(row.title))
      .map(row => ({ ...row, score: cosine(vector, row.embedding) }))
      .filter(row => row.score >= config.minScore)
      .sort((a, b) => b.score - a.score || Number(a.chunkId) - Number(b.chunkId))
      .slice(0, config.topK);
  }
  // UC-08 steps 4–6, A1, A2, E3.
  async answer(question, config) {
    // UC-08 A2 decided by the backend: out-of-scope requests never reach a provider.
    if (classifyQuestion(question)) return { status: "NO_CONTEXT", answer: SCOPE_REFUSAL, sources: [] };
    const reply = await withDeadline(config.embeddingTimeoutMs, signal => this.embedding().embed([question], { signal }));
    const [vector] = checkEmbeddings(reply, 1, config);
    const contexts = await this.retrieve(vector, config);
    const prompt = buildPrompt(question, contexts);
    const generated = modelReply(await withDeadline(config.llmTimeoutMs, signal => this.llm().generate({
      prompt, contexts: contexts.map(({ chunkId, title, text }) => ({ chunkId, title, text })), signal,
    })));
    if (generated.decision === "ANSWER") {
      const cited = contexts.filter(context => generated.citations.includes(context.chunkId));
      if (!cited.length) return { status: "NO_CONTEXT", answer: NO_CONTEXT_ANSWER, sources: [] };
      const sources = cited.map(({ documentId, chunkId, sourceVersion, title, source }) => ({ documentId, chunkId, sourceVersion,
        title: redactSecrets(title), source: typeof source === "string" ? redactSecrets(source) : null }));
      return { status: "SUCCESS", answer: stripUnlistedLinks(redactSecrets(generated.answer), sources), sources };
    }
    // The model's localized refusal is kept, but it may not carry links or secrets.
    return { status: "NO_CONTEXT", answer: stripUnlistedLinks(redactSecrets(generated.answer), []), sources: [] };
  }
}
module.exports = new ChatService();
module.exports.ChatService = ChatService;
module.exports.NO_CONTEXT_ANSWER = NO_CONTEXT_ANSWER;
