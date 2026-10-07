const bcrypt = require("bcrypt");
const { AuthService } = require("../../services/auth.service");

function createFixture() {
  let time = Date.now();
  let queue = Promise.resolve();
  const state = { users: [], requests: [], sessions: new Map(), nextId: 1, failRequest: false };
  const config = { secret: "test-only-secret-that-is-at-least-32-bytes", issuer: "food-tour-api",
    audience: "food-tour-client", accessTokenTtl: "1h", refreshTokenTtlMs: 7 * 86400000 };
  const clone = value => value == null ? value : structuredClone(value);
  const serial = work => {
    const result = queue.then(async () => {
      const before = clone(state);
      try { return await work(); } catch (error) { Object.assign(state, before); throw error; }
    });
    queue = result.catch(() => {});
    return result;
  };
  const users = {
    getUserByEmail: async email => clone(state.users.find(u => u.email === email)),
    getUserById: async id => clone(state.users.find(u => u.user_id === id)),
    replacePlaceholderPassword: async (id, expected, hash) => {
      const user = state.users.find(u => u.user_id === id && u.password_hash === expected);
      if (!user) return false;
      user.password_hash = hash; return true;
    },
  };
  const requests = { getLatestByUserId: async id => clone(state.requests.filter(r => r.user_id === id).at(-1)) };
  const tokens = {
    revoke: async hash => { state.sessions.delete(hash); },
    getBySessionId: async id => clone([...state.sessions.values()].find(s => s.session_id === id)),
  };
  const authStore = {
    register: (data, request) => serial(async () => {
      if (state.users.some(u => u.email === data.email)) throw Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
      const userId = state.nextId++;
      state.users.push({ user_id: userId, email: data.email, password_hash: data.passwordHash,
        full_name: data.fullName, phone_number: data.phoneNumber, role: data.role, status: data.status,
        failed_login_count: 0, locked_until: null });
      if (request) {
        if (state.failRequest) throw new Error("request insert failed");
        state.requests.push({ user_id: userId, restaurant_name: request.restaurantName, status: "PENDING", rejection_reason: null });
      }
      return userId;
    }),
    withLockedUser: (email, work) => serial(async () => {
      const user = state.users.find(u => u.email === email);
      return work(clone(user), {
        saveLoginState: async (count, until) => Object.assign(user, { failed_login_count: count, locked_until: until }),
        createRefreshToken: async (hash, expiresAt, sessionId) => {
          state.sessions.set(hash, { token_id: state.sessions.size + 1, session_id: sessionId, user_id: user.user_id, token_hash: hash, expires_at: expiresAt });
        },
      });
    }),
    withLockedRefreshToken: (hash, work) => serial(async () => {
      const session = state.sessions.get(hash);
      return work(clone(session), clone(state.users.find(u => u.user_id === session?.user_id)), {
        rotate: async nextHash => { state.sessions.delete(hash); state.sessions.set(nextHash, { ...session, token_hash: nextHash }); },
        revoke: async () => { state.sessions.delete(hash); },
      });
    }),
  };
  const service = new AuthService({ users, requests, tokens, authStore, config: () => config,
    now: () => time, passwordHasher: { hash: value => bcrypt.hash(value, 4), compare: bcrypt.compare } });
  return { service, state, config, advance: ms => { time += ms; } };
}
const tourist = { email: "tourist@example.com", password: "SecurePassword123", fullName: "Khách" };
const owner = { ...tourist, email: "owner@example.com", phoneNumber: "0901234567",
  restaurantName: "Quán thử nghiệm", restaurantAddress: "Quận 4" };
module.exports = { createFixture, tourist, owner };
