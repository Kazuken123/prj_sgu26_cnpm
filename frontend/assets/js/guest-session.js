(() => {
  "use strict";
  const STORAGE_KEY = "linhUngGuestSession";
  // Reserved guest-only storage scaffold. No token read/write or authorization until
  // the backend defines its token contract, expiry fields and transport mechanism.
  // Never use foodTourSession or an internal Bearer token for a visitor.
  function read() { return { status: "waiting", token: null, expiresAt: null }; }
  function clear() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ } }
  function previewStatus() {
    const query = new URLSearchParams(window.location.search);
    if (query.get("demo") !== "1") return "waiting";
    const value = query.get("session");
    return ["pending", "expired", "invalid"].includes(value) ? value : "waiting";
  }
  window.GuestSession = Object.freeze({ STORAGE_KEY, read, clear, previewStatus });
})();

