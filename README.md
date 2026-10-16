# Hệ thống tự động thuyết minh đa ngôn ngữ cho Chùa Linh Ứng

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

1. Tạo database riêng cho dự án và nạp `database/init_db.sql` bằng công cụ quản trị MySQL. Script này có lệnh `DROP TABLE`, chỉ dùng để khởi tạo database mới, không dùng để nâng cấp dữ liệu cần giữ.
2. Cài thư viện và tạo cấu hình tại thư mục `backend`:

```powershell
cd backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

3. Điền thông tin kết nối database và `JWT_SECRET` trong `backend/.env`. Có thể sinh secret bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

4. Khởi động ứng dụng:

```powershell
npm start
```

Các địa chỉ mặc định:

- Giao diện web: `http://localhost:3000/demo/`
- Liveness: `http://localhost:3000/health`
- Readiness: `http://localhost:3000/health/ready`

Các lệnh quản trị được chạy trong `backend`:

- `npm run db:migrate`: thực hiện migration được cấu hình trong script của dự án.
- `npm run bootstrap:admin`: tạo tài khoản quản trị từ `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD`. Cấu hình các biến này trước khi chạy; không sử dụng mật khẩu mặc định.

### Chạy bằng Docker Compose

Thực hiện tại thư mục gốc repository:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Điền MYSQL_ROOT_PASSWORD, DB_PASSWORD và JWT_SECRET trước khi khởi động.
docker compose up -d --build
```

Compose sử dụng `.env` ở thư mục gốc; ứng dụng chạy trực tiếp bằng Node.js sử dụng `backend/.env`. Cổng MySQL phía máy chủ mặc định là `3307`, có thể thay bằng `MYSQL_HOST_PORT`. Dữ liệu MySQL được duy trì trong volume `db_data`.

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

Kiểm thử tích hợp cần thông tin kết nối và quyền tạo/xóa database thử nghiệm. Database thử được tạo riêng, không dùng database nghiệp vụ của nhóm.

## Tài liệu và quy ước

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
