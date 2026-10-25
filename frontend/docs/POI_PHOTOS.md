# Bộ ảnh 10 POI — 25/10/2026

Đã bổ sung ảnh cho 10 POI đã duyệt: Hươu cao cổ, Voi châu Á, Hà mã, Tê giác trắng, Trầm hương, Ngọc lan, Trám trắng, Cát anh, Bảo tàng Động–Thực vật và Quán Nhan Hương.

Mỗi POI có thumbnail và ảnh chi tiết. 20 WebP tổng cộng 1.393.816 byte; riêng 10 thumbnail là 45.414 byte. 15 ngôn ngữ dùng chung ảnh theo tên gốc VI, không sao chép ảnh theo ngôn ngữ. Ảnh chi tiết chỉ được mount khi mở giới thiệu; loading lazy và kích thước có sẵn để giảm dịch chuyển bố cục.

## Nguồn và hiển thị

- Tám ảnh động vật/thực vật lấy từ Wikimedia Commons, đối chiếu đúng loài trong nội dung đã duyệt. Giữ tác giả, giấy phép và nhãn “Ảnh minh họa loài”. Không mô tả là ảnh cá thể tại Thảo Cầm Viên.
- Bảo tàng và Quán Nhan Hương dùng ảnh trong bài Dân trí và VnExpress về đúng địa điểm. Hiển thị “Ảnh tư liệu địa điểm”, không hiện tên tác giả ở hai thẻ theo yêu cầu người dùng. Không gán giấy phép CC cho hai ảnh báo chí; trạng thái quyền và nguồn lưu trung thực trong SOURCES.md/manifest.json. Không coi ý kiến người dùng là giấy phép do chủ sở hữu cấp.
- Đã bỏ khỏi UI các cụm “đã thu nhỏ/nén WebP” và “không xác nhận cá thể tại Thảo Cầm Viên”. Thay đổi kỹ thuật và giới hạn nguồn vẫn nằm trong hồ sơ công khai `public/images/pois/SOURCES.md`, có liên kết “Nguồn ảnh”.
- `avatarUrl` do API cung cấp được ưu tiên. Bộ ảnh này là dữ liệu trình bày của frontend, không cập nhật avatar_url, schema, seed, nội dung, tọa độ hoặc audio. Giữ ranh giới xác thực và thanh toán.

## Đối chiếu

| AC / QT / NFR | Trạng thái | Test / bằng chứng | Giới hạn |
| --- | --- | --- | --- |
| UC-03; US-B01 AC1 — xem ảnh | Có ảnh nhỏ/chi tiết cho 10 POI | all ten approved original names..., thumbnail is lazy..., detail keeps attribution... | Chưa nghiệm thu ảnh trên điện thoại vật lý |
| US-C01 AC1; QT-06 — bundle | Giữ nguyên API; chọn ảnh cục bộ theo originalName, không gọi lại API POI | Hồi quy bundle/public map đạt; translated display names test | Không đổi dữ liệu avatar trong database |
| NFR-01 — tài nguyên | Thumbnail/chi tiết riêng, loading lazy, không nhúng ảnh vào JSON bundle | packaged photos real WebP..., kiểm 20/20 HTTP/checksum | Chưa đo latency qua mạng di động |
| NFR-08 — nguồn/hiển thị | Chuỗi JSX an toàn, nguồn và giấy phép cố định | credit/source tests; không có HTML từ nguồn ảnh đưa vào DOM | Không thêm upload ảnh |
| Ảnh lỗi | Thumbnail về icon; detail báo lỗi mà không chặn nội dung/audio | image failure..., failed detail image... | Component test mô phỏng lỗi |
| Yêu cầu bỏ hai cụm và không hiện tác giả hai địa điểm | Đã đáp ứng ở UI | species detail omits two phrases; place photo omits author/license UI (2 ca) | Giữ hồ sơ nguồn để truy vết |

## Kết quả

Build TypeScript/Vite đạt; **145/145 test đạt, 0 lỗi, 0 bỏ qua**, Node 24.21.0. Chạy ngoài OneDrive. Kiểm HTTP tại bản thử cổng 5180: **20/20 ảnh HTTP 200, MIME image/webp, SHA-256 khớp**. Mọi ảnh đã được xem qua bảng đối chiếu trước khi chọn.

Chưa kiểm UI bằng công cụ browser trong mốc ảnh; chưa commit, push hoặc deploy staging. Không thay backend, Word, thanh toán hoặc giới hạn bản đồ.
