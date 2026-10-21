# Hợp đồng API Frontend — Thảo Cầm Viên Sài Gòn (Sprint 0, Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5 & Sprint 6)

## 1. Cấu hình kết nối và môi trường

- **Địa chỉ máy chủ API (Base URL):** `http://127.0.0.1:18080` (cấu hình qua biến môi trường `VITE_API_BASE_URL`).
- **Nguồn gốc được phép của Frontend (Origin CORS):**
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `http://localhost:5500`
  - `http://127.0.0.1:5500`
- **Quy ước phản hồi JSON:**
  - Thành công: dữ liệu luôn bọc trong trường `data`. Ví dụ: `{ "data": { ... } }`.
  - Thất bại: luôn trả về mã lỗi và thông điệp lỗi: `{ "code": "MA_LOI", "error": "Thông điệp lỗi chi tiết" }`.
  - HTTP 204 No Content: không có body JSON (thực hiện ở endpoint `/api/auth/logout`).
  - Phản hồi từ backend luôn gửi kèm `Cache-Control: no-store`.

## 2. Hai loại mã xác thực độc lập và cách tách phiên

1. **Phiên khách tham quan (Guest Session):**
   - Không gian lưu trữ: `sessionStorage` khóa `tcv_guest_session_v1`.
   - Mã xác thực: chuỗi token bắt đầu bằng `tcv_visit_` tạo bởi hàm băm SHA-256 trên server.
   - Gửi qua header: `Authorization: Bearer tcv_visit_...`
   - Phạm vi áp dụng: Điểm cuối khách tham quan (`/api/visits/me`, `/api/content/bundle`, `/api/media/audio/:key`).
   - Token khách không có cơ chế làm mới (refresh).

2. **Phiên công vụ nội bộ (Internal Session - STAFF / ADMIN):**
   - Không gian lưu trữ: `sessionStorage` khóa `tcv_internal_session_v1`.
   - Mã xác thực: JWT Access Token (hạn ngắn) và chuỗi Refresh Token 64 ký tự hex ngẫu nhiên.
   - Gửi qua header: `Authorization: Bearer <accessToken nội bộ>`
   - Phạm vi áp dụng: Điểm cuối nội bộ (`/api/auth/me`, `/api/admin/staff`, `/api/auth/logout`).
   - Có cơ chế tự động làm mới qua `POST /api/auth/refresh`.

3. **Nguyên tắc phân lập tuyệt đối:**
   - Đăng xuất nội bộ chỉ thu hồi token nội bộ và xóa khóa `tcv_internal_session_v1`, không xóa phiên khách và không làm mất vé khách.
   - Phiên khách hết hạn không làm đăng xuất tài khoản nội bộ.
   - Không dùng token nội bộ thay cho token khách và ngược lại.

---

## 3. Các API trong Sprint 0 và Sprint 1

### 3.1. Kiểm tra sẵn sàng hệ thống (Readiness)
- `GET /health/ready`: Không yêu cầu xác thực. Trả về trạng thái database và redis.

### 3.2. Thanh toán trực tuyến mô phỏng & Quản lý phiên khách
- `POST /api/payments/online-checkout`: Header `Idempotency-Key: <UUID v4>`, body `{}`.
- `GET /api/payments/sessions/:sessionId`: Tra cứu trạng thái thanh toán và phiên.
- `POST /api/payments/sessions/:sessionId/exchange-online-code`: Đổi mã một lần lấy token khách.
- `GET /api/visits/me`: Xác minh phiên khách tham quan qua Bearer token.

---

## 4. Các API trong Sprint 2 & Sprint 3

### 4.1. Gói dữ liệu thuyết minh khách tham quan (Bundle Content)
- `GET /api/content/bundle?languageCode=vi` (hoặc `en`): Header `Authorization: Bearer <token khách>`.
- Trả về danh mục ngôn ngữ, danh sách điểm tham quan `pois` và lộ trình `tours` (`localization: "SHARED"`).

### 4.2. Tải tệp âm thanh có xác thực (Media Audio)
- `GET /api/media/audio/:key`: Header `Authorization: Bearer <token khách>`.
- Trả về tệp nhị phân `audio/wav`. Frontend fetch nhị phân -> tạo `Blob` -> `URL.createObjectURL` -> đưa vào trình phát -> thu hồi qua `URL.revokeObjectURL`.

---

## 5. Các API trong Sprint 4 (Xác thực và Tài khoản nội bộ STAFF/ADMIN)

### 5.1. Đăng nhập nội bộ (Login)
- **Phương thức & Đường dẫn:** `POST /api/auth/login`
- **Body gửi lên:**
  ```json
  {
    "email": "admin@thaocamvien.vn",
    "password": "Password123@"
  }
  ```
- **Quy tắc kiểm tra dữ liệu đầu vào:**
  - `email`: Bắt buộc, định dạng email chuẩn, tối đa 255 ký tự.
  - `password`: Bắt buộc, tối thiểu 8 ký tự, tối đa 72 bytes UTF-8 (`Buffer.byteLength <= 72`).
- **Phản hồi 200 OK:**
  ```json
  {
    "message": "Đăng nhập thành công!",
    "data": {
      "user": {
        "id": 1,
        "email": "admin@thaocamvien.vn",
        "fullName": "Quản trị viên Thảo Cầm Viên",
        "role": "ADMIN",
        "status": "ACTIVE"
      },
      "accessToken": "jwt_token_chuoi_dai",
      "refreshToken": "64_ky_tu_hex_ngau_nhien"
    }
  }
  ```
- **Phản hồi lỗi:**
  - `400 VALIDATION_ERROR`: Lỗi định dạng email hoặc độ dài mật khẩu.
  - `401 INVALID_CREDENTIALS`: Email hoặc mật khẩu không đúng.
  - `423 LOGIN_TEMPORARILY_LOCKED`: Tài khoản bị khóa tạm thời 15 phút do nhập sai 5 lần.
  - `403 ACCOUNT_LOCKED`: Tài khoản bị quản trị viên khóa.
  - `403 ACCOUNT_INACTIVE`: Tài khoản chưa được kích hoạt.

---

### 5.2. Lấy thông tin tài khoản hiện tại (Auth Me)
- **Phương thức & Đường dẫn:** `GET /api/auth/me`
- **Tiêu đề bắt buộc:** `Authorization: Bearer <accessToken nội bộ>`
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "id": 1,
      "email": "admin@thaocamvien.vn",
      "fullName": "Quản trị viên Thảo Cầm Viên",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
  ```
- **Phản hồi lỗi:**
  - `401 MISSING_ACCESS_TOKEN`: Thiếu tiêu đề xác thực.
  - `401 INVALID_ACCESS_TOKEN`: Token hết hạn hoặc không hợp lệ (kích hoạt luồng refresh token tự động).
  - `401 SESSION_REVOKED`: Phiên làm việc đã bị thu hồi.

---

### 5.3. Làm mới phiên đăng nhập (Refresh Token)
- **Phương thức & Đường dẫn:** `POST /api/auth/refresh`
- **Body gửi lên:**
  ```json
  {
    "refreshToken": "<chuỗi 64 ký tự hex>"
  }
  ```
- **Cơ chế xoay vòng (Token Rotation):** Mỗi lần làm mới thành công, server cấp một `refreshToken` mới và hủy mã cũ. Frontend lưu cả bộ `accessToken` và `refreshToken` mới nhận được.
- **Phản hồi 200 OK:** Cung cấp thông tin user và bộ token mới.
- **Phản hồi lỗi:** `401 INVALID_REFRESH_TOKEN`: Mã làm mới không hợp lệ hoặc đã quá hạn; frontend xóa phiên nội bộ và đưa người dùng về trang đăng nhập.

---

### 5.4. Đăng xuất nội bộ (Logout)
- **Phương thức & Đường dẫn:** `POST /api/auth/logout`
- **Tiêu đề:** `Authorization: Bearer <accessToken>` (nếu có).
- **Body gửi lên:** `{"refreshToken": "<chuỗi 64 ký tự hex>"}`.
- **Phản hồi 204 No Content:** Thành công, không có body JSON. Frontend xóa phiên nội bộ `tcv_internal_session_v1`.
- **Xử lý sự cố mạng:** Nếu mất mạng hoặc gặp 503, không báo đăng xuất thành công giả, giữ phiên và cung cấp nút thử lại.

---

### 5.5. Quản trị viên tạo tài khoản nhân viên (Create Staff)
- **Phương thức & Đường dẫn:** `POST /api/admin/staff`
- **Tiêu đề bắt buộc:** `Authorization: Bearer <accessToken ADMIN>`
- **Body gửi lên:**
  ```json
  {
    "email": "nhanvien.moi@thaocamvien.vn",
    "password": "Password123@",
    "fullName": "Lê Văn B",
    "phoneNumber": "0987654321"
  }
  ```
- **Quy tắc phân quyền:** Chỉ tài khoản có vai trò `ADMIN` mới được gọi. Nếu tài khoản có vai trò `STAFF` gọi, server trả về `403 FORBIDDEN`.
- **Phản hồi 201 Created:**
  ```json
  {
    "message": "Đã tạo tài khoản nhân viên.",
    "data": {
      "userId": 10,
      "email": "nhanvien.moi@thaocamvien.vn",
      "fullName": "Lê Văn B",
      "role": "STAFF",
      "status": "ACTIVE"
    }
  }
  ```
- **Phản hồi lỗi:**
  - `409 EMAIL_EXISTS`: Email đã được sử dụng.
  - `403 FORBIDDEN`: Không có quyền quản trị viên.
  - `400 VALIDATION_ERROR`: Sai định dạng dữ liệu đầu vào.

---

## 6. Các API trong Sprint 5 (Thanh toán Tiền mặt CASH & Khách nhận quyền)

### 6.1. Nhân viên tạo phiên tiền mặt mới (Create Cash Session)
- **Phương thức & Đường dẫn:** `POST /api/admin/payments`
- **Tiêu đề:**
  - `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
  - `Idempotency-Key: <UUID v4 ngẫu nhiên>`
  - `Content-Type: application/json`
- **Body gửi lên:**
  ```json
  {
    "paymentMethod": "CASH"
  }
  ```
- **Phản hồi 201 Created (hoặc 200 khi gửi lại cùng Idempotency-Key):**
  ```json
  {
    "data": {
      "sessionId": "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      "paymentRef": "f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d",
      "paymentMethod": "CASH",
      "amount": "50000.00",
      "currency": "VND",
      "sessionStatus": "PENDING",
      "paymentStatus": "PENDING"
    }
  }
  ```
- **Phản hồi lỗi:** `400 INVALID_PAYMENT_INPUT`, `400 STAFF_CASH_ONLY`, `400 INVALID_REQUEST_KEY`, `401 MISSING_ACCESS_TOKEN`, `403 FORBIDDEN`, `409 REQUEST_KEY_CONFLICT`.

---

### 6.2. Nhân viên tra cứu đối soát phiên tiền mặt (Lookup Cash Session)
- **Phương thức & Đường dẫn:** `GET /api/admin/payments/sessions/:sessionId`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Phản hồi 200 OK:** Chỉ trả về đúng 7 trường whitelist, không trả token/authCode:
  ```json
  {
    "data": {
      "sessionId": "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      "paymentRef": "f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d",
      "paymentMethod": "CASH",
      "amount": "50000.00",
      "currency": "VND",
      "sessionStatus": "PENDING",
      "paymentStatus": "PENDING"
    }
  }
  ```
- **Phản hồi lỗi:** `400 INVALID_SESSION_ID`, `401 MISSING_ACCESS_TOKEN`, `403 FORBIDDEN`, `404 VISIT_SESSION_NOT_FOUND`, `409 CASH_PAYMENT_REQUIRED` (khi tra cứu phiên ONLINE qua endpoint tiền mặt).

---

### 6.3. Nhân viên xác nhận đã nhận đủ tiền mặt (Confirm Cash Payment)
- **Phương thức & Đường dẫn:** `POST /api/admin/payments/sessions/:sessionId/confirm-cash`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Body gửi lên:** `{}` (rỗng, không gửi amount hay status; dùng dữ liệu máy chủ đã lưu).
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "sessionId": "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      "paymentRef": "f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d",
      "paymentMethod": "CASH",
      "amount": "50000.00",
      "currency": "VND",
      "sessionStatus": "ACTIVE",
      "paymentStatus": "PAID",
      "paidAt": "2026-10-21T03:00:00.000Z",
      "activatedAt": "2026-10-21T03:00:00.000Z",
      "expiresAt": "2026-10-22T03:00:00.000Z",
      "alreadyConfirmed": false
    }
  }
  ```
- **Phản hồi lỗi:** `400 INVALID_CASH_CONFIRMATION`, `401 MISSING_ACCESS_TOKEN`, `403 FORBIDDEN`, `404 VISIT_SESSION_NOT_FOUND`, `409 CASH_PAYMENT_REQUIRED`, `409 CASH_PAYMENT_NOT_CONFIRMABLE`.

---

### 6.4. Nhân viên cấp mã ngắn cho khách (Issue Cash Code)
- **Phương thức & Đường dẫn:** `POST /api/admin/payments/sessions/:sessionId/cash-code`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Body gửi lên:** `{}`
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "sessionId": "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      "shortedCode": "012345",
      "codeExpiresAt": "2026-10-21T03:10:00.000Z",
      "visitExpiresAt": "2026-10-22T03:00:00.000Z",
      "reused": false
    }
  }
  ```
- **Phản hồi lỗi:** `400 INVALID_CASH_CODE_INPUT`, `404 VISIT_SESSION_NOT_FOUND`, `409 CASH_PAYMENT_NOT_PAID`, `409 VISIT_SESSION_NOT_ACTIVE`, `409 VISIT_TOKEN_ALREADY_ISSUED`, `409 VISIT_SESSION_EXPIRED`, `503 CASH_CODE_UNAVAILABLE`.

---

### 6.5. Khách tham quan đổi mã ngắn lấy token (Exchange Cash Code)
- **Phương thức & Đường dẫn:** `POST /api/payments/sessions/:sessionId/exchange-cash-code`
- **Tiêu đề:** Không gửi token nội bộ.
- **Body gửi lên:**
  ```json
  {
    "shortedCode": "012345"
  }
  ```
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "sessionId": "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
      "token": "tcv_visit_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "tokenType": "Bearer",
      "expiresAt": "2026-10-22T03:00:00.000Z"
    }
  }
  ```
- **Phản hồi lỗi:** `400 INVALID_CASH_EXCHANGE_INPUT`, `401 CASH_CODE_INVALID_OR_EXPIRED`, `404 VISIT_SESSION_NOT_FOUND`, `409 VISIT_TOKEN_ALREADY_ISSUED`, `409 CASH_PAYMENT_PENDING`, `429 CASH_EXCHANGE_RATE_LIMITED`.

---

## 7. Các API trong Sprint 6 (Quản lý POI & Theo dõi Tác vụ Nội dung)

### 7.1. Lấy danh sách điểm tham quan (List POIs)
- **Phương thức & Đường dẫn:** `GET /api/admin/pois`
- **Tiêu đề bắt buộc:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Tham số truy vấn (Query params):**
  - `page`: Số trang (mặc định 1, tối đa 100000).
  - `limit`: Số mục mỗi trang (mặc định 20, tối đa 100).
  - `category`: Lọc theo phân loại `ANIMAL`, `PLANT`, `HERITAGE`, `AMENITY`.
  - `status`: Lọc theo trạng thái `ACTIVE` hoặc `INACTIVE`.
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "items": [
        {
          "poiId": 1,
          "name": "Hươu cao cổ",
          "category": "ANIMAL",
          "conservationStatus": "Ít quan tâm",
          "activityHours": "07:00 - 17:30",
          "latitude": 10.7915,
          "longitude": 106.7052,
          "triggerRadius": 30,
          "avatarUrl": "/assets/images/tcv_huou_thao_em.jpg",
          "displayOrder": 1,
          "status": "ACTIVE",
          "contentVersion": 1,
          "description": "Nội dung mô tả tiếng Việt...",
          "audioScript": "Kịch bản đọc thuyết minh tiếng Việt..."
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```

---

### 7.2. Lấy chi tiết điểm tham quan (Get POI Detail)
- **Phương thức & Đường dẫn:** `GET /api/admin/pois/:id`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Phản hồi 200 OK:** `{ "data": { ...chi_tiet_poi } }`
- **Phản hồi lỗi:** `404 POI_NOT_FOUND` nếu không tìm thấy điểm tham quan.

---

### 7.3. Tạo mới điểm tham quan (Create POI)
- **Phương thức & Đường dẫn:** `POST /api/admin/pois`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`, `Content-Type: application/json`
- **Body gửi lên:**
  ```json
  {
    "name": "Tên điểm tham quan",
    "category": "ANIMAL",
    "conservationStatus": null,
    "activityHours": null,
    "latitude": 10.7915,
    "longitude": 106.7052,
    "triggerRadius": 30,
    "avatarUrl": "/assets/images/tcv_mau.jpg",
    "displayOrder": 0,
    "status": "INACTIVE",
    "description": "Nội dung mô tả tiếng Việt bắt buộc...",
    "audioScript": "Kịch bản đọc thuyết minh tiếng Việt bắt buộc..."
  }
  ```
- **Phản hồi 201 Created:** `{ "data": { ...poi, "processing": "PENDING" } }`
- **Quy tắc:** Mặc định `status` là `INACTIVE`, `contentVersion` khởi tạo là `1`.

---

### 7.4. Cập nhật điểm tham quan với khóa lạc quan (Update POI)
- **Phương thức & Đường dẫn:** `PUT /api/admin/pois/:id`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`, `Content-Type: application/json`
- **Body gửi lên:** Toàn bộ thông tin POI kèm `expectedVersion`:
  ```json
  {
    "name": "Tên điểm tham quan cập nhật",
    "category": "ANIMAL",
    "conservationStatus": "Nguy cấp",
    "activityHours": "07:00 - 17:30",
    "latitude": 10.7915,
    "longitude": 106.7052,
    "triggerRadius": 30,
    "avatarUrl": null,
    "displayOrder": 1,
    "status": "ACTIVE",
    "description": "Mô tả mới...",
    "audioScript": "Kịch bản đọc mới...",
    "expectedVersion": 1
  }
  ```
- **Quy tắc phiên bản và tác vụ:**
  - Nếu thay đổi `name`, `description` hoặc `audioScript`: `contentVersion` tăng thêm 1 và trả về `processing: "PENDING"`.
  - Nếu chỉ thay đổi thông tin phụ (`activityHours`, `triggerRadius`, `displayOrder`, `status`, `avatarUrl`, tọa độ): `contentVersion` giữ nguyên và trả về `processing: "UNCHANGED"`.
- **Phản hồi lỗi 409 POI_VERSION_CONFLICT:** Xảy ra khi `contentVersion` trên server đã khác `expectedVersion`. Phía client phải giữ nguyên bản nháp người dùng và đối chiếu trước khi lưu lại.

---

### 7.5. Ngừng sử dụng điểm tham quan (Deactivate POI)
- **Phương thức & Đường dẫn:** `POST /api/admin/pois/:id/deactivate`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Body:** `{}` (rỗng).
- **Phản hồi 200 OK:** Trả về đối tượng POI với trường `status: "INACTIVE"`. Không xóa vật lý dữ liệu khỏi cơ sở dữ liệu.

---

### 7.6. Lấy danh sách tác vụ nội dung (List Content Jobs)
- **Phương thức & Đường dẫn:** `GET /api/admin/content-jobs`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Tham số truy vấn:**
  - `page`, `limit` (tối đa 100).
  - `poiId`: Lọc theo mã điểm tham quan.
  - `status`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
  - `languageCode`: Lọc theo mã ngôn ngữ (`vi`, `en`, ...).
  - `currentOnly`: `true` hoặc `false` (mặc định `false`, chỉ xem tác vụ của phiên bản hiện hành).
- **Phản hồi 200 OK:**
  ```json
  {
    "data": {
      "items": [
        {
          "jobId": 1,
          "poiId": 1,
          "languageCode": "en",
          "sourceVersion": 1,
          "currentVersion": 1,
          "isCurrent": true,
          "status": "COMPLETED",
          "canRetry": false,
          "createdAt": "2026-10-21T03:00:00.000Z",
          "updatedAt": "2026-10-21T03:01:00.000Z",
          "translation": {
            "status": "READY",
            "sourceVersion": 1,
            "isCurrent": true
          },
          "audio": {
            "status": "AVAILABLE",
            "sourceVersion": 1,
            "isCurrent": true
          },
          "error": null
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```

---

### 7.7. Thử lại tác vụ xử lý nội dung thất bại (Retry Content Job)
- **Phương thức & Đường dẫn:** `POST /api/admin/content-jobs/:id/retry`
- **Tiêu đề:** `Authorization: Bearer <accessToken STAFF hoặc ADMIN>`
- **Body gửi lên:** `{}` (bắt buộc rỗng, không gửi status hay nội dung thay thế).
- **Phản hồi 202 Accepted:**
  ```json
  {
    "message": "Đã tiếp nhận yêu cầu thử lại; nội dung chưa được xác nhận hoàn tất.",
    "data": {
      "jobId": 1,
      "poiId": 1,
      "languageCode": "en",
      "sourceVersion": 1,
      "currentVersion": 1,
      "status": "PENDING",
      "accepted": true
    }
  }
  ```
- **Phản hồi lỗi:**
  - `409 CONTENT_JOB_NOT_FAILED`: Tác vụ không ở trạng thái FAILED.
  - `409 CONTENT_JOB_OUTDATED`: Tác vụ thuộc phiên bản nguồn cũ không còn hiện hành.
  - `409 CONTENT_JOB_CHANGED`: Tác vụ đã thay đổi trạng thái trong lúc xử lý.

---

## 8. Các phân hệ chưa có API
- Quản trị lộ trình tour (UC-14).
- Trợ lý hỏi đáp AI / Chatbot.
- Nhật ký kiểm toán và báo cáo thống kê.
- Danh sách quản lý, khóa hoặc xóa tài khoản nhân viên.
