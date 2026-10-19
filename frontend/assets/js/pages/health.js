(() => {
  "use strict";
  const ui = window.FoodTourUI;
  const message = document.getElementById("pageMessage");
  const content = document.getElementById("healthContent");
  const button = document.getElementById("checkHealthButton");
  let authorizing = false, checking = false, authorized = false;
  const lastSuccess = {};
  const time = () => new Date().toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" });
  async function runChecks() {
    if (!authorized || checking) return;
    checking = true; ui.busy(button, true, "Đang kiểm tra…");
    const checks = [
      { key: "live", node: document.getElementById("livenessState"), request: () => FoodTourApi.health() },
      { key: "ready", node: document.getElementById("readinessState"), request: () => FoodTourApi.readiness() }
    ];
    for (const check of checks) ui.state(check.node, { title: "Đang kiểm tra…", message: lastSuccess[check.key] ? "Lần thành công gần nhất: " + lastSuccess[check.key] : "Chưa có lần kiểm tra thành công." });
    try {
      const results = await Promise.allSettled(checks.map(check => check.request()));
      results.forEach((result, i) => {
        const check = checks[i];
        if (result.status === "fulfilled") {
          const data = result.value;
          const valid = data?.status === "ok" && data.service === "food-tour-api" && (check.key === "live" ? typeof data.timestamp === "string" && Number.isFinite(Date.parse(data.timestamp)) : data.database === "ready");
          if (valid) {
            lastSuccess[check.key] = time();
            ui.state(check.node, { type: "success", title: check.key === "live" ? "Backend đang phản hồi" : "Dữ liệu xác thực sẵn sàng", message: "Kiểm tra thành công lúc " + lastSuccess[check.key] + " (UTC+7)." });
            return;
          }
        }
        const error = result.status === "rejected" ? result.reason : ui.invalidResponse();
        const title = check.key === "ready" && error.code === "DATABASE_UNAVAILABLE" ? "Database chưa sẵn sàng" : "Không xác nhận được trạng thái";
        ui.state(check.node, { type: "error", title, message: ui.errorText(error) + (lastSuccess[check.key] ? " Lần thành công gần nhất: " + lastSuccess[check.key] + " (UTC+7)." : " Chưa có lần kiểm tra thành công."), retry: runChecks });
      });
      document.getElementById("checkedAt").textContent = "Lần kiểm tra gần nhất: " + time() + " (UTC+7). Không tự cập nhật định kỳ.";
    } finally { checking = false; ui.busy(button, false); }
  }
  async function authorize() {
    if (authorizing) return;
    authorizing = true; authorized = false; content.hidden = true;
    ui.state(message, { title: "Đang kiểm tra quyền truy cập…" });
    try {
      const user = await FoodTourNavigation.loadUser(); if (!user) return;
      if (user.role !== "ADMIN") { ui.notice(message, "Không đủ quyền. Trang trạng thái nội bộ chỉ dành cho quản trị viên.", "error"); return; }
      authorized = true; content.hidden = false; message.hidden = true; await runChecks();
    } catch (error) {
      FoodTourNavigation.failure(error, authorize);
      ui.state(message, { type: "error", message: ui.errorText(error), retry: authorize });
    } finally { authorizing = false; }
  }
  button.addEventListener("click", runChecks);
  authorize();
})();

