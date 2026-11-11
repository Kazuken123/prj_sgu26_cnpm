# Hệ thống tự động thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn

Ứng dụng web hỗ trợ du khách tham quan **Thảo Cầm Viên Sài Gòn** tiếp cận thông tin thuyết minh (văn bản và giọng đọc tự nhiên) tự động theo vị trí định vị GPS và ngôn ngữ lựa chọn ngay trên trình duyệt di động, kết hợp trợ lý hỏi đáp thông minh (RAG) và phân hệ quản trị – giám sát vận hành tập trung.

---

## Thông tin đồ án

- **Môn học:** Công nghệ phần mềm
- **Trường:** Đại học Sài Gòn (SGU) — Lớp **DCT124C1**
- **Giảng viên hướng dẫn:** Thầy Nguyễn Quốc Huy
- **Nhóm sinh viên thực hiện:**
  - **Lê Văn Hiếu** — MSSV: `3124411091`
  - **Lê Đức Anh** — MSSV: `3124411009`
  - **Dương Gia Phát** — MSSV: `3124411212`

---

## Tổng quan sản phẩm

Hệ thống được thiết kế xoay quanh **18 Use Case (`UC-01` đến `UC-18`)** phục vụ 3 nhóm tác nhân chính:

### 1. Phân hệ Du khách (`UC-01` – `UC-08`)
- **Truy cập nhanh không cần tài khoản (`UC-01`, `UC-02`):** Du khách quét mã QR tại cổng, chọn thanh toán trực tuyến hoặc thanh toán tiền mặt tại quầy để nhận mã ngắn 6 chữ số và đổi lấy token phiên tham quan có hiệu lực **24 giờ**.
- **Bản đồ số tương tác & Gói dữ liệu độc lập (`UC-03`, `UC-04`):** Tải gói dữ liệu tham quan (*Content Bundle*) một lần duy nhất theo ngôn ngữ đã chọn; hiển thị bản đồ số Leaflet/OpenStreetMap với vị trí hiện tại, danh sách **18 điểm tham quan (POI)**, hình ảnh minh họa và khoảng cách thực tế.
- **Thuyết minh thủ công & Tự động theo tọa độ GPS (`UC-05`, `UC-06`):** Tự động kích hoạt phát âm thanh khi du khách di chuyển vào bán kính kích hoạt của điểm tham quan ($R = 30\text{m}$ hoặc $35\text{m}$) dựa trên công thức khoảng cách mặt cầu **Haversine**. Áp dụng cơ chế trễ (*Hysteresis*) với ngưỡng rời vùng $1.5 \times R$ ($45\text{m}$ hoặc $52.5\text{m}$) để chống phát lặp. Hỗ trợ bộ điều khiển giả lập tọa độ GPS phục vụ kiểm thử và trình diễn.
- **Lộ trình tham quan tùy chỉnh (`UC-07`):** Cung cấp **4 lộ trình mẫu** (*Khám phá nhanh*, *Gia đình & Trẻ em*, *Di sản & Thực vật*, *Toàn cảnh*) và cho phép du khách tự thêm/bớt điểm tham quan trên bản đồ.
- **Trợ lý hỏi đáp thông minh RAG (`UC-08`):** Giải đáp câu hỏi của du khách dựa trên kho tài liệu kiến thức đã được kiểm duyệt về Thảo Cầm Viên Sài Gòn kèm trích dẫn nguồn xác thực; chủ động từ chối trả lời khi câu hỏi nằm ngoài phạm vi tài liệu.

### 2. Phân hệ Nhân viên vận hành (`STAFF` — `UC-11` – `UC-15`)
- **Quầy thu ngân & Xác nhận tiền mặt (`UC-11`):** Tra cứu phiên chờ thanh toán, xác nhận đã thu tiền mặt và phát hành mã ngắn 6 chữ số (lưu trên Redis kèm thời gian sống hữu hạn) cho du khách.
- **Hỗ trợ cấp lại vé tham quan (`UC-12`):** Đối chiếu thông tin phiên vé còn hạn khi du khách đổi thiết bị hoặc mất bộ nhớ trình duyệt, thu hồi token cũ và cấp mã nhận vé 6 chữ số mới mà không thu tiền lại.
- **Quản trị nội dung đa ngôn ngữ & Lộ trình (`UC-13`, `UC-14`):** Tạo mới, cập nhật tọa độ, bán kính, nội dung thuyết minh của các điểm tham quan và quản lý danh mục lộ trình mẫu; theo dõi và thử lại các tác vụ dịch thuật / tạo âm thanh nền.
- **Quản lý kho tri thức hỏi đáp (`UC-15`):** Quản lý tài liệu nguồn, phân đoạn văn bản (*chunking*) và cập nhật chỉ mục tìm kiếm phục vụ trợ lý RAG.

### 3. Phân hệ Quản trị viên & Bảo mật (`ADMIN` — `UC-09`, `UC-10`, `UC-16` – `UC-18`)
- **Xác thực nội bộ an toàn (`UC-09`, `UC-10`, `UC-16`):** Đăng nhập bằng mật khẩu băm `bcrypt`, cấp phát Access Token JWT ngắn hạn kết hợp xoay vòng Refresh Token (lưu băm `SHA-256`), tự động khóa tài khoản tạm thời sau 5 lần đăng nhập sai liên tiếp; chỉ `ADMIN` mới có quyền tạo tài khoản `STAFF`.
- **Nhật ký kiểm toán bất biến (`UC-17`):** Ghi nhận toàn bộ thao tác nhạy cảm (xác nhận tiền, cấp lại vé, thay đổi POI/tour/tài liệu, tạo tài khoản) vào bảng `AUDIT_LOGS` chỉ cho phép ghi thêm (*append-only*).
- **Giám sát sức khỏe hệ thống & Thống kê hiện diện (`UC-18`):** Theo dõi trạng thái kết nối MySQL/Redis, thống kê doanh thu, ngôn ngữ sử dụng, mật độ khách đang hiện diện theo thời gian thực và xếp hạng các điểm tham quan được ghé thăm nhiều nhất.

---

## Quy mô dữ liệu & Kiểm thử

| Hạng mục | Thông số thực tế trong dự án |
| :--- | :--- |
| **Điểm tham quan (POI)** | **18 điểm** tại Thảo Cầm Viên Sài Gòn (Động vật, Thực vật, Di sản văn hóa – lịch sử) |
| **Ngôn ngữ hỗ trợ** | **15 ngôn ngữ** (`vi`, `en`, `zh`, `ja`, `ko`, `fr`, `de`, `es`, `it`, `pt`, `ru`, `ar`, `th`, `id`, `ms`) |
| **Bản dịch & Âm thanh** | **270 bản dịch** thuyết minh + **270 tệp âm thanh WAV** tổng hợp qua **Piper TTS** |
| **Lộ trình tham quan mẫu** | **4 lộ trình** được thiết kế theo nhóm nhu cầu thực tế của du khách |
| **Cơ sở dữ liệu** | **16 bảng nghiệp vụ gốc** + **4 bảng thống kê hiện diện** (quản lý qua **7 bản migration**) |
| **Kiểm thử tự động** | **730 bài kiểm thử** (**515 test Back-end** + **215 test Front-end**), kiểm tra tĩnh **243 tệp JS** & TypeScript |

---

## Kiến trúc hệ thống và Công nghệ sử dụng

### Kiến trúc Back-end 3 lớp nghiêm ngặt

Back-end được xây dựng trên nền tảng **Node.js** và **Express**, tuân thủ nghiêm ngặt chiều phụ thuộc một chiều giữa 3 lớp (được kiểm tra tự động bằng script `npm run lint` và bộ test ranh giới kiến trúc):

```text
Ứng dụng Web (React SPA) ──► Router ──► Service ──► Store ──► MySQL 8.0 / Redis 7
                                           └──► Adapter ──► Dịch vụ ngoài (Payment, Translation, Piper TTS, AI RAG)
```

- **Router (`backend/routers/`):** Tiếp nhận HTTP request, áp dụng middleware xác thực/phân quyền, kiểm tra định dạng đầu vào và trả về HTTP response chuẩn hóa. Không chứa logic nghiệp vụ hay câu lệnh SQL.
- **Service (`backend/services/`):** Xử lý toàn bộ quy tắc nghiệp vụ, kiểm tra điều kiện hạn vé, điều phối pipeline nội dung, đóng gói bundle và gọi các Adapter.
- **Store (`backend/stores/`):** Đóng gói truy vấn SQL tham số hóa tới MySQL và thao tác nguyên tử trên Redis; quản lý giao dịch (`COMMIT` / `ROLLBACK`).
- **Adapter (`backend/adapters/`):** Bao gói giao tiếp với cổng thanh toán, dịch thuật, tổng hợp giọng nói Piper TTS, mô hình ngôn ngữ AI và hệ thống tệp âm thanh.

### Danh mục công nghệ

- **Front-end:** React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS, Leaflet & OpenStreetMap, HTML5 Geolocation & Audio API.
- **Back-end:** Node.js 20, Express 4.21, `mysql2/promise`, `redis`, `bcryptjs`, `jsonwebtoken`, `helmet`.
- **Cơ sở dữ liệu & Lưu trữ:** MySQL 8.0 (dữ liệu định danh, phiên vé, thanh toán, POI, lộ trình, RAG, kiểm toán, thống kê) và Redis 7 (mã ngắn 6 chữ số đổi vé, bộ đếm giới hạn tần suất).
- **Tổng hợp giọng nói (TTS):** Piper Neural TTS 1.8.0 tạo tệp âm thanh WAV đa ngôn ngữ.
- **Đóng gói & CI/CD:** Docker, Docker Compose và GitHub Actions (`.github/workflows/ci-cd.yml`).

### Sơ đồ Kiến trúc & Cơ sở dữ liệu tương tác (Archify)

- **Sơ đồ Kiến trúc Hệ thống:** [`docs/architecture/architecture-tcv-audioguide.html`](docs/architecture/architecture-tcv-audioguide.html)
- **Sơ đồ Cơ sở Dữ liệu (ERD):** [`docs/architecture/erd-tcv-database.html`](docs/architecture/erd-tcv-database.html)
- **Hướng dẫn xem và cập nhật sơ đồ:** [`docs/architecture/README.md`](docs/architecture/README.md)

---

## Cấu trúc thư mục

```text
prj_sgu26_cnpm/
├── .github/workflows/       # Cấu hình pipeline CI/CD trên GitHub Actions
├── backend/                 # Mã nguồn máy chủ Back-end (Node.js / Express)
│   ├── adapters/            # Bộ điều hợp dịch vụ ngoài (Payment, TTS, Translation, AI)
│   ├── config/              # Cấu hình ứng dụng, kết nối MySQL và Redis
│   ├── middlewares/         # Xác thực JWT/Visitor Token, phân quyền RBAC, xử lý lỗi
│   ├── routers/             # Lớp định tuyến tiếp nhận HTTP request
│   ├── scripts/             # Công cụ kiểm tra kiến trúc, migration, seed dữ liệu, quản trị
│   ├── services/            # Lớp xử lý quy tắc nghiệp vụ cốt lõi
│   ├── stores/              # Lớp truy xuất dữ liệu MySQL và Redis
│   ├── tests/               # Bộ 515 bài kiểm thử tự động Back-end (Unit, HTTP, Integration)
│   ├── utils/               # Các tiện ích dùng chung, mã hóa và kiểm tra hợp lệ
│   └── server.js            # Điểm khởi chạy ứng dụng Express
├── data/demo/               # Dữ liệu chuẩn 18 POI Thảo Cầm Viên, 15 ngôn ngữ, tọa độ và tài liệu mẫu
├── database/                # Thiết kế cơ sở dữ liệu
│   ├── init_db.sql          # Schema khởi tạo 16 bảng gốc chuẩn hóa 3NF
│   └── migrations/          # 7 bản migration nâng cấp schema (001 đến 007)
├── docs/                    # Hồ sơ báo cáo đồ án, tài liệu kỹ thuật và sơ đồ thiết kế
│   ├── architecture/        # Sơ đồ kiến trúc và ERD tương tác (HTML)
│   └── diagram/             # Sơ đồ Use Case, Activity, Sequence, DFD, Component, Deployment (.drawio & .png)
├── frontend/                # Mã nguồn giao diện người dùng (React 18 + TypeScript + Vite)
│   ├── public/              # Tài nguyên tĩnh và hình ảnh minh họa POI (WebP)
│   ├── src/                 # Các trang giao diện Du khách, Quầy thu ngân, Quản trị và компонентов
│   └── test/                # Bộ 215 bài kiểm thử tự động Front-end
├── .env.example             # Mẫu biến môi trường cho Docker Compose
└── docker-compose.yml       # Cấu hình khởi chạy đồng bộ các container dịch vụ
```

---

## Hướng dẫn cài đặt và khởi chạy

### Cách 1: Chạy nhanh bằng Docker Compose

Tại thư mục gốc của dự án:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Cập nhật MYSQL_ROOT_PASSWORD, DB_PASSWORD và JWT_SECRET trong file .env trước khi chạy
docker compose up -d --build
```

Sau khi các container sẵn sàng, khởi tạo tài khoản `ADMIN` lần đầu:

```powershell
docker compose exec -T -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD backend npm run bootstrap:admin
```

### Cách 2: Chạy trực tiếp trên môi trường phát triển (Node.js + MySQL 8 + Redis 7)

1. **Khởi tạo cơ sở dữ liệu:**
   Tạo database trống trên MySQL 8.0.16+ và nạp tệp [`database/init_db.sql`](database/init_db.sql) (xem chi tiết tại [`database/README.md`](database/README.md)).

2. **Cài đặt và cấu hình Back-end:**

   ```powershell
   cd backend
   npm ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

   Điền thông tin kết nối MySQL, `REDIS_URL`, `JWT_SECRET`, `VISIT_PRICE_VND` cùng `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` trong `backend/.env`. Có thể sinh khóa `JWT_SECRET` an toàn bằng lệnh:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

3. **Chạy migration và khởi tạo tài khoản quản trị:**

   ```powershell
   npm run db:migrate
   npm run bootstrap:admin
   ```

4. **Khởi động máy chủ Back-end:**

   ```powershell
   npm start
   ```

5. **Cài đặt và khởi chạy Front-end (hoặc build tĩnh):**

   ```powershell
   cd ../frontend
   npm ci
   npm run dev     # Chạy máy chủ phát triển Vite (có proxy API sang backend)
   # Hoặc build tĩnh để Express phục vụ trực tiếp tại /demo/:
   npm run build
   ```

### Các địa chỉ truy cập mặc định

- **Giao diện ứng dụng (Khi chạy qua Express):** `http://localhost:3000/demo/`
- **Kiểm tra trạng thái sống (Liveness):** `http://localhost:3000/health`
- **Kiểm tra mức độ sẵn sàng (Readiness — MySQL & Redis):** `http://localhost:3000/health/ready`

### Các lệnh quản trị hữu ích (chạy trong thư mục `backend/`)

- `npm run db:migrate`: Thực thi các bản migration từ `001` đến `007`.
- `npm run bootstrap:admin`: Khởi tạo tài khoản `ADMIN` đầu tiên từ biến môi trường cấu hình.
- `npm run jobs:recover`: Rà soát các tác vụ nền (`CONTENT_JOBS`) bị gián đoạn quá thời hạn giữ quyền (*lease*); thêm cờ `-- --apply` để chuyển sang trạng thái `FAILED` kèm ghi nhận kiểm toán.
- `npm run mock:payment -- <paymentRef> SUCCESS|FAILED`: Giả lập kết quả回调 (webhook) có chữ ký số từ cổng thanh toán trực tuyến.

---

## Kiểm thử tự động

### 1. Kiểm thử Back-end (`backend/`)

```powershell
cd backend
npm run lint    # Kiểm tra cú pháp và ranh giới kiến trúc 3 lớp trên 243 tệp JS
npm test        # Chạy bộ 515 bài kiểm thử đơn vị và hợp đồng HTTP
```

Để chạy thêm các bài kiểm thử tích hợp trực tiếp với MySQL 8 và Redis 7 thật:

```powershell
$env:RUN_DB_TESTS = '1'
npm run test:integration
```

### 2. Kiểm thử Front-end (`frontend/`)

```powershell
cd frontend
npx tsc --noEmit    # Kiểm tra kiểu dữ liệu tĩnh TypeScript
npm test            # Chạy bộ 215 bài kiểm thử giao diện và luồng người dùng
npm run build       # Kiểm tra đóng gói bản phân phối Production
```

---

## Tài liệu báo cáo và Sơ đồ thiết kế

- **Báo cáo đồ án hoàn chỉnh:** [`docs/CNPM_BAOCAO.docx`](docs/CNPM_BAOCAO.docx)
- **Sơ đồ cơ sở dữ liệu (ERD):** [`docs/diagram/erd_diagram.drawio`](docs/diagram/erd_diagram.drawio)
- **Sơ đồ thành phần (Component):** [`docs/diagram/component_diagram.drawio`](docs/diagram/component_diagram.drawio)
- **Sơ đồ luồng dữ liệu (DFD Mức 0–3):** [`docs/diagram/dfd/`](docs/diagram/dfd/)
- **Sơ đồ tuần tự (Sequence):** [`docs/diagram/sequence/`](docs/diagram/sequence/)
- **Sơ đồ hoạt động (Activity):** [`docs/diagram/activity/`](docs/diagram/activity/)
- **Sơ đồ ca sử dụng (Use Case):** [`docs/diagram/use case/`](docs/diagram/use%20case/)
- **Tài liệu tích hợp & Thiết kế chuyên sâu:**
  - [Tích hợp Front-end & Back-end](docs/FRONTEND_BACKEND_INTEGRATION.md)
  - [Hệ thống thiết kế giao diện Quản trị (ADMIN UI)](docs/ADMIN_UI_DESIGN_SYSTEM.md)
  - [Đặc tả cấp lại vé tham quan (UC-12)](docs/BACKEND_TOKEN_REISSUE_UC12.md)
  - [Hướng dẫn dữ liệu thực nghiệm Thảo Cầm Viên](data/demo/README.md)
