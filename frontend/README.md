# Hướng dẫn Cài đặt, Chạy và Kiểm thử Frontend Thảo Cầm Viên

Tài liệu này hướng dẫn cách thiết lập, chạy thử nghiệm và kiểm thử mã nguồn giao diện hệ thống thuyết minh Thảo Cầm Viên Sài Gòn.

## 1. Yêu cầu môi trường

- Môi trường chạy: Node.js phiên bản 20 trở lên.
- Trình quản lý gói: npm phiên bản 10 trở lên.
- Trình duyệt khuyến nghị: Google Chrome, Mozilla Firefox hoặc Microsoft Edge phiên bản mới.
- Máy chủ backend: Cổng mặc định 18080 tại địa chỉ `http://127.0.0.1:18080`.

## 2. Cài đặt các gói phụ thuộc

Di chuyển vào thư mục frontend và chạy lệnh cài đặt:

```bash
cd frontend
npm install
```

## 3. Cấu hình biến môi trường

Sao chép tệp mẫu cấu hình môi trường:

```bash
cp .env.example .env
```

Nội dung tệp `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:18080
```

Nếu máy chủ backend chạy trên cổng hoặc địa chỉ khác, thay đổi giá trị của `VITE_API_BASE_URL` cho phù hợp.

## 4. Chạy ứng dụng ở môi trường phát triển

Khởi động máy chủ giao diện phát triển:

```bash
npm run dev
```

Ứng dụng sẽ hoạt động tại địa chỉ:

```text
http://127.0.0.1:5173
```

Khi mở trình duyệt tới địa chỉ trên, trang chủ sẽ tự động kiểm tra trạng thái kết nối tới máy chủ backend qua endpoint `GET /health/ready`.

## 5. Chạy bộ kiểm thử tự động

Bộ kiểm thử được xây dựng bằng công cụ kiểm thử tích hợp của Node.js, không phụ thuộc vào framework ngoài:

```bash
npm test
```

Bộ kiểm thử thực hiện 58 ca kiểm tra trên 9 bộ kiểm thử:
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
