# Mốc 6 — Cấp mã ngắn sau thanh toán tiền mặt

## Nguồn và quyết định triển khai

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên ngày 19/10/2026: US-A03 AC2–AC4, US-F01 AC4, US-F02 AC3; UC-02/11 đầy đủ; QT-01/03/04/05/12/13/14; NFR-05/07/08/13/14/18; mục 1.6.2, kiến trúc 4.2–4.3 và bảng/ràng buộc tại 4.4.4. Mục 4.4.1 cũng ghi mã ngắn và mã đổi quyền dùng Redis TTL, không cần bảng MySQL riêng.

QT-04 chưa chốt con số thời hạn và chính sách mã hết hạn. Sau khi được hỏi, người dùng giao chọn phương án thực tế và triển khai. Lựa chọn: mã ngắn **6 chữ số ngẫu nhiên**, mặc định **600 giây**, cấu hình được; hạn mã không vượt hạn vé. Nếu mã hết hạn hoặc mất khỏi Redis, nhân viên được tạo mã mới cho chính phiên đã trả tiền còn hạn **chỉ khi chưa có token**. Đây là cấp lại mã chưa đổi, không phải Could Have cấp lại token đã mất.

Mốc này chỉ làm phần cấp mã của UC-11 bước 7–8/E4. Đã có code sinh auth_code và ánh xạ mã ngắn sau PAID. **Chưa triển khai US-A03 AC4, đổi mã lấy token, bảo vệ API khách hoặc frontend.** Không mở rộng sang ONLINE/Payoo, không đổi schema và không sửa Word.

## Cách gọi API

Sau khi `POST /api/admin/payments/sessions/:sessionId/confirm-cash` đã ghi nhận PAID, gọi:

`POST /api/admin/payments/sessions/:sessionId/cash-code`

Yêu cầu access token STAFF/ADMIN; body bỏ trống hoặc `{}`. Không nhận mã hoặc TTL do client gửi. Đây là bước API riêng để có thể thử lại cấp mã mà không thực hiện lại xác nhận tiền. Endpoint confirm-cash không tự trả mã; phía gọi phải hoàn thành bước cash-code để đi hết phần cấp mã của UC-11.

Kết quả 200, `{data: ...}` gồm đúng năm trường:

```text
sessionId, shortedCode, codeExpiresAt, visitExpiresAt, reused
```

`shortedCode` tương ứng mã ngắn `shorted_code` trong báo cáo; luôn là chuỗi để giữ chữ số 0 đầu. `codeExpiresAt` và `visitExpiresAt` trả qua HTTP ở dạng ISO UTC. `reused=true` khi dùng mã còn hạn đã có; không kéo dài TTL. `auth_code` không trả cho nhân viên hoặc khách tại endpoint này. Phản hồi có `Cache-Control: no-store`.

Điều kiện: đúng CASH/PAID, phiên ACTIVE còn hạn, có paid_at/activated_at/expires_at hợp lệ, token_hash NULL và reissue_count bằng 0. Thiếu/sai JWT, hết hạn, logout hoặc tài khoản bị khóa bị từ chối theo AuthService hiện có; Store kiểm tra lại tài khoản trong transaction trước cả lần tạo mới lẫn lần dùng mã cũ.

ID sai hoặc body chứa thuộc tính: 400. Không có phiên: 404. ONLINE, chưa PAID, REVOKED, vé hết hạn, dữ liệu thiếu hoặc đã có token: 409 với mã lỗi tương ứng. TTL cấu hình sai: 503. Redis lỗi/timeout/trạng thái hỏng: 503 `CASH_CODE_UNAVAILABLE`; không trả mã thành công giả. Lỗi lưu audit/SQL: 503 `CASH_CODE_PERSISTENCE_UNAVAILABLE`, hướng dẫn đối soát và thử trên cùng phiên. Mã hết hạn trong lúc chuẩn bị phản hồi: 409 `CASH_CODE_EXPIRED_RETRY`.

Không tạo payment mới, không sửa tiền, người xác nhận, paid_at, activated_at, expires_at, token_hash hoặc reissue_count. API cấp mã không phải API cấp quyền tham quan.

## Lưu mã và xử lý đồng thời

PaymentStore khóa tài khoản và cặp payment/session theo cùng thứ tự với phần xác nhận tiền. Service đọc thời gian UTC của database sau khi có khóa, xác minh điều kiện rồi gọi RedisStore. Driver SQL và Redis chỉ nằm ở Store; Router không có nghiệp vụ hoặc thao tác dữ liệu.

RedisStore dùng Lua create-or-reuse trên **một key mỗi phiên**: `tcv:cash-code:v1:<sessionId>`. Giá trị JSON tạm gồm sessionId, issueId ngẫu nhiên để đối chiếu audit, authCode 32 byte ngẫu nhiên, shortedCode 6 chữ số và expiresAtMs. AuthCode dùng 256 bit ngẫu nhiên, không suy ra từ sessionId hoặc mã ngắn. Một bản ghi biểu diễn ánh xạ cặp (sessionId, shortedCode) sang authCode; không cần hai key có thể bị lưu nửa chừng.

Mã được giữ ở dạng sử dụng được trong Redis tạm thời theo TTL, không ghi vào MySQL hoặc log. Audit/HTTP không chứa authCode; HTTP nội bộ chỉ trả mã ngắn để bàn giao. Redis phải được bảo vệ ở hạ tầng; code không ghi URL/credential Redis vào log.

Script dùng thời gian Redis, kiểm tra hạn vé, đọc mã cũ và TTL. Có mã còn hạn thì trả lại nguyên bản, không refresh TTL. Chưa có hoặc đã hết hạn thì lưu bản ghi mới cùng PX TTL trong một thao tác. TTL thực tế được tính từ deadline tuyệt đối, tối đa hạn vé. Dữ liệu hỏng, thiếu TTL hoặc vượt hạn vé bị từ chối; không tự bỏ bảo vệ. Hai phiên có thể ngẫu nhiên trùng sáu chữ số nhưng ánh xạ độc lập; mốc đổi mã sau phải gửi và kiểm tra cả sessionId.

SQL và Redis không cùng transaction. Vì tiền đã commit ở bước trước, lỗi cấp mã không được rollback kết quả thanh toán. Các tình huống được xử lý như sau:

1. Redis không ghi được: trả 503, không audit mã mới và không đổi payment/phiên. Thử lại cùng endpoint/session sau khi phục hồi.
2. Redis đã ghi nhưng mất phản hồi: chưa trả mã; lần sau dùng đúng bản ghi đang còn hạn, không tạo lại hoặc kéo dài TTL.
3. Redis đã ghi nhưng audit/commit SQL lỗi: mã tạm có thể vẫn tồn tại. Không trả thành công khi audit chưa commit. Lần thử lại dùng issueId của bản ghi Redis để bổ sung audit còn thiếu trước khi trả mã.
4. Audit đã có hoặc phản hồi HTTP bị mất: lần thử lại giữ mã, thời điểm và audit cũ. Các thao tác cùng phiên được khóa để không cùng ghi trùng audit.
5. Mã hết hạn trước khi khách đổi: tạo chu kỳ mã mới trên payment cũ, audit mới với issueId mới; không tăng reissue_count hoặc hạn vé. Nếu token_hash đã có thì từ chối, kể cả Redis không còn mã.

Audit `ISSUE_CASH_CODE` dùng resource_type `CASH_ACCESS_CODE`, resource_id là issueId ngẫu nhiên, không phải authCode/mã ngắn. Details chỉ gồm sessionId, paymentRef và hạn mã. Không dùng audit làm nơi lưu hoặc khôi phục bí mật.

Đây chưa phải cơ chế tiêu thụ mã một lần. Mốc đổi token phải phối hợp cùng khóa payment/visit, kiểm tra MySQL và nguyên tử khi tiêu thụ Redis; không được coi việc script cấp mã đã nguyên tử là bằng chứng rằng hai yêu cầu đổi token không thể cùng thành công.

## Cấu hình và schema

`CASH_CODE_TTL_SECONDS=600` trong các file env ví dụ và Docker Compose. Thiếu biến dùng 600; giá trị rỗng, không nguyên dương hoặc vượt phạm vi tính toán an toàn bị từ chối. Đổi TTL cấu hình không refresh mã còn hạn đã có, chỉ ảnh hưởng lần sinh mới. Mọi mã đều bị giới hạn bởi expires_at đã lưu của vé.

Không thêm bảng/cột/chỉ mục, không có migration mới, không sửa migration đã push. Không triển khai Could Have cấp lại token. Không đổi frontend, Word hoặc slide.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-A03 AC2, phần auth_code | Đã có code tạo sau bước xác nhận; local dùng Redis thay thế | `paid cash code is random, session-bound...`; SQL `issue after confirmation writes only code audit...` | Phải gọi đủ confirm-cash rồi cash-code. Chưa coi một POST confirm-cash đã cấp mã hoặc toàn bộ luồng tiền mặt đã xong. |
| US-A03 AC3; UC-11 bước 7–8 | Đã có backend; cần Redis thật/CI xác nhận | Unit mã 6 số, 600 giây; SQL ánh xạ/audit; `redis-cash-code.test.js` | Chưa có UI bàn giao; Lua thật chưa chạy tại máy này. |
| US-A03 AC4; NFR-05 phần đổi mã | Chưa triển khai | Chưa có endpoint đổi token | Không tuyên bố đã chống đổi mã hai lần hoặc đã kiểm thử nhập mã sai/hết hạn ở endpoint đổi. |
| UC-11 E4 | Đã kiểm chứng local với Redis thay thế | `Redis outage after money commit...`; `reply lost after Redis write...`; `audit rollback leaves money intact...` | Giữ PAID, số tiền và hạn vé; thử lại không tạo giao dịch mới. |
| QT-01/12; US-F01 AC4 | Đã kiểm chứng endpoint nội bộ mới | HTTP JWT thật: sai chữ ký, hết hạn, visitor, tài khoản khóa, logout; SQL `account state is checked again...` | HTTP dùng Store xác thực thay thế; SQL recheck dùng database thật. |
| QT-03/05/13/14 | Đã kiểm chứng không ghi tiền hoặc gia hạn | SQL snapshot trước/sau; `12 concurrent requests from two accounts...` | Không sửa payment/session, không coi lỗi cấp mã là chưa trả tiền. |
| QT-04, phần sinh ngẫu nhiên/TTL/gắn phiên | Có code và test thay thế; Lua thật chờ CI | Unit giới hạn hạn vé; `Real Redis cash-code atomic creation, expiry and retry` | Chỉ phần cấp mã. Kiểm tra cặp khi đổi, giới hạn nhập sai và tiêu thụ một lần chưa làm. |
| Chính sách mã hết hạn được người dùng giao chọn | Đã kiểm chứng local | Unit `expired unused code can be replaced...`; SQL `missing or expired Redis record...` | Mã mới trước token, giữ payment/hạn vé. SQL test cưỡng bức xóa key; TTL thật kiểm tra ở suite Redis riêng. |
| US-F02 AC3; NFR-18 phần audit | Đã kiểm chứng SQL với Redis thay thế | SQL audit khớp người thực hiện, issueId, details; lỗi audit và retry | Audit không chứa bí mật; không sửa schema. Chưa làm ADMIN xem/lọc log. |
| NFR-07 | Một phần | Test outage/timeout client và test Service từ chối cấp mã | Chưa có endpoint nhập mã nên ngưỡng thử theo IP/phiên chưa làm. Redis lỗi không cấp mã thành công giả. |
| NFR-08 | Đã kiểm chứng đầu vào/đầu ra mới | Body/ID injection; whitelist năm trường; lỗi HTTP an toàn; audit whitelist | SQL tham số hóa; không lộ authCode/hash/Redis URL trong phản hồi/audit. Chưa thử frontend hoặc XSS trình duyệt. |
| NFR-13 | Đạt kiểm tra local | Lint 59 tệp JS; Service với Store thay thế | Driver chỉ trong Store; không có nhà cung cấp ngoài cần adapter trong phần này. |
| NFR-14 | Local đạt; CI mới chưa chạy | 178 test local không lỗi | CI xanh của commit 7f021b8 là mốc trước, không phải bằng chứng cho thay đổi này. |

## Kết quả kiểm thử và giới hạn

**178 test local đạt, 0 lỗi**, gồm **62 test SQL integration** trên **MariaDB 10.4.32**. Mốc mới có 23 test đã chạy: 11 Service/HTTP/cấu hình, 10 SQL với Redis thay thế, 2 RedisStore với client thay thế. Lint 59 tệp JS đạt.

Năm ca Redis thật mới kiểm tra create-or-reuse đồng thời, không refresh TTL, hết TTL thực tế, ánh xạ độc lập giữa phiên, và dữ liệu hỏng/thiếu TTL. Cùng ba ca Redis thật cũ, **tám ca này chưa chạy tại máy hiện tại** vì chưa có Redis hoạt động. Runner bỏ qua cả suite nên dòng tổng `skipped 0` không có nghĩa đã chạy hết các ca Redis thật.

CI hiện có RUN_DB_TESTS=1 và RUN_REDIS_TESTS=1: khi chạy sau khi push, 10 test SQL mới tự sử dụng Redis thật thay vì bản thay thế; năm ca Lua mới cũng bắt buộc chạy. Không âm thầm bỏ qua Redis nếu đã bật cờ. Chưa xác nhận MySQL 8, Lua Redis 7 hoặc Docker Compose cho code mới ở lượt này.

Các ca đồng thời local gồm 20 retry bằng Store thay thế và 12 lượt từ hai tài khoản qua Store SQL thật. Điều này không thay thế bằng chứng Lua thực thi trên Redis thật và không phải đo hiệu năng. Mất phản hồi Redis được mô phỏng sau khi Store ghi xong; lỗi audit được cưỡng bức bằng trigger trong database tạm. Không chạm database nghiệp vụ, không dùng FLUSHDB/FLUSHALL.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-cash-code-8e7b0f4d7f9d440090045707745c0649\all-tests.log`.

## Các đoạn báo cáo cần cập nhật sau khi duyệt

1. QT-04 và phần cấu hình thiết kế Redis: thêm 6 chữ số, mặc định 600 giây, cap theo hạn vé; ghi rõ cấu hình do nhóm chọn theo quyền người dùng giao, không phải giá trị đã có sẵn trong báo cáo.
2. UC-11 bước 7/A2/E4: mô tả gọi bước cấp mã sau xác nhận, dùng lại mã còn hạn, retry sau lỗi/mất phản hồi và mã hết hạn được tạo mới chỉ khi chưa có token. Giữ nguyên nguyên tắc không thu tiền/gia hạn lại; chưa phải cấp lại token Could Have.
3. UC-02 bước nhận/nhập mã: ghi rõ phải giữ sessionId cùng mã ngắn; phần nhập mã đổi token vẫn là thiết kế chưa triển khai.
4. Mục 4.2–4.3 và phần lưu Redis: bổ sung PaymentService, hai Store, key theo phiên, một bản ghi TTL ánh xạ mã, audit issueId và giới hạn transaction SQL–Redis. Mục 4.4.4 và ERD không cần thêm cột hoặc quan hệ.
5. Truy vết US-A03 AC2–AC4 và hiện trạng/test: phân biệt code tạo mã đã có, các test Redis thật chưa chạy, frontend chưa có, endpoint đổi token chưa làm. Không ghi toàn bộ thanh toán tiền mặt hoàn thành.

Chưa commit/push. Không bắt đầu mốc đổi token trước khi mốc này được push theo yêu cầu và CI xanh. Nguồn và độ tin cậy: báo cáo (8) đọc trực tiếp, quyết định người dùng giao chọn phương án và code/test local; phần Redis thật/MySQL 8/CI mới còn chờ xác nhận đã ghi rõ.
