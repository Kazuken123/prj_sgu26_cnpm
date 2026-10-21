# UC-14 — Mốc A: danh sách, chi tiết và tạo tour mẫu

Ngày:21/10/2026. Nền909a75c. Mốc này chưa commit/push; không thay cho trạng thái CI của commit nền.

**Lưu ý phiên bản:** Đây là hồ sơ kiểm chứng lịch sử mốc A. Mốc B/C đã bổ sung PUT/revision và sửa quy tắc lưu thứ tự theo đúng Word4.4.4; xem [hợp đồng hiện tại](BACKEND_TOURS_UPDATE_BUNDLE_UC14_BC.md). Các số19/475 bên dưới là kết quả bản A trước thay đổi B/C, không phải kết quả hồi quy bản hiện tại.

## Phạm vi và nguồn

Đọc lại trực tiếp **CNPM_BAOCAO (8).docx — Thảo Cầm Viên**: UC-14.1 và các luồng lỗi/điều kiện; US-F02 AC2/phần ghi audit AC3; phần tour của US-E01 AC1 và US-C01 AC1; QT-01/06/10/12; NFR-06/08/13/14/18; giả định1.6.2; kiến trúc4.2/4.3 và schema4.4.4.

Mốc A chỉ xem/tạo tour. **Chưa có API cập nhật**, nên UC-14/US-F02 AC2 mới đáp ứng một phần. Không làm xóa/duyệt/trạng thái tour, API đọc audit, thống kê, RAG, frontend hoặc chỉ đường. Không thêm schema/migration/dependency. Không sửa tour/POI/audio của DB demo đã duyệt.

## API cho người phụ trách frontend

Các API dưới `/api/admin/tours` đều dùng `Authorization: Bearer <accessToken nội bộ>` của STAFF/ADMIN hiện hành, trả `Cache-Control: no-store`. Token khách không dùng được.

**GET /api/admin/tours?page=1&limit=20**

Trả200 `{ "data": { "items": [...], "total": 1, "page": 1, "limit": 20 } }`. Sắp tour theo ID mới nhất trước; mỗi tour có đầy đủ các điểm được sắp theo sequenceNo. Phân trang theo quy ước kỹ thuật của API POI: page mặc định1,limit20,tối đa100;page tối đa100000. Không nhận bộ lọc status hoặc tự thêm trạng thái tour.

**GET /api/admin/tours/:id**

Trả200 `{ "data": { "tourId": 1, "name": "...", "description": null, "createdAt": "...", "updatedAt": "...", "items": [...] } }`. Mỗi item quản trị gồm `poiId`, `sequenceNo`, `name`, `status` của POI. Giữ điểm inactive trong thông tin quản trị để nhân viên nhận biết; bundle khách tự lọc theo quy tắc sẵn có. Không tìm thấy trả404 TOUR_NOT_FOUND.

**POST /api/admin/tours**

```json
{
  "name": "Lộ trình demo do nhóm đề xuất",
  "description": "Mô tả dùng chung, không khẳng định tuyến đi bộ đã kiểm chứng.",
  "items": [
    { "poiId": 1, "sequenceNo": 1 },
    { "poiId": 2, "sequenceNo": 2 }
  ]
}
```

ID trên chỉ minh họa; phải chọn POI ACTIVE từ môi trường đang làm. Không dùng endpoint này để tạo bản sao tour seed trên database demo chính khi chưa chốt dữ liệu.

Tên bắt buộc,trim và tối đa255 ký tự theo quy ước validation hiện có; mô tả có thể bỏ qua/null/rỗng→null, không vượt dung lượng TEXT. Body tiếp tục chịu giới hạn JSON32KB sẵn có của server. `items` phải có điểm; poiId/sequenceNo là JSON number nguyên dương trong miền INT, không trùng POI hoặc thứ tự. **Đính chính từ mốc B:** sắp theo sequenceNo đầu vào rồi chuẩn hóa thành1..N khi lưu, ví dụ10,20→1,2. Word4.4.4 có yêu cầu này; nhận định ban đầu rằng chỉ cần dương/duy nhất là thiếu. Người dùng đã duyệt cách chuẩn hóa; không đổi schema hoặc sửa dữ liệu cũ. Không tự nhận userId,token,status hay trường ngoài contract.

Trả201 `{ "data": <tour DTO như GET chi tiết> }` sau khi transaction commit. Backend lấy người tạo từ phiên xác thực và ghi audit CREATE_TOUR(resourceType TOURS,resourceId tourId), không tin actor tự khai trong body. Tên tour không có ràng buộc UNIQUE trong Word/schema; hai thao tác tạo riêng không được tự gộp chỉ vì trùng tên.

**Lỗi:**400 VALIDATION_ERROR cho cấu trúc/ID/phân trang sai;401/403 theo xác thực/phân quyền hiện có;404 TOUR_NOT_FOUND;409 TOUR_POIS_UNAVAILABLE nếu có điểm thiếu/inactive khi lưu;503 TOURS_UNAVAILABLE khi đọc thất bại;503 TOUR_SAVE_UNAVAILABLE khi chưa xác nhận được kết quả lưu. Không trả SQL/stack hoặc token.

**Mất phản hồi/503 khi lưu:** tải lại danh sách/chi tiết để đối soát trước khi gửi lại. Không tự retry POST và không tự thêm tour thay thế. Nếu SQL đã commit nhưng phản hồi commit thất lạc, tour và audit có thể đã tồn tại. Mốc này không có idempotency key cho tour; không tái sử dụng cơ chế khóa của PAYMENTS hoặc tự thêm schema.

Ở bản A chưa có PUT/PATCH/DELETE. **Từ mốc B có PUT với expectedRevision**; PATCH/DELETE vẫn không triển khai. DTO quản trị hiện có thêm revision, xem hợp đồng B/C.

## Kiến trúc và nhất quán

TourRouter → TourService → TourStore. Router không SQL/Redis; Service kiểm dữ liệu/quyền/POI và chuyển lỗi an toàn; Store quản lý DB/transaction. Tái sử dụng auth middleware, internal-access, AuthStore.transaction và AuditLogStore.

Store khóa người thực hiện, rồi POI theo ID tăng dần; Service kiểm lại quyền hiện tại và tất cả POI ACTIVE trong transaction. Lưu TOURS,TOUR_POIS và audit cùng transaction. Lỗi một bước rollback toàn bộ. Không giữ transaction để gọi dịch vụ ngoài; mốc này không cần provider.

Danh sách/chi tiết đọc trong snapshot REPEATABLE READ để tránh ghép dữ liệu nhiều thời điểm. Phần bundle không bị thay đổi: đọc tour hiện có ở lần tải mới, giữ thứ tự, bỏ POI inactive và tour không còn điểm hợp lệ. Không polling lại nội dung đã tải, không thêm ngôn ngữ tour; tên/mô tả tour vẫn dùng chung.

## Kiểm chứng và đối chiếu

Đã có19 test mới (7 unit/validation/policy và12 ca MySQL/HTTP trong một suite), đạt19/19,fail/cancel/skip0 ở lượt chạy tập trung. Init chỉ trên DB fixture ngẫu nhiên mới `tcv_tour_test_<uuid>`, không init DB demo hoặc DB cũ; trigger bơm lỗi chỉ ở DB fixture, được dọn trong finally. DB fixture giữ lại để đối soát. Kiểm auth dùng JWT và persistence thật; không bypass middleware.

| AC / QT / NFR | Mức đáp ứng của mốc A | Test / bằng chứng | Giới hạn |
| --- | --- | --- | --- |
| UC-14.1; US-F02 AC2 | Tạo/xem tour, thứ tự đúng | tour.integration:STAFF creates…,listing…; tour.test:validation | Chưa UC-14.2/cập nhật |
| US-F02 AC3; QT-12 | Ghi CREATE_TOUR đúng actor/cùng transaction | STAFF creates…; MySQL failure in AUDIT_LOGS… | Chưa API ADMIN đọc/lọc audit |
| QT-01; NFR-06 | Nội bộ hợp lệ mới xem/tạo; recheck actor trước lưu | HTTP rejects missing…; current actor…; service refuses… | Chưa kiểm UI nội bộ |
| UC-14 E2; NFR-08 | Chặn body/ID/thứ tự/POI sai; SQL tham số; lỗi an toàn | malformed…; validation…; storage errors… | Không thay kiểm tra quyền bằng ẩn nút |
| UC-14 E3; NFR-18 | Rollback cả3 thành phần; đọc lại sau commit mất phản hồi | MySQL failure in TOURS/TOUR_POIS/AUDIT_LOGS; lost commit acknowledgment… | Không tự retry POST hoặc có idempotency tour |
| UC-14 bước6;QT-12 | POI đổi trạng thái lúc chờ lưu bị từ chối; tạo đồng thời không trộn thứ tự | POI deactivation…; concurrent creates… | Hai người sửa cùng tour chưa thuộc mốcA |
| US-E01 AC1; US-C01 AC1; QT-06/10 | Tour tạo xuất hiện đúng trong bundle; lọc điểm inactive/tour rỗng | existing authenticated bundle… | Chỉ kiểm phần backend, không client tùy chỉnh/bản đồ |
| US-16;NFR-13 | Đúng Router–Service–Store, không đổi schema | lint và review import | Không tạo adapter vì không có dịch vụ ngoài trong mốc |
| US-17;NFR-14 | Toàn bộ475/475 test và lint126 file đạt trên bản cuối | all-tests-final.log ngoài repo | CI nền909a75c không kiểm chứng code chưa commit |

**Kết quả cuối:** lint126 file JS đạt; toàn bộ **475/475 test**,24 suite,fail/cancel/skip/todo0,471.79830976 giây; Node20,MySQL8 và Redis thật, RUN_DB_TESTS=1/RUN_REDIS_TESTS=1, concurrency1 và coverage. Đây là toàn bộ backend trên bản cuối, tăng19 test so với nền456. Frontend không thay đổi và không chạy lại riêng64 test frontend của nền909a75c. Không có CI GitHub cho thay đổi chưa commit; chưa báo cả UC-14 hoàn tất vì thiếu cập nhật tour.

Bằng chứng ngoài repo: `C:\Users\Admin\Documents\Codex\TCV_UC14_STAGE_A_20261021\evidence\tour-targeted.log`, `all-tests-final.log`, `source-hashes.json`. Bảy file code/test trong repo khớp SHA-256 với bản sao kiểm thử ngoài OneDrive; thay đổi tài liệu sau test không đổi code. Chưa build/deploy mốcA vào demo đang dùng của frontend; HTTP trong suite chạy server riêng với DB fixture thực, không phải mock SQL.

## Phối hợp và bước tiếp theo

Đức Anh giữ UC-08/15; bạn frontend giữ UI/UX. Mốc này chỉ nối router mới vào server.js và thêm các file tour riêng. Không thay payment/token/worker/media/seed, Word hoặc frontend. Chưa nạp tour mới vào demo đang dùng.

Khi mốcA kiểm chứng xong, báo người dùng; chỉ commit/push nếu được yêu cầu và chờ CI đúng commit xanh trước mốcB. MốcB phải chốt chính sách cập nhật đồng thời nếu Word chưa rõ, không tự thêm version/status/schema.

Nguồn và giới hạn: Word8 đọc lại trực tiếp ngày21/10/2026; code nền909a75c; code/test mới của mốcA. Các kiểm thử MySQL/HTTP là dữ liệu thử riêng, không phải nghiệm thu tuyến đi thực địa hoặc giao diện người dùng.
