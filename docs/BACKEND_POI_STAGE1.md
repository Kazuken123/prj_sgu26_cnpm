# Backend Thảo Cầm Viên — bước 1: quản trị POI

Mốc nguồn: báo cáo Word 8, US-F02/AC1–AC3 (phần POI), US-C02/AC1 và AC4 (phần ghi nhận tác vụ), UC-13 bước 2–6, A1/A4, E1–E3 và §4.4.4g. Bản sao code dựa trên GitHub `6a22d26` và bản sửa logout trước đó. Chưa commit/push.

## Quy tắc đã triển khai

1. API nội bộ yêu cầu access token STAFF/ADMIN. Máy chủ xác thực phiên và quyền hiện tại. Trước ghi, Store khóa và đọc lại tài khoản trong giao dịch; Service xác nhận quyền lần nữa.
2. Tạo/sửa POI lưu cấu hình, nguồn vi, tác vụ cần thiết và audit trong cùng giao dịch. Lỗi bất kỳ khâu nào rollback toàn bộ.
3. Tên gốc tại POIS và tên vi tại POI_TRANSLATIONS được ghi đồng thời. Nguồn vi có status READY; điều đó chỉ nói văn bản nguồn sẵn sàng, chưa phải audio đã có.
4. Đổi name/description/audioScript tăng contentVersion khi cập nhật; tạo tác vụ PENDING theo từng LANGUAGES.is_active = 1 (bao gồm vi để tạo audio, không dịch lại vi ở worker tương lai). Cặp POI/ngôn ngữ/phiên bản không bị tạo trùng.
5. Chỉ đổi metadata, tọa độ, bán kính, ảnh, thứ tự hoặc trạng thái không tăng phiên bản nguồn hay tạo lại audio. Nếu muốn thông tin bảo tồn/khung giờ xuất hiện trong bài đọc, nhân viên phải sửa nội dung nguồn tương ứng; metadata không tự chèn vào kịch bản.
6. Ngừng POI là đổi INACTIVE và audit, không xóa nội dung/tour/tác vụ. Lặp thao tác ngừng không ghi thêm thay đổi. Việc loại khỏi bundle/tour khách sẽ được kiểm chứng khi triển khai bundle; chưa có API khách trong đợt này.
7. PUT yêu cầu expectedVersion là phiên bản nguồn đã đọc. Hai sửa nguồn đồng thời cùng bản cũ: chỉ lần đầu thành công, lần sau 409. Đây là khóa lạc quan cho phiên bản nội dung, không tuyên bố phát hiện mọi xung đột metadata (metadata không tăng contentVersion).

## API cho frontend nối sau

Mọi API dùng `Authorization: Bearer <access token nội bộ>`. Phản hồi thành công có `{data: ...}`. Lỗi theo chuẩn `{code, error}`. Địa điểm minh họa trong ví dụ không phải tọa độ/kiến thức thực địa đã kiểm chứng.

- `GET /api/admin/pois?page=1&limit=20&category=PLANT&status=ACTIVE`: danh sách; trả items, total, page, limit. Category/status là bộ lọc tùy chọn; limit tối đa 100. Tên "phân loại" ở đây là bốn nhóm ANIMAL/PLANT/HERITAGE/AMENITY, chưa thêm mô hình khu địa lý riêng.
- `GET /api/admin/pois/:id`: chi tiết nguồn tiếng Việt.
- `POST /api/admin/pois`: tạo; 201, mặc định INACTIVE, bán kính 30 m và contentVersion 1. category mặc định ANIMAL nếu bỏ trống khi tạo; nên truyền rõ loại để tránh phân loại nhầm. Trả processing=PENDING khi đã ghi nhận tác vụ, không nói tác vụ đã hoàn tất.
- `PUT /api/admin/pois/:id`: thay thế dữ liệu chỉnh sửa đầy đủ, không phải PATCH; phải gửi category và expectedVersion. Không gửi lại response nguyên khối vì các trường poiId/contentVersion/processing không phải trường ghi.
- `POST /api/admin/pois/:id/deactivate`: ngừng sử dụng; không có DELETE vật lý.

Ví dụ body tạo:

```json
{
  "name": "Điểm thực vật minh họa",
  "category": "PLANT",
  "conservationStatus": null,
  "activityHours": null,
  "latitude": 10.78,
  "longitude": 106.70,
  "triggerRadius": 30,
  "avatarUrl": null,
  "displayOrder": 0,
  "status": "INACTIVE",
  "description": "Nội dung thử nghiệm; cần thay bằng dữ liệu có nguồn.",
  "audioScript": "Kịch bản đọc thử nghiệm."
}
```

Khi PUT, dùng cùng cấu trúc và thêm `"expectedVersion": 1` (hoặc phiên bản vừa đọc). Bỏ trường tùy chọn trong PUT sẽ đưa về default/null, không giữ giá trị cũ. name/description/audioScript không rỗng; tọa độ phải là số hợp lệ; bán kính số nguyên dương; ảnh là http/https hoặc đường dẫn / nội bộ, không chứa tài khoản trong URL. Hai trường văn bản dài giới hạn 6000 ký tự mỗi trường; tổng request chịu giới hạn 32 KB hiện có. Đây là giới hạn triển khai cần ghi rõ khi nghiệm thu.

Mã lỗi: 400 VALIDATION_ERROR; 401 xác thực; 403 FORBIDDEN; 404 POI_NOT_FOUND; 409 POI_VERSION_CONFLICT; lỗi dữ liệu bất thường 500 INTERNAL_ERROR (không trả SQL/secret).

## Migration và giới hạn báo cáo

Chạy `npm run db:migrate` trước khi dùng code mới với database đã có schema 16 bảng. Migration 003 thêm ba cột POI và default 30 m; không xóa dữ liệu, không thay 50 m đã lưu thành 30 m. Dữ liệu cũ chưa phân loại giữ NULL. Cột category nullable là ngoại lệ có chủ đích so với default NOT NULL diễn giải từ bảng lỗi định dạng của Word 8; API mới chỉ ghi loại hợp lệ. Không tự điền dữ liệu bảo tồn hoặc giờ cho thú ăn chưa có nguồn.

`/health/ready` kiểm tra cột/bảng đã cần cho auth và POI để phát hiện migration thiếu. Redis chưa thuộc phụ thuộc của chức năng đã triển khai này; khi thêm thanh toán, readiness phải mở rộng tương ứng.

Trong backend giữ JWT issuer/audience và tên database mặc định cũ vì chúng là định danh tương thích của phiên/cấu hình. Không đổi đại trà để rồi làm token hoặc volume cũ không dùng được. Server root và README đã dùng tên Thảo Cầm Viên. Frontend và sơ đồ cũ không chỉnh trong đợt này.

## Phần chưa hoàn thành

Chưa có worker dịch/TTS, API xem/retry tác vụ (UC-13 A2/A3 và bước 7–8 chỉ mới có bản ghi PENDING), bundle, thanh toán khách, Redis, RAG, tour quản trị hoặc API thống kê. Không coi UC-13 toàn bộ đã hoàn thành. Chưa thêm POI thực địa, chưa công bố đủ 15 hay 15+ ngôn ngữ. Bản sửa logout kế thừa đã được xác nhận thêm bằng các ca tích hợp MySQL trong lượt cuối; chưa kiểm CI/staging của bản mới.

## Kiểm thử

- `npm run lint`, `npm test`: kiểm cú pháp/chia lớp, auth cũ và POI mới, HTTP, rollback với executor giả. Lượt cuối đã bật RUN_DB_TESTS=1: **83 test đạt, 0 lỗi**, gồm cả 15 ca tích hợp trên MySQL localhost bằng database tạm riêng. Kiểm tra chia lớp/cú pháp đạt với 37 file backend. Log nằm ngoài repo tại `work/tcv-backend-mysql-all.txt` trong workspace rà soát.
- Có MySQL thử nghiệm: bật RUN_DB_TESTS=1 rồi chạy `npm run test:integration`; cả auth và POI dùng database tạm riêng, lỗi kết nối phải là lỗi test. Chưa được biến kết quả này thành đã chạy nếu máy không có MySQL.
- `poi.integration.test.js` kiểm migration chạy lại và bảo toàn bán kính/phân loại cũ, hai cập nhật nguồn đồng thời, nguồn vi đồng bộ, audit rollback, soft deactivate và quyền tài khoản bị khóa. Bốn ca này đã đạt trên MySQL thật. Các ca auth tích hợp, gồm logout bằng hash cũ qua runtime mới và refresh/logout đồng thời, cũng đã đạt trong cùng lượt cuối. Chưa chạy GitHub Actions cho bản sửa vì chưa push.

Bước tiếp theo là review hợp đồng API/migration của mốc nhỏ này rồi nối API trạng thái tác vụ/worker hoặc luồng khách đã thống nhất. Không cần sửa frontend hay báo cáo để che phần chưa code.
