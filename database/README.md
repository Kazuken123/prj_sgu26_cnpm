# Cơ sở dữ liệu

## Khởi tạo

`init_db.sql` là schema 16 bảng theo thiết kế Chương 4, dành cho MySQL 8.0.16 trở lên. Chọn một database trống trước khi import. Script không tạo database, không xóa bảng và không tự sửa cấu trúc bảng đã tồn tại. Không nạp đè lên database có dữ liệu cần giữ.

Mọi kết nối ứng dụng cần sử dụng utf8mb4 và UTC. Dữ liệu khởi tạo chỉ gồm ngôn ngữ vi/en; chưa có tài khoản mặc định hoặc bộ dữ liệu nghiệm thu đa ngôn ngữ. Bán kính 30 mét là mặc định đề xuất theo Word 8, cấu hình được theo POI. `reissue_count` chỉ phục vụ chức năng cấp lại token thuộc Could Have; giới hạn nghiệp vụ được kiểm tra tại Service.

ERD chỉnh sửa được nằm tại [`../docs/diagram/erd_diagram.drawio`](../docs/diagram/erd_diagram.drawio), gồm tổng thể và ba trang phân hệ.

## Migration

Lệnh `npm run db:migrate` giữ migration 001 để tạo REFRESH_TOKENS nếu thiếu, rồi kiểm tra và chạy migration 002 để thêm cột JSON nullable `rotated_token_hashes` nếu chưa có. Chạy được nhiều lần, giữ tài khoản và phiên hiện có; schema mới vẫn 16 bảng. Chạy nâng cấp trước khi dùng code logout mới. Các hash đã xoay trước nâng cấp không thể phục hồi; các phiên đó dùng Bearer hoặc refresh hiện tại để logout. Xem `docs/LOGOUT_CONTRACT.md`.

Migration 001 KHÔNG chuyển schema 15 bảng cũ sang 16 bảng mới, không đổi vai trò và không loại bỏ các bảng nghiệp vụ cũ. Việc nâng cấp database có dữ liệu cần migration riêng sau khi xác định cách chuyển tài khoản, POI và các quan hệ liên quan. Không xóa volume MySQL để thay cho migration. Docker Compose chỉ chạy init script khi khởi tạo thư mục dữ liệu MySQL mới.

Migration 003 yêu cầu POIS đã tồn tại. Nó thêm category, conservation_status, activity_hours nếu thiếu và đổi default bán kính thành 30, giữ nguyên bán kính đã lưu. Các POI cũ chưa có phân loại để NULL, không tự nhận là ANIMAL. Category cho phép NULL ở schema để giữ trạng thái chưa xác minh này; API tạo mới chỉ lưu loại hợp lệ, cập nhật bắt buộc xác nhận category. Đây là quyết định bảo toàn dữ liệu cần ghi lại khi chỉnh bảng từ điển dữ liệu đang lỗi của Word 8.

Migration MySQL DDL không rollback như giao dịch DML: nếu ngắt giữa chừng, chạy lại db:migrate để tiếp tục các cột còn thiếu. Không nhận các sơ đồ ERD cũ đã được đồng bộ với cột mới trong đợt này.

## Tương thích ứng dụng và kiểm thử

Schema sử dụng tài khoản nội bộ STAFF/ADMIN. ADMIN đầu tiên được tạo bằng bootstrap có mật khẩu cấu hình bên ngoài; chỉ ADMIN đăng nhập mới gọi được `POST /api/admin/staff`. Tạo STAFF và ghi audit được thực hiện trong cùng transaction. Không có API đăng ký công khai hoặc luồng chủ quán.

Bộ kiểm thử tích hợp nạp trực tiếp schema này vào database dùng riêng, kiểm tra đủ 16 bảng, migration refresh token, phân quyền, chống trùng email, rollback khi ghi audit lỗi và vòng đời phiên đăng nhập. Workflow kiểm tra thêm bản đóng gói bằng bootstrap ADMIN và tạo STAFF qua HTTP.

Khóa ngoại, UNIQUE và CHECK xử lý các ràng buộc cấu trúc. Service vẫn phải kiểm tra phân quyền, chữ ký thanh toán, trạng thái/hiệu lực phiên, phiên bản nội dung và thực hiện các cập nhật nhiều bảng trong transaction. Redis quản lý mã đổi token có TTL và rate limit; không bổ sung bảng MySQL cho dữ liệu tạm này.
