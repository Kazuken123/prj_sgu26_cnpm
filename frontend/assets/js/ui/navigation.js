(() => {
  "use strict";
  const ui = window.FoodTourUI;
  let userInFlight = null;
  const items = [
    { file: "account.html", label: "Tài khoản của tôi", roles: ["STAFF", "ADMIN"] },
    { file: "staff.html", label: "Tạo tài khoản nhân viên", roles: ["ADMIN"] },
    { file: "cash.html", label: "Xác nhận tiền mặt", roles: ["STAFF", "ADMIN"], pending: true },
    { file: "pois.html", label: "Điểm tham quan", roles: ["STAFF", "ADMIN"], pending: true },
    { file: "content-jobs.html", label: "Xử lý nội dung", roles: ["STAFF", "ADMIN"], pending: true },
    { file: "tours.html", label: "Tour mẫu", roles: ["STAFF", "ADMIN"], pending: true },
    { file: "knowledge.html", label: "Kho kiến thức", roles: ["STAFF", "ADMIN"], pending: true },
    { file: "audit.html", label: "Nhật ký thao tác", roles: ["ADMIN"], pending: true },
    { file: "health.html", label: "Trạng thái hệ thống", roles: ["ADMIN"] },
    { file: "monitoring.html", label: "Thống kê sử dụng", roles: ["ADMIN"], pending: true },
  ];
  function internal(role) {
    const host = document.getElementById("internalNav"); if (!host) return;
    host.replaceChildren();
    if (!["STAFF", "ADMIN"].includes(role)) { ui.state(host, { title: "Đang xác định quyền truy cập…" }); return; }
    const caption = ui.element("p", "Không gian nội bộ", "nav-caption");
    const toggle = ui.element("button", "Menu nội bộ", "button-secondary menu-toggle"); toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", "internalLinks");
    const links = ui.element("nav", undefined, "nav-links"); links.id = "internalLinks"; links.dataset.collapsed = "true"; links.setAttribute("aria-label", "Điều hướng nội bộ");
    const current = window.location.pathname.split("/").pop();
    for (const item of items.filter(item => item.roles.includes(role))) {
      const link = ui.element("a", item.label); link.href = "./" + item.file;
      if (current === item.file) link.setAttribute("aria-current", "page");
      if (item.pending) {
        link.append(ui.element("span", " · Chờ backend", "fine-print"));
        link.setAttribute("aria-label", item.label + ", chức năng đang chờ backend");
      }
      links.append(link);
    }
    toggle.addEventListener("click", () => { const expanded = toggle.getAttribute("aria-expanded") !== "true"; toggle.setAttribute("aria-expanded", String(expanded)); links.dataset.collapsed = String(!expanded); });
    host.append(caption, toggle, links);
  }
  function failure(error, retry) {
    const host = document.getElementById("internalNav");
    if (host) ui.state(host, { type: "error", title: "Chưa xác định được quyền truy cập", message: ui.errorText(error), retry: retry || (() => loadUser()) });
  }
  async function loadUser() {
    if (!FoodTourAuth.hasSession()) { window.location.replace("./index.html"); return null; }
    if (!userInFlight) {
      internal();
      userInFlight = (async () => {
        const result = await FoodTourApi.me();
        const user = result?.data;
        if (!user || !["STAFF", "ADMIN"].includes(user.role) || typeof user.email !== "string" || !user.email || !user.id || typeof user.status !== "string") throw ui.invalidResponse();
        internal(user.role);
        return user;
      })();
    }
    const pending = userInFlight;
    try { return await pending; }
    catch (error) { failure(error); throw error; }
    finally { if (userInFlight === pending) userInFlight = null; }
  }
  function guest(host, entries = []) {
    host.replaceChildren(); host.className = "guest-nav"; host.setAttribute("aria-label", "Điều hướng tham quan");
    for (const { href, label, active } of entries) {
      const link = ui.element("a", label); link.href = href;
      if (active) link.setAttribute("aria-current", "page"); host.append(link);
    }
  }
  window.FoodTourNavigation = { internal, guest, loadUser, failure };
})();

