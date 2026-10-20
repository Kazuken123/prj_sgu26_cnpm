# Mốc 10 — Xác minh webhook và ghi nhận thanh toán ONLINE mô phỏng

## Nguồn, quyết định và phạm vi

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx`: US-A01 AC2–AC3, US-A02 AC1–AC4; UC-01 đầy đủ, mốc này làm bước 4–5/A2/E2–E3; QT-02/03/05/12/13/14; NFR-05/08/11/13/18; giả định 1.6.2, kiến trúc 4.2–4.3 và schema/ràng buộc VISIT_SESSIONS/PAYMENTS/AUDIT_LOGS tại 4.4.4.

Điểm chưa rõ đã hỏi và được người dùng chốt: **FAILED được chuyển sang PAID nếu nhận SUCCESS hợp lệ đến muộn**, cùng payment và phiên cũ; PAID không bao giờ bị hạ về FAILED. Vé được kích hoạt một lần tại thời điểm backend xác nhận SUCCESS đầu tiên, dùng cấu hình thời hạn hiện có. Kết quả lặp không đổi paid_at/activated_at/expires_at. Đây là quyết định người dùng chấp nhận, không tự coi là yêu cầu đã được giảng viên duyệt.

Người dùng cho phép commit local nếu cần và muốn push chung phần ONLINE sau. Vì vậy mốc 9 đã commit local `1d6447e` sau 245 test đạt; tiếp tục mốc 10 với kiểm thử local theo yêu cầu mới, **chưa có CI cho cả hai mốc**. Các ghi chú trước đây yêu cầu push/CI trước mỗi mốc được áp dụng lại khi không có chỉ dẫn khác; không dùng kết quả CI tại 64523ce để chứng minh code ONLINE mới.

Phạm vi: MockGateway hỗ trợ tạo/xác minh thông báo thử SUCCESS/FAILED bằng chữ ký; backend ghi nhận kết quả và audit nguyên tử, có công cụ mock phía server để demo. Không Payoo thật, không frontend, không migration, không thêm cột/bảng, không sửa Word. **Chưa làm US-A02 AC4: đổi auth_code ONLINE lấy token.** Không làm cấp lại token Could Have.

## Giao thức mock và bảo vệ

`POST /api/payments/webhooks/mock`, Content-Type application/json, header `X-Mock-Signature: sha256=<64 ký tự hex>`.

JSON chỉ gồm paymentRef (UUID v4 đã tạo), amount (chuỗi số thập phân dương tối đa DECIMAL(12,2)), currency VND và status SUCCESS hoặc FAILED. Không nhận sessionId, thời hạn vé, token hoặc thuộc tính thừa. Adapter xác minh chữ ký trên đúng byte JSON nhận được bằng HMAC-SHA256 với MOCK_WEBHOOK_SECRET; so sánh timingSafeEqual sau kiểm tra chiều dài/định dạng. Chỉ sau khi chữ ký đúng mới parse/chuẩn hóa thông báo. Amount được chuẩn hóa thành hai chữ số thập phân, không dùng số tiền từ thông báo để tự chọn giá.

Route đọc raw JSON trước parser JSON thông thường. Body tối đa 32 KB; JSON thay đổi khoảng trắng nhưng giữ chữ ký cũ bị từ chối. Body nén bị từ chối 415 để không biến đổi dữ liệu trước khi xác minh; JSON không hợp lệ 400, payload quá lớn 413. Không có chữ ký/giả chữ ký 401. JWT nhân viên hay token khách không thay thế được chữ ký webhook. Phản hồi webhook no-store, không có token hoặc secret.

MOCK_WEBHOOK_SECRET phải được cấu hình riêng, ít nhất 32 byte, tối đa 1024 byte; không có khóa mặc định và không fallback sang JWT_SECRET. Chỉ bật khi PAYMENT_GATEWAY=mock và public origin hợp lệ. Giá trị trong env ví dụ để trống; không ghi khóa thật, chữ ký hoặc raw body vào audit/log/phản hồi lỗi.

Đây là **giao thức mock tự định nghĩa**, không phải thuật toán chữ ký Payoo hoặc bằng chứng tiền thật. Không thêm cửa sổ từ chối webhook theo hạn authCode: báo cáo yêu cầu ghi nhận kết quả hợp lệ đến muộn. Replay được kiểm soát bằng trạng thái/khóa SQL theo payment_ref; không tuyên bố chữ ký có timestamp hay chống mọi hình thức tấn công. Không có API công khai sinh chữ ký cho khách.

## Xử lý tại ba lớp

Router lấy raw body/chữ ký và gọi PaymentService. Helper `online-webhook.js` thuộc lớp Service, gọi adapter xác minh, kiểm tra điều kiện nghiệp vụ rồi dùng PaymentStore; không truy cập driver hoặc Redis.

Store khóa payment bằng payment_ref rồi khóa cặp payment/visit theo thứ tự phù hợp luồng checkout hiện có. Backend đối chiếu chính paymentRef, ONLINE, số tiền và tiền tệ đã lưu; yêu cầu có dấu chuẩn bị checkout qua gateway trong audit PREPARE_ONLINE_CHECKOUT. Chỉ một ONLINE/PENDING đã tạo qua API cũ mà chưa bắt đầu checkout không được tự kích hoạt bằng mock notification.

Các chuyển trạng thái:

- PENDING + FAILED hợp lệ → payment FAILED; visit vẫn PENDING, không có hạn vé/token. Ghi FAIL_ONLINE_PAYMENT cùng transaction. FAILED lặp không ghi thêm audit.
- PENDING hoặc FAILED + SUCCESS hợp lệ → PAID và paid_at; chính visit chuyển ACTIVE, activated_at bằng paid_at, expires_at bằng thời gian đó cộng thời hạn vé cấu hình (mặc định 24 giờ). confirmed_by vẫn NULL vì không phải nhân viên xác nhận tiền mặt. Ghi CONFIRM_ONLINE_PAYMENT cùng transaction.
- PAID + SUCCESS/FAILED hợp lệ → giữ nguyên tiền, phiên và audit; trả duplicate=true. Visit đã REVOKED không được kích hoạt lại, visit đã hết hạn không được gia hạn. Thông tin payment/session không nhất quán bị từ chối để đối soát.

Mỗi cập nhật payment/visit/audit phải commit cùng nhau. Lỗi payment, lỗi visit hoặc audit rollback toàn bộ lần cập nhật. Nếu mất xác nhận commit, trả 503 an toàn; gửi lại cùng webhook sẽ đọc trạng thái đã lưu và không kích hoạt lần hai. SQL dùng thời gian UTC server sau khi lấy khóa. Không nhận paid_at/expires_at từ body hoặc tính lại hạn vé theo mỗi lần gửi lặp.

Webhook **không đọc/ghi Redis** và không cấp token/mã mới. Vì vậy mã online hết TTL, Redis mất mã hoặc Redis lỗi không làm mất kết quả thanh toán đã được xác minh. Tình huống đã PAID nhưng mã không còn dùng được giữ nguyên để đối soát; không tự sinh mã hoặc yêu cầu trả tiền lại. Không coi webhook PAID là đã hoàn tất nhận token.

Response 200 gồm accepted, paymentRef, paymentStatus, sessionStatus, duplicate. Không có khoản tiền/phiên mới được tạo từ callback. Không tìm thấy ref trả 404; CASH, tiền không khớp, chưa có chuẩn bị checkout hoặc trạng thái không nhất quán trả 409; lỗi xác minh cấu hình hoặc lưu SQL chưa rõ trả 503. Việc thống kê doanh thu sau này phải dựa payment PAID, không đếm số callback hoặc số audit kết quả.

## Công cụ demo phía server

Trong backend, với mock config/secret đã chuẩn bị và paymentRef thực từ phần khởi tạo:

```text
npm run mock:payment -- <paymentRef> SUCCESS
npm run mock:payment -- <paymentRef> FAILED
```

Công cụ kiểm tra mode mock, đọc summary từ URL mock đã cấu hình, lấy giá/tiền tệ, tạo chữ ký trong adapter và POST raw JSON tới webhook. Mỗi HTTP request có timeout 3 giây. Chỉ in HTTP status, paymentRef, paymentStatus và duplicate; không in khóa/chữ ký/raw body/authCode. Đây là công cụ của người vận hành demo tại server, không đưa khóa ký vào frontend hoặc expose endpoint sinh chữ ký.

Demo: tạo checkout online → thử FAILED (không có quyền) → thử SUCCESS (FAILED → PAID, cùng phiên) → gửi lại SUCCESS/FAILED (PAID không đổi). Mở URL hoặc tự thêm result=SUCCESS/FAILED vẫn chỉ xem JSON, không xác nhận thanh toán. **Chưa demo nhận token online hoặc dùng authCode truy cập /api/visits/me**; authCode không phải token khách.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A02 AC1, phần mock thử thành công/thất bại | Có adapter và công cụ demo server; local đạt | online-webhook.test: HTTP/operator...; SQL HTTP/operator FAILED then SUCCESS | Checkout/mã TTL đã có ở mốc 9. Không có UI hoặc Payoo thật. |
| US-A02 AC2; QT-02; UC-01 E2 | Local kiểm chứng chữ ký, ref và tiền trước cập nhật | exact-byte HMAC; validly signed malformed...; SQL invalid signature/money/unknown/CASH... | Không chấp nhận redirect, JWT hay URL GET thay webhook. |
| US-A02 AC3; QT-03; NFR-05 phần callback | Local đạt gửi lặp/đồng thời | 20 concurrent mixed callbacks; SQL 20 from two Stores; PAID absorbs repeat/old events | Không tạo payment/visit mới, audit CONFIRM đúng một lần. Chưa coi phần đổi mã ONLINE của NFR-05 đã làm. |
| Quyết định FAILED → PAID khi SUCCESS hợp lệ đến muộn | Local đạt | unit FAILED then late SUCCESS; SQL repeated FAILED then SUCCESS | Có audit previousStatus FAILED, giữ payment/visit cũ. |
| QT-05/13; UC-01 bước 5 | Local đạt | SQL paidAt/activatedAt/24 giờ/confirmed_by NULL; duplicate snapshots; revoked/expired visits | Thời hạn do cấu hình đã chốt, không có frontend dừng tại hạn. |
| QT-14 và 4.4.2, kết quả đến muộn/Redis độc lập | Local đạt | expired checkout then valid late notify; Redis outage/missing mapping; SQL retains PAID | Không tạo mã thay thế hoặc token khi mã hết hạn/mất. |
| NFR-18, transaction/audit đối soát | Local đạt | SQL trigger failures on PAYMENTS/VISIT_SESSIONS/AUDIT_LOGS; lost commit acknowledgement | Database tạm; không sửa migration hoặc dữ liệu nghiệp vụ. |
| NFR-08 | Phần API mới đạt local | HMAC malformed/tampered payload; raw JSON whitespace; compression 415/size 413; safe errors/audit | MOCK_WEBHOOK_SECRET riêng, không log chữ ký/secret hoặc token; chưa kiểm thử trình duyệt. |
| NFR-13 | Lint và kiểm thử local đạt | kiểm tra 78 file JS; Service/adapter thay thế; Store SQL thật | Raw-body parser và Router không chứa SQL/quyết định tiền. |
| NFR-11, phần công cụ/adapter mock | Có timeout HTTP và kiểm soát lỗi | operator helper qua HTTP; các ca gateway/Redis timeout mốc 9 hồi quy | Xác minh HMAC thực hiện tại chỗ, không gọi dịch vụ thật. |
| US-A02 AC4; US-A04 phần sử dụng token ONLINE | Chưa triển khai | Chưa có endpoint đổi authCode ONLINE | Phần kế tiếp; không dùng endpoint CASH để né kiểm tra phương thức. |

## Kiểm chứng và trạng thái Git

**265 test local đạt, 0 lỗi**, lint/cú pháp/phân lớp **78 file JavaScript đạt**. Có 20 test mới trong mốc này: 12 ca cấu hình/adapter/Service/HTTP và 8 ca SQL/HTTP tích hợp; một ca hết TTL của mốc 9 được mở rộng kiểm tra webhook hợp lệ đến muộn. Các test CASH/auth/POI và checkout mốc 9 vẫn được chạy hồi quy.

SQL local là **MariaDB 10.4.32**, Redis thay thế ở phần tạo checkout. Webhook không phụ thuộc Redis; 20 ca SQL trong suite ONLINE sẽ dùng Redis thật cho setup nếu CI bật RUN_REDIS_TESTS=1. **13 ca Redis thật trong các suite riêng chưa bật local**; skipped=0 không có nghĩa tất cả suite đó đã chạy. Chưa xác minh MySQL 8, Redis 7, CI hoặc release smoke cho code ONLINE mới.

Log local: `C:\Users\Admin\AppData\Local\Temp\tcv-webhook-full-24bd566d99924934874851f2e996b2d9\all-tests.log`.

Không push theo yêu cầu người dùng; có thể commit local từng mốc sau kiểm thử để push chung sau. Các dòng chưa commit trong tài liệu mốc trước là trạng thái trước khi chốt commit; xem git log/bàn giao mới để biết trạng thái cuối.

## Word cần cập nhật sau khi duyệt

- UC-01 A2/E3, QT-14: ghi rõ quy tắc FAILED → PAID đã chốt; PAID hấp thụ sự kiện cũ/lặp và giữ hạn vé.
- Mục 4.2–4.3: raw webhook bytes, MockGateway ký/xác minh, transaction payment/visit/audit và phân tách redirect/URL với callback. Ghi rõ đây là mock protocol, chưa Payoo.
- Mục 4.4.4 AUDIT_LOGS: ý nghĩa CONFIRM_ONLINE_PAYMENT/FAIL_ONLINE_PAYMENT, người thực hiện NULL; không thêm schema/ERD.
- Hiện trạng US-A02 AC1–AC4 và phần kiểm thử: webhook có code, đổi mã ONLINE chưa có; local MariaDB/Redis thay thế, chưa CI mới. Word chưa sửa.

Nguồn và độ tin cậy: Word 8 đọc lại, lựa chọn trực tiếp của người dùng về FAILED → PAID và code/265 test local; giới hạn mock/MariaDB/Redis thật/CI mới nêu rõ phía trên.
