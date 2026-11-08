# Bàn giao vị trí demo V1

10 POI giữ nguyên danh tính và nội dung. `positions-v1.json` có 3 vị trí tham khảo từ bản ghi OSM lưu trong tài liệu bàn giao và 7 vị trí mô phỏng theo sơ đồ chính thức, được chủ dự án chấp nhận ngày24/10/2026. Không coi là tọa độ khảo sát, lối vào, đường đi hoặc đúng vị trí từng cây/cá thể. Nguồn OSM chưa tái xác minh tại lần nhập; ngày trong evidence là ngày bên bàn giao báo đã đọc nguồn, không phải một lần kiểm tra mới.

Nguồn sơ đồ: https://saigonzoo.vn/p/ban-do-duong-di-hp13.html. Ghi nguồn OSM theo từng điểm/ODbL trong manifest. Không đưa ảnh sơ đồ24MB vào gói ứng dụng. Giữ attribution bản đồ OSM/OSM France trên giao diện.

Từ root bản sao ngoài OneDrive, cấu hình database riêng đã duyệt `tcv_demo_review_20261020` bằng cơ chế env hiện có, không in bí mật:

`node backend/scripts/demo-locations.js --database tcv_demo_review_20261020 --plan`

Đối chiếu PLAN rồi dùng planHash vừa trả:

`node backend/scripts/demo-locations.js --database tcv_demo_review_20261020 --apply --expected <planHash>`

Chỉ cập nhật tọa độ từ bộ cũ đúng danh tính/phiên bản/trạng thái hoặc trả UNCHANGED nếu đã đúngV1. Có rowlock/transaction/audit; dữ liệu lệch dừng đối soát. Không đổi source_version, text/audio/job/tour/token/payment. Không chạy init_db.sql hoặc sửa migration. Nhập15ngônngữ trước rồi mới cập nhật tọađộ. Operator15ngônngữ chấp nhận chính xác bộ tọađộ gốc hoặcV1 khi kiểm tra và vẫn giữ guard chống drift.

Trên database UUID thử đã đạt PLAN→UPDATED→UNCHANGED, giữ nguyên văn bản/audio/job/quyền; test đồng thời chỉ cập nhật một lần và rollback nếu audit lỗi. Đây chưa phải xác nhận dữ liệu Aiven đã cập nhật.

## Bộ 18 POI V2 — vị trí demo để đối chiếu

`positions-v2.json` giữ nguyên toàn bộ 10 bản ghi V1. Hai vị trí mới được đối chiếu với trang Mapcarta dẫn dữ liệu OSM: vườn hồng hạc (POI 14, way 1275969816) và đền thờ Vua Hùng (POI 17, way 263505858). Đây là tọa độ tham khảo của khu vực/công trình, không phải lối vào hoặc vị trí khách đứng; chưa tái xác minh API OSM hay khảo sát GPS.

Năm điểm 11, 12, 13, 15 và 16 dùng `SCHEMATIC_SIMULATION`, được chủ dự án chấp nhận cho demo ngày 08/11/2026. Đây là ước lượng khu vực theo ảnh minh họa của sơ đồ phối cảnh, không phải phép chiếu địa lý hoặc GPS khảo sát: hổ Bengal (10.7858, 106.7080), gấu ngựa (10.7862, 106.7077), báo hoa mai (10.7885, 106.7058), cá sấu hoa cà (10.7865, 106.7081), vượn má vàng (10.7863, 106.7079).

Hồ sơ giữ SHA-256 ảnh sơ đồ `91349b51c63391490ce20898bc35f96f310086daf276c8f2644eb79323219e37`, kích thước gốc 17000×10744, bản xem 2125×1343 và tâm minh họa được chọn theo từng điểm. Không coi số thập phân tọa độ là bằng chứng độ chính xác theo mét, lối vào, vị trí khách đứng hoặc nghiệm thu GPS.

Chỉ điểm 18 còn mang `SEED_APPROXIMATION`. Tọa độ trong manifest là bản lưu của seed, không phải tọa độ đã xác minh. Operator V2 giữ nguyên tọa độ hiện có của điểm này, kể cả khi quản trị viên đã cập nhật nó. POI 18 chưa xác định được cá thể cây; danh sách cây di sản chính thức được đối chiếu không nêu cây đa này. Không gán vị trí cây Sọ khỉ lớn trên sơ đồ cho cây đa.

Operator V1 phía trên chỉ dùng cho bộ 10 điểm. Với database 18 điểm, dùng operator riêng:

```text
node backend/scripts/poi-locations.js --database tcv_demo_review_20261020 --plan
node backend/scripts/poi-locations.js --database tcv_demo_review_20261020 --apply --expected <planHash>
```

Các lệnh này cần cấu hình staging/TLS hợp lệ. `--plan` kết nối database và chỉ đọc snapshot của tám POI mới 11–18 trong transaction read-only. `--apply` chỉ chạy khi `SEED_TARGET_CONFIRM` khớp tên database và `planHash` khớp snapshot đã đối chiếu. Chỉ bảy POI mới 11–17 có hồ sơ vị trí demo được phép cập nhật tọa độ; trạng thái ACTIVE/INACTIVE được giữ nguyên. Mười POI gốc 1–10 không được đọc hoặc khóa trong snapshot của operator này và tuyệt đối không bị cập nhật, kể cả khi tọa độ hiện có khác V1, và giữ nguyên cách ghi chú vị trí cũ. Không đổi content_version, avatar, văn bản, audio, job, tour, token hay payment. Plan trả `points: 8`, `reviewedTargets: 7` và `pendingCoordinatePoiIds: [18]` để không nhầm cây chưa xác minh với điểm đã sửa.

Kiểm tra phát lại seed bổ sung chấp nhận đúng bảy cặp tọa độ V2 đã đối chiếu của POI 11–17 và quy đổi chúng về tọa độ seed gốc khi so sánh; tọa độ lệch, trạng thái hoặc nội dung khác vẫn dừng đối soát. SQL nguồn, source hash và manifest/audio đóng gói giữ nguyên.

Sau khi áp dụng, tạo plan mới để kiểm tra `UNCHANGED`; hash của plan trước cập nhật không được dùng cho lần áp dụng khác. Kiểm thử local dùng Store giả lập và nguồn đã đóng gói, chưa có lệnh plan/apply hoặc kết nối Aiven/Render được thực hiện trong lần chuẩn bị V2.
