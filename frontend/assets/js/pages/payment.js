(() => {
  "use strict";
  const ui = window.FoodTourUI, guest = window.GuestUI;
  guest.setup("payment.html"); guest.session(document.getElementById("sessionState"));
  const message = document.getElementById("paymentState"), details = document.getElementById("methodDetails");
  for (const radio of document.querySelectorAll('input[name="paymentMethod"]')) radio.addEventListener("change", () => {
    details.textContent = radio.value === "cash" ? "Bạn sẽ thanh toán trực tiếp và chờ nhân viên xác nhận đã nhận tiền. Mã truy cập chỉ được cấp sau khi hệ thống xác nhận." : "Bạn sẽ được chuyển đến bước thanh toán trực tuyến khi chức năng sẵn sàng. Việc quay về trang này không tự xác nhận đã thanh toán.";
  });
  guest.pending(message, "Chưa có thông tin giá, mã phiên hoặc kết quả thanh toán từ hệ thống. Không có giao dịch nào được tạo ở trang này.");
  const link = document.getElementById("previewExplore");
  link.hidden = !guest.demo; link.href = guest.link("explore.html");
  for (const button of document.querySelectorAll("[data-preview-session]")) button.addEventListener("click", () => {
    if (!guest.demo) return;
    const params = new URLSearchParams(window.location.search); params.set("session", button.dataset.previewSession);
    window.location.href = "./payment.html?" + params.toString();
  });
  document.getElementById("previewSessionControls").hidden = !guest.demo;
})();

