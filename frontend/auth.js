(() => {
  "use strict";
  const key = "foodTourSession";
  let refreshInFlight = null;
  let revision = 0;
  function session() {
    try { return JSON.parse(sessionStorage.getItem(key) || "null"); }
    catch { clearSession(); return null; }
  }
  function saveSession(data) {
    sessionStorage.setItem(key, JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }));
    revision++;
  }
  function clearSession() { sessionStorage.removeItem(key); revision++; }
  function endSession() {
    clearSession();
    if (window.location && typeof window.location.replace === "function") window.location.replace("./index.html");
  }
  function failure(message, status, code, kind = "http") {
    const error = new Error(message);
    Object.assign(error, { status, code, kind });
    return error;
  }
  async function transport(url, options) {
    let response;
    try { response = await fetch(url, options); }
    catch (error) {
      // Preserve the original message for callers and existing standalone tests.
      error.kind = "network";
      throw error;
    }
    if (response.status === 204) return { response, result: null };
    let result;
    try { result = await response.json(); }
    catch {
      throw failure("Máy chủ trả phản hồi không đọc được. Vui lòng thử lại sau.", response.status, "INVALID_RESPONSE", "response");
    }
    return { response, result };
  }
  async function renew(current) {
    if (!refreshInFlight) {
      const startedAt = revision;
      refreshInFlight = (async () => {
        const result = await request("/refresh", { body: { refreshToken: current.refreshToken }, retry: false });
        if (revision !== startedAt) throw failure("Phiên đăng nhập đã thay đổi.", 401, "SESSION_CHANGED");
        saveSession(result.data);
      })();
    }
    const pending = refreshInFlight;
    try { await pending; }
    finally { if (refreshInFlight === pending) refreshInFlight = null; }
  }
  async function request(path, { body, authenticated = false, retry = true, admin = false, method } = {}) {
    const url = path.startsWith("/api/") || path === "/health" || path === "/health/ready"
      ? path : (admin ? "/api/admin" : "/api/auth") + path;
    if (!/^\/api\/[a-zA-Z0-9/_?=&.%:-]+$/.test(url) && url !== "/health" && url !== "/health/ready") {
      throw failure("Đường dẫn API không hợp lệ.", 0, "INVALID_API_PATH", "client");
    }
    const current = session();
    const { response, result } = await transport(url, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: { "Content-Type": "application/json", ...(authenticated && current ? { Authorization: "Bearer " + current.accessToken } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const excluded = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"].includes(url);
    if (response.status === 401 && authenticated && !excluded) {
      if (["SESSION_REVOKED", "INVALID_ACCOUNT"].includes(result?.code)) {
        endSession();
      } else if (retry && current?.refreshToken) {
        try {
          const latest = session();
          // A delayed 401 may belong to the access token replaced by another request.
          if (!latest || latest.accessToken === current.accessToken) await renew(current);
        } catch (error) { endSession(); throw error; }
        return request(path, { body, authenticated, retry: false, admin, method });
      } else {
        endSession();
      }
    }
    if (!response.ok) throw failure(result?.error || "Yêu cầu thất bại. Vui lòng thử lại.", response.status, result?.code);
    return result;
  }
  async function logout() {
    const current = session();
    if (current?.refreshToken) await request("/logout", { body: { refreshToken: current.refreshToken } });
    clearSession();
  }
  window.FoodTourAuth = {
    request,
    createStaff: body => request("/staff", { body, authenticated: true, admin: true }),
    saveSession, clearSession, logout, hasSession: () => Boolean(session()),
  };
})();
