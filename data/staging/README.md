# Bộ staging cố định — Thảo Cầm Viên

Bộ dữ liệu này phục vụ lần dựng staging miễn phí đầu: 10 POI, 7 ngôn ngữ vi/en/zh-Hans/ko/ja/ru/fr, 70 văn bản READY, 70 WAV Piper đã chuẩn bị, 70 job COMPLETED và một lộ trình demo Hươu → Voi. Chủ đồ án duyệt dùng bộ audio cố định cho staging ngày 23/10/2026; worker tạo audio mới trên cloud CHƯA bật.

`dataset.json` chỉ chứa bảy bảng nội dung và metadata tệp. Không chứa USERS, REFRESH_TOKENS, VISIT_SESSIONS, PAYMENTS, CHAT_LOGS, tài khoản, mật khẩu hay token. Không copy nhật ký vận hành cũ. Tiện ích nhập ghi một audit mới trên database đích.

`media.tar.gz` gồm đúng 70 WAV đã đối chiếu SHA-256 với bằng chứng bộ demo 10×7. Kích thước giải nén 44.973.690 byte. Manifest được khóa hash trong `backend/config/staging-dataset.js`; `.gitattributes` giữ nguyên byte trên Windows/Linux. Dockerfile staging giải nén vào `/opt/tcv-media`, chạy bằng user node và không cấp quyền ghi vào thư mục này. Media không nằm trong thư mục frontend/public; vẫn đi qua API có xác thực khách.

## Nội dung, nguồn và giới hạn

Nội dung giữ nguyên từ bộ đã duyệt trong `../demo/draft03.json`, `../demo/reviewed-seven/`, `../demo/eight-pois/approved.json` và `../demo/eight-pois/languages-five.json`. Hồ sơ nguồn/duyệt nằm cùng các bộ đó. Audio được sao chép từ media demo bằng chế độ readonly; kiểm hash trước khi đóng gói. Công cụ không sinh lại giọng, không gọi dịch vụ dịch và không gắn MockTranslation vào văn bản.

Hai tọa độ Hươu/Voi là tham khảo OSM từ bản ghi đã lưu; tám tọa độ mới là vị trí minh họa đã được chấp nhận. Chưa khảo sát thực địa, nghiệm thu GPS, tuyến đi bộ hoặc khả năng tiếp cận. Lộ trình do nhóm đề xuất, không phải tour chính thức. Các bản dịch không đồng nghĩa đã được người bản ngữ rà độc lập; giọng Nhật dùng nữ theo lựa chọn của chủ đồ án. Bảy ngôn ngữ chưa đáp ứng mục tiêu 15+.

## Nhập và bảo toàn

Lệnh nhập riêng: `node scripts/staging-seed.js --database tcv_demo_review_20261020 --apply`, chạy bên trong image staging với cấu hình bảo mật phù hợp. Từ repo, đường dẫn là `backend/scripts/staging-seed.js`.

Đòi hỏi DB_NAME đúng đích, DB_HOST là Aiven, DB_SSL_MODE=verify_identity và STAGING_DEMO_MODE=frozen-20261023. Nếu database chưa có bảng, chỉ được khởi tạo khi người vận hành chủ động đặt STAGING_INITIALIZE_EMPTY=true cho lệnh seed. Khởi động bình thường không tự tạo schema trống. Nếu có schema thiếu/sai bảng, dừng đối soát; không reset, DROP hoặc chạy init chồng lên DB có dữ liệu. Migration chỉ dùng 001–006 hiện có.

Trước SQL, kiểm toàn bộ WAV, kích thước, thời lượng và hash. Chỉ nhập khi các bảng nội dung trống, ngoài hai ngôn ngữ tham chiếu VI/EN khớp schema ban đầu. Chạy lại bộ khớp hoàn toàn trả UNCHANGED, không thêm audit. Xung đột thì dừng, không UPSERT/ghi đè. Named lock chống hai tiến trình nhập trùng; nội dung và audit nằm cùng transaction, lỗi audit phải rollback.

`staging-start.js` chỉ xác minh bộ tệp đóng gói và chạy migration, KHÔNG tự chạy lại seed. Thay đổi POI/tour hợp lệ sau lần nhập không bị hoàn nguyên hoặc chặn khởi động vì manifest nguồn cũ. Khi cố tình chạy lại lệnh seed trên dữ liệu đã chỉnh, nó vẫn dừng để đối soát.

## Giới hạn vận hành

Worker cloud tắt ở mốc này. Nếu sửa kịch bản/tạo POI mới, job có thể PENDING theo nghiệp vụ hiện có nhưng chưa có worker tạo audio trên cloud. Không tuyên bố mốc này đã có kho media ghi bền cho audio mới; muốn mở chức năng đó phải cấu hình storage bên ngoài hoặc hạ tầng có ổ bền. Bộ đóng gói nguyên bản giữ qua restart/redeploy đúng phiên bản image.

Xem `../../deploy/render/README.md` để dựng staging và cấu hình không chứa bí mật. Không dùng test synthetic để ghi đè bộ demo chính.
