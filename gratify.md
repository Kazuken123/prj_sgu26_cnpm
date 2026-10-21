# Graphify cho prj_sgu26_cnpm

Tên công cụ chính thức là **Graphify**; tên tài liệu `gratify.md` được giữ theo yêu cầu của dự án.

## Nguồn và phiên bản

- Nguồn: https://github.com/Graphify-Labs/graphify
- Gói Python: `graphifyy==0.9.84`.
- Bản skill generic Agent Skills được sao chép nguyên bản từ gói đã cài, kèm đủ thư mục `references/` và thông báo giấy phép.
- Bản lưu trong dự án: `skills/graphify/`.
- Vị trí đăng ký sau khi cài: `.agents/skills/graphify/`.

## Trạng thái

Đã kiểm tra gói Graphify 0.9.84 có trên máy. Phiên chỉnh sửa hiện tại không có quyền ghi vào thư mục `.agents` local, nên bản local được lưu ở `skills/graphify/`; chưa xác nhận skill được tự động nạp trong phiên hiện tại.

Bộ skill và tài liệu được quản lý trong repo. Bản đăng ký dành cho trợ lý hỗ trợ Agent Skills nằm tại `.agents/skills/graphify/`; cần đồng bộ repo và mở lại trợ lý để nạp. Phiên local hiện tại vẫn bị giới hạn quyền ghi `.agents`.

Chưa chạy tạo knowledge graph cho dự án trong lần bổ sung skill này. Tài liệu này không phải báo cáo phân tích graph và không khẳng định frontend/backend đã kết nối thành công.

## Cài đặt và kích hoạt

Trên máy khác, cài đúng phiên bản bằng một trong các công cụ quản lý môi trường Python:

```powershell
pipx install graphifyy==0.9.84
# Hoặc: uv tool install graphifyy==0.9.84
```

Chạy ở thư mục gốc dự án trong terminal có quyền ghi `.agents`, rồi mở lại trợ lý hỗ trợ Agent Skills để nạp skill:

```powershell
graphify install --project --platform agents
```

Để lưu bộ skill và tài liệu vào Git, sau khi kiểm tra các thay đổi và đồng bộ nhánh remote:

```powershell
git add -- gratify.md skills/graphify
git commit -m "docs: add Graphify skill and usage guide"
git push origin main
```

Repo đang bỏ qua `.agents/` trong `.gitignore`; bộ skill có thể được quản lý qua `skills/graphify/` và cài lại bằng lệnh trên ở mỗi máy.

Skill generic chứa ví dụ Bash. Khi dùng PowerShell, trợ lý cần chuyển cú pháp shell tương ứng; không dán nguyên các khối Bash vào PowerShell.

## Cách sử dụng trong trợ lý

```text
/graphify .
/graphify . --update
/graphify query "Trace frontend API requests to backend routes"
/graphify query "How are payment and visit session verification connected?"
```

Các lệnh bắt đầu bằng `/graphify` ở trên là yêu cầu gửi cho trợ lý có skill, không phải lệnh PowerShell. Sau khi đã tạo graph, có thể truy vấn bằng CLI:

```powershell
graphify query "Trace frontend API requests to backend routes"
```

Đầu ra dự kiến sau khi chạy thành công: `graphify-out/graph.json`, `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`. Chỉ kết luận quan hệ giữa module sau khi kiểm tra nguồn và kết quả thực tế.

## Phạm vi hữu ích cho dự án

- Theo dõi lời gọi từ `frontend/src/api/` đến router và service trong `backend/`.
- Kiểm tra luồng thanh toán, xác minh phiên tham quan và tải audio guide.
- Đối chiếu phần triển khai với tài liệu trong `docs/`.

Graphify hỗ trợ đọc và truy vết code; vẫn cần build, kiểm thử API và kiểm thử giao diện để xác nhận hành vi chạy thực tế.
