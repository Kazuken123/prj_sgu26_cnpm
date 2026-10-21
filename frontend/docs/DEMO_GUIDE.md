# Kịch bản Thực hiện Trình diễn Hệ thống Frontend Thảo Cầm Viên

Tài liệu này cung cấp các bước chi tiết để người đánh giá thực hiện kiểm tra và nghiệm thu toàn bộ 5 luồng nghiệp vụ trên trình duyệt.

## Chuẩn bị trước khi thực hiện

1. Khởi động máy chủ backend tại cổng 18080 theo hướng dẫn của dự án.
2. Tại thư mục frontend, chạy lệnh khởi động giao diện:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt web tại địa chỉ `http://127.0.0.1:5173`.
4. Quan sát trang chủ để xác nhận thông báo kết nối backend hiển thị trạng thái sẵn sàng.

---

## Luồng 1: Khách thanh toán trực tuyến và nghe thuyết minh

### Mục tiêu
Kiểm tra chu trình khách mua vé trực tuyến, đổi token tham quan, xem nội dung thuyết minh và nghe âm thanh thử nghiệm có xác thực.

### Các bước thực hiện
1. Từ trang chủ, bấm vào nút Thanh toán vé Online để chuyển sang trang `/payment`.
2. Bấm nút Tạo yêu cầu thanh toán mô phỏng.
   - Giao diện hiển thị mã phiên, mã tham chiếu thanh toán và nút mở trang giả lập cổng thanh toán.
   - Trạng thái thanh toán hiển thị Chưa thanh toán.
3. Bấm vào liên kết Mở cổng thanh toán mô phỏng để chuyển sang trang thanh toán của backend.
4. Bấm nút Xác nhận thanh toán trên trang thanh toán backend.
5. Quay lại trang `/payment` trên giao diện khách.
6. Bấm nút Kiểm tra trạng thái thanh toán.
   - Trạng thái phiên chuyển sang Đã thanh toán.
   - Nút Đổi mã lấy vé tham quan hiển thị rõ trên màn hình.
7. Bấm nút Đổi mã lấy vé tham quan.
   - Giao diện gửi mã xác thực lên backend và nhận chuỗi token khách.
   - Thông tin phiên được lưu vào bộ nhớ trình duyệt.
   - Hệ thống tự động chuyển sang trang Khám phá `/explore`.
8. Tại trang Khám phá:
   - Danh sách điểm tham quan hiển thị Hươu cao cổ và Voi châu Á.
   - Bấm nút EN để đổi sang tiếng Anh, quan sát tên và mô tả cập nhật tương ứng.
   - Bấm nút VI để quay lại tiếng Việt.
   - Bấm chọn điểm tham quan Hươu cao cổ, bấm nút Phát thuyết minh.
   - Trình duyệt tải tệp âm thanh có gửi Bearer token của khách và phát âm thanh thử nghiệm.

---

## Luồng 2: Nhân viên hỗ trợ thanh toán tiền mặt tại quầy

### Mục tiêu
Kiểm tra chu trình nhân viên tạo phiên tiền mặt, xác nhận tiền, cấp mã ngắn 6 chữ số và khách đổi vé độc lập.

### Các bước thực hiện
1. Đăng nhập tài khoản nhân viên hoặc quản trị viên tại trang `/login` với thông tin được cấp sẵn:
   - Email: `staff@thaocamvien.vn`
   - Mật khẩu: `Password123@`
2. Bấm vào mục Thu tiền mặt trên thanh điều hướng để mở trang `/internal/cash`.
3. Bấm nút Tạo phiên tiền mặt mới.
   - Hệ thống hiển thị mã phiên tiền mặt vừa tạo với trạng thái Chưa thanh toán.
4. Bấm nút Xác nhận đã nhận tiền mặt.
   - Trạng thái phiên chuyển sang Đã thanh toán.
5. Bấm nút Cấp mã đổi vé.
   - Màn hình hiển thị mã ngắn gồm 6 chữ số kèm thời gian hiệu lực 10 phút.
   - Ví dụ mã hiển thị dạng 048291, bảo toàn đúng số 0 ở đầu.
6. Mở một cửa sổ trình duyệt ẩn danh mới tại địa chỉ `http://127.0.0.1:5173/explore`.
7. Dán mã phiên và nhập mã ngắn 6 chữ số vào khung Đổi mã tiền mặt của khách.
8. Bấm nút Đổi mã nhận vé.
   - Khách nhận token tham quan độc lập, hoàn toàn không giữ quyền hay token nhân viên.
   - Danh sách điểm tham quan hiển thị đầy đủ và phát được âm thanh.

---

## Luồng 3: Quản lý phiên đăng nhập nội bộ

### Mục tiêu
Kiểm tra quy trình đăng nhập, làm mới token xoay vòng và đăng xuất hoàn tất với mã 204.

### Các bước thực hiện
1. Truy cập trang `/login`.
2. Nhập sai mật khẩu để kiểm tra thông báo lỗi hiển thị rõ ràng trên giao diện.
3. Nhập đúng thông tin tài khoản nhân viên hoặc quản trị viên và bấm Đăng nhập.
4. Sau khi đăng nhập thành công, chuyển tới trang Tài khoản `/account`.
   - Màn hình hiển thị đầy đủ họ tên, email, vai trò và trạng thái tài khoản.
5. Bấm nút Làm mới phiên làm việc.
   - Hệ thống gửi mã làm mới lên backend, nhận bộ token mới và cập nhật thời hạn phiên.
6. Bấm nút Đăng xuất.
   - Backend thu hồi token và trả về mã trạng thái 204.
   - Phiên nội bộ trong bộ nhớ bị xóa sạch, giao diện quay về trạng thái chưa đăng nhập.

---

## Luồng 4: Phân quyền tạo tài khoản nhân viên

### Mục tiêu
Xác nhận chỉ quản trị viên mới có quyền tạo nhân viên mới, tài khoản nhân viên thông thường bị từ chối với mã 403.

### Các bước thực hiện
1. Đăng nhập với tài khoản nhân viên thông thường `staff@thaocamvien.vn`.
2. Bấm vào mục Thêm nhân viên trên thanh điều hướng hoặc truy cập `/admin/staff/new`.
   - Giao diện hiển thị cảnh báo không có quyền truy cập chức năng này.
3. Đăng xuất và đăng nhập lại bằng tài khoản quản trị viên `admin@thaocamvien.vn`.
4. Truy cập trang Thêm nhân viên `/admin/staff/new`.
5. Nhập email mới, họ tên và mật khẩu hợp lệ tối thiểu 8 ký tự.
6. Bấm nút Tạo tài khoản nhân viên.
   - Màn hình thông báo tạo tài khoản thành công kèm thông tin nhân viên mới được kích hoạt.

---

## Luồng 5: Quản lý điểm tham quan và theo dõi tác vụ nội dung

### Mục tiêu
Kiểm tra tính năng tạo điểm tham quan mới ở trạng thái chờ duyệt, kiểm soát xung đột phiên bản và gửi yêu cầu thử lại tác vụ lỗi.

### Các bước thực hiện
1. Đăng nhập bằng tài khoản nội bộ và chuyển tới trang Quản lý điểm tham quan `/internal/pois`.
2. Bấm nút Thêm điểm tham quan để mở trang `/internal/pois/new`.
3. Nhập tên, danh mục Thực vật, kinh độ, vĩ độ, nội dung mô tả và kịch bản đọc.
4. Bấm nút Lưu điểm tham quan.
   - Điểm tham quan mới được tạo ở trạng thái Chờ duyệt với phiên bản nội dung ban đầu là 1.
5. Mở chi tiết điểm tham quan vừa tạo tại hai thẻ trình duyệt khác nhau để kiểm tra khóa phiên bản:
   - Tại thẻ thứ nhất, chỉnh sửa mô tả và bấm Lưu thay đổi. Hệ thống lưu thành công và tăng phiên bản lên 2.
   - Tại thẻ thứ hai, không tải lại trang mà bấm Lưu thay đổi với dữ liệu cũ.
   - Giao diện báo lỗi xung đột phiên bản mã 409 và giữ nguyên dữ liệu trong form để người dùng không bị mất nội dung vừa gõ.
6. Chuyển tới trang Tác vụ nội dung `/internal/jobs`.
   - Danh sách hiển thị các tiến trình xử lý âm thanh và dịch thuật với trạng thái Hoàn thành, Đang xử lý hoặc Thất bại.
7. Tìm tác vụ có trạng thái Thất bại và bấm nút Thử lại tác vụ.
   - Hệ thống gửi yêu cầu lên backend và nhận phản hồi tiếp nhận thành công mã 202.
   - Dòng tác vụ cập nhật trạng thái hiển thị đang chờ xử lý.
