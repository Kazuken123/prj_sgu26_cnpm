# Logout nội bộ — UC-10

`POST /api/auth/logout` thu hồi một phiên, trả 204 cả khi phiên đã bị thu hồi.

- Ưu tiên Bearer access token có chữ ký, issuer, audience và loại access hợp lệ. Chỉ bỏ kiểm thời hạn access cho thao tác thu hồi; không cho phép dùng access hết hạn với API khác. Xóa theo cả session_id và user_id đã xác thực. Khi Bearer hợp lệ, bỏ qua refresh trong body để không vô tình thu hồi thêm phiên khác.
- Không có Bearer hợp lệ: nhận refreshToken đúng định dạng trong body. Hash hiện tại hoặc hash cũ đã xoay đều có thể thu hồi chính phiên đó. Hash cũ không được dùng để refresh. Mã đúng định dạng nhưng không khớp phiên trả 204, không tác động phiên khác. Không dùng session_id do client tự khai để xác định quyền.
- Backend hỗ trợ cả Bearer và refresh-only; frontend hiện chưa thuộc phạm vi chỉnh sửa đợt backend này. Khi nối frontend sau, nên gửi Bearer khi logout, chỉ xóa dữ liệu cục bộ sau khi server thành công, lỗi mạng giữ token để thử lại và không tự refresh. Backend vẫn thu hồi được phiên theo hash refresh cũ đã ghi nhận từ lúc áp dụng migration/code mới.

## Lưu trữ và nâng cấp

Chạy `npm run db:migrate` trong backend trước khi chạy code mới. Migration 001 tạo bảng nếu thiếu; 002 thêm cột JSON nullable `REFRESH_TOKENS.rotated_token_hashes` nếu chưa có. Dữ liệu phiên/tài khoản được giữ; schema vẫn 16 bảng. Script tạo mới đã có cột này. Không chạy lại init_db.sql để nâng cấp database cũ.

Mỗi lần xoay, thêm hash hiện tại vào mảng rồi thay token_hash trong cùng UPDATE và giao dịch khóa phiên hiện có. Chỉ hash SHA-256 được giữ, không raw token. Lịch sử đi cùng phiên, mất khi phiên bị xóa; hạn phiên không gia hạn khi refresh. Hoạt động giữa nhiều Store/tiến trình vì không dùng Map riêng. Migration không phục hồi các hash đã xoay trước khi nâng cấp: những phiên đó cần Bearer hoặc refresh hiện tại để logout.

Đánh đổi: logout chỉ bằng refresh cũ tìm trong JSON, không có chỉ mục cho từng hash lịch sử; lịch sử tăng theo số lần refresh trong thời hạn phiên. Khi số phiên/lượt refresh lớn, nên chuẩn hóa lịch sử sang bảng có chỉ mục và chính sách giới hạn tần suất. Không tự cắt lịch sử trong bản sửa vì sẽ phá hợp đồng logout bằng mã cũ. Đây là lựa chọn cho phạm vi hiện tại, không phải cam kết hiệu năng ở mọi quy mô.

## Kiểm chứng

`logout.persistence.test.js` giữ Service/AuthStore/RefreshTokenStore thật, thay riêng executor truy vấn; kiểm tra nhiều lần xoay, khởi tạo lại runtime, access hết hạn, idempotency, không thu hồi phiên khác, giả mạo và migration chạy lại. Không tự nhận đây là kiểm chứng engine MySQL.

Các ca MySQL thực tế được bổ sung vào `auth.integration.test.js`: lịch sử qua runtime mới, nâng cấp schema cũ và refresh/logout đồng thời. Chạy trên database thử nghiệm riêng với RUN_DB_TESTS=1. Phải ghi rõ nếu chưa chạy được MySQL ở máy kiểm tra; CI xanh của commit cũ không chứng minh bản sửa mới.
