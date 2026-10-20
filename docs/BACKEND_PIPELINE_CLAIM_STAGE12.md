# Mốc 12 — Nhận một tác vụ nội dung an toàn

## Yêu cầu và phạm vi

Nguồn chính: `CNPM_BAOCAO (8).docx` — Thảo Cầm Viên. Trước code đã đọc lại US-C02 AC1–AC4, US-F02 AC1/AC3; QT-07/08/12; NFR-08/09/10/11/13/18; UC-13 đủ luồng chính/thay thế/ngoại lệ, điều kiện trước/sau; mục 1.6.2; thiết kế Router–Service–Store và PipelineService; schema/ràng buộc POIS, POI_TRANSLATIONS, AUDIOS, CONTENT_JOBS, AUDIT_LOGS ở 4.4.4.

Báo cáo yêu cầu worker chỉ nhận khi chuyển thành công PENDING → PROCESSING, tác vụ cũ không ghi đè phiên bản mới, chỉ COMPLETED khi cả text và audio sẵn sàng. Người dùng cho triển khai **bước đầu**, chưa cho mở rộng toàn pipeline.

Mốc này có Service nhận một job theo jobId, dùng Store SQL để cập nhật trạng thái và audit nguyên tử. Không thêm cột/bảng, migration hoặc endpoint; không sửa Word/frontend. Chưa có tiến trình chạy nền, quét hàng đợi, adapter dịch/TTS/media, lưu kết quả, đánh dấu COMPLETED, timeout hoặc phục hồi PROCESSING. Không tự nhận đã hoàn tất US-C02/UC-13.

## Hợp đồng nội bộ

`new PipelineService(store).claimJob(jobId)` dành cho thành phần xử lý nền gọi trong code, **không phải API khách hoặc quản trị**. Chưa có lệnh vận hành để nhận job trên database nghiệp vụ; kiểm chứng bằng test với database tạm. Không nối việc nhận job vào request lưu POI, nên không làm request nhân viên chờ dịch/audio.

Đầu vào dùng quy tắc số nguyên dương an toàn hiện có. Kết quả:

- Job PENDING, source_version bằng content_version hiện hành: `{ claimed: true, jobId, poiId, languageCode, sourceVersion, status: "PROCESSING" }` sau commit.
- Không tồn tại: `{ claimed: false, reason: "NOT_FOUND", jobId }`.
- Đã PROCESSING/COMPLETED/FAILED: `{ claimed: false, reason: "NOT_PENDING", jobId }`, không cập nhật lại hoặc ghi audit thừa.
- Job PENDING lỗi thời: cập nhật chính job thành FAILED với mã `CONTENT_SOURCE_OUTDATED`, ghi audit, trả claimed=false; giữ nguyên POI, text/audio và job mới.
- Lỗi SQL/audit hoặc mất xác nhận commit: lỗi an toàn `CONTENT_JOB_CLAIM_UNAVAILABLE`, không trả claimed=true. Retry đọc trạng thái hiện có; job đã commit PROCESSING không được nhận lần hai.

Không tự thêm điều kiện POI phải ACTIVE hoặc ngôn ngữ phải đang bật: đây là chuẩn bị nội dung và báo cáo không đặt điều kiện đó cho thao tác nhận job. Tiếng Việt vẫn có job chuẩn bị audio; bước này không dịch lại tiếng Việt hoặc sửa nội dung nguồn.

## Đồng thời, lớp và transaction

Service quyết định có được nhận hay lỗi thời; không SQL/Redis/driver. `ContentJobStore.withWorkerJob` quản lý transaction qua AuthStore hiện có và thao tác SQL tham số hóa. Router không thay đổi vì không mở HTTP cho worker.

Đọc tham chiếu job để xác định POI, sau đó khóa POI trước job, cùng thứ tự cha trước con với sửa POI và retry của nhân viên. Đọc phiên bản/trạng thái bằng locking read để thấy dữ liệu mới đã commit sau khi chờ khóa, không dùng snapshot đọc tham chiếu trước đó để quyết định phiên bản.

UPDATE còn điều kiện status=PENDING và source_version khớp row đã khóa; phải có đúng một row cập nhật mới ghi audit. CLAIM_CONTENT_JOB hoặc FAIL_CONTENT_JOB cùng transaction với trạng thái. Actor/IP NULL vì tác vụ hệ thống; details chỉ có định danh/phiên bản/mã lỗi cố định, không có raw lỗi SQL/provider hoặc bí mật. Nếu audit lỗi thì rollback trạng thái. Nếu mất xác nhận commit sau khi SQL đã commit, không báo đã nhận thành công và không tự đưa PROCESSING về PENDING.

Một job được nhận một lần **trong lượt PENDING hiện tại**; không tuyên bố đã có quyền sở hữu xuyên suốt các lượt retry của worker. Chưa có đường hoàn tất/ghi kết quả nên mốc này không thể ghi đè nội dung mới. Mốc sau phải kiểm tra lại phiên bản ngay trước lưu kết quả và chốt cơ chế chặn worker cũ sau phục hồi/retry; kết quả claim không thay thế các kiểm tra đó. Job PROCESSING không bị API retry hiện có đưa về PENDING.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-C02 AC1; US-F02 AC1 | Giữ hành vi tạo job hiện có; nối nhận job, đạt local | SQL receives a POI-created task once; hồi quy POI | Chưa gọi dịch/TTS nền. |
| US-C02 AC3, phần trạng thái PROCESSING | Đạt local sau nhận job | SQL exposes PROCESSING to staff; non-pending and unknown jobs | GET trạng thái hiện có phản ánh SQL, không cần API mới. |
| US-C02 AC3, retry FAILED hiện hành | Tích hợp với API nghiệp vụ cũ đạt local | SQL staff retry ... reuses the same row; old-source retry rejected | Phục hồi job dở dang chưa làm. |
| US-C02 AC4; QT-08, phần chống nhận trùng | Đạt local cho lượt PENDING hiện tại | SQL 20 concurrent calls through two Stores; unit existing states | Chưa hoàn tất tái sử dụng text/audio hoặc lưu kết quả. |
| UC-13 E4; NFR-09, phần nguồn lỗi thời | Đạt local tại lúc nhận job | SQL old pending source becomes FAILED; claim waiting on a source edit | Chưa xử lý nguồn đổi sau khi đã nhận; phải kiểm lại ở bước lưu kết quả tương lai. |
| QT-07; US-C02 AC2; NFR-10 | Chưa triển khai dịch/audio/ma trận ngôn ngữ | Test vi/en chỉ chứng minh nhận job và không sửa text/audio | Không tự chốt số ngôn ngữ nghiệm thu hoặc coi mock đủ nội dung. |
| QT-12; US-F02 AC3, audit thao tác hệ thống | Có audit cùng transaction, đạt local | SQL one audit/NULL user; audit failure rolls back | Không triển khai ADMIN lọc/xem audit trong mốc này. |
| NFR-08, phần đầu vào/lỗi | Đạt local trong phạm vi mới | Unit invalid/injected identifiers; safe SQL/audit errors | Không mở HTTP, không nhận nội dung hoặc lỗi provider từ client. |
| NFR-09, gián đoạn worker; NFR-11 | Chưa triển khai | Lost commit chỉ kiểm chứng bất định lúc nhận job | Chưa timeout adapter, quét job treo hoặc quy tắc phục hồi. |
| NFR-13 | Đạt kiểm tra cú pháp/phân lớp local | check.js; Service dùng Store thay thế | PipelineService không phụ thuộc Express/driver. |
| Tính nguyên tử; hỗ trợ đối soát thay đổi NFR-18 | Đạt local cho thao tác nhận/loại job cũ | SQL update failure, audit rollback, lost commit acknowledgement | Không có migration, không thay đổi payment/token. |

## Kiểm thử và giới hạn

Thêm 16 test: 7 Service bằng Store thay thế và 9 test SQL tích hợp. Ca SQL kiểm tra vi/en, nguồn POI INACTIVE vẫn chuẩn bị được, 20 lượt qua hai Store chỉ một claim/audit, job cũ, trạng thái không hợp lệ, rollback update/audit, đọc phiên bản sau chờ khóa, mất xác nhận commit và nhân viên retry trước khi nhận lại.

Các fixture tạo qua PoiService với ADMIN kiểm thử trong database ngẫu nhiên riêng, các trigger lỗi chỉ tồn tại trong database test và được dọn. Không chạy migration hoặc chuyển job trong database nghiệp vụ. SQL local là MariaDB 10.4.32, chưa phải chứng cứ MySQL 8 cho mốc mới. Mốc này không dùng Redis hoặc dịch vụ ngoài; không có bằng chứng chất lượng dịch/audio.

**304 test local đạt, 0 lỗi**, gồm 16 test mới nêu trên và hồi quy auth/POI/job/CASH/ONLINE. Kiểm tra cú pháp/phân lớp **83 file JavaScript đạt**. Log: `C:\Users\Admin\AppData\Local\Temp\tcv-claim-full-c43eb95cba994b5b81d002bfff15e7eb\all-tests.log`.

RUN_DB_TESTS=1, RUN_REDIS_TESTS=0; SQL local MariaDB, Redis ở các luồng cũ dùng bản thay thế. 15 ca Redis thật riêng chưa bật trong lượt local; skipped=0 không chứng minh chúng đã chạy. Chưa commit/push và chưa có CI cho thay đổi mốc 12; không lấy CI xanh của 623c277 làm bằng chứng cho code mới.

## Các bước sau cần chốt riêng

Trước triển khai xử lý/ghi kết quả hoặc phục hồi, đọc lại báo cáo và trình bày cơ chế cụ thể: chụp nguồn, quyền của từng lượt xử lý để chặn kết quả cũ sau retry, thời gian chờ, nhận diện PROCESSING dở dang và cách phối hợp SQL–media. Schema hiện không có cột claim token/lease; không tự thêm cột hoặc dùng updated_at làm bằng chứng quyền sở hữu khi chưa chứng minh tính an toàn. Quyết định mơ hồ cần hỏi người dùng trước code.

Word/ERD không có thay đổi schema cần cập nhật ở mốc này. Khi đồng bộ báo cáo sau, ghi đúng trạng thái mới: đã có claim một job, chưa có worker chạy pipeline dịch/audio hoặc phục hồi. Dừng tại mốc nhận job sau khi kiểm chứng, chưa tự chuyển bước 2.

Nguồn và độ tin cậy: báo cáo Word 8 đọc lại, code và test local mốc nhận job; giới hạn môi trường, tác vụ dở dang và phạm vi chưa triển khai được nêu trên.
