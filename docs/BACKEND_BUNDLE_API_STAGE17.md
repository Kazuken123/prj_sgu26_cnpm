# Mốc 17, phần 2 — API bundle khách có xác thực

## Trạng thái và nguồn

Đã triển khai, kiểm chứng bằng unit và HTTP/integration trên MySQL 8.0.46 + Redis 7.4.11, chưa commit/push/CI mới, chưa deploy staging hoặc sửa frontend/Word. HEAD nền vẫn 70b3d32416a60932eb582863439a296402016d9f; CI nền xanh tại https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39406346270 không thay bằng chứng cho thay đổi này.

Đã đọc lại trực tiếp Word chuẩn CNPM_BAOCAO (8).docx — Thảo Cầm Viên: 1.6.2, US-C01 AC1–AC3, US-C03 AC1–AC2 và phần Could Have AC3 để loại khỏi phạm vi, US-A04 AC1–AC2, US-B01, US-E01 AC1, UC-03/04/05/07/14 đầy đủ, QT-01/06/07/08/10, NFR-01/06/08/10/13, thiết kế 4.2–4.3 và các bảng/ràng buộc nội dung, tour, phiên, thanh toán, BUNDLE_ACCESS_LOGS. Theo hợp đồng phần 1 và quyết định trong chat: WAV mock; tên/mô tả tour dùng chung; seed tour dành bước riêng, không mở quản trị tour.

## Hành vi đã có code

`GET /api/content/bundle?languageCode=en`, token khách trong Authorization Bearer. Trả data gồm requestedLanguageCode chuẩn từ LANGUAGES, generatedAt/expiry UTC, danh mục ngôn ngữ hoạt động, toàn bộ POI ACTIVE và tour mẫu hợp lệ. Không phân trang hoặc nhận sessionId/filter do khách gửi. Ví dụ EN được chuẩn hóa theo mã en đang lưu, còn de ngừng hoạt động hoặc zz không hỗ trợ trả 400 LANGUAGE_NOT_SUPPORTED. Thiếu/sai/nhân đôi query hoặc thêm page/filter trả 400 VALIDATION_ERROR.

POI gồm dữ liệu tham quan và text/audio tách biệt. Ưu tiên ngôn ngữ yêu cầu → en → vi, bỏ trùng và ngôn ngữ inactive. Chỉ dùng văn bản READY đúng phiên bản, audio AVAILABLE đúng bản dịch/phiên bản, metadata hợp lệ và URL WAV thuộc API media. Văn bản Anh có thể đi cùng audio Việt khi audio Anh thiếu; mỗi phần có languageCode/isFallback thực tế. Thiếu nội dung không loại POI ACTIVE, mà trả UNAVAILABLE/null; tên gốc Việt giữ riêng originalName.

Tour chỉ chứa điểm có trong bundle, giữ sequenceNo và khoảng trống tương đối sau lọc, loại tour rỗng. Tên/mô tả giữ nguyên với localization=SHARED, không giả là đã dịch. POI thiếu audio nhưng còn hoạt động vẫn có thể nằm trong tour để frontend đánh dấu chưa sẵn sàng.

Không trả raw token/hash, payment_ref/số tiền, sessionId, dữ liệu tài khoản, audit hoặc claim trong DTO. Không sửa nội dung/phiên/thanh toán/job khi tải bundle. Route đặt no-store, trả JSON bằng end sau khi đã tạo DTO, tránh Express tự sinh ETag và đổi phản hồi thành 304. Conditional GET vẫn phải xác thực, dựng gói và ghi lượt cấp mới.

## Transaction và kiểm quyền

Middleware khách tái sử dụng PaymentService.authenticateVisitor. ContentService còn tính SHA-256 token của chính request và chuyển cùng sessionId đã xác thực vào Store. Token không được dùng từ query/body/cookie.

Store khóa payment trước visit, nhất quán với webhook/checkout/exchange. Service kiểm lại token_hash, PAID, ACTIVE, paid_at/activated_at/expires_at và giờ UTC SQL sau khi lấy khóa. Không tin mỗi req.visit.status. Thu hồi hoặc đổi token giữa middleware và transaction bị từ chối.

AuthStore.transaction có tùy chọn repeatableRead chỉ dùng cho bundle: SET TRANSACTION ISOLATION LEVEL REPEATABLE READ trước begin, không đổi mặc định session của connection. Hành vi mặc định các luồng cũ giữ nguyên. Nếu đặt cấu hình xong mà begin thất bại, connection bị hủy để không đưa cài đặt “giao dịch kế tiếp” về pool. Test có session default READ COMMITTED vẫn thấy snapshot nhất quán; sau commit default vẫn READ-COMMITTED, không bị thay ngầm.

Snapshot nội dung được lập từ danh mục ngôn ngữ và các consistent read tiếp theo trong cùng transaction. DTO hoàn tất và serializable trước khi ghi BUNDLE_ACCESS_LOGS. INSERT…SELECT chỉ ghi khi phiên/token/payment còn hợp lệ và chưa hết hạn tại chính câu INSERT, rồi mới commit/gửi 200. Như vậy vé hết hạn trong thời gian dựng DTO không được cấp gói. Không giữ khóa lúc truyền HTTP hoặc tải audio.

Log lưu session_id và ngôn ngữ được yêu cầu, không dùng ngôn ngữ fallback. Các lần tải đồng thời được ghi thành các lượt cấp riêng, không gia hạn vé hoặc tạo thêm doanh thu/job. Lỗi log/SQL trước commit rollback và trả 503 BUNDLE_UNAVAILABLE an toàn. Mất xác nhận commit có thể để lại log dù client nhận 503; test chứng minh điều đó. Nhật ký không chứng minh thiết bị đã nhận toàn bộ bundle.

## File thay đổi

- backend/routers/content.router.js: HTTP route khách, middleware và no-store/không 304.
- backend/services/content.service.js: query, kiểm quyền lại, chọn ngôn ngữ, tạo DTO và quyết định lỗi.
- backend/services/bundle-content.js: chọn text/audio/fallback và dựng tour, có thể kiểm độc lập.
- backend/stores/content.store.js: transaction cấp gói, snapshot SQL và ghi nhật ký.
- backend/stores/auth.store.js: tùy chọn repeatable-read, giữ mặc định cũ.
- backend/server.js: nối Router/Service có thể thay thế khi kiểm thử.
- backend/tests/bundle.test.js và backend/tests/bundle.integration.test.js: 26 ca mới, gồm 13 unit và 13 integration.

Không đổi schema/migration, dependency, .env thật hoặc frontend. Không viết seed và không thêm API quản trị tour/audio on-demand.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-C01 AC1; UC-03; QT-06 | Phần API đạt trong môi trường thử | empty real bundle; HTTP MockGateway → token → bundle → WAV; allowlisted DTO; tour filtering | Toàn bộ POI ACTIVE, không phân trang, chưa nghiệm thu trên dữ liệu có nguồn của Thảo Cầm Viên. |
| US-C01 AC2; UC-04 E2/E4 | Backend đạt kiểm phiên/ngôn ngữ | invalid queries and unsupported/inactive languages; canonicalize EN; expired/revoked tests | Biểu tượng đổi ngôn ngữ, giữ gói cũ, chặn phản hồi đến muộn thuộc frontend, chưa làm. |
| US-C01 AC3; QT-06 | Backend cung cấp dữ liệu đầy đủ cho client; chưa đạt toàn bộ AC | bundle structure; tours/POI metadata | Chưa có network/browser test chứng minh không polling nội dung hoặc gọi lại API POI. |
| US-C03 AC1–AC2; QT-07/08 | Phần chọn dữ liệu backend đạt | independent text/audio fallback; stale/pending/failed/incomplete text; unsafe audio metadata; inactive fallback language | Fallback không tính đủ nội dung ngôn ngữ yêu cầu; UI đọc/báo thiếu chưa làm. AC3 on-demand ngoài phạm vi. |
| US-E01 AC1; QT-10; UC-14 A3 | Phần đọc tour trong bundle đạt | relative order/gaps; drop inactive POIs and empty tours; keep unavailable points | Tên/mô tả dùng chung theo quyết định đã duyệt; chưa triển khai UC-14 quản trị tour hoặc UI chỉnh tour. |
| US-A04 AC1–AC2; QT-01; NFR-06 | Server kiểm quyền đạt ở môi trường thử | invalid/expired/revoked/unpaid/internal tokens; token replacement after middleware; expiry while building | Thời hạn dựa SQL, không gia hạn; đồng hồ/dừng tham quan trên frontend chưa làm. |
| BUNDLE_ACCESS_LOGS; UC-03 bước 2/UC-04 bước 4 | Đạt ghi ngôn ngữ yêu cầu và mỗi lượt cấp riêng | fallback logs fr; concurrent downloads one log each; log error rollback; lost commit acknowledgement | 503 sau mất xác nhận commit có thể đã có log; không giả định mọi lỗi đều 0 log. |
| Tính nhất quán; QT-08; kiến trúc 4.2 | Đạt snapshot và giữ trạng thái nghiệp vụ | source update between language/POI reads; session default READ COMMITTED; failed begin discards configured connection; payment/visit/jobs unchanged | Không thay schema; không tuyên bố mọi biến động sau khi đã gửi gói được phản ánh trong cache client. |
| NFR-08 | Đạt phần API đã kiểm | query injection; allowlisted DTO; safe SQL error; conditional GET rechecks permission | HTML trong dữ liệu vẫn phải được frontend hiển thị bằng text an toàn; không tuyên bố đã kiểm XSS giao diện. |
| NFR-13; US-16 | Đạt lint và phân lớp trong phạm vi thay đổi | lint 115 file, Store/Service unit replacement, full regression | SQL/driver ở Store; Router chỉ lấy request/trả HTTP. |
| NFR-01 | Chưa kiểm chứng hiệu năng | Có HTTP chức năng, chưa benchmark bundle/parse trên trình duyệt | Chưa công bố kích thước/latency/median/p95 của dữ liệu nghiệm thu, không đặt số ngưỡng giả. |
| NFR-02/10/12 | Chưa nghiệm thu chất lượng/thiết bị | HTTP tải WAV mock thành công, không phải thử phát trên điện thoại | Mock âm thử 1 giây, không phải giọng đọc; chưa đủ ma trận ngôn ngữ/POI, chưa thử Chrome Android/Safari iOS. |
| US-17/CI | Toàn bộ local test đạt; CI thay đổi mới chưa chạy | bundle-all-tests.log | Chưa commit/push; CI xanh của HEAD nền không kiểm chứng code chưa commit. |

## Kết quả và môi trường kiểm thử

Bản sao code ngoài OneDrive, không cài dependency. Dùng image đã có và volume dependency thử read-only. Stack cũ tcv-acc-6940803 đã dừng trước phiên; lần chạy đầu gặp connect ETIMEDOUT trong before hook (13 unit đạt, 12 integration bị hủy do chuẩn bị môi trường, không phải được bỏ qua). Không bật lại hoặc dựng lại stack cũ.

Tạo môi trường test tách biệt **tcv-bundle-70b3d32**, MySQL/Redis volume mới, network nội bộ, không publish cổng host; không dùng .env thật. Chỉ database mới có tên tcv_bundle_test_UUID được khởi tạo schema cho fixture. Các bộ test khác cũng tạo DB thử riêng. Giữ DB mới để đối soát; dùng hook nghiệm thu có sẵn để không DROP DATABASE teardown của bộ test cũ. Không xóa container/volume/dữ liệu cũ; không đụng mysql-tcv, redis-tcv, tcv-mysql-data. Không thể gọi HTTP/đếm lại DB nghiệm thu cũ khi chúng đang dừng, và không tuyên bố đã làm kiểm tra đó trong phiên này.

- Node v20.20.2; MySQL server 8.0.46; Redis 7.4.11. RUN_DB_TESTS=1 và RUN_REDIS_TESTS=1.
- Lint đạt **115 file JavaScript**.
- Kiểm thử riêng trên stack tách biệt: **26/26 đạt**, lỗi 0/bỏ qua 0/hủy 0.
- Toàn bộ: **435/435 đạt**, 21 suite, lỗi 0/bỏ qua 0/hủy 0/todo 0; **46.125 giây**. So với nền worker 409, thêm 26 ca.
- Chưa chạy Node 22/coverage hoặc CI mới; chưa build/deploy image mới, không nạp code bundle vào backend nghiệm thu cũ.

Bằng chứng ngoài repo tại `C:\Users\Admin\AppData\Local\Temp\tcv-acceptance-6940803-20261020\evidence`: bundle-targeted.log là lần môi trường dừng; bundle-targeted-isolated.log là lần 26/26; bundle-all-tests.log là bộ cuối 435/435. Compose test riêng ở compose.bundle-test.yml cùng thư mục, không sửa Compose sản phẩm hoặc Compose nghiệm thu cũ.

## Bước tiếp theo

Chờ người dùng chốt mốc/commit/push. Phần tiếp theo theo hướng đã thống nhất là 2–3 POI có nguồn rõ, VI/EN, một tour dùng seed riêng chạy lặp an toàn trên DB demo chỉ định; phân biệt nguồn thật và text/audio mock. Sau đó frontend được giao riêng để nối lát cắt khách và kiểm chứng trình duyệt. Không mở rộng provider thật, GPS/tự phát, quản trị tour hay các phân hệ khác trong lượt này.
