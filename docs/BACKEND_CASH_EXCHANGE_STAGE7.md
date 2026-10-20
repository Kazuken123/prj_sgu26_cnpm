# Mốc 7 — Đổi mã tiền mặt lấy token khách

## Nguồn, phạm vi và lựa chọn đã được giao

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx` (Thảo Cầm Viên) ngày 20/10/2026: US-A03 AC4, US-A04 AC1–AC2; QT-01/03/04/05/13/14; NFR-05/06/07/08/13/18; UC-02 đầy đủ, phần phối hợp UC-11; mục 1.6.2, 4.2–4.3 và bảng VISIT_SESSIONS/PAYMENTS tại 4.4.4.

Sau khi được hỏi về giới hạn thử và mất phản hồi, người dùng giao chọn phương án thực tế và triển khai. Mặc định 5 lượt/60 giây theo phiên, 30 lượt/60 giây theo IP; cả lượt đúng, sai và đầu vào không hợp lệ qua Service đều tính. Cấu hình được. Đây là lựa chọn triển khai theo quyền được giao, không phải con số đã có trong Word hoặc được giảng viên phê duyệt.

Token khách là chuỗi `tcv_visit_` cộng 32 byte ngẫu nhiên mã hóa hex, không phải JWT nội bộ và không phải auth_code. Chỉ hash SHA-256 của toàn bộ chuỗi được lưu vào token_hash đã có sẵn. Token chỉ trả ở lần đổi thành công, cùng expires_at gốc của vé. Không lưu bản token có thể khôi phục trong SQL, Redis hoặc audit.

**Giới hạn đã chọn:** nếu token đã commit nhưng khách mất phản hồi hoặc mất token, thử lại báo phiên đã cấp token, hướng dẫn liên hệ nhân viên và không thanh toán lại. Nhân viên hiện chưa có chức năng khôi phục/cấp lại token; đây không phải lời hứa đã xử lý được mất token. Không mở rộng Could Have US-A04 AC4–AC5 trong mốc này.

Chỉ làm phần backend đổi mã của UC-02 bước 5–7. Chưa làm localStorage/giao diện, middleware kiểm tra quyền khách, API bundle, ONLINE hoặc nhà cung cấp ngoài. Không có migration, không sửa Word, frontend hoặc migration đã push.

## API và cấu hình

`POST /api/payments/sessions/:sessionId/exchange-cash-code`

Không yêu cầu tài khoản STAFF/ADMIN. sessionId phải là UUID v4 của phiên đã nhận, không nhập một phiên tùy ý. Body chỉ có `shortedCode` dạng chuỗi sáu chữ số, giữ số 0 đầu. Không chấp nhận client tự gửi token, giá, hash, trạng thái, thời hạn hoặc thuộc tính thừa. Ví dụ body minh họa: `{"shortedCode":"012345"}`; phải thay bằng mã thực được nhân viên bàn giao.

Phản hồi 200: `{data: {sessionId, token, tokenType: "Bearer", expiresAt}}`, Cache-Control no-store. expiresAt là ISO UTC trên HTTP. Không trả mã ngắn, authCode, issueId hoặc hash. Mã mới không thay đổi paid_at/activated_at/expires_at, payment, doanh thu hoặc reissue_count.

Cấu hình trong hai env ví dụ và Docker Compose:

```text
CASH_EXCHANGE_WINDOW_SECONDS=60
CASH_EXCHANGE_IP_LIMIT=30
CASH_EXCHANGE_SESSION_LIMIT=5
```

Cửa sổ tính từ lần thử đầu của từng bucket, không phải cửa sổ trượt. Đổi IP vẫn chịu giới hạn phiên; đổi phiên vẫn chịu giới hạn IP. Bucket đổi mã tách khỏi bucket tra cứu trạng thái; khóa chỉ chứa hash IP/session. Thiếu hoặc hỏng cấu hình không được bỏ qua giới hạn. req.ip dùng cấu hình Express hiện có (không tự tin X-Forwarded-For); triển khai qua proxy phải cấu hình ranh giới proxy đúng trước nghiệm thu, không tự thay cấu hình ở mốc này.

Lỗi: 400 đầu vào sai; 401 mã không hợp lệ/hết hạn; 404 không có phiên; 409 ONLINE, PENDING/FAILED, phiên không ACTIVE, vé hết hạn, dữ liệu không nhất quán hoặc đã có token; 429 vượt giới hạn; 503 không bảo vệ/kiểm tra Redis được hoặc không xác định kết quả lưu SQL. Các phản hồi lỗi không chứa mã đúng, raw token, hash, SQL hoặc secret. Lượt HTTP lỗi JSON/oversize bị middleware chung từ chối trước Service không được tính vào bucket nghiệp vụ này.

## Quy trình một lần và các tình huống lỗi

1. Service kiểm tra cấu hình/IP, tăng cả hai bucket Redis nguyên tử rồi kiểm tra sessionId và body. Redis không sẵn sàng trước bước xác minh thì không cấp token.
2. PaymentStore khóa payment và visit theo cùng thứ tự với xác nhận/cấp mã, đọc thời gian UTC sau khi có khóa. Service yêu cầu CASH/PAID/ACTIVE, dữ liệu thời điểm hợp lệ, vé còn hạn, token_hash NULL và reissue_count bằng 0. PENDING không tiêu thụ mã, không tạo thanh toán mới.
3. RedisStore chạy Lua đọc và kiểm tra đúng cặp sessionId/mã, TTL và thời gian Redis, trả ánh xạ auth_code còn hạn. Không xóa hoặc refresh TTL ở bước này. Dữ liệu hỏng hoặc thiếu TTL không được coi là mã hợp lệ.
4. Service sinh token, PaymentStore cập nhật có điều kiện token_hash NULL và kiểm tra lại hạn vé/hạn mã bằng UTC của database ngay tại câu UPDATE. Hash và audit ISSUE_VISITOR_TOKEN commit trong cùng SQL transaction. Audit có user_id NULL, resource_id là sessionId, details chỉ paymentRef và issueId; không chứa bí mật. Chỉ sau commit mới trả token.
5. Sau commit, RedisStore dọn mã bằng Lua compare-delete theo issueId. Dọn lỗi hoặc tiến trình dừng thì mã tạm có thể còn đến TTL, nhưng token_hash đã có nên không được đổi hoặc cấp mã mới. Không đổi hạn vé hoặc số lần cấp lại.

MySQL và Redis **không cùng transaction**. Điểm chốt đổi một lần là commit SQL khi chuyển token_hash từ NULL sang hash; không tuyên bố có distributed transaction hay nguyên tử hai hệ lưu trữ. Khóa SQL và điều kiện UPDATE bảo đảm hai yêu cầu đồng thời không cùng nhận token. Các đường cấp mã hiện có cũng khóa cùng payment/visit và từ chối phiên đã có token.

- Mã sai/hết hạn: không lưu hash, không xóa mã hợp lệ của phiên khác.
- Redis kiểm tra lỗi/mất phản hồi trước SQL persist: 503, giữ nguyên tiền/phiên/mã để thử lại sau.
- UPDATE không còn hợp lệ (ví dụ mã hết hạn sau khi Redis đã đọc): không cấp token, không audit thành công.
- SQL hoặc audit thất bại và rollback được: không lưu token, mã chưa bị xóa nên có thể thử lại nếu còn hạn và chưa vượt ngưỡng.
- Commit thành công nhưng mất xác nhận commit hoặc phản hồi HTTP: có thể có hash mà khách chưa nhận token. 503 nếu server chưa xác định được kết quả; thử lại kiểm tra dữ liệu đã lưu và từ chối cấp lần hai. Đối soát bằng trạng thái phiên/audit, không khôi phục raw token từ hash. Tra cứu công khai vẫn chỉ trả trạng thái tối thiểu hiện có.
- Dọn Redis sau commit lỗi: vẫn trả token đã lưu. Bỏ qua lỗi dọn trong bước này không phải bỏ qua kiểm tra Redis; kiểm tra mã/TTL và rate limit trước cấp quyền đã hoàn tất. TTL dọn bản ghi còn sót, SQL chặn mọi lần đổi tiếp.

## Đối chiếu yêu cầu và kiểm chứng

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A03 AC4; UC-02 bước 6 / E2 | Backend đã có; local đạt, Redis thật chờ CI | cash-exchange.test: valid/wrong/expired/cross-session; SQL full pending-confirm-issue-exchange | Chưa có giao diện nhập mã. |
| QT-04, NFR-05: đổi một lần kể cả đồng thời | Đã kiểm chứng local với SQL thật + Redis thay thế | SQL 20 concurrent exchanges across two Service/Store instances; unit 20 simultaneous; replay | Không coi đây là đã chạy SQL + Redis thật cùng nhau. CI bật RUN_REDIS_TESTS=1 sẽ chạy 9 ca SQL mới với Redis thật. |
| QT-04, NFR-07: giới hạn theo phiên/IP | Có code, unit biên đạt; Lua thật chờ CI | rate budgets apply to wrong and malformed codes...; missing IP or invalid protection config...; Redis consumeLookup cũ có test Lua concurrency/TTL | 5/30 mỗi 60 giây là lựa chọn triển khai; không tuyên bố chống mọi hình thức tấn công. |
| QT-03/05/13/14: không cấp khi chưa trả, không đổi tiền/hạn vé | Đã kiểm chứng local | SQL pending/failed/online/revoked/expired...; before/after payment/visit; PENDING không inspect mã | Không tích hợp thanh toán online. |
| UC-02 E3; NFR-18: lưu token và audit nhất quán | Đã kiểm chứng SQL local | SQL audit insert failure...; lost response after real commit...; cleanup failure... | Audit/SQL lỗi và mất phản hồi được cưỡng bức trong môi trường kiểm thử; không phá dữ liệu nghiệp vụ. |
| NFR-08: token hash, đầu vào và lỗi an toàn | Đã kiểm chứng phần API mới | unit hash/output whitelist/injection; SQL audit whitelist; guest exchange HTTP... | Chưa kiểm thử localStorage, XSS hoặc thiết bị thật. |
| NFR-13: Router → Service → Store | Kiểm tra local đạt | lint 64 file JS; Service với Store/Redis thay thế, integration với SQL thật | Không có nhà cung cấp ngoài mới cần adapter. |
| US-A04 AC1 | Một phần: cấp token gắn phiên, lưu hash, trả hạn vé | SQL full flow; valid cash code returns one random guest token... | Chưa localStorage và chưa API khách bảo vệ bằng token. |
| US-A04 AC2; NFR-06 | Chỉ kiểm chứng token khách không vào API nội bộ | guest exchange HTTP... visitor token cannot access staff APIs | Token sai/hết hạn/thu hồi tại API khách phải làm ở mốc middleware tiếp theo; không ghi đã xong. |
| US-A04 AC3–AC5, US-A02; bundle | Ngoài phạm vi | Không có test chức năng chưa code | Frontend, cấp lại token Could Have, cổng/webhook ONLINE và bundle chưa làm. |

## Kết quả và giới hạn môi trường

Toàn bộ local: **207 test đạt, 0 lỗi**, SQL trên **MariaDB 10.4.32**, Redis thay thế. Có **23 test mới đã chạy**: 13 ca cấu hình/Service/HTTP, 9 ca SQL integration và 1 ca RedisStore dùng client thay thế. Kiểm tra cú pháp và phân lớp 64 file JavaScript đạt.

Thêm 2 ca Redis thật kiểm tra inspect/TTL/đúng cặp và compare-delete; cộng các suite cũ là **10 ca Redis thật chưa chạy local**. Dòng skipped=0 của runner không chứng minh các ca trong suite tắt đã chạy. Không có Redis thật hoạt động được xác nhận tại máy này. Chưa xác minh MySQL 8, Redis 7 hoặc CI cho mốc 7; CI xanh của 74656ee chỉ thuộc mốc sửa trước.

SQL integration tạo database ngẫu nhiên `tcv_exchange_test_<uuid>`, dùng Redis prefix riêng khi bật cờ thật và chỉ dọn key do suite tạo, không FLUSHDB/FLUSHALL. Log local: `C:\Users\Admin\AppData\Local\Temp\tcv-exchange-full-45af11feaa18488487ff2680dd083341\all-tests.log`.

## Demo API hiện tại

Tạo CASH/PENDING bằng API khởi tạo → STAFF/ADMIN tra đúng sessionId → confirm-cash → cash-code → khách gọi exchange-cash-code với sessionId và mã đã nhận. Có thể thấy token cùng hạn vé gốc; nhập lại trả 409, nhập sai bị từ chối, vượt ngưỡng trả 429. Dùng token khách gọi API quản trị bị 401.

Đây là demo backend qua API, không phải giao diện khách hoặc demo nghe thuyết minh. Chưa có API kiểm tra quyền khách để dùng token nhận được truy cập nội dung. API thu hồi/cấp lại token cũng chưa triển khai.

## Đoạn Word cần cập nhật sau khi duyệt

- QT-04, NFR-07 và thiết kế Redis: ngưỡng 5/30 mỗi 60 giây, cửa sổ theo lần thử đầu, fail-closed trước cấp quyền; không sửa lời báo cáo thành đã được giảng viên duyệt.
- UC-02 bước 6–7 / E2–E3: tên API và trường dữ liệu, mã gắn phiên, token chỉ trả một lần; phân biệt rollback trước commit với mất phản hồi sau commit và giới hạn chưa phục hồi token.
- Mục 4.2.4, 4.3: SQL là điểm chốt một lần; Redis chỉ dọn sau commit, không có transaction chung. Không mô tả Lua inspect là thao tác đã tiêu thụ mã.
- Mục 4.4.4 VISIT_SESSIONS: mô tả sử dụng token_hash hiện có (SHA-256), giữ expires_at/reissue_count; **không đổi schema hoặc ERD**, không thêm bảng/cột lưu raw token.
- Hiện trạng US-A03/US-A04 và phần kiểm thử: backend đổi mã có code, frontend/middleware khách còn thiếu; ghi đúng MariaDB/Redis thay thế và chờ CI mới.

Chưa commit/push theo quy trình. Chỉ bắt đầu mốc middleware khách sau khi mốc này được duyệt, push theo yêu cầu và CI xanh. Nguồn và độ tin cậy: Word 8 đọc trực tiếp, lựa chọn người dùng giao quyết định, code và test local; phần MySQL 8/Redis thật/CI mới chưa kiểm chứng như ghi trên.
