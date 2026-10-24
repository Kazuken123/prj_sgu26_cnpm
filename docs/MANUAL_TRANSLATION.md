# Nhập bản dịch đã duyệt — mốc mở rộng bảy ngôn ngữ

Nội dung được soạn/dịch thủ công, đối chiếu với nguồn VI và duyệt bên ngoài hệ thống trước khi nhập. API không gọi ChatGPT/Claude, không đánh giá chất lượng hay xác minh sự kiện thay con người. STAFF/ADMIN nhập được coi là xác nhận đã duyệt; chưa có quy trình duyệt nhiều cấp hoặc màn hình mới.

API nhận các bản dịch `en`, `zh-Hans` (Trung giản thể), `ko`, `ja`, `ru`, `fr`, `de`, `es`, `it`, `pt-BR`, `nl`, `pl`, `cs`, `tr`, giữ riêng tên, giới thiệu và kịch bản đọc. VI vẫn dùng API nguồn POI hiện có. Bộ 15 ngôn ngữ tính cả VI được người dùng chốt ngày 24/10/2026, mở rộng từ bộ bảy ngôn ngữ trước đó. Allowlist không tự chứng minh đủ văn bản/audio hoặc chất lượng ngôn ngữ. Quyết định dùng dịch thủ công đã được chốt; Word/tiêu chí nghiệm thu cần cập nhật riêng. Xem `PIPER_DEMO15.md` và `data/demo/fifteen/README.md` để tích hợp dữ liệu có kiểm soát.

Mã chính xác và phân biệt hoa/thường ở đầu vào API: `zh-Hans`, không nhận `zh`, `zh-CN`, `zh-hans` hoặc `zh-Hant` để tránh nhập nhầm biến thể chữ. Không tự chuyển giản thể/phồn thể hoặc chuẩn hóa sang một mã khác. Danh mục, job và bản dịch phải dùng cùng mã; chưa có dữ liệu `zh` cần chuyển trong bộ demo đã duyệt.

## API nội bộ

Hai API dùng Bearer access token STAFF/ADMIN, kiểm tra quyền hiện tại và trả `Cache-Control: no-store`:

`GET /api/admin/pois/:poiId/translations/:languageCode`

Ví dụ tuyến cũ `/api/admin/pois/1/translations/en` tiếp tục hoạt động; tuyến Trung giản thể là `/api/admin/pois/1/translations/zh-Hans`. Trả `data` gồm `poiId`, `languageCode`, `sourceVersion` hiện hành, `source` (VI), `translation` (bản dịch đích hoặc null), `job` (tác vụ ngôn ngữ đích của phiên bản hiện hành hoặc null). Văn bản trả riêng `name`, `description`, `audioScript`, `sourceVersion`, `status`; bản dịch cũ có thể khác phiên bản hiện hành, không được coi là sẵn sàng cho nguồn mới.

`PUT /api/admin/pois/:poiId/translations/:languageCode`

Body chỉ gồm bốn trường (ví dụ dữ liệu kiểm thử, không phải nội dung thuyết minh):

```json
{
  "sourceVersion": 1,
  "name": "Test point",
  "description": "Reviewed test introduction.",
  "audioScript": "Reviewed test narration."
}
```

`sourceVersion` phải là số nguyên bằng phiên bản VI đã được đối chiếu. Cả ba trường văn bản bắt buộc có nội dung, được trim hai đầu; giới hạn tên 255 và mỗi đoạn 6000 ký tự. Không nhận `status`, `provider`, tên người duyệt tự khai hoặc metadata khác.

HTTP 200 `data.outcome=IMPORTED` khi nhập bản thiếu hoặc thay bản khác phiên bản nguồn mà vẫn đáp ứng các bảo vệ bên dưới. Bản dịch được lưu READY cùng audit trong một transaction, không thay nguồn VI hay tăng phiên bản POI. Không tạo audio hoặc tự retry chỉ vì nhận HTTP 200.

Gửi lại đúng bản READY hiện hành: 200 `UNCHANGED`, không sửa hàng dữ liệu, audio, job hoặc tạo thêm audit. Gửi khác nội dung: 409 `TRANSLATION_READY_CONFLICT`; mốc này không sửa bản READY hiện hành, kể cả bản có dấu hiệu dữ liệu không hợp lệ. Không tự sửa VI để lách giới hạn này.

## Quy tắc an toàn

- Nguồn VI đổi phiên bản: 409 `TRANSLATION_SOURCE_CONFLICT`; tải lại và duyệt lại bản dịch. Không tự gắn bản cũ sang phiên bản mới.
- Nguồn VI chưa READY đúng phiên bản: 409 `TRANSLATION_SOURCE_UNAVAILABLE`.
- Job hiện hành đang PROCESSING: 409 `TRANSLATION_JOB_PROCESSING`; kể cả gửi lại giống nhau. Worker, nhập bản dịch và sửa nguồn cùng khóa POI trước để không đổi văn bản giữa lượt xử lý.
- Đã có hàng bản dịch cùng phiên bản nhưng trạng thái PENDING/FAILED: 409 `TRANSLATION_EXISTING_CONFLICT` để đối soát, không tự thay trong mốc chỉ nhập thiếu/lỗi thời này. Trạng thái văn bản và trạng thái job là hai việc riêng; job FAILED nhưng chưa có EN vẫn nhập được rồi retry.
- Chỉ nhập mới/thay bản chưa xuất bản khi job hiện hành PENDING hoặc FAILED. Job thiếu/COMPLETED nhưng không có văn bản phù hợp: 409 `TRANSLATION_JOB_UNAVAILABLE`, đối soát thay vì tự đổi trạng thái.
- Ngôn ngữ ngoài danh sách API: 400 `UNSUPPORTED_MANUAL_LANGUAGE`, kể cả có hàng LANGUAGES đang bật. Ngôn ngữ hợp lệ nhưng thiếu trong LANGUAGES hoặc chưa bật: 409 `TRANSLATION_LANGUAGE_DISABLED`, không tự đăng ký/kích hoạt hoặc tự tạo job.
- Có audio AVAILABLE của chính phiên bản hiện hành nhưng không có văn bản READY tương ứng, hoặc bản dịch mang phiên bản tương lai: trả 409 để đối soát, không ghi đè.
- Nhập bản dịch mới không đổi metadata hoặc xóa file audio cũ. Audio khác phiên bản không được coi là audio của bản mới; bundle/media hiện có tiếp tục kiểm phiên bản.
- Lưu hoặc audit lỗi: rollback và trả 503 `TRANSLATION_STORAGE_UNAVAILABLE`. Mất phản hồi commit: GET để đối soát; gửi lại giống nhau an toàn, không giả định lần đầu chưa lưu.

Audit action `IMPORT_REVIEWED_TRANSLATION` ghi tài khoản thực hiện, tài nguyên POI_TRANSLATIONS với ID bản dịch thật, IP và metadata `poiId/languageCode/sourceVersion`. Không chép toàn bộ bài viết, token hoặc bí mật vào audit. ADMIN lọc được action này qua UC-17.

## Nối worker và audio

1. Nhân viên lấy nguồn VI/phiên bản bằng GET, chuẩn bị bản dịch đích và duyệt ngoài hệ thống. Ngôn ngữ đích phải được đăng ký/bật và có job đúng phiên bản trước khi nhập; việc thêm/bật ngôn ngữ cùng job cho POI cũ là mốc dữ liệu riêng, không sửa VI để ép sinh job.
2. PUT bản đã duyệt; kiểm tra `outcome` và `job.status`.
3. Job PENDING: worker tiếp nhận bình thường. Job FAILED: sau nhập, gọi API retry hiện có `POST /api/admin/content-jobs/:jobId/retry` với body `{}`; chỉ trả 202 đã tiếp nhận, chưa khẳng định audio xong.
4. Chạy worker với `npm run jobs:worker -- --piper` và cấu hình Piper/media hợp lệ. Không dùng `--mock` cho luồng nội dung duyệt này: chế độ đó là môi trường kiểm thử có MockTranslation/MockTts. Mốc này không tự thay cấu hình worker demo đang có.
5. Pipeline dùng lại READY đúng phiên bản, không dịch lại hoặc thay bằng MockTranslation. Thiếu bản dịch và không có translator thì job FAILED với mã hiện có `CONTENT_TRANSLATION_NOT_READY`; nhân viên nhập bản dịch rồi retry theo bước 3. Chỉ công bố audio sau khi file WAV hợp lệ đã lưu và metadata/job commit. **Manifest Piper hiện chỉ có VI/EN**; API nhập được văn bản không làm Piper có giọng mới. Chưa chạy worker thật cho năm ngôn ngữ mới trước khi giọng tương ứng được tích hợp/kiểm chứng.
6. Khách dùng token còn hạn tải bundle ngôn ngữ yêu cầu, đọc nội dung rồi tải audio qua API có xác thực. Thiếu audio có thể fallback theo hợp đồng bundle, với ngôn ngữ thực tế rõ ràng; không tính fallback là đủ audio ngôn ngữ đích.

Không sửa hai POI demo DRAFT-03 hay bốn WAV Piper hiện có. Không bật ngôn ngữ mới trong DB demo; bộ tám POI mới VI/EN DRAFT-02 đã được duyệt nội dung nhưng chưa nhập ở mốc API. Không đổi schema, không sửa Word/frontend. Sửa bản READY, chuẩn bị dữ liệu/giọng cho năm ngôn ngữ mới, quy trình duyệt nhiều cấp và tự động phát GPS là các mốc riêng.

## Phạm vi kiểm thử mở rộng

Unit test kiểm tra sáu mã đích cùng các chốt bảo vệ và từ chối mã ngoài phạm vi/biến thể không được duyệt. Integration test trên database thử ngẫu nhiên kiểm HTTP năm ngôn ngữ mới, giữ Unicode, gửi đồng thời chỉ một lần ghi/audit, chống ghi đè, giữ nguồn VI và pipeline không gọi translator khi có bản READY. Audio năm ngôn ngữ ở test này dùng MockTts, chỉ kiểm file WAV hợp lệ và luồng dữ liệu, **không chứng minh giọng đọc đúng ngôn ngữ**. Bài HTTP EN hiện có vẫn sử dụng Piper thật khi RUN_PIPER_TESTS=1. Kết quả chạy thực tế được ghi trong hồ sơ kiểm chứng ngoài repo, không tự tính test chưa chạy là đạt.
