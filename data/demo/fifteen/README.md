# Bổ sung tám ngôn ngữ cho 10 POI

Bộ nền giữ nguyên 10 POI × 7 ngôn ngữ trong `../../staging/`. Gói này thêm `de/es/it/pt-BR/nl/pl/cs/tr`: 80 bộ tên, giới thiệu, kịch bản và 80 audio Piper. Tổng sau nhập thành công là 150 bộ văn bản/audio, không tăng số POI hoặc sửa vị trí.

## Nội dung và dấu vết

- `extension.json`: nội dung bổ sung, ID/phiên bản và fingerprint nguồn VI, danh mục ngôn ngữ.
- `authorization.json`: hash và phạm vi duyệt. Hươu/Voi được duyệt trực tiếp; 64 bộ còn lại được dịch/so sánh từ VI theo lệnh mở rộng, không gọi là người bản ngữ đã duyệt.
- `extra-*.json`: nguồn biên soạn 64 bộ cho tám POI còn lại; chưa có rà độc lập bởi người thông thạo.
- `reviewed-two-draft-source.json`: giữ nguyên bản nháp 16 bộ ban đầu để truy vết; cờ draft ban đầu không bị sửa thành phê duyệt hồi tố. Quyết định duyệt nằm riêng trong authorization.
- `audio-manifest.json` và `media.tar.gz`: 80 WAV canonical 44-byte header, PCM mono 16-bit/16 kHz, UUID và SHA-256. 16 mẫu được tái sử dụng nguyên PCM; 64 đoạn được Piper tạo từ nội dung mở rộng. Không phải mock.
- `voice-cards/` và manifest runtime: nguồn mô hình/điều kiện sử dụng. Không chứa mô hình, tài khoản, mật khẩu hoặc token.

Chỉ ba trường văn bản được bổ sung. Tọa độ Hươu/Voi vẫn là tham khảo OSM đã lưu, tám POI khác vẫn là vị trí minh họa đã được chấp nhận. Không giả thời điểm tái xác minh hoặc khẳng định GPS/đường đi thực địa. Tour Hươu → Voi vẫn là lộ trình demo do nhóm đề xuất.

## Điều kiện trước khi nhập

Cần schema/migration 001–006 hiện có, bộ nền 70 bản khớp, một ADMIN đang hoạt động, cấu hình MySQL riêng qua môi trường và thư mục media riêng ngoài frontend/public. Cài dependency/chạy công cụ trên bản sao ngoài OneDrive. Database đích duy nhất của CLI là `tcv_demo_review_20261020`; cấu hình DB_NAME và database vật lý phải khớp. Các database UUID chỉ dùng trong test.

Công cụ không init/reset database, không thêm bảng/cột và không sửa seed/migration cũ. Nếu nội dung, phiên bản, danh mục, trạng thái job hoặc tệp đang có khác dự kiến, dừng đối soát; không tự UPSERT/ghi đè hoặc retry job FAILED. Không nhập vào tài nguyên cũ chỉ vì có cùng tên database.

## Chạy trên bản sao repo đã cài backend dependencies

Chỉ nhập văn bản/tác vụ, mặc định dry-run:

```text
node data/demo/fifteen/operator/run.cjs --database tcv_demo_review_20261020
node data/demo/fifteen/operator/run.cjs --database tcv_demo_review_20261020 --apply
```

Để công bố luôn 80 audio đã chuẩn bị, giải nén gói vào đúng MEDIA_ROOT riêng (gồm cả 70 tệp nền), xác minh không có xung đột tệp, rồi dùng lệnh dưới đây. Thay đường dẫn ví dụ bằng đường dẫn tuyệt đối đúng môi trường; trên staging `/opt/tcv-media` đã có trong image mới:

```text
node data/demo/fifteen/operator/publish.cjs --database tcv_demo_review_20261020 --media-root /opt/tcv-media
node data/demo/fifteen/operator/publish.cjs --database tcv_demo_review_20261020 --media-root /opt/tcv-media --apply
```

Lệnh publish kiểm cả 80 hash, WAV và kịch bản trước khi vào transaction; không gọi nhà cung cấp TTS hoặc dịch. Trong transaction, nó nhập phần thiếu, chỉ công bố audio cho READY đúng nguồn và job PENDING chưa có claim/lease, rồi chuyển job COMPLETED và ghi audit. Đây là nhập artifact đã chuẩn bị, không giả rằng worker cloud đang chạy. Worker Piper thật là luồng riêng đã kiểm thử.

Gửi đồng thời được tuần tự hóa bằng named lock. Chạy lại dữ liệu/tệp khớp trả UNCHANGED, không thêm audit và không thay 70 bản cũ. Lỗi audit hoặc lưu dữ liệu rollback toàn thao tác; tệp đóng gói được giữ nguyên để đối soát. Không xóa media cũ. Khi mất phản hồi, kiểm trạng thái trước khi gửi lại.

## Trình tự lên staging

Đưa image có 150 tệp lên và xác nhận readiness trước, sau đó mới áp dụng dữ liệu bổ sung bằng cấu hình Aiven/TLS riêng. Không đưa mật khẩu vào lệnh, log, Git hoặc tài liệu. Không dùng thao tác này để tự tạo lại user hoặc làm thay đổi token/vé.

Kiểm token khách → bundle của đủ 15 mã → 10 POI/150 liên kết audio không fallback → tải có xác thực. Kiểm từ chối khi thiếu/sai/hết hạn/thu hồi token và khi dùng JWT nội bộ thay token khách. Ghi đúng môi trường đã chạy, không dùng kết quả DB thử để tuyên bố staging đã cập nhật.
