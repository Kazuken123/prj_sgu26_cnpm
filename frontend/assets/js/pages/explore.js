(() => {
  "use strict";
  const ui = window.FoodTourUI, guest = window.GuestUI;
  guest.setup("explore.html"); guest.session(document.getElementById("sessionState"));
  let data = null, language = guest.language(), selectedId = null, loading = false;
  const list = document.getElementById("poiList"), listState = document.getElementById("poiListState"), detail = document.getElementById("poiDetail"), select = document.getElementById("narrationLanguage");
  const audio = GuestAudio.create({ status: document.getElementById("audioState"), playButton: document.getElementById("audioPlay"), pauseButton: document.getElementById("audioPause"), stopButton: document.getElementById("audioStop") });
  const map = GuestMap.create({ container: document.getElementById("visitMap"), status: document.getElementById("mapState"), gpsStatus: document.getElementById("gpsState"), gpsButton: document.getElementById("useLocation") });
  const tour = GuestTour.create({ choices: document.getElementById("tourChoices"), select: document.getElementById("sampleTour"), selected: document.getElementById("tourSelected"), status: document.getElementById("tourState"), applyButton: document.getElementById("applyTour") });
  GuestChat.create({ drawer: document.getElementById("chatDrawer"), openButton: document.getElementById("openChat"), closeButton: document.getElementById("closeChat"), form: document.getElementById("chatForm"), sendButton: document.getElementById("chatSend"), status: document.getElementById("chatState"), sources: document.getElementById("chatSources") });
  const fence = GuestGeofence.create();
  document.getElementById("geofenceState").textContent = fence.evaluate().reason;
  function showDetail(id) {
    audio.setSource(null); selectedId = id; detail.replaceChildren();
    const poi = data?.pois.find(item => item.id === id);
    if (!poi) { ui.state(detail, { type: "empty", title: "Chưa chọn địa điểm", message: "Chọn một điểm trong danh sách để xem giới thiệu." }); return; }
    const content = poi.text[language];
    const img = ui.element("img"); img.src = poi.image; img.alt = poi.alt; img.width = 1066; img.height = 853; img.loading = "lazy"; img.className = "poi-detail-image";
    detail.append(img, ui.element("span", "DỮ LIỆU MẪU", "badge"), ui.element("h3", content.name), ui.element("p", content.description));
    detail.append(ui.element("p", "Ngôn ngữ nội dung minh họa: " + (language === "en" ? "Tiếng Anh" : "Tiếng Việt") + ". Chưa có tọa độ hay âm thanh.", "fine-print"));
    for (const button of list.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.poiId === id));
  }
  function renderPois() {
    list.replaceChildren();
    if (!data?.pois.length) { ui.state(listState, { type: "empty", title: "Chưa có điểm tham quan từ hệ thống", message: "Danh sách sẽ hiển thị sau khi nội dung được cung cấp." }); return; }
    for (const poi of data.pois) {
      const li = ui.element("li"); const button = ui.element("button", undefined, "poi-button"); button.type = "button"; button.dataset.poiId = poi.id; button.setAttribute("aria-pressed", String(poi.id === selectedId));
      const img = ui.element("img"); img.src = poi.image; img.alt = ""; img.width = 96; img.height = 80; img.loading = "lazy";
      const text = ui.element("span"); text.append(ui.element("strong", poi.text[language].name), ui.element("small", "Nội dung minh họa · Chưa có âm thanh"));
      button.append(img, text); button.addEventListener("click", () => showDetail(poi.id)); li.append(button); list.append(li);
    }
    ui.state(listState, { type: "success", title: "Đã tải " + data.pois.length + " điểm minh họa", message: "Không có marker hoặc tọa độ mẫu trên bản đồ." });
  }
  async function load() {
    if (loading) return; loading = true;
    guest.selectLanguages(select, null);
    try {
      if (!guest.demo) {
        guest.pending(listState, "Chưa có điểm tham quan từ hệ thống. Bạn có thể mở chế độ xem thử riêng để xem bố cục danh sách.");
        guest.pending(detail, "Thông tin địa điểm sẽ hiển thị khi hệ thống cung cấp nội dung."); tour.setData(null, language); return;
      }
      ui.state(listState, { title: "Đang tải danh sách minh họa…" });
      data = await guest.loadDemo(); guest.selectLanguages(select, data, language); renderPois();
      showDetail(selectedId); tour.setData(data, language);
    } catch (error) { ui.state(listState, { type: "error", message: error.message, retry: load }); }
    finally { loading = false; }
  }
  select.addEventListener("change", () => {
    audio.setSource(null); language = select.value;
    renderPois(); showDetail(selectedId); tour.setData(data, language);
  });
  for (const tab of document.querySelectorAll('[role="tab"]')) {
    function activate() {
      for (const item of document.querySelectorAll('[role="tab"]')) {
        const active = item === tab; item.setAttribute("aria-selected", String(active)); item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
      }
      map.resize();
    }
    tab.addEventListener("click", activate);
    tab.addEventListener("keydown", event => {
      const tabs = [...document.querySelectorAll('[role="tab"]')]; let index = tabs.indexOf(tab);
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].focus(); tabs[index].click();
    });
  }
  window.addEventListener("pagehide", () => { audio.dispose(); map.dispose(); });
  load();
})();

