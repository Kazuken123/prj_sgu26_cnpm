# UC-18 — API giám sát và thống kê (backend)

Ngày thực hiện: 21/10/2026. Nguồn yêu cầu: `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên; đã đọc lại US-G01 AC1–3, US-F01 AC4, QT-12, NFR-16, UC-18, giả định 1.6.2, thiết kế 4.2/4.3 và bảng liên quan 4.4.4 trước khi sửa.

Phạm vi này là API ADMIN, chưa phải toàn bộ UC-18/US-G01: chưa có dashboard/polling, chưa nối thống kê chatbot của thành viên UC-08/15. Không sửa frontend, Word, schema, dữ liệu demo hoặc provider.

## Hợp đồng API

`GET /api/admin/monitoring` dùng Bearer access token nội bộ của ADMIN đang có phiên và quyền hợp lệ. STAFF, token khách hoặc JWT hết hạn/đã logout không đọc được. Kiểm quyền/trạng thái tài khoản hiện tại ở mỗi request, không chỉ tin role trong JWT. Trả `Cache-Control: no-store`, không cung cấp phương thức ghi.

Không gửi bộ lọc: 24 giờ ngay trước thời điểm UTC đọc từ MySQL. Nếu chọn khoảng, phải gửi đủ `from` và `to`, ISO UTC `YYYY-MM-DDTHH:mm:ss[.sss]Z`, `from < to`. Không nhận offset khác Z, ngày tự cuộn sang tháng sau, tham số lặp/không hỗ trợ hoặc chỉ một đầu mút. Khoảng **[from,to)**: gồm đầu, không gồm cuối. Sai đầu vào trả 400 `VALIDATION_ERROR`, không truy vấn thống kê.

Ví dụ: `/api/admin/monitoring?from=2026-10-20T00:00:00Z&to=2026-10-21T00:00:00Z`. Ví dụ thời gian này chỉ minh họa, không khẳng định ngày nào đã có hoạt động.

JSON thành công có `data.asOf` (mốc giờ MySQL trong lần tổng hợp), `generatedAt` (hoàn tất tạo phản hồi), `window` (from/to, timezone UTC, interval), `metrics` và `health`. Các truy vấn số liệu SQL chia sẻ giao dịch REPEATABLE READ; không ghép số đếm lấy ở nhiều snapshot khi có thao tác đồng thời. Health được kiểm riêng, có `checkedAt`, không coi đó là lịch sử sức khỏe.

## Định nghĩa đã được người dùng duyệt

* `activePaidVisits`: số phiên hiện **PAID + ACTIVE + chưa hết hạn**, có paid_at/activated_at hợp lệ, kể cả chưa đổi token. Không yêu cầu token_hash; không lọc theo khoảng thanh toán/bundle. Scope `CURRENT`, đơn vị `visit_sessions`. Đây là phiên đủ điều kiện hiện tại, không phải số người đang ở trong khuôn viên hoặc đang mở ứng dụng.
* `paidPayments`: số bản ghi PAID có paid_at trong khoảng; tổng tiền SQL DECIMAL chính xác, trả chuỗi thập phân theo từng currency. Không cộng khác tiền tệ thành một số; không ép tổng tiền sang Number. Đơn vị số đếm `payments`, scope `WINDOW_PAID_AT`. PAID sau đó hết hạn/thu hồi phiên vẫn là giao dịch đã thu. Không đếm audit/webhook/đổi token làm giao dịch mới. Không có giao dịch thì count=0, totals=[], không tự đoán currency.
* `bundleAccess`: tổng bản ghi BUNDLE_ACCESS_LOGS trong khoảng created_at, số session_id phân biệt toàn khoảng và mỗi ngôn ngữ. Đơn vị `bundle_issuances`, scope `WINDOW_CREATED_AT`. Tải lại tạo lượt cấp bundle khác; một phiên tải VI/EN vẫn chỉ là một uniqueSessions toàn khoảng. Không cộng uniqueSessions theo ngôn ngữ thành tổng khách; không khẳng định trình duyệt nhận trọn hoặc đã nghe audio. Ngôn ngữ là ngôn ngữ yêu cầu đã lưu trong log, không phải ngôn ngữ fallback.
* `contentJobs`: trạng thái **toàn bộ bản ghi hiện có**, bao gồm phiên bản cũ, không lọc theo khoảng. Scope `CURRENT_ALL_VERSIONS`, đơn vị `jobs`; PENDING/PROCESSING/COMPLETED/FAILED. Retry thay trạng thái cùng job không thành lượt xử lý lịch sử mới.
* `audioRecords`: trạng thái **toàn bộ AUDIOS hiện có**, kể cả bản ghi phiên bản cũ/POI không hoạt động. Scope `CURRENT_ALL_RECORDS`, đơn vị `audio_records`; PENDING/AVAILABLE/FAILED. Không kiểm file hoặc khả năng phát trong thống kê này; AVAILABLE trong bảng không có nghĩa mọi file đang phát được. Không dùng số này làm số audio hiện hành đã nghiệm thu.
* `chatbot`: `status=NOT_IMPLEMENTED`, `value=null`, `scope=NOT_INTEGRATED`, `updatedAt=null`. Chưa đọc CHAT_LOGS và chưa tích hợp phần UC-08/15; tuyệt đối không trình bày là 0 câu hỏi đã đo được.

Mỗi chỉ số đã đọc được có status AVAILABLE, value, unit, scope và updatedAt. Truy vấn thành công không có dòng trả số 0/danh sách rỗng. updatedAt là thời điểm tổng hợp của lần đọc, không phải lịch sử thay đổi từng bản ghi.

## Health và nguồn không khả dụng

`health.liveness=UP` vì backend đang xử lý request. `health.database` và `health.redis` gọi lại HealthStore hiện có, không chỉ suy ra từ số liệu. Redis dùng PING qua Store, hạn kết nối 1 giây/hạn thao tác 2 giây và không reconnect vô hạn như cơ chế đã có. Các truy vấn số liệu có timeout 2 giây mỗi truy vấn; không tuyên bố SLA 2 giây cho toàn request hoặc toàn hàng đợi kết nối.

`health.readiness=READY` chỉ khi các kiểm SQL/Redis thành công và cả năm nhóm thống kê đã triển khai đều AVAILABLE; ngược lại NOT_READY. NOT_IMPLEMENTED của chatbot biểu thị phạm vi còn thiếu, không bị giả thành nguồn đã kiểm tra. Hợp đồng này không thay đổi `/health/ready` đang dùng cho Docker.

Lỗi câu truy vấn xác định không hủy transaction (thiếu bảng/cột hoặc không được cấp quyền đọc bảng/cột) đánh dấu nhóm tương ứng UNAVAILABLE, value=null và updatedAt=null; các nhóm còn đọc được vẫn trả về cùng snapshot. HTTP 200 ở đây chỉ nghĩa có phản hồi thống kê có cấu trúc, **không có nghĩa mọi nguồn READY**. Frontend phải đọc status của từng nhóm và health.

Các lỗi kết nối, timeout, transaction, trạng thái/số liệu không hợp lệ khác trả HTTP 503 `MONITORING_UNAVAILABLE`, thông báo an toàn; không trả SQL, mật khẩu, stack hoặc số liệu ghép từ transaction đã hỏng. Transaction conflict được xử lý bởi cơ chế rollback/retry hiện có của AuthStore. Không nuốt deadlock thành một nhóm null rồi đọc tiếp trên snapshot khác.

Không cache số liệu trong backend. Frontend tương lai có thể giữ phản hồi cũ nhưng phải gắn nhãn dữ liệu cũ và thời điểm cập nhật cũ, dừng polling khi mất quyền/rời trang. API không trả số 0 thay cho lỗi và không tự ghi timestamp mới cho số liệu cũ.

## File và trách nhiệm

Thêm `routers/monitoring.router.js`, `services/monitoring.service.js`, `services/monitoring.validation.js`, `stores/monitoring.store.js`, hai file test `monitoring.test.js` và `monitoring.integration.test.js`. `server.js` chỉ nối router/service, có injection cho kiểm thử. Tái sử dụng xác thực nội bộ, chuẩn lỗi, HealthStore/RedisStore và transaction Store có sẵn. Router không SQL/Redis; Service không gọi driver; không thêm schema/migration/dependency/thành phần vận hành.

## Đối chiếu yêu cầu và kiểm thử

| AC / QT / NFR | Đáp ứng ở mốc này | Kiểm thử chứng minh | Giới hạn |
| --- | --- | --- | --- |
| US-G01 AC1; US-F01 AC4; UC-18 E1 | API ADMIN; tách liveness/dependencies/readiness | HTTP rechecks current role…; unauthorized actors…; actual healthy dependencies… | Chưa dashboard, refresh/polling UI |
| US-G01 AC2; QT-12 | Phiên, PAID/tiền, bundle/ngôn ngữ, trạng thái job/audio | active paid visits…; repeated cash confirmations…; bundle reloads…; jobs include old versions…; revenue retains exact decimal strings… | Chatbot NOT_IMPLEMENTED; không coi toàn AC2 hoàn tất |
| US-G01 AC3; UC-18 A1/E2/E3; NFR-16 | Có đơn vị, mốc giờ, khoảng, zero khác lỗi; không thu GPS | empty database…; invalid filters…; partial SQL source outage…; real Redis unavailable endpoint… | Chưa UI giữ số cũ/gắn nhãn cũ/dừng polling |
| UC-18 A2/hậu điều kiện; QT-12 | Đọc không sửa nghiệp vụ, kiểm soát đồng thời | HTTP rejects invalid filters and write methods…; all SQL metrics use one repeatable-read snapshot… | Một snapshot mỗi request, không lịch sử nhiều request |
| Kiến trúc US-16 AC1/AC2; 4.2/4.3 | Router → Service → Store, tái sử dụng lớp sẵn có | Lint kiểm import lớp; unit/SQL/HTTP tests | Không thay provider, schema hay cấu hình chung |

Kiểm thử dùng database fixture UUID mới, MySQL 8 và Redis thật trong mạng thử riêng, ngoài OneDrive; không init lại DB demo, không dừng Redis demo. Ca Redis không truy cập được dùng endpoint cục bộ đã đóng, sau đó khôi phục URL Redis thử và kiểm lại; không diễn giải đây là thử cắt điện container production. Ca lỗi từng nguồn chạy truy vấn lỗi thật có kiểm soát; ca lỗi transaction ngoài danh sách được chặn 503.

Kết quả bộ kiểm thử mới: **18/18 đạt, 0 lỗi, 0 hủy, 0 bỏ qua**. Hồi quy toàn bộ backend trên bản cuối: **530/530 đạt, 0 lỗi, 0 hủy, 0 bỏ qua**; lint kiểm **141 file JavaScript**. Chạy bằng Node 20, MySQL 8 và Redis thật, ngoài OneDrive. Không sửa code sau lần hồi quy này; chỉ bổ sung tài liệu kết quả. Chưa chạy CI của mốc UC-18 vì chưa commit/push; CI xanh của HEAD nền không thay cho CI bản thay đổi này. Chưa kiểm tải lớn/staging hoặc UI monitoring.

Log, bản sao kiểm thử và SHA256 đối chiếu bảy file JavaScript được giữ ngoài repo tại `C:\Users\Admin\Documents\Codex\TCV_UC18_20261021`: `evidence/targeted.log`, `evidence/full.log`, `evidence/source-sha256.txt`, `KET_QUA_UC18.md`. Hai dịch vụ MySQL/Redis thử riêng được dừng sau khi xác minh; không xóa volume hoặc dữ liệu. Bản demo trên cổng 18080 chưa được triển khai lại và vẫn chạy phiên bản nền.
