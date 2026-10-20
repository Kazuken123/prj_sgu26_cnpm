# Mốc 8 — Kiểm tra token khách, hoàn tất luồng tiền mặt kiểm thử qua API

## Nguồn và giới hạn

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx` ngày 20/10/2026: US-A04 AC1–AC3, US-F01 AC4, QT-01/05/12/13/14, NFR-06/08/13; UC-03 đầy đủ (đặc biệt điều kiện trước, kiểm tra phiên ở bước 2 và hạn vé), phối hợp với luồng UC-02 đã làm. Đã đọc mục 1.6.2, 4.2–4.3, nguyên tắc UTC và bảng/ràng buộc VISIT_SESSIONS/PAYMENTS tại 4.4.4.

Người dùng giới hạn công việc hôm nay ở luồng tiền mặt kiểm thử được qua API. Chỉ bổ sung middleware khách và API xem phiên của chính khách. Không làm bản đồ/bundle, audio, chatbot, ONLINE, frontend, polling, API thu hồi hoặc cấp lại token. Không mở rộng Could Have, không sửa Word, không có migration hay thay tên bảng/cột.

Mốc 7 đã commit/push bằng `45a2fe8`; trước khi bắt đầu code mốc 8 đã đợi [CI/CD 39352061812](https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39352061812) hoàn tất success. Workflow có MySQL 8/Redis 7 thật, cả Node 20/22 và kiểm thử gói phát hành đều đạt. Đây không phải deploy staging thật và không phải CI của code mốc 8.

## API và kiểm tra quyền

`GET /api/visits/me`, gửi `Authorization: Bearer <token khách nhận từ exchange-cash-code>`.

200: `{data: {sessionId, status: "ACTIVE", expiresAt}}`, expiresAt ISO UTC, Cache-Control no-store. Thiếu token trả 401 MISSING_VISITOR_TOKEN; token sai định dạng/không khớp hash trả 401 INVALID_VISITOR_TOKEN; phiên không hợp lệ trả 401 INVALID_VISITOR_SESSION; vé hết hạn trả 401 VISIT_SESSION_EXPIRED. Không kiểm tra được SQL/thời gian database trả 503 VISITOR_AUTH_UNAVAILABLE. Thông báo không chứa token, hash hoặc SQL. Không nhận token qua query string hoặc dùng sessionId trên query để chọn phiên khác.

Router chỉ áp dụng middleware và trả dữ liệu. Middleware lấy Bearer token, gọi PaymentService và gắn kết quả vào req.visit, tách khỏi req.user của tài khoản nội bộ. PaymentService kiểm tra đúng định dạng token `tcv_visit_` + 64 ký tự hex, băm SHA-256 rồi gọi PaymentStore. Store truy vấn tham số hóa bằng token_hash UNIQUE, join payment và lấy UTC_TIMESTAMP(3) trong cùng câu đọc.

Service yêu cầu payment PAID, phiên ACTIVE, có paid_at/activated_at/expires_at hợp lệ và expires_at lớn hơn thời gian SQL. Tại đúng thời điểm hết hạn, request bị từ chối. Không phụ thuộc đồng hồ ứng dụng, không tự gia hạn vé, không sửa status thành EXPIRED và không cần cron. Dữ liệu được đọc lại ở mỗi request, không cache quyết định quyền. Sau khi thay trạng thái thu hồi hoặc token_hash, request bảo vệ kế tiếp kiểm tra dữ liệu mới.

JWT STAFF/ADMIN không có quyền trên tuyến khách; token khách không có quyền trên tuyến nội bộ. Đăng xuất tài khoản nhân viên không thu hồi vé của khách vì hai phiên độc lập. API khách này không tạo audit thay đổi dữ liệu hoặc BUNDLE_ACCESS_LOGS: đây là xem phiên, không phải cấp bundle hay thống kê lượt khách.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A04 AC1, phần backend | Đã có middleware kiểm tra phiên và API được bảo vệ, local đạt | visitor.test: guest authentication looks up only SHA-256...; SQL/HTTP full cash flow... | Chưa localStorage và chưa áp dụng cho bundle/chatbot vì các API đó chưa code. Không ghi toàn bộ AC1 bao gồm frontend đã xong. |
| US-A04 AC2; QT-01; US-F01 AC4 | Đã kiểm chứng phần phân tách quyền và token không hợp lệ | visitor.test: malformed/unknown/tampered; guest HTTP... real STAFF/ADMIN; SQL/HTTP full cash flow... | Test HTTP fixture dùng JWT ký thật; test xuyên suốt đăng nhập STAFF sử dụng SQL thật. |
| NFR-06, phần server; QT-05 | Đã kiểm chứng hết hạn/thu hồi tại request kế tiếp | unit SQL deadline -1ms/đúng hạn; SQL/HTTP checks SQL again... | Ca SQL chủ động thay expires_at/trạng thái trong database tạm, không phải API thu hồi. Không kiểm chứng giao diện dừng hoặc thu hồi dữ liệu đã tải. |
| QT-13/14, chưa trả tiền không có quyền | Đã kiểm chứng kiểm tra payment và trạng thái hiện tại | SQL/HTTP: payment chuyển PENDING hoặc thiếu payment bị 401; unit PENDING/FAILED | Các thay đổi bất thường chỉ là fixture lỗi để xác minh fail-closed, không thêm endpoint hạ trạng thái payment. |
| NFR-08 | Đã kiểm chứng phần đầu vào/đầu ra API mới | unit injection, whitelist ba trường, Store parameterized hash; HTTP safe 503/no-store | Không trả/lưu raw token ở endpoint xem phiên. Chưa kiểm thử XSS/localStorage/trình duyệt thật. |
| NFR-13; kiến trúc 4.2–4.3 | Kiểm tra local đạt | lint 67 file JS; Service với Store thay thế; HTTP với SQL thật | Driver chỉ trong Store/config kết nối; middleware không gọi Store trực tiếp. |
| US-A03 AC4, QT-04, NFR-05 hồi quy | Test mốc trước và chuỗi nối mới đạt local | cash-exchange suites: đổi đồng thời chỉ một token, rollback, hết hạn; HTTP nhập lại trả 409 | Redis thật của phần nối mới chưa chạy local. CI của 45a2fe8 thuộc mốc 7. |
| US-A04 AC3–AC5; UC-03 bản đồ/bundle | Chưa làm / ngoài phạm vi hôm nay | Không có test chức năng chưa code | AC3 thuộc frontend; AC4–AC5 Could Have. Không gọi luồng nghe thuyết minh đã hoàn thiện. |

## Kết quả kiểm thử

Toàn bộ local: **217 test đạt, 0 lỗi**; kiểm tra cú pháp/phân lớp **67 file JavaScript đạt**. Mốc này có 10 test mới: 8 ca Service/Store/HTTP trong visitor.test.js và 2 ca HTTP với SQL thật trong cash-exchange.integration.test.js. Bộ test trước vẫn được chạy hồi quy.

SQL thực là **MariaDB 10.4.32**, database tạm ngẫu nhiên. Redis local dùng bản thay thế. **10 ca Lua/Redis thật không bật ở local**; dòng skipped=0 không có nghĩa các ca trong suite tắt đã chạy. 11 ca SQL của suite cash-exchange tự dùng Redis thật khi CI bật RUN_REDIS_TESTS=1; chưa xác minh phần nối mốc 8 trên MySQL 8/Redis thật hoặc CI mới.

Ca xuyên suốt gọi HTTP qua Router → middleware → Service → Store thật với login/JWT/hash/transaction/SQL thật; chỉ Redis được thay thế ở local. Trong CI, suite đó đã được cấu hình sử dụng Redis thật. Ca thu hồi/hết hạn sửa fixture trong database kiểm thử, không đụng database nghiệp vụ và không thêm chức năng quản trị chưa được yêu cầu.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-visitor-full-9b64a3e5ccec49ba8ba190c17bf8d06b\all-tests.log`.

## Demo tiền mặt qua Postman/API

Chuẩn bị SQL đã có schema/migration hiện hành, Redis, giá vé server hợp lệ và tài khoản STAFF thật được cấp. Dùng dữ liệu kiểm thử riêng, không dùng ví dụ dưới đây để tự đổi tiền hoặc trạng thái trong database nghiệp vụ. Các giá trị trong ngoặc nhọn là biến lấy từ phản hồi, không phải secret có sẵn.

1. `POST /api/auth/login` với email/password của STAFF được cấp. Giữ `{staffAccessToken}` từ data.accessToken.
2. `POST /api/payments` với body `{"paymentMethod":"CASH"}` và header `Idempotency-Key` là UUID v4 mới cho yêu cầu này. Giữ `{sessionId}`. Gửi lại cùng yêu cầu phải giữ cùng khóa, không tạo khóa mới để retry.
3. `GET /api/admin/payments/sessions/{sessionId}` với Bearer `{staffAccessToken}`. Kiểm tra đúng phiên và số tiền server. Đây chỉ là tra cứu, chưa xác nhận nhận tiền.
4. Sau khi đối chiếu/nhận tiền trong kịch bản demo, `POST /api/admin/payments/sessions/{sessionId}/confirm-cash`, body `{}`, Bearer STAFF. Nhận CASH/PAID, phiên ACTIVE và hạn vé.
5. `POST /api/admin/payments/sessions/{sessionId}/cash-code`, body `{}`, Bearer STAFF. Giữ shortedCode dưới dạng chuỗi.
6. `POST /api/payments/sessions/{sessionId}/exchange-cash-code`, body `{"shortedCode":"<mã thực vừa nhận>"}`. Không dùng JWT nhân viên thay mã. Giữ `{visitorToken}` và expiresAt.
7. `GET /api/visits/me` với Bearer `{visitorToken}`. Kỳ vọng 200, đúng sessionId và hạn vé gốc; không có token/hash trong phản hồi.
8. Kiểm tra âm: thiếu/sai token → 401; JWT STAFF ở API khách → 401; token khách ở API quản trị → 401; đổi lại mã đã dùng → 409 (hoặc 429 nếu đã vượt ngân sách thử). Không yêu cầu thanh toán lại khi mất token/phản hồi. Giới hạn khôi phục token vẫn như mốc 7.

Không cấu hình client polling /api/visits/me. Endpoint này cho việc xem/xác minh phiên khi cần và demo quyền truy cập; frontend sau này dùng expiresAt đã nhận để dừng tại chỗ theo báo cáo. Các API nội dung tương lai phải áp dụng middleware khách phù hợp, không được dựa riêng vào việc đã gọi /me trước đó.

## Word cần cập nhật sau khi duyệt

- Mục 4.2–4.3: middleware khách riêng, PaymentService.authenticateVisitor và Store đọc phiên bằng hash, API xem phiên tối thiểu. Không mô tả thành polling hoặc kiểm tra quyền ở client.
- US-A04/hiện trạng: phần backend kiểm tra phiên đã có; localStorage, dừng giao diện và bundle chưa có. Cấp lại token vẫn Could Have chưa code.
- Mục 4.4.4/ERD: không thay schema; bổ sung diễn giải sử dụng token_hash/expires_at hiện có nếu cần.
- Phần kiểm thử: ghi đúng luồng HTTP/SQL đã chạy, MariaDB/Redis thay thế ở local và CI mốc nào đã xác minh.

**Điểm dừng hôm nay:** có luồng tiền mặt đến sử dụng token ở API khách để kiểm thử; không bắt đầu nghiệp vụ mới. Mốc 8 chưa commit/push. Bản bàn giao 19/10 vẫn giữ nguyên và không được đưa vào commit mốc 7. Nguồn và độ tin cậy: Word 8 đọc trực tiếp, code và 217 test local; CI xanh đã xác minh cho commit 45a2fe8, chưa cho mốc 8.
