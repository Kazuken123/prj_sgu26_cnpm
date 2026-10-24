# Hợp nhất main ngày 24/10/2026

Giữ commit `2a067d2` của mốc 10 POI/15 ngôn ngữ/150 audio, bản đồ xem trước, tọa độ V1 có nhãn, lộ trình tại client và payment ONLINE+CASH sáu số.

Theo chỉ đạo tiếp theo của chủ dự án: không tiếp tục sửa các nghiệp vụ độc lập do thành viên khác thêm; chỉ sửa chỗ giao nhau làm ảnh hưởng luồng đang hoàn tất. Hợp nhất lịch sử với `1ea1eb6`, không force-push/reset/stash.

## Chỗ giao nhau đã xử lý

- Giữ PaymentPage/API thanh toán có cả ONLINE/MockGateway và CASH, không vô hiệu token ONLINE đã cấp.
- Giữ public map, bundle/audio có xác thực, OSM fallback, lộ trình tùy chỉnh, giả lập vị trí có nhãn và dữ liệu đã chốt. Không nối GPS heartbeat vào luồng Explore của mốc này.
- Giữ monitoring hiển thị phiên trả phí còn hiệu lực và tổng ONLINE+CASH; không thay bằng thống kê GPS hoặc sổ tiền mặt.
- Giữ giao diện quầy/menu/CSS admin mới nếu dùng được API sẵn có. Đăng nhập về quầy; điều hướng tổng quan của ADMIN dùng monitoring đã có, STAFF dùng quầy.
- Lọc audit theo ngày Việt Nam, gửi UTC đến giây cho API hiện có; test hợp đồng được cập nhật theo đúng nhãn giao diện.

## Phần giữ riêng cho thành viên phụ trách

Source operations/analytics, migration007, các API và trang độc lập vẫn được giữ trong lịch sử và repo. Không chạy migration007 lên Aiven trong mốc này, không xóa bảng/dữ liệu. Không coi CI hoặc test local của phần đó là xác nhận nghiệp vụ đã được chủ dự án nghiệm thu. Hạn chế triển khai/schema/quyền của phần này đã ghi trong hồ sơ rà soát ngoài repo và cần thành viên phụ trách xử lý riêng.

## Kiểm chứng

Frontend bản kết hợp:129/129,0fail/cancel/skip;TypeScript/Vitebuildđạt. HTTP trên databaseUUIDthử:185/185,15bundle/150WAV có xác thực và các ca từ chối. Hai suite SQL của phần độc lập cần localhost đã chạy riêng2/2 trên networknamespace của MySQLthử, không bỏ qua test; toàn bộ các suite backend còn lại chạy riêng theo cấu hình thử. Chi tiết số cuối và CI được lưu ngoài repo tại `C:/Users/Admin/Documents/Codex/TCV_PUSH_20261024/`.

Không cài/test trong OneDrive; MySQL8.4+Valkey8 Redis-compatible ở stackthử riêng. Không sửa Word. Bộ15ngônngữ/tọađộ chỉ được đưa vào Aiven sau khi image chứa150audio đã deploy và được xác minh.
