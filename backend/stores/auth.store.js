const pool = require("../config/database");
const UserStore = require("./user.store");
const AuditLogStore = require("./audit_log.store");
const RefreshTokenStore = require("./refresh_token.store");

// Transaction details stay in the data-access layer. Services receive operations, not a SQL connection.
class AuthStore {
  constructor(db = pool) {
    this.db = db;
    this.users = new UserStore(db);
    this.auditLogs = new AuditLogStore(db);
    this.tokens = new RefreshTokenStore(db);
  }
  async transaction(work) {
    // InnoDB may deadlock concurrent locking reads + token-index updates.
    // Only retry known transaction conflicts after a successful rollback.
    for (let attempt = 0; attempt < 3; attempt++) {
      const connection = await this.db.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        let rolledBack = false;
        try { await connection.rollback(); rolledBack = true; } catch { /* Keep original error. */ }
        const retryable = ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code);
        if (!rolledBack || !retryable || attempt === 2) throw error;
      } finally {
        connection.release();
      }
    }
  }
  async register(user) {
    return this.transaction(connection => this.users.createUser(user, connection));
  }
  async createStaff(user, actorId, authorize, audit) {
    return this.transaction(async (connection) => {
      const actor = await this.users.getUserById(actorId, connection, true);
      authorize(actor);
      const userId = await this.users.createUser(user, connection);
      await this.auditLogs.create({ ...audit, userId: actorId, resourceId: String(userId) }, connection);
      return userId;
    });
  }
  async withLockedUser(email, work) {
    return this.transaction(async (connection) => {
      const user = await this.users.getUserByEmail(email, connection, true);
      return work(user, {
        saveLoginState: (failedCount, lockedUntil) =>
          this.users.updateLoginState(user.user_id, failedCount, lockedUntil, connection),
        createRefreshToken: (tokenHash, expiresAt, sessionId) =>
          this.tokens.create(user.user_id, tokenHash, expiresAt, sessionId, connection),
      });
    });
  }
  async withLockedRefreshToken(tokenHash, work) {
    return this.transaction(async (connection) => {
      const session = await this.tokens.getByHash(tokenHash, connection);
      const user = session ? await this.users.getUserById(session.user_id, connection, true) : undefined;
      return work(session, user, {
        rotate: (nextHash) => this.tokens.rotate(session.token_id, nextHash, connection, tokenHash, session.session_id, session.user_id),
        revoke: () => this.tokens.revoke(tokenHash, connection),
      });
    });
  }
}
module.exports = AuthStore;
