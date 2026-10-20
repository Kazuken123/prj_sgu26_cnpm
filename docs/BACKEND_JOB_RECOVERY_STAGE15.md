# Mốc 15 — Job gián đoạn, hạn giữ quyền và phục hồi có kiểm soát

## Nguồn và quyết định được duyệt

Đọc lại trực tiếp CNPM_BAOCAO (8).docx: US-C02 AC1–AC4, US-F02 AC1/AC3; QT-08/12; NFR-08/09/11/13; toàn bộ UC-13, mục 1.6.2, thiết kế ba lớp/adapter và bảng/ràng buộc POIS/POI_TRANSLATIONS/AUDIOS/CONTENT_JOBS/AUDIT_LOGS. UC-13 E4 và NFR-09 cho phép nhận diện tác vụ dở dang rồi chuyển FAILED để nhân viên chạy lại, không bắt buộc tự phục hồi toàn bộ.

Báo cáo chưa chốt cơ chế nhận diện hoặc thời gian. Người dùng đã xác nhận: **thêm CONTENT_JOBS.lease_expires_at nullable qua migration mới; hạn mặc định 120 giây, gia hạn mỗi 15 giây, cấu hình được**. Chỉ thu hồi job hết hạn; worker chậm gia hạn mất quyền ghi dù tiến trình còn sống. Job cũ chưa có hạn chỉ báo đối soát, không tự thu hồi. Không làm worker tự lấy PENDING trong mốc này.

Mốc audio ca21731 đã push và CI xanh trước khi bắt đầu: https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39386967221 . Không coi CI đó kiểm chứng thay đổi mốc 15.

## Phạm vi hoàn thành

- Có hạn giữ quyền khi nhận job; runJob/runTranslation tự gia hạn trong lúc xử lý và dừng timer khi kết thúc.
- Gia hạn và tất cả lần ghi kết quả phải còn đúng claim_id, PROCESSING và hạn SQL còn hiệu lực. Hạn hết không được hồi sinh bằng heartbeat.
- Có Service và lệnh vận hành kiểm tra/thu hồi job hết hạn; mặc định dry-run. Apply chuyển FAILED, xóa claim/hạn và ghi audit trong cùng transaction, giữ nguyên nội dung và file đã lưu.
- Nhân viên retry FAILED hiện hành qua API đã có; cùng job, lượt mới và hạn mới. Kết quả lượt cũ bị chặn cả trước và sau khi phục hồi.

Không thêm daemon, quét PENDING, cron, public API phục hồi, tự retry provider, TTS/dịch thật, frontend hoặc dọn file. Không tự khởi động/cài dịch vụ hay chạy phục hồi trên database nghiệp vụ.

## Migration và cấu hình

Migration mới 006_content_job_lease.sql chỉ thêm `CONTENT_JOBS.lease_expires_at DATETIME(3) NULL`. Không đổi migration 001–005, không thêm bảng/index/cột khác. SchemaStore chạy lại được và kiểm type/nullability; cột sai thì báo lỗi thay vì tự sửa. Các row cũ giữ NULL, không được gán hạn giả hoặc tự reset.

Chạy db:migrate đến **006 trước code mới**, cả database vừa nạp init_db.sql. Init schema cũ giữ nguyên. Không áp migration lên database nghiệp vụ trong phiên này. Dừng code worker cũ khi nâng cấp; job PROCESSING cũ chưa có hạn chỉ được thống kê để người vận hành đối soát. Không có cờ tự bỏ qua bảo vệ legacy.

`CONTENT_JOB_LEASE_SECONDS=120`, `CONTENT_JOB_HEARTBEAT_SECONDS=15`, khai báo trong hai env example và Compose. Số nguyên dương, lease tối đa 3600 giây, heartbeat tối đa một phần ba lease để có khoảng dự phòng. Đây là ràng buộc cấu hình kỹ thuật; test dùng 3 giây/1 giây để kiểm chứng hết hạn thật. Không lấy thời gian máy app làm thời gian quyết định.

## Quyền của lượt xử lý

Khi nhận PENDING, SQL lưu claim_id mới và hạn bằng UTC_TIMESTAMP(3) cộng lease cấu hình. Mọi lần đọc quyền đều khóa POI trước job, rồi đọc giờ SQL sau khi lấy khóa, tránh dùng snapshot/giờ cũ trước khi chờ. Các UPDATE và bước lưu text có điều kiện kiểm hạn lại tại điểm ghi.

runJob/runTranslation bao quanh pipeline hiện có bằng heartbeat, gọi Service → Store; không chồng nhiều lần gia hạn của cùng bộ hẹn giờ. Callback dừng lịch khi mất claim hoặc SQL báo lỗi; kết thúc work thì hủy lịch và đợi lượt gia hạn đang chạy kết thúc. Không log claim/driver error. Các lời gọi claimJob/prepareTranslation/prepareAudio riêng lẻ không tự tạo lịch chạy vĩnh viễn; thành phần gọi phải dùng luồng run tương ứng hoặc chủ động renewClaim.

Gia hạn chỉ thành công khi job còn PROCESSING, đúng claim và hạn chưa hết. Không dùng updated_at làm bằng chứng worker sống. Ghi text, ghi FAILED của worker và chốt audio/COMPLETED cũng bị chặn sau hết hạn, kể cả khi chưa ai chạy phục hồi. FAILED/retry/COMPLETED xóa hạn cùng claim khi thích hợp.

Một tiến trình còn sống nhưng mất kết nối, bị treo hoặc trễ heartbeat quá hạn **cũng mất quyền**. Lease không chứng minh tuyệt đối tiến trình đã chết; nó xác định quyền ghi. Lỗi heartbeat không tự FAILED job ngay khi hạn còn hợp lệ; quyền còn hay mất vẫn do SQL quyết định. Không hứa worker bị pause dài luôn được giữ quyền. Giữ dữ liệu bằng hàng rào claim/phiên bản/hạn thay vì cố đoán tình trạng OS.

## Kiểm tra và thu hồi

Tại backend, sau khi cấu hình database đúng và chạy migration:

```text
npm run jobs:recover
npm run jobs:recover -- --limit 100
npm run jobs:recover -- --apply --limit 100
```

Hai lệnh đầu chỉ đọc. `--apply` mới ghi; mỗi lượt tối đa 1000 job, mặc định 100, không có vòng quét vô hạn. Đây là công cụ người vận hành có quyền truy cập môi trường server/database, không phải endpoint dành cho khách hoặc yêu cầu nhân viên tự có mật khẩu database.

Service chọn snapshot ứng viên PROCESSING có claim và hạn <= giờ SQL, sắp theo hạn rồi job_id. Thống kê riêng `legacyProcessing` cho job thiếu claim/hạn. Với mỗi ứng viên khi apply, khóa lại và kiểm tra trạng thái, claim còn đúng và hạn thực sự đã hết; không tin snapshot ban đầu. Hạn vừa được gia hạn hoặc claim đã đổi thì bỏ qua.

UPDATE có điều kiện chuyển FAILED/CONTENT_WORKER_INTERRUPTED, xóa claim_id và lease_expires_at; audit RECOVER_CONTENT_JOB actor/IP NULL cùng transaction. Không sửa POI, text/audio hoặc xóa file. Nếu nguồn đã đổi, job cũ vẫn được kết thúc FAILED, nhưng API retry hiện có sẽ từ chối vì không phải phiên bản hiện hành. Job của nguồn mới không bị chạm.

Kết quả chỉ có dryRun, inspected (số ứng viên lấy ở snapshot), recovered, skipped và legacyProcessing. Dry-run không giữ quyền quyết định cho lần apply sau. Mỗi job một transaction, **không có transaction chung cho cả batch**: nếu lỗi giữa lượt, các job đã commit trước đó vẫn giữ kết quả. Lỗi trả CONTENT_RECOVERY_UNAVAILABLE và yêu cầu đối soát/chạy lại; không tuyên bố rollback toàn bộ. Mất phản hồi commit không tạo thêm audit khi chạy lại.

Không reset tất cả PROCESSING khi app khởi động. Không tự chuyển PENDING hoặc bỏ qua job legacy. Không thu hồi file/text đã tạo chỉ vì job bị gián đoạn. Công cụ chỉ chạy khi người vận hành gọi; chưa có lịch phục hồi nền tự động.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-C02 AC3; UC-13 E4, phần gián đoạn | Local đạt nhận diện hết lease và chuyển FAILED | kill real worker -> expiry -> FAILED -> STAFF retry completes | Job legacy chỉ thống kê; áp dụng theo quyết định người dùng. |
| US-C02 AC4; QT-08 | Local đạt chặn lượt cũ và giữ nguồn/kết quả mới | expired cannot publish before recovery; recovery vs heartbeat; old claim after retry | Cả text/audio giữ kiểm phiên bản, không chỉ dựa claim. |
| NFR-09, job còn giữ quyền | Local đạt | real live worker renews beyond initial lease; stale scanner cannot revoke renewed lease | Worker còn sống nhưng trễ gia hạn có thể mất quyền theo chính sách đã duyệt. |
| NFR-09, lặp và đồng thời | Local đạt | 20 recovery callers one audit; lost recovery commit acknowledgement | Không tạo job trùng hoặc tự chạy lại pipeline. |
| QT-12; US-F02 AC3, audit | Local đạt recovery/audit nguyên tử | recovery audit failure rollback; one recovery audit | Không thêm ADMIN xem/lọc audit. |
| NFR-08 | Local đạt lỗi an toàn và đầu vào bounded | invalid recovery options; CLI limits; safe SQL errors | Không public API hoặc log raw secret/claim. |
| NFR-11, phạm vi liên quan | Giữ timeout provider và retry hữu hạn; heartbeat dừng khi lỗi | full regression; renew cannot resurrect; safe renewal error | Thời gian SQL theo cấu hình/transaction hiện có, không cam kết latency mới cho mạng mất kết nối. |
| NFR-13 | Local đạt phân lớp/cú pháp | check.js 102 file; Service dùng Store thay thế | Driver/SQL/transaction ở Store; script chỉ gọi Service. |
| Tính nguyên tử và schema | Local đạt migration giữ dữ liệu/idempotent/kiểm sai kiểu | migration 006 legacy preserved; incompatible column refused | Chưa áp migration database nghiệp vụ hoặc xác minh MySQL 8 mốc mới. |
| US-C02 AC1/AC2, tự chạy và chất lượng nội dung | Chưa mở rộng | Hồi quy pipeline mock cũ | Không nhận đã có worker lấy hàng đợi, dịch/TTS thật hoặc đủ ngôn ngữ. |

## Bằng chứng kiểm thử

**372 test local đạt, 0 lỗi**, kiểm tra cú pháp/phân lớp **102 file JavaScript đạt**. Thêm 22 test: 8 unit về cấu hình/gia hạn/phục hồi/CLI và 14 SQL/tích hợp tiến trình. Hồi quy auth/POI/job/CASH/ONLINE/văn bản/audio/media vẫn chạy.

Test SQL dùng database ngẫu nhiên riêng; legacy fixture tạo trước migration 006. Test tạo tiến trình Node riêng, gia hạn thực trong SQL lâu hơn hạn ban đầu, xác nhận không thu hồi; sau đó tạo worker khác, kill đúng tiến trình test, đợi hạn SQL hết, apply FAILED, nhân viên retry hoàn tất bằng pipeline mock và chặn claim cũ. Không kill dịch vụ hay worker của người dùng. Lệnh CLI thực tế cũng được chạy với cwd/env/database test để kiểm chứng default dry-run và --apply.

Ca tranh chấp giữ heartbeat transaction chưa commit trong khi snapshot scanner thấy hạn cũ đã hết; sau khi heartbeat commit, scanner lấy khóa và đọc lại hạn mới, bỏ qua. Ca đảo chiều xác nhận heartbeat cũ không hồi sinh được job đã bị thu hồi. Test lỗi audit và mất xác nhận commit chứng minh mỗi job không bị thu hồi/ghi audit lặp.

Local SQL **MariaDB 10.4.32**; media và tiến trình thật trong môi trường test, Redis của luồng cũ dùng thay thế. RUN_DB_TESTS=1, RUN_REDIS_TESTS=0; 15 ca Redis thật riêng chưa bật, skipped=0 không chứng minh đã chạy các suite tắt. Pipeline mock vẫn không phải bản dịch/giọng đọc thật.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-lease-full-7b320954557445e6ae35580a7bba167f\all-tests.log`.

Mốc 15 **chưa commit/push**, chưa có CI/MySQL 8 cho thay đổi mới. Không lấy CI xanh ca21731 thay bằng chứng cho code hiện local. Không sửa Word/frontend/ERD, không chạy phục hồi hoặc migration trên database nghiệp vụ.

## Báo cáo cần cập nhật sau khi duyệt

1. 4.4.4 j và ERD CONTENT_JOBS: thêm lease_expires_at DATETIME(3) nullable, UTC, cùng claim_id; NULL ở legacy cần đối soát, không suy ra đã hết hạn để tự reset.
2. UC-13 E4/A3: job hết lease có thể chuyển FAILED/CONTENT_WORKER_INTERRUPTED cùng audit; nhân viên retry chỉ bản hiện hành, cùng row, lượt/hạn mới. Không ghi tự động phục hồi toàn bộ hoặc quét hàng đợi đã làm.
3. 4.2–4.3: vòng đời heartbeat, Service/Store, thứ tự khóa và kiểm quyền trước ghi; worker trễ gia hạn mất quyền dù còn sống.
4. Cấu hình và giả định triển khai: 120/15 là quyết định người dùng cho code, cấu hình được; không tự coi giảng viên đã duyệt. Ghi quy trình migration 006, dừng worker cũ và đối soát job legacy.
5. AUDIT_LOGS/kiểm thử: RECOVER_CONTENT_JOB, actor NULL, batch không nguyên tử toàn cục, dry-run mặc định; bằng chứng kill tiến trình và race SQL, giới hạn local/CI.

Nguồn và độ tin cậy: báo cáo Word 8 đọc lại, xác nhận trực tiếp về lease 120/15 và migration, code/372 test local; phân biệt phục hồi theo quyền xử lý với phát hiện tuyệt đối tiến trình chết và chức năng chưa triển khai.
