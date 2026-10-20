# Mốc 11 — Đổi mã ONLINE lấy token khách, nối luồng API

## Phạm vi và nguồn yêu cầu

Đọc lại `CNPM_BAOCAO (8).docx` trước khi triển khai: US-A02 AC1–AC4, US-A04 AC1–AC3; QT-01–QT-05, QT-13–QT-14; NFR-05/08/13/18; UC-01 luồng chính/ngoại lệ; giả định 1.6.2; kiến trúc 4.2–4.3 và AUDIT_LOGS/VISIT_SESSIONS/PAYMENTS ở 4.4.4. Áp dụng lựa chọn trực tiếp của người dùng: mã ONLINE 15 phút, retry giữ hạn cũ; FAILED được chuyển PAID khi SUCCESS hợp lệ đến muộn; chưa tích hợp cổng thật.

Mốc này chỉ thêm đổi authCode ONLINE một lần và kiểm thử đến API khách đã có. Không migration, không đổi tên cột/bảng, không sửa Word hoặc frontend. Không cấp lại token/mã, không bundle/audio/chatbot hoặc Payoo thật. Các AC giao diện và lưu token ở trình duyệt chưa đáp ứng trong mốc này.

## API và điều kiện cấp quyền

`POST /api/payments/sessions/:sessionId/exchange-online-code`

JSON chỉ gồm `authCode`: chuỗi hex thường 64 ký tự đã nhận khi tạo checkout. Không cần tài khoản/JWT nội bộ; mã là bí mật của khách. Không đặt mã trên URL. Phản hồi có `Cache-Control: no-store`.

Thành công 200: `{ data: { sessionId, token, tokenType: "Bearer", expiresAt } }`. Token ngẫu nhiên có tiền tố `tcv_visit_`, dùng header `Authorization: Bearer <token>` để gọi `GET /api/visits/me`. Không trả hash, audit, dữ liệu nhân viên hoặc secret gateway.

Router chuyển đầu vào tới PaymentService; helper `online-exchange.js` thuộc lớp Service. SQL và Redis chỉ ở Store. Kiểm tra giới hạn trước cả đầu vào sai. Mặc định cấu hình kỹ thuật riêng ONLINE là 60 giây, tối đa 30 lượt/IP và 5 lượt/phiên (`ONLINE_EXCHANGE_WINDOW_SECONDS`, `ONLINE_EXCHANGE_IP_LIMIT`, `ONLINE_EXCHANGE_SESSION_LIMIT`). Đây là mặc định triển khai, không phải số đã được báo cáo chốt. IP/phiên trong khóa giới hạn được hash; tách bộ đếm CASH. Redis bảo vệ lỗi thì từ chối an toàn 503.

Store khóa cặp payment/visit trong SQL transaction, dùng thời gian UTC từ database. Chỉ chấp nhận ONLINE/PAID, phiên ACTIVE chưa hết hạn, chưa có token và reissue_count bằng 0; confirmed_by phải NULL và các mốc thanh toán/kích hoạt hợp lệ. Yêu cầu audit PREPARE_ONLINE_CHECKOUT và ONLINE_CHECKOUT_READY của đúng lượt cấp mã. PENDING/FAILED bị từ chối trước khi đọc mã, không tiêu thụ hoặc đổi deadline của mã.

Redis kiểm tra mã, đúng phiên, TTL thực và deadline, so sánh bí mật bằng timingSafeEqual. Bước đọc không xóa mã hoặc gia hạn. Service đối chiếu issueId và deadline Redis với dấu chuẩn bị SQL. UPDATE hash có điều kiện kiểm tra lại thời gian tại lúc ghi: mã hết hạn trong khi xử lý cũng không được cấp token.

Hash SHA-256 của token và audit ISSUE_VISITOR_TOKEN commit cùng nhau. Không lưu token thô vào SQL/audit. Không cập nhật số tiền, paid_at, activated_at, expires_at hoặc reissue_count. Sau commit mới xóa mã bằng compare-delete theo issueId. SQL hash là chốt một lần: 20 yêu cầu đồng thời chỉ một token được lưu; lỗi xóa Redis không làm mất phản hồi token và không mở lần cấp thứ hai. CASH tiếp tục dùng phần transaction chung, có chạy hồi quy toàn bộ.

## Ca lỗi và giới hạn phục hồi

Đầu vào sai 400; không tìm thấy phiên 404; vượt giới hạn 429. PENDING/FAILED, sai phương thức, phiên không ACTIVE/hết hạn/đã có token hoặc dữ liệu không nhất quán trả 409. Mã sai, mất hoặc hết hạn trả 401; Redis/cấu hình/lưu SQL không xác định trả 503 với thông báo an toàn.

SQL/audit lỗi trước commit rollback hash và giữ mã để thử lại trong hạn. Đã PAID nhưng mã mất/hết hạn vẫn giữ PAID để đối soát; không tạo giao dịch hoặc mã thay thế. Nếu commit đã thành công nhưng mất xác nhận/phản hồi HTTP, hệ thống không cấp token lần hai. Chưa có cơ chế khôi phục/cấp lại; khách cần liên hệ nhân viên và không tự thanh toán lại. Đây là giới hạn hiện tại, không coi đã làm chức năng cấp lại Could Have.

Webhook hợp lệ đến muộn vẫn được ghi nhận dù mã hết hạn/Redis lỗi, nhưng không tự sinh quyền truy cập mới. Sau cấp token, gửi lại SUCCESS/FAILED không đổi PAID, hạn vé hoặc kích hoạt lại phiên bị thu hồi. Middleware khách đọc trạng thái hiện tại từ SQL mỗi request, nên token của phiên bị thu hồi hoặc payment chưa PAID bị từ chối.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A02 AC1 | Có backend MockGateway và công cụ SUCCESS/FAILED, local đạt | Hồi quy checkout, webhook và HTTP/operator trong online-checkout.integration.test.js | Không có UI/cổng thật; không tuyên bố thanh toán tiền thật. |
| US-A02 AC2–AC3; QT-02/03 | Local đạt chữ ký, đối chiếu tiền, chống lặp | Suite webhook; SQL mixed concurrent callbacks; full HTTP ONLINE | PAID không bị hạ; FAILED → PAID theo quyết định người dùng. |
| US-A02 AC4; UC-01 đổi mã | Backend local đạt đổi một lần sau PAID; PENDING không tiêu thụ | online-exchange.test.js: PENDING/FAILED; 20 concurrent; SQL full HTTP ONLINE | Mất/hết mã không cấp lại; không gửi token qua redirect. |
| US-A04 AC1, phần backend | Local đạt token/hash, giữ hạn vé và API bảo vệ | SQL stores one token hash/audit; full HTTP ONLINE reaches protected guest API | LocalStorage và giao diện chưa triển khai. |
| US-A04 AC2; QT-04/05 | Local đạt từ chối token sai/hết hạn/thu hồi, tách nội bộ/khách | Hồi quy visitor.test.js; full HTTP ONLINE gồm role separation/revocation | Không nhận authCode làm token; không gia hạn vé khi đổi mã. |
| US-A04 AC3, phần giao diện; cấp lại Could Have | Chưa làm trong mốc này | Không có test giao diện/cấp lại | Thông báo backend có hướng dẫn đối soát, chưa phải quy trình giao diện. |
| QT-13/14; NFR-05 | Local đạt một lượt cấp, tiền và hạn bất biến | 20 exchanges across two Stores; cleanup/lost commit; a code expiring after Redis read | Redis không tham gia SQL transaction; SQL là chốt chống cấp lặp. |
| NFR-08, phần API/token | Local đạt kiểm tra đầu vào, giới hạn, phản hồi an toàn | HTTP no-store; malformed input; sixth session/31st IP; wrong/cross-session codes | Chưa kiểm thử triển khai mạng/TLS hoặc trình duyệt. |
| NFR-13 | Local đạt phân lớp/cú pháp | check.js kiểm tra 80 file JavaScript | Dịch vụ ngoài qua MockGateway; không driver trong Service. |
| NFR-18, tính nguyên tử/audit | Local đạt rollback và bất định commit | SQL trigger lỗi cập nhật token/audit; lost commit acknowledgement | Giữ PAID, không tự thu tiền/cấp token lại khi lỗi. |

## Kiểm chứng

Toàn bộ **288 test local đạt, 0 lỗi**; kiểm tra cú pháp/phân lớp **80 file JavaScript đạt**. Mốc này thêm 23 test local: 13 Service/HTTP/cấu hình, 9 SQL/HTTP và 1 Redis Store dùng client thay thế. Suite SQL ONLINE hiện có 29 test; ca hết TTL cũ được mở rộng kiểm tra từ chối đổi mã sau webhook muộn.

SQL thực tế local là **MariaDB 10.4.32**; Redis trong luồng tích hợp dùng bản thay thế. **15 ca Redis thật trong các suite riêng chưa bật local**, bao gồm 2 ca mới về inspect/TTL/compare-delete. `skipped=0` của lần chạy này không chứng minh đã chạy các suite bị tắt bằng cờ môi trường. Chưa kiểm chứng MySQL 8, Redis 7, CI hoặc release smoke cho ba mốc ONLINE mới; phải push và chờ CI xanh trước mốc nghiệp vụ kế tiếp.

Log local: `C:\Users\Admin\AppData\Local\Temp\tcv-online-token-full-48d2e9360a684a44b8205b60507f2088\all-tests.log`.

## Demo backend/API có thể thực hiện

Chuẩn bị database đúng migration, Redis hoạt động, giá VISIT_PRICE_VND đã chốt, PAYMENT_GATEWAY=mock, MOCK_PAYMENT_BASE_URL đúng origin backend và MOCK_WEBHOOK_SECRET riêng. Không đưa secret ký cho khách; không commit .env. Đây là hướng dẫn demo với dịch vụ đã cấu hình, không khẳng định môi trường runtime hiện tại đã sẵn sàng.

1. Gửi POST `/api/payments/online-checkout`, body `{}`, header Idempotency-Key là UUID v4 mới. Giữ sessionId, paymentRef và authCode trong công cụ API riêng của khách; kết quả PENDING. Retry cùng khóa khi còn hạn giữ nguyên mã/deadline.
2. Mở paymentUrl chỉ nhận summary JSON. Thêm result=SUCCESS không xác nhận tiền. Thử POST endpoint exchange-online-code với authCode khi PENDING: 409, mã còn nguyên.
3. Từ terminal phía server, trong backend chạy `npm run mock:payment -- <paymentRef> FAILED`: payment FAILED, chưa có quyền. Sau đó chạy cùng ref với SUCCESS: PAID/ACTIVE trên chính giao dịch cũ. Công cụ ký webhook mock, không thu tiền thật.
4. Gửi POST `/api/payments/sessions/<sessionId>/exchange-online-code`, body `{"authCode":"<mã đã nhận>"}`. Nhận một token và hạn vé gốc. Gọi GET `/api/visits/me` với Bearer token: 200, thông tin tối thiểu.
5. Đổi lại cùng mã: 409; gửi lại webhook SUCCESS/FAILED không đổi tiền/hạn; token khách vào API nhân viên bị từ chối. Không sửa SQL nghiệp vụ để demo thu hồi/hết hạn; các ca đó được kiểm chứng trên database tạm trong test.

Luồng ONLINE hoàn chỉnh ở phạm vi backend/API: checkout mock → webhook hợp lệ → đổi mã một lần → API khách. Chưa phải toàn bộ hệ thống tham quan: chưa frontend thanh toán, bundle, audio, chatbot hoặc tích hợp Payoo.

## Git và báo cáo cần cập nhật

Mốc 9: commit local 1d6447e. Mốc 10: commit local dd00702. Mốc 11 được chốt thành commit riêng sau kiểm chứng. **Chưa push**, theo yêu cầu push chung phần ONLINE sau. Các ghi chú chưa có webhook/đổi mã trong tài liệu mốc trước là phạm vi lịch sử.

Word chưa sửa. Khi cập nhật dựa trên code: UC-01 cần mô tả endpoint đổi mã, PENDING/FAILED không tiêu thụ, đồng thời một lần, lỗi SQL/Redis và mất phản hồi sau commit. Mục 4.2–4.3 bổ sung helper Service/Store ONLINE và thứ tự SQL commit rồi Redis cleanup. Mục 4.4.4 mô tả token_hash/audit hiện có và dấu PREPARE/READY; **không có thay đổi schema/ERD ở mốc 9–11**. Cập nhật hiện trạng và bằng chứng kiểm thử, phân biệt mock, local MariaDB và CI chưa chạy. Các thay đổi schema mốc 3 vẫn theo tài liệu mốc 3, không phát sinh thêm cột trong mốc này.

Nguồn và độ tin cậy: báo cáo Word 8 được đọc lại, quyết định trực tiếp của người dùng, code và 288 test local; Payoo/UI/MySQL 8/Redis thật/CI mới chưa kiểm chứng như giới hạn nêu trên.
