# Sửa lỗi sau đối chiếu báo cáo — 20/10/2026

Nguồn yêu cầu: `CNPM_BAOCAO (8).docx` (Thảo Cầm Viên), đặc biệt mục 4.2, 4.4.2 và 4.4.4; UC-09, UC-11, UC-13; US-F01, US-F02; QT-03/05/08/12; NFR-13/18. Phạm vi chỉ sửa ba điểm đã rà soát, không triển khai nghiệp vụ mới.

## Thay đổi

- `config/utc-pool.js` thiết lập `SET SESSION time_zone = '+00:00'` trước khi bàn giao mỗi kết nối. Cả query/execute trực tiếp trên pool và getConnection dùng cùng đường khởi tạo. Thiết lập lỗi thì hủy kết nối và không chạy câu lệnh nghiệp vụ. Giữ `timezone: 'Z'` để driver chuyển đổi Date theo UTC. Thêm một câu lệnh thiết lập trên mỗi lượt mượn kết nối; không sửa lại các timestamp cũ đã lưu.
- `AuthStore.transaction` hủy kết nối khi rollback lỗi, không trả lại pool và không retry giao dịch chưa biết đã hoàn tác hay chưa. Giữ lỗi gốc. Deadlock/lock-wait chỉ retry hữu hạn sau rollback thành công như trước.
- POI Store trả kết quả không tồn tại, ContentJob Store trả kết quả cập nhật không thành công. Service quyết định 404/409; giữ nguyên mã lỗi và thông báo API. Retry không cập nhật được thì Service ném lỗi ngay trong callback transaction, không ghi audit và rollback.

Không migration, không thay tên bảng/cột, không sửa frontend hoặc Word. Không sửa dữ liệu lịch sử và không tăng content_version cho thay đổi metadata.

## Đối chiếu yêu cầu và kiểm chứng

| AC / QT / NFR | Đã đáp ứng chưa trong phạm vi sửa | Test chứng minh | Ghi chú |
| --- | --- | --- | --- |
| Quy định UTC tại 4.4.2; US-F02 AC3 (thời điểm audit) | Đã sửa thiết lập múi giờ cho kết nối ứng dụng | `utc-pool.test.js`: UTC trước query/execute/getConnection; lỗi thiết lập không chạy SQL nghiệp vụ; tái sử dụng phiên SQL từng ở +07:00/-05:00 | SQL thực chạy trên MariaDB 10.4.32; chưa xác minh bản sửa này trên MySQL 8/CI. Không tự sửa timestamp lịch sử. |
| UC-09 E5, UC-11 E3, UC-13 E3; NFR-18 | Đã sửa vòng đời kết nối khi rollback lỗi | `auth.store.test.js`: bounds conflict retries and stops when rollback itself fails; các ca audit rollback trong bộ SQL integration | Nhánh rollback lỗi được mô phỏng; không cố tình phá kết nối database đang phục vụ. |
| NFR-13; thiết kế 4.2.1–4.2.2; US-F02 AC1 / UC-13 E2 | Đã chuyển quyết định HTTP của thao tác ngừng POI sang Service | `poi.test.js`: missing POI deactivation maps to HTTP 404 in Service without writing; soft/repeatable deactivation và rollback audit | Không đổi hợp đồng API hoặc quyền STAFF/ADMIN. |
| NFR-13; US-C02 AC3, QT-08 / UC-13 A3, E2–E3 | Đã chuyển quyết định HTTP của xung đột retry sang Service | `content-job.test.js`: Store retry conflict is mapped by Service and rolls back without audit; bộ retry/phiên bản/quyền và SQL integration | Chỉ sửa nhánh retry đã có; không có worker dịch/TTS mới, không tuyên bố hoàn thành toàn bộ US-C02. |
| US-F01 AC2–AC4; QT-03/05/12 | Kiểm thử hồi quy các phần đã triển khai đạt | Toàn bộ bộ test local gồm auth, cash confirmation/code, POI và content jobs | Không chứng minh các AC chưa code như đổi mã lấy token khách, online gateway hoặc bundle. |

## Kết quả local

- Toàn bộ bộ test: **184 test đạt, 0 lỗi**; SQL integration dùng database tạm trên MariaDB 10.4.32. Test UTC mới không ghi bảng nghiệp vụ và chỉ đổi múi giờ của chính kết nối kiểm thử.
- Redis local dùng bản thay thế; các suite Redis thật không được bật (`RUN_REDIS_TESTS=0`). Không diễn giải số skipped của test runner thành đã chạy Redis thật.
- Kiểm tra cú pháp và import phân lớp: đạt với 61 file JavaScript. Kiểm tra diff không có lỗi khoảng trắng.
- Lượt đầu trong sandbox bị chặn HTTP/SQL localhost (`EACCES`); lượt chạy đầy đủ lại với quyền localhost phù hợp đạt kết quả trên.
- Chưa push theo yêu cầu người dùng, do đó **CI của commit sửa này chưa chạy**. Kết quả CI xanh của commit trước không phải bằng chứng cho commit mới. Chờ người dùng thông báo push; sau push cần kiểm tra MySQL 8/Redis thật trên CI trước mốc mới.
