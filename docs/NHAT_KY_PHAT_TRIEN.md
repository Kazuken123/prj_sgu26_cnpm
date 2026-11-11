# Nhật ký Phát triển & Các Mốc Hoàn thiện Hệ thống (Thảo Cầm Viên Sài Gòn)

Tài liệu này tóm tắt ngắn gọn lịch sử phát triển, tích hợp và kiểm chứng hệ thống qua từng giai đoạn (thay thế cho các tệp ghi chú lẻ theo từng mốc trước đây).

---

## 1. Giai đoạn Khởi tạo & Nền tảng Xác thực Nội bộ (`UC-09`, `UC-10`, `UC-16`)
- **Thiết kế Cơ sở dữ liệu gốc (`database/init_db.sql`):** Khởi tạo 16 bảng chuẩn hóa 3NF chia làm 3 phân hệ: Tài khoản & Phiên vé (`USERS`, `REFRESH_TOKENS`, `AUDIT_LOGS`, `VISIT_SESSIONS`, `PAYMENTS`, `BUNDLE_ACCESS_LOGS`), Nội dung & Lộ trình (`LANGUAGES`, `POIS`, `POI_TRANSLATIONS`, `AUDIOS`, `CONTENT_JOBS`, `TOURS`, `TOUR_POIS`) và Kho tri thức RAG (`KNOWLEDGE_DOCUMENTS`, `KNOWLEDGE_CHUNKS`, `CHAT_LOGS`).
- **Xác thực & Phân quyền (`US-F01`):**
  - Đăng nhập nội bộ cho `STAFF` và `ADMIN` với mật khẩu băm `bcrypt`, phát hành JWT ngắn hạn và xoay vòng Refresh Token (lưu băm `SHA-256`).
  - Tự động khóa tài khoản 15 phút sau 5 lần đăng nhập sai liên tiếp.
  - Hợp đồng đăng xuất (`Migration 001`): Thu hồi toàn bộ chuỗi phiên đăng nhập hiện hành của nhân viên và ghi nhận kiểm toán.

---

## 2. Giai đoạn Xây dựng Core Back-end theo 17 Mốc (`Stage 1` – `Stage 17`)
- **Mốc 1 – 2 (Quản trị POI & Tác vụ nền — `UC-13`):**
  - Xây dựng API nội bộ tạo/sửa/xóa mềm điểm tham quan, bổ sung phân loại điểm, thông tin bảo tồn và khung giờ hoạt động (`Migration 002`).
  - Tự động sinh tác vụ nền `CONTENT_JOBS` ở trạng thái `PENDING` trong cùng giao dịch khi cập nhật nội dung tiếng Việt; hỗ trợ xem trạng thái và thử lại (`retry`) tác vụ lỗi.
- **Mốc 3 – 8 (Luồng Thanh toán Tiền mặt & Quyền truy cập Du khách — `UC-02`, `UC-11`):**
  - Khởi tạo phiên chờ thanh toán `PENDING` (`Migration 003`, `004`).
  - Nhân viên tra cứu phiên chờ, xác nhận đã nhận tiền mặt (`PAID` + `ACTIVE` có hạn 24 giờ) và phát hành mã ngắn 6 chữ số lưu trên Redis (TTL 600 giây).
  - Du khách đổi mã ngắn một lần lấy token phiên tham quan (có giới hạn tần suất theo phiên và theo IP); middleware kiểm tra hiệu lực vé trực tiếp trên MySQL ở mỗi yêu cầu.
- **Mốc 9 – 11 (Luồng Thanh toán Trực tuyến & Webhook — `UC-01`):**
  - Khởi tạo giao dịch trực tuyến qua `MockGateway`, xác thực回调 (webhook) bằng chữ ký `HMAC-SHA256` đảm bảo tính lũy đẳng (webhook lặp không cộng dồn doanh thu hay tạo thêm phiên).
  - Đổi mã xác thực trực tuyến lấy token phiên tham quan 24 giờ.
- **Mốc 12 – 16 (Pipeline Dịch thuật, Tổng hợp Âm thanh & Worker tự động):**
  - Quản lý nhận tác vụ nguyên tử bằng `claim_id` (`Migration 005`) và thời hạn giữ quyền `lease_expires_at` kèm nhịp tim 15 giây (`Migration 006`).
  - Xây dựng công cụ `npm run jobs:recover` để thu hồi các tác vụ bị gián đoạn và tiến trình `content-worker.js` tự động dịch thuật, tổng hợp tệp âm thanh WAV và phục vụ qua endpoint bảo vệ `/api/media/audio/:key`.
- **Mốc 17 (Gói dữ liệu Content Bundle & Lộ trình — `UC-03`, `UC-04`, `UC-07`, `UC-14`):**
  - Đóng gói toàn bộ điểm tham quan đang hoạt động, bản dịch theo ngôn ngữ lựa chọn (kèm cơ chế fallback tự động sang tiếng Anh/tiếng Việt), đường dẫn âm thanh và danh sách lộ trình mẫu trong một API `/api/tourist/bundle` duy nhất.
  - Xây dựng API tạo, cập nhật thứ tự điểm tham quan trong tour mẫu có kiểm tra dấu vân tay phiên bản (*revision fingerprint*).

---

## 3. Giai đoạn Hoàn thiện Nghiệp vụ Mở rộng & Kho Dữ liệu Thảo Cầm Viên (19/10 – 26/10/2026)
- **Ngày 19/10 – 20/10/2026 (Tích hợp Piper TTS, Kho tri thức RAG & Dữ liệu thực tế):**
  - Tích hợp **Piper Neural TTS 1.8.0** tạo tệp âm thanh giọng đọc tự nhiên thay thế hoàn toàn âm báo thử.
  - Xây dựng phân hệ **Trợ lý hỏi đáp RAG (`UC-08`, `UC-15`)**: Quản lý tài liệu, chia đoạn văn bản (*chunking*), tìm kiếm ngữ nghĩa và sinh câu trả lời có trích dẫn nguồn.
  - Hoàn thiện bộ dữ liệu chuẩn tại **Thảo Cầm Viên Sài Gòn**: Mở rộng từ 10 lên **18 điểm tham quan (POI)**, **4 lộ trình mẫu**, **15 ngôn ngữ quốc tế** (`vi, en, zh, ja, ko, fr, de, es, it, pt, ru, ar, th, id, ms`), tổng cộng **270 bản dịch** và **270 tệp âm thanh WAV** kèm bộ ảnh minh họa chuẩn WebP.
- **Ngày 21/10 – 24/10/2026 (Tích hợp Front-end React 18, Cấp lại vé `UC-12` & Giám sát `UC-17`, `UC-18`):**
  - Kết nối ứng dụng **React 18 + TypeScript + Vite + Leaflet** với Back-end Express tại `/demo/`.
  - Hoàn thiện giao diện Du khách (Bản đồ tương tác, định vị GPS + thanh giả lập tọa độ, trình phát âm thanh tự động theo bán kính $30\text{m}/35\text{m}$ và ngưỡng rời vùng $1.5 \times R$, trang thanh toán mã 6 số, khung chat RAG).
  - Thiết kế lại toàn bộ phân hệ Quản trị (`STAFF`/`ADMIN`), bổ sung tính năng **Cấp lại mã vé khi khách mất token (`UC-12`)**, trang **Nhật ký kiểm toán (`UC-17`)** và **Bảng giám sát & Thống kê hiện diện thời gian thực (`UC-18` — `Migration 007`)**.
- **Ngày 26/10 – 11/11/2026 (Chuẩn hóa Sơ đồ Kiến trúc, DFD Mức 0–3 & Hồ sơ Báo cáo):**
  - Xuất bản bộ sơ đồ kiến trúc và ERD tương tác bằng Archify (`docs/architecture/`).
  - Chuẩn hóa và cân bằng luồng dữ liệu cho toàn bộ hệ thống sơ đồ Use Case, Activity và DFD Mức 0 – Mức 3 (`docs/diagram/`), đồng bộ vào báo cáo đồ án [`docs/CNPM_BAOCAO.docx`](CNPM_BAOCAO.docx).
