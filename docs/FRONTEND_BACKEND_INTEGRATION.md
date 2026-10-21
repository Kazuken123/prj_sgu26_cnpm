# Nối frontend và backend — 21/10/2026

Đối chiếu báo cáo CNPM_BAOCAO (8), các phần yêu cầu/phạm vi và kiến trúc 4.1–4.2: khách không đăng ký tài khoản, quyền khách tách khỏi STAFF/ADMIN; giao diện nhận bundle theo ngôn ngữ; Express phục vụ trang `/demo`; thanh toán và audio mock phải được ghi rõ.

## Luồng API hiện có

| Giao diện | Backend |
| --- | --- |
| Kích hoạt online | POST `/api/payments/online-checkout`, GET trạng thái phiên, POST `exchange-online-code` |
| Mã tại quầy | POST `exchange-cash-code` |
| Xác minh khách | GET `/api/visits/me` |
| Khám phá, đổi ngôn ngữ | GET `/api/content/bundle?languageCode=vi` hoặc ngôn ngữ được hỗ trợ |
| Audio | GET URL media với Bearer khách, sau đó phát Blob URL |
| Nhân viên | API auth/refresh/logout, admin STAFF, CASH, POI và content jobs |

Không tự ký webhook trên frontend. Người vận hành vẫn dùng `backend/scripts/mock-payment.js` để xác nhận giao dịch mô phỏng. Dữ liệu tham quan và audio cần được chuẩn bị theo `data/demo/README.md`.

## Cách chạy

1. Chuẩn bị MySQL, Redis và cấu hình backend theo README hiện có. Không reset database hoặc volume cũ.
2. Trong `frontend`, chạy `npm ci` và `npm run build`. Để `VITE_API_BASE_URL` trống khi dùng chung Express.
3. Trong `backend`, chạy `npm ci`, sau đó `npm start`.
4. Mở `http://127.0.0.1:3000/demo/` hoặc cổng PORT đã cấu hình. Các đường dẫn React tải lại trực tiếp được.

Khi phát triển riêng, chạy `npm run dev` trong frontend. `API_PROXY_TARGET` mặc định là `http://127.0.0.1:3000`; dùng `http://127.0.0.1:18080` cho stack DRAFT-03. Frontend mặc định gọi cùng origin và Vite chuyển `/api` cùng `/health` sang backend. Biến `API_PROXY_TARGET` không được đưa vào mã trình duyệt.

Dockerfile dùng bước build React riêng, chỉ chép `dist` vào runtime. Express không còn công khai thư mục mã nguồn frontend. CI giữ test/build React trên Node 20/22 với TypeScript loader và kiểm tra asset cùng deep links trong release smoke test. Test auth JavaScript cũ tham chiếu các file HTML/auth.js đã bị xóa được thay bằng kiểm thử phục vụ React; hợp đồng auth React được kiểm tra ở `frontend/test/sprint4.test.js` và sprint7.

## Sửa luồng phiên

- Không hiển thị phiên hợp lệ khi `/api/visits/me` thất bại. Giữ token đã nhận và cho xác minh lại, không đổi mã một lần hoặc mua lại.
- Không dùng phiên khách/nội bộ thuộc backend khác để gửi thông tin xác thực.
- Hủy phản hồi xác minh/bundle cũ khi rời trang Khám phá.
- Giữ thanh toán mô phỏng, audio mẫu một giây và cảnh báo tọa độ chưa khảo sát; chưa triển khai thêm GPS tự phát, chatbot RAG hay bản đồ theo toàn bộ báo cáo trong thay đổi nối API này.

## Kiểm chứng và giới hạn

- Đã hợp nhất với main 81320ca, giữ API tour/audit log, bản sửa logout/refresh, Docker build nhiều stage và CI hiện có.
- Frontend: 66/66 test đạt; TypeScript và Vite build đạt trên Node 24. Các test hợp đồng API dùng mock fetch.
- Backend: lint kiểm tra cú pháp và ranh giới lớp đạt trên 135 file JavaScript.
- HTTP test local vẫn bị chặn bởi EACCES khi kết nối 127.0.0.1. Chưa nghiệm thu trình duyệt, MySQL/Redis/media hoặc Docker tại máy local.
- CI của commit trên GitHub chạy frontend Node 20/22, backend với MySQL/Redis và release smoke. Xem trạng thái Actions của đúng commit; không coi kiểm thử local là bằng chứng CI đã đạt.
- Git metadata local chỉ đọc; mã được cập nhật qua GitHub connector. Các file thuyết trình không liên quan không nằm trong thay đổi này.

Luồng ONLINE vẫn là thanh toán mô phỏng. Cần nghiệm thu thủ công ONLINE/CASH, bundle VI/EN và audio trước khi coi đây là bản hoàn tất để triển khai thực tế.
