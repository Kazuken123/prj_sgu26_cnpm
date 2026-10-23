# Render Free + Aiven — staging ban đầu

Topology này được chủ đồ án lựa chọn thay Compose cho staging; Compose vẫn dùng local/test. Chưa sửa Word. Không coi CI build/smoke tạm là đã deploy staging thực.

## Web Service

Source repo root; branch main đã đạt CI; runtime Docker; Dockerfile `deploy/render/Dockerfile`; build context `.`; Root Directory để trống. Đặt cùng vùng với Render Key Value (môi trường hiện tại: Frankfurt), gói Free. Health Check Path `/health/ready`. Lần dựng đầu dùng deploy thủ công; CD sau CI cần cấu hình/kiểm chứng riêng, chưa được tính đạt US-18 AC1 chỉ vì chọn được form tạo service.

Dùng `render.env.example` để biết tên biến. Bí mật nhập trong Environment của Render, không đưa vào mã, image, build args, log hoặc chat. DB_SSL_CA nhận PEM CA công khai của đúng project Aiven, có kiểm tra CA lẫn DNS. RENDER_EXTERNAL_URL do Render cấp; startup dùng origin HTTPS đó cho MockGateway và CORS nếu chưa có giá trị riêng. Không cấu hình wildcard CORS hoặc tắt xác minh TLS.

PAYMENT_GATEWAY=mock và MOCK_PAYMENT_SIMULATION_ENABLED=true chỉ cho demo mô phỏng, không thu tiền thật. JWT_SECRET/MOCK_WEBHOOK_SECRET là các giá trị ngẫu nhiên riêng. BOOTSTRAP_ADMIN_PASSWORD dùng khi dựng admin đầu tiên; tài khoản cũ hợp lệ không bị đổi mật khẩu. Không dùng mật khẩu demo yếu trước đây cho public staging.

Key Value dùng URL nội bộ, cùng vùng và noeviction. Không mở inbound Internet chỉ để tiện kiểm thử. Free không có persistence: mã một lần hoặc bộ đếm Redis có thể mất; trạng thái trả phí vẫn ở MySQL. Không tuyên bố Redis Free lưu bền.

## Schema và bộ dữ liệu

1. Tạo database riêng `tcv_demo_review_20261020` trên Aiven staging, không dùng database/volume cũ trên máy.
2. Kiểm tra đúng host, database và TLS. Khởi tạo schema trống bằng lệnh seed có cờ STAGING_INITIALIZE_EMPTY=true chỉ trong lần đầu đã xác nhận. Không chạy lại init_db.sql trên DB có dữ liệu.
3. Chạy lệnh nhập cố định, rồi lặp lại để xác nhận UNCHANGED. Ví dụ sau là lệnh Docker operator; file cấu hình có secret phải nằm NGOÀI repo và chứa DB_SSL_CA đúng định dạng dotenv:

```text
docker run --name tcv-staging-seed-FIRST --mount type=bind,source=ABSOLUTE_PRIVATE_ENV_PATH,target=/run/private/settings.env,readonly -e DOTENV_CONFIG_PATH=/run/private/settings.env -e DOTENV_CONFIG_QUIET=true -e STAGING_INITIALIZE_EMPTY=true tcv-render-frozen:local node -r dotenv/config scripts/staging-seed.js --database tcv_demo_review_20261020 --apply
```

Đặt tên container mới cho lần lặp, không xóa container cũ để giải phóng tên. Khi DB đã có schema hợp lệ, giữ STAGING_INITIALIZE_EMPTY=false. Không cấu hình file secret trong build context. Dùng đường dẫn thực phù hợp hệ điều hành, không dùng nguyên placeholder.

4. Image có 70 WAV, seed kiểm hash thực trước khi AVAILABLE/COMPLETED được nhập. Nội dung VI/EN/bản dịch đã duyệt giữ nguyên; không có worker mock dịch lại.
5. Khởi động Web Service. Startup chạy migration trước listen, lỗi thì dừng; không chạy seed tự động. Không tự rollback schema. Tạm quay về ứng dụng cũ chỉ khi đã đối chiếu tương thích schema/migration; giữ bản dữ liệu và bộ media đúng phiên bản.

## Nghiệm thu trên URL thật

Kiểm tra HTTPS, /health và /health/ready (MySQL + Key Value), trang frontend; đăng nhập nội bộ; checkout mô phỏng giữ PENDING; chưa trả phí không đổi quyền; mô phỏng PAID; đổi mã một lần; token khách; bundle đủ10 POI ở7 ngôn ngữ; tải đủ70 WAV bằng Bearer và kiểm hash; thiếu/sai token, JWT nội bộ dùng thay khách hoặc token khách gọi API nội bộ bị từ chối. Kiểm tra lại sau restart.

Chỉ ghi đạt khi đã chạy trên URL Render thực. Mã/URL secret, token và mật khẩu không nằm trong bằng chứng. Nếu chỉ chạy local hoặc dùng Redis thử phải ghi đúng giới hạn đó. Render Free có thể ngủ sau thời gian không dùng; chưa bật worker hoặc lưu bền audio mới. Dữ liệu hiện tại không phải nghiệm thu GPS/thực địa hay bản dịch người bản ngữ.

Nguồn hạ tầng: https://render.com/docs/free ; https://render.com/docs/key-value ; https://aiven.io/docs/platform/concepts/tls-ssl-certificates . Các hạn mức/plan cần kiểm tra lại trên giao diện tài khoản khi dựng.
