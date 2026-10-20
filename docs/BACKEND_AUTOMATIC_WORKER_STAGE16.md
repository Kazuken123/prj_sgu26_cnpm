# Mốc 16 — Worker tự nhận PENDING, phạm vi mock

## Yêu cầu và ranh giới

Đọc lại trực tiếp CNPM_BAOCAO (8).docx — Thảo Cầm Viên trước code: mục 1.6.2; US-C02 AC1–AC4, US-F02 AC1/AC3, US-16/17; QT-07/08/12; NFR-08/09/11/13; UC-13 gồm luồng chính, A1–A5, E1–E4, tiền/hậu điều kiện; kiến trúc 4.2–4.3 và bảng/ràng buộc nội dung ở 4.4.4.

CI của commit nền L01 **e11fb2a49ddfb0e5da1812ff92dfa4e95fbd672f** đã completed/success: https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39403218699 . Đây không phải CI cho worker chưa commit.

Mốc này nối tự nhận job vào PipelineService.runJob đã có. Không sửa schema/migration, Word, frontend; không thêm Redis queue, cron, container/service Compose hay provider thật. claim_id, lease_expires_at và chính sách 120 giây/15 giây là những thay đổi đã được duyệt từ mốc trước, không tự đổi lại.

## Luồng và kiểm soát đồng thời

Worker gọi PipelineService.pendingJobs(limit) → ContentJobStore.listPending(limit). SQL chỉ chọn PENDING, thứ tự created_at rồi job_id, giới hạn bằng tham số; không giữ khóa job khi lập danh sách. Danh sách này chỉ là ứng viên, chưa cấp quyền xử lý.

Mỗi ứng viên đi qua runJob → claimJob hiện có, transaction khóa POI trước job, kiểm tra phiên bản nguồn và chuyển PENDING → PROCESSING với claim/lease mới. Chỉ caller claim thành công mới gọi dịch/TTS. Nhiều worker có thể thấy cùng ứng viên nhưng không được cùng ghi kết quả. Không dùng SKIP LOCKED trên job để đảo thứ tự khóa đã có.

Mỗi vòng đợi toàn bộ batch kết thúc rồi nghỉ pollMs. Mặc định một job đang xử lý, tối đa bốn **mỗi tiến trình**; hai tiến trình có tổng giới hạn bằng tổng cấu hình của chúng. Không tạo hàng nghìn Promise hoặc lấy thêm batch khi batch cũ chưa xong. Cách này đơn giản, có thể giảm thông lượng khi một job chậm; phù hợp mốc nhỏ, chưa phải bộ lập lịch tối ưu/fairness hay chứng minh chịu tải.

Pipeline giữ heartbeat, timeout adapter, tái sử dụng nội dung/audio và mọi kiểm tra claim/lease/source_version ở điểm ghi. Không tạo luồng ghi kết quả thứ hai. Log worker chỉ gồm event, jobId, outcome hoặc mã lỗi cố định; không ghi claim, nội dung provider hoặc lỗi driver.

## Khởi động và dừng

Điều kiện: database đã có migration đến 006; cấu hình DB thử được cấp qua môi trường; MEDIA_ROOT tuyệt đối, là kho media riêng ngoài public và cùng nơi API media đọc. Không chạy init_db.sql để nâng cấp database đã có dữ liệu. Khi kiểm thử dùng bản sao ngoài OneDrive, bỏ .git/node_modules/.env thật và sử dụng dependency thử đã có.

Chạy từ backend của bản sao/môi trường đã cấu hình:

```text
npm run jobs:worker -- --mock
npm run jobs:worker -- --mock --concurrency 2 --poll-ms 1000 --shutdown-ms 30000
```

Phải có --mock; thiếu cờ, cờ lạ/lặp, số ngoài giới hạn làm lệnh thoát 1. Không có cấu hình bí mật trong lệnh mẫu. Worker là tiến trình riêng dùng chung code và DB với API, không tự khởi động cùng server. Trong môi trường có quản lý tiến trình, cấu hình chính lệnh Node này, không thêm thành phần vận hành trong mốc này.

Ctrl+C/SIGINT hoặc SIGTERM gửi **đến tiến trình Node worker**: ngừng nhận ứng viên mới, đánh thức lúc đang nghỉ, chờ job đã nhận và heartbeat kết thúc rồi đóng pool. Shutdown mặc định tối đa 30000 ms, cấu hình 1000–120000 ms. Hết thời gian thì thoát 1, không ép ghi FAILED hay sửa quyền khi SQL chưa rõ kết quả. Thời hạn dừng bao gồm chờ đóng pool. Các lệnh chạy trong container cần chuyển signal tới worker, không dừng cả API nếu chưa được giao.

concurrency: 1–4; poll-ms: 100–60000, mặc định 1000. Giới hạn này là lựa chọn vận hành của mốc worker, không phải số liệu nghiệp vụ/hiệu năng đã được giảng viên nghiệm thu. Không thêm dependency.

## Restart, lỗi và retry

Restart chỉ tiếp tục chọn PENDING. Không reset tất cả PROCESSING; không tự nhận lại claim còn hạn, không tự sửa job legacy thiếu lease.

Khi process bị kill: giữ dữ liệu SQL/audio đã commit. Sau khi lease hết, vận hành dùng lệnh đã có từ mốc 15:

```text
npm run jobs:recover -- --limit 100
npm run jobs:recover -- --apply --limit 100
```

Lệnh đầu dry-run. Lệnh apply chỉ chuyển job hết lease sang FAILED/CONTENT_WORKER_INTERRUPTED, ghi audit và xóa claim/lease theo cơ chế đã kiểm chứng. STAFF/ADMIN sau đó retry job FAILED của phiên bản hiện hành qua POST /api/admin/content-jobs/:id/retry, worker đang chạy sẽ tự thấy PENDING. Không có lịch recovery tự động và không có retry provider vô hạn. Job legacy chỉ được báo đối soát.

Lỗi dịch/TTS được PipelineService chuyển FAILED với mã đã duyệt. Khi SQL hoặc commit không rõ kết quả, worker chỉ báo CHECK_REQUIRED và đọc trạng thái ở các vòng sau, không đoán thành công, không gọi driver hoặc tự ghi đè trạng thái. Nếu danh sách tạm lỗi, ghi mã an toàn và chờ vòng poll sau. Dừng worker không thu hồi vé/token, không thay đổi thanh toán.

## Mock không phải nội dung thuyết minh đã nghiệm thu

MockTranslation chỉ gắn tiền tố [MOCK ngôn ngữ] vào nguồn, không phải dịch thật. MockTts tạo WAV **âm thử một giây**, không phải giọng đọc. Tiếng Việt dùng nguồn, không dịch lại. Mốc này chứng minh pipeline sinh/tái sử dụng text và file đúng trạng thái, không chứng minh nội dung phù hợp ngôn ngữ hoặc chất lượng nghe. US-C02 AC2/NFR-10 về ma trận POI–ngôn ngữ và chất lượng thực tế chưa đạt đầy đủ.

## Đối chiếu và bằng chứng

- US-C02 AC1, UC-13 bước 6–7: nối phần tự xử lý nền sau lưu; integration “automatically consumes VI/EN PENDING…” kiểm tra tạo POI qua Service → tự xử lý hai job → text/audio. Hồi quy POI giữ quy tắc sửa metadata không sinh lại job.
- US-C02 AC3, UC-13 A3/E4, NFR-09: integration “SIGKILL interruption survives restart…” kiểm process thật bị kill, process khởi động lại xử lý PENDING khác, recovery rồi retry chính row cũ. Job legacy và recovery cạnh tranh được bộ mốc 15 kiểm tra lại trong toàn bộ test.
- US-C02 AC4, QT-08: integration “two automatic workers seeing identical candidates…” kiểm audit claim/complete đúng một lần; “an old automatic worker cannot publish…” giữ provider cũ, hết lease, retry/lượt mới hoàn tất rồi trả kết quả cũ, không được ghi đè. Bộ audio/translation/lease hiện có giữ kiểm tra phiên bản nguồn và audio hiện hành duy nhất.
- QT-07, US-C02 AC2: đúng cơ chế dùng nguồn Việt, tạo kết quả mock VI/EN; chưa chứng minh chất lượng dịch, giọng đọc hoặc đủ ngôn ngữ công bố.
- QT-12, US-F02 AC3: tái sử dụng audit ở Store/transaction và quyền retry hiện có. Worker không mở API hoặc tự đóng vai STAFF/ADMIN.
- NFR-08: unit “job failure or unknown commit…” và “polling errors are safe…” kiểm log không lộ lỗi provider/driver; CLI chỉ xuất mã cố định.
- NFR-11: unit giới hạn concurrency, dừng/drain, poll lỗi rồi hồi phục; “CLI exits nonzero at the shutdown deadline…” dùng process thật và poll/socket giả lập bị kẹt, gửi SIGTERM rồi xác nhận stop_timeout/exit 1; integration timeout TTS và retry; hồi quy adapter timeout/failure hiện có. Không đưa ra cam kết latency SQL mới.
- NFR-13, US-16: kiểm tra cú pháp/import và unit Store/Service; SQL/driver vẫn ở Store, adapter qua PipelineService. Script chỉ làm lắp ghép và vòng đời pool.
- US-17: toàn bộ lint/test ngoài OneDrive dùng MySQL/Redis thật. Kết quả cụ thể ghi khi hoàn tất bên dưới; chưa commit/push/CI worker.

## Kết quả thực thi

Kiểm thử riêng lần đầu: 14/14 đạt, không lỗi/bỏ qua; sau đó siết thêm kiểm cờ CLI và dọn timer kiểm thử, cả bộ đạt 408/408. Bổ sung ca lỗi dừng quá hạn rồi chạy lại toàn bộ bản cuối trên Node v20.20.2, MySQL 8.0.46 và Redis 7.4.11: **409/409 đạt, 0 lỗi, 0 bỏ qua, 0 hủy, 20 suite; 42.844 giây**. Lint đạt **110 file JavaScript**. So với nền L01 394 test, mốc này thêm 15 test (9 unit/CLI và 6 integration).

Bằng chứng ngoài repo: `C:\Users\Admin\AppData\Local\Temp\tcv-acceptance-6940803-20261020\evidence\worker-final-tests.log` là bản cuối; `worker-all-tests.log`/`worker-targeted.log` là hai lần trước. Không lấy CI nền L01 thay cho worker: mốc này chưa commit/push/CI, chưa chạy Node 22 hoặc coverage mới, chưa rebuild image/release hoặc đo tải. Thử dừng cưỡng bức dùng poll/socket mô phỏng, không làm nghẽn MySQL thật; chưa có phép thử riêng kẹt pool.end hoặc reboot/recreate worker.

Môi trường thử: bản sao trong thư mục nghiệm thu riêng ngoài OneDrive, dùng image/dependency/cấu hình thử đã có. Test mới tạo database tcv_auto_test_<UUID> và kho media tạm riêng; init chỉ áp trên database vừa tạo. Giữ database thử mới làm bằng chứng, không xóa DB/container/volume cũ. Các test cũ dùng hook nghiệm thu giữ DROP DATABASE teardown. Không áp migration/khởi chạy worker trên database nghiệm thu có POI của lần trước.

## Mốc tiếp theo cần người dùng chốt

Chuẩn bị 2–3 POI Thảo Cầm Viên với nguồn rõ và phạm vi VI/EN để minh họa; tách nguồn thật khỏi dịch/audio mock. Sau đó thiết kế bundle tối thiểu qua API khách có xác thực theo Word, không dùng API quản trị cho khách. Cần chốt xử lý tour mẫu và fallback đúng AC trước code bundle, không âm thầm bỏ trường bắt buộc. Frontend được giao riêng để nối MockGateway → token → bundle → POI → đọc → nghe audio có xác thực. Chưa triển khai các mục này trong mốc worker.
