# Mốc 13 — Mã lượt xử lý và chuẩn bị văn bản qua adapter mock

## Nguồn và phạm vi đã duyệt

Đọc lại trực tiếp `CNPM_BAOCAO (8).docx`: US-C02 AC1–AC4, US-F02 AC1/AC3; QT-07/08/12; NFR-08/09/10/11/13; UC-13 đầy đủ; mục 1.6.2, lớp/adapter tại chương 4 và schema POI_TRANSLATIONS/AUDIOS/CONTENT_JOBS. Trước code, mốc nhận job f382be7 đã push và CI completed/success: https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39383566623 .

Người dùng đã xác nhận riêng: **cho phép thêm một cột claim_id nullable vào CONTENT_JOBS bằng migration mới** để chặn kết quả của lượt cũ sau retry. Không sửa migration đã push hoặc tên cột/bảng hiện có.

Mốc này triển khai mã lượt xử lý, chụp nguồn, chuẩn bị văn bản qua adapter được truyền vào, tái sử dụng văn bản đúng phiên bản, ghi kết quả có kiểm tra lại quyền và nhánh FAILED an toàn. Có MockTranslationAdapter phục vụ test; không có dịch máy thật, worker tự quét/chạy, TTS/media, audio AVAILABLE, job COMPLETED hoặc phục hồi PROCESSING. Không sửa frontend hoặc Word. Chưa hoàn tất US-C02/UC-13.

## Schema và nâng cấp

Migration mới: `database/migrations/005_content_job_claim.sql`. Thêm đúng `CONTENT_JOBS.claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL`. Không thêm UNIQUE/index/cột khác hoặc thay đổi VISIT_SESSIONS. Đây là UUID v4 nhận diện một lượt xử lý nội bộ, không phải token xác thực khách. Không dùng updated_at để phân biệt lượt.

`npm run db:migrate` nay chạy đến 005. SchemaStore kiểm tra cột, thêm khi thiếu, kiểm tra lại type/nullability/collation; schema đã có cột sai thì báo lỗi thay vì tự sửa. Migration được kiểm thử giữ nguyên các row cũ, NULL cho lượt cũ và chạy lại không thêm trùng. MySQL DDL không được xem là transaction rollback.

**Cần chạy db:migrate trước khi dùng code mới, kể cả database vừa nạp init_db.sql.** Init schema/migration cũ giữ nguyên; code worker và retry hiện có đều dùng claim_id. Không tự chạy nâng cấp trên database nghiệp vụ trong phiên này. Dừng thành phần xử lý nền cũ trước khi nâng cấp; job PROCESSING cũ có claim_id NULL được giữ nguyên, không tự phát quyền hoặc reset. Phục hồi các job này là mốc riêng chưa triển khai.

## Luồng nội bộ và phân lớp

PipelineService cung cấp:

- `claimJob(jobId)`: khi nhận PENDING, sinh claimId UUID mới, lưu cùng trạng thái/audit và trả claimId sau commit. Job cũ PENDING được chuyển FAILED như mốc 12. Không có HTTP công khai trả mã này.
- `prepareTranslation(jobId, claimId)`: xử lý văn bản của lượt đã nhận. Không đúng PROCESSING/claimId thì trả CLAIM_LOST, không gọi provider hoặc ghi gì.
- `runTranslation(jobId)`: kết hợp nhận job rồi chuẩn bị văn bản. 20 lượt gọi đồng thời trên một job chỉ một lượt gọi adapter.

Service không gọi driver. ContentJobStore quản lý transaction/khóa POI → job; ContentStore đọc/lưu text trong cùng connection do Store điều phối. Adapter được gọi **ngoài SQL transaction**, không giữ khóa database trong lúc chờ dịch vụ.

Trước gọi provider, đọc nguồn vi READY, đúng phiên bản, đủ tên/mô tả/kịch bản. Tiếng Việt dùng nguyên văn bản nguồn; nếu target đã READY, đúng phiên bản và đủ dữ liệu thì tái sử dụng. Không suy ra audio sẵn sàng từ văn bản READY.

Sau provider, mở transaction mới, kiểm tra lại PROCESSING/claimId và source_version so với POIS.content_version. Lượt đã bị thay không ghi kết quả hoặc ghi FAILED vào lượt mới. Nguồn thay đổi nhưng lượt vẫn thuộc worker cũ thì kết thúc job cũ FAILED/CONTENT_SOURCE_OUTDATED; không thay nội dung mới hoặc job của phiên bản mới.

Tên kết quả tối đa 255 ký tự Unicode, các TEXT tối đa 65535 byte UTF-8, tất cả bắt buộc có nội dung. Chỉ lấy name/description/audioScript; không lưu metadata hoặc raw lỗi tùy ý từ provider. Bản dịch được upsert đúng cặp POI–ngôn ngữ, READY và đúng source_version, cùng audit PREPARE_TRANSLATION. Lỗi SQL/audit rollback text; bất định commit trả lỗi an toàn. Thử lại với cùng claimId có thể tái sử dụng text đã commit, không ghi audit lần hai hoặc dịch lại.

Job **giữ PROCESSING sau TRANSLATION_READY**, vì chưa có audio. Không gắn COMPLETED vào việc dịch xong hoặc nhận mock. Hiện chỉ có entry point Service và test; chưa có tiến trình vận hành gọi tự động. Trước khi bật worker thực tế cần nối nốt audio và phục hồi, tránh để job chỉ hoàn thành phần văn bản rồi đứng ở PROCESSING.

## Mock, timeout, FAILED và retry

MockTranslationAdapter thêm nhãn `[MOCK <ngôn ngữ>]` vào nguồn để kiểm tra giao thức. **Không tạo bản dịch thật**, không chứng minh chất lượng nội dung hoặc số ngôn ngữ nghiệm thu. Audit provider=MOCK giúp đối soát; không tự bật mock trong Service/Router hoặc chạy nó trên database nghiệp vụ. Dữ liệu mock của lượt kiểm thử chỉ nằm trong database tạm. Không có cấu hình production mặc định giả là đã tích hợp dịch vụ thật.

Adapter nhận sourceLanguage=vi, targetLanguage, bản chụp nguồn và AbortSignal. Timeout cấu hình qua constructor `translationTimeoutMs`, mặc định kỹ thuật 10000 ms, miền 1–120000 ms; đây không phải con số báo cáo đã chốt. Promise.race giới hạn thời gian chờ; hết hạn gọi abort. Adapter không hợp tác hủy vẫn không được ghi kết quả về muộn. Không tự retry provider; nhân viên dùng luồng retry FAILED hiện có.

Các mã lỗi cố định: CONTENT_SOURCE_OUTDATED, CONTENT_SOURCE_UNAVAILABLE, TRANSLATION_TIMEOUT, TRANSLATION_PROVIDER_FAILED, TRANSLATION_RESULT_INVALID. Ghi FAILED + xóa claim_id + audit cùng transaction, chỉ khi claimId còn đúng. Retry hiện có chuyển chính job FAILED hiện hành về PENDING và xóa claim_id; lần nhận sau sinh UUID mới. Không giữ mã cũ qua lượt mới.

API trạng thái chỉ trả mã/thông báo đã duyệt trong danh sách trên; lỗi provider/legacy khác vẫn trở về CONTENT_PROCESSING_FAILED chung. Không trả raw error_message hoặc claim_id. Không mở API mới cho worker. Phân quyền STAFF/ADMIN và hạn chế retry phiên bản cũ giữ nguyên.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-C02 AC1; US-F02 AC1 | Nối tác vụ POI đã có với bước văn bản, local đạt | mock text commits READY; receives a POI-created task | Chưa worker chạy tự động hoặc dịch/TTS thật. |
| US-C02 AC2; QT-07; NFR-10 | Chưa đủ nội dung nghiệm thu | Vietnamese ... reused; mock prefix test | Tiếng Việt giữ nguồn; mock không được tính là bản dịch/audio đúng chất lượng. |
| US-C02 AC3; UC-13 E4, phần lỗi/retry | Local đạt FAILED và lý do an toàn, retry cùng row | provider failure/timeout ... allows staff retry; legacy-error regression | Phục hồi PROCESSING sau gián đoạn chưa làm. |
| US-C02 AC4; QT-08, phần văn bản | Local đạt tái sử dụng, chống nhận trùng/ghi kết quả cũ | 20 workers provider only once; source edit while provider runs; old claim delayed success/failure | Chưa xử lý tái sử dụng hoặc công bố audio. |
| QT-12; US-F02 AC3, audit thay đổi | Local đạt text/audit và FAILED/audit nguyên tử | SQL/audit failure rolls back; worker claim/retry audits | Actor NULL cho hệ thống; không thêm ADMIN xem/lọc audit. |
| NFR-08 | Local đạt input/output và lỗi an toàn trong phần mới | malformed claim; invalid provider output; provider errors never expose raw details | Claim UUID không phải token khách; không trả trong API trạng thái. |
| NFR-09, thay phiên bản và lượt retry | Local đạt chặn worker cũ | recovered/retried job has a new claim; late resolution after timeout | Recovery trong test là fixture mô phỏng, không phải tính năng phục hồi đã code. |
| NFR-11, phần dịch | Local đạt timeout hữu hạn và nhánh lỗi bằng mock | provider failure/timeout; configuration bounds; abort handling | Chưa xác minh provider thật; adapter không mặc định bật mock. |
| NFR-13 | Local đạt phân lớp/cú pháp | check.js kiểm tra 87 file; Store/adapter thay thế | ContentStore chỉ xử lý SQL; gọi provider ngoài transaction. |
| Tính nguyên tử/đối soát, phần liên quan NFR-18 | Local đạt migration giữ dữ liệu và bất định commit | migration preserves existing rows/idempotent/reject incompatible; lost translation commit ack | Không nâng cấp database nghiệp vụ, không sửa migration cũ. |

## Kiểm chứng và Git

**325 test local đạt, 0 lỗi; kiểm tra cú pháp/phân lớp 87 file JavaScript đạt.** Thêm 21 test: 9 unit về bước dịch và 12 SQL tích hợp/migration, đồng thời điều chỉnh test cũ để nạp migration 005 và kiểm tra claimId. Suite SQL pipeline hiện 21 test. Hồi quy đầy đủ auth/POI/job/CASH/ONLINE đã chạy.

Local SQL: **MariaDB 10.4.32**. RUN_DB_TESTS=1, RUN_REDIS_TESTS=0; Redis của các luồng cũ dùng thay thế. 15 ca Redis thật riêng chưa bật local, skipped=0 không chứng minh các suite tắt đã chạy. Phần mới không dùng Redis. Chưa có CI/MySQL 8 cho mốc 13; CI xanh của f382be7 chỉ chứng minh mốc 12 trước các thay đổi này.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-translation-full-a7a27aace8be4f22a457039d1c29333e\all-tests.log`.

Mốc 12 đã commit/push f382be7 và CI xanh theo yêu cầu. **Mốc 13 chưa commit/push**; không dùng quyền push mốc 12 để tự push mốc này. Word/frontend/ERD chưa sửa. Không bắt đầu TTS/media trước khi chốt mốc này theo quy trình.

## Các đoạn báo cáo cần cập nhật sau khi duyệt

1. **4.4.4 j — CONTENT_JOBS:** thêm claim_id CHAR(36), ASCII phân biệt hoa/thường, NULL cho job chưa có lượt hiện hành. Mỗi lượt nhận sinh mới; retry/FAILED xóa; không phải access token, không lấy updated_at làm mã lượt.
2. **ERD, ô CONTENT_JOBS:** thêm thuộc tính claim_id nullable, không thay FK hoặc số bảng. Không thêm quan hệ với VISIT_SESSIONS hoặc USERS cho mã này.
3. **UC-13 bước xử lý nền/A3/E4:** nêu kiểm tra mã lượt và source_version trước ghi kết quả; retry cùng job vô hiệu lượt cũ; lỗi/timeout không làm mất POI; văn bản READY chưa đủ để job COMPLETED. Phục hồi gián đoạn vẫn ghi chưa triển khai.
4. **4.2–4.3 — PipelineService, JobStore/ContentStore, Translation Adapter:** mô tả hai transaction trước/sau provider, không giữ transaction khi gọi dịch vụ; timeout/abort hữu hạn; lưu text/audit cùng transaction, audio có bước riêng.
5. **Đặc tả AUDIT_LOGS và hợp đồng trạng thái:** PREPARE_TRANSLATION/FAIL_CONTENT_JOB với actor NULL, provider MOCK/ADAPTER và mã lỗi cho phép; không raw provider error/claimId/secret.
6. **Hiện trạng US-C02, kiểm thử và tích hợp:** có bước văn bản với mock; chưa dịch/TTS thật, chưa đủ 15/15+ ngôn ngữ hoặc bộ dữ liệu nghiệm thu. Ghi đúng local MariaDB, 325 test và CI mới chưa chạy; chưa có audio nên không nhận pipeline hoàn tất.

Nguồn và độ tin cậy: Word 8 đọc lại, xác nhận trực tiếp cho migration claim_id và code/325 test local; mock chỉ chứng minh điều phối/quy tắc dữ liệu, không chứng minh chất lượng dịch hoặc một luồng nghe thuyết minh hoàn chỉnh.
