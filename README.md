# Hệ thống du lịch ẩm thực có thuyết minh đa ngôn ngữ

Nhóm chọn phần backend 3 lớp và CI/CD. Bản hiện tại tập trung US-01–03: đăng ký khách/chủ quán, đăng nhập, refresh/logout, xem tài khoản và trạng thái đơn owner, cùng nền phân quyền. POI, duyệt owner, đa ngôn ngữ và TTS sẽ triển khai ở các US tiếp theo.

## Kiến trúc

Luồng xử lý: Client → Router → Service → Store → MySQL.

- `routers/`: nhận HTTP, gọi Service và trả response.
- `services/`: validation và quy tắc tài khoản, khóa sau 5 lần sai trong 15 phút, token và quyền owner.
- `stores/`: SQL và transaction. Tạo user + đơn owner được commit/rollback cùng nhau. Đăng nhập khóa hàng user để cập nhật số lần sai chính xác khi có nhiều request.
- `middlewares/`: xác thực qua Service, kiểm tra vai trò, guard owner đã được duyệt và xử lý lỗi.
- `scripts/check.js`: kiểm tra cú pháp tất cả file JS backend, dependency tương đối và ranh giới import giữa các tầng. Đây không phải ESLint hoặc kiểm chứng kiến trúc đầy đủ.

Access token JWT có thời hạn 1 giờ, xác minh HS256/issuer/audience. Refresh token ngẫu nhiên có thời hạn tuyệt đối 7 ngày; database chỉ lưu SHA-256. Refresh đổi token một lần sử dụng. Logout thu hồi phiên, khiến access token của phiên đó cũng không còn dùng được. Vai trò/trạng thái tài khoản được đọc lại từ database mỗi request có xác thực.

Token của phiên bản cũ không có session/issuer/audience nên cần đăng nhập lại sau khi nâng cấp.

Owner PENDING được đăng nhập và xem đơn của mình. Guard `requireApprovedOwner` chỉ cho phép nghiệp vụ quán khi user ACTIVE và đơn mới nhất APPROVED; sẽ gắn vào router nghiệp vụ ở US tiếp theo. Quyền sở hữu từng POI chưa nằm trong bản này.

## Chạy local với database đã có

Yêu cầu Node.js 20 hoặc 22 và MySQL 8. Local đã được kiểm tra thêm với Node 24.21.0 và MariaDB 10.4.32.

Chạy trong PowerShell:

```powershell
cd backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Điền `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` và `JWT_SECRET` trong `backend/.env`. Giữ cấu hình database hiện có của nhóm nếu đã có file này. Sinh secret riêng bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Với database đã có USERS và OWNER_REQUESTS, chỉ chạy migration bổ sung:

```powershell
npm run db:migrate
npm start
```

Migration có thể chạy lại; chỉ tạo REFRESH_TOKENS nếu chưa có. `database/init_db.sql` dành cho database mới/test, có DROP TABLE và không dùng để nâng cấp database chứa dữ liệu đang cần giữ. Thời gian khóa và hết hạn phiên trong bản mới được ghi/đọc theo UTC.

Mở `http://localhost:3000/demo/` để đăng ký, đăng nhập, xem tài khoản, xem đơn owner và đăng xuất. Giao diện dùng sessionStorage để lưu token trong tab demo, không in token vào console. Trang dashboard địa điểm cũ chưa kết nối được vì POI API chưa triển khai; đăng nhập hiện đi tới trang tài khoản.

Tạo admin bằng cách đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong môi trường hoặc `backend/.env`, rồi chạy `npm run bootstrap:admin`. Chỉ chạy chủ động khi cần tài khoản admin; script không nâng vai trò tourist và không đổi mật khẩu admin hợp lệ đã có. Nếu đúng hash placeholder của seed cũ, lệnh sẽ thay hash giả bằng mật khẩu bạn cung cấp. Seed mới không chứa hash giả hoặc mật khẩu admin mặc định.

## API của US-01–03

Response thành công đăng ký/đăng nhập/refresh dùng `{ message, data }`; lỗi dùng `{ code, error }`.

- `POST /api/auth/register`: email, password; fullName và phoneNumber tùy chọn. Vai trò luôn TOURIST.
- `POST /api/auth/register-owner`: thêm restaurantName, restaurantAddress, phoneNumber bắt buộc. Vai trò OWNER, trạng thái PENDING.
- `POST /api/auth/login`: email, password. Trả `data.user`, `data.accessToken`, `data.refreshToken`.
- `POST /api/auth/refresh`: refreshToken. Trả cặp token mới; token refresh cũ không dùng lại.
- `POST /api/auth/logout`: refreshToken hiện tại. Trả 204; có thể gọi lại.
- `GET /api/auth/me`: Bearer access token.
- `GET /api/auth/owner-request/status`: Bearer access token của OWNER; trả status, rejectionReason, restaurantName.
- `GET /health`: liveness.
- `GET /health/ready`: database và các bảng auth sẵn sàng; lỗi trả 503.

Các trạng thái lỗi chính: 400 dữ liệu/JSON sai, 401 xác thực không hợp lệ, 403 sai quyền hoặc tài khoản bị admin khóa, 409 trùng email, 423 khóa tạm sau 5 lần sai, 500 lỗi server, 503 chưa sẵn sàng. Mật khẩu tối thiểu 8 ký tự, tối đa 72 bytes UTF-8 để tránh bcrypt cắt ngắn mật khẩu.

## Kiểm thử

```powershell
cd backend
npm run lint
npm test
$env:RUN_DB_TESTS = '1'
npm run test:integration
```

Integration test cần tài khoản database có quyền tạo/xóa database thử nghiệm. Mỗi lần chạy tạo tên ngẫu nhiên `food_tour_auth_test_<uuid>`, nạp schema vào đó và chỉ xóa database này khi kết thúc. Không nạp init_db.sql vào DB_NAME của nhóm.

CI đặt RUN_DB_TESTS=1 nên lỗi kết nối/schema sẽ làm test thất bại, không âm thầm bỏ qua integration. Khi chạy npm test thông thường mà không đặt biến này, nhóm integration được bỏ qua.

Một số môi trường sandbox chặn tạo test worker với lỗi spawn EPERM. Trên Node 24 có thể chạy:

```powershell
$env:RUN_DB_TESTS = '1'
node --test --experimental-test-isolation=none tests/*.test.js
```

Không thêm tùy chọn này vào script CI vì CI vẫn dùng Node 20/22.

## Docker và pipeline

Docker build context là thư mục gốc repo:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Điền MYSQL_ROOT_PASSWORD, DB_PASSWORD và JWT_SECRET riêng.
docker compose up -d --build
```

Root `.env` dành cho Compose, khác với `backend/.env` dành cho chạy local. Production yêu cầu JWT_SECRET ít nhất 32 bytes. MySQL trong Compose công bố cổng local 3307 mặc định để có thể cùng tồn tại với MySQL/MariaDB local trên 3306. Có thể đặt MYSQL_HOST_PORT nếu cần cổng khác. Docker context loại trừ .env và node_modules; frontend demo và migration được đưa vào image.

Workflow hiện tại:

1. Push mọi nhánh và PR nhắm main/master chạy kiểm tra.
2. MySQL 8 và Node 20/22 chạy syntax/import checks, unit/HTTP/integration tests.
3. Khi push main đạt kiểm tra, build image và đóng gói đầy đủ runtime, frontend, SQL/migration và cấu hình Compose.
4. Job sau tải chính artifact đó, chạy container, kiểm tra readiness và đăng ký → login → refresh → logout.
5. Container CI được dọn sau khi kiểm tra. Đây là release smoke test, chưa phải staging tồn tại lâu dài theo US-18.

Required checks để chặn merge phải được cấu hình trên GitHub; file workflow không tự tạo branch protection. Chưa có bằng chứng chạy workflow remote hoặc Docker build trong lần sửa local này.

## Phạm vi tài liệu

SQL hiện có 15 bảng, gồm bảng phiên REFRESH_TOKENS. Báo cáo/ERD cũ còn cần đồng bộ mô hình dữ liệu và phạm vi FE demo; không dùng các sơ đồ cũ để kết luận bản hiện tại đã triển khai POI/TTS hay staging.
