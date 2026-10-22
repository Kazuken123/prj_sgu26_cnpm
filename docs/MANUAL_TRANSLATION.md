# Nhập EN đã duyệt — mốc tối thiểu

Nội dung được soạn/dịch thủ công, đối chiếu với nguồn VI và duyệt bên ngoài hệ thống trước khi nhập. API không gọi ChatGPT/Claude, không đánh giá chất lượng hay xác minh sự kiện thay con người. STAFF/ADMIN nhập được coi là xác nhận đã duyệt; chưa có quy trình duyệt nhiều cấp hoặc màn hình mới.

Mốc này chỉ hỗ trợ EN, giữ riêng tên, giới thiệu và kịch bản đọc. VI vẫn dùng API nguồn POI hiện có. Đây không phải tuyên bố đã hoàn thành yêu cầu 15+ ngôn ngữ hoặc dịch tự động của Word hiện hành. Quyết định dùng dịch thủ công đã được người dùng chốt; Word/tiêu chí nghiệm thu cần cập nhật riêng.

## API nội bộ

Hai API dùng Bearer access token STAFF/ADMIN, kiểm tra quyền hiện tại và trả `Cache-Control: no-store`:

`GET /api/admin/pois/:poiId/translations/en`

Trả `data` gồm `poiId`, `languageCode`, `sourceVersion` hiện hành, `source` (VI), `translation` (EN hoặc null), `job` (tác vụ EN của phiên bản hiện hành hoặc null). Văn bản trả riêng `name`, `description`, `audioScript`, `sourceVersion`, `status`; bản EN cũ có thể khác phiên bản hiện hành, không được coi là EN đã sẵn sàng cho nguồn mới.

`PUT /api/admin/pois/:poiId/translations/en`

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
- Job hiện hành đang PROCESSING: 409 `TRANSLATION_JOB_PROCESSING`; kể cả gửi lại giống nhau. Worker, nhập EN và sửa nguồn cùng khóa POI trước để không đổi văn bản giữa lượt xử lý.
- Đã có hàng bản dịch cùng phiên bản nhưng trạng thái PENDING/FAILED: 409 `TRANSLATION_EXISTING_CONFLICT` để đối soát, không tự thay trong mốc chỉ nhập thiếu/lỗi thời này. Trạng thái văn bản và trạng thái job là hai việc riêng; job FAILED nhưng chưa có EN vẫn nhập được rồi retry.
- Chỉ nhập mới/thay bản chưa xuất bản khi job hiện hành PENDING hoặc FAILED. Job thiếu/COMPLETED nhưng không có văn bản phù hợp: 409 `TRANSLATION_JOB_UNAVAILABLE`, đối soát thay vì tự đổi trạng thái.
- Ngôn ngữ chưa bật: 409 `TRANSLATION_LANGUAGE_DISABLED`, không tự kích hoạt ngôn ngữ.
- Có audio AVAILABLE của chính phiên bản hiện hành nhưng không có văn bản READY tương ứng, hoặc bản dịch mang phiên bản tương lai: trả 409 để đối soát, không ghi đè.
- Nhập bản dịch mới không đổi metadata hoặc xóa file audio cũ. Audio khác phiên bản không được coi là audio của bản mới; bundle/media hiện có tiếp tục kiểm phiên bản.
- Lưu hoặc audit lỗi: rollback và trả 503 `TRANSLATION_STORAGE_UNAVAILABLE`. Mất phản hồi commit: GET để đối soát; gửi lại giống nhau an toàn, không giả định lần đầu chưa lưu.

Audit action `IMPORT_REVIEWED_TRANSLATION` ghi tài khoản thực hiện, tài nguyên POI_TRANSLATIONS với ID bản dịch thật, IP và metadata `poiId/languageCode/sourceVersion`. Không chép toàn bộ bài viết, token hoặc bí mật vào audit. ADMIN lọc được action này qua UC-17.

## Nối worker và audio

1. Nhân viên lấy nguồn VI/phiên bản bằng GET, chuẩn bị EN và duyệt ngoài hệ thống.
2. PUT bản đã duyệt; kiểm tra `outcome` và `job.status`.
3. Job PENDING: worker tiếp nhận bình thường. Job FAILED: sau nhập, gọi API retry hiện có `POST /api/admin/content-jobs/:jobId/retry` với body `{}`; chỉ trả 202 đã tiếp nhận, chưa khẳng định audio xong.
4. Chạy worker với `npm run jobs:worker -- --piper` và cấu hình Piper/media hợp lệ. Không dùng `--mock` cho luồng nội dung duyệt này: chế độ đó là môi trường kiểm thử có MockTranslation/MockTts. Mốc này không tự thay cấu hình worker demo đang có.
5. Piper dùng lại READY đúng phiên bản, không dịch lại hoặc thay bằng MockTranslation. Thiếu bản dịch và không có translator thì job FAILED với mã hiện có `CONTENT_TRANSLATION_NOT_READY`; nhân viên nhập EN rồi retry theo bước 3. Chỉ công bố audio sau khi file WAV hợp lệ đã lưu và metadata/job commit.
6. Khách dùng token còn hạn tải bundle EN, đọc nội dung rồi tải audio qua API có xác thực. Thiếu audio có thể fallback theo hợp đồng bundle, với ngôn ngữ thực tế rõ ràng; không tính fallback là đủ audio EN.

Không sửa hai POI demo DRAFT-03 hay bốn WAV Piper hiện có. Không đổi schema, không sửa Word/frontend trong mốc này. Sửa bản READY, thêm ngôn ngữ, quy trình duyệt nhiều cấp và tự động phát GPS là các mốc riêng.
