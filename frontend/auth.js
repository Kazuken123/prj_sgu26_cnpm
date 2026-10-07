(() => {
  const key = "foodTourSession";
  function session() {
    try { return JSON.parse(sessionStorage.getItem(key) || "null"); }
    catch { sessionStorage.removeItem(key); return null; }
  }
  function saveSession(data) {
    sessionStorage.setItem(key, JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }));
  }
  function clearSession() { sessionStorage.removeItem(key); }
  async function request(path, { body, authenticated = false, retry = true } = {}) {
    const current = session();
    const response = await fetch("/api/auth" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json",
        ...(authenticated && current ? { Authorization: "Bearer " + current.accessToken } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 && authenticated && retry && current?.refreshToken) {
      try {
        const result = await request("/refresh", { body: { refreshToken: current.refreshToken }, retry: false });
        saveSession(result.data);
      } catch (error) { clearSession(); throw error; }
      return request(path, { body, authenticated, retry: false });
    }
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Yêu cầu thất bại.");
      error.status = response.status; error.code = result.code;
      throw error;
    }
    return result;
  }
  async function logout() {
    const current = session();
    if (current?.refreshToken) {
      // Keep the token if the server is unavailable, so revocation can be retried.
      await request("/logout", { body: { refreshToken: current.refreshToken } });
    }
    clearSession();
  }
  window.FoodTourAuth = { request, saveSession, clearSession, logout, hasSession: () => Boolean(session()) };
})();
