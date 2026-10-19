(() => {
  "use strict";
  const ui = window.FoodTourUI;
  const query = new URLSearchParams(window.location.search);
  const demo = query.get("demo") === "1";
  let demoPromise = null;
  function language() { return demo && query.get("lang") === "en" ? "en" : "vi"; }
  function link(page, lang = language()) {
    if (!demo) return "./" + page;
    const params = new URLSearchParams({ demo: "1", lang });
    return "./" + page + "?" + params.toString();
  }
  function setup(page) {
    const nav = document.getElementById("guestNav");
    if (nav) {
      for (const [file, label] of [["guest.html", "Bắt đầu"], ["payment.html", "Thanh toán"], ["explore.html", "Khám phá"]]) {
        const a = ui.element("a", label); a.href = link(file);
        if (file === page) a.setAttribute("aria-current", "page"); nav.append(a);
      }
    }
    const banner = document.getElementById("demoBanner");
    if (demo) {
      document.body.classList.add("guest-demo"); banner.hidden = false;
      const text = ui.element("strong", "DỮ LIỆU MẪU - KHÔNG PHẢI DỮ LIỆU THẬT");
      const exit = ui.element("a", "Thoát xem thử"); exit.href = "./" + page;
      banner.append(text, exit);
    }
    const mode = document.getElementById("previewLink");
    if (mode) { mode.href = "./" + page + "?demo=1"; mode.hidden = demo; }
  }
  function loadDemo() {
    if (!demo) return Promise.resolve(null);
    if (!demoPromise) {
      demoPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./assets/js/visit/demo-data.js";
        script.onload = () => {
          if (window.GuestDemoData?.sample === true) resolve(window.GuestDemoData);
          else { script.remove(); demoPromise = null; reject(new Error("Không đọc được dữ liệu xem thử.")); }
        };
        script.onerror = () => { script.remove(); demoPromise = null; reject(new Error("Không tải được dữ liệu xem thử. Vui lòng thử lại.")); };
        document.head.append(script);
      });
    }
    return demoPromise;
  }
  function session(host) {
    const status = window.GuestSession.previewStatus();
    const messages = {
      waiting: ["Chưa xác nhận được phiên tham quan", "Chức năng đang chờ backend. Bạn có thể xem bố cục; quyền tham quan và thanh toán chưa được xác nhận.", "payment.html", "Xem bước thanh toán"],
      pending: ["Phiên chưa kích hoạt", "Vui lòng chờ thanh toán được xác nhận. Với tiền mặt, nhân viên cần xác nhận đã nhận tiền.", "payment.html", "Về bước thanh toán"],
      expired: ["Phiên đã hết hạn", "Thời gian tham quan trong tình huống minh họa đã kết thúc. Vui lòng quay lại trang bắt đầu hoặc liên hệ nhân viên.", "guest.html", "Về trang bắt đầu"],
      invalid: ["Chưa xác nhận được quyền tham quan", "Thông tin phiên trong tình huống minh họa không hợp lệ. Vui lòng liên hệ nhân viên để được hỗ trợ.", "guest.html", "Về trang bắt đầu"]
    };
    const [title, message, page, label] = messages[status];
    host.replaceChildren(); host.className = "notice session-notice";
    host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite");
    host.append(ui.element("strong", (demo ? "MÔ PHỎNG · " : "") + title), ui.element("p", message));
    const a = ui.element("a", label); a.href = link(page); host.append(a);
  }
  function pending(host, message, retry) {
    ui.state(host, { type: "empty", title: "Chức năng đang chờ backend", message: message || "Nội dung tham quan chưa được cung cấp từ hệ thống.", retry });
  }
  function selectLanguages(select, data, current = language()) {
    select.replaceChildren();
    if (!demo || !data) {
      const option = ui.element("option", "Danh sách ngôn ngữ đang được chuẩn bị"); option.value = "";
      select.append(option); select.disabled = true; return;
    }
    for (const item of data.languages) { const option = ui.element("option", item.label + " — minh họa"); option.value = item.code; select.append(option); }
    select.disabled = false; select.value = current;
  }
  window.GuestUI = Object.freeze({ demo, language, link, setup, loadDemo, session, pending, selectLanguages });
})();

