(() => {
  "use strict";
  const ui = window.FoodTourUI;
  // CHỜ NHÓM CHỐT ĐỊA ĐIỂM. This is a world overview, not temple coordinates.
  // This single configuration is the only hardcoded map center.
  const MAP_CONFIG = Object.freeze({ center: Object.freeze([0, 0]), zoom: 2, tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" });
  function create({ container, status, gpsStatus, gpsButton }) {
    let map = null, tiles = null, timer = null, disposed = false, gpsBusy = false;
    function tileError() {
      ui.state(status, { type: "error", title: "Chưa tải được bản đồ nền", message: "Bạn vẫn có thể xem danh sách và chọn địa điểm bên dưới.", retry: reload });
    }
    function reload() {
      if (disposed) return;
      if (!window.L || window.L.version !== "1.9.4") {
        ui.state(status, { type: "error", title: "Chưa mở được bản đồ", message: "Không đọc được thư viện bản đồ cục bộ. Danh sách địa điểm vẫn dùng được.", retry: reload }); return;
      }
      try {
        if (!map) map = L.map(container, { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, scrollWheelZoom: false }).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
        if (tiles) map.removeLayer(tiles);
        clearTimeout(timer);
        let failed = false;
        ui.state(status, { title: "Đang tải bản đồ nền…", message: "Chưa có điểm tham quan từ hệ thống." });
        const layer = L.tileLayer(MAP_CONFIG.tileUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
          maxZoom: 19, updateWhenIdle: true, keepBuffer: 1
        });
        tiles = layer;
        layer.on("tileerror", () => { if (tiles === layer && !disposed) { failed = true; clearTimeout(timer); tileError(); } });
        layer.on("load", () => {
          if (tiles !== layer || disposed) return;
          clearTimeout(timer);
          if (!failed) ui.state(status, { type: "success", title: "Đã tải bản đồ nền", message: "Chưa có điểm tham quan từ hệ thống. Bản đồ không có marker hay đường đi tham quan." });
        });
        layer.addTo(map);
        timer = setTimeout(() => { if (tiles === layer && !disposed) { failed = true; tileError(); } }, 15000);
      } catch { tileError(); }
    }
    function locationError(message) {
      gpsBusy = false; ui.busy(gpsButton, false);
      ui.state(gpsStatus, { type: "error", title: "Chưa lấy được vị trí", message, retry: locate });
    }
    function locate() {
      if (gpsBusy || disposed) return;
      if (!navigator.geolocation) { locationError("Thiết bị chưa hỗ trợ lấy vị trí. Bạn vẫn có thể chọn địa điểm thủ công."); return; }
      gpsBusy = true; ui.busy(gpsButton, true, "Đang lấy vị trí…");
      ui.state(gpsStatus, { title: "Đang chờ vị trí từ thiết bị…" });
      navigator.geolocation.getCurrentPosition(position => {
        if (disposed) return;
        gpsBusy = false; ui.busy(gpsButton, false);
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { locationError("Vị trí nhận được chưa hợp lệ. Bạn vẫn có thể chọn địa điểm thủ công."); return; }
        // Device position only. No POI coordinates, markers or geofence inferred.
        if (map) map.setView([latitude, longitude], 15, { animate: false });
        ui.state(gpsStatus, { type: "success", title: "Đã nhận vị trí từ thiết bị", message: "Độ chính xác ước tính: " + Math.round(accuracy) + " m. Chưa có dữ liệu điểm tham quan để tính khoảng cách hoặc phát tự động." });
      }, error => {
        if (disposed) return;
        locationError(error.code === 1 ? "Bạn chưa cho phép vị trí. Bản đồ và lựa chọn địa điểm thủ công vẫn dùng được." : "Không lấy được vị trí lúc này. Hãy kiểm tra quyền vị trí và kết nối; bạn vẫn có thể chọn địa điểm thủ công.");
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
    }
    gpsButton.addEventListener("click", locate);
    reload();
    return { reload, resize: () => { if (map) map.invalidateSize({ animate: false }); }, dispose: () => { disposed = true; clearTimeout(timer); if (map) map.remove(); } };
  }
  window.GuestMap = Object.freeze({ MAP_CONFIG, create });
})();

