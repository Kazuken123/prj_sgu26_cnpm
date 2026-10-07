const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const UserStore = require("../stores/user.store");
const OwnerRequestStore = require("../stores/owner_request.store");
const RefreshTokenStore = require("../stores/refresh_token.store");
const AuthStore = require("../stores/auth.store");
const AppError = require("../utils/app-error");
const validation = require("./auth.validation");
const { getAuthConfig } = require("../config/auth");

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const ROLES = ["TOURIST", "OWNER", "ADMIN"];

class AuthService {
  constructor({ users = new UserStore(), requests = new OwnerRequestStore(),
    tokens = new RefreshTokenStore(), authStore = new AuthStore(),
    passwordHasher = bcrypt, config = getAuthConfig, now = () => Date.now() } = {}) {
    Object.assign(this, { users, requests, tokens, authStore, passwordHasher, config, now });
  }
  async register(input) { return this.registerAccount(input, false); }
  async registerOwner(input) { return this.registerAccount(input, true); }

  async registerAccount(input, owner) {
    const data = validation.registration(input, owner);
    if (await this.users.getUserByEmail(data.email)) {
      throw new AppError(409, "EMAIL_EXISTS", "Email đã được sử dụng!");
    }
    const passwordHash = await this.passwordHasher.hash(data.password, 10);
    const role = owner ? "OWNER" : "TOURIST";
    const status = owner ? "PENDING" : "ACTIVE";
    try {
      const userId = await this.authStore.register(
        { ...data, passwordHash, role, status }, owner ? data : null,
      );
      return { userId, email: data.email, role, status };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") throw new AppError(409, "EMAIL_EXISTS", "Email đã được sử dụng!");
      throw error;
    }
  }
  assertAccountUsable(user) {
    if (!user || !ROLES.includes(user.role)) throw new AppError(401, "INVALID_ACCOUNT", "Tài khoản không hợp lệ.");
    if (user.status === "LOCKED") throw new AppError(403, "ACCOUNT_LOCKED", "Tài khoản đã bị quản trị viên khóa.");
    if (!["ACTIVE", "PENDING"].includes(user.status) || (user.status === "PENDING" && user.role !== "OWNER")) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "Tài khoản chưa được kích hoạt.");
    }
    if (user.locked_until && new Date(user.locked_until).getTime() > this.now()) {
      throw new AppError(423, "LOGIN_TEMPORARILY_LOCKED", "Tài khoản đang bị khóa tạm thời trong 15 phút.");
    }
  }
  publicUser(user) {
    return { id: user.user_id, email: user.email, fullName: user.full_name ?? null, role: user.role, status: user.status };
  }
  accessToken(user, sessionId) {
    const config = this.config();
    return jwt.sign({ userId: user.user_id, role: user.role, type: "access", sessionId }, config.secret, {
      algorithm: "HS256", expiresIn: config.accessTokenTtl,
      issuer: config.issuer, audience: config.audience, jwtid: randomUUID(),
    });
  }
  hashToken(token) { return createHash("sha256").update(token).digest("hex"); }

  async login(input) {
    const { email, password } = validation.login(input);
    // Return an error value from the callback so failed-attempt updates are committed.
    const outcome = await this.authStore.withLockedUser(email, async (user, persistence) => {
      if (!user) return { error: new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.") };
      try { this.assertAccountUsable(user); } catch (error) { return { error }; }
      const lockExpired = user.locked_until && new Date(user.locked_until).getTime() <= this.now();
      const currentCount = lockExpired ? 0 : Number(user.failed_login_count || 0);
      const matches = await this.passwordHasher.compare(password, user.password_hash);
      if (!matches) {
        const failedCount = currentCount + 1;
        const isLocked = failedCount >= MAX_FAILED_LOGINS;
        await persistence.saveLoginState(failedCount, isLocked ? new Date(this.now() + LOCK_DURATION_MS) : null);
        return { error: new AppError(isLocked ? 423 : 401,
          isLocked ? "LOGIN_TEMPORARILY_LOCKED" : "INVALID_CREDENTIALS",
          isLocked ? "Nhập sai 5 lần. Tài khoản đã bị khóa 15 phút!" : `Email hoặc mật khẩu không đúng. Còn ${MAX_FAILED_LOGINS - failedCount} lần thử.`) };
      }
      const refreshToken = randomBytes(32).toString("hex");
      const sessionId = randomUUID();
      const accessToken = this.accessToken(user, sessionId);
      await persistence.saveLoginState(0, null);
      await persistence.createRefreshToken(this.hashToken(refreshToken), new Date(this.now() + this.config().refreshTokenTtlMs), sessionId);
      return { data: { user: this.publicUser(user), accessToken, refreshToken } };
    });
    if (outcome.error) throw outcome.error;
    return outcome.data;
  }
  async refresh(input) {
    const token = validation.refreshToken(input?.refreshToken);
    const outcome = await this.authStore.withLockedRefreshToken(this.hashToken(token), async (session, user, persistence) => {
      if (!session) return { error: new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ hoặc đã hết hạn.") };
      if (new Date(session.expires_at).getTime() <= this.now()) {
        await persistence.revoke();
        return { error: new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ hoặc đã hết hạn.") };
      }
      try { this.assertAccountUsable(user); } catch (error) {
        await persistence.revoke();
        return { error };
      }
      const refreshToken = randomBytes(32).toString("hex");
      const accessToken = this.accessToken(user, session.session_id);
      await persistence.rotate(this.hashToken(refreshToken));
      return { data: { user: this.publicUser(user), accessToken, refreshToken } };
    });
    if (outcome.error) throw outcome.error;
    return outcome.data;
  }
  async logout(input) {
    const token = validation.refreshToken(input?.refreshToken);
    await this.tokens.revoke(this.hashToken(token));
  }
  async authenticate(token) {
    const config = this.config();
    let decoded;
    try {
      decoded = jwt.verify(token, config.secret, {
        algorithms: ["HS256"], issuer: config.issuer, audience: config.audience,
      });
    } catch {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ hoặc đã hết hạn.");
    }
    if (decoded.type !== "access" || !Number.isSafeInteger(decoded.userId) || decoded.userId < 1 ||
        typeof decoded.sessionId !== "string") {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token không hợp lệ hoặc đã hết hạn.");
    }
    const session = await this.tokens.getBySessionId(decoded.sessionId);
    if (!session || session.user_id !== decoded.userId || new Date(session.expires_at).getTime() <= this.now()) {
      throw new AppError(401, "SESSION_REVOKED", "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.");
    }
    const user = await this.users.getUserById(decoded.userId);
    this.assertAccountUsable(user);
    // Roles/status come from the current account, never solely from a stale JWT claim.
    return { ...this.publicUser(user), userId: user.user_id };
  }
  async getOwnerRequestStatus(userId) {
    const request = await this.requests.getLatestByUserId(userId);
    if (!request) throw new AppError(404, "OWNER_REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu đăng ký chủ quán.");
    return { status: request.status, rejectionReason: request.rejection_reason, restaurantName: request.restaurant_name };
  }
  async assertApprovedOwner(user) {
    if (!user) throw new AppError(401, "MISSING_ACCESS_TOKEN", "Thiếu token xác thực.");
    const request = user.role === "OWNER" ? await this.requests.getLatestByUserId(user.userId) : null;
    if (user.role !== "OWNER" || user.status !== "ACTIVE" || request?.status !== "APPROVED") {
      throw new AppError(403, "OWNER_NOT_APPROVED", "Chủ quán cần được admin phê duyệt trước khi quản lý quán.");
    }
  }
  async bootstrapAdmin(input) {
    const data = validation.registration(input);
    const existing = await this.users.getUserByEmail(data.email);
    if (existing) {
      if (existing.role !== "ADMIN") throw new AppError(409, "EMAIL_EXISTS", "Email này đã thuộc tài khoản không phải admin.");
      if (existing.password_hash === "$2b$12$replace_with_real_bcrypt_hash") {
        const passwordHash = await this.passwordHasher.hash(data.password, 10);
        const repaired = await this.users.replacePlaceholderPassword(existing.user_id, existing.password_hash, passwordHash);
        return { userId: existing.user_id, created: false, repaired };
      }
      return { userId: existing.user_id, created: false };
    }
    const passwordHash = await this.passwordHasher.hash(data.password, 10);
    const userId = await this.authStore.register({ ...data, passwordHash, role: "ADMIN", status: "ACTIVE" });
    return { userId, created: true };
  }
}
module.exports = new AuthService();
module.exports.AuthService = AuthService;
