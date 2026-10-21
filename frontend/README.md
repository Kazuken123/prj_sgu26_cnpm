# Hướng dẫn Cài đặt, Chạy và Kiểm thử Frontend Thảo Cầm Viên

## Đồng bộ bản React với backend — 21/10/2026

Người tiếp tục thiết kế giao diện đọc [bàn giao UI/UX và các ràng buộc cần giữ](docs/HANDOFF_UI_UX_2026-10-21.md).

Thực hiện cài đặt, build và test trong clone/bản sao **ngoài OneDrive**, không sao chép `.env` thật. Dùng `npm ci` để giữ đúng lockfile; không cần thêm dependency cho bản sửa tích hợp này.

**Chạy chung một địa chỉ:** build frontend bằng `npm run build` trong `frontend`, sau đó chạy backend. Trình duyệt mở `/` hoặc `/demo/` trên cổng backend; các đường dẫn React hỗ trợ tải lại trực tiếp ở cả hai địa chỉ. Backend chỉ phục vụ `frontend/dist`, không công khai mã nguồn frontend. Chưa build thì truy cập HTML báo 503 `FRONTEND_NOT_BUILT`; API/health vẫn độc lập. Request `/` không yêu cầu HTML vẫn giữ thông báo API cũ.

**Chạy bằng Docker:** Dockerfile build React trong stage riêng trước khi tạo image runtime. Dựng demo theo `data/demo/README.md`; không chạy lại init_db.sql trên DB đã có dữ liệu hoặc xóa volume. Không cần đưa `node_modules` hay `dist` vào Git.

**Chạy Vite để phát triển:** nếu không đặt `VITE_API_BASE_URL`, frontend dùng origin hiện tại; dev server chuyển `/api` và `/health` tới `API_PROXY_TARGET`, mặc định `http://127.0.0.1:3000`. Đặt cổng 18080 khi dùng stack DRAFT-03. Biến `VITE_` là cấu hình công khai lúc build, tuyệt đối không chứa khóa ký webhook/API secret. Bản Docker mặc định dùng chung origin.

**Kiểm thử:** `npm test` sử dụng TypeScript đã có trong lockfile qua loader tương thích Node 20/22; `npm run build` kiểm kiểu và build bằng Vite. CI chạy cả hai cho frontend. Test refresh/logout cũ được chuyển sang `frontend/test/auth-regression.test.js`; test HTTP phía backend kiểm build, đường dẫn, 404 và lỗi chưa build. Không loại bỏ kiểm tra bảo mật chỉ để CI xanh. Test API dùng fetch mock không thay cho nghiệm thu trình duyệt với DB thật.

Demo ONLINE vẫn cần operator gửi kết quả bằng công cụ backend `mock:payment`; không có nút ký webhook trong frontend. Audio DRAFT-03 vẫn là âm thử một giây, không đọc kịch bản. Không coi bản sửa này là nghiệm thu GPS hoặc staging HTTPS.

Tài liệu này hướng dẫn cách thiết lập, chạy thử nghiệm và kiểm thử mã nguồn giao diện hệ thống thuyết minh Thảo Cầm Viên Sài Gòn.

## 1. Yêu cầu môi trường

- CI dùng Node.js 20/22 với TypeScript loader; bản local đã kiểm tra trên Node.js 24.
- Trình quản lý gói: npm phiên bản 10 trở lên.
- Trình duyệt khuyến nghị: Google Chrome, Mozilla Firefox hoặc Microsoft Edge phiên bản mới.
- Backend chạy Node trực tiếp mặc định ở cổng 3000; stack Docker DRAFT-03 dùng cổng 18080.

## 2. Cài đặt các gói phụ thuộc

Di chuyển vào thư mục frontend và chạy lệnh cài đặt:

```bash
cd frontend
npm ci
```

## 3. Cấu hình biến môi trường

Sao chép tệp mẫu cấu hình môi trường:

```bash
cp .env.example .env
```

Nội dung tệp `.env`:

```env
VITE_API_BASE_URL=
API_PROXY_TARGET=http://127.0.0.1:3000
```

Vite chuyển `/api` và `/health` sang `API_PROXY_TARGET`. Với stack DRAFT-03, đổi giá trị này thành `http://127.0.0.1:18080`. Để trống `VITE_API_BASE_URL` để trình duyệt dùng cùng origin; chỉ đặt URL tuyệt đối khi chủ động triển khai API riêng và đã cấu hình CORS.

Để chạy chung với Express, chạy `npm run build` trong `frontend`, sau đó `npm start` trong `backend`. Mở `http://127.0.0.1:3000/demo/`. Express chỉ phục vụ `frontend/dist`; các trang con như `/demo/explore` tải lại được. Dockerfile cũng tự build React trước khi đóng gói backend. Xem [bản nối frontend/backend](../docs/FRONTEND_BACKEND_INTEGRATION.md).

## 4. Chạy ứng dụng ở môi trường phát triển

Khởi động máy chủ giao diện phát triển:

```bash
npm run dev
```

Ứng dụng sẽ hoạt động tại địa chỉ:

```text
http://127.0.0.1:5173
```

Mở mục thông tin kết nối ở cuối trang chủ để kiểm tra `GET /health/ready`.

## 5. Chạy bộ kiểm thử tự động

Bộ kiểm thử được xây dựng bằng công cụ kiểm thử tích hợp của Node.js, không phụ thuộc vào framework ngoài:

```bash
npm test
```

Bản hợp nhất ngày 21/10/2026 có 66 ca đạt, gồm 9 suite và các ca hồi quy xác thực, kết nối bổ sung. Test API dùng mock fetch, không thay thế kiểm thử với MySQL/Redis và trình duyệt thật. Phạm vi gồm:
- Kiểm thử quản lý phiên và bộ nhớ lưu trữ
- Kiểm thử phân loại lỗi và xử lý mã lỗi
- Kiểm thử luồng gọi API thanh toán trực tuyến
- Kiểm thử hợp đồng gói dữ liệu thuyết minh
- Kiểm thử tải tệp âm thanh có xác thực
- Kiểm thử xác thực nội bộ nhân viên và quản trị viên
- Kiểm thử quy trình thanh toán tiền mặt
- Kiểm thử quản lý điểm tham quan và theo dõi tác vụ nội dung
- Kiểm thử nghiệm thu tích hợp xuyên suốt các luồng nghiệp vụ

## 6. Đóng gói cho môi trường triển khai

Biên dịch mã nguồn TypeScript và đóng gói tài nguyên:

```bash
npm run build
```

Kết quả đóng gói sẽ được tạo trong thư mục `dist`.

## 7. Cấu hình nguồn gốc CORS

Máy chủ backend cần cho phép các nguồn gốc sau để frontend gửi yêu cầu thành công:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5500`
- `http://127.0.0.1:5500`

## 8. Cấu trúc thư mục mã nguồn

```text
frontend/
├── docs/
│   ├── API_CONTRACT.md    Bảng đặc tả hợp đồng API và mã lỗi chi tiết
│   └── DEMO_GUIDE.md      Kịch bản thực hiện demo các luồng chức năng
├── src/
│   ├── api/
│   │   ├── client.ts          Lớp gọi mạng Fetch cơ sở và xử lý lỗi ApiError
│   │   ├── payment.ts         API thanh toán trực tuyến và phiên tham quan
│   │   ├── content.ts         API lấy gói thuyết minh đa ngôn ngữ
│   │   ├── media.ts           API tải tệp âm thanh có kiểm tra nguồn gốc
│   │   ├── auth.ts            API xác thực và quản lý tài khoản nội bộ
│   │   ├── cash.ts            API tạo và xử lý thanh toán tiền mặt
│   │   ├── poi.ts             API quản lý điểm tham quan và cập nhật phiên bản
│   │   ├── contentJob.ts      API theo dõi và thử lại tác vụ nội dung
│   │   ├── guestStorage.ts    Quản lý lưu trữ phiên khách tham quan
│   │   └── authStorage.ts     Quản lý lưu trữ phiên nhân viên nội bộ
│   ├── pages/
│   │   ├── HomePage.tsx               Trang chủ điều hướng và kiểm tra kết nối
│   │   ├── PaymentPage.tsx            Trang thanh toán trực tuyến mô phỏng
│   │   ├── ExplorePage.tsx            Trang khám phá điểm tham quan và nghe âm thanh
│   │   ├── LoginPage.tsx              Trang đăng nhập tài khoản nội bộ
│   │   ├── AccountPage.tsx            Trang thông tin tài khoản và đổi phiên làm việc
│   │   ├── NewStaffPage.tsx           Trang quản trị viên tạo tài khoản nhân viên
│   │   ├── InternalCashPage.tsx       Trang hỗ trợ thanh toán tiền mặt tại quầy
│   │   ├── InternalPoisPage.tsx       Trang danh sách điểm tham quan nội bộ
│   │   ├── InternalPoiDetailPage.tsx  Trang xem chi tiết thông tin điểm tham quan
│   │   ├── InternalPoiEditPage.tsx    Trang tạo mới và chỉnh sửa điểm tham quan
│   │   └── InternalJobsPage.tsx       Trang theo dõi và thử lại tác vụ nội dung
│   ├── App.tsx                Điều hướng trang và thanh điều hướng chính
│   └── main.tsx               Điểm khởi động ứng dụng React
├── test/                      Các tệp kiểm thử tự động của từng chặng phát triển
├── index.html                 Tệp HTML gốc nạp giao diện
├── package.json               Khai báo gói phụ thuộc và lệnh chạy
├── tsconfig.json              Cấu hình trình biên dịch TypeScript
└── vite.config.ts             Cấu hình máy chủ phát triển Vite
```
