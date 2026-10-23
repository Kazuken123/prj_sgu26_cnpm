# Render Free + Aiven — staging ban đầu

Topology này được chủ đồ án lựa chọn thay Compose cho staging; Compose vẫn dùng local/test. Chưa sửa Word. Không coi CI build/smoke tạm là đã deploy staging thực.

## Web Service

Source repo root; branch main đã đạt CI; runtime Docker; Dockerfile `deploy/render/Dockerfile`; build context `.`; Root Directory để trống. Đặt cùng vùng với Render Key Value (môi trường hiện tại: Frankfurt), gói Free. Health Check Path `/health/ready`. Lần dựng đầu dùng deploy thủ công. CD sau CI sử dụng job riêng bên dưới; chỉ tính đạt sau khi job thực tế kiểm chứng đúng SHA trên URL staging.

Dùng `render.env.example` để biết tên biến. Bí mật nhập trong Environment của Render, không đưa vào mã, image, build args, log hoặc chat. DB_SSL_CA nhận PEM CA công khai của đúng project Aiven, có kiểm tra CA lẫn DNS. RENDER_EXTERNAL_URL do Render cấp; startup dùng origin HTTPS đó cho MockGateway và CORS nếu chưa có giá trị riêng. Không cấu hình wildcard CORS hoặc tắt xác minh TLS.

PAYMENT_GATEWAY=mock và MOCK_PAYMENT_SIMULATION_ENABLED=true chỉ cho demo mô phỏng, không thu tiền thật. JWT_SECRET/MOCK_WEBHOOK_SECRET là các giá trị ngẫu nhiên riêng. BOOTSTRAP_ADMIN_PASSWORD dùng khi dựng admin đầu tiên; tài khoản cũ hợp lệ không bị đổi mật khẩu. Không dùng mật khẩu demo yếu trước đây cho public staging.

Bắt buộc đặt VISIT_PRICE_VND=50000 cho bộ demo hiện tại. Đây là giá minh họa quyền dùng thuyết minh, không phải giá vé vào cửa chính thức của Thảo Cầm Viên. Server quyết định số tiền; thiếu cấu hình này thì checkout trả 503 VISIT_PRICE_NOT_CONFIGURED dù readiness vẫn đạt. Không lấy health/readiness làm bằng chứng luồng thanh toán đã chạy.

Khi triển khai thủ công, dùng **Manual Deploy → Deploy a specific commit** và chọn đúng SHA có CI xanh. Không chọn Deploy latest commit nếu main đã có thay đổi chưa kiểm chứng. Auto Deploy của Render để Off vì GitHub Actions kiểm soát việc deploy; restart dùng Restart service để giữ bản và cấu hình đang chạy. Save only chưa áp dụng cấu hình mới vào tiến trình; cần deploy áp dụng cấu hình đó và smoke test đạt.

## CD từ GitHub Actions

Chủ repo tự sao chép Deploy Hook hiện có của đúng service `tcv-staging` vào repository secret `RENDER_DEPLOY_HOOK_URL`. Không gửi hook vào chat, không ghi vào file tracked hoặc regenerate khi không cần. Hook là quyền kích hoạt deploy, không phải URL công khai. Không cần Render API key cho cơ chế này.

Job `deploy-render-staging` chỉ chạy trên push main, sau job release smoke và toàn bộ CI phía trước đạt. Các lần CD được xếp hàng bằng concurrency, không hủy giữa chừng. Nếu main đã tiến sang commit khác trước khi job bắt đầu, job ghi rõ không deploy bản cũ; đó không phải kết quả nghiệm thu staging của commit này. Job dựng riêng Dockerfile staging rồi gọi hook bằng POST kèm `ref` là SHA đầy đủ của commit đã kiểm, không deploy theo tên nhánh main đang thay đổi.

`backend/scripts/deploy-render.js` không in hook, token hoặc phản hồi lỗi của provider. Script đo health trước deploy; sau khi hook được chấp nhận, nó chờ hai lần kiểm liên tiếp cho cùng tiến trình mới, đúng SHA và cả MySQL/Redis ready. `/health` và `/health/ready` có `Cache-Control: no-store`; khi chạy trên Render với SHA hợp lệ, phản hồi thêm `deployment.commit` và `deployment.bootId` (UUID cho mỗi lần khởi động, không cấp quyền truy cập). Không sao chép toàn bộ biến môi trường ra health. Cách này tránh nhầm bản cũ còn healthy là bản mới đã triển khai, kể cả khi deploy lại cùng SHA.

Mỗi request có timeout, tối đa 90 vòng chờ với khoảng 5 giây và deadline tổng tối đa 15 phút; job có timeout 25 phút gồm cả build. Trước trigger có tối đa 60 giây để đánh thức instance Free. Hook trả 200/202 chỉ chứng minh đã nhận yêu cầu; lỗi mạng sau POST không được tự gửi lặp mù quáng. Nếu chờ hết hạn, job thất bại và giữ dữ liệu để đối soát; không tự reset DB hoặc rollback schema. Kết quả `VERIFIED_NEW_PROCESS` nghĩa là ứng dụng mới thực sự được phục vụ và qua các kiểm tra HTTP, không phải kết quả poll trạng thái API quản trị Render.

Sau đó smoke kiểm HTML frontend và ba API `/api/visits/me`, `/api/content/bundle`, `/api/admin/pois` từ chối khi thiếu token; kiểm lại SHA/mã khởi động/readiness sau smoke. Đây là smoke vận hành và ranh giới xác thực, chưa thay thế nghiệm thu thanh toán/audio qua trình duyệt hay chất lượng RAG. Lỗi migration khiến tiến trình mới không listen; chỉ thấy bản cũ hoặc readiness lỗi sẽ không vượt kiểm SHA/mã khởi động.

Nếu hook thiếu/sai, CI/CD phải báo lỗi rõ, không ghi staging thành công. Khi cần quay về bản ứng dụng cũ, dùng quy trình manual đúng SHA đã kiểm và đối chiếu schema, đồng thời xem các job CD đang chờ để tránh chúng triển khai đè. Không đổi tên/xóa bảng hoặc volume để cứu một lần deploy.

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
