const pool = require("../config/database");

class RefreshTokenStore {
  constructor(db = pool) {
    this.db = db;
    this.rotatedTokens = new Map();
  }
  async create(userId, tokenHash, expiresAt, sessionId, executor = this.db) {
    await executor.query(
      "DELETE FROM REFRESH_TOKENS WHERE user_id = ? AND expires_at <= UTC_TIMESTAMP(3)", [userId],
    );
    await executor.query(
      "INSERT INTO REFRESH_TOKENS (user_id, token_hash, expires_at, session_id) VALUES (?, ?, ?, ?)",
      [userId, tokenHash, expiresAt, sessionId],
    );
  }
  async getByHash(tokenHash, executor = this.db) {
    const [rows] = await executor.query(
      "SELECT * FROM REFRESH_TOKENS WHERE token_hash = ? LIMIT 1 FOR UPDATE", [tokenHash],
    );
    return rows[0];
  }
  async rotate(tokenId, tokenHash, executor = this.db, previousHash = null, sessionId = null, userId = null) {
    await executor.query(
      "UPDATE REFRESH_TOKENS SET token_hash = ? WHERE token_id = ?", [tokenHash, tokenId],
    );
    if (previousHash && sessionId) {
      this.rotatedTokens.set(previousHash, { sessionId, userId });
    }
  }
  async getBySessionId(sessionId) {
    const [rows] = await this.db.query(
      "SELECT user_id, expires_at FROM REFRESH_TOKENS WHERE session_id = ? LIMIT 1", [sessionId],
    );
    return rows[0];
  }
  async revoke(tokenHash, executor = this.db) {
    const [result] = await executor.query("DELETE FROM REFRESH_TOKENS WHERE token_hash = ?", [tokenHash]);
    if ((!result || result.affectedRows === 0) && this.rotatedTokens.has(tokenHash)) {
      const { sessionId, userId } = this.rotatedTokens.get(tokenHash);
      await this.revokeBySession(sessionId, userId, executor);
      return;
    }
    if (this.rotatedTokens.has(tokenHash)) {
      this.rotatedTokens.delete(tokenHash);
    }
  }
  async revokeBySession(sessionId, userId = null, executor = this.db) {
    if (userId) {
      await executor.query("DELETE FROM REFRESH_TOKENS WHERE session_id = ? AND user_id = ?", [sessionId, userId]);
    } else {
      await executor.query("DELETE FROM REFRESH_TOKENS WHERE session_id = ?", [sessionId]);
    }
    for (const [hash, info] of this.rotatedTokens.entries()) {
      if (info.sessionId === sessionId) {
        this.rotatedTokens.delete(hash);
      }
    }
  }
}
module.exports = RefreshTokenStore;
