# Hướng dẫn Cài đặt, Chạy và Kiểm thử Frontend Thảo Cầm Viên Sài Gòn

Tài liệu này hướng dẫn cách thiết lập, chạy thử nghiệm và kiểm thử mã nguồn giao diện người dùng (React 18 + TypeScript + Vite + Leaflet) của hệ thống tự động thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn.

---

## 1. Yêu cầu môi trường

- **Node.js:** Phiên bản 20 hoặc 22 trở lên (tương thích với TypeScript loader và pipeline CI).
- **Trình quản lý gói:** `npm` phiên bản 10 trở lên.
- **Trình duyệt khuyến nghị:** Google Chrome, Safari, Mozilla Firefox hoặc Microsoft Edge phiên bản mới.
- **Máy chủ Back-end:** Mặc định chạy tại `http://127.0.0.1:3000`.

---

## 2. Cài đặt các gói phụ thuộc

Di chuyển vào thư mục `frontend` và cài đặt theo đúng `package-lock.json`:

```bash
cd frontend
npm ci
```

---

## 3. Cấu hình biến môi trường

Sao chép tệp mẫu cấu hình môi trường (nếu cần tùy chỉnh cổng proxy khi phát triển):

```bash
cp .env.example .env
```

Nội dung tệp `.env`:

```env
VITE_API_BASE_URL=
API_PROXY_TARGET=http://127.0.0.1:3000
```

- Khi chạy máy chủ phát triển Vite (`npm run dev`), các yêu cầu tới `/api` và `/health` được tự động chuyển tiếp sang `API_PROXY_TARGET`.
- Để trống `VITE_API_BASE_URL` để trình duyệt mặc định gọi cùng nguồn gốc (*same-origin*) khi chạy chung qua Express tại `/demo/`.

---

## 4. Chạy ứng dụng

### Chế độ phát triển (Vite Dev Server)

```bash
npm run dev
```

Giao diện phát triển hoạt động tại `http://127.0.0.1:5173`.

### Chạy tích hợp cùng Back-end Express

Đóng gói bản phân phối tĩnh vào `frontend/dist`, sau đó khởi động Back-end Express:

```bash
npm run build
cd ../backend
npm start
```

Mở trình duyệt tại `http://localhost:3000/demo/` (hỗ trợ tải lại trực tiếp mọi đường dẫn con của React Router).

---

## 5. Chạy bộ kiểm thử tự động

Kiểm tra kiểu dữ liệu tĩnh TypeScript và chạy toàn bộ **215 bài kiểm thử tự động** (10 test suites):

```bash
npx tsc --noEmit
npm test
```

Phạm vi kiểm thử bao phủ cả hai phân hệ:
- **Phân hệ Du khách:** Quản lý phiên và lưu trữ token 24 giờ, thanh toán trực tuyến/tiền mặt (mã 6 chữ số), tải gói dữ liệu bundle 15 ngôn ngữ, bản đồ Leaflet 18 điểm tham quan, hình ảnh minh họa WebP, phát âm thanh tự động theo tọa độ GPS, tùy chỉnh lộ trình và hỏi đáp trợ lý RAG.
- **Phân hệ Quản trị (`STAFF` / `ADMIN`):** Điều hướng theo vai trò, bảo vệ route nội bộ, quầy thu ngân tiền mặt, cấp lại mã vé (`UC-12`), quản trị POI/bản dịch/lộ trình/kho tri thức, tra cứu nhật ký kiểm toán (`UC-17`) và bảng giám sát – thống kê hiện diện (`UC-18`).

---

## 6. Cấu trúc thư mục mã nguồn

```text
frontend/
├── public/                    # Tài nguyên tĩnh và bộ ảnh minh họa 18 POI chuẩn WebP
├── scripts/                   # Trình nạp TypeScript phục vụ chạy kiểm thử trên Node.js
├── src/
│   ├── api/                   # Lớp giao tiếp HTTP API và quản lý lưu trữ phiên (Guest / Staff)
│   ├── components/            # Các thành phần giao diện Bản đồ, Trình phát Audio, Khung Chat, Admin UI
│   ├── data/                  # Ánh xạ hình ảnh minh họa và thông tin nguồn ảnh các điểm tham quan
│   ├── hooks/                 # Các React Hook tùy chỉnh (GPS, ngôn ngữ, cảnh báo thay đổi chưa lưu)
│   ├── i18n/                  # Từ điển đa ngôn ngữ giao diện người dùng (15 ngôn ngữ)
│   ├── pages/                 # Các trang giao diện Du khách và Quản trị nội bộ (/internal/*)
│   ├── App.tsx                # Định tuyến ứng dụng (React Router)
│   └── main.tsx               # Điểm khởi động ứng dụng React
├── test/                      # Bộ 215 bài kiểm thử tự động Front-end
├── index.html                 # Tệp HTML gốc
├── package.json               # Khai báo phụ thuộc và kịch bản chạy
├── tsconfig.json              # Cấu hình trình biên dịch TypeScript
└── vite.config.ts             # Cấu hình đóng gói và proxy Vite
```
