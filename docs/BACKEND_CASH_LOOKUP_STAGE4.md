# Mốc 4 — Nhân viên tra cứu phiên tiền mặt

## Nguồn và phạm vi đã đọc lại

Nguồn yêu cầu chính: `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên, tại thư mục cha của repo. Đọc lại ngày 19/10/2026: mục 1.6.2; US-A01 AC2–AC3, US-A03 AC1–AC4, US-F01 AC4, US-F02 AC3; đặc tả đầy đủ UC-02 và UC-11; QT-01–05, QT-12–14; NFR-07/08/13/14/18; kiến trúc 4.2–4.3; bảng và ràng buộc VISIT_SESSIONS, PAYMENTS, AUDIT_LOGS trong 4.4.4.

Mốc này chỉ hiện thực UC-11 bước 2–4: xác thực nhân viên và tra cứu bằng session_id khách cung cấp. Chưa xác nhận nhận tiền, kích hoạt phiên, sinh auth_code/shorted_code, đổi token hoặc thay đổi frontend. **US-A03 AC2–AC4 chưa hoàn thành.** US-A02 AC1 vẫn chưa đáp ứng.

UC-11 A2 yêu cầu hiển thị trạng thái đã xác nhận để tránh thu tiền lại. Vì vậy API đọc được trạng thái hiện tại của phiên CASH, bao gồm PAID; không chỉ tìm phiên PENDING. FAILED hoặc REVOKED cũng chỉ được trả về để đối chiếu, không có nghĩa là được phép xác nhận hoặc cấp lại quyền.

Giả định vé 24 giờ tại 1.6.2 không được áp dụng trong mốc chỉ đọc này. Trước mốc kích hoạt phải chốt cấu hình thời hạn theo quy trình, không tự xem giả định là yêu cầu đã duyệt.

## API

`GET /api/admin/payments/sessions/:sessionId`

Yêu cầu access token nội bộ STAFF hoặc ADMIN. sessionId là UUID v4 đã được backend cấp; chấp nhận chữ hoa và chuẩn hóa về chữ thường. Không có API liệt kê, tìm gần đúng hoặc lựa chọn phiên ngẫu nhiên.

Phản hồi thành công có `Cache-Control: no-store`, cấu trúc `{data: ...}` với đúng bảy trường:

```text
sessionId, paymentRef, paymentMethod, amount, currency, sessionStatus, paymentStatus
```

`amount` là chuỗi thập phân lấy từ payment đã lưu, không tính lại theo giá cấu hình hiện tại. `paymentMethod` chỉ là CASH trong phản hồi thành công. Không trả ID người tạo/xác nhận, hash token, hash khóa yêu cầu, mã ngắn, auth_code hoặc token.

Thiếu/sai/hết hạn token hoặc phiên nội bộ đã logout bị từ chối 401. Tài khoản bị quản trị khóa trả 403 theo AuthService hiện có. Khóa đăng nhập tạm thời vẫn theo cơ chế 423 hiện có. Tài khoản có vai trò ngoài danh sách STAFF/ADMIN không được coi là danh tính nội bộ hợp lệ; AuthService từ chối 401. Kiểm tra quyền phòng vệ tại Service từ chối actor không có quyền với 403. Không sửa cơ chế xác thực đã có.

sessionId sai định dạng: 400 `INVALID_SESSION_ID`; không tìm thấy: 404 `VISIT_SESSION_NOT_FOUND`; phiên thanh toán ONLINE: 409 `CASH_PAYMENT_REQUIRED`. Lỗi hệ thống được xử lý tập trung, không trả SQL, stack trace hoặc thông tin bí mật.

Router gọi PaymentService; Service kiểm tra đầu vào, quyền và phương thức CASH; PaymentStore truy vấn tham số hóa. Store dùng transaction để đọc và khóa tài khoản hiện tại, kiểm tra lại quyền trước khi đọc chi tiết payment. Không cập nhật payment/session, không tạo audit cho thao tác đọc. Không gọi Redis hoặc dịch vụ ngoài. API này không phụ thuộc cấu hình giá mới.

Tra cứu công khai `GET /api/payments/sessions/:sessionId` giữ nguyên ba trường tối thiểu và giới hạn Redis của mốc 3. Khách không được dùng endpoint nội bộ để xem chi tiết payment. Kết quả tra cứu chỉ là ảnh chụp trạng thái tại lúc đọc; bước xác nhận sau này vẫn phải kiểm tra lại quyền và trạng thái trong transaction riêng, không tin kết quả tra cứu cũ.

## Thay đổi

- `backend/routers/payment.router.js`: thêm GET trên router nhân viên đã được bảo vệ.
- `backend/services/payment.service.js`: thêm lookupCash, lọc trường đầu ra và kiểm tra CASH; điều chỉnh thông báo quyền dùng chung cho cả tạo và đọc.
- `backend/stores/payment.store.js`: thêm lookupForStaff, kiểm tra lại tài khoản trong transaction rồi đọc đúng sessionId.
- `backend/tests/cash-lookup.test.js`: 5 ca Service/HTTP, có JWT thật và Store thay thế.
- `backend/tests/payment.integration.test.js`: thêm 4 ca SQL, gồm tra cứu đồng thời và đối chiếu dữ liệu trước/sau.
- `backend/tests/payment.test.js`: đồng bộ thời điểm ký token thử nghiệm với đồng hồ AuthService fixture để ca hết hạn không phụ thuộc tốc độ máy.

Không đổi schema, không có migration mới; không sửa migration đã push, Word, slide hoặc frontend.

## Đối chiếu yêu cầu

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| UC-11 bước 2–4, E1 | Đã kiểm chứng backend của bước tra cứu | `cash lookup returns only reconciliation fields`; `cash lookup HTTP requires real internal JWT` | Chưa có giao diện; chưa phải hoàn thành toàn bộ UC-11. |
| UC-11 E2, phần session sai/không thấy/sai phương thức | Đã kiểm chứng phần tra cứu | `cash lookup rechecks actor from Store`; integration `staff lookup rejects ONLINE, missing sessions and stale locked/deleted actor identities` | Chưa triển khai điều kiện cho phép xác nhận tiền. |
| UC-11 A2 | Đã kiểm chứng việc hiển thị trạng thái | `cash lookup preserves already-paid, failed and revoked states`; integration `staff cash lookup displays seeded PAID/FAILED/REVOKED states` | Trạng thái PAID/FAILED/REVOKED được gieo bằng SQL trong test, không phải chức năng chuyển trạng thái đã làm. |
| US-F01 AC4; QT-01, phần quyền QT-12 | Đã kiểm chứng trong endpoint mới | HTTP JWT thật: sai chữ ký, hết hạn, loại visitor, logout, tài khoản khóa; SQL recheck tài khoản | Store xác thực của HTTP test là bản thay thế; SQL recheck tài khoản dùng database thật. |
| US-A01 AC2–AC3; QT-02, phần số tiền | Giữ đúng số tiền và mã tham chiếu đã lưu | integration `staff lookup reads guest CASH and other staff CASH with saved prices, without Redis or current price` | Không lấy giá cấu hình mới để đổi giá yêu cầu cũ; không triển khai webhook. |
| US-A03 AC2–AC4; US-F02 AC3 phần xác nhận tiền | **Chưa hoàn thành** | Không có test xác nhận tiền/mã/token trong mốc này | Tra cứu chỉ hỗ trợ đối chiếu; chưa cập nhật PAID/ACTIVE hoặc audit xác nhận. |
| QT-03/05/13/14 | Giữ dữ liệu và trạng thái khi đọc | integration `concurrent staff cash lookups are read-only`; `staff cash lookup displays seeded...` | Chưa xác nhận lặp hoặc tính hạn vé; không ghi thêm doanh thu. |
| NFR-07 | Giữ nguyên bảo vệ tra cứu công khai | Bộ test payment/Redis cũ vẫn chạy phần local có thể chạy | Endpoint nội bộ dùng xác thực; không thay giới hạn công khai. Ba ca Redis thật không chạy lại tại máy này. |
| NFR-08 | Đã kiểm chứng phần đầu vào/đầu ra mới | `cash lookup rejects invalid/currently unauthorized actors and malformed identifiers`; HTTP safe 500; whitelist bảy trường | SQL tham số hóa; không trả hash/mã/token; chưa thử giao diện hoặc XSS trình duyệt. |
| NFR-13 | Đã kiểm chứng cấu trúc thay đổi | Lint 53 tệp JS và Service test với Store thay thế | Router không SQL/Redis, Service không gọi driver. Không có dịch vụ ngoài cần adapter trong mốc này. |
| NFR-14 | Local đạt; CI mới chưa chạy | Toàn bộ 136 test local | CI của commit c0052b7 là bằng chứng mốc 3, không dùng làm kết quả của thay đổi mốc 4. |
| NFR-18 | Đã kiểm chứng dữ liệu không đổi trên MariaDB | SQL snapshot PAYMENTS/VISIT_SESSIONS và đếm audit trước/sau, 12 tra cứu đồng thời | Không có migration. MySQL 8 cho thay đổi mới chưa kiểm chứng trên CI. |

## Kết quả kiểm thử

Toàn bộ **136 test đạt, 0 lỗi**, gồm **41 ca SQL integration** trên MariaDB 10.4.32, không chạm database nghiệp vụ. Có 9 test mới: 5 Service/HTTP và 4 SQL. Test JWT dùng chữ ký thật và đồng hồ fixture thống nhất. Những lần chạy trước phát hiện kỳ vọng test sai về đồng hồ và vai trò không thuộc danh sách tài khoản nội bộ; đã chỉnh test, không thay cơ chế xác thực sản phẩm.

Nhóm 3 test Redis thật chưa chạy lại tại máy này vì không có Redis hoạt động. Runner bỏ qua cả suite nên dòng tổng `skipped 0` không chứng minh đã chạy Redis thật. Mốc 4 không thêm thao tác Redis. CI MySQL 8/Redis 7 của thay đổi mới chưa chạy vì chưa commit/push.

Log local: `C:\Users\Admin\AppData\Local\Temp\tcv-cash-lookup-59b655ba88ce432f8ecca18f1b003f8e\all-tests.log`.

Không đo hiệu năng; 12 lượt đồng thời chỉ kiểm tra tính không thay đổi dữ liệu, không phải kết quả kiểm thử tải. Chưa commit/push. Không chuyển sang mốc tiếp theo trước khi push theo yêu cầu và CI xanh.

## Đoạn báo cáo có thể ghi nhận sau khi duyệt

UC-11 bước 2–4/A2/E1/E2: bổ sung đường dẫn API, bảy trường phản hồi, số tiền lấy từ payment đã lưu, trạng thái đã xác nhận chỉ để đối chiếu và giới hạn phạm vi mới làm đến bước đọc. Mục 4.2–4.3 ghi nhận PaymentService/PaymentStore kiểm tra quyền và đọc phiên CASH. Phần hiện trạng và kiểm thử cập nhật 136 test local cùng giới hạn MariaDB/CI nêu trên.

Không cần đổi mục 4.4.4 hoặc ERD vì mốc này không thay schema. Không đánh dấu US-A03 AC2–AC4 hay toàn bộ UC-11 là hoàn thành.

Nguồn và độ tin cậy: báo cáo Word (8) đọc lại trực tiếp, code và test local trong repo; MySQL 8/CI của mốc mới chưa xác nhận. Báo cáo Word và frontend giữ nguyên.
