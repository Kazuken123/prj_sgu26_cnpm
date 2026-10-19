(() => {
  "use strict";
  // Waiting for the group's approved radius/reset rules. No algorithm or
  // automatic playback is enabled; SQL/report suggestions are not defaults.
  function create(config = {}) {
    const settings = Object.freeze({ radiusMeters: config.radiusMeters ?? null, resetMultiplier: config.resetMultiplier ?? null });
    return Object.freeze({ settings, evaluate: () => ({ enabled: false, reason: "Chưa chốt quy tắc vùng phát tự động." }) });
  }
  window.GuestGeofence = Object.freeze({ create });
})();

