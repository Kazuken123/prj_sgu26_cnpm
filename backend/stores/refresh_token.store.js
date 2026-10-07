const pool = require("../config/database");

class RefreshTokenStore {
  constructor(db = pool) { this.db = db; }
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
  async rotate(tokenId, tokenHash, executor = this.db) {
    await executor.query(
      "UPDATE REFRESH_TOKENS SET token_hash = ? WHERE token_id = ?", [tokenHash, tokenId],
    );
  }
  async getBySessionId(sessionId) {
    const [rows] = await this.db.query(
      "SELECT user_id, expires_at FROM REFRESH_TOKENS WHERE session_id = ? LIMIT 1", [sessionId],
    );
    return rows[0];
  }
  async revoke(tokenHash, executor = this.db) {
    await executor.query("DELETE FROM REFRESH_TOKENS WHERE token_hash = ?", [tokenHash]);
  }
}
module.exports = RefreshTokenStore;
