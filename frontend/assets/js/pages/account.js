(() => {
  "use strict";
  const ui = window.FoodTourUI;
  const message = document.getElementById("message");
  const logoutMessage = document.getElementById("logoutMessage");
  const profile = document.getElementById("profile");
  const labels = { STAFF: "Nhân viên", ADMIN: "Quản trị viên", ACTIVE: "Đang hoạt động", LOCKED: "Đã khóa" };
  let loading = false;
  async function loadAccount() {
    if (loading) return;
    loading = true;
    profile.hidden = true; document.getElementById("adminSection").hidden = true;
    ui.state(message, { title: "Đang tải tài khoản…" });
    try {
      const user = await FoodTourNavigation.loadUser(); if (!user) return;
      document.getElementById("email").textContent = user.email;
      document.getElementById("fullName").textContent = user.fullName || "Chưa cập nhật họ tên";
      document.getElementById("role").textContent = labels[user.role] || user.role;
      const status = document.getElementById("status"); status.textContent = labels[user.status] || user.status; status.dataset.tone = user.status === "ACTIVE" ? "success" : "error";
      profile.hidden = false;
      ui.state(message, { type: "success", title: "Đã tải thông tin tài khoản." });
      document.getElementById("adminSection").hidden = user.role !== "ADMIN";
    } catch (error) {
      FoodTourNavigation.failure(error, loadAccount);
      ui.state(message, { type: "error", message: ui.errorText(error), retry: loadAccount });
    } finally { loading = false; }
  }
  document.getElementById("logoutButton").addEventListener("click", async event => {
    const button = event.currentTarget; if (button.disabled) return;
    ui.busy(button, true, "Đang đăng xuất…"); ui.notice(logoutMessage, "Đang kết thúc phiên đăng nhập…");
    try {
      await FoodTourApi.logout();
      ui.notice(logoutMessage, "Đã kết thúc phiên tại trình duyệt.", "success");
      window.location.replace("./index.html");
    } catch (error) { ui.notice(logoutMessage, ui.errorText(error, "logout"), "error"); }
    finally { ui.busy(button, false); }
  });
  loadAccount();
})();

