# UC-17 — ADMIN xem và lọc nhật ký thao tác

Ngày21/10/2026. Nền6e4e21b đã push và CI8/8 xanh; thay đổi UC-17 hiện chưa commit/push, không dùng kết quả CI nền làm bằng chứng cho mốc mới.

## Phạm vi đã đối chiếu trước code

Đọc lại trực tiếp CNPM_BAOCAO (8).docx — Thảo Cầm Viên: US-F02 phần xem/lọc audit AC3, US-F01 AC4; QT-01/12; NFR-06/08/13/14/18; UC-17 gồm luồng chính, A1–A3, E1–E3, điều kiện trước/sau; mục1.6.2; kiến trúc4.2/4.3 và bảng AUDIT_LOGS mục4.4.4. Bản trích đọc mới ngoài repo tại `TCV_TOUR_DEMO_DEPLOY_20261021/WORD8_REREAD_UC17_20261021.txt` trong Documents/Codex.

Người dùng chốt bộ lọc action theo danh sách hành động code hiện hỗ trợ. Action ngoài danh sách trả400; action hợp lệ nhưng không có log trả200 với danh sách rỗng. Khi UC-08/15 hoặc mốc khác có hành động mới, cần cập nhật danh sách và phép chiếu chi tiết lúc tích hợp, không tự sửa code của đồng đội.

Chỉ bổ sung đọc/lọc cho ADMIN. Không sửa cách các luồng hiện tại ghi log; không sửa schema/migration, Word, frontend, seed hay dữ liệu demo. Không thêm POST/PUT/PATCH/DELETE, xuất tệp, xóa log, quản lý tài khoản hay thống kê. AC về giao diện/reset trang/hiển thị text vẫn cần người phụ trách frontend triển khai và kiểm chứng.

## API cho frontend

`GET /api/admin/audit-logs` với `Authorization: Bearer <accessToken nội bộ ADMIN>`. Phản hồi Cache-Control:no-store. STAFF bị403; token khách, token thiếu/sai/hết hạn/phiên đã logout bị401. Kiểm quyền/tình trạng tài khoản hiện hành qua middleware auth sẵn có; tài khoản khóa theo cơ chế chung, không chỉ tin role được ký trong JWT. Service còn kiểm ADMIN/ACTIVE trước truy vấn.

Query được hỗ trợ:

| Tên | Quy ước |
| --- | --- |
| from | Không bắt buộc; UTC đúng dạng YYYY-MM-DDTHH:mm:ssZ, bao gồm mốc bắt đầu |
| to | Không bắt buộc; cùng định dạng, bao gồm mốc kết thúc; from không lớn hơn to |
| action | Không bắt buộc; một tên trong actions do response trả về |
| page | Mặc định1, số nguyên dương tối đa100000 |
| limit | Mặc định20, số nguyên dương tối đa100 |

Ví dụ: `/api/admin/audit-logs?from=2026-10-21T00:00:00Z&to=2026-10-21T23:59:59Z&action=UPDATE_TOUR&page=1&limit=20`. Giao diện đổi giờ địa phương sang UTC trước khi gửi; không gửi ngày trần, offset+07:00 hoặc mili giây vào contract này. Độ chính xác bộ lọc là giây, phù hợp created_at DATETIME hiện có. Có thể chỉ lọc một đầu thời gian hoặc chỉ action; không chọn gì thì đọc trang mới nhất. Query lạ, mảng/lặp tham số, ngày không tồn tại, khoảng đảo hoặc action ngoài danh sách trả400 VALIDATION_ERROR.

Trả200:

```json
{
  "data": {
    "items": [
      {
        "logId": "9007199254740993",
        "userId": null,
        "actorName": null,
        "action": "UPDATE_TOUR",
        "resourceType": "TOURS",
        "resourceId": "12",
        "createdAt": "2026-10-21T10:00:00.000Z",
        "details": { "items": [{ "poiId": 2, "sequenceNo": 1 }] },
        "detailsOmitted": false
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "filters": { "from": null, "to": null, "action": "UPDATE_TOUR" },
    "actions": ["CREATE_STAFF", "CREATE_POI", "UPDATE_POI", "DEACTIVATE_POI", "CREATE_TOUR", "UPDATE_TOUR", "CREATE_PENDING_PAYMENT", "CONFIRM_CASH_PAYMENT", "ISSUE_CASH_CODE", "PREPARE_ONLINE_CHECKOUT", "ONLINE_CHECKOUT_READY", "CONFIRM_ONLINE_PAYMENT", "FAIL_ONLINE_PAYMENT", "ISSUE_VISITOR_TOKEN", "RETRY_CONTENT_JOB", "CLAIM_CONTENT_JOB", "FAIL_CONTENT_JOB", "RECOVER_CONTENT_JOB", "PREPARE_TRANSLATION", "COMPLETE_CONTENT_JOB", "SEED_APPROVED_DEMO"]
  }
}
```

Số liệu/ID trên chỉ minh họa, không phải dữ liệu demo. logId luôn là chuỗi thập phân vì MySQL BIGINT có thể vượt miền số nguyên an toàn JavaScript; không ép Number để so sánh/hiển thị. userId/actorName có thể NULL. Thời gian trả ISO UTC. Người thực hiện chỉ gồm ID/tên hiện còn liên kết, không trả password hash hoặc toàn bộ USERS. Không trả ip_address ở contract tối thiểu này. Tài nguyên không có khóa ngoại trực tiếp; giữ loại/định danh đã ghi nhận.

Sắp created_at DESC rồi log_id DESC. COUNT và items dùng chung một snapshot giao dịch, tránh tổng/trang ghép từ hai thời điểm trong một request. Không cam kết một snapshot xuyên nhiều lần chuyển trang: audit mới có thể làm dịch trang; tải lại từ trang1 khi muốn xem dữ liệu mới. Đổi bộ lọc thì frontend tự đặt page1; chuyển trang giữ bộ lọc. API không giữ bộ lọc theo phiên.

200 với items=[] là truy vấn thành công không có dòng ở trang/bộ lọc đó; không thay lỗi SQL bằng danh sách rỗng. Lỗi đọc trả503 AUDIT_LOGS_UNAVAILABLE, thông báo an toàn; giao diện giữ bộ lọc và cho thử lại. Không hiện SQL/stack/secret, không dùng HTML để render tên/hành động/tài nguyên/chi tiết; dùng text hoặc React text node. Backend trả JSON, chưa nghiệm thu việc render tại UI.

## Chi tiết được phép xem

Không trả nguyên văn cột details. Service chỉ chiếu các trường đã biết của từng action, kiểm kiểu và loại dữ liệu. Ví dụ CREATE/UPDATE_POI có sourceChanged/contentVersion; tour có cặp poiId/sequenceNo và revision; thanh toán có định danh/số tiền/trạng thái/thời hạn hợp lệ; worker có POI/ngôn ngữ/phiên bản/provider/code kiểm soát; seed có các ID/digest. Không trả token, auth_code, mật khẩu, khóa API, claimId, response nhà cung cấp hoặc object lồng tùy ý. Chi tiết chưa biết, văn bản tự do, JSON hỏng hoặc scalar bị ẩn thànhnull; các trường lạ/sai kiểu trong object bị bỏ, không làm mất bản ghi log.

detailsOmitted=true báo phần chi tiết đã bị ẩn/chuẩn hóa; không diễn giải null thành “thao tác không xảy ra”. Log action chưa có trong danh sách vẫn có thể xuất hiện ở danh sách mặc định với chi tiết bị ẩn, nhưng không thể dùng action đó làm bộ lọc trước khi hợp đồng được cập nhật. Không sửa dữ liệu audit cũ để khớp API.

Phép chiếu được giới hạn theo hợp đồng các writer hiện tại, không phải lời cam kết phát hiện mọi bí mật có thể bị ghi sai vào bất kỳ trường dữ liệu nào. Những thay đổi writer/nhà cung cấp mới phải được rà và bổ sung test trước khi mở chi tiết mới.

## File và kiến trúc

Thêm audit.router.js,audit.service.js,audit.validation.js,audit-details.js và hai file test audit. Server chỉ nối router/service. AuditLogStore bổ sung list với truy vấn tham số, LEFT JOIN người dùng và snapshot; giữ nguyên create cùng các caller. Hàm list lấy AuthStore.transaction khi được gọi để tránh vòng require khởi tạo, vì AuthStore đã dùng AuditLogStore cho ghi log.

Router→Service→Store; không có SQL/Redis trong Router/Service, không dịch vụ ngoài cần adapter mới. Không thêm schema/cột/chỉ mục, không tự đổi tên bảng. Chưa đo tải trên staging; không tự hứa hiệu năng cho bộ dữ liệu lớn hoặc thêm chỉ mục ngoài yêu cầu.

## Bảng đối chiếu và bằng chứng

| AC / QT / NFR | Đã đáp ứng chưa | Test chứng minh | Ghi chú |
| --- | --- | --- | --- |
| UC-17;US-F02 AC3 phần xem/lọc | Backend đã kiểm chứng | ADMIN reads latest…;time filters…;valid filters… | Chưa UI/reset trang/text rendering thực tế |
| US-F01 AC4;QT-01/12;NFR-06 | Kiểm quyền ADMIN, trạng thái/phiên hiện tại | HTTP rejects…;permissions use current database role…;audit service enforces ADMIN… | Không dùng token khách hoặc STAFF để đọc |
| UC-17 A1–A3,E2 | Mặc định/lọc/phân trang, thứ tự ổn định, đầu vào sai400 | ADMIN reads latest…;time filters…;malformed filters… | BIGINT dạng chuỗi, UTC giây, không lưu trạng thái filter server |
| UC-17 E3;NFR-08 | SQL lỗi503, không giả empty, retry được | query outages become safe HTTP503…;unknown storage errors… | Gây lỗi truy vấn thật tại fixture, không tắt MySQL demo |
| UC-17 bước5;NFR-08 | Giữ log user NULL, giới hạn chi tiết an toàn | nullable/deleted actor…;free-form/unknown/nested secret…;audit projection units | Không đổi log cũ; UI còn phải render text |
| UC-17 hậu điều kiện;QT-12;NFR-18 | GET không thêm/sửa/xóa log, snapshot tổng/trang | repeated/concurrent reads…;count and page share one snapshot… | Không cung cấp API ghi log thủ công |
| US-16;NFR-13 | Tách ba lớp, không đổi schema | lint bản cuối; kiểm import và vị trí SQL | Không sửa UC-08/15/front/Word |
| US-17;NFR-14 | Lint133 file và toàn bộ511/511 test đạt, có coverage | evidence/audit-targeted.log;all-tests-final.log ngoài repo | Chưa commit/push hoặc CI cho UC-17; không tuyên bố hoàn tất CI mốc mới |

Lượt tập trung đầu19/19,1 suite,fail/cancel/skip/todo0,19.320286049 giây;8 unit+11 ca MySQL/HTTP. Sau đó bổ sung guard cho tên action trùng thuộc tính prototype và cờ ẩn chi tiết; các assert mới nằm trong bộ test hiện tại và được chạy trong toàn bộ hồi quy bản cuối. Không dùng kết quả lượt riêng đầu thay cho bản đã sửa.

Test SQL/HTTP dùng DB fixture mới `tcv_audit_test_<uuid>` trên MySQL8/Redis thử riêng, không init DB cũ hoặc demo. Có test JWT/phiên nội bộ thật, tài khoản đổi quyền/khóa, đọc đồng thời, tổng/trang nhất quán, JSON chứa marker secret thử bị ẩn và mã BIGINT vượt2^53. Ca lỗi SQL cố ý truy vấn bảng không tồn tại chỉ trong fixture; không phải đo lỗi hạ tầng hay tải thực tế. Các phép ghi/xóa user/INSERT audit trong test là tạo tình huống fixture, không phải API mới.

Môi trường/bằng chứng ngoài OneDrive: `C:\Users\Admin\Documents\Codex\TCV_UC17_STAGE_A_20261021`. Không cài dependency mới, không copy .git/node_modules/.env thật. Chưa chạy lại frontend riêng vì không sửa frontend; chưa dùng CI nền làm kết quả cho mốc này.

**Giữ bằng chứng lượt hồi quy đầu:**511 test,510 đạt,fail0,cancelled1,skip0,25 suite,484.327217015 giây,exit1. Suite seed/worker có giới hạn120000ms bị timeout ở ca cuối và hủy ca đó; không phải lỗi assert của UC-17. Log `evidence/all-tests-attempt1-timeout.log`. Chưa khẳng định nguyên nhân gốc; không sửa code/timeout/coverage hoặc bỏ test.

**Kết quả cuối:** chạy lại toàn bộ trên đúng cùng bản source, không chỉ chạy lại ca đơn lẻ: **511/511 đạt**,25 suite,fail/cancel/skip/todo0,370.124424749 giây,exit0; lint133 JavaScript file đạt. Node20.20.2,MySQL8.0,Redis7.4.11 thật; RUN_DB_TESTS=1/RUN_REDIS_TESTS=1, concurrency1, có coverage. Tăng19 test so với nền492. Suite seed/worker đạt16/16 ở lượt này trong80.349943503 giây với cùng timeout120s. Giữ cả hai lượt để theo dõi tính ổn định, không dùng lần xanh để khẳng định đã tìm/sửa nguyên nhân timeout.

Tám file code/test repo khớp SHA-256 bản sao kiểm thử, xem evidence/source-hashes.json; chỉ sửa tài liệu sau test. Đã dọn ba container test một lần sau đối chiếu exit0/1/0 và lưu log; dừng MySQL/Redis thử riêng, giữ18 volume và demo/backup. Bằng chứng evidence/cleanup.txt. Chưa có CI cho thay đổi UC-17 chưa commit, chưa kiểm riêng Node22 của mốc này.

## Demo và bước tiếp theo

Backend/worker demo127.0.0.1:18080 đã nâng ảnh6e4e21b trước khi viết UC-17. Hash2 POI/4 nội dung/4 audio/1 tour/liên kết/job và file media không đổi;18 volume giữ nguyên. Readiness200, API tour/bundle/audio thiếu token401, smoke compiled frontend đạt. Hồ sơ ngoài repo `TCV_TOUR_DEMO_DEPLOY_20261021/KET_QUA_NANG_DEMO.md`. Không tạo tài khoản quản trị chỉ để thử demo, không nhập dữ liệu thử vào demo. **UC-17 chưa nằm trong ảnh demo này.**

Sau hồi quy, báo kết quả và chờ người dùng chốt commit/push. CI phải kiểm đúng commit mới khi được phép đẩy; không tự bắt đầu UC-18 hoặc deploy UC-17 vào demo. UI/UX do bạn frontend phụ trách, UC-08/15 do Đức Anh; tránh sửa phần của nhau.

Nguồn và độ tin cậy: Word8 đọc lại21/10/2026, nền6e4e21b và code UC-17 chưa commit;19 test tập trung đầu và511/511 hồi quy cuối có thật, lượt timeout đầu được giữ và chưa rõ nguyên nhân gốc. Chưa CI cho UC-17; không coi API/local/mock là nghiệm thu UI, staging, GPS hoặc toàn sản phẩm.
