# Giải thích tổng quát dự án và mã nguồn hiện tại

Tài liệu này giúp các thành viên hiểu dự án, biết mỗi file dùng để làm gì và giải thích được code khi báo cáo. Phạm vi của nhóm là **backend 3 lớp, quản lý mã nguồn trên GitHub và CI/CD**. Giao diện hiện tại phục vụ việc thử và trình diễn API.

## 1. Chốt tình trạng hiện tại

**Phần tài khoản đang làm trong US-01–03 đã đủ ổn định để tiếp tục các US tiếp theo.** Đây là kết luận trong phạm vi chức năng đã triển khai và kiểm tra, chưa phải kết luận toàn bộ đồ án đã hoàn thành.

Lần kiểm tra hiện tại:

- Kiểm tra cú pháp và quy tắc import: đạt, kiểm tra 29 file JavaScript backend.
- Kiểm thử: **50/50 bài đạt**, trong đó **8 bài dùng database thật**.
- Môi trường kiểm tra local: Node.js 24.21.0 và MariaDB 10.4.32.
- Workflow đã được viết để kiểm tra trên Node.js 20/22 và MySQL 8. Cần chạy thực tế trên GitHub để xác nhận kết quả ở môi trường đó.
- Chưa kiểm chứng Docker build trên máy local và chưa có môi trường staging duy trì lâu dài.

Chức năng hiện có: đăng ký khách, đăng ký chủ quán, đăng nhập, xem tài khoản, xem trạng thái đơn chủ quán, làm mới phiên, đăng xuất và nền kiểm tra quyền. Chưa có API hoàn chỉnh cho duyệt chủ quán, quản lý địa điểm, dịch nội dung hoặc tạo thuyết minh âm thanh.

Số file tăng chủ yếu vì tách nhiệm vụ, thêm kiểm thử và cấu hình chạy. Dự án vẫn dùng Express và MySQL, chạy một backend; không tách thành các service triển khai độc lập. Với đồ án sinh viên, nhóm có thể giữ nền hiện tại và tập trung hoàn thành nghiệp vụ tiếp theo.

## 2. Backend 3 lớp được hiểu như thế nào?

Luồng chính:

```text
Client / giao diện demo
        ↓ HTTP request
Router: nhận request, gọi Service, trả HTTP response
        ↓ gọi hàm
Service: kiểm tra dữ liệu và thực hiện quy tắc nghiệp vụ
        ↓ gọi hàm
Store: đọc/ghi dữ liệu, thực thi SQL và transaction
        ↓
MySQL / MariaDB
```

**Ba lớp backend là Router → Service → Store.** Frontend và database không phải hai trong ba lớp này.

Ví dụ đăng ký chủ quán:

1. Router nhận email, mật khẩu, tên quán, địa chỉ và số điện thoại.
2. Service kiểm tra dữ liệu, kiểm tra email, băm mật khẩu, xác định vai trò OWNER và trạng thái PENDING.
3. Store lưu user và đơn đăng ký trong cùng transaction.
4. Router trả kết quả HTTP cho client.

`config`, `middlewares`, `utils`, `scripts` và `tests` là phần hỗ trợ. Chúng không tạo thêm lớp nghiệp vụ. Đặc biệt, tên `AuthService` chỉ một thành phần code trong backend hiện tại, không có nghĩa là một microservice riêng.

Nguyên tắc để các US sau vẫn đúng trọng tâm:

- Router không viết SQL và không tự quyết định nghiệp vụ.
- Service không kết nối MySQL trực tiếp.
- Store chịu trách nhiệm SQL; không quyết định HTTP response.
- Frontend gọi API; không truy cập database trực tiếp.

## 3. Cấu trúc thư mục

```text
prj_sgu26_cnpm/
├── .github/workflows/       Quy trình GitHub Actions
├── backend/
│   ├── config/             Cấu hình database và token
│   ├── routers/            Lớp tiếp nhận HTTP
│   ├── services/           Lớp nghiệp vụ
│   ├── stores/             Lớp truy cập dữ liệu
│   ├── middlewares/        Xác thực, phân quyền, xử lý lỗi
│   ├── utils/              Thành phần dùng chung
│   ├── scripts/            Công cụ chạy theo lệnh
│   ├── tests/              Mã kiểm thử
│   └── server.js           Khởi tạo ứng dụng
├── database/
│   ├── init_db.sql         Schema khởi tạo
│   └── migrations/         SQL bổ sung vào database đã có
├── frontend/               Các trang demo API
├── docker-compose.yml      Chạy backend cùng database bằng Docker
├── README.md               Hướng dẫn cài đặt và chạy
├── bao_cao_cnmp.docx        Báo cáo đồ án
└── GIAI_THICH_DU_AN.md      Tài liệu đang đọc
```

Các phần sau giải thích tất cả file do dự án quản lý hiện có. Thư viện tự tải trong `node_modules` và dữ liệu nội bộ của Git trong `.git` được giải thích theo nhóm, không liệt kê từng file do công cụ sinh ra.

## 4. File ở thư mục gốc và cấu hình GitHub

### `README.md`

Hướng dẫn vận hành: phạm vi hiện tại, kiến trúc, biến môi trường, lệnh chạy local, API, kiểm thử, Docker và pipeline. Khi cần chạy dự án trên máy thành viên khác, đọc file này trước.

### `GIAI_THICH_DU_AN.md`

Giải thích cấu trúc và code để nhóm hiểu và trình bày. File này là tài liệu, không được backend thực thi.

### `bao_cao_cnmp.docx`

Báo cáo đồ án, mô tả đề tài và các user story. Đây là tài liệu học phần, không phải chương trình chạy. Nội dung công nghệ frontend và mô hình dữ liệu trong báo cáo cũ còn cần đồng bộ với bản triển khai trước khi nộp cuối kỳ.

### `.gitignore`

Quy định file Git bỏ qua, ví dụ `node_modules`, file `.env` và log. Mục đích là chỉ quản lý mã nguồn cần thiết, tránh đưa cấu hình riêng và mật khẩu lên GitHub.

### `.dockerignore`

Quy định dữ liệu không gửi vào Docker build context: Git metadata, thư viện local, file môi trường, tests và một số tài liệu. **Build hiện tại dùng thư mục gốc làm context nên file này được áp dụng.**

### `.env.example`

Mẫu biến môi trường cho Docker Compose: mật khẩu database, tên database, user ứng dụng, JWT secret và cổng. Khi dùng Compose, tạo `.env` ở thư mục gốc từ mẫu rồi điền giá trị riêng. File mẫu được đưa lên Git; file `.env` thực tế không đưa lên Git.

### `docker-compose.yml`

Khai báo hai container: MySQL 8 và backend. Backend đợi database khỏe rồi khởi động. Database có volume `db_data` để giữ dữ liệu; SQL khởi tạo được nạp khi tạo database mới trong volume mới. Cổng MySQL phía máy local mặc định là 3307 để có thể cùng tồn tại với database local trên 3306.

Compose dùng các biến từ `.env` ở thư mục gốc. `docker compose down` dừng và gỡ container; thêm `-v` sẽ xóa volume database, nên không dùng tùy chọn đó với dữ liệu nhóm cần giữ. Workflow dùng `-v` vì database CI chỉ là dữ liệu thử tạm thời.

### `.github/workflows/ci-cd.yml`

Đây là cấu hình GitHub Actions, không phải code API. Workflow chạy khi push, khi có pull request vào `main`/`master`, hoặc khi kích hoạt thủ công. Có năm job:

1. **`ci-database`**: tạo MySQL 8 tạm, nạp SQL và kiểm tra đủ 15 bảng.
2. **`ci-backend`**: trên Node 20 và 22, cài đúng dependency, kiểm tra cú pháp/import và chạy tests, gồm integration với MySQL thật.
3. **`review-decoupling`**: kiểm tra quy tắc import giữa các lớp và kiểm tra `.env` thật không bị Git theo dõi.
4. **`cd-build-and-deliver`**: khi push `main` và các kiểm tra đạt, build Docker image rồi đóng gói source triển khai thành artifact.
5. **`release-smoke-test`**: tải đúng artifact vừa tạo, dựng container, thử chu trình tài khoản và dọn môi trường tạm.

CI là tự động kiểm tra mỗi thay đổi. Phần delivery hiện tại tạo và thử gói triển khai; **chưa tự triển khai lên một server staging lâu dài**. Artifact là file đầu ra có thể tải từ lần chạy Actions. Docker image được build để kiểm tra; workflow hiện tại không đẩy image lên registry.

File workflow cũng không tự bật quy tắc chặn merge. Nếu muốn bắt buộc kiểm tra đạt trước khi merge, nhóm cần cấu hình required checks/branch protection trên GitHub. Kết quả local không thay thế kết quả một lần chạy Actions thực tế.

## 5. Khởi tạo backend và thư viện

### `backend/package.json`

Khai báo tên dự án, thư viện và các lệnh npm. Code dùng CommonJS: `require(...)` để nhập thành phần, `module.exports` để xuất thành phần cho file khác.

Các thư viện đang dùng:

- `express`: nhận HTTP request và định tuyến API.
- `mysql2`: gửi truy vấn MySQL và quản lý kết nối.
- `bcrypt`: băm và so sánh mật khẩu.
- `jsonwebtoken`: ký và xác minh access token JWT.
- `dotenv`: đọc cấu hình `.env` khi chạy local.
- `cors`: cấu hình origin nào được browser gọi API.

Các lệnh npm:

- `npm start`: chạy `server.js`.
- `npm run lint`: chạy kiểm tra cú pháp/import.
- `npm test`: chạy bộ kiểm thử; integration database chỉ chạy khi bật `RUN_DB_TESTS=1`.
- `npm run test:integration`: chọn riêng file kiểm thử database, vẫn cần bật biến trên.
- `npm run db:migrate`: bổ sung bảng phiên vào database đã có.
- `npm run bootstrap:admin`: chủ động tạo hoặc xử lý admin seed cũ theo quy tắc của Service.

### `backend/package-lock.json`

Ghi chính xác phiên bản dependency và dependency con. `npm ci` dựa vào file này để các máy thành viên và CI cài cùng bộ thư viện. File được npm quản lý; không sửa từng dòng bằng tay.

### `backend/server.js`

Điểm khởi tạo ứng dụng. `createApp(...)` tạo Express app, thiết lập CORS, bộ đọc JSON với giới hạn 32 KB, router auth, các endpoint health, thư mục giao diện `/demo` và middleware xử lý lỗi cuối cùng.

`GET /` cho biết API đang chạy. `/health` kiểm tra tiến trình; `/health/ready` kiểm tra database và các bảng auth cần dùng. Khi chạy trực tiếp bằng `npm start`, file xác nhận cấu hình auth rồi mở cổng, mặc định 3000. Khi import vào tests, app không tự mở cổng chạy cố định.

`createApp` nhận Service thay thế khi test. Cách này giúp thử lỗi hoặc tình huống nghiệp vụ có kiểm soát, không làm thay đổi luồng chạy thật.

### `backend/config/database.js`

Tạo connection pool từ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Pool tái sử dụng kết nối thay vì mở một kết nối mới cho mọi request. Thời gian đọc/ghi dùng UTC. File không chứa schema hay dữ liệu người dùng, cũng không tự tạo bảng khi server khởi động.

### `backend/config/auth.js`

`getAuthConfig()` đọc và kiểm tra `JWT_SECRET`. Cấu hình access token có thời hạn 1 giờ, refresh token có thời hạn 7 ngày, cùng issuer/audience để xác định bên phát hành và bên nhận token. Ở môi trường production, secret phải có ít nhất 32 bytes.

### `backend/.env.example` và `backend/.env`

File mẫu liệt kê cấu hình chạy backend local: cổng, database, JWT secret, CORS và thông tin bootstrap admin. `backend/.env` là cấu hình thật trên máy, bị Git bỏ qua. Tài liệu này không sao chép giá trị bí mật của file đó.

Phân biệt: `backend/.env` dành cho `npm start` khi chạy trong backend; `.env` ở thư mục gốc dành cho Compose.

### `backend/.gitignore` và `backend/.dockerignore`

File đầu bỏ qua thư viện/cấu hình local ở phạm vi backend. File sau mô tả dữ liệu cần bỏ qua khi backend được dùng làm Docker context. Cấu hình build đang dùng context ở gốc nên `.dockerignore` ở gốc mới là file có hiệu lực cho build hiện tại.

### `backend/Dockerfile`

Mô tả cách tạo môi trường chạy backend bằng Node 20 Alpine. Các bước chính: cài dependency bằng `npm ci --omit=dev`, chép code backend, frontend demo và SQL migration, thiết lập production, khai báo healthcheck rồi chạy `node server.js`.

Các đường dẫn `COPY` tính từ thư mục gốc repo. Vì vậy lệnh build dùng `docker build -f backend/Dockerfile ... .` ở gốc; không chuyển vào backend rồi dùng cùng context `.`.

## 6. Lớp Router và middleware

### `backend/routers/auth.router.js`

`createAuthRouter()` tạo router với Service được cung cấp. Mỗi handler nhận dữ liệu, gọi Service, trả status/body hoặc chuyển lỗi sang error middleware. Các API đang có:

- `POST /api/auth/register`: đăng ký TOURIST, thành công 201.
- `POST /api/auth/register-owner`: đăng ký OWNER/PENDING và tạo đơn, thành công 201.
- `POST /api/auth/login`: trả user và cặp token, thành công 200.
- `POST /api/auth/refresh`: đổi refresh token, trả cặp token mới.
- `POST /api/auth/logout`: thu hồi phiên, thành công 204.
- `GET /api/auth/me`: lấy tài khoản từ access token đã xác minh.
- `GET /api/auth/owner-request/status`: OWNER xem đơn mới nhất của mình.

Đăng ký, đăng nhập và refresh trả dữ liệu theo `{ message, data }`; lỗi xử lý theo `{ code, error }`. Router không trực tiếp đọc bảng USERS hay tự băm mật khẩu.

### `backend/middlewares/auth.middleware.js`

Middleware là hàm chạy trước handler để kiểm tra điều kiện request:

- `verifyToken`: đọc header `Authorization: Bearer ...`, gọi Service xác thực, gắn người dùng vào `req.user`.
- `requireRole(...)`: yêu cầu vai trò nằm trong danh sách cho phép.
- `requireApprovedOwner`: yêu cầu chủ quán đã được duyệt, gọi quy tắc tương ứng ở Service.

Guard chủ quán đã chuẩn bị để gắn vào API quản lý quán ở US sau. Hiện tại chưa có router POI để gắn guard này. Middleware không chứa SQL.

### `backend/middlewares/error.middleware.js`

Nhận lỗi ở cuối luồng. Lỗi nghiệp vụ trả mã rõ ràng; JSON sai trả 400; body quá lớn trả 413. Lỗi ngoài dự kiến trả 500 với thông báo chung, không đưa câu SQL, mật khẩu hoặc stack trace vào response.

### `backend/utils/app-error.js`

Định nghĩa `AppError` gồm HTTP status, mã lỗi và thông báo. Service dùng nó để diễn đạt các trường hợp như email đã tồn tại hoặc phiên không hợp lệ; middleware quyết định cách trả lỗi HTTP thống nhất.

## 7. Lớp Service: quy tắc nghiệp vụ

### `backend/services/auth.validation.js`

Các hàm kiểm tra dữ liệu cho đăng ký, đăng nhập và refresh. Email được trim và chuyển chữ thường. Mật khẩu tối thiểu 8 ký tự và tối đa 72 bytes UTF-8 để phù hợp giới hạn bcrypt. Kiểm tra tên, số điện thoại, thông tin quán và định dạng refresh token. Body phải là object hợp lệ.

Tách validation để `AuthService` dễ đọc; đây vẫn là phần của lớp Service, không phải thêm một tầng kiến trúc.

### `backend/services/auth.service.js`

Thành phần nghiệp vụ chính, xuất class `AuthService` và instance mặc định. Các nhóm hàm:

**Đăng ký:** `register`, `registerOwner`, `registerAccount` kiểm tra input/email, băm mật khẩu bằng bcrypt và gọi Store lưu tài khoản. Server tự quyết định role/status: khách là TOURIST/ACTIVE; chủ quán là OWNER/PENDING. Client không thể tự gửi ADMIN để được nâng quyền. Trùng email, kể cả hai request đến đồng thời, được xử lý thành lỗi 409.

**Đăng nhập:** `login` kiểm tra tài khoản và mật khẩu, đếm số lần sai. Sai 5 lần thì tạm khóa 15 phút. Khi thời gian khóa hết, vòng đếm được đặt lại đúng; đăng nhập đúng xóa trạng thái sai. Store khóa hàng user trong transaction để các request đồng thời không ghi đè số lần sai.

**Phiên đăng nhập:** `accessToken` ký JWT; `hashToken` băm refresh token SHA-256. Refresh token là chuỗi ngẫu nhiên, database chỉ giữ hash và thông tin phiên. `refresh` thay token cũ bằng token mới, giữ nguyên hạn tuyệt đối của phiên; không gia hạn thêm 7 ngày mỗi lần đổi. `logout` xóa phiên, làm access token của phiên đó cũng mất hiệu lực.

**Xác thực và quyền:** `authenticate` kiểm tra chữ ký, hạn, loại token, issuer/audience và phiên trong database. Sau đó đọc lại tài khoản để role/status hiện tại có hiệu lực ngay. `assertAccountUsable` kiểm tra trạng thái tài khoản. `publicUser` chỉ trả thông tin được phép công khai, không trả hash mật khẩu.

**Chủ quán:** `getOwnerRequestStatus` lấy trạng thái đơn mới nhất. `assertApprovedOwner` chỉ cho phép nghiệp vụ quán khi tài khoản OWNER/ACTIVE và đơn mới nhất APPROVED. Owner PENDING vẫn được đăng nhập và xem đơn của mình.

**Admin ban đầu:** `bootstrapAdmin` chỉ được script nội bộ gọi. Nó tạo admin mới hoặc thay đúng hash placeholder từ seed cũ; không nâng tourist thành admin và không tự đổi mật khẩu admin hợp lệ đã có. Không có API công khai cho client tự tạo admin.

Service nhận các Store và hàm phụ trợ qua constructor để dễ test. Đây là dependency injection: truyền thành phần vào thay vì cố định tất cả trong hàm. Khi chạy thật vẫn dùng các Store kết nối database.

### `backend/services/health.service.js`

`ready()` gọi HealthStore để kiểm tra database. Thành công trả trạng thái sẵn sàng; lỗi được chuyển thành 503 `DATABASE_UNAVAILABLE`. Không tự sửa hay tạo schema.

## 8. Lớp Store: SQL và transaction

### `backend/stores/user.store.js`

Đọc user theo email/id, tạo user, cập nhật số lần đăng nhập sai/thời gian khóa, và thay hash placeholder có điều kiện. Các truy vấn dùng tham số. Có thể nhận connection của transaction; các lần đọc cần khóa dùng `FOR UPDATE`.

### `backend/stores/owner_request.store.js`

Tạo đơn đăng ký chủ quán và lấy đơn mới nhất theo user. Tạo đơn có thể dùng cùng connection với tạo user để hai bản ghi được lưu cùng nhau.

### `backend/stores/refresh_token.store.js`

Tạo phiên với user id, session id, hash và hạn; tìm theo hash; tìm theo session id; đổi hash khi refresh; xóa khi logout. Khi tạo phiên, dọn phiên hết hạn của user đó. Truy vấn phục vụ refresh có khóa hàng để một token không được dùng đổi thành công nhiều lần đồng thời.

### `backend/stores/auth.store.js`

Điều phối transaction liên quan nhiều thao tác auth:

- `transaction(...)`: lấy connection, bắt đầu transaction, commit nếu thành công; rollback khi lỗi và luôn release connection.
- `register(...)`: tạo user và, nếu là owner, tạo đơn cùng transaction.
- `withLockedUser(...)`: khóa user để Service xử lý đăng nhập và lưu trạng thái nhất quán.
- `withLockedRefreshToken(...)`: khóa phiên để Service quyết định đổi hoặc thu hồi.

Transaction nghĩa là một nhóm thao tác cùng thành công hoặc cùng hủy. Ví dụ: tạo đơn owner thất bại thì user vừa tạo cũng bị rollback, tránh tài khoản owner không có đơn.

Store cho phép thử lại tối đa 3 lần với lỗi deadlock/lock timeout khi rollback đã thành công. Lỗi khác không tự thử lại. Các callback chỉ nhận thao tác lưu dữ liệu cần thiết; Service không nhận raw connection và không viết SQL. Đây vẫn là Store trong mô hình ba lớp.

### `backend/stores/health.store.js`

Thực hiện truy vấn nhỏ có timeout để kiểm tra kết nối và các bảng USERS, REFRESH_TOKENS, OWNER_REQUESTS. Vì vậy readiness có thể phát hiện thiếu bảng auth, không chỉ biết cổng database đang mở.

### `backend/stores/schema.store.js`

Đọc migration tạo bảng REFRESH_TOKENS rồi thực thi qua database pool. Script migrate gọi Store này; server không tự migration mỗi lần chạy.

## 9. `scripts` dùng để làm gì?

**Scripts là công cụ chạy khi có lệnh hoặc khi CI gọi, không phải chức năng tự chạy thêm lúc người dùng đăng nhập.** Chúng giúp cài đặt, kiểm tra và trình diễn backend. Không có server độc lập trong thư mục này.

### `backend/scripts/check.js`

Kiểm tra cú pháp JavaScript backend, sự tồn tại của dependency tương đối và một số quy tắc import. Ví dụ Router/Service không được import trực tiếp driver MySQL; Router/Middleware không import Store; Store không import tầng cao hơn.

Tên lệnh là `lint`, nhưng đây là bộ kiểm tra nhỏ tự viết bằng Node, **không phải ESLint** và không chứng minh mọi trường hợp kiến trúc đều đúng.

### `backend/scripts/migrate.js`

Đọc cấu hình local, gọi SchemaStore tạo bảng phiên nếu thiếu rồi đóng pool. Dùng khi database đã có dữ liệu và chỉ cần bổ sung bảng mới; không chạy lại SQL khởi tạo có DROP TABLE.

### `backend/scripts/bootstrap-admin.js`

Đọc email/mật khẩu admin từ cấu hình, gọi `bootstrapAdmin` và đóng pool. Chỉ chạy chủ động khi nhóm cần tài khoản admin. Không có mật khẩu admin mặc định để mọi máy cùng sử dụng.

### `backend/scripts/smoke-auth.js`

Gọi HTTP đến ứng dụng đang chạy để thử nhanh: readiness → đăng ký → đăng nhập → xem tài khoản → refresh → logout → xác nhận phiên bị từ chối. Mặc định gọi localhost:3000; có thể đổi bằng `SMOKE_BASE_URL`.

Script tạo tài khoản thử. Workflow chạy nó trên database tạm của CI; nếu chạy thủ công cần biết mình đang trỏ vào môi trường nào.

## 10. `tests` dùng để làm gì?

**Tests là code kiểm tra code ứng dụng.** Khi chạy test, chương trình tự đưa input vào và so sánh kết quả với kỳ vọng. Nó giúp biết sửa một chỗ có làm hỏng phần đã làm hay không, đồng thời là bằng chứng cho nội dung CI của đồ án.

Ví dụ: đăng ký trùng email phải trả 409; owner chưa duyệt không được vào nghiệp vụ quán; logout xong access token phải bị từ chối. Các test này không phải thêm tính năng cho client và không chạy trong server production.

### `backend/tests/auth.test.js`

Kiểm tra nền tảng băm/so sánh mật khẩu và JWT. Đây là các bài kiểm tra helper cơ bản; các test Service/HTTP bên dưới kiểm tra hành vi ứng dụng đầy đủ hơn.

### `backend/tests/auth.service.test.js`

Kiểm tra quy tắc AuthService: validation, role do server quyết định, duplicate email, trạng thái owner, khóa đăng nhập, concurrency, refresh một lần, hạn phiên, logout, trạng thái tài khoản và bootstrap admin. Dùng Store giả để kiểm soát tình huống và thời gian.

### `backend/tests/auth.store.test.js`

Kiểm tra transaction bằng connection giả: commit/rollback/release, điều kiện thử lại và giới hạn số lần thử. Bảo đảm lỗi không để connection bị giữ và không tùy tiện thử lại mọi thao tác.

### `backend/tests/auth.http.test.js`

Mở server tạm và gọi HTTP thật với Service/Store kiểm soát được. Kiểm tra status/body, dữ liệu sai, auth/role, refresh/logout, health và cách che lỗi nội bộ. Một số route bảo vệ được tạo riêng trong test để thử guard; chúng không phải API đã có trong sản phẩm.

### `backend/tests/auth.integration.test.js`

Chạy Router → Service → Store → database thật. Kiểm tra schema/migration, đăng ký đồng thời, sai mật khẩu đồng thời, rollback user nếu lưu đơn lỗi, refresh/logout, trạng thái tài khoản và admin.

Mỗi lần chạy tạo database thử có tên ngẫu nhiên `food_tour_auth_test_<uuid>`, nạp schema vào đó và chỉ xóa database thử này khi kết thúc. Không nạp SQL khởi tạo vào database dữ liệu của nhóm. Cần `RUN_DB_TESTS=1` và tài khoản database có quyền tạo/xóa database thử.

### `backend/tests/database_schema.test.js`

Kiểm tra file SQL tồn tại, có nội dung, khai báo đủ các bảng cần thiết và dùng utf8mb4. Đây là kiểm tra văn bản SQL; integration bổ sung kiểm tra SQL thực sự chạy được trên database.

### `backend/tests/frontend-auth.test.js`

Kiểm tra client auth: cách gọi API, Bearer token, refresh khi gặp 401, thứ tự logout/xóa phiên, xử lý lỗi mạng khi logout và cú pháp script trong HTML. Dùng môi trường mô phỏng, chưa phải test toàn bộ giao diện bằng browser thật.

### `backend/tests/server.test.js`

Kiểm tra endpoint gốc, liveness và đường dẫn không tồn tại bằng HTTP trên cổng tạm. Đóng server/kết nối sau kiểm tra.

### `backend/tests/helpers/auth.fixture.js`

Tạo Store giả, dữ liệu trong bộ nhớ và đồng hồ điều khiển được cho tests. Giúp thử khóa 15 phút hoặc hết hạn phiên ngay, không phải chờ thực tế. Fixture chỉ phục vụ kiểm thử, không thay thế Store thật khi chạy ứng dụng.

Khi `npm test` không bật `RUN_DB_TESTS`, 8 bài database được bỏ qua. Vì vậy cần phân biệt “tests thường đạt” với “đã chạy cả integration”. Kết quả 50/50 ở đầu tài liệu là lần đã bật và chạy database thật.

## 11. Database và sơ đồ dữ liệu

### `database/init_db.sql`

Tạo schema gồm **15 bảng**, khóa ngoại, chỉ mục và dữ liệu mẫu ngôn ngữ/danh mục. File có DROP TABLE nên chỉ dùng khởi tạo database mới hoặc môi trường test, không dùng nâng cấp database đang chứa dữ liệu cần giữ.

Các bảng và vai trò:

- `LANGUAGES`: mã và tên ngôn ngữ.
- `USERS`: tài khoản, hash mật khẩu, vai trò, trạng thái, số lần đăng nhập sai và thời gian khóa.
- `REFRESH_TOKENS`: phiên đăng nhập, user, hash token và hạn.
- `OWNER_REQUESTS`: đơn chủ quán, thông tin quán, trạng thái và lý do từ chối.
- `AUDIT_LOGS`: thiết kế lưu lịch sử hành động.
- `CATEGORIES`: danh mục địa điểm/ẩm thực.
- `POIS`: địa điểm và thông tin chính.
- `POI_CATEGORIES`: liên kết địa điểm với danh mục.
- `POI_IMAGES`: hình ảnh địa điểm.
- `POI_EDIT_REQUESTS`: đề xuất chỉnh sửa địa điểm.
- `REVIEWS`: đánh giá địa điểm.
- `POI_TRANSLATIONS`: nội dung địa điểm theo ngôn ngữ.
- `AUDIOS`: thông tin âm thanh thuyết minh gắn với bản dịch.
- `DISHES`: món ăn của địa điểm.
- `DISH_TRANSLATIONS`: nội dung món ăn theo ngôn ngữ.

Có bảng trong SQL không có nghĩa là API của bảng đó đã được triển khai. Backend hiện tại tập trung tài khoản/phiên/đơn owner; phần còn lại là nền dữ liệu cho các US sau. Seed mới không tạo admin bằng hash mật khẩu giả.

### `database/migrations/001_refresh_tokens.sql`

Migration bổ sung REFRESH_TOKENS bằng `CREATE TABLE IF NOT EXISTS`. Có thể chạy lại, không xóa dữ liệu user hiện có. Không phải một hệ thống migration phức tạp; hiện chỉ cần một bước bổ sung bảng.

### `database/erd_he_thong_du_lich_am_thuc.drawio`

Sơ đồ ERD có thể mở bằng draw.io để xem bảng và quan hệ. Sơ đồ cũ chưa đồng bộ đủ 15 bảng và một số quan hệ mới, cần cập nhật trước báo cáo. Khi xác định schema thực tế hiện tại, đối chiếu SQL và integration test thay vì chỉ dựa vào sơ đồ cũ.

## 12. Frontend demo

Giao diện dùng HTML/CSS/JavaScript để nhóm thử API. Không cần phát triển một framework frontend mới để hoàn thành trọng tâm backend hiện tại. Khi backend chạy, vào `http://localhost:3000/demo/`.

### `frontend/auth.js`

Định nghĩa `FoodTourAuth` dùng chung. Gửi request đến `/api/auth`, thêm Bearer token khi cần, lưu cặp token trong `sessionStorage` của tab và thử refresh một lần khi request có xác thực nhận 401. Logout gọi backend thu hồi phiên rồi mới xóa dữ liệu local; nếu lỗi mạng, giữ phiên để thử lại.

`sessionStorage` không phải database và không lưu mật khẩu. Nó là cơ chế lưu phiên cho demo trong browser; backend vẫn phải xác minh token và quyền.

### `frontend/index.html`

Trang đăng nhập: nhận email/mật khẩu, gọi API login, đọc `data` trong response, lưu phiên và chuyển sang `account.html`. Hiển thị lỗi và liên kết đăng ký. Không in token vào console.

### `frontend/register.html`

Trang đăng ký: chọn khách hoặc chủ quán. Khi chọn chủ quán, yêu cầu thêm thông tin quán/số điện thoại và gọi register-owner; khách gọi register. Validation giao diện hỗ trợ người dùng, không thay thế validation backend.

### `frontend/account.html`

Gọi `/me` để hiển thị hồ sơ, gọi trạng thái đơn nếu user là OWNER, và có nút đăng xuất. Nội dung dữ liệu được hiển thị qua `textContent`. Đây là trang sau đăng nhập của demo hiện tại.

### `frontend/dashboard.html`

Trang quản lý địa điểm cũ, còn gọi `/api/places`. Backend chưa có API này, nên **trang chưa hoạt động đầy đủ** và hiện không phải trang điều hướng sau login. Khi triển khai US địa điểm, nhóm sẽ quyết định cập nhật trang để khớp API mới.

## 13. File giữ thư mục và file công cụ tự sinh

Các file sau chỉ là dấu giữ thư mục trong Git, không chứa chức năng ứng dụng:

- `backend/.keep`
- `backend/routers/.gitkeep`
- `backend/services/.gitkeep`
- `backend/stores/.gitkeep`
- `database/.keep`
- `frontend/.keep`

Git không theo dõi thư mục rỗng nên dự án ban đầu có các file này. Khi thư mục đã có code, chúng không ảnh hưởng việc chạy.

`backend/node_modules/` là thư viện npm tải về, cài lại bằng `npm ci`; không đưa lên Git và không cần nhóm giải thích từng file của thư viện. `.git/` là lịch sử commit, nhánh và metadata Git, không phải code nghiệp vụ. Log và các file tạm nếu được sinh trong lúc chạy cũng không phải chức năng mới.

## 14. Ba luồng quan trọng cần hiểu khi báo cáo

### Đăng ký chủ quán

```text
register.html → POST register-owner → AuthRouter
→ AuthService: kiểm tra, băm mật khẩu, OWNER/PENDING
→ AuthStore: transaction
   → UserStore: INSERT USERS
   → OwnerRequestStore: INSERT OWNER_REQUESTS
→ commit → HTTP 201
```

Nếu một thao tác lưu lỗi thì rollback. Người dùng không tự được duyệt ngay khi đăng ký.

### Đăng nhập và gọi API có bảo vệ

```text
index.html → POST login → AuthService
→ Store khóa user → kiểm tra bcrypt → lưu phiên
→ trả access token + refresh token

account.html → GET me + Bearer access token
→ verifyToken → AuthService.authenticate
→ kiểm tra JWT + phiên + tài khoản hiện tại → trả hồ sơ
```

Bcrypt xử lý mật khẩu; JWT dùng chứng minh phiên khi gọi API. Refresh token giúp đổi access token khi hết hạn. Không trả hash mật khẩu cho client.

### Đổi phiên và đăng xuất

Refresh khóa hàng phiên, kiểm tra token/hạn rồi thay hash. Token cũ không đổi tiếp được. Logout xóa phiên, nên các request sau bằng access token cùng phiên bị từ chối dù JWT chưa hết hạn. Đây là lý do xác thực cần kiểm tra database bên cạnh chữ ký JWT.

## 15. Cách dùng bản hiện tại mà không làm xáo trộn thêm

Chạy trong PowerShell, từ thư mục gốc:

```powershell
cd backend
npm ci
# Giữ backend/.env hiện có; nếu máy mới chưa có thì tạo từ .env.example.
npm start
```

Database đã được bổ sung bảng phiên không cần migration lại mỗi lần chạy. Máy mới cần cấu hình database và secret theo README. Không chạy `init_db.sql` lên database cần giữ dữ liệu.

Các lệnh kiểm tra, chạy trong thư mục backend:

```powershell
npm run lint
npm test

# Chạy thêm integration trên database local khi đã có quyền phù hợp:
$env:RUN_DB_TESTS = '1'
npm run test:integration
Remove-Item Env:RUN_DB_TESTS
```

Trong môi trường sandbox có thể gặp `spawn EPERM` do bị chặn tạo test worker. Lần kiểm tra local dùng Node 24 với lệnh sau để chạy cùng tiến trình:

```powershell
$env:RUN_DB_TESTS = '1'
$env:NODE_ENV = 'test'
node --test --experimental-test-isolation=none tests/*.test.js
Remove-Item Env:RUN_DB_TESTS
Remove-Item Env:NODE_ENV
```

Đây là cách chạy riêng ở môi trường đó; script CI Node 20/22 vẫn dùng `npm test` thông thường.

Khi làm việc nhóm trên GitHub: tạo nhánh cho từng US hoặc sửa lỗi, commit có nội dung rõ, push, mở pull request, xem Actions, review rồi merge. Phần sửa local cần được commit/push mới xuất hiện trên GitHub; có file workflow ở máy không đồng nghĩa workflow đã chạy.

Thứ tự đọc code dễ hiểu: `server.js` → `auth.router.js` → `auth.validation.js`/`auth.service.js` → các Store → middleware → SQL → scripts/tests → workflow. Nếu muốn nắm một nghiệp vụ, đi theo một request từ đầu đến cuối thay vì đọc tất cả file một lượt.

## 16. Phần còn lại trước báo cáo tuần 11

Ở tuần 5, mục tiêu hợp lý là giữ nền tài khoản đã kiểm tra và tiếp tục các US còn lại. Nhóm còn cần triển khai nghiệp vụ duyệt chủ quán/địa điểm theo phân công, nội dung đa ngôn ngữ và luồng thuyết minh; sau đó kiểm tra API, chạy pipeline thực tế và hoàn thiện môi trường trình diễn.

Trước nộp báo cáo, đồng bộ Word/ERD với code, chụp hoặc lưu bằng chứng GitHub Actions, chuẩn bị dữ liệu demo và luyện giải thích một request qua ba lớp. Nếu yêu cầu cuối kỳ có staging lâu dài, cần bổ sung triển khai thực tế; release smoke test hiện tại chưa thay thế phần đó.

**Mức chốt hiện tại:** nền tài khoản đủ ổn định để tiếp tục phát triển trong phạm vi đã kiểm chứng; kiến trúc vẫn bám Router → Service → Store. Giữ công nghệ hiện có, hoàn thành từng US và dùng kiểm thử/CI để bảo vệ phần đã làm là hướng phù hợp với đồ án của nhóm.
