(() => {
  "use strict";
  function create({ drawer, openButton, closeButton, form, sendButton, status, sources }) {
    const ui = window.FoodTourUI;
    sendButton.disabled = true;
    sources.textContent = "Nguồn tham khảo sẽ hiển thị khi có câu trả lời từ hệ thống.";
    ui.state(status, { type: "empty", title: "Chức năng đang chờ backend", message: "Hỏi đáp chưa sẵn sàng. Hiện chưa có câu trả lời hoặc nguồn tham khảo được cung cấp." });
    function open() {
      if (typeof drawer.showModal === "function") { if (!drawer.open) drawer.showModal(); }
      else { drawer.hidden = false; drawer.setAttribute("open", ""); }
      openButton.setAttribute("aria-expanded", "true"); closeButton.focus();
    }
    function close() {
      if (typeof drawer.close === "function") drawer.close();
      else { drawer.hidden = true; drawer.removeAttribute("open"); }
      openButton.setAttribute("aria-expanded", "false"); openButton.focus();
    }
    openButton.addEventListener("click", open); closeButton.addEventListener("click", close);
    drawer.addEventListener("close", () => { openButton.setAttribute("aria-expanded", "false"); openButton.focus(); });
    drawer.addEventListener("cancel", () => openButton.setAttribute("aria-expanded", "false"));
    form.addEventListener("submit", event => { event.preventDefault(); });
    // No chatbot request or synthetic answer. Future processing/error state must
    // be driven only by the confirmed visitor API, via the shared API module.
    return { close };
  }
  window.GuestChat = Object.freeze({ create });
})();

