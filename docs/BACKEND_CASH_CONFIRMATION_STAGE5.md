# Mốc 5 — Xác nhận đã nhận tiền mặt và kích hoạt phiên

## Nguồn, quyết định và phạm vi

Nguồn chính: `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên, tại thư mục cha repo; đọc lại ngày 19/10/2026. Đã đối chiếu US-A03 AC1–AC4, US-F01 AC4, US-F02 AC3; UC-02/11; QT-01–05, QT-12–14; NFR-05/07/08/13/14/18; mục 1.6.2, kiến trúc 4.2–4.3 và các bảng/ràng buộc liên quan tại 4.4.4.

Người dùng giao chọn phương án thực tế và tiếp tục triển khai sau khi được thông báo thời hạn 24 giờ còn là giả định trong báo cáo. Phương án triển khai được chọn: **mặc định 24 giờ từ lúc backend xác nhận đã nhận tiền; cấu hình trên server được; không đổi hạn vé đã xác nhận**. Đây là quyết định triển khai trong phiên làm việc, không tự coi là bằng chứng giảng viên đã duyệt giả định.

Mốc này hiện thực UC-11 bước 5–6, phần xác nhận PAID, kích hoạt ACTIVE và audit; giữ cách chia mốc đã thống nhất. **US-A03 AC2 mới đáp ứng một phần vì chưa tạo auth_code. AC3–AC4 chưa triển khai.** Không cấp shorted_code, token khách, không xử lý đổi mã, không xác nhận ONLINE/webhook, không làm Could Have cấp lại token. US-A02 AC1 vẫn chưa đáp ứng. Frontend/Word không thay đổi.

## API nội bộ

`POST /api/admin/payments/sessions/:sessionId/confirm-cash`

Yêu cầu access token nội bộ STAFF hoặc ADMIN hiện còn hợp lệ. Chỉ gọi sau khi nhân viên đã đối chiếu đúng phiên và thực tế nhận đủ tiền. Backend không thể chứng minh việc bàn giao tiền mặt ngoài đời bằng API.

Body bỏ trống hoặc `{}`; không nhận số tiền, thời hạn, paymentRef, trạng thái hoặc token từ client. sessionId phải là UUID v4 đã được server cấp. Không cần khóa khởi tạo mới: sessionId và quan hệ một payment/phiên xác định giao dịch cần xác nhận. Không tạo thêm payment hoặc session.

Trả 200, `Cache-Control: no-store`, `{data: ...}` gồm đúng:

```text
sessionId, paymentRef, paymentMethod, amount, currency,
sessionStatus, paymentStatus, paidAt, activatedAt, expiresAt, alreadyConfirmed
```

Các thời điểm trả qua HTTP dưới dạng ISO 8601 UTC. `amount` là chuỗi thập phân từ payment đã lưu. Lần đầu `alreadyConfirmed=false`; lần xác nhận lại `alreadyConfirmed=true`, giữ người xác nhận, số tiền, thời điểm và hạn vé ban đầu. Không trả ID người xác nhận, token, hash hoặc mã đổi quyền. Không gọi PaymentGateway hoặc Redis trong mốc này.

Việc phiên chuyển ACTIVE không tự cung cấp quyền truy cập API cho khách: `token_hash` vẫn NULL đến mốc đổi mã sau này. Đặc tả 4.4.4 yêu cầu cả ACTIVE, chưa hết hạn và token khớp mới sử dụng được phiên. Bộ API bảo vệ quyền khách chưa thuộc mốc này; không được tuyên bố đã hoàn thành.

### Trạng thái và lỗi

Thiếu/sai/hết hạn JWT, token loại khách hoặc phiên nội bộ đã logout bị từ chối theo cơ chế AuthService hiện có. Tài khoản bị khóa bị từ chối; tài khoản/quyền được đọc lại trong transaction trước khi thao tác payment.

400 cho sessionId hoặc body không hợp lệ; 404 nếu không tìm thấy; 409 nếu payment không phải CASH hoặc không đủ điều kiện xác nhận. Chỉ cặp CASH/PENDING + phiên PENDING chưa có thời điểm thanh toán, kích hoạt, hết hạn, token hay lịch sử cấp lại mới được xác nhận lần đầu. Payment FAILED hoặc phiên chờ đã REVOKED không được chuyển sang PAID/ACTIVE qua endpoint này.

Payment đã PAID với phiên ACTIVE hoặc REVOKED và các thời điểm cần thiết được trả về để đối chiếu. Không kích hoạt lại REVOKED, không gia hạn vé đã hết hạn, không cấp token mới. PAID nhưng phiên PENDING hoặc thiếu các mốc thời gian cần thiết trả 409 `PAYMENT_SESSION_INCONSISTENT`, không tự sửa dữ liệu đối soát.

Thời hạn cấu hình sai trả 503 `VISIT_VALIDITY_NOT_CONFIGURED` trước khi ghi tiền. Gửi lại giao dịch đã xác nhận vẫn dùng thông tin đã lưu và không cần đọc cấu hình mới. Lỗi ghi dữ liệu trả lỗi tập trung sau rollback; mất phản hồi sau commit thì gửi lại cùng sessionId hoặc tra cứu, không yêu cầu khách trả tiền thêm.

## Cấu hình và giao dịch

`VISIT_VALIDITY_HOURS=24` trong các file ví dụ và Docker Compose. Giá trị là số giờ nguyên dương, được chuyển sang mili giây an toàn. Không đặt biến thì dùng 24; giá trị rỗng, 0, âm, số lẻ hoặc vượt phạm vi dữ liệu bị từ chối thay vì âm thầm quay về 24. Thời điểm hết hạn phải nằm trong phạm vi DATETIME đến năm 9999. Thay đổi cấu hình chỉ tác động lần xác nhận mới, không sửa vé cũ.

Router chỉ nhận đầu vào, gọi Service và trả kết quả. Service kiểm tra quyền, trạng thái và thời hạn. PaymentStore thực hiện:

1. Bắt đầu transaction; đọc và khóa tài khoản hiện tại rồi gọi kiểm tra quyền của Service.
2. Đọc khóa cả payment và phiên liên quan bằng truy vấn tham số hóa `FOR UPDATE`. Đây là khóa nghiệp vụ giữa các nhân viên khác nhau, không chỉ khóa riêng tài khoản.
3. Service kiểm tra dữ liệu. Nếu đã xác nhận hợp lệ thì trả trạng thái cũ, không ghi lại.
4. Nếu xác nhận mới: lấy UTC_TIMESTAMP từ database **sau khi lấy khóa**, đặt cùng thời điểm cho paid_at và activated_at, tính expires_at từ thời điểm này.
5. Cập nhật PAYMENTS sang PAID, confirmed_by là người xác nhận đầu tiên; cập nhật VISIT_SESSIONS sang ACTIVE cùng thời hạn. Không thay giá, mã tham chiếu, token_hash hoặc reissue_count.
6. Ghi audit `CONFIRM_CASH_PAYMENT` với tài khoản, paymentRef, sessionId, số tiền, đơn vị tiền tệ, IP và cùng thời điểm UTC xác nhận. Audit không chứa token/hash/mã bí mật.
7. Commit cả ba thay đổi hoặc rollback toàn bộ nếu có lỗi. Cơ chế retry xung đột transaction hữu hạn hiện có được giữ nguyên.

AuditLogStore hỗ trợ truyền `createdAt` để audit xác nhận dùng chính thời điểm UTC đã lưu ở payment/phiên. Các caller audit hiện có giữ cách dùng timestamp mặc định của database; không đổi schema. Không có migration mới, không sửa migration đã push và không chạy migration lên database nghiệp vụ trong mốc này.

MySQL và Redis không có chung transaction. Chưa triển khai UC-11 bước 7/E4 về cấp lại mã sau lỗi Redis. Mốc sau phải gọi phần cấp mã trên payment đã PAID an toàn; Redis lỗi không được xóa kết quả đã trả tiền hoặc ghi nhận tiền thêm lần nữa. Mốc hiện tại không có phản hồi mã ngắn thành công giả.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| UC-11 bước 5–6 | Đã kiểm chứng backend xác nhận | SQL `confirms the existing CASH payment and visit with UTC dates, saved price and matching audit in one transaction` | Nhân viên phải đã nhận tiền thực tế; chưa có giao diện hay cấp mã. |
| US-A03 AC2 | **Một phần** | Service `cash confirmation activates the same visit`; SQL xác nhận cùng giao dịch | Đã quyền, paymentRef cũ, PAID/ACTIVE và audit; **chưa tạo auth_code**. Không đánh dấu hoàn thành toàn AC. |
| US-A03 AC3–AC4; QT-04 | Chưa triển khai | Test đầu ra không có token/mã; token_hash vẫn NULL | Chưa có mã ngắn, TTL mã, Redis một lần hoặc đổi token. |
| US-F01 AC4; QT-01, phần quyền QT-12 | Đã kiểm chứng endpoint mới | HTTP `confirmation HTTP requires real JWT`; SQL `rechecks actor status inside the transaction` | JWT thật, Store xác thực thay thế trong HTTP test; SQL test kiểm tra tài khoản thật, gồm replay. |
| US-F02 AC3; phần audit QT-12 | Đạt phần audit xác nhận tiền | SQL kiểm tra audit khớp payment/user/time; `audit write failure rolls back...` | Chưa làm ADMIN xem/lọc audit. |
| QT-02, phần giá server | Giữ số tiền đã lưu | SQL xác nhận giá 50000.00 fixture và test `lost response and changed/invalid config...` | Không tính lại bằng giá hiện tại, không nhận amount từ client; không làm webhook ONLINE. |
| QT-03; UC-11 A2 | Đã kiểm chứng chống xác nhận lặp | SQL `24 simultaneous confirmations by two staff identities...`; `lost response and changed/invalid config...` | Chỉ một lần ghi tiền/audit; không tạo phiên/payment hoặc đổi người xác nhận đầu tiên. Không thay cho kiểm thử webhook. |
| QT-05/13 | Đã kiểm chứng thời hạn lúc xác nhận | SQL UTC dates; `custom validity applies only to new confirmations...` | Mặc định 24 giờ, thử cấu hình 48 giờ; không tính từ created_at. |
| UC-11 E2; QT-14 | Đã kiểm chứng điều kiện xác nhận CASH | SQL `refuses ONLINE, FAILED, revoked pending visits and inconsistent payment/session pairs...` | Không tự coi pending là PAID/FAILED; không xác nhận payment ONLINE bằng endpoint tiền mặt. |
| UC-11 E3; NFR-18 | Đã kiểm chứng rollback local | Ba SQL test payment/visit/audit write failure; snapshot trước/sau | Có lỗi cưỡng bức ở từng bước; thử lại thành công một lần. Database local là MariaDB 10.4.32. |
| UC-11 A2; US-A04 AC1–AC2 | Giữ nguyên vé cũ; chưa hoàn thành quyền khách | SQL `already expired or revoked paid tickets...` | Trạng thái hết hạn/thu hồi được gieo trong test; không kích hoạt lại hoặc cấp token. Bộ bảo vệ API khách chưa làm. |
| NFR-05 | Chưa đáp ứng toàn bộ | Ca đồng thời chỉ chứng minh xác nhận CASH | Webhook và mã đổi quyền một lần chưa triển khai. |
| NFR-07; UC-11 E4 | Chưa triển khai phần cấp mã | Test Redis thay thế ném lỗi nếu bị gọi, xác nhận không gọi Redis | Không chứng minh đã xử lý lỗi cấp mã sau commit; để mốc sau. Bảo vệ tra cứu công khai cũ giữ nguyên. |
| NFR-08 | Đã kiểm chứng đầu vào/đầu ra trong mốc | `invalid confirmation payloads...`; HTTP lỗi an toàn; SQL audit whitelist | Không lộ SQL/token/hash; không nhận amount/expiry/status từ client. Chưa kiểm thử giao diện/XSS trình duyệt. |
| NFR-13 | Đã kiểm chứng cấu trúc thay đổi | Lint 55 tệp JS; Service test với Store thay thế | Router không SQL/Redis; Service không gọi driver. Không có dịch vụ ngoài cần adapter trong phần tiền mặt này. |
| NFR-14 | Local đạt; CI mới chưa chạy | Toàn bộ 155 test local | CI xanh của commit 57c55db chỉ thuộc mốc 4, không phải bằng chứng cho code mới. |

## Kết quả kiểm thử và giới hạn

Local: **155 test đạt, 0 lỗi**, gồm **52 test SQL integration** trên **MariaDB 10.4.32** trong các database tạm có tên ngẫu nhiên, không chạm dữ liệu nghiệp vụ. Có 19 test mới: 8 Service/HTTP/cấu hình và 11 SQL. Không có test lỗi phải sửa trong lượt chạy toàn bộ này.

Đã thử 24 yêu cầu xác nhận đồng thời từ hai tài khoản STAFF/ADMIN, chỉ một phản hồi xác nhận lần đầu và một audit; các phản hồi còn lại đọc kết quả cũ. Đây là kiểm tra tính đúng khi đồng thời, không phải đo tải hoặc cam kết hiệu năng.

Các lỗi payment/visit/audit được cưỡng bức bằng trigger trên database kiểm thử và đã kiểm tra rollback. Các trạng thái PAID/FAILED/REVOKED hoặc hết hạn trong một số ca được gieo để kiểm thử, không chứng minh đã có đầy đủ mọi chức năng tạo ra trạng thái đó.

HTTP test dùng JWT thật cho chữ ký sai, hết hạn, loại visitor, tài khoản bị khóa và logout. Store xác thực trong HTTP test là bản thay thế; test giao dịch SQL dùng database thật. Không có mô phỏng thanh toán ONLINE trong mốc này.

Ba test Redis thật của mốc cũ chưa chạy lại tại máy này do không có Redis đang hoạt động; runner bỏ qua cả suite nên dòng `skipped 0` không được hiểu là đã chạy Redis thật. Code xác nhận mới chưa gọi Redis. MySQL 8, CI và Docker Compose của thay đổi mới chưa chạy/xác nhận do chưa commit/push. Lint 55 tệp JS đạt, không có thay đổi schema.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-cash-confirm-811258ce1c4848d08c04e26653a008fb\all-tests.log`.

## Báo cáo cần ghi nhận sau khi duyệt — chưa sửa Word

- Mục 1.6.2: ghi nhận lựa chọn triển khai 24 giờ từ lúc xác nhận, cấu hình được; vẫn phân biệt với việc giảng viên phê duyệt giả định.
- UC-11 bước 5–6/A2/E2/E3: bổ sung API, dữ liệu dùng để đối chiếu, chống lặp, khóa và rollback. Bước 7–8/E4 vẫn là thiết kế chưa triển khai.
- US-A03 AC2 và phần truy vết/hiện trạng: đánh dấu **đáp ứng một phần**, chưa auth_code; AC3–AC4 chưa làm. Không ghi toàn bộ thanh toán tiền mặt hoàn thành.
- Mục 4.2–4.3: cập nhật phối hợp PaymentService–PaymentStore–AuditLogStore và cấu hình thời hạn. Mục 4.4.4 giữ nguyên các cột; chỉ cần mô tả cụ thể cách đặt paid_at/activated_at/expires_at và audit trong giao dịch. ERD không cần đổi.
- Phần kiểm thử: ghi đúng 155 test local/MariaDB, các ca đồng thời và rollback; MySQL 8/CI của thay đổi mới chưa xác nhận.

Chưa commit/push; không bắt đầu mốc sau trước khi được yêu cầu push và CI xanh. Nguồn và độ tin cậy: báo cáo Word (8) đọc lại trực tiếp, quyền người dùng giao chọn phương án và code/test local; các giới hạn chưa kiểm chứng được ghi rõ. Không sửa Word, slide, frontend hoặc schema.
