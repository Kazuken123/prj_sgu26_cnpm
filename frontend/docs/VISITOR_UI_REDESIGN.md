# Giao diện khách: bản đồ và kích hoạt quyền nghe

Bản UI đã được duyệt ngày 25/10/2026, tích hợp từ bản thử riêng. Giữ trang chủ, dashboard nội bộ, API, schema và dữ liệu hiện có.

- Khung khách dùng màu Olive & cát; CSS giới hạn trong `.visitor-shell`.
- Desktop: danh sách/giới thiệu bên trái, bản đồ bên phải, điều khiển nghe ở đáy vùng làm việc. Chiều cao theo viewport thực tế để không mất thanh nghe khi màn hình thấp hoặc trình duyệt phóng lớn.
- Mobile: bản đồ, thẻ điểm mở rộng/thu gọn, điều khiển nghe và thanh điều hướng. Danh sách, lộ trình, tùy chọn mở riêng.
- Bản đồ tự căn toàn bộ POI lần đầu; đổi lựa chọn mới dịch tới điểm. Không đổi tọa độ hoặc coi tọa độ minh họa là đã khảo sát. Bộ lọc dùng dropdown trên desktop và nút trên mobile.
- Chọn ngôn ngữ bằng tên đầy đủ, dùng public map/bundle và audio có xác thực hiện có. Nhãn fallback tách riêng văn bản/audio. Thông tin giọng tổng hợp và giới hạn bản đồ nằm trong tùy chọn.
- GPS chỉ xin sau thao tác của khách. Giữ chế độ vị trí giả lập, nhãn riêng và cơ chế chống tự phát lặp/phản hồi muộn.
- Thanh toán giữ giá do server xác định và thứ tự khởi tạo → xác nhận mock → đổi mã → xác minh quyền. Không coi mở trang/redirect là thanh toán thành công. MockGateway vẫn là mô phỏng, không thu tiền thật.
- Mã quầy có sáu ô nhập, hỗ trợ dán/tự điền và số 0 đầu, vẫn gửi một giá trị sáu số qua API cũ. Lỗi thân thiện; mã hỗ trợ nằm trong trợ giúp. Xóa thông tin vé có bước xác nhận.
- Không tích hợp UC-08/15; bỏ khung tìm kiếm từ khóa nổi để tránh nhầm với chatbot. Các module backend/chatbot không bị sửa.

## Kiểm chứng

Build TypeScript/Vite và 135 test frontend chạy ngoài OneDrive trên Node 24.21.0, không bỏ qua. Bộ test giữ các ca hết hạn, phản hồi muộn, public map khi chưa có quyền nghe, xác minh lỗi không đổi mã lại, các hợp đồng backend và thêm sáu ca về mã quầy/checkout. CI tiếp tục kiểm Node 20/22 và backend trên MySQL/Redis riêng.

QA trình duyệt đã kiểm bản đồ public, 10 POI/15 ngôn ngữ, chuyển Việt/Anh, chọn/lọc điểm, chuyển sang thanh toán, tự điền mã sáu số, desktop thấp và mobile 390/320. Các ca ghi thanh toán và media trong test dùng mock; không tạo giao dịch staging để kiểm UI. Chưa nghiệm thu lại GPS thực địa hoặc audio bằng token mới trên browser.

Không thay dependency, cấu hình hạ tầng, migration hoặc nội dung POI. CI/CD hiện có build lại frontend và đóng gói bộ audio sẵn có; lần tích hợp này không thêm audio.
