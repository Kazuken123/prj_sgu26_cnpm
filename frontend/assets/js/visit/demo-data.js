(() => {
  "use strict";
  if (new URLSearchParams(window.location.search).get("demo") !== "1") return;
  // Layout examples only: deliberately no coordinates, session/token, price,
  // payment success, audio URLs or chatbot answers. Not acceptance data.
  window.GuestDemoData = Object.freeze({
    sample: true,
    languages: [{ code: "vi", label: "Tiếng Việt" }, { code: "en", label: "Tiếng Anh" }],
    pois: [
      { id: "demo-01", image: "./assets/images/a1%20%281%29.jpg", alt: "Tượng Quan Âm giữa cây xanh trong khuôn viên chùa", text: {
        vi: { name: "Điểm minh họa: tượng Quan Âm", description: "Đây là văn bản mẫu để xem bố cục giới thiệu địa điểm. Thông tin thuyết minh chính thức đang chờ hệ thống cung cấp." },
        en: { name: "Sample stop: Quan Am statue", description: "This sample text demonstrates the place information layout. Official narration is not available yet." }
      } },
      { id: "demo-02", image: "./assets/images/a1%20%283%29.jpg", alt: "Toàn cảnh khuôn viên chùa, cây xanh và biển", text: {
        vi: { name: "Điểm minh họa: khuôn viên chùa", description: "Nội dung mẫu minh họa một điểm dừng khác trong danh sách. Đây không phải hướng dẫn tham quan hay thông tin lịch sử đã được xác nhận." },
        en: { name: "Sample stop: temple grounds", description: "A second sample stop for previewing the list. This is not a verified visitor guide or historical description." }
      } },
      { id: "demo-03", image: "./assets/images/a1%20%286%29.jpg", alt: "Cảnh chùa và sườn núi trong ánh nắng chiều", text: {
        vi: { name: "Điểm minh họa: góc nhìn cảnh quan", description: "Hình ảnh được dùng để minh họa thẻ nội dung. Chưa có tọa độ, khoảng cách, đường đi hoặc âm thanh cho điểm mẫu này." },
        en: { name: "Sample stop: scenic view", description: "This image illustrates a content card. No coordinates, distances, route geometry or audio are supplied for this sample stop." }
      } }
    ],
    tours: [{ id: "demo-tour-01", name: "Tour bố cục minh họa", poiIds: ["demo-01", "demo-02", "demo-03"] }]
  });
})();

