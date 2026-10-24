# Bàn giao vị trí demo V1

10 POI giữ nguyên danh tính và nội dung. `positions-v1.json` có 3 vị trí tham khảo từ bản ghi OSM lưu trong tài liệu bàn giao và 7 vị trí mô phỏng theo sơ đồ chính thức, được chủ dự án chấp nhận ngày24/10/2026. Không coi là tọa độ khảo sát, lối vào, đường đi hoặc đúng vị trí từng cây/cá thể. Nguồn OSM chưa tái xác minh tại lần nhập; ngày trong evidence là ngày bên bàn giao báo đã đọc nguồn, không phải một lần kiểm tra mới.

Nguồn sơ đồ: https://saigonzoo.vn/p/ban-do-duong-di-hp13.html. Ghi nguồn OSM theo từng điểm/ODbL trong manifest. Không đưa ảnh sơ đồ24MB vào gói ứng dụng. Giữ attribution bản đồ OSM/OSM France trên giao diện.

Từ root bản sao ngoài OneDrive, cấu hình database riêng đã duyệt `tcv_demo_review_20261020` bằng cơ chế env hiện có, không in bí mật:

`node backend/scripts/demo-locations.js --database tcv_demo_review_20261020 --plan`

Đối chiếu PLAN rồi dùng planHash vừa trả:

`node backend/scripts/demo-locations.js --database tcv_demo_review_20261020 --apply --expected <planHash>`

Chỉ cập nhật tọa độ từ bộ cũ đúng danh tính/phiên bản/trạng thái hoặc trả UNCHANGED nếu đã đúngV1. Có rowlock/transaction/audit; dữ liệu lệch dừng đối soát. Không đổi source_version, text/audio/job/tour/token/payment. Không chạy init_db.sql hoặc sửa migration. Nhập15ngônngữ trước rồi mới cập nhật tọađộ. Operator15ngônngữ chấp nhận chính xác bộ tọađộ gốc hoặcV1 khi kiểm tra và vẫn giữ guard chống drift.

Trên database UUID thử đã đạt PLAN→UPDATED→UNCHANGED, giữ nguyên văn bản/audio/job/quyền; test đồng thời chỉ cập nhật một lần và rollback nếu audit lỗi. Đây chưa phải xác nhận dữ liệu Aiven đã cập nhật.
