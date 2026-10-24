# Bộ 15 ngôn ngữ — mở rộng có kiểm soát

Bộ ngôn ngữ được chủ đồ án chốt ngày 24/10/2026: `vi`, `en`, `zh-Hans`, `ko`, `ja`, `ru`, `fr`, `de`, `es`, `it`, `pt-BR`, `nl`, `pl`, `cs`, `tr`. Tiếng Trung giữ giản thể; tiếng Nhật giữ giọng nữ speaker 0; Bồ Đào Nha dùng giọng Brazil. Danh mục hiển thị tên bản địa của tám ngôn ngữ bổ sung.

## API nội dung

Các tuyến STAFF/ADMIN `GET/PUT /api/admin/pois/:poiId/translations/:languageCode` nhận 14 ngôn ngữ đích, giữ riêng `name`, `description`, `audioScript`, và `sourceVersion`. Tiếng Việt vẫn đi qua API nguồn POI. Chỉ mở allowlist không tự tạo/kích hoạt LANGUAGES hoặc tác vụ; yêu cầu ngôn ngữ chưa đăng ký/kích hoạt bị từ chối như trước.

Phân biệt chính xác `pt-BR` với `pt`, `pt-br`, `pt-PT`; giữ quy tắc `zh-Hans` trước đây. Nhập giống nội dung READY trả UNCHANGED, khác nội dung READY trả 409; sai phiên bản nguồn, mất quyền và job PROCESSING vẫn bị từ chối. Không tạo lại audio cũ khi nội dung không thay đổi. Đây là luồng nhập bản dịch đã chuẩn bị, chưa phải dịch máy tự động.

## Worker tùy chọn

Mặc định `PIPER_VOICE_SET=vi-en` giữ nguyên. `demo7` vẫn giữ bộ giọng trước, không ngầm nhận tám giọng mới. Chỉ bật `demo15` khi đã chuẩn bị toàn bộ mô hình và tài nguyên offline:

```text
PIPER_VOICE_SET=demo15
PIPER_MODEL_DIR=/opt/piper-models
PIPER_RESOURCE_DIR=/opt/piper-resources
PIPER_PYTHON=/opt/piper/bin/python
PIPER_FFMPEG=/usr/bin/ffmpeg
PIPER_TIMEOUT_MS=60000
```

Tám mô hình bổ sung ghim trong `backend/runtime/piper-demo15-voices.json`, đặt trong `PIPER_MODEL_DIR/demo15`; năm mô hình cũ giữ trong `demo7`. Không tải mô hình khi nhận yêu cầu khách hoặc khi worker đang xử lý job. `assertConfigured` kiểm đủ tệp/cấu hình và helper offline; thiếu hoặc sai cấu hình thì dừng. Worker vẫn giới hạn một job khi dùng Piper, có claim/lease/heartbeat và không tự dịch đè bản READY.

Dockerfile tùy chọn `backend/Dockerfile.piper-demo15` kế thừa image demo7 được dựng từ cùng checkout. Trên bản sao ngoài OneDrive, dựng các image theo thứ tự VI/EN → demo7 → demo15 và chỉ định build arg tên image nền theo môi trường. Đây không phải Dockerfile app Render và không bật worker cloud. Không đưa trọng số mô hình vào Git; các URL/hash/card được giữ trong manifest/hồ sơ nguồn.

## Dữ liệu demo 10 × 15

Giữ nguyên bộ nền `data/staging/` gồm 70 văn bản/audio của bảy ngôn ngữ. Gói bổ sung nằm trong `data/demo/fifteen/`, chỉ thêm 80 bộ vào 10 POI hiện có. Không thay tọa độ, lộ trình, phiên bản nguồn, tài khoản hay giao dịch thanh toán. Xem README trong gói để dry-run/nhập và công bố các tệp chuẩn bị sẵn.

16 bộ Hươu/Voi và tám giọng đã được chủ đồ án duyệt trực tiếp. 64 bộ mở rộng do AI dịch và so sánh với VI đã duyệt theo phạm vi được giao; chưa có người thông thạo rà độc lập. Ghi đúng mức rà soát này trong trình diễn/báo cáo. Tệp WAV PCM chuẩn không tự chứng minh ngữ nghĩa hoặc phát âm đúng. Nội dung/audio tổng hợp thật, không phải âm thử mock.

Tệp nghe thử có metadata WAV được chuẩn hóa về header 44 byte để khớp hợp đồng backend. Dữ liệu PCM của 16 mẫu đã duyệt được bảo toàn và có hash truy vết. Không coi thay header là tạo lại hoặc thay giọng.

## Staging

Dockerfile Render mang cả 70 tệp cũ và 80 tệp mới, kiểm hash/định dạng phần bổ sung lúc build. `STAGING_DEMO_EXTRA_LANGUAGES=true` yêu cầu kiểm thêm 80 tệp lúc khởi động; MySQL/Redis vẫn kiểm qua readiness hiện có. Việc đóng gói tệp không tự nhập dữ liệu vào DB.

Khi triển khai: đưa image có đủ 150 tệp lên trước, xác nhận sẵn sàng rồi mới chạy công cụ nhập bổ sung trên Aiven có TLS với cấu hình riêng. Không bật tám ngôn ngữ mới trên DB khi app vẫn chỉ chứa 70 tệp. Không chạy seed nền để ghi đè bộ đã dùng. Nếu cân nhắc quay về image chỉ có 70 tệp sau khi DB có 15 ngôn ngữ, cần đối soát kế hoạch dữ liệu trước; không rollback mù.

Word cần điều chỉnh riêng về danh sách 15 ngôn ngữ, dịch thủ công, WAV và mức rà nội dung. Mốc này không sửa Word và không nghiệm thu GPS/đường đi thực địa.
