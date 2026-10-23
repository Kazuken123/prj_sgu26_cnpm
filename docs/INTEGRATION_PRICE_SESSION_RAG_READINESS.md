# Hoàn thiện tích hợp giá, phiên, audit/monitoring RAG và readiness

Phạm vi ngày 24/10/2026: giữ nguyên schema, nghiệp vụ thanh toán, provider và bộ dữ liệu staging. Không coi mốc này là nghiệm thu chất lượng RAG.

## Giá trước thanh toán

`GET /api/payments/price` công khai, `Cache-Control: no-store`:

```json
{"data":{"amount":"50000.00","currency":"VND"}}
```

Ví dụ minh họa hình dạng phản hồi; giá thực lấy từ `VISIT_PRICE_VND` của máy chủ. Không tạo payment/session, không cần SQL/Redis để đọc cấu hình. Cấu hình thiếu/sai trả `503 VISIT_PRICE_NOT_CONFIGURED`, không lộ giá trị cấu hình. Giá gửi từ client không có quyền quyết định giao dịch. Khi tạo checkout, giá trong giao dịch do máy chủ xác nhận là giá áp dụng; yêu cầu lặp tiếp tục giữ giá giao dịch cũ theo cơ chế đã có.

Giao diện tải giá trước khi cho tạo checkout mới, có lỗi/thử lại, không hiển thị 0 khi chưa tải được. Lỗi tải giá không chặn đổi mã của khách đã thanh toán. Đây là giá quyền dùng thuyết minh demo, không xác nhận giá vé vào cổng của Thảo Cầm Viên.

## Logout và menu

Header nội bộ dùng cùng helper logout của tài khoản: chờ máy chủ xác nhận rồi mới xóa phiên. Lỗi mạng/503 giữ thông tin để thử lại; 401 xác nhận phiên không hợp lệ thì xóa phiên không dùng được. Không xóa token khách khi logout nội bộ.

Storage phát sự kiện cùng tab, không mang token trong payload. Menu cập nhật sau lưu/xóa phiên, khi cửa sổ lấy lại focus và khi nhận thay đổi storage. Menu nội bộ chỉ hỗ trợ hiển thị; quyền thực vẫn kiểm tại backend. Menu khách chỉ hiện có vé sau `GET /api/visits/me` xác minh ACTIVE và hạn còn hiệu lực; phản hồi cũ sau khi xóa token không thể bật lại trạng thái này. Lỗi xác minh không xóa token để khách còn thử lại.

## Audit và monitoring RAG

API audit ADMIN nhận thêm năm hành động đã được phân hệ kho tri thức ghi: `CREATE_KNOWLEDGE_DOCUMENT`, `UPDATE_KNOWLEDGE_DOCUMENT`, `DEACTIVATE_KNOWLEDGE_DOCUMENT`, `PUBLISH_KNOWLEDGE_DOCUMENT`, `FAIL_KNOWLEDGE_PROCESSING`. Chỉ chiếu các trường metadata cho phép: phiên bản, số chunk, tên model, mã lỗi. Nội dung tài liệu, câu hỏi, token và chi tiết lỗi tùy ý không được trả qua audit. Dropdown lấy danh sách từ API; bộ lọc ngày gửi UTC đến giây đúng hợp đồng hiện có, không đổi quy tắc khoảng thời gian của audit.

`GET /api/admin/monitoring` bổ sung `metrics.chatbot`:

```json
{"status":"AVAILABLE","value":{"total":0,"byStatus":{"SUCCESS":0,"NO_CONTEXT":0,"FAILED":0}},"unit":"logged_questions","scope":"WINDOW_CREATED_AT","updatedAt":"<asOf>"}
```

Đếm bản ghi `CHAT_LOGS.created_at` trong khoảng UTC `[from,to)` của dashboard, mặc định 24 giờ. Đọc cùng snapshot repeatable-read với các thống kê khác. Đếm cả mock và provider khác nếu đã có log; không đo số người, câu hỏi bị chặn trước khi ghi log hoặc độ đúng câu trả lời. Nguồn không truy cập được: `UNAVAILABLE`, `value=null`, readiness dashboard `NOT_READY`; không trả 0 giả. Giao diện phân biệt ba trạng thái và ghi rõ giới hạn đo.

Phần này thay thế trạng thái `NOT_IMPLEMENTED/NOT_INTEGRATED` trong tài liệu lịch sử mốc UC-18 và phần ghi chú tích hợp của `BACKEND_KNOWLEDGE_RAG.md`. Không thay đổi kết quả đánh giá ngữ nghĩa RAG trước đó, chưa bật provider thật hay hoàn thiện giao diện chatbot.

## Readiness

Store kiểm đủ 16 bảng đang dùng, gồm phiên, audio, tour, kho tri thức, chat và bundle log. Mỗi SQL probe giới hạn 2 giây; toàn lượt SQL giới hạn 5 giây. Redis tiếp tục qua RedisStore với giới hạn riêng hiện có. SQL hoặc Redis không sẵn sàng: HTTP 503 an toàn; phục hồi được kiểm lại mỗi request, không cache trạng thái khỏe cũ. Đây là kiểm phụ thuộc/schema tối thiểu, không phải kiểm file audio, chất lượng provider hoặc mọi cột/ràng buộc.

## Kiểm chứng

Backend: `payment.test.js`, `audit.test.js`, `audit.integration.test.js`, `monitoring.test.js`, `monitoring.integration.test.js`, `health.test.js` và hồi quy toàn bộ. SQL/Redis integration dùng cơ sở dữ liệu UUID thử riêng. Frontend: `integration-completion.test.js`, `review-regressions.test.js`, toàn bộ `npm test` và TypeScript/Vite build trên bản sao ngoài OneDrive.

Kết quả local bản cuối: backend 699/699 (38 suites, lỗi/hủy/bỏ qua 0), frontend 107/107 (10 suites, lỗi/hủy/bỏ qua 0); syntax/layer-import check, TypeScript và Vite build đạt. SQL integration dùng MySQL 8.4.13, Redis integration dùng Valkey 8. Bài provider/giọng Piper tùy chọn không bật lại vì không sửa provider; build còn cảnh báo bundle JavaScript >500 kB. Giao diện kiểm bằng React renderer/hợp đồng API, chưa kiểm trình duyệt thật hoặc CI cho mốc mới. Bảng đối chiếu yêu cầu và log được bàn giao riêng ngoài repo. Chưa tự commit/push/deploy mốc này.
