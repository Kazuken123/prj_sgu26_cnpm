(() => {
  "use strict";
  const ui = window.FoodTourUI;
  const form = document.getElementById("loginForm");
  const button = document.getElementById("submitButton");
  const message = document.getElementById("message");
  ui.bindValidation(form);
  ui.state(message, { type: "idle", title: "Sẵn sàng đăng nhập", message: "Sử dụng email và mật khẩu được quản trị viên cấp." });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (button.disabled || !ui.validate(form)) return;
    ui.clearErrors(form); ui.busy(button, true, "Đang đăng nhập…"); ui.notice(message, "Đang kiểm tra tài khoản…");
    try {
      const result = await FoodTourApi.login({ email: document.getElementById("email").value, password: document.getElementById("password").value });
      if (typeof result?.data?.accessToken !== "string" || !result.data.accessToken || typeof result.data.refreshToken !== "string" || !result.data.refreshToken) throw ui.invalidResponse();
      FoodTourAuth.saveSession(result.data);
      ui.notice(message, "Đăng nhập thành công. Đang mở trang tài khoản…", "success");
      window.location.href = "./account.html";
    } catch (error) {
      ui.notice(message, ui.errorText(error), "error"); ui.backendFieldError(form, error);
    } finally { ui.busy(button, false); }
  });
})();

