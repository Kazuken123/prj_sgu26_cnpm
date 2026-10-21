# Bàn giao cho người phụ trách frontend / UI–UX — 21/10/2026

## Mốc nhận việc

Bản React của commit dc41120 đã được đồng bộ với cách phục vụ frontend, Docker và CI. Công việc tiếp theo là thiết kế giao diện trên các trang React hiện có, bảo toàn hợp đồng và luồng nghiệp vụ đã nối; không cần xây lại API backend.

Code bản sửa được kiểm chứng cục bộ: lint120 file JS; backend456/456 test với MySQL8/Redis thật; frontend64/64 test; TypeScript/Vite build và Docker build đạt. Đã thao tác trình duyệt với bộ DRAFT-03: checkoutPENDING → operator xác nhận mock → PAID/ACTIVE → token → bundleVI/EN → chọn Hươu/Voi → phát hết âm thử1s; reload /explore hoạt động. CI trên GitHub cần xem đúng commit chứa tài liệu này, không lấy trạng thái commit trước thay thế.

## Bắt đầu trên máy khác

1. Cập nhật main trong clone riêng ngoài OneDrive; kiểm tra thay đổi đang dở trước khi cập nhật. Không sao chép `.env`/mật khẩu từ máy người khác.
2. Dựng backend/data riêng theo [hướng dẫn dữ liệu demo](../../data/demo/README.md) và [bàn giao DRAFT-03](../../docs/DEMO_DRAFT03_FRONTEND_HANDOFF.md). Có2 POI,4 bản văn VI/EN và1 tour demo. Không init lại DB có dữ liệu hoặc xóa volume.
3. Trong frontend: `npm ci`, `npm test`, `npm run build`; tất cả thực hiện ngoài OneDrive. Không thêm dependency nếu chưa cần; dùng lockfile.
4. Làm UI với `npm run dev`: mở http://127.0.0.1:5173. Khi không đặt VITE_API_BASE_URL, dev proxy chuyển /api và /health tới backend18080. `.env.example` có thể dùng khi cần trỏ backend riêng; mọi VITE_ đều công khai lúc build, không đặt bí mật vào đó.
5. Bản chạy chung: build frontend rồi chạy backend, hoặc build Docker. Trình duyệt mở `/` trên cổng backend. Docker tự build React và chỉ public frontend/dist. /demo chuyển về /; các trang React hỗ trợ reload trực tiếp.

Tham khảo [README frontend](../README.md), [hợp đồng API](API_CONTRACT.md) và [hướng dẫn demo](DEMO_GUIDE.md). Nếu tài liệu cũ khác API hiện tại, đối chiếu code và báo cáo Word chuẩn trước khi thay đổi; không tự sửa backend để khớp fixture mock.

## Những gì cần giữ khi thiết kế

- Làm từng trang/luồng nhỏ; đọc phần US/AC, QT/NFR và UC tương ứng trong **CNPM_BAOCAO (8).docx — Thảo Cầm Viên** trước mỗi mốc. Trình file định sửa và trạng thái cần giữ; có mâu thuẫn thì trao đổi trước.
- Có thể chỉnh bố cục, CSS, component và cách trình bày trạng thái. Không tự sửa schema, backend, Docker/CI hoặc cấu hình chung; cần thay contract thì phối hợp với người phụ trách backend.
- Token khách và tài khoản STAFF/ADMIN là hai phiên riêng. Không lấy token nội bộ gọi API khách hoặc ngược lại; ẩn nút không thay kiểm tra quyền ở server.
- Không cấp quyền chỉ vì redirect thành công. Chỉ đổi mã sau khi server xác nhận PAID; không tự tạo token, kéo dài vé hoặc yêu cầu thanh toán lại khi mất phản hồi chưa đối soát.
- Refresh chỉ retry hữu hạn và dùng cặp token đã xoay. Logout phải được server xác nhận; lỗi mạng/503 không giả báo đã thu hồi. Giữ test auth-regression và tách bộ nhớ khách/nội bộ.
- Khách lấy dữ liệu bằng bundle; không gọi API quản trị POI. Giữ nhãn ngôn ngữ thực tế/fallback và tour SHARED. Đổi ngôn ngữ/POI phải xử lý phản hồi cũ, trạng thái đang tải và lỗi.
- Audio cần fetch với Bearer rồi dùng Blob URL; không đưa token vào URL hoặc gửi token tới host khác. Giữ hủy request/dọn Blob và sự kiện playing/ended; không báo đang phát chỉ vì HTTP200.
- Dữ liệu nội dung là văn bản không tin cậy: không chèn HTML trực tiếp từ API. Không đưa secret/raw token vào giao diện, console hoặc ảnh bàn giao.
- MockGateway vẫn cần operator backend chạy `npm run mock:payment -- <paymentRef> SUCCESS` với cấu hình trỏ đúng backend. Không đưa khóa ký webhook vào trình duyệt hoặc thêm nút frontend tự ký SUCCESS.

## Giới hạn phải ghi đúng

Audio DRAFT-03 là **âm thử mock một giây, không đọc kịch bản**. Hai bản văn VI/EN đã được duyệt thủ công; không coi là nghiệm thu dịch tự động.

Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa. Tour là lộ trình demo do nhóm đề xuất. Không trình bày như GPS, tuyến đi bộ hay khả năng tiếp cận đã kiểm chứng.

Chưa có nghiệm thu giao diện nội bộ trên database demo mới trong lần kiểm trình duyệt này; cần chuẩn bị tài khoản qua quy trình bootstrap an toàn khi thử STAFF/ADMIN. Không thêm tài khoản/mật khẩu mặc định vào seed.

Chưa staging HTTPS, provider thật hoặc nghiệm thu Chrome Android/Safari iOS. Không ghi “toàn hệ thống hoàn tất” dựa trên CI xanh.

## Trước khi bàn giao thay đổi UI

Chạy test/build frontend; chạy kiểm tra backend phù hợp và toàn bộ hồi quy trước khi chốt mốc theo quy trình chung. Test fetch mock không thay thao tác trình duyệt với backend thật. Kiểm ít nhất loading/error, pending/paid, token không hợp lệ, đổi VI/EN, chọn POI, phát âm thử và reload.

Báo danh sách file, AC đã đáp ứng, test/bằng chứng và giới hạn; không xóa/skip test để xanh CI. Chỉ commit/push khi chủ đồ án chốt, phối hợp tránh push đồng thời; không force-push hoặc tự giải quyết xung đột bằng cách ghi đè.

Nguồn: Word8 và phạm vi được chủ đồ án duyệt; code dc41120 cộng bản sửa tích hợp; bằng chứng cục bộ ngày21/10/2026. Trạng thái CI lấy từ workflow đúng commit bàn giao.
