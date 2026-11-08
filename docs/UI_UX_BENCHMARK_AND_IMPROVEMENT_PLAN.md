# BÁO CÁO NGHIÊN CỨU CHUẨN MỰC UI/UX QUỐC TẾ & KẾ HOẠCH NÂNG CẤP GIAO DIỆN
**Dự án: Hệ thống Tự động Thuyết minh Đa ngôn ngữ Thảo Cầm Viên Sài Gòn**
*Ngày lập: 24/10/2026 | Tác giả: Nhóm Kỹ thuật & UI/UX Design*

---

## I. NGHIÊN CỨU & HỌC HỎI CÁC HỆ THỐNG WEB HÀNG ĐẦU THẾ GIỚI

Để xây dựng một trải nghiệm web vừa tiện dụng cho du khách vừa sang trọng, chuyên nghiệp khi demo trên máy chiếu, chúng tôi đã tiến hành rà soát và tổng hợp các mẫu thiết kế (Design Patterns) từ 5 hệ thống web bản đồ & tương tác hàng đầu thế giới:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    HỌC HỎI CÁC CASE STUDY HÀNG ĐẦU THẾ GIỚI                     │
├────────────────────┬────────────────────────────────────────────────────────────┤
│ 1. Airbnb Map View │ Chuẩn mực "Split-Screen" (40:60) & Đồng bộ hai chiều       │
│ 2. AllTrails /     │ Bố cục hiển thị lộ trình, trạm dừng & phân cấp độ khó     │
│    Komoot          │                                                            │
│ 3. Google Maps Web │ Thanh tìm kiếm nổi (Floating Bar) & Thẻ thông tin trượt     │
│ 4. Spotify / Apple │ Trình phát âm thanh cố định đáy (Persistent Bottom Player) │
│ 5. Mandai Zoo (SG) │ Bản đồ sinh thái, ghim động vật trực quan, Proximity radar │
└────────────────────┴────────────────────────────────────────────────────────────┘
```

---

### 1. Airbnb: Mô hình Split-Screen & Đồng bộ hai chiều (Bidirectional Sync)
* **Bố cục chia đôi độc lập (Independent Split-Pane):** Màn hình chia thành 2 phần: Bên trái là danh sách thẻ cuộn độc lập; bên phải là bản đồ tương tác cố định (Sticky Map).
* **Đồng bộ trạng thái 2 chiều:** 
  * Khi rê chuột/click vào thẻ bên trái → Pin tương ứng trên bản đồ tự động phóng to, đổi màu nổi bật và camera bản đồ lượn nhẹ tới điểm đó.
  * Khi click vào Pin trên bản đồ → Khung bên trái tự động cuộn mượt (smooth scroll) đến đúng thẻ và hiển thị chi tiết.
* **Pin dạng viên thuốc (Pill Pins):** Thay vì dùng icon giọt nước truyền thống, Airbnb dùng các thẻ nhỏ bo tròn hiển thị thông tin cốt lõi ngay trên mặt bản đồ, giảm thiểu việc phải click xem trước.

---

### 2. AllTrails & Komoot: Bản đồ khám phá dã ngoại & Lộ trình trạm dừng
* **Thanh công cụ lọc nổi (Floating Filter Pills):** Các nút phân loại (Độ dài, Loại cảnh quan, Đánh giá) được thiết kế dạng con nhộng (Capsules), nằm gọn gàng ngay trên mép trên của bản đồ.
* **Lộ trình tham quan liên tục (Sequential Waypoints):** Các trạm dừng trên bản đồ được đánh số thứ tự nối với nhau bằng đường nét đứt thanh mảnh, giúp người dùng nắm bắt ngay tuyến đường tối ưu mà không gây rối mắt.
* **Tách biệt dữ liệu kỹ thuật:** Các thông số địa lý (độ cao, khoảng cách) được gom vào các thẻ nhỏ dạng lưới (2x2 Grid) sắc nét, font số to, nhãn chú thích nhỏ tinh tế.

---

### 3. Google Maps Web: Tối ưu không gian & Thẻ trượt (Sliding Drawer)
* **Bản đồ luôn là "Nhân vật chính":** Bản đồ mở rộng tối đa ra toàn bộ màn hình (Full Bleed Canvas).
* **Thanh tìm kiếm & Danh mục trôi nổi (Floating Search Card):** Đặt ở góc trên bên trái, phủ nhẹ một lớp kính mờ (Backdrop Blur).
* **Nguyên tắc không che khuất:** Khi chọn một điểm đến, bảng thông tin chi tiết trượt êm ái từ mép màn hình vào, bản đồ tự động điều chỉnh tâm điểm sang bên cạnh để không bao giờ bị che mất điểm đang xem.

---

### 4. Spotify & Apple Podcasts: Trình phát âm thanh tiện dụng (Persistent Audio Dock)
* **Thanh điều khiển cố định ở đáy (Sticky Bottom Player):** Dù người dùng đang cuộn bản đồ, xem danh sách hay đọc lời dẫn, thanh nghe audio vẫn luôn nằm cố định ở sát mép dưới màn hình.
* **Thanh sóng âm trực quan (Interactive Waveform Scrubber):** Thay cho thanh trượt thời gian đơn điệu, thanh sóng âm nhấp nháy tạo cảm giác hiện đại, giàu tính công nghệ.
* **Nút bấm ngón tay lớn:** Nút Play/Pause có đường kính tối thiểu 44–48px, các nút tua nhanh 15s trước/sau đặt đối xứng, dễ dàng thao tác bằng một tay khi đang di chuyển.

---

### 5. Mandai Wildlife Reserve (Singapore Zoo App): Ứng dụng sở thú chuẩn mực
* **Bản đồ sinh thái sống động:** Các ghim loài thú là ảnh đại diện tròn thu nhỏ viền trắng nổi bật trên nền xanh mát của công viên.
* **Banner nhận diện cự ly (Proximity Geofence Banner):** Khi khách tiến vào bán kính 30–50m quanh chuồng thú, hệ thống hiện banner tinh tế: *"Bạn đã đến gần Voi Châu Á — Chạm để nghe thuyết minh"*, mang lại cảm giác thông minh và chu đáo.

---

## II. ĐỐI CHIẾU & ĐÁNH GIÁ CÁC ĐIỂM CHƯA PHÙ HỢP CỦA HỆ THỐNG HIỆN TẠI

So sánh với các tiêu chuẩn quốc tế trên, giao diện hiện tại của dự án tồn tại **5 nhóm vấn đề bất cập nghiêm trọng**:

| Tiêu chí | Chuẩn mực Quốc tế (Airbnb, Google, Mandai) | Hiện trạng Dự án | Đánh giá mức độ |
| :--- | :--- | :--- | :---: |
| **Bố cục trang Khám phá** | Split-Screen 40:60 rộng mở, bản đồ bao quát | Chia 3 cột cố định (`230px | 1fr | 310px`), bản đồ bị chèn ép, cột danh sách quá hẹp làm chữ nhảy dòng | 🔴 Rất bất cập |
| **Trình phát Audio** | Sticky Mini Player ở đáy màn hình, nghe liên tục khi đổi trang | Nằm sâu trong cột chi tiết bên phải; đổi xem điểm khác là mất dấu điều khiển | 🔴 Rất bất cập |
| **Màu sắc & Thị giác** | Trắng sáng, xanh ngọc Emerald, điểm nhấn ấm áp, hiện đại | Tông vàng úa xỉn màu (`#f7f6ef`), xanh rêu đen đậm, nhìn cũ kịch như tài liệu lịch sử | 🔴 Rất bất cập |
| **Nội dung & Thông báo** | Thân thiện, tôn trọng khách, giấu chi tiết kỹ thuật | Dày đặc cảnh báo răn đe: *"Không cấp token lần 2"*, *"Chưa khảo sát thực địa"*, bảng debug session | 🔴 Rất bất cập |
| **Quy trình Nhập vé** | 6 ô OTP to bản, tự động nhảy trỏ, bàn phím số | 1 ô input văn bản thông thường, nhiều nút kỹ thuật dễ gây bấm nhầm | 🟡 Bất tiện |

---

## III. BẢN THIẾT KẾ & HƯỚNG SỬA CHỮA CHI TIẾT (ACTIONABLE BLUEPRINT)

---

### 1. Trang Khám phá & Bản đồ (`/explore`): Tái cấu trúc thành Modern Split-Screen
* **Bố cục Desktop (Màn chiếu trình diễn cho Hội đồng):**
  * **Cột Trái (40% Viewport):** Panel thông tin đa năng (Exhibition Studio) gồm:
    * Ô tìm kiếm & bộ lọc danh mục con nhộng (Pill filters: *Tất cả, Động vật, Cổ thụ, Di tích*).
    * Thẻ POI nổi bật: Ảnh tỉ lệ 16:10 sắc nét, nhãn tình trạng bảo tồn quốc tế IUCN (`Nguy cấp - EN`), cự ly GPS thời gian thực (`Cách bạn 45m`).
    * Trình phát âm thanh chuẩn Spotify: Thanh sóng âm xanh ngọc, nút tua 15s, chọn giọng đọc, hiển thị thời lượng Mono.
    * Kịch bản đọc thuyết minh rút gọn có thể mở rộng (Accordion).
  * **Cột Phải (60% Viewport):** Bản đồ OpenStreetMap toàn cảnh:
    * Sử dụng Map Tiles sáng màu (CartoDB Voyager / OSM Hot) làm nổi bật thảm thực vật Thảo Cầm Viên.
    * Ghim địa điểm dạng **Circular Photo Badges**: Ảnh tròn của từng con thú/cây cổ thụ có viền trắng nổi và nhãn tên bên dưới.
    * Đèn phát xung radar GPS vị trí của khách (`Pulse Beacon`).
    * Tuyến đường tham quan gợi ý vẽ bằng đường cong nét đứt mềm mại.
* **Bố cục Mobile (Điện thoại thực tế của du khách):**
  * Tự động chuyển đổi thành **Bản đồ toàn màn hình (Full-Screen Map)**.
  * Tích hợp **Interactive Bottom Sheet** trượt từ dưới lên (Peek: xem nhanh POI gần nhất; Half: danh sách trạm dừng; Full: chi tiết toàn bộ thông tin).

---

### 2. Trình phát âm thanh: Nâng cấp thành Persistent Bottom Audio Dock
* Thiết kế thanh Mini-Player luôn nổi ở cạnh đáy màn hình khi audio đang chạy.
* Gồm: Ảnh thumbnail tròn xoay nhẹ khi phát, tên điểm tham quan, thanh tiến trình siêu mảnh màu xanh ngọc, nút Play/Pause to rõ, nút tua lại 15 giây.
* Du khách có thể thoải mái zoom bản đồ, tìm kiếm trạm khác mà âm thanh thuyết minh vẫn phát liên tục không bị ngắt quãng.

---

### 3. Trang Kích hoạt vé & Thanh toán (`/payment`): Giao diện E-Ticket hiện đại
* **Thiết kế dạng Thẻ vé điện tử (Smart Zoo Pass):** Nền trắng bo góc 24px, viền mờ cao cấp, chia 2 phân khu rõ rệt:
  * **Tab 1: Nhập mã quầy vé (Tiền mặt):**
    * 6 ô vuông nhập mã số (PIN Code inputs) lớn, cách điệu đẹp mắt.
    * Tự động nhận diện bàn phím số trên điện thoại, tự chuyển trỏ chuột sang ô tiếp theo khi gõ.
    * Nút *"Kích Hoạt Vé Ngay"* màu xanh Emerald lớn, bấm là chuyển thẳng sang Bản đồ.
  * **Tab 2: Thanh toán Online:**
    * Hiển thị bảng giá vé niêm yết rõ ràng (VD: 20.000 VNĐ).
    * Khung hiển thị mã QR thanh toán nhanh mô phỏng cổng Payoo/Chuyển khoản.
* **Xóa bỏ 100% các dòng chữ răn đe kỹ thuật:** Giấu các cảnh báo phức tạp vào nút *"Cần trợ giúp hoặc kiểm tra sự cố vé?"* thu gọn ở góc dưới.

---

### 4. Hệ màu & Typography mới (Modern Botanical Design Tokens)
* **Nền tảng màu sắc:**
  * Background chính: Trắng tinh (`#FFFFFF`) và Xám sương nhẹ (`#F8FAF9`).
  * Màu thương hiệu (Brand Green): Xanh rừng mưa nhiệt đới (`#1B4332`, `#2D6A4F`, `#40916C`).
  * Màu điểm nhấn (Accent): Xanh ngọc Emerald (`#10B981`, `#34D399`) và Vàng nắng ấm (`#F59E0B`).
* **Kiểu chữ (Typography):**
  * Chuyển 100% sang font **Plus Jakarta Sans / Inter**.
  * Chữ đậm, nét dứt khoát, độ tương phản cao, loại bỏ hoàn toàn font có chân Serif rườm rà.

---

## IV. KẾ HOẠCH HÀNH ĐỘNG THEO SPRINT (ACTIONABLE ROADMAP)

Để đảm bảo việc chỉnh sửa an toàn tuyệt đối, không làm hỏng logic backend và duy trì 100% test pass (120/120 test frontend), quy trình cải tạo sẽ được thực thi qua 4 Sprint:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      LỘ TRÌNH THỰC HIỆN 4 SPRINT                       │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sprint 1 │ Tái cấu trúc Design Tokens: Thay bảng màu, Font Sans-serif, │
│          │ Button, Badges, Waveform Player component dùng chung.       │
├──────────┼─────────────────────────────────────────────────────────────┤
│ Sprint 2 │ Lột xác Trang Kích Hoạt Vé (`/payment`): 6 Ô OTP số lớn,    │
│          │ E-Ticket Pass, ẩn log debug, tối ưu luồng 1 chạm.          │
├──────────┼─────────────────────────────────────────────────────────────┤
│ Sprint 3 │ Lột xác Trang Khám Phá (`/explore`): Desktop Split-Screen,  │
│          │ Ghim ảnh tròn Leaflet thật, đồng bộ 2 chiều, Bottom Sheet.  │
├──────────┼─────────────────────────────────────────────────────────────┤
│ Sprint 4 │ Tinh chỉnh Trang Chủ (`/`) + Kiểm thử hồi quy 100% test pass│
│          │ và hoàn thiện tài liệu báo cáo thuyết minh đồ án.           │
└──────────┴─────────────────────────────────────────────────────────────┘
```

---
*Báo cáo này được lập để làm cơ sở định hướng kỹ thuật và thống nhất trước khi triển khai mã nguồn.*
