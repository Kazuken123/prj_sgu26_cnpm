# Bàn giao backend có dữ liệu DRAFT-03 — 20/10/2026

Backend API trên máy nghiệm thu: **http://127.0.0.1:18080**; `/health/ready` trả HTTP200 từ host. Đây là địa chỉ loopback của máy chạy Docker, không phải địa chỉ để máy/điện thoại khác truy cập. Chưa làm frontend khách mới.

## Source tái lập trong repo

Xem [hướng dẫn dựng từ repo và ví dụ API](../data/demo/README.md), [dữ liệu đã duyệt](../data/demo/draft03.json), [bằng chứng nguồn đã lưu](../data/demo/OSM_SAVED_RECORDS.md), [cấu hình mẫu không có bí mật](../data/demo/demo.env.example) và [Compose demo riêng](../compose.demo.yml).

Bản bàn giao này được kiểm chứng local trước khi chốt Git. Khi lấy source, dùng commit có đủ các file của mốc DRAFT-03; HEAD nền cc691ce chưa chứa mốc này. Trạng thái push/CI cần đối chiếu đúng commit trên GitHub Actions. Dữ liệu demo cần thiết đã nằm trong repo, không phụ thuộc file riêng ở Downloads/Temp hoặc manifest ngoài repo.

## Dữ liệu đã nhập thực tế

Database **tcv_demo_review_20261020**, trên MySQL/Redis/media volume của project **tcv-browser-demo-draft03**, tách khỏi stack cũ và database fixture.

- POI1 **Hươu cao cổ**, POI2 **Voi châu Á**, ACTIVE/content_version1.
- Bốn bản VI/EN READY/source_version1; tên, giới thiệu và kịch bản đọc khớp DRAFT-03 đã duyệt.
- Tour1 **Lộ trình demo do nhóm đề xuất — Hươu cao cổ và Voi châu Á**, thứ tự POI1 → POI2, tên/mô tả dùng chung, không gán nhãn đã dịch tour.
- Bốn job COMPLETED, bốn audio AVAILABLE, bốn tệp WAV hợp lệ trên volume media. Mỗi tệp là **âm thử mock một giây, không đọc kịch bản**.
- Seed lần đầu CREATED; chạy lại trước và sau worker đều UNCHANGED, cùng digest/IDs, không tạo trùng. Không có audit PREPARE_TRANSLATION; worker tái sử dụng bản văn đã duyệt.
- Một giao dịch/phiên ONLINE mô phỏng được tạo để kiểm HTTP, cuối cùng PAID/ACTIVE với hạn vé ban đầu được giữ; không thu tiền thật. Token/mã/chữ ký không đưa vào tài liệu hoặc log.

**Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa.** Giữ `osmCheckedAt=null`. Chủ đồ án cho phép nguồn cũ cho demo trình duyệt; không xác nhận node hươu là khu cạnh voi, GPS, tuyến đi hoặc tiếp cận. Bán kính30m là mặc định kỹ thuật.

## Kiểm chứng

- Build image từ bản sao repo ngoài OneDrive thành công; áp schema hiện có trên volume demo mới và migration001–006, không thêm migration/schema.
- Lint119 JavaScript file đạt. **456/456 test đạt**, 23 suite, fail0/cancel0/skip0, 177.669 giây; Node20.20.2, MySQL8.0.46 và Redis7.4.11 thật trên stack test riêng. Gồm 21 ca của mốc seed/guard; không dùng kết quả452 của mốc trước thay cho bản sửa.
- Trên **chính DB demo**, kiểm35 yêu cầu HTTP: checkout201; PENDING/FAILED không đổi quyền409; chữ ký sai401; số tiền sai409; SUCCESS đến muộn và callback lặp200; sai mã401; đổi mã200 rồi lặp409; bundle VI/EN và bốn audio200.
- Thiếu/sai token, JWT nội bộ dùng thay token khách, phiên chưa PAID/thu hồi/hết hạn: bundle/audio401. Token khách vào admin401. Ngôn ngữ không hỗ trợ400. CORS trả đúng origin frontend localhost5173 khi gọi có Bearer.
- Đối chiếu byte/hash tệp HTTP với tệp trên media volume, nội dung văn bản với dữ liệu DRAFT-03 trong repo. Trạng thái phiên thử được khôi phục sau các ca từ chối; không thay đổi POI/tour để tạo lỗi.

Health trong container không thay cho thử cổng host: đã kiểm localhost18080 trả200 sau khi backend có bridge truy cập host; MySQL/Redis không mở cổng host. Giữ nguyên container/volume/dữ liệu cũ. Không đọc/in `.env` hoặc mật khẩu thật; cấu hình demo mới sinh được gitignore/dockerignore, không đóng gói vào repo/image.

## Frontend cần nối tiếp

Nối lần lượt checkout MockGateway → lưu thông tin yêu cầu → nhận token sau callback → bundle VI/EN → chọn POI/đọc văn bản → fetch audio có Bearer rồi Blob URL để phát sau thao tác người dùng. Chưa có giao diện thanh toán/khách mới trong mốc này; thành công mock hiện do công cụ operator backend mô phỏng, không giao secret/chữ ký cho frontend.

Giữ nhãn âm thử MOCK và cảnh báo tọa độ. Không gọi API admin POI cho khách hoặc truyền token qua query string. Kiểm UI đổi ngôn ngữ, chặn phản hồi cũ, hết hạn và quyền truy cập; thử trình duyệt/thiết bị thực sau khi nối. Chưa nghiệm thu giọng đọc thật, GPS, đường đi hoặc toàn bộ sản phẩm.

Không sửa Word/frontend. HEAD nền khi bắt đầu kiểm chứng là cc691ce; CI xanh của nền không thay kết quả CI của commit DRAFT-03. Chi tiết bằng chứng local được người nghiệm thu lưu ngoài repo; kết quả local không đồng nghĩa deploy staging hoặc CI đã đạt.
