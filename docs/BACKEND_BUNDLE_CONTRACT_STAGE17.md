# Mốc 17, phần 1 — Hợp đồng bundle khách

**Cập nhật phần 2:** API đã được triển khai và kiểm chứng ở môi trường thử với 435/435 test đạt; chưa commit/push/CI mới. Xem [BACKEND_BUNDLE_API_STAGE17.md](BACKEND_BUNDLE_API_STAGE17.md). Nội dung “chưa code” và kế hoạch kiểm thử phía dưới là trạng thái lúc chốt phần 1, không thay cho kết quả phần 2.

## Trạng thái và nguồn

Đây là đặc tả để triển khai phần tiếp theo, **chưa có API bundle chạy**. Phần 1 chỉ thêm tài liệu này; không viết API, seed, migration hoặc frontend và không sửa Word. Không chạy lại test vì chưa thay đổi code thực thi.

Đã đọc lại trực tiếp `C:\Users\Admin\OneDrive\Documents\CONGNGHEPHANMEM\CNPM_BAOCAO (8).docx` — Thảo Cầm Viên: mục 1.6.2; US-A04 AC1–AC3, US-B01, US-C01 AC1–AC3, US-C03 AC1–AC3, US-E01 AC1 và phần tour của US-F02; QT-01/06/07/08/10/12; NFR-01/02/06/08/10/11/12/13; toàn bộ UC-03/04/05/07/14; mục 4.2–4.3, các bảng/quan hệ LANGUAGES, POIS, POI_TRANSLATIONS, AUDIOS, TOURS, TOUR_POIS, VISIT_SESSIONS/PAYMENTS và BUNDLE_ACCESS_LOGS tại 4.4.4.

Code nền: `70b3d32416a60932eb582863439a296402016d9f`; CI đúng commit đã xác minh completed/success: https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39406346270 . Không dùng kết quả đó để tuyên bố API bundle đã được kiểm thử.

Ba quyết định người dùng đã xác nhận trong chat:

1. Giữ WAV cho demo, ghi rõ là audio mock; chưa đáp ứng giả định MP3 của UC-05. Không chuyển mã hoặc thêm dependency ở mốc bundle.
2. Tên/mô tả tour dùng chung nguyên văn; không gán nhãn đã dịch theo ngôn ngữ bundle. Không thêm schema dịch tour.
3. Một tour demo được chuẩn bị bằng seed riêng có thể chạy lặp trên DB demo; chưa triển khai API quản trị tour. Không coi seed thay thế việc hoàn thành UC-14.

Việc người dùng chấp nhận phạm vi demo không đồng nghĩa các giả định 1.6.2 đã được giảng viên phê duyệt. Hai đến ba POI/VI–EN là lát cắt demo, không thay số POI/ngôn ngữ nghiệm thu toàn hệ thống.

## 1. Điểm vào và xác thực

Đề xuất `GET /api/content/bundle?languageCode=en`, trả JSON theo cấu trúc `{data: ...}` hiện có. Query bắt buộc có đúng một `languageCode` dạng chuỗi; không nhận bộ lọc POI, phân trang, danh sách mã POI hoặc sessionId do khách gửi. Bundle chứa toàn bộ POI ACTIVE, không phải một trang dữ liệu. Chỉ chấp nhận các khóa query đã công bố.

Mã ngôn ngữ kiểm hình thức theo quy ước hiện có, tối đa 10 ký tự. Tra LANGUAGES đang `is_active = 1`, dùng mã chuẩn lưu trong danh mục cho phản hồi/so sánh/log. Không tự đổi một ngôn ngữ không được hỗ trợ thành Việt/Anh. Thiếu/sai kiểu/khóa query lạ trả lỗi 400; ngôn ngữ không tồn tại hoặc ngừng kích hoạt trả 400 LANGUAGE_NOT_SUPPORTED. Frontend mặc định chọn vi là quyết định của mốc giao diện; backend không âm thầm đoán khi query thiếu.

Token chỉ qua `Authorization: Bearer <token khách>`, dùng createVisitorMiddleware/PaymentService.authenticateVisitor hiện có. Middleware kiểm SHA-256 token, PAID, ACTIVE, paid_at/activated_at và expires_at với giờ UTC SQL. Không nhận token trong query/cookie/body, không cấp quyền cho JWT STAFF/ADMIN. Không có endpoint lấy POI chi tiết công khai để lách bundle.

Phản hồi và lỗi của route đặt Cache-Control: no-store; không dùng cache HTTP/304 để bỏ bước kiểm quyền hoặc ghi log. Trong lần cấp gói, Store cần kiểm tra lại phiên từ SQL khi chốt lượt cấp, thay vì chỉ tin visit.status được chuyển từ một bước trước. Nếu đã thu hồi, chưa trả tiền hoặc hết hạn thì không cấp gói/ghi log thành công. Không kéo dài expires_at. Cơ chế transaction/khóa cụ thể phải được rà với thứ tự khóa hiện có trước khi viết Store; không giữ khóa trong lúc truyền HTTP hoặc tải media.

## 2. Khung dữ liệu trả về

Các tên trường sau là hợp đồng dự kiến của API mới, không phải đổi tên cột/bảng hiện có. Ví dụ chỉ minh họa cấu trúc, không đại diện nội dung hay dữ liệu nghiệm thu thực tế:

```json
{
  "data": {
    "requestedLanguageCode": "en",
    "generatedAt": "<UTC ISO8601>",
    "expiresAt": "<hạn phiên UTC ISO8601>",
    "languages": [
      { "code": "vi", "name": "Tiếng Việt" },
      { "code": "en", "name": "English" }
    ],
    "pois": [],
    "tours": []
  }
}
```

generatedAt thể hiện thời điểm tạo gói từ phía server, không phải phiên bản nội dung chung hoặc cache validator. expiresAt giữ hạn phiên đã được xác thực, phục vụ đồng hồ giao diện sau này; không đưa raw token, token_hash, payment_ref, số tiền, tài khoản nội bộ, audit, claim hoặc lỗi provider vào bundle. Không cần sessionId trong nội dung gói.

languages là danh sách đang hoạt động trong LANGUAGES, sắp ổn định theo code để frontend chọn ngôn ngữ mà không cần thêm API danh mục. Danh sách này không chứng minh mọi POI đã có nội dung/audio đạt chất lượng cho từng ngôn ngữ; không tự công bố đủ 15 ngôn ngữ chỉ vì schema cho phép.

Không có POI/tour hợp lệ thì trả các mảng rỗng và HTTP 200, không tạo dữ liệu giả để lấp. Có toàn bộ danh sách nhưng nội dung đang thiếu thì báo trạng thái thiếu ở từng POI, không loại POI ACTIVE chỉ vì pipeline chưa xong. Giao diện phải có trạng thái rỗng/thiếu rõ ràng khi được triển khai.

## 3. Mỗi POI

Thông tin chung gồm poiId, originalName (tên gốc tiếng Việt trong POIS), category, conservationStatus, activityHours, latitude, longitude, triggerRadius, avatarUrl, displayOrder. originalName không được gắn nhãn là bản dịch. Các giá trị tùy chọn giữ null, không đổi null thành chuỗi “null”. Tọa độ trả số hữu hạn, không để DECIMAL SQL thành chuỗi làm lỗi tính khoảng cách. Các mã category giữ enum hiện có, việc dịch nhãn giao diện thuộc frontend.

Sắp toàn bộ pois theo display_order rồi poi_id. Chỉ lấy POI ACTIVE ở snapshot cấp gói. Không sửa/xóa POI hoặc tạo job khi khách tải gói.

Mỗi POI có hai đối tượng tách biệt:

- text: status (`READY` hoặc `UNAVAILABLE`), languageCode thực tế hoặc null, isFallback, name, description, audioScript. Khi không có văn bản hợp lệ, các trường nội dung/languageCode là null và isFallback=false; originalName vẫn giúp nhận diện POI bằng tên gốc.
- audio: status (`AVAILABLE` hoặc `UNAVAILABLE`), languageCode thực tế hoặc null, isFallback, url, mimeType, duration. Khi chưa có audio phù hợp: url/languageCode/mimeType/duration là null và isFallback=false; không trả URL placeholder. Khi có WAV: mimeType=`audio/wav`, duration là số giây theo metadata đã lưu.

isFallback chỉ true khi thực sự chọn được nội dung có languageCode khác requestedLanguageCode. Trạng thái UNAVAILABLE không có “ngôn ngữ thực tế”; không giả định null là tiếng Việt. Không đưa toàn bộ trạng thái job/dữ liệu quản trị vào hai đối tượng này.

Các trạng thái READY/AVAILABLE trong hợp đồng là trạng thái công bố dữ liệu, **không phải chứng nhận chất lượng dịch/giọng đọc**. MockTranslation hiện chỉ thêm tiền tố, MockTts tạo âm thử một giây. Tài liệu/dữ liệu demo và giao diện sau này phải nêu rõ điều này; không suy diễn một bản ghi đã được con người kiểm duyệt từ status hoặc tiền tố trong text. Phần 1 không thêm cột provenance hay cờ “đã nghiệm thu” giả.

## 4. Chọn nội dung và audio dự phòng

Với mỗi POI, xét lần lượt ngôn ngữ yêu cầu → en → vi, bỏ mã trùng và bỏ ngôn ngữ không hoạt động. Ví dụ yêu cầu en chỉ xét en rồi vi; yêu cầu vi xét vi rồi en, không thử vi lần hai.

Văn bản chỉ hợp lệ khi POI_TRANSLATIONS READY, source_version khớp POIS.content_version và có name/description/audio_script hợp lệ, không rỗng. Không lấy nội dung lỗi thời hoặc đang PENDING/FAILED để lấp bundle. originalName là thông tin định danh gốc riêng, không biến một bản dịch thiếu thành READY.

Audio được lựa chọn **độc lập** theo cùng thứ tự, theo UC-05 E1: AUDIOS AVAILABLE, file_url hợp lệ trỏ API media, phiên bản audio khớp bản dịch và POI hiện hành, bản dịch READY và ngôn ngữ hoạt động. Ví dụ text tiếng Anh có sẵn nhưng audio Anh thiếu: text.languageCode=en, audio.languageCode=vi nếu có audio Việt hợp lệ; frontend phải thể hiện đúng hai ngôn ngữ thực tế, không gọi audio đó là tiếng Anh.

URL audio dùng route có xác thực đang có `/api/media/audio/:key`; không trả đường dẫn MEDIA_ROOT, đường dẫn file hệ điều hành hoặc link bỏ qua quyền. Backend media hiện kiểm trạng thái/phiên bản và đọc/kiểm WAV khi tải. Bundle công bố metadata và URL, không chứa bytes media và không bảo đảm mạng/tệp sẽ còn tải thành công ở một thời điểm sau. Nếu tệp mất/hỏng hoặc nguồn/POI thay đổi sau khi cấp bundle, API media có thể từ chối; giao diện giữ văn bản và báo lỗi, không gọi API quản trị hoặc tự tạo audio.

Không chọn được audio thì vẫn cho phép đọc text. Không có request tạo audio, không kích hoạt pipeline, không polling tiến độ trong mốc này. Fallback không được tính là hoàn thành ma trận nội dung của ngôn ngữ yêu cầu.

## 5. Tour mẫu

Mỗi tour gồm tourId, name, description, localization=`SHARED`, items là danh sách `{poiId, sequenceNo}`. name/description giữ nguyên dữ liệu dùng chung theo quyết định của người dùng; không có cờ translated=true, không lấy requestedLanguageCode để khẳng định ngôn ngữ tên tour. Mốc sau sẽ ghi nguồn/ngôn ngữ thực tế của tên tour demo trong manifest seed.

Đọc TOURS/TOUR_POIS có sẵn, chỉ giữ những poiId có trong danh sách POI ACTIVE của **cùng snapshot bundle**. Giữ nguyên thứ tự sequence_no; khoảng trống sau khi lọc không cần đánh lại số. Tour không còn điểm hợp lệ bị loại khỏi danh sách tour có thể chọn. Sắp tour theo tour_id để phản hồi ổn định. Không tạo quan hệ tour trỏ tới POI nằm ngoài bundle.

POI thiếu text/audio vẫn nằm trong tour nếu đang ACTIVE; các trạng thái trong pois cho phép frontend đánh dấu điểm chưa hoàn tất theo UC-07 E3. Không tự sắp tour mẫu theo khoảng cách; nearest-neighbor/Haversine và thêm/bỏ điểm thuộc mốc frontend, không gọi API tính đường hoặc lưu tour cá nhân trên server.

Không có tour đã chuẩn bị thì tours=[], phản ánh DB thật. Để demo có tour mẫu, mốc dữ liệu sẽ thêm một tour có thứ tự bằng seed riêng, có thể chạy lặp và chỉ trên DB demo. Chưa viết hoặc chạy seed trong phần 1. Không nạp vào DB/container cũ, không dùng init_db.sql, không tạo tour giả ngay trong handler. UC-14 quản trị tour vẫn chưa triển khai.

## 6. Nhật ký cấp gói và tính nhất quán

Theo UC-03 bước 2, UC-04 bước 4 và BUNDLE_ACCESS_LOGS 4.4.4: mỗi phản hồi bundle tạo thành công cho phiên hợp lệ ghi một lượt cấp gồm session_id và language_code **được yêu cầu**, không phải ngôn ngữ fallback. Đây không phải AUDIT_LOGS hoặc log ghi token.

Store cần đọc snapshot nội dung nhất quán để cùng một phản hồi không ghép POI/bản dịch/audio/tour của các thời điểm khác nhau. Service tạo và kiểm DTO thành công, rồi Store ghi lượt cấp/chốt transaction trước khi Router gửi HTTP 200. Kiểm quyền phiên và điều kiện ngôn ngữ không được bỏ qua vì log có khóa ngoại. Service quyết định lỗi nghiệp vụ; Store không sinh mã HTTP.

Lỗi trước commit: rollback lượt cấp, không trả 200 giả hoặc gói dựng dở. Lỗi ghi log làm lần cấp thất bại, không âm thầm bỏ thống kê. Nếu mất xác nhận commit thì có thể log đã được lưu nhưng HTTP trả lỗi; phải ghi đúng giới hạn này trong kiểm thử, không hứa mọi 503 đều có 0 bản ghi.

Mỗi lần nạp lại/đổi ngôn ngữ là một lượt cấp mới nếu thành công. Không thêm khóa idempotency/schema để gộp các lần tải. Mất kết nối sau commit có thể khiến khách không nhận gói nhưng lượt cấp vẫn được ghi: Word nêu rõ bản ghi không chứng minh thiết bị đã nhận hoặc dùng hết dữ liệu. Không gọi tổng lượt cấp là số khách hoặc số phiên duy nhất.

## 7. Lỗi và trách nhiệm frontend để mốc sau

Giữ lỗi 401 của xác thực khách hiện có (thiếu/sai token, sai phiên, hết hạn), và 503 VISITOR_AUTH_UNAVAILABLE khi chưa kiểm tra được quyền. Query sai trả 400 VALIDATION_ERROR; ngôn ngữ không hỗ trợ/ngừng hoạt động trả 400 LANGUAGE_NOT_SUPPORTED. Lỗi đọc/tạo/chốt bundle trả 503 BUNDLE_UNAVAILABLE với thông báo cố định, không SQL/stack/driver detail. Không dùng 403 nội bộ cho token khách hết hạn hoặc cho token STAFF/ADMIN dùng nhầm API khách.

Đổi ngôn ngữ: frontend gửi yêu cầu mới, chỉ áp dụng phản hồi khớp lựa chọn mới nhất, dừng audio cũ trước khi thay gói. Yêu cầu lỗi hoặc ngôn ngữ không hỗ trợ thì giữ gói cũ; chọn lại đúng ngôn ngữ hiện tại không gọi lại API. Backend trả requestedLanguageCode để hỗ trợ đối chiếu, không tự bảo đảm frontend đã xử lý race.

Frontend xem chi tiết, tính khoảng cách và tùy chỉnh tour từ bộ nhớ của bundle; không polling POI. Ảnh, audio, bản đồ nền và đổi ngôn ngữ là request riêng theo phạm vi Word; bundle không phải gói bytes chứa toàn bộ media. Audio tải bằng fetch có Authorization rồi tạo Blob URL để trình phát dùng; không nhét token vào URL audio. Hết hạn thì dừng tham quan theo expiresAt, không hứa thu hồi nội dung đã tải. Các thao tác này chỉ là hợp đồng tích hợp, chưa code hoặc kiểm thử trình duyệt.

## 8. Phạm vi AC và kế hoạch kiểm chứng cho phần API

- US-C01 AC1; US-B01 AC1, UC-03: API sẽ trả toàn bộ POI ACTIVE và tour theo hợp đồng, không phân trang hoặc lộ dữ liệu nội bộ. Kiểm tra metadata, thứ tự, tọa độ kiểu số, dữ liệu rỗng và thiếu nội dung. Hiện chỉ có đặc tả, chưa đáp ứng bằng code.
- US-C01 AC2; UC-04: backend sẽ cung cấp danh mục/ngôn ngữ yêu cầu, từ chối ngôn ngữ sai/ngừng hoạt động. Biểu tượng chọn, giữ gói cũ và chặn phản hồi đến muộn chưa thuộc backend API.
- US-C01 AC3, QT-06: hợp đồng đủ dữ liệu cho thao tác tại client; cần network/browser test ở mốc frontend để chứng minh không gọi lại API POI. Chưa thể kết luận đạt toàn bộ chỉ bằng test JSON.
- US-C03 AC1–AC2, QT-07/08: unit ma trận fallback riêng text/audio, trùng mã, ngôn ngữ inactive, text/audio stale hoặc FAILED, thiếu toàn bộ nội dung và nhãn ngôn ngữ thực tế. AC3 on-demand không làm.
- US-E01 AC1, QT-10, UC-14 A3: test tour giữ thứ tự, loại POI INACTIVE, bỏ tour rỗng, giữ POI thiếu audio với trạng thái rõ, không trỏ POI ngoài bundle. UC-14 tạo/sửa/audit và UI tour chưa hoàn thành bởi mốc bundle/seed.
- US-A04 AC1–AC2, QT-01, NFR-06: HTTP/SQL test token đúng/sai/hết hạn/REVOKED/chưa trả tiền, JWT nội bộ bị từ chối; kiểm tra lại phiên khi chốt cấp gói và giữ expiresAt.
- BUNDLE_ACCESS_LOGS/UC-03/04: test log đúng session/ngôn ngữ yêu cầu, mỗi lần cấp được ghi riêng, fallback không đổi ngôn ngữ log, lỗi quyền/query/ngôn ngữ không ghi log, lỗi SQL/log rollback và mất xác nhận commit phải mô tả trung thực.
- NFR-08/13, US-16: test allowlist DTO, safe error, injection/query sai và Service/Store thay thế; lint/import giữ phân lớp.
- NFR-01: ghi kích thước/latency theo bộ dữ liệu công bố khi chạy được; chưa chốt ngưỡng p95 hoặc coi dữ liệu 2–3 POI là bằng chứng chịu tải.
- NFR-02/10/12: chất lượng dịch/giọng, media chơi thật trên trình duyệt và thiết bị chưa được nghiệm thu bằng hợp đồng này. Chấp nhận WAV mock cho demo không hoàn thành giả định MP3 hay ma trận 15 ngôn ngữ.

## 9. File dự kiến khi được giao phần API

Tạo backend/routers/content.router.js, backend/services/content.service.js và các unit/HTTP/integration test bundle; bổ sung phương thức snapshot/ghi log vào backend/stores/content.store.js; nối dependency trong backend/server.js. Tách helper chọn fallback/validation nếu cần để kiểm độc lập. Không sửa logic quản trị POI để biến thành API khách; không thêm bảng/cột/migration trong phạm vi dự kiến.

Phần seed dữ liệu/tour là bước riêng sau đó, cần nguồn rõ và DB demo chỉ định, không tự gộp vào phần API. Word không có cột nguồn POI; manifest dữ liệu demo bên ngoài bảng phải lưu nguồn/đường dẫn, ngày kiểm tra và giới hạn, không tự thêm schema. Chưa chọn POI, tra cứu nguồn, nạp dữ liệu hay chạy worker trên DB cũ.

Sau khi người dùng giao phần API, đọc lại nguồn liên quan trước code, trình bày phạm vi AC/QT/NFR và chi tiết transaction đã rà. Mơ hồ mới hoặc cần thay schema phải hỏi. Kiểm thử ngoài OneDrive với DB riêng, không đọc/in .env hay bí mật; không ảnh hưởng DB/container/volume cũ. Chỉ commit/push khi được yêu cầu; không chuyển sang frontend/Word trong cùng lượt này.
