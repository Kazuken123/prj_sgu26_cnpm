const pool = require("../config/database");

class ChatStore {
  constructor(db = pool) { this.db = db; }
  // Only chunks of ACTIVE documents, of the current version and of the configured model.
  async candidates(embeddingModel) {
    const [rows] = await this.db.query(`SELECT CAST(c.chunk_id AS CHAR) AS chunkId, c.document_id AS documentId,
      c.chunk_text AS text, c.source_version AS sourceVersion, c.embedding, d.title, d.source
      FROM KNOWLEDGE_CHUNKS c JOIN KNOWLEDGE_DOCUMENTS d ON d.document_id = c.document_id
      WHERE d.status = 'ACTIVE' AND c.source_version = d.content_version AND c.embedding_model = ?`, [embeddingModel]);
    return rows.map(row => {
      let embedding = row.embedding;
      if (typeof embedding === "string") { try { embedding = JSON.parse(embedding); } catch { embedding = null; } }
      return { ...row, embedding };
    });
  }
  async createLog({ sessionId, question, answer, sources, status }) {
    const [result] = await this.db.query("INSERT INTO CHAT_LOGS (session_id, question, answer, sources, status) VALUES (?, ?, ?, ?, ?)",
      [sessionId, question, answer, JSON.stringify(sources), status]);
    return String(result.insertId);
  }
}
module.exports = ChatStore;
