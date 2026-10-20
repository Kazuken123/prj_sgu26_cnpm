# Mốc 9 — Khởi tạo ONLINE/PENDING qua MockGateway

## Nguồn và phạm vi

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx` (Thảo Cầm Viên): US-A01 AC2–AC3, US-A02 AC1–AC4; UC-01 đầy đủ (mốc này làm bước 2/E1); QT-02/03/04/13/14; NFR-05/08/11/13/18; giả định 1.6.2, thiết kế 4.2–4.3 và bảng/ràng buộc VISIT_SESSIONS/PAYMENTS/AUDIT_LOGS tại 4.4.4. Không dùng bản Chùa Linh Ứng.

Người dùng yêu cầu code từng phần, phần trước phải chắc mới qua phần sau. Phạm vi hiện tại chỉ tạo checkout ONLINE còn PENDING, URL mô phỏng và mã có TTL. **Chưa triển khai webhook, kết quả SUCCESS/FAILED của MockGateway, chữ ký kiểm thử, PAID/ACTIVE cho ONLINE hoặc đổi auth_code ONLINE thành token.** Vì vậy chưa hoàn thành toàn bộ US-A02 AC1 hoặc luồng thanh toán online.

Quyết định: người dùng chốt mã online **15 phút**, cấu hình được, retry khi còn hạn giữ mã/deadline cũ. Sau đó giao chọn phương án thực tế cho mất/hết hạn mã: mã đã phát hành mà mất/hết hạn thì không tự tạo mã hoặc payment thay thế; giữ dữ liệu để đối soát, không yêu cầu thanh toán lại khi đã trả tiền. Không tự áp dụng cơ chế cấp lại mã CASH cho ONLINE. Các con số này là lựa chọn triển khai được người dùng chấp nhận, không tự coi giảng viên đã duyệt.

Không migration, không thêm cột/bảng/chỉ mục, không sửa Word hoặc frontend. Không sửa migration đã push. PaymentService ủy quyền phần khởi tạo cho helper Service `online-checkout.js`; SQL/Redis vẫn ở Store, gateway qua adapter thay thế được. Không triển khai Payoo thật hoặc chức năng Could Have.

## API và dữ liệu

`POST /api/payments/online-checkout`, body bỏ trống hoặc `{}`, header `Idempotency-Key` UUID v4 ngẫu nhiên cho một yêu cầu. Không nhận giá, paymentMethod, callback/return URL, thời hạn, sessionId hoặc authCode từ client. Không cần tài khoản nội bộ. Giữ cùng khóa khi retry; server chỉ lưu SHA-256 của khóa trong PAYMENTS.request_key_hash đã có.

201 khi tạo pending mới, 200 khi dùng yêu cầu đã tồn tại. Body `{data: ...}` gồm đúng: sessionId, paymentRef, paymentMethod ONLINE, amount, currency, paymentStatus PENDING, sessionStatus PENDING, provider MOCK, paymentUrl, authCode, codeExpiresAt. codeExpiresAt là ISO UTC khi trả HTTP. authCode là 32 byte ngẫu nhiên mã hóa hex, không suy ra từ mã phiên/khóa yêu cầu. Phản hồi no-store; không có token khách hoặc hạn vé vì chưa xác nhận thanh toán.

URL mock trỏ tới `GET /api/payments/mock-checkout/:paymentRef` trên public origin đã cấu hình. Hiện endpoint trả JSON với nhãn MOCK/simulationOnly, giá/trạng thái của yêu cầu; không trả sessionId, mã đổi quyền hoặc token. Đây **chưa phải trang HTML hay màn hình chọn kết quả thanh toán**. Thêm `?result=SUCCESS`/`FAILED`, mở hoặc tải lại URL không thay đổi payment/visit và không cấp quyền. Không coi redirect hay GET này là bằng chứng đã trả tiền.

`POST /api/payments` cũ vẫn tạo CASH/ONLINE PENDING theo hợp đồng cũ, không tự trả URL/mã. Một pending ONLINE đã được tạo qua API cũ có thể bắt đầu checkout lần đầu bằng API mới với cùng khóa. CASH hoặc yêu cầu khác không được chuyển thành ONLINE bằng việc dùng lại khóa. API xác nhận/cấp mã/đổi mã tiền mặt và API quyền khách giữ nguyên.

## Cấu hình

```text
PAYMENT_GATEWAY=mock
MOCK_PAYMENT_BASE_URL=http://localhost:3000
ONLINE_CODE_TTL_SECONDS=900
```

Mock chỉ hoạt động khi PAYMENT_GATEWAY được bật rõ là mock. Thiếu biến thì bị tắt; Docker Compose mặc định disabled nếu không cấu hình, còn hai env ví dụ ghi mock cho demo. MOCK_PAYMENT_BASE_URL phải là public origin thực phục vụ backend, chỉ HTTP/HTTPS, không tài khoản/mật khẩu, path riêng, query hoặc fragment. Server không lấy Host/returnUrl từ request để tạo URL thanh toán.

TTL mới chỉ áp dụng lúc tạo lần chuẩn bị đầu tiên. Retry sau khi đổi giá hoặc TTL vẫn dùng giá đã lưu và deadline cũ. Adapter timeout mặc định 2000 ms, không tự retry vô hạn; AbortSignal được truyền cho adapter. RedisStore giữ timeout hiện có. MockGateway không gọi dịch vụ ngoài hoặc tạo giao dịch tiền thật. Hợp đồng adapter: assertConfigured() và createCheckout({paymentRef, amount, currency, expiresAt}, {signal}); cùng paymentRef/deadline không tạo đơn khác.

## Trạng thái và xử lý lỗi

1. Xác minh cấu hình mock/đầu vào rồi tái sử dụng bước khởi tạo SQL hiện có: một PAYMENTS/ONLINE/PENDING gắn một VISIT_SESSIONS/PENDING, giá server. Nếu lỗi khởi tạo sau khi kết quả chưa rõ, retry bằng cùng khóa; không tự đổi khóa tạo giao dịch khác.
2. Store khóa cặp payment/visit theo cùng thứ tự các luồng hiện có, kiểm tra đúng hash yêu cầu. Service yêu cầu cả hai PENDING, chưa paid/activated/expires/token/reissue. Không reset PAID, FAILED, ACTIVE hoặc REVOKED về PENDING.
3. Ghi audit PREPARE_ONLINE_CHECKOUT trước mọi tác động Redis/gateway: resource PAYMENTS/paymentRef, details chỉ sessionId, issueId ngẫu nhiên và deadline tuyệt đối. Đây là mốc chuẩn bị không chứa bí mật, được giữ để lần retry không bắt đầu lại 15 phút. Không dùng audit để lưu hoặc khôi phục authCode.
4. Sau khi mốc chuẩn bị commit, khóa lại cặp payment/visit. RedisStore dùng một Lua với key `tcv:online-code:v1:<sessionId>`, Redis TIME và PX TTL. Một bản ghi chứa sessionId, issueId, authCode và expiresAtMs. Có mã hợp lệ thì dùng nguyên bản, không refresh TTL. Sai issue/deadline, dữ liệu hỏng hoặc thiếu TTL bị từ chối.
5. Service gọi MockGateway qua timeout hữu hạn, chỉ truyền paymentRef/giá/currency/deadline, không gửi authCode hoặc Idempotency-Key. Kiểm tra URL đúng public origin/path checkout, không chứa query/fragment/credential. Xác minh lại thời gian SQL sau gateway, ghi ONLINE_CHECKOUT_READY bằng issueId rồi commit trước khi trả mã/URL.

Khóa SQL tuần tự hóa các lần chuẩn bị/phát hành của cùng payment; không có transaction chung SQL–Redis. Audit ONLINE_CHECKOUT_READY là dấu hiệu checkout đã có thể được trả về; không phải xác nhận thanh toán.

- **Redis/gateway lỗi hoặc timeout trước khi phát hành:** không trả kết quả thành công. Payment/visit vẫn PENDING, deadline chuẩn bị đã lưu được giữ. Nếu mã vẫn ở Redis thì retry dùng lại mã đó. Nếu chưa có checkout READY và chưa có mã được bàn giao, có thể hoàn tất bước tạo mã đầu tiên trong đúng deadline đã dành sẵn; đây không phải cấp lại mã đã phát hành.
- **Redis đã ghi nhưng mất phản hồi, hoặc audit READY lỗi:** không trả mã thành công khi chưa commit READY. Bản ghi Redis còn hạn được dùng lại để hoàn tất trên payment cũ. Không ghi thêm deadline hoặc doanh thu. Gateway phải giữ tính idempotent theo paymentRef; mock hiện tại không có thao tác thu tiền.
- **Đã READY nhưng mất phản hồi HTTP/commit:** retry với cùng khóa trả lại mã còn trong Redis, deadline và payment cũ. Không thêm audit READY thứ hai.
- **Đã READY nhưng mã mất khỏi Redis:** 409 ONLINE_CODE_MISSING, không tạo lại mã, không gọi gateway để tạo checkout thay thế. Giữ payment, visit và audit.
- **Deadline đã hết:** 409 ONLINE_CODE_EXPIRED, không kéo dài dù cấu hình TTL tăng; không tự chuyển PENDING thành FAILED. Trường hợp xác nhận đến muộn sẽ thuộc mốc webhook sau, không tự xử lý ở đây.
- **Lỗi audit PREPARE:** chưa tác động Redis/gateway; pending payment có thể đã commit ở bước trước. Không nói mọi lỗi checkout đều rollback cả payment. Retry bằng cùng khóa để đối soát.
- **PAID/FAILED/ACTIVE/REVOKED hoặc đã có token:** 409 ONLINE_CHECKOUT_NOT_PENDING, không hạ trạng thái, không sửa tiền/hạn vé. Chưa có API phục hồi/cấp lại token hay mã đã hết hạn.

Lỗi đầu vào 400; dùng lại khóa cho phương thức/chủ thể khác 409 REQUEST_KEY_CONFLICT; cấu hình/Redis/gateway/SQL chưa xác minh được 503 với mã lỗi an toàn. Không trả raw SQL, stack, credential hoặc mã đúng trong lỗi. Nếu lần lỗi đầu chưa trả sessionId, có thể gửi `POST /api/payments` với body ONLINE và **cùng Idempotency-Key** để lấy lại thông tin pending tối thiểu đã lưu, rồi tra trạng thái bằng sessionId; thao tác này không khôi phục mã hết hạn/mất hoặc ghi nhận thanh toán.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A01 AC2–AC3; QT-13 | Phần backend khởi tạo đạt local | online-checkout.test: stays PENDING, server price...; SQL pending payment/visit... | Không có giao diện/QR mới. Không cấp quyền hoặc hạn vé khi mới tạo. |
| US-A02 AC1; UC-01 bước 2/E1 | Có code phần mã TTL + adapter/URL mock; local đạt | adapter idempotent...; HTTP online checkout; SQL full pending setup | Phần mock kết quả SUCCESS/FAILED và chữ ký kiểm thử chưa làm, chưa gọi toàn bộ AC1 hoàn tất. |
| QT-03/04, phần request và mã TTL | Có code và kiểm chứng local; Lua thật chờ CI | 20 concurrent initializations; SQL 20 across two Store instances; config changes preserve TTL; Redis online-code suite | Chưa kiểm thử tiêu thụ một lần cho mã ONLINE vì chưa có endpoint đổi. |
| Chính sách người dùng chốt: 900 giây, giữ deadline, không thay mã đã phát hành bị mất/hết hạn | Local đạt | unit expired/missing...; SQL expired checkout; SQL missing issued code; Redis actual expiry test chờ CI | Chuẩn bị đầu chưa phát hành có thể hoàn tất trong deadline cũ. Không mở rộng cấp lại token. |
| QT-02/14, không dùng redirect xác nhận | Đạt phần không cấp quyền tại URL/khởi tạo | HTTP mock URL với forged SUCCESS/FAILED; snapshot SQL; mã authCode không truy cập /api/visits/me | Webhook có chữ ký và cập nhật PAID chưa code. |
| NFR-11 | Đạt phần timeout/error của adapter/mock và retry an toàn | gateway error/timeout/unsafe URL; SQL gateway timeout; Redis outage/lost reply | Timeout được mô phỏng, không gọi Payoo thật; không tuyên bố resilience của nhà cung cấp thật. |
| NFR-08 | Phần đầu vào, URL và đầu ra mới đạt local | whitelist/injection/config URL; SQL/audit không có code/raw key; no-store | authCode chỉ trong Redis TTL và phản hồi khởi tạo để client giữ; không đưa vào URL hoặc gateway. Chưa kiểm thử trình duyệt/XSS. |
| NFR-13 | Kiểm tra local đạt | lint 74 file JS; MockGateway và Stores thay thế; SQL integration thật | Helper online-checkout thuộc lớp Service, không gọi driver. |
| NFR-18 | Local kiểm chứng audit và bất biến payment/visit | SQL prepare/ready audit rollback; lost reply/commit; snapshots trước/sau; không tăng doanh thu | SQL là MariaDB; metadata deadline không chứa secret trong audit hiện có, không thêm schema. |
| US-A02 AC2–AC4; NFR-05 phần webhook/đổi ONLINE | Chưa làm, ngoài mốc | Chưa có test chức năng chưa code | Chỉ test gửi lặp khởi tạo; không suy ra webhook hoặc đổi mã một lần đã xong. |
| Hồi quy CASH và quyền khách | Bộ local trước vẫn đạt | Toàn bộ 245 test, gồm cash-exchange/visitor/confirmation/code | Không có thay đổi frontend hoặc payment CASH. |

## Kết quả và giới hạn

**245 test local đạt, 0 lỗi**; lint/cú pháp/phân lớp **74 file JavaScript đạt**. Có 28 test mới đã chạy: 14 cấu hình/adapter/Service/HTTP, 12 SQL integration, 2 RedisStore với client thay thế.

SQL local: **MariaDB 10.4.32**, database tạm `tcv_online_test_<uuid>`, Redis thay thế. Thêm 3 ca Redis thật về cạnh tranh/TTL, mất/hết hạn không thay thế, dữ liệu hỏng; **cộng 10 ca cũ là 13 ca Redis thật chưa bật local**. Dòng skipped=0 của runner không chứng minh các suite tắt đã chạy.

CI hiện có RUN_DB_TESTS=1 và RUN_REDIS_TESTS=1: 12 ca SQL mới sẽ dùng Redis thật cùng 3 ca Lua mới khi push. Chưa có CI/MySQL 8/Redis 7 cho code mốc 9. CI xanh tại 64523ce là mốc CASH trước, không phải bằng chứng cho code này. Không cài/chạy dịch vụ hệ thống mới; chỉ dọn database/key kiểm thử riêng, không FLUSHDB/FLUSHALL.

Log local: `C:\Users\Admin\AppData\Local\Temp\tcv-online-full-5454d504720f4741bbc4d31ef3bc79a0\all-tests.log`.

## Demo API của riêng phần khởi tạo

Chuẩn bị SQL/schema hiện hành, Redis, giá server và cấu hình mock. Gọi POST /api/payments/online-checkout với `{}` và một Idempotency-Key UUID v4; giữ sessionId/paymentRef/authCode/codeExpiresAt. Mở paymentUrl để xem JSON MOCK/PENDING. Gửi lại cùng khóa nhận cùng mã và deadline, không thêm payment. Tra cứu trạng thái công khai vẫn PENDING và không có token. Không gửi authCode vào API khách như token.

Chưa có thao tác "thanh toán thành công/thất bại" trên URL hoặc webhook. Không tự chèn SQL PAID để nói đã demo được thanh toán online. Tiếp theo mới thiết kế/xử lý kết quả mock có chữ ký.

## Các đoạn báo cáo cần cập nhật sau khi duyệt

- QT-04, cấu hình Redis và giả định liên quan: 900 giây, deadline cố định, retry/thiếu/hết hạn mã đã phát hành; tách khỏi mã ngắn CASH.
- UC-01 bước 2/E1, US-A02 và hiện trạng: endpoint checkout mới, luồng PENDING cũ vẫn có, URL mock chỉ xem JSON, chưa có kết quả/webhook/token ONLINE.
- Thiết kế 4.2–4.3: helper Service, MockGateway contract/timeout, quy trình SQL–Redis hai bước, audit chuẩn bị/READY không chứa bí mật. Không mô tả transaction chung.
- Mục 4.4.4 AUDIT_LOGS: bổ sung ý nghĩa PREPARE_ONLINE_CHECKOUT/ONLINE_CHECKOUT_READY; deadline/issueId là metadata không chứa mã. **Không thay cấu trúc bảng hoặc ERD.**
- Chương kiểm thử: ghi đúng 245 local, MariaDB/Redis thay thế và các phần chưa kiểm chứng. Word chưa được sửa.

Mốc này chưa commit/push. Dừng trước phần webhook; chỉ qua mốc kế sau khi người dùng chốt, yêu cầu commit/push và CI xanh. Nguồn và độ tin cậy: Word 8 đọc trực tiếp, quyết định TTL của người dùng, quyền được giao chọn chính sách lỗi và code/test local; MySQL 8/Redis thật/CI mới còn chờ.
