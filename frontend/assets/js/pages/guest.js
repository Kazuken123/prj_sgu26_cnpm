(() => {
  "use strict";
  const ui = window.FoodTourUI, guest = window.GuestUI;
  guest.setup("guest.html"); guest.session(document.getElementById("sessionState"));
  const select = document.getElementById("narrationLanguage"), status = document.getElementById("guestState"), button = document.getElementById("startVisit");
  let language = guest.language(), ready = false;
  guest.selectLanguages(select, null);
  async function load() {
    if (!guest.demo) { guest.pending(status, "Danh sách ngôn ngữ, giá và phiên tham quan đang chờ hệ thống cung cấp."); return; }
    ui.busy(button, true, "Đang mở xem thử…"); ui.state(status, { title: "Đang tải nội dung xem thử…" });
    try {
      const data = await guest.loadDemo(); guest.selectLanguages(select, data, language); ready = true;
      ui.state(status, { type: "success", title: "Đã tải bố cục xem thử", message: "Ngôn ngữ và nội dung bên dưới chỉ là minh họa. Không có phiên tham quan thật được tạo." });
    } catch (error) { ui.state(status, { type: "error", message: error.message, retry: load }); }
    finally { ui.busy(button, false); }
  }
  select.addEventListener("change", () => { language = select.value; });
  button.addEventListener("click", () => {
    if (guest.demo && ready) window.location.href = guest.link("explore.html", language);
    else guest.pending(status, "Chưa thể tạo phiên tham quan lúc này. Vui lòng liên hệ nhân viên để được hướng dẫn.");
  });
  load();
})();

