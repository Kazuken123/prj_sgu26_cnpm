# Mốc 3 — Khởi tạo phiên và thanh toán PENDING

## Nguồn yêu cầu và phạm vi

Đọc lại `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên, bản nằm tại thư mục cha của repo, ngày thực hiện 19/10/2026. Đã đọc mục 1.6.2; US-A01–A04, US-F01/F02; QT-01–05 và QT-12–14; NFR-05/07/08/13/14/18; UC-01/02 và phần tạo phiên của UC-11; mục 4.2–4.3 và 4.4.4.

Quyết định bổ sung của người dùng: CASH và ONLINE dùng chung bước khởi tạo PENDING. ONLINE chưa gọi cổng, chưa có URL thanh toán. Cho phép thêm đúng một cột nullable, UNIQUE, lưu hash khóa nhận diện yêu cầu vào PAYMENTS; không thêm cột VISIT_SESSIONS. Tra cứu công khai chỉ bằng session_id ngẫu nhiên, trả trạng thái tối thiểu và có giới hạn tần suất.

Mốc này không xác nhận thanh toán, không kích hoạt phiên, không sinh auth_code/shorted_code/token, không gọi PaymentGateway, không tích hợp Payoo và không thay đổi frontend. **US-A02 AC1 chưa đáp ứng**, kể cả khi khởi tạo ONLINE/PENDING thành công.

## Hợp đồng API

### Khởi tạo từ khách

`POST /api/payments`

Header bắt buộc: `Idempotency-Key: <UUID v4 ngẫu nhiên>`.

Body chỉ nhận `{"paymentMethod":"CASH"}` hoặc `{"paymentMethod":"ONLINE"}`. Gửi thêm amount, currency, status, sessionId hoặc thuộc tính khác bị từ chối 400. Giá lấy từ `VISIT_PRICE_VND`, không có giá mặc định. Giá thiếu/sai trả 503, không tạo bản ghi mới.

Phản hồi 201 khi tạo mới, 200 khi sử dụng lại cùng yêu cầu:

```json
{
  "data": {
    "sessionId": "UUID v4 do server sinh",
    "paymentRef": "UUID v4 độc lập do server sinh",
    "paymentMethod": "CASH",
    "amount": "giá cấu hình, định dạng thập phân hai chữ số",
    "currency": "VND",
    "sessionStatus": "PENDING",
    "paymentStatus": "PENDING"
  }
}
```

Đây là minh họa cấu trúc, không phải JSON số tiền để gửi nguyên văn. Các phản hồi không chứa khóa thô, hash, token, mã đổi quyền hay URL cổng thanh toán. Các giá trị số tiền trong test là dữ liệu kiểm thử, không phải mức giá vé đã chốt.

Client tạo khóa một lần cho một ý định mua, giữ nguyên khóa khi mất phản hồi hoặc thử lại. Không tự sinh khóa mới chỉ vì timeout. UUID khóa yêu cầu được chuẩn hóa chữ thường rồi băm SHA-256; chỉ hash được lưu. Khóa này độc lập với sessionId/paymentRef và không dùng làm điều kiện tra cứu công khai.

Cùng khóa, cùng phương thức và cùng bên tạo: giữ nguyên phiên, mã tham chiếu, số tiền và trạng thái đã lưu, kể cả khi cấu hình giá đã thay đổi hoặc thiếu. Cùng khóa nhưng khác phương thức hoặc người tạo: 409 `REQUEST_KEY_CONFLICT`; không đổi payment cũ. Khóa khác được coi là yêu cầu mua khác; không suy đoán hai khóa thuộc cùng một giao dịch.

### Nhân viên hỗ trợ tạo phiên tiền mặt

`POST /api/admin/payments` dùng cùng body và header, thêm `Authorization: Bearer <access token nội bộ>`.

Chỉ nhận CASH, đúng phần tạo phiên của UC-11 A1. Kiểm tra phiên hiện tại qua AuthService và kiểm tra lại tài khoản STAFF/ADMIN đang ACTIVE, không bị khóa, bên trong transaction. `created_by` và audit gắn với tài khoản tạo. Không có endpoint xác nhận đã nhận tiền ở mốc này.

### Khách tra cứu trạng thái

`GET /api/payments/sessions/:sessionId`

Không cần tài khoản hoặc khóa yêu cầu. Chỉ trả đúng ba trường `sessionId`, `sessionStatus`, `paymentStatus`; không trả số tiền, paymentRef, danh tính, thời hạn, token, hash hay mã đổi quyền. Phản hồi dùng `Cache-Control: no-store`. Biết sessionId không cấp quyền tham quan hoặc quyền thao tác payment.

sessionId phải là UUID v4 do server sinh. Redis giới hạn đồng thời theo IP và phiên bằng một Lua script; cả bộ đếm và TTL được thiết lập nguyên tử. Mã sai hoặc không tồn tại vẫn đi qua giới hạn IP. Vượt ngưỡng trả 429; Redis lỗi, timeout hoặc cấu hình giới hạn sai trả 503, không truy vấn trạng thái. Không có fallback bộ nhớ cho phép vượt bảo vệ.

Cấu hình kỹ thuật mặc định: cửa sổ 60 giây, 60 lượt/IP/cửa sổ, 20 lượt/phiên/cửa sổ. Đây là lựa chọn cấu hình triển khai, **không phải ngưỡng nghiệm thu đã được báo cáo chốt**. Đổi bằng VISIT_LOOKUP_WINDOW_SECONDS, VISIT_LOOKUP_IP_LIMIT, VISIT_LOOKUP_SESSION_LIMIT. Redis đơn, không phải Redis Cluster. Express chưa tin X-Forwarded-For; nếu đặt sau proxy phải cấu hình trust proxy đúng hạ tầng, không bật tin mọi địa chỉ.

## Giao dịch và migration

Migration mới: `database/migrations/004_payment_request_key.sql`. Các migration 001–003 đã push không bị sửa.

Thêm duy nhất `PAYMENTS.request_key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL`, chỉ mục UNIQUE `uq_payments_request_key_hash`. Những payment cũ giữ NULL, không suy tạo khóa cũ. MySQL/MariaDB cho phép nhiều NULL trong UNIQUE. Không thêm bảng; vẫn 16 bảng. Không thêm hoặc đổi trường VISIT_SESSIONS.

Schema khởi tạo mới đã bao gồm trường này. Trình migration kiểm tra trước khi chạy và xác nhận unique index; chạy lại không thay đổi dữ liệu. Khi nâng môi trường có dữ liệu: chạy `npm run db:migrate` ở backend bằng cấu hình đúng môi trường. **Không chạy lại init_db.sql lên database đang sử dụng**. Lượt làm này chỉ thử migration trên database kiểm thử ngẫu nhiên; chưa áp lên database nghiệp vụ.

Store lưu phiên PENDING, payment PENDING và audit trong cùng transaction. UNIQUE chặn hai yêu cầu cùng khóa; giao dịch thua rollback toàn bộ, sau đó đọc kết quả đã commit. Chỉ coi trùng là yêu cầu lặp nếu tìm thấy đúng hash; lỗi unique payment_ref khác không bị che thành thành công. Không sửa trạng thái PAID/FAILED hiện có khi thử lại hoặc tra cứu. Phiên mới giữ token_hash, activated_at, expires_at bằng NULL; payment giữ confirmed_by, paid_at bằng NULL.

Audit `CREATE_PENDING_PAYMENT` ghi tài nguyên, sessionId, phương thức, người thực hiện nếu có và thời điểm do database sinh. Không lưu khóa yêu cầu thô, hash khóa hay token vào audit.

## Đối chiếu AC / QT / NFR

Tên ca trong các tệp test dưới đây là bằng chứng; integration SQL chạy trên database tạm, tách khỏi dữ liệu nghiệp vụ.

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A01 AC1 | Chưa đầy đủ | `payment.test.js`: CASH and ONLINE share pending creation | Có API cho hai phương thức; QR, trang giá và lựa chọn giao diện chưa thuộc mốc backend. |
| US-A01 AC2; phần giá của QT-02 | Đã kiểm chứng ở backend mốc này | `server price is a bounded positive decimal`; `client price, status, session and SQL/HTML payloads`; integration `missing price and forged amounts` | Giá từ cấu hình; không tự chốt giá kinh doanh. Chưa làm webhook của QT-02. |
| US-A01 AC3 | Đã kiểm chứng phần khởi tạo | `both methods persist pending payment/session/audit`; `lookup needs only random session ID` | Có mã tham chiếu, trạng thái; không trả quyền. Chưa có bộ bảo vệ API tham quan cho khách. |
| US-A03 AC1 | Đã kiểm chứng backend | `CASH and ONLINE share pending creation`; `staff creation records the current actor`; HTTP contract | Khách/STAFF/ADMIN tạo được phiên chờ; UI chưa làm. |
| US-A02 AC1 | **Chưa đáp ứng** | Test pending kiểm tra không có URL/mã/token | Chỉ có tiền đề ONLINE/PENDING; chưa PaymentGateway, MockGateway hoặc auth_code. |
| US-A02 AC2–AC4; US-A03 AC2–AC4 | Chưa triển khai | Chưa có test nghiệp vụ hoàn chỉnh tương ứng | Xác minh tiền, webhook, mã ngắn, đổi mã một lần để mốc sau. Test tạo lặp không thay thế test webhook lặp. |
| US-A04 AC1–AC3; QT-04 | Chưa triển khai quyền khách | Test pending xác nhận token/timestamps NULL | Không có token khách ở mốc này; không tuyên bố đã kiểm thử token khách hết hạn. AC4–AC5 là Could Have, ngoài phạm vi. |
| US-F01 AC4; QT-01, phần quyền QT-12 | Đã kiểm chứng trên endpoint tạo của nhân viên | `staff payment endpoint validates real JWT signatures, expiry, guest type and revoked sessions`; integration `staff creation records the current actor` | JWT thật với Store xác thực thay thế ở HTTP test; SQL test kiểm tra lại tài khoản trong transaction. Không phải thử nghiệm toàn bộ quyền khách. |
| US-F02 AC3; phần audit QT-12 | Một phần | integration `both methods persist pending payment/session/audit`, `audit failure rolls back payment and session` | Có audit tạo PENDING không chứa khóa thô; chưa làm xác nhận tiền mặt hoặc màn hình ADMIN xem log. |
| QT-03; UC-01 E1, UC-02 A1/E1; quyết định khóa yêu cầu | Đã kiểm chứng phần tạo lặp | integration `lost-response retry`, `24 simultaneous requests`, `simultaneous method mismatch`, `collision on payment_ref` | Mỗi phương thức thử 24 yêu cầu đồng thời, đúng một phiên/payment/audit. Không thay cho chống lặp xác nhận tiền. |
| QT-05, QT-13 | Đã kiểm chứng điều kiện PENDING | integration `both methods persist pending payment/session/audit` | Hạn vé và thời điểm kích hoạt NULL. Kích hoạt và tính hạn từ lúc trả tiền chưa làm. |
| QT-14 | Đã kiểm chứng phần giữ trạng thái | `retry and lookup do not reset`; integration `lookup/retry preserve externally seeded PAID and FAILED state` | Trạng thái PAID/FAILED được gieo trong test; không phải code thanh toán hoàn chỉnh. Chưa xử lý webhook đến muộn. |
| NFR-05 | Chưa đáp ứng toàn bộ | Test tạo đồng thời chỉ chứng minh bước khởi tạo | Webhook lặp và mã đổi quyền một lần còn ngoài mốc. |
| NFR-07; quyết định giới hạn tra cứu | Một phần, cần Redis thật | `lookup limits even unknown/malformed IDs`; `Redis errors and command timeouts`; `redis.test.js` có 3 ca Redis thật | Bản thay thế xác nhận 429/503 và không gọi SQL khi bảo vệ lỗi. Ba ca Redis thật chưa chạy tại máy này; CI đã cấu hình nhưng chưa chạy cho thay đổi mới. |
| NFR-08 | Đã kiểm chứng phần đầu vào/đầu ra của mốc | `only SHA-256`; `client price, status, session and SQL/HTML payloads`; HTTP safe errors; integration kiểm tra audit | SQL tham số hóa; không nhận trường tùy ý; phản hồi và audit không chứa khóa thô/hash. Không tuyên bố đã kiểm tra XSS giao diện hay toàn hệ thống. |
| NFR-13 | Đã kiểm chứng cấu trúc thay đổi | `backend/scripts/check.js`; unit Service với Store thay thế | Router → Service → Store, driver MySQL/Redis chỉ ở Store; chưa có dịch vụ ngoài cần adapter trong mốc này. |
| NFR-14 | Local đã chạy; CI mới chưa xác nhận | Toàn bộ 127 test local và coverage baseline | Chưa commit/push; không lấy CI xanh của commit trước làm kết quả cho mốc mới. |
| NFR-18 | Đã kiểm chứng trên MariaDB | integration `004 adds exactly one nullable unique hash column`, `payment insert error`, `audit failure` | Bảo toàn dữ liệu cũ, không đổi VISIT_SESSIONS, rollback cả ba bảng. Chưa xác nhận MySQL 8 cho thay đổi này. |

## Kết quả kiểm thử và giới hạn

Toàn bộ test: **127 pass, 0 fail**, gồm **37 test SQL integration** trên **10.4.32-MariaDB**; test HTTP dùng server localhost. Giá kiểm thử 50.000 VND chỉ là fixture. Test xác thực endpoint mới có JWT thật cho chữ ký sai, hết hạn, token loại khách, tài khoản khóa và phiên đã logout; các Store của AuthService trong HTTP test đó là bản thay thế.

Nhóm **3 ca Redis thật chưa chạy** vì máy không có Redis hoạt động. Runner bỏ qua cả suite nên dòng tổng có thể hiện `skipped 0`; không được dùng dòng đó để nói rằng đã chạy Redis thật. Hai test Redis Store bằng client thay thế đã chạy, gồm lỗi và timeout. CI mới có Redis 7 và RUN_REDIS_TESTS=1, vì vậy nếu Redis không kết nối được trong CI thì phải báo lỗi, không âm thầm bỏ qua.

Coverage baseline local do Node cung cấp: line 96,52%, branch 91,73%, function 98,02% cho các tệp runner thu thập, có cả helper kiểm thử; **không phải tỷ lệ riêng của toàn bộ code sản phẩm** và không áp ngưỡng nghiệm thu. Lint kiểm tra 52 tệp JavaScript. Đây không phải đo tải, kiểm thử trình duyệt hoặc bằng chứng thanh toán thật.

Lượt kiểm thử cuối: `C:\Users\Admin\AppData\Local\Temp\tcv-pending-3bea43b29afa4beb8c0c9dba2742c3d0\all-tests.log`. CI MySQL 8/Redis 7 và Docker Compose mới chưa được chạy/xác nhận trong lượt này. Readiness kiểm tra schema SQL, gồm cột mới; không có nghĩa là Redis đang khỏe. Khi Redis lỗi, API tra cứu trả 503, các chức năng độc lập vẫn có thể sử dụng.

Chưa commit/push. Không bắt đầu mốc tiếp theo trước khi được yêu cầu commit/push và xác nhận CI xanh theo quy trình đã chốt.

## Các đoạn báo cáo cần cập nhật — chưa sửa Word

1. **Mục 4.4.4 e), bảng PAYMENTS:** thêm dòng `request_key_hash`, CHAR(64), cho phép NULL, UNIQUE, SHA-256 của khóa nhận diện yêu cầu; không lưu khóa thô. Ghi NULL dành cho dữ liệu cũ/chưa có khóa. Không thêm trường nào vào mục d) VISIT_SESSIONS.
2. **Mục 4.4.4 e), đoạn ngay sau bảng bắt đầu “Ràng buộc duy nhất trên session_id…”:** giữ ràng buộc session_id, bổ sung unique hash để nhận diện lần thử lại trước khi biết session_id. Cùng khóa/cùng phương thức/cùng người tạo dùng bản ghi cũ; khác phương thức hoặc người tạo bị từ chối. Giá mới không làm thay đổi yêu cầu cũ. Thêm nguyên tắc rollback session/payment/audit khi bước tạo lỗi.
3. **Mục 4.4.4 e), đoạn cuối về chỉ mục:** bổ sung `uq_payments_request_key_hash`; không đổi tên cột, khóa ngoại hoặc chỉ mục hiện có. Phân biệt khóa khởi tạo mới với payment_ref dùng đối soát kết quả thanh toán.
4. **Mục 4.4.3.1 — ERD tổng thể, Hình 4.2:** cập nhật thực thể PAYMENTS với thuộc tính request_key_hash và ký hiệu UQ/nullable nếu hình thể hiện thuộc tính. Vẫn 16 bảng, không có bảng hoặc quan hệ mới.
5. **Mục 4.4.3.2 — ERD phân hệ, Hình 4.3:** cập nhật thuộc tính PAYMENTS tương tự; giữ quan hệ mỗi phiên tối đa một payment. Đoạn giải thích quan hệ sau hình bổ sung “một khóa yêu cầu mới gắn tối đa một payment”, không diễn giải thành thêm quan hệ ERD.
6. **UC-01, bước 2:** đặc tả việc nhận khóa yêu cầu, lấy giá server, tạo phiên/payment PENDING và lưu hash trong một transaction. Phân biệt thiết kế UC đầy đủ với phần đã hiện thực: hiện chưa tạo auth_code hoặc URL. Không xóa yêu cầu PaymentGateway khỏi thiết kế chỉ vì mốc hiện tại chưa làm.
7. **UC-01 E1 và phần kiểm tra trạng thái/A3:** nếu mất phản hồi, gửi lại cùng khóa để nhận đúng mã tham chiếu/phiên cũ, không tự tạo yêu cầu mới. Tra cứu công khai bằng session_id ngẫu nhiên chỉ trả trạng thái tối thiểu, có giới hạn tần suất và từ chối khi Redis lỗi. Tra trạng thái không phải đổi mã hoặc cấp quyền. Kiểm tra trạng thái/đổi mã hoàn chỉnh vẫn là thiết kế cho mốc sau.
8. **UC-02, bước 2, A1, E1 và A2:** bổ sung cùng hợp đồng khóa yêu cầu, giữ nguyên phiên khi thử lại; tra cứu chỉ bằng session_id đã biết, tối thiểu và bị giới hạn. Giữ PENDING khi chưa xác nhận, không tự chuyển FAILED. Bước nhận mã/đổi token chưa hiện thực.
9. **UC-11 A1 và tiền điều kiện phần hỗ trợ tạo phiên:** mô tả STAFF/ADMIN dùng cùng Service tạo CASH/PENDING, ghi created_by/audit và kiểm tra lại tài khoản trong transaction. Ghi rõ đây chỉ là phần tạo phiên, chưa phải UC xác nhận tiền mặt hoàn chỉnh.
10. **Mục 4.2/4.3, PaymentService/PaymentStore/RedisStore:** ghi nhận điều phối tạo lặp, transaction ba bảng, unique hash và rate limit tra cứu. Chưa mô tả adapter cổng thanh toán là đã được gọi.
11. **Phần hiện trạng/kiểm thử và bảng truy vết US-A01/US-A02/US-A03, NFR-07/14/18:** cập nhật đúng phạm vi backend đã kiểm chứng; **US-A02 AC1 vẫn chưa đáp ứng**. Phân biệt MariaDB local, Redis thay thế, Redis/MySQL thật trên CI chưa chạy; frontend chưa làm.

Nguồn và độ tin cậy: báo cáo Word (8) đọc lại trực tiếp, quyết định bổ sung của người dùng và code/test trong repo hiện tại; hạn chế chưa kiểm chứng Redis thật, MySQL 8 và CI của thay đổi mới đã ghi rõ. Không sửa báo cáo Word, slide hoặc frontend.
