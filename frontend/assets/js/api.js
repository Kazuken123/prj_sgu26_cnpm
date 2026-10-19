(() => {
  "use strict";
  // FoodTourAuth remains the only transport and session owner.
  const auth = window.FoodTourAuth;
  window.FoodTourApi = Object.freeze({
    request: (path, options) => auth.request(path, options),
    login: body => auth.request("/login", { body }),
    me: () => auth.request("/me", { authenticated: true }),
    createStaff: body => auth.createStaff(body),
    logout: () => auth.logout(),
    health: () => auth.request("/health"),
    readiness: () => auth.request("/health/ready"),
  });
})();

