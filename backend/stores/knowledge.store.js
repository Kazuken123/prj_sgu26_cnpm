const pool = require("../config/database");
const AuthStore = require("./auth.store");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");

const RESOURCE = "KNOWLEDGE_DOCUMENTS";
const LIFECYCLE = ["CREATE_KNOWLEDGE_DOCUMENT", "UPDATE_KNOWLEDGE_DOCUMENT", "DEACTIVATE_KNOWLEDGE_DOCUMENT"];
const PROCESSING = ["PUBLISH_KNOWLEDGE_DOCUMENT", "FAIL_KNOWLEDGE_PROCESSING"];
// The schema has no processing/error column, so the latest audit entries of this
// document supply "deactivated" and "last failure" (written atomically with changes).
const latest = (actions, column) => `(SELECT a.${column} FROM AUDIT_LOGS a WHERE a.resource_type = '${RESOURCE}'
  AND a.resource_id = CAST(d.document_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AND a.action IN (${actions.map(action => `'${action}'`).join(", ")})
  ORDER BY a.log_id DESC LIMIT 1)`;
const summary = `d.document_id AS documentId, d.title, d.source, d.status, d.content_version AS contentVersion,
  d.created_at AS createdAt, d.updated_at AS updatedAt,
  (SELECT COUNT(*) FROM KNOWLEDGE_CHUNKS c WHERE c.document_id = d.document_id AND c.source_version = d.content_version) AS chunkCount,
  (SELECT MIN(c.embedding_model) FROM KNOWLEDGE_CHUNKS c WHERE c.document_id = d.document_id AND c.source_version = d.content_version) AS embeddingModel,
  ${latest(LIFECYCLE, "action")} AS lifecycleAction,
  ${latest(PROCESSING, "action")} AS processingAction, ${latest(PROCESSING, "details")} AS processingDetails`;
const normalize = row => row && { ...row, chunkCount: Number(row.chunkCount) };
class KnowledgeStore {
  constructor(db = pool) {
    this.db = db; this.transactions = new AuthStore(db); this.users = new UserStore(db); this.audit = new AuditLogStore(db);
  }
  async get(id, executor = this.db) {
    const [rows] = await executor.query("SELECT " + summary + ", d.content FROM KNOWLEDGE_DOCUMENTS d WHERE d.document_id = ?", [id]);
    return normalize(rows[0]);
  }
  async list({ status, page, limit }) {
    const where = " WHERE (? IS NULL OR d.status = ?)";
    const [rows] = await this.db.query("SELECT " + summary + " FROM KNOWLEDGE_DOCUMENTS d" + where +
      " ORDER BY d.updated_at DESC, d.document_id DESC LIMIT ? OFFSET ?", [status, status, limit, (page - 1) * limit]);
    const [count] = await this.db.query("SELECT COUNT(*) AS total FROM KNOWLEDGE_DOCUMENTS d" + where, [status, status]);
    return { items: rows.map(normalize), total: Number(count[0].total), page, limit };
  }
  // Phase 1 (UC-15 step 5, A1): document row and audit entry commit together or not at all.
  async mutate(actorId, id, authorize, work) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      if (id !== null) await connection.query("SELECT document_id FROM KNOWLEDGE_DOCUMENTS WHERE document_id = ? FOR UPDATE", [id]);
      const current = id === null ? undefined : await this.get(id, connection);
      return work({ current, persist: async (data, audit) => {
        let documentId = id;
        if (documentId === null) {
          const [insert] = await connection.query("INSERT INTO KNOWLEDGE_DOCUMENTS (title, content, source, status, content_version) VALUES (?, ?, ?, ?, ?)",
            [data.title, data.content, data.source, data.status, data.contentVersion]);
          documentId = insert.insertId;
        } else {
          await connection.query("UPDATE KNOWLEDGE_DOCUMENTS SET title = ?, content = ?, source = ?, status = ?, content_version = ? WHERE document_id = ?",
            [data.title, data.content, data.source, data.status, data.contentVersion, documentId]);
        }
        await this.audit.create({ ...audit, userId: actorId, resourceType: RESOURCE, resourceId: String(documentId) }, connection);
        return this.get(documentId, connection);
      } });
    });
  }
  // Phase 2 (UC-15 step 7): replace every chunk and activate only if the version
  // that was embedded is still current; otherwise nothing is written.
  async publish(actorId, id, version, chunks, authorize, audit) {
    return this.transactions.transaction(async connection => {
      authorize(await this.users.getUserById(actorId, connection, true));
      await connection.query("SELECT document_id FROM KNOWLEDGE_DOCUMENTS WHERE document_id = ? FOR UPDATE", [id]);
      const current = await this.get(id, connection);
      if (!current || current.contentVersion !== version || current.lifecycleAction === "DEACTIVATE_KNOWLEDGE_DOCUMENT") {
        return { published: false, document: current };
      }
      await connection.query("DELETE FROM KNOWLEDGE_CHUNKS WHERE document_id = ?", [id]);
      await connection.query("INSERT INTO KNOWLEDGE_CHUNKS (document_id, chunk_text, source_version, embedding, embedding_model) VALUES ?",
        [chunks.map(chunk => [id, chunk.text, version, JSON.stringify(chunk.embedding), chunk.model])]);
      await connection.query("UPDATE KNOWLEDGE_DOCUMENTS SET status = 'ACTIVE' WHERE document_id = ?", [id]);
      await this.audit.create({ ...audit, userId: actorId, resourceType: RESOURCE, resourceId: String(id) }, connection);
      return { published: true, document: await this.get(id, connection) };
    });
  }
  async recordFailure(actorId, id, audit) {
    await this.audit.create({ ...audit, userId: actorId, resourceType: RESOURCE, resourceId: String(id) });
  }
}
module.exports = KnowledgeStore;
module.exports.LIFECYCLE = LIFECYCLE;
