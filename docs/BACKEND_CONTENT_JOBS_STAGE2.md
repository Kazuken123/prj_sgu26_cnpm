# Bước 2 — xem trạng thái và yêu cầu thử lại nội dung

## Đối chiếu nghiệp vụ trước khi code

Nguồn: `CNPM_BAOCAO (8).docx`, UC-13 bước 8, A2/A3, E1/E2/E3; US-C02 AC3/AC4 và US-F02 AC3. Đã đọc đặc tả trước triển khai. Giữ Router → Service → Store; frontend không chỉnh trong đợt này.

- A2: xem trạng thái theo ngôn ngữ không làm thay đổi dữ liệu.
- A3: chỉ FAILED thuộc content_version hiện hành được chuyển về PENDING. Không sinh job mới. Ghi audit cùng transaction.
- E1: xác thực nội bộ, quyền STAFF/ADMIN; kiểm tra lại tài khoản trong transaction ghi.
- E2: job không có → 404; job cũ hoặc không FAILED → 409. Gửi yêu cầu lần hai khi lần đầu đã PENDING cũng bị từ chối 409; đúng yêu cầu "không FAILED thì không đưa lại vào xử lý". Không trả thành công giả để coi là idempotent.
- E3: lỗi audit hoặc ghi task → rollback; giữ trạng thái FAILED và lỗi trước đó.
- Không thêm điều kiện POI phải ACTIVE hoặc ngôn ngữ phải đang bật: báo cáo chỉ yêu cầu FAILED và đúng phiên bản cho thao tác này; nhân viên vẫn có thể chuẩn bị nội dung của POI chưa công bố.

## API

Các API yêu cầu `Authorization: Bearer <access token nội bộ>`. Token khách không thay thế tài khoản STAFF/ADMIN. Dữ liệu thành công trong `data`; lỗi giữ `{code, error}`.

### GET /api/admin/content-jobs

Query tùy chọn: `poiId`, `languageCode`, `status`, `currentOnly=true|false`, `page` (mặc định 1), `limit` (mặc định 20, tối đa 100). currentOnly mặc định false để có thể xem cả tác vụ cũ, với nhãn isCurrent. Status: PENDING / PROCESSING / COMPLETED / FAILED. Sắp mới trước theo created_at, sau đó job_id, không bị xáo thứ tự khi tác vụ retry cập nhật updated_at.

Ví dụ: `/api/admin/content-jobs?poiId=1&languageCode=en&status=FAILED&currentOnly=true`.

Trả `{data: {items: [...], total, page, limit}}`. Mỗi item gồm jobId, poiId, languageCode, sourceVersion, currentVersion, isCurrent, status, canRetry, createdAt, updatedAt; translation và audio có status/sourceVersion/isCurrent riêng. Chưa có dữ liệu tương ứng thì status và sourceVersion là null. Không suy ra text READY hoặc audio AVAILABLE nghĩa là đúng phiên bản hiện hành. Audio chỉ được đánh dấu đúng phiên bản khi cả phiên bản audio và bản dịch liên kết còn hiện hành.

### GET /api/admin/content-jobs/:id

Trả chi tiết theo cùng cấu trúc item. Tác vụ cũ vẫn xem được, nhưng canRetry=false. Không tự phục hồi hoặc retry khi GET. Không cung cấp raw error_message vì dữ liệu lỗi từ nhà cung cấp/cũ có thể chứa SQL hoặc secret. Khi FAILED, trả lỗi an toàn CONTENT_PROCESSING_FAILED; lý do chi tiết từ worker sẽ cần hợp đồng mã lỗi được kiểm duyệt ở mốc sau. Không nhận thông báo chung này là đã có phân loại đầy đủ nguyên nhân nhà cung cấp.

### POST /api/admin/content-jobs/:id/retry

Không có body hoặc body `{}`; từ chối trường tùy ý như status, sourceVersion, nội dung thay thế. Quy tắc và phiên bản lấy từ database, không tin phiên bản client khai.

Thành công trả **202 Accepted**:

```json
{
  "message": "Đã tiếp nhận yêu cầu thử lại; nội dung chưa được xác nhận hoàn tất.",
  "data": {
    "jobId": 1,
    "poiId": 1,
    "languageCode": "en",
    "sourceVersion": 2,
    "currentVersion": 2,
    "status": "PENDING",
    "accepted": true
  }
}
```

Giữ nguyên job_id và source_version, xóa error_message cũ, ghi RETRY_CONTENT_JOB với actor/tài nguyên/phiên bản trong audit. Không cập nhật bản dịch thành READY hoặc audio thành AVAILABLE; chúng chỉ thay đổi khi xử lý thật hoàn tất.

Mã lỗi: VALIDATION_ERROR (400); xác thực 401; FORBIDDEN (403); CONTENT_JOB_NOT_FOUND (404); CONTENT_JOB_OUTDATED / CONTENT_JOB_NOT_FAILED / CONTENT_JOB_CHANGED (409); lỗi DB bất thường INTERNAL_ERROR (500), không lộ SQL.

## Đồng thời và ranh giới giao dịch

Store tái sử dụng transaction có retry deadlock hữu hạn. Khóa theo thứ tự: tài khoản → POI → job, cùng thứ tự cha trước tác vụ như thao tác sửa nguồn POI. Đọc phiên bản/trạng thái bằng locking read, tránh snapshot trước khi chờ khóa bị cũ. UPDATE còn kiểm status=FAILED và source_version hiện hành, audit trong cùng transaction.

Hai người cùng retry: một yêu cầu 202, yêu cầu còn lại 409, một audit. Sửa nguồn thắng khóa trước → retry bản cũ bị từ chối. Retry thắng trước → nó được nhận khi phiên bản còn hợp lệ, sau đó sửa nguồn khiến job cũ trở thành lỗi thời; worker tương lai vẫn phải từ chối công bố kết quả cũ. Không tuyên bố API retry này đã thực hiện logic công bố của worker.

## Phạm vi hoàn thành

Đã có backend xem trạng thái và retry hiện có. Không thêm bảng/migration; dùng CONTENT_JOBS/POIS/POI_TRANSLATIONS/AUDIOS/AUDIT_LOGS hiện tại. Chưa có worker dịch/TTS, phục hồi PROCESSING sau gián đoạn, kết nối nhà cung cấp hoặc audio thực tế. Chưa đóng toàn bộ UC-13; không nhận việc chuyển PENDING là đã xử lý xong.

## Kiểm thử

`content-job.test.js`: quy tắc Service, dữ liệu lỗi an toàn, phiên bản text/audio, validation và HTTP/phân quyền.

`content-job.integration.test.js`: database tạm riêng qua mysql2 kiểm lọc/phân trang, retry cùng row, trạng thái không hợp lệ, job cũ, rollback audit, hai người retry đồng thời, race sửa nguồn/retry và ca chờ khóa xác định bằng barrier; kiểm tài khoản bị khóa và API dùng phiên nội bộ thật. Dữ liệu chỉ là fixture, không phải dữ liệu thực địa Thảo Cầm Viên.

Lượt kiểm tra ngày 19/10/2026: kiểm cú pháp/chia lớp đạt với 44 file JavaScript backend; toàn bộ **102 test đạt, 0 lỗi, 0 bỏ qua** khi bật RUN_DB_TESTS=1, gồm **26 ca tích hợp dữ liệu** dùng database tạm riêng (11 auth, 4 POI, 11 tác vụ). Đã truy vấn VERSION(): engine local là **10.4.32-MariaDB**, không phải MySQL 8. Không lấy lượt local này làm bằng chứng xác nhận MySQL 8; GitHub Actions dùng service mysql:8.0 cần được xác minh riêng. Trong 19 ca mới có 8 ca Service/HTTP và 11 ca tích hợp. Không sử dụng database nghiệp vụ hoặc chạy migration trên database đang dùng của nhóm.

Log kiểm tra lưu ngoài repo: `C:\Users\Admin\AppData\Local\Temp\tcv-jobs-61d8084a18ae4f6eb70033c1a4e0d993\all-tests.log`. Đây là kết quả chạy cục bộ, không thay thế trạng thái GitHub Actions sau push. Frontend không đổi và không cần migration mới cho bước 2.

Bước CI test bật pipefail rõ ràng để lỗi npm test không bị lệnh tee ghi log che mất. Chưa áp thêm ngưỡng coverage.
