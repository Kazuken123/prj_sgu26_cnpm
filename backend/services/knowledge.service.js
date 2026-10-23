const KnowledgeStore = require("../stores/knowledge.store");
const MockEmbeddingAdapter = require("../adapters/mock-embedding");
const AppError = require("../utils/app-error");
const validation = require("./knowledge.validation");
const { assertContentEditor } = require("./internal-access");
const { getRagConfig } = require("./rag.config");
const { ProviderError, withDeadline, checkEmbeddings, chunkText } = require("./rag-support");

const notFound = () => new AppError(404, "KNOWLEDGE_DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu kiến thức.");
function parse(details) {
  try { return typeof details === "string" ? JSON.parse(details) : details ?? {}; } catch { return {}; }
}
class KnowledgeService {
  constructor({ store = new KnowledgeStore(), embedding, config } = {}) {
    this.store = store; this.embeddingAdapter = embedding; this.ragConfig = config;
  }
  // Lazy so that importing the module never fails on configuration.
  config() { return this.ragConfig ??= getRagConfig(); }
  embedding() {
    const config = this.config();
    return this.embeddingAdapter ??= new MockEmbeddingAdapter({ model: config.embeddingModel, dimensions: config.embeddingDimensions });
  }
  authorize(actor) { assertContentEditor(actor); }
  // ACTIVE/INACTIVE is all the schema stores; the rest is derived from this document's audit trail.
  view(row) {
    if (!row) return row;
    const processing = parse(row.processingDetails);
    const failedCurrent = row.processingAction === "FAIL_KNOWLEDGE_PROCESSING" && processing.contentVersion === row.contentVersion;
    const processingStatus = row.status === "ACTIVE" ? "READY"
      : row.lifecycleAction === "DEACTIVATE_KNOWLEDGE_DOCUMENT" ? "DEACTIVATED" : failedCurrent ? "FAILED" : "PENDING";
    const { lifecycleAction, processingAction, processingDetails, ...document } = row;
    return { ...document, processingStatus, lastError: failedCurrent && typeof processing.code === "string" ? processing.code : null };
  }
  async list(actor, query) {
    this.authorize(actor);
    const result = await this.store.list(validation.filters(query));
    return { ...result, items: result.items.map(row => this.view(row)) };
  }
  async get(actor, rawId) {
    this.authorize(actor);
    const row = await this.store.get(validation.id(rawId));
    if (!row) throw notFound();
    return this.view(row);
  }
  async create(actor, input, { ipAddress = null } = {}) {
    this.authorize(actor);
    const data = validation.document(input);
    const actorId = actor.userId ?? actor.user_id;
    const saved = await this.store.mutate(actorId, null, user => this.authorize(user), ({ persist }) =>
      persist({ ...data, status: "INACTIVE", contentVersion: 1 },
        { action: "CREATE_KNOWLEDGE_DOCUMENT", ipAddress, details: JSON.stringify({ contentVersion: 1 }) }));
    return this.process(actorId, saved, ipAddress);
  }
  async update(actor, rawId, input, { ipAddress = null } = {}) {
    this.authorize(actor);
    const id = validation.id(rawId), data = validation.document(input, true);
    const actorId = actor.userId ?? actor.user_id;
    // UC-15 A2: every save is a new version; chunks of the previous one stop being retrievable at once.
    const saved = await this.store.mutate(actorId, id, user => this.authorize(user), ({ current, persist }) => {
      if (!current) throw notFound();
      if (current.contentVersion !== data.expectedVersion) {
        throw new AppError(409, "KNOWLEDGE_VERSION_CONFLICT", "Tài liệu đã thay đổi; tải lại trước khi lưu.");
      }
      const contentVersion = current.contentVersion + 1;
      return persist({ title: data.title, content: data.content, source: data.source, status: "INACTIVE", contentVersion },
        { action: "UPDATE_KNOWLEDGE_DOCUMENT", ipAddress, details: JSON.stringify({ previousVersion: current.contentVersion, contentVersion }) });
    });
    return this.process(actorId, saved, ipAddress);
  }
  async deactivate(actor, rawId, { ipAddress = null } = {}) {
    this.authorize(actor);
    const id = validation.id(rawId);
    const row = await this.store.mutate(actor.userId ?? actor.user_id, id, user => this.authorize(user), ({ current, persist }) => {
      if (!current) throw notFound();
      if (current.status === "INACTIVE" && current.lifecycleAction === "DEACTIVATE_KNOWLEDGE_DOCUMENT") return current;
      // UC-15 A1: the version bump makes any embedding still in flight unpublishable.
      const contentVersion = current.contentVersion + 1;
      return persist({ title: current.title, content: current.content, source: current.source, status: "INACTIVE", contentVersion },
        { action: "DEACTIVATE_KNOWLEDGE_DOCUMENT", ipAddress, details: JSON.stringify({ previousVersion: current.contentVersion, contentVersion }) });
    });
    return this.view(row);
  }
  async reprocess(actor, rawId, { ipAddress = null } = {}) {
    this.authorize(actor);
    const row = await this.store.get(validation.id(rawId));
    if (!row) throw notFound();
    if (row.lifecycleAction === "DEACTIVATE_KNOWLEDGE_DOCUMENT") {
      throw new AppError(409, "KNOWLEDGE_DOCUMENT_DEACTIVATED", "Tài liệu đã ngừng sử dụng; hãy sửa tài liệu để dùng lại.");
    }
    return this.process(actor.userId ?? actor.user_id, row, ipAddress);
  }
  // UC-15 steps 6–7: chunk and embed outside any transaction, then publish atomically.
  async process(actorId, document, ipAddress) {
    const config = this.config(), version = document.contentVersion;
    const fail = async code => {
      let current = document;
      try {
        current = await this.store.get(document.documentId);
        // A failure of a superseded version must not mask the state of the current one.
        if (current?.contentVersion === version) {
          await this.store.recordFailure(actorId, document.documentId,
            { action: "FAIL_KNOWLEDGE_PROCESSING", ipAddress, details: JSON.stringify({ contentVersion: version, code }) });
          current = await this.store.get(document.documentId);
        }
      } catch { console.error("Knowledge processing failure was not audited:", code); }
      return { document: this.view(current ?? document), processing: { result: "FAILED", code } };
    };
    const texts = chunkText(document.content, config);
    if (!texts.length) return fail("EMPTY_CONTENT");
    if (texts.length > config.maxChunks) return fail("CHUNK_LIMIT_EXCEEDED");
    let vectors;
    try {
      const reply = await withDeadline(config.embeddingTimeoutMs,
        signal => this.embedding().embed(texts.map(text => document.title + "\n" + text), { signal }));
      vectors = checkEmbeddings(reply, texts.length, config);
    } catch (error) {
      return fail(error instanceof ProviderError ? error.code : "EMBEDDING_PROVIDER_ERROR");
    }
    let result;
    try {
      result = await this.store.publish(actorId, document.documentId, version,
        texts.map((text, index) => ({ text, embedding: vectors[index], model: config.embeddingModel })),
        user => this.authorize(user),
        { action: "PUBLISH_KNOWLEDGE_DOCUMENT", ipAddress,
          details: JSON.stringify({ contentVersion: version, chunkCount: texts.length, embeddingModel: config.embeddingModel }) });
    } catch (error) {
      if (error instanceof AppError) throw error;
      return fail("PUBLISH_FAILED");
    }
    if (!result.published) return { document: this.view(result.document), processing: { result: "SUPERSEDED", code: "VERSION_CHANGED" } };
    return { document: this.view(result.document), processing: { result: "PUBLISHED", chunkCount: texts.length } };
  }
}
module.exports = new KnowledgeService();
module.exports.KnowledgeService = KnowledgeService;
