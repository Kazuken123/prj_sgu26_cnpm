(() => {
  "use strict";
  const ui = window.FoodTourUI;
  function create({ status, playButton, pauseButton, stopButton }) {
    let audio = null, source = null, revision = 0;
    function controls(available) { playButton.disabled = pauseButton.disabled = stopButton.disabled = !available; }
    function stop() { revision++; if (audio) { audio.pause(); audio.currentTime = 0; } }
    function empty() {
      controls(false);
      ui.state(status, { type: "empty", title: "Chưa có âm thanh", message: "Âm thanh thuyết minh đang được chuẩn bị. Bạn vẫn có thể đọc phần giới thiệu địa điểm." });
    }
    function setSource(url) {
      stop();
      if (audio) { audio.removeAttribute("src"); audio.load(); }
      audio = null; source = null; playButton.textContent = "Phát";
      if (!url) { empty(); return; }
      // Future integration must pass the URL returned by the backend. No demo URL.
      let parsed;
      try { parsed = new URL(url, window.location.href); } catch { empty(); return; }
      if (!["https:", "http:"].includes(parsed.protocol)) { empty(); return; }
      source = parsed.href;
      const current = new Audio(); audio = current; current.preload = "none";
      current.src = source; controls(true);
      current.addEventListener("ended", () => { if (audio === current) { playButton.textContent = "Phát lại"; ui.state(status, { type: "success", title: "Đã phát xong" }); } });
      current.addEventListener("error", () => { if (audio === current) ui.state(status, { type: "error", title: "Chưa tải được âm thanh", message: "Kiểm tra kết nối và chạm thử lại khi sẵn sàng.", retry: retry }); });
      ui.state(status, { type: "idle", title: "Sẵn sàng phát", message: "Chạm Phát để nghe thuyết minh." });
    }
    async function play() {
      if (!audio || !source) { empty(); return; }
      const current = audio, startedAt = revision;
      ui.state(status, { title: "Đang mở âm thanh…" });
      try {
        await current.play();
        if (revision !== startedAt || audio !== current) { current.pause(); return; }
        ui.state(status, { type: "success", title: "Đang phát thuyết minh" }); playButton.textContent = "Phát";
      } catch (error) {
        if (revision !== startedAt || audio !== current) return;
        if (error.name === "NotAllowedError") {
          playButton.textContent = "Chạm để phát";
          ui.state(status, { type: "error", title: "Cần thao tác để phát âm thanh", message: "Trình duyệt đang chờ bạn chạm nút Chạm để phát." });
        } else ui.state(status, { type: "error", title: "Chưa phát được âm thanh", message: "Bạn có thể đọc nội dung và thử lại sau.", retry });
      }
    }
    function retry() { if (audio) audio.load(); return play(); }
    playButton.addEventListener("click", play);
    pauseButton.addEventListener("click", () => { revision++; if (audio) { audio.pause(); ui.state(status, { type: "idle", title: "Đã tạm dừng" }); } });
    stopButton.addEventListener("click", () => { stop(); if (audio) ui.state(status, { type: "idle", title: "Đã dừng âm thanh" }); });
    empty();
    return { setSource, stop, dispose: () => { stop(); if (audio) { audio.removeAttribute("src"); audio.load(); } audio = null; } };
  }
  window.GuestAudio = Object.freeze({ create });
})();

