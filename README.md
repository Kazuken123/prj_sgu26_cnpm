# Hệ thống tự động thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn

## Hiện trạng backend theo báo cáo 8

Đã bổ sung API nội bộ xem/tạo/sửa/ngừng POI, phân loại điểm, thông tin bảo tồn và khung giờ; lưu nguồn tiếng Việt, audit và tác vụ PENDING cùng giao dịch. Bước 2 bổ sung [xem trạng thái và thử lại tác vụ lỗi](docs/BACKEND_CONTENT_JOBS_STAGE2.md), kiểm phiên bản và audit cùng transaction. Tác vụ mới chỉ được ghi nhận/chuyển lại PENDING, chưa có worker dịch/TTS. Bước 3 bổ sung [khởi tạo CASH/ONLINE PENDING và tra cứu trạng thái tối thiểu](docs/BACKEND_PENDING_PAYMENTS_STAGE3.md), chưa xác nhận tiền, gọi cổng hoặc cấp quyền; US-A02 AC1 chưa đáp ứng. Chưa có bundle hoặc chatbot. Frontend được phát triển riêng; không coi các trang đang chờ kết nối là chức năng backend hoàn thành.

Xem [hợp đồng API và đối chiếu UC-13](docs/BACKEND_POI_STAGE1.md). Chạy migration 001–004 trước khi dùng database cũ có schema 16 bảng. Các migration này không tự chuyển database nghiệp vụ cũ sang toàn bộ mô hình mới. JWT issuer/audience và tên database mặc định được giữ để tương thích cấu hình/phiên đang có.

Bước 4 bổ sung [tra cứu phiên tiền mặt cho STAFF/ADMIN](docs/BACKEND_CASH_LOOKUP_STAGE4.md): đọc đúng session_id, mã tham chiếu, số tiền đã lưu và trạng thái; phạm vi mốc 4 chưa xác nhận đã nhận tiền, kích hoạt phiên hoặc cấp mã. Không có migration mới. Commit 57c55db đã có CI xanh trên Node 20/22, MySQL 8 và Redis 7, mỗi bản Node chạy 139 test đạt.

Bước 5 bổ sung [xác nhận đã nhận tiền mặt và kích hoạt phiên](docs/BACKEND_CASH_CONFIRMATION_STAGE5.md): CASH/PENDING chuyển PAID, phiên chuyển ACTIVE và audit được lưu trong cùng transaction; chống xác nhận lặp/đồng thời. `VISIT_VALIDITY_HOURS` mặc định 24 giờ từ lúc xác nhận, thay đổi cấu hình không đổi vé cũ. Phạm vi mốc 5 chưa sinh auth_code/mã ngắn hoặc token. Commit 7f021b8 đã có CI xanh; không có migration.

Bước 6 bổ sung [cấp mã sau thanh toán tiền mặt](docs/BACKEND_CASH_CODES_STAGE6.md): gọi cash-code sau confirm-cash để tạo auth_code và mã ngắn 6 chữ số, mặc định 600 giây và không vượt hạn vé. Mã còn hạn được dùng lại; mã hết hạn được tạo mới nếu chưa có token, giữ nguyên payment và hạn vé. Phạm vi mốc 6 chưa đổi mã lấy token. Commit 4c7a2af của mốc 6 và commit sửa lỗi 74656ee đã có CI xanh; các ghi chú chờ CI trong tài liệu mốc 6 là lịch sử trước push.

Bước 7 bổ sung [đổi mã tiền mặt lấy token khách một lần](docs/BACKEND_CASH_EXCHANGE_STAGE7.md): gửi sessionId cùng shortedCode, kiểm tra CASH/PAID/ACTIVE còn hạn, lưu hash token và audit cùng transaction. Mặc định tối đa 5 lượt/phút theo phiên và 30 lượt/phút theo IP; Redis lỗi trước xác minh thì không cấp token. Lỗi dọn mã sau commit không cấp được token lần hai. Mất phản hồi sau khi token đã lưu chưa có cơ chế khôi phục/cấp lại; hướng dẫn liên hệ nhân viên và không thanh toán lại. Local đạt 207 test với MariaDB và Redis thay thế; Redis thật/MySQL 8/CI cho mốc 7 chưa kiểm chứng. Chưa có middleware/API kiểm tra token khách, bundle hoặc frontend, nên chưa gọi đây là toàn bộ luồng tham quan hoàn chỉnh. Không có migration mới.

Bước 7 đã push bằng commit 45a2fe8 và [CI/CD xanh](https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39352061812), gồm backend Node 20/22 với MySQL 8 và Redis 7 thật. Các ghi chú chờ CI ở đoạn/tài liệu mốc 7 phía trên mô tả thời điểm trước push.

Bước 8 bổ sung [kiểm tra quyền khách và demo luồng tiền mặt qua API](docs/BACKEND_VISITOR_ACCESS_STAGE8.md): `GET /api/visits/me` chỉ dùng token khách, đọc lại payment/phiên/hạn vé từ SQL trên từng request, trả mã phiên/trạng thái/hạn vé tối thiểu. Token sai, vé hết hạn, phiên thu hồi, payment không PAID và JWT nội bộ bị từ chối. Local đạt 217 test với MariaDB/Redis thay thế; mốc 8 chưa commit/push, chưa có CI mới. Luồng tiền mặt kiểm thử được đến sử dụng token ở API khách; chưa có bundle, nghe thuyết minh hoặc frontend. Không có migration mới.

Mốc 8 đã được chốt bằng commit 64523ce và [CI/CD xanh](https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39356052063); ghi chú chưa push trong tài liệu mốc 8 là lịch sử trước push. Luồng CASH đến API khách đã kiểm chứng trên CI của commit đó.

Bước 9 bổ sung [khởi tạo ONLINE qua MockGateway](docs/BACKEND_ONLINE_CHECKOUT_STAGE9.md): `POST /api/payments/online-checkout` tạo/dùng lại ONLINE/PENDING, trả URL mock và authCode mặc định 15 phút; retry giữ giá, mã và deadline cũ. Mã đã phát hành mà mất/hết hạn không được tự cấp lại. URL mock hiện chỉ xem JSON, không thu tiền, không có webhook/thành công/thất bại hoặc token ONLINE. Không sửa frontend/schema; API tạo PENDING cũ giữ nguyên. Local 245 test đạt với MariaDB/Redis thay thế; mốc 9 chưa commit/push và chưa có CI mới.

Đồ án môn **Công nghệ phần mềm**, xây dựng ứng dụng web hỗ trợ khách tham quan tiếp cận nội dung theo vị trí và ngôn ngữ lựa chọn. Trọng tâm kỹ thuật là Back-end ba lớp **Router–Service–Store**, kiểm thử tự động và quy trình CI/CD.

## Tổng quan sản phẩm

Hệ thống được thiết kế cho ba nhóm người dùng:

- **Khách tham quan:** quét QR, thanh toán để nhận quyền truy cập, xem bản đồ và POI, đọc nội dung, nghe thuyết minh, tùy chỉnh lộ trình và hỏi chatbot.
- **Nhân viên (STAFF):** tạo hoặc chọn phiên tham quan chờ, xác nhận tiền mặt và quản lý dữ liệu tham quan theo quyền.
- **Quản trị viên (ADMIN):** quản lý tài khoản nhân viên, xem nhật ký thao tác và theo dõi sức khỏe, tình hình sử dụng hệ thống.

Các nhóm chức năng của sản phẩm gồm thanh toán và phiên tham quan, bản đồ/GPS, thuyết minh đa ngôn ngữ, pipeline dịch và tạo audio, lộ trình tham quan, chatbot RAG, quản trị và monitoring. Nội dung văn bản và audio được chuẩn bị trước; dữ liệu tham quan được cung cấp cho giao diện qua content bundle.

## Kiến trúc và công nghệ

Back-end được tổ chức trong một ứng dụng Express, với chiều phụ thuộc chính:

```text
Ứng dụng web → Router → Service → Store → MySQL / Redis
                           └→ Adapter → Dịch vụ bên ngoài
```

- **Router:** tiếp nhận HTTP, áp dụng middleware và trả phản hồi.
- **Service:** kiểm tra dữ liệu, điều kiện và quy tắc nghiệp vụ.
- **Store:** truy cập dữ liệu, thực hiện transaction và thao tác nguyên tử khi cần.
- **Adapter:** bao gói giao tiếp với dịch vụ thanh toán, dịch, TTS, AI và kho tệp.

Thiết kế sử dụng JavaScript, Node.js, Express, MySQL và Redis. Giao diện web dùng HTML, CSS, JavaScript, Leaflet và OpenStreetMap. Docker, Docker Compose và GitHub Actions phục vụ đóng gói, kiểm thử và triển khai.

Phiên đăng nhập nội bộ và phiên tham quan được quản lý độc lập. Xác thực tài khoản nội bộ sử dụng mật khẩu băm bằng bcrypt, access token JWT và refresh token được lưu dạng hash.

## Cấu trúc thư mục

```text
prj_sgu26_cnpm/
├── .github/workflows/    Cấu hình GitHub Actions
├── backend/
│   ├── config/          Cấu hình ứng dụng và kết nối
│   ├── routers/         Tiếp nhận yêu cầu HTTP
│   ├── services/        Xử lý nghiệp vụ
│   ├── stores/          Truy cập dữ liệu
│   ├── middlewares/     Xác thực, phân quyền và xử lý lỗi
│   ├── utils/           Thành phần dùng chung
│   ├── scripts/         Công cụ kiểm tra và quản trị
│   ├── tests/           Kiểm thử tự động
│   └── server.js        Khởi tạo ứng dụng
├── database/
│   ├── init_db.sql      Schema và dữ liệu khởi tạo
│   └── migrations/      Các thay đổi cơ sở dữ liệu
├── docs/
│   └── diagram/         Sơ đồ phân tích và thiết kế
├── frontend/            Giao diện web
├── .env.example         Mẫu cấu hình Docker Compose
└── docker-compose.yml   Cấu hình các dịch vụ container
```

## Cài đặt và chạy

### Chạy với Node.js và MySQL

Sử dụng Node.js tương thích với cấu hình trong `.github/workflows/ci-cd.yml`, npm và MySQL 8.

1. Tạo database trống trên MySQL 8.0.16 trở lên và nạp `database/init_db.sql` bằng công cụ quản trị MySQL. Script tạo 16 bảng theo thiết kế, không xóa dữ liệu và không dùng để nâng cấp database cũ. Xem [hướng dẫn database](database/README.md) trước khi sử dụng.

   Tài khoản nội bộ chỉ có STAFF/ADMIN; không có đăng ký công khai. Sau khi cấu hình database, tạo ADMIN bằng `npm run bootstrap:admin`, đăng nhập tại `/demo/` rồi chọn tạo nhân viên trong trang tài khoản. Backend kiểm tra quyền ADMIN cho thao tác này.
2. Cài thư viện và tạo cấu hình tại thư mục `backend`:

```powershell
cd backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

3. Điền thông tin kết nối database và `JWT_SECRET` trong `backend/.env`. Để tạo payment mới, điền giá đã thống nhất vào `VISIT_PRICE_VND` (không có giá mặc định). Để tra cứu trạng thái khách, chạy Redis và đặt `REDIS_URL`; Redis lỗi thì tra cứu trả 503. Có thể sinh secret bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

4. Điền `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong `backend/.env`, chạy `npm run bootstrap:admin` một lần để tạo tài khoản quản trị. Nếu tài khoản đã có mật khẩu hợp lệ, lệnh không đổi mật khẩu.

5. Khởi động ứng dụng:

```powershell
npm start
```

Các địa chỉ mặc định:

- Giao diện web: `http://localhost:3000/demo/`
- Liveness: `http://localhost:3000/health`
- Readiness: `http://localhost:3000/health/ready`

Các lệnh quản trị được chạy trong `backend`:

- `npm run db:migrate`: chạy migration 001–004 để nâng cấp logout, POI và khóa nhận diện yêu cầu thanh toán nếu cần. Phải có schema 16 bảng theo thiết kế; không chuyển toàn bộ database nghiệp vụ cũ sang thiết kế mới. Xem [hợp đồng logout](docs/LOGOUT_CONTRACT.md), [POI](docs/BACKEND_POI_STAGE1.md) và [PENDING payment](docs/BACKEND_PENDING_PAYMENTS_STAGE3.md).
- `npm run bootstrap:admin`: tạo tài khoản quản trị từ `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD`. Cấu hình các biến này trước khi chạy; không sử dụng mật khẩu mặc định.

### Chạy bằng Docker Compose

Thực hiện tại thư mục gốc repository:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Điền MYSQL_ROOT_PASSWORD, DB_PASSWORD và JWT_SECRET trước khi khởi động.
docker compose up -d --build
```

Compose sử dụng `.env` ở thư mục gốc; ứng dụng chạy trực tiếp bằng Node.js sử dụng `backend/.env`. Cổng MySQL phía máy chủ mặc định là `3307`, có thể thay bằng `MYSQL_HOST_PORT`. Dữ liệu MySQL được duy trì trong volume `db_data`. Với database mới, sau khi container sẵn sàng, có thể bootstrap ADMIN bằng `docker compose exec -T -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD backend npm run bootstrap:admin`; đặt hai biến này trong môi trường terminal trước khi chạy. Init script không nâng cấp volume đã có dữ liệu.

## Kiểm thử

Thực hiện tại thư mục `backend`:

```powershell
npm run lint
npm test
```

`npm run lint` chạy bộ kiểm tra cú pháp và ranh giới dependency của dự án.

Để chạy kiểm thử tích hợp với MySQL:

```powershell
$env:RUN_DB_TESTS = '1'
npm run test:integration
```

Bộ kiểm thử tích hợp sử dụng schema 16 bảng và kiểm tra phân quyền STAFF/ADMIN, tạo nhân viên kèm audit trong transaction, refresh/logout, khóa đăng nhập và migration refresh token. Smoke test bản đóng gói bootstrap ADMIN trong database dùng riêng cho CI.

Kiểm thử tích hợp cần thông tin kết nối và quyền tạo/xóa database thử nghiệm. Database thử được tạo riêng, không dùng database nghiệp vụ của nhóm.

## Tài liệu và quy ước

- Sơ đồ ERD: [erd_diagram.drawio](docs/diagram/erd_diagram.drawio).
- Sơ đồ Component: [component_diagram.drawio](docs/diagram/component_diagram.drawio).
- Sơ đồ Activity: [`docs/diagram/activity/`](docs/diagram/activity/).
- Sơ đồ Use Case: [`docs/diagram/use case/`](docs/diagram/use%20case/).
- Cấu hình workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).
- Thay đổi schema được quản lý bằng migration; các phần yêu cầu, thiết kế và kiểm thử cần được cập nhật nhất quán.
- Không commit file `.env`, mật khẩu, token hoặc khóa dịch vụ.

## Thành viên

- Lê Văn Hiếu
- Lê Đức Anh
- Dương Gia Phát
