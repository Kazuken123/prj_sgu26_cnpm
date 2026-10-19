(() => {
  "use strict";
  const ui = window.FoodTourUI;
  const form = document.getElementById("staffForm");
  const message = document.getElementById("message");
  const button = document.getElementById("submitButton");
  let checking = false;
  ui.bindValidation(form);
  async function checkRole() {
    if (checking) return;
    checking = true; form.hidden = true;
    ui.state(message, { title: "Đang kiểm tra quyền truy cập…" });
    try {
      const user = await FoodTourNavigation.loadUser(); if (!user) return;
      if (user.role !== "ADMIN") { ui.notice(message, "Không đủ quyền. Chỉ quản trị viên được tạo tài khoản nhân viên.", "error"); return; }
      form.hidden = false;
      ui.state(message, { type: "idle", title: "Sẵn sàng tạo tài khoản nhân viên", message: "Các trường ghi bắt buộc cần được điền đầy đủ." });
    } catch (error) {
      FoodTourNavigation.failure(error, checkRole);
      ui.state(message, { type: "error", message: ui.errorText(error), retry: checkRole });
    } finally { checking = false; }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (button.disabled || !ui.validate(form)) return;
    ui.clearErrors(form);
    const body = {};
    for (const id of ["email", "password", "fullName", "phoneNumber"]) {
      const value = document.getElementById(id).value;
      if (value || id === "password" || id === "email") body[id] = value;
    }
    ui.busy(button, true, "Đang tạo nhân viên…"); ui.notice(message, "Đang gửi thông tin…");
    try {
      const result = await FoodTourApi.createStaff(body);
      if (!result?.data?.userId || typeof result.data.email !== "string" || result.data.role !== "STAFF" || result.data.status !== "ACTIVE") throw ui.invalidResponse();
      ui.notice(message, (result.message || "Đã tạo tài khoản nhân viên.") + " Email: " + result.data.email + ". Mã tài khoản: " + result.data.userId, "success");
      ui.toast("Đã tạo tài khoản nhân viên."); form.reset(); ui.clearErrors(form);
    } catch (error) {
      const uncertain = error.kind === "network" || error.kind === "response" || error.status >= 500;
      if (uncertain) {
        ui.notice(message, ui.errorText({ kind: "network" }, "createStaff"), "warning");
        message.dataset.state = "error";
      } else {
        ui.notice(message, ui.errorText(error), "error"); ui.backendFieldError(form, error);
      }
    } finally { document.getElementById("password").value = ""; ui.busy(button, false); }
  });
  checkRole();
})();

