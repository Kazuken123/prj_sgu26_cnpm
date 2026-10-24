# Kích hoạt vé tiền mặt bằng mã 6 số

Điều chỉnh được người dùng duyệt ngày 24/10/2026: khách không nhập session_id khi đổi mã tiền mặt. Nhân viên vẫn dùng mã phiên khi đối soát. Không thay schema, migration, tiền đã ghi nhận, thời hạn vé hoặc cơ chế cấp lại token.

## API mới

`POST /api/payments/exchange-cash-code`, body chỉ có:

```json
{"shortedCode":"012345"}
```

`012345` là ví dụ, không phải mã thật. Giữ tên trường hiện có để tránh đổi tên ngoài phạm vi. Không gửi token STAFF/ADMIN hoặc session_id. Thành công trả envelope data gồm sessionId, token, tokenType, expiresAt như hợp đồng khách hiện có; `Cache-Control: no-store`. Token chỉ trả khi SQL commit thành công.

RedisStore tự tìm phiên từ mã, sau đó PaymentService khóa/kiểm tra lại payment CASH/PAID, phiên ACTIVE, hạn vé, chưa có token, issueId và hạn mã. SQL vẫn quyết định đổi quyền một lần và ghi audit. Lookup Redis không tự kích hoạt vé. Redis/SQL không xác định được kết quả thì từ chối an toàn, không ghi thêm tiền hoặc tự cấp lại token.

## Chống trùng và chống thử mã

Mã mới có không gian Redis `tcv:cash-code:v2:`. Lua đăng ký đồng thời bản ghi theo phiên và chỉ mục mã; hai phiên không được nhận cùng mã còn được giữ chỗ. Va chạm sinh lại hữu hạn tối đa 5 ứng viên, không kéo dài deadline. Gửi lại yêu cầu cấp mã còn hạn giữ mã/deadline cũ. Mã được giữ chỗ đến deadline gốc kể cả khi đã đổi quyền, tránh cấp ngay mã đã dùng cho khách khác. Không giữ chỗ vĩnh viễn: mã đã hết thời hạn có thể được tái sử dụng về sau.

Chỉ mục dùng SHA-1 làm tên khóa cho tương thích hàm Redis Lua, **không phải** hash mật khẩu hoặc cam kết bảo mật cho không gian 6 chữ số. Token khách trong MySQL vẫn băm SHA-256. Không ghi mã/token vào log hoặc tài liệu nghiệm thu.

API mới áp dụng giới hạn IP, mã và phiên. Mặc định giữ cấu hình cũ: 30 lượt/IP/60 giây, 5 lượt/mã/60 giây và 5 lượt/phiên/60 giây. Mã sai/hết hạn/đã dùng trả 401 chung; sai định dạng hoặc gửi thêm trường trả 400; vượt ngưỡng 429; Redis lỗi 503. Đây là mã nhận vé dạng bearer ngắn, không chứng minh danh tính người nhập; chưa phải giải pháp chống dò phân tán ở quy mô sản xuất.

## UI

Khách chọn Nhập mã tại quầy → nhập một ô 6 số, giữ số 0 ở đầu → Kích hoạt vé → Bắt đầu khám phá. Mã sai không xóa ô nhập; lỗi kỹ thuật nằm trong details Thông tin hỗ trợ. Sau kích hoạt, hiện hạn vé; mã phiên và trạng thái kỹ thuật nằm trong details đóng mặc định. Nếu đã lưu token nhưng kiểm tra phiên lỗi, giữ token và cho xác minh lại, không đổi mã/thanh toán lần nữa.

Quầy chỉ sao chép mã và hướng dẫn 6 số cho khách. session_id vẫn có trong phần đối soát nội bộ; không bỏ thông tin nghiệp vụ của nhân viên. Nội dung quầy dùng ngôn ngữ thao tác, bỏ tên UC/Idempotency-Key/token khỏi hướng dẫn giao mã.

## Chuyển tiếp staging — bắt buộc trước push/deploy

Người dùng đã duyệt tạm ngừng cấp/đổi mã tiền mặt cũ, chờ hết TTL thật rồi chuyển. **Không push main để CD tự chạy trước khi hoàn tất bước này.**

1. Chốt thời điểm ngừng thao tác CASH cũ với nhóm; đóng các màn hình quầy cũ để không cấp thêm v1 trong thời gian chuyển.
2. Xác minh TTL thực từ cấu hình/mã đang tồn tại bằng công cụ không in secret. Mặc định 600 giây không có nghĩa mọi môi trường đều đang dùng 600 giây. Nếu mã đã cấp có hạn dài hơn, đợi đến deadline muộn nhất.
3. Đợi mã v1 còn hiệu lực hết hạn; không xóa Redis, payment, phiên hoặc token đã cấp. Xác minh không còn mã v1 hợp lệ trước khi bật form chỉ 6 số.
4. Sau khi người dùng cho commit/push, chờ CI/CD của đúng commit và kiểm lại quầy → mã mới → form một ô → API khách.

API cũ `POST /api/payments/sessions/:sessionId/exchange-cash-code` được giữ. Store kiểm v2 trước, sau đó đọc v1 cho client cũ còn gửi đủ cặp. Mã v1 không được đưa vào lookup toàn cục vì trước đây có thể trùng giữa các phiên. Không hứa mã v1 dùng được trên form mới; không tự ánh xạ một mã trùng sang phiên tùy ý. Quy trình chờ hết mã cũ ngăn nhận nhầm vé khi chuyển phiên bản.

## Báo cáo cần điều chỉnh sau, không sửa Word trong mốc này

- 2.5 QT-04: bỏ yêu cầu khách gửi session_id, mô tả server phân giải mã duy nhất còn hiệu lực, giới hạn IP/mã/phiên.
- 2.4 luồng tiền mặt; UC-02 bước nhập/kiểm tra mã và các luồng lỗi: khách chỉ nhập mã, server vẫn liên kết đúng phiên đã thanh toán.
- UC-11 bàn giao mã và hướng dẫn khách: giao mã 6 số, session_id dành cho nhân viên đối soát.
- 4.2/4.3 PaymentService/RedisStore: thêm phân giải mã và hai bản ghi Redis có TTL.
- 4.4.4 và ERD: **không thay bảng/cột/quan hệ SQL**; chỉ ghi rõ chỉ mục Redis tạm, không thêm bảng mã.
- US-A03 AC3–4, NFR-05/07: bổ sung kiểm chứng uniqueness và đổi đồng thời qua API không có session_id. US-A03 AC1 khách tự tạo CASH là phần frontend còn thiếu riêng, chưa làm ở mốc này.

Kết quả test và ảnh trình duyệt được lưu ngoài repo trong `TCV_CASH_CODE_ONLY_20261024`. Chưa tự commit/push/deploy.
