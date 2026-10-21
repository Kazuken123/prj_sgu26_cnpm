# UC-14 — Cập nhật tour và kiểm chứng bundle, mốc B/C

Ngày21/10/2026, nền909a75c. Chưa commit/push. Người dùng cho phép làm tiếp B/C chưa qua CI giữa mốc trong lần này; CI xanh của nền909a75c không chứng minh thay đổi chưa commit.

## Nguồn, quyết định và phạm vi

Đã đọc lại trực tiếp CNPM_BAOCAO (8).docx — Thảo Cầm Viên: US-F02 AC2 và phần ghi audit AC3; phần tour US-E01 AC1, US-C01 AC1; QT-01/06/10/12; NFR-06/08/13/14/18; UC-14 luồng chính, ngoại lệ, điều kiện trước/sau; mục1.6.2, kiến trúc4.2/4.3, bảng/ràng buộc4.4.4. Bản đọc ngoài repo: `WORD8_REREAD_UC14_B_20261021.txt` trong Documents/Codex.

B làm cập nhật toàn bộ nội dung/thứ tự tour; C kiểm chứng tour qua API bundle khách hiện có. Không thêm API xóa, duyệt, trạng thái tour, quản trị ngôn ngữ tour, đọc audit, thống kê hoặc chỉ đường. Không sửa schema/migration, Word, frontend, seed, dữ liệu demo, payment/token/worker/media hoặc UC-08/15 của người khác.

Hai quyết định đã được người dùng chốt: dùng revision từ nội dung để chặn ghi đè đồng thời, không thêm cột; sắp sequenceNo đầu vào rồi lưu liên tiếp1..N. Quy tắc sau là đính chính lỗi diễn giải ở mốc A: Word4.4.4 yêu cầu rõ thứ tự lưu liên tiếp từ1. Không chuyển đổi hàng loạt tour cũ; khi tạo/cập nhật bằng API mới sẽ chuẩn hóa danh sách đang lưu. Bundle lọc POI inactive có thể giữ khoảng trống, đúng Word.

## Hợp đồng API cho frontend

STAFF/ADMIN dùng access token nội bộ hiện hành. Không dùng token khách cho `/api/admin/tours`. Tất cả phản hồi router này có Cache-Control:no-store. GET danh sách/chi tiết và POST tạo theo hồ sơ A, nay mỗi tour DTO quản trị có thêm `revision` gồm64 ký tự hex thường. POST không nhận expectedRevision; quyền không được quyết định bằng revision.

**PUT /api/admin/tours/:id** thay toàn bộ nội dung có thể chỉnh sửa, trả200 `{ "data": <tour DTO> }`. Ví dụ body:

```json
{
  "name": "Lộ trình demo do nhóm đề xuất",
  "description": "Mô tả dùng chung cho VI/EN",
  "expectedRevision": "<revision lấy từ GET chi tiết, đúng 64 ký tự hex>",
  "items": [
    { "poiId": 2, "sequenceNo": 20 },
    { "poiId": 1, "sequenceNo": 10 }
  ]
}
```

ID chỉ minh họa. Ví dụ trên lưu poiId1 trước,poiId2 sau với sequenceNo1,2. Không gửi lại toàn bộ DTO GET vì tourId/revision/createdAt/updatedAt và metadata POI là trường chỉ đọc; body lạ bị400. Mô tả bỏ qua/null/rỗng thànhnull; đây là PUT thay toàn bộ, không phải cập nhật từng trường. Tên bắt buộc, danh sách có ít nhất một điểm; POI/thứ tự nguyên dương và không trùng; chỉ chọn POI đang ACTIVE tại thời điểm lưu. Giới hạn tên/mô tả/JSON và phân trang giữ như mốc A.

Giữ tourId và createdAt. Trả revision của nội dung đã lưu. Revision là SHA-256 từ ID,tên,mô tả và cặp POI–thứ tự đã sắp; không gồm metadata POI hoặc timestamp. Đây là dấu vân tay nội dung, không phải bộ đếm phiên bản, token quyền hay bằng chứng lịch sử. Nếu nội dung trở về đúng trạng thái cũ thì hash có thể giống lại; không tuyên bố phát hiện mọi lần thay đổi lịch sử. Không thêm schema.

Lỗi400 VALIDATION_ERROR: sai cấu trúc hoặc thiếu/sai expectedRevision;401/403: xác thực/quyền;404 TOUR_NOT_FOUND;409 TOUR_REVISION_CONFLICT: nội dung hiện tại khác bản đã tải;409 TOUR_POIS_UNAVAILABLE: POI thiếu/inactive. Đọc lỗi trả503 TOURS_UNAVAILABLE; lưu lỗi/chưa rõ commit trả503 TOUR_SAVE_UNAVAILABLE với thông điệp an toàn, không SQL/stack/secret.

Khi409: GET lại tour, đối chiếu với phần đang sửa rồi người dùng quyết định; không tự lấy revision mới và lưu đè. Khi503/mất phản hồi: GET lại để đối soát trước khi gửi lại. Nếu commit đã thành công, nội dung/audit có thể đã được lưu. Gửi lại nội dung đã thay đổi với revision cũ bị409. Không bảo đảm exactly-once cho PUT không đổi nội dung; không tự retry POST hoặc thêm idempotency schema ngoài phạm vi.

PATCH/DELETE không triển khai. Tên/mô tả tour dùng chung, không gắn nhãn đã dịch. Khách nhận tour qua bundle có xác thực hiện có, không qua API quản trị; revision nội bộ không xuất vào bundle.

## Kiến trúc và giao dịch

TourRouter→TourService→TourStore. Router chỉ xác thực, phân quyền và chuyển request; Service kiểm dữ liệu/quy tắc, revision, quyền hiện tại và lỗi an toàn; Store giữ SQL/transaction. Tái sử dụng AuthStore.transaction, UserStore, AuditLogStore. Không có dịch vụ ngoài cần thêm adapter ở mốc này.

Khi cập nhật, khóa actor, tour, liên kết và các POI được chọn theo ID. Dùng locking read cho tour/liên kết để người sửa đang chờ thấy nội dung đã commit mới nhất, không so revision trên snapshot cũ. So revision và recheck quyền/POI trong transaction. Thay TOURS, toàn bộ TOUR_POIS và ghi UPDATE_TOUR trong cùng transaction; đổi chỗ điểm không vướng UNIQUE tạm thời vì thay cả tập. Một bước lỗi thì rollback cả nội dung, thứ tự và audit. Không giữ transaction để gọi provider.

GET quản trị đọc snapshot nhất quán. Bundle tiếp tục dùng snapshot sẵn có: một lần tải nhận tour cũ hoàn chỉnh hoặc tour mới hoàn chỉnh, không ghép tên cũ với thứ tự mới. POI inactive bị lọc; tour không còn điểm hợp lệ bị bỏ. Bundle đã tải không tự đổi sau PUT; khách cần tải bundle mới theo luồng hiện có. Chưa có giao diện cập nhật tour, kiểm trình duyệt, GPS hoặc nghiệm thu tuyến đi bộ trong mốc này.

## Đối chiếu yêu cầu và kiểm chứng

| AC / QT / NFR | Đã đáp ứng chưa | Test chứng minh | Ghi chú |
| --- | --- | --- | --- |
| UC-14.1/.2; US-F02 AC2 phần tour | Backend tạo/xem/cập nhật đã kiểm riêng | STAFF creates…; PUT keeps tour_id…; PUT rejects… | Chưa UI quản trị |
| Word4.4.4, TOUR_POIS | Lưu1..N, chống trùng; cập nhật nguyên tập | create normalizes sparse…; update requires…; PUT keeps… | Sửa diễn giải sai ở A; không sửa dữ liệu cũ hàng loạt |
| UC-14 ngoại lệ; quyết định revision | Chặn ghi đè bản đang khác;409 | two real editors…; PUT rejects… | Hash nội dung, không bộ đếm lịch sử |
| QT-01/12; NFR-06 | Xác thực nội bộ, kiểm quyền hiện tại trước ghi | HTTP rejects…; UPDATE checks current actor… | Token khách không dùng API nội bộ |
| US-F02 AC3 phần ghi audit; QT-12 | CREATE_TOUR/UPDATE_TOUR cùng giao dịch | PUT keeps…; UPDATE rollback…AUDIT_LOGS | Chưa API ADMIN đọc/lọc audit |
| UC-14 lỗi lưu; NFR-18 | Rollback và đối soát khi phản hồi commit mất | UPDATE rollback…TOURS/TOUR_POIS/AUDIT_LOGS; lost commit acknowledgment… | Không tự retry khi kết quả chưa rõ |
| QT-06/10; US-E01 AC1; US-C01 AC1 phần tour | Tour VI/EN, thứ tự, lọc inactive/rỗng và snapshot đã kiểm | updated tour reaches VI/EN…; a bundle snapshot concurrent… | Tên/mô tả chung; không custom tour client/GPS |
| QT-01; quyền bundle hiện có | Không bỏ qua quyền khách khi nối tour | tour changes do not bypass guest rights… | Thiếu/sai token, nội bộ, hết hạn/thu hồi/chưa trả tiền bị từ chối |
| NFR-08 | Validation, SQL tham số, thông báo lỗi an toàn | malformed…; storage errors…; update maps… | Không tuyên bố kiểm thử xâm nhập toàn hệ thống |
| NFR-13 | Ba lớp, không đổi schema/dependency | Kiểm import và lint bản cuối | Không mở rộng phần của đồng đội |
| NFR-14 | Local lint và toàn bộ492/492 test đạt, có coverage | evidence/tour-bc-targeted.log và all-tests-final.log ngoài repo | Chưa CI đúng commit cho code mới; không tuyên bố hoàn tất yêu cầu CI |

36 test tour gồm11 unit và25 ca MySQL/HTTP trong1 suite, đã đạt trên Node20/MySQL8/Redis thật. B/C thêm17 test so với A19; có kiểm cả create sau sửa chuẩn hóa. HTTP chạy server thật và database fixture UUID riêng; không bypass middleware, không mock SQL. Ca lỗi commit và trigger chỉ tác động fixture thử riêng, không đụng schema/dữ liệu demo. Các lỗi driver/provider giả lập để kiểm nhánh lỗi phải được phân biệt với việc DB thật đang chạy.

**Kết quả cuối:** toàn bộ492/492 test backend,24 suite,fail/cancel/skip/todo0,333.891541535 giây; lint127 JavaScript file đạt. Node20.20.2,MySQL8.0.46,Redis7.4.11 thật; RUN_DB_TESTS=1/RUN_REDIS_TESTS=1, concurrency1, có coverage. Tăng36 test so với nền456, tăng17 so với mốcA475. Coverage tổng do runner báo (gồm test) là line99.23%,branch94.84%,function95.34%; đây không phải coverage riêng code nghiệp vụ hoặc chỉ tiêu chất lượng toàn sản phẩm.

Tám file code/test khớp SHA-256 với bản sao chạy thử ngoài OneDrive; xem evidence/source-hashes.json. Bằng chứng gốc nằm tại `C:\Users\Admin\Documents\Codex\TCV_UC14_BC_20261021\evidence`. Chỉ chỉnh tài liệu sau lần test cuối, không đổi code. Hai container test một lần đã được dọn sau khi xác nhận exit0, SQL/Redis thử riêng đã dừng,18 volume giữ nguyên; demo và backup không bị xóa.

Frontend không đổi, không chạy lại64 test frontend của nền. Demo đang chạy tại127.0.0.1:18080 vẫn là ảnh nền trước tour, chưa được build/deploy A/B/C. Không coi kiểm HTTP trong fixture là đã nghiệm thu UI.

## File thay đổi và bàn giao

Server nối router mới; TourRouter,TourService,TourStore,tour.validation,tour-revision và hai file test tour. Hồ sơ A được đính chính; tài liệu này là contract B/C. Không chạm sáu file bàn giao cũ chưa tracked của phiên trước.

Trước khi đưa lên GitHub cần người dùng cho phép commit/push; sau đó kiểm CI đúng commit. Trước khi frontend dùng API mới cần chốt triển khai môi trường demo; không tự nhập thêm tour/đổi tour đã duyệt bằng dữ liệu thử. Phần UI/UX thuộc người phụ trách frontend, UC-08/15 thuộc Đức Anh.

Nguồn và độ tin cậy: Word8 đọc lại21/10/2026, code nền909a75c và thay đổi A/B/C chưa commit;36/36 test tập trung và492/492 hồi quy thật trên môi trường thử riêng. Chưa CI cho thay đổi mới, chưa nghiệm thu frontend/GPS/tuyến đi thực địa hoặc dữ liệu thuyết minh mới.
