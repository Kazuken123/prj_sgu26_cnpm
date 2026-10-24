# Xem bản đồ trước khi kích hoạt quyền nghe

Quyết định của chủ dự án ngày 24/10/2026: khách được xem bản đồ, danh sách
POI và giới thiệu trước khi thanh toán. Bấm **Nghe thuyết minh** mở trang
thanh toán có cả ONLINE/MockGateway và nhập mã tiền mặt sáu số. Đây là điều
chỉnh phạm vi xem trước so với Word hiện tại; chưa sửa Word trong mốc này.

## Hợp đồng API

`GET /api/content/map?languageCode=vi` không yêu cầu token. Header xác thực
cũ hoặc không hợp lệ không ngăn khách xem phần công khai này. Chỉ nhận một
`languageCode`; mã sai định dạng/không hoạt động trả 400. Lỗi database trả
503 `MAP_UNAVAILABLE` với thông báo an toàn. Phản hồi đặt `Cache-Control: no-store`.

Phản hồi `{ data: ... }` có hình dạng tương thích bundle để giao diện dùng
lại bản đồ: danh mục ngôn ngữ hoạt động, POI ACTIVE, tọa độ, bán kính, ảnh,
tên và giới thiệu. Store chỉ đọc bản dịch READY đúng phiên bản nguồn;
fallback theo ngôn ngữ chọn → Anh → Việt, ghi đúng ngôn ngữ thực tế.
`expiresAt` là null, `tours` rỗng, `text.audioScript` null, mọi audio
UNAVAILABLE với URL null. Không truy vấn bảng audio, thanh toán, phiên khách
hoặc ghi BUNDLE_ACCESS_LOGS cho lượt xem trước. Đây không phải cấp quyền nghe.

`GET /api/content/bundle`, `GET /api/visits/me` và
`GET /api/media/audio/:key` giữ nguyên xác thực phiên khách. Token ONLINE
đã cấp vẫn hợp lệ khi phiên PAID/ACTIVE và chưa hết hạn; không bắt buộc
khách ONLINE phải được nhân viên xác nhận tiền mặt.

Giữ nguyên các API thanh toán đang có, xử lý webhook, chống lặp, TTL và
giới hạn thử mã. API tiền mặt `POST /api/payments/exchange-cash-code` nhận
`{ "shortedCode": "012345" }`, không phải `authCode` và không cần khách
nhập session_id. Không tự tạo giao dịch khi khách mở bản đồ/trang thanh toán.

## Dữ liệu và triển khai

Không chạy các script đổi danh sách POI trong tài liệu bàn giao frontend.
Giữ nguyên bộ 10 POI đã duyệt, tên/lời đọc, tour demo và gói 15 ngôn ngữ.
Tọa độ gồm vị trí tham khảo và minh họa, chưa khảo sát thực địa; không
khẳng định toàn bộ là điểm OSM hoặc tuyến đi bộ đã kiểm chứng.

Không đổi schema, không có migration. Backend phải có API map trước hoặc
cùng lần triển khai frontend này. Không vô hiệu ONLINE hoặc bật chính sách
chỉ tiền mặt để khắc phục lỗi thiếu API.

Các phần Word cần cập nhật sau: mục 1.6.2 về ranh giới nội dung xem trước;
US-B01/US-C01 và QT-01/QT-06 về bản đồ công khai so với bundle trả phí;
UC-03 và điều kiện truy cập liên quan; thiết kế Content Router/Service/Store
chương 4.2–4.3 bổ sung projection bản đồ công khai. Schema 4.4.4 không đổi.
UC-01 và US-A02 vẫn giữ thanh toán trực tuyến mô phỏng.

## Kiểm chứng mốc 24/10/2026

Kiểm thử ngoài OneDrive trên MySQL 8.4 và Valkey 8 (Redis-compatible):
lint backend đạt; toàn backend 728/728, 0 lỗi/hủy/bỏ qua; frontend 115/115,
0 lỗi/hủy/bỏ qua, TypeScript/Vite build đạt. Bộ tập trung map/bundle đạt
32/32, gồm snapshot SQL và lọc ACTIVE/READY/phiên bản.

HTTP trên database UUID thử riêng đạt 185 bước: ONLINE và CASH sáu số,
15 bundle, 150 WAV có xác thực; từ chối bundle/audio không có quyền, mã
đã dùng, mã ONLINE còn PENDING và dùng lẫn token nội bộ/khách.
Trình duyệt xác nhận xem trước → bấm nghe → ONLINE → nhận quyền → phát
WAV hết bài. Nền bản đồ OSM có lỗi tải tile trong môi trường kiểm thử;
marker/danh sách và thông báo lỗi vẫn hoạt động. Chưa nghiệm thu GPS thực
địa, iOS/Android thật hoặc chất lượng giọng/bản dịch bởi người bản ngữ.

Các kết quả này là bản làm việc local, chưa phải kết quả CI/CD của commit
mới; chưa commit/push, chưa cập nhật Render/Aiven.
