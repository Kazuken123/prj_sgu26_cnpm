# Cơ sở dữ liệu

## Khởi tạo

`init_db.sql` là schema 16 bảng theo thiết kế Chương 4, dành cho MySQL 8.0.16 trở lên. Chọn một database trống trước khi import. Script không tạo database, không xóa bảng và không tự sửa cấu trúc bảng đã tồn tại. Không nạp đè lên database có dữ liệu cần giữ.

Mọi kết nối ứng dụng cần sử dụng utf8mb4 và UTC. Dữ liệu khởi tạo chỉ gồm ngôn ngữ vi/en; chưa có tài khoản mặc định hoặc bộ dữ liệu nghiệm thu đa ngôn ngữ. Bán kính 50 mét là mặc định cấu hình được. `reissue_count` chỉ phục vụ chức năng cấp lại token thuộc Could Have; giới hạn nghiệp vụ được kiểm tra tại Service.

ERD chỉnh sửa được nằm tại [`../docs/diagram/erd_diagram.drawio`](../docs/diagram/erd_diagram.drawio), gồm tổng thể và ba trang phân hệ.

## Migration

Giữ `migrations/001_refresh_tokens.sql` vì `backend/stores/schema.store.js` và lệnh `npm run db:migrate` vẫn tham chiếu tệp này. Migration bổ sung bảng REFRESH_TOKENS nếu chưa có, không xóa dữ liệu và không thay đổi các cột của bảng đã tồn tại. Trên database vừa khởi tạo bằng schema mới, bảng đã có nên migration không tạo lại.

Migration 001 KHÔNG chuyển schema 15 bảng cũ sang 16 bảng mới, không đổi vai trò và không loại bỏ các bảng nghiệp vụ cũ. Việc nâng cấp database có dữ liệu cần migration riêng sau khi xác định cách chuyển tài khoản, POI và các quan hệ liên quan. Không xóa volume MySQL để thay cho migration. Docker Compose chỉ chạy init script khi khởi tạo thư mục dữ liệu MySQL mới.

## Tương thích ứng dụng và kiểm thử

Schema mới chỉ có STAFF/ADMIN; các luồng đăng ký TOURIST/OWNER của backend và các kiểm thử tích hợp nghiệp vụ cũ chưa được chuyển đổi trong thay đổi này. Không coi schema mới là tương thích đầy đủ với ứng dụng hiện có. Các kiểm thử đó được giữ nguyên, không bị bỏ qua để làm CI xanh.

Kiểm tra schema và bước kiểm đếm bảng trong CI được cập nhật sang 16 bảng. Kiểm thử tích hợp và release smoke còn sử dụng đăng ký TOURIST sẽ cần điều chỉnh ở bước đồng bộ code.

Khóa ngoại, UNIQUE và CHECK xử lý các ràng buộc cấu trúc. Service vẫn phải kiểm tra phân quyền, chữ ký thanh toán, trạng thái/hiệu lực phiên, phiên bản nội dung và thực hiện các cập nhật nhiều bảng trong transaction. Redis quản lý mã đổi token có TTL và rate limit; không bổ sung bảng MySQL cho dữ liệu tạm này.
