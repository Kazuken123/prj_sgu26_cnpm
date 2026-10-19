(() => {
  "use strict";
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const messages = {
    ACCOUNT_LOCKED: "Không đủ quyền sử dụng: tài khoản đã bị quản trị viên khóa. Vui lòng liên hệ quản trị viên.",
    ACCOUNT_INACTIVE: "Không đủ quyền sử dụng: tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.",
    FORBIDDEN: "Không đủ quyền thực hiện thao tác này.",
  };
  function errorText(error, context = "read") {
    if (error.kind === "network") {
      if (context === "createStaff") return "Chưa rõ kết quả tạo nhân viên vì mất kết nối hoặc mất phản hồi. Không tự gửi lại yêu cầu. Hãy kiểm tra danh sách qua quản trị viên hoặc đăng nhập thử bằng tài khoản vừa nhập trước khi tạo lại. Hiện giao diện chưa có API danh sách STAFF; khi đăng nhập thử, nên dùng cửa sổ riêng để giữ phiên ADMIN.";
      if (context === "logout") return "Chưa xác nhận được kết quả đăng xuất với máy chủ. Phiên tại trình duyệt được giữ để bạn thử đăng xuất lại.";
      return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";
    }
    return messages[error.code] || (error.status === 403 ? "Không đủ quyền thực hiện thao tác này." : error.message) || "Có lỗi xảy ra. Vui lòng thử lại.";
  }
  function invalidResponse(message = "Phản hồi máy chủ thiếu thông tin cần thiết. Vui lòng thử tải lại.") {
    return Object.assign(new Error(message), { kind: "response", code: "INVALID_RESPONSE" });
  }
  function notice(node, text, tone = "info") {
    node.replaceChildren();
    node.className = "notice";
    node.dataset.tone = tone;
    node.dataset.state = tone === "error" ? "error" : tone === "success" ? "success" : "loading";
    node.setAttribute("role", tone === "error" ? "alert" : "status");
    node.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
    node.setAttribute("aria-atomic", "true");
    node.textContent = text;
    node.hidden = !text;
  }
  function busy(button, active, label = "Đang xử lý…") {
    if (active) {
      if (button.dataset.originalLabel === undefined) button.dataset.originalLabel = button.textContent;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = label;
    } else {
      if (button.dataset.originalLabel !== undefined) button.textContent = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
  function fieldError(input, message) {
    const id = input.id + "Error";
    let output = document.getElementById(id);
    if (!output) {
      output = element("p", "", "field-error"); output.id = id;
      input.insertAdjacentElement("afterend", output);
    }
    output.textContent = message; output.hidden = !message;
    const described = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(value => value && value !== id);
    if (message) described.push(id);
    if (described.length) input.setAttribute("aria-describedby", described.join(" "));
    else input.removeAttribute("aria-describedby");
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
  function bindValidation(form) {
    form.noValidate = true;
    for (const input of form.querySelectorAll("input")) input.addEventListener("input", () => fieldError(input, ""));
  }
  function clearErrors(form) {
    for (const input of form.querySelectorAll("input")) fieldError(input, "");
  }
  function validate(form) {
    let first = null;
    for (const input of form.querySelectorAll("input")) {
      const raw = input.value, value = raw.trim();
      let message = "";
      if (input.required && !(input.type === "password" ? raw : value)) message = "Vui lòng nhập thông tin này.";
      else if (input.id === "email" && (value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) message = "Email phải đúng định dạng và không vượt quá 255 ký tự.";
      else if (input.type === "password" && raw && (raw.length < 8 || new TextEncoder().encode(raw).length > 72)) message = "Mật khẩu cần ít nhất 8 ký tự và không vượt quá 72 byte UTF-8.";
      else if (input.id === "fullName" && raw && (!value || value.length > 100)) message = "Họ tên phải không rỗng và không vượt quá 100 ký tự nếu nhập.";
      else if (input.id === "phoneNumber" && raw) {
        const digits = value.replace(/\D/g, "").length;
        if (!value || value.length > 20 || !/^\+?[\d ()-]+$/.test(value) || digits < 8 || digits > 15) message = "Số điện thoại cần có 8–15 chữ số, tối đa 20 ký tự.";
      } else if (!input.validity.valid) message = "Vui lòng kiểm tra thông tin đã nhập.";
      fieldError(input, message);
      if (message && !first) first = input;
    }
    if (first) first.focus();
    return !first;
  }
  function backendFieldError(form, error) {
    let id;
    if (error.code === "EMAIL_EXISTS") id = "email";
    else if (error.code === "VALIDATION_ERROR") {
      // The backend has no field-errors object. Match only its known labels.
      const labels = [["Email", "email"], ["Mật khẩu", "password"], ["Họ tên", "fullName"], ["Số điện thoại", "phoneNumber"]];
      id = labels.find(([label]) => error.message?.startsWith(label))?.[1];
    }
    const input = id && form.querySelector("#" + id);
    if (input) { fieldError(input, error.message); input.focus(); }
    return Boolean(input);
  }
  function state(container, { type = "loading", title, message, retry } = {}) {
    container.replaceChildren(); container.hidden = false; container.className = "state";
    container.dataset.state = type;
    container.setAttribute("role", type === "error" ? "alert" : "status");
    container.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    container.setAttribute("aria-atomic", "true");
    const heading = element("p");
    if (type === "loading") { const marker = element("span", "", "spinner"); marker.setAttribute("aria-hidden", "true"); heading.append(marker); }
    const defaults = { idle: "Sẵn sàng", loading: "Đang tải…", empty: "Chưa có dữ liệu", error: "Không tải được dữ liệu", success: "Đã tải thành công" };
    heading.append(document.createTextNode(title || defaults[type] || defaults.empty));
    container.append(heading);
    if (message) container.append(element("p", message));
    if (retry) {
      const button = element("button", "Thử lại", "button-secondary"); button.type = "button";
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        busy(button, true, "Đang thử lại…");
        try { await retry(); } catch (error) { state(container, { type: "error", message: errorText(error), retry }); }
        finally { busy(button, false); }
      });
      container.append(button);
    }
  }
  function toast(message, tone = "success") {
    let region = document.getElementById("toastRegion");
    if (!region) { region = element("div", "", "toast-region"); region.id = "toastRegion"; region.setAttribute("aria-live", "polite"); document.body.append(region); }
    const box = element("div", undefined, "notice toast"); box.dataset.tone = tone;
    const close = element("button", "Đóng", "button-secondary"); close.type = "button";
    close.addEventListener("click", () => box.remove());
    box.append(element("p", message), close); region.append(box);
  }
  function confirmAction({ title = "Xác nhận thao tác", message, confirmLabel = "Xác nhận" }) {
    return new Promise(resolve => {
      const dialog = element("dialog");
      if (typeof dialog.showModal !== "function") { resolve(window.confirm(message || title)); return; }
      const heading = element("h2", title); heading.id = "confirmTitle";
      dialog.setAttribute("aria-labelledby", heading.id);
      const actions = element("div", undefined, "actions");
      const cancel = element("button", "Hủy", "button-secondary");
      const accept = element("button", confirmLabel); cancel.type = accept.type = "button";
      cancel.addEventListener("click", () => dialog.close("cancel"));
      accept.addEventListener("click", () => dialog.close("confirm"));
      actions.append(cancel, accept); dialog.append(heading, element("p", message || "Bạn muốn tiếp tục?"), actions);
      dialog.addEventListener("close", () => { const approved = dialog.returnValue === "confirm"; dialog.remove(); resolve(approved); }, { once: true });
      document.body.append(dialog); dialog.showModal(); cancel.focus();
    });
  }
  window.FoodTourUI = { element, notice, busy, fieldError, bindValidation, validate, clearErrors, backendFieldError, state, toast, confirmAction, errorText, invalidResponse };
})();

