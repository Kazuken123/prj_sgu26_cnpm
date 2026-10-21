# Piper TTS cục bộ — mốc tích hợp và kiểm thử riêng

Nguồn yêu cầu: CNPM_BAOCAO (8).docx — Thảo Cầm Viên. Đã đọc lại 1.6.2, US-C02 AC1–4, US-F02 phần POI, QT-07/08/12, NFR-09/10/11/13, UC-13/05, thiết kế 4.2/4.3 và các bảng POI_TRANSLATIONS/AUDIOS/CONTENT_JOBS ở 4.4.4. Nền 7e59170 có CI đúng SHA 8/8 xanh trước khi sửa.

Người dùng duyệt Piper chạy cục bộ, ưu tiên không có phí API, giữ WAV, chỉ tích hợp/kiểm thử trong mốc này. **Không chuyển bốn âm thử demo**, không sửa nội dung DRAFT-03, seed, Word, frontend hoặc schema. Không có API key. Máy vẫn phải có tài nguyên CPU/RAM/đĩa; tải image/mô hình cần Internet một lần khi dựng.

## Cách nối và giới hạn

PipelineService gọi PiperTtsAdapter qua hợp đồng `synthesize({text,languageCode,signal})`, giữ nguyên claim/lease/heartbeat/transaction/version của Store. Adapter chạy hai tiến trình con trực tiếp, không shell: Python/Piper tạo PCM mono16bit 22050Hz; FFmpeg chuyển thực sự sang PCM mono16bit16000Hz; adapter thêm header WAV đúng kích thước và kiểm bằng inspectWav hiện có. Không thay header để giả sample rate, không mở endpoint công khai hoặc dịch vụ TTS thường trực mới.

Chỉ hỗ trợ `vi` và `en` trong mốc này. Mô hình VI vais1000-medium và EN ljspeech-medium, manifest khóa revision/checksum/kích thước. Bộ cài chỉ chạy lúc build image riêng; không tự tải mô hình trong lúc nhận job. File model/config thiếu hoặc không đúng sample rate/số speaker khiến cấu hình bị từ chối trước khi worker polling.

`--mock` giữ nguyên hành vi mô phỏng. `--piper` là lựa chọn tường minh, không được dùng cùng `--mock`, concurrency bắt buộc 1 để giới hạn tiến trình/model đang chạy. CLI nạp mô hình mỗi lần gọi nên có chi phí khởi động; chưa đo tải nhiều worker. Giới hạn này áp dụng mỗi worker, không phải toàn bộ hệ thống nếu vận hành tự bật nhiều worker.

Chế độ Piper **không gắn MockTranslation**. Pipeline tái sử dụng văn bản READY, đúng phiên bản và đủ trường; tiếng Việt dùng nguồn, EN dùng bản đã chuẩn bị. Thiếu bản dịch thì job FAILED với mã an toàn hiện có, không tự tạo bản EN giả hoặc thay bản đã duyệt bằng nhãn mock. Chưa tích hợp dịch máy thật, chưa công bố hỗ trợ đủ ngôn ngữ theo PRD.

Timeout cấu hình `PIPER_TIMEOUT_MS`, mặc định 60000ms, miền 1–120000ms; đây là giới hạn kỹ thuật của mốc thử, không phải chỉ tiêu được giảng viên chốt. Hai tiến trình dùng chung ngân sách adapter; timeout của Pipeline vẫn được áp dụng. Dữ liệu đọc tối đa 65535 byte UTF-8, đầu ra WAV tối đa10MiB theo hợp đồng media hiện có. Giới hạn đầu ra PCM ở cả hai tiến trình; stderr bị drain, không chuyển lỗi provider/path/nội dung ra log hoặc API. Tiến trình con chỉ nhận môi trường hệ thống tối thiểu, không kế thừa JWT/DB password.

Hủy/timeout/đầu ra quá lớn gửi SIGTERM rồi SIGKILL sau250ms nếu chưa dừng; đợi close trước khi adapter trả lỗi. Đây là kiểm soát khi tiến trình Node còn hoạt động; không tuyên bố xử lý được mọi trường hợp OS treo hoặc kill cưỡng bức máy chủ. Nhánh FAILED/retry và chặn worker cũ vẫn qua Pipeline/Store. Mất lease không cấp quyền ghi muộn, dù provider đã tính xong audio. Không tự retry provider vô hạn.

Chỉ công bố audio sau khi dữ liệu PCM/WAV hợp lệ, lưu file thành công và SQL chấp nhận claim/version hiện tại. Audit giữ hợp đồng cũ `provider=ADAPTER` đối với provider thật; sự kiện khởi động worker ghi `provider=PIPER`. Không mở rộng audit/schema trong mốc này.

## Runtime tùy chọn và cách khởi động

Không sửa Dockerfile mặc định hoặc Compose đang chạy demo. Dựng `backend/Dockerfile.piper` từ **bản sao ngoài OneDrive**, đã loại `.git`, `node_modules` và `.env` thật:

```text
docker build -f backend/Dockerfile.piper -t tcv-piper-worker:local .
```

Image này chỉ dành cho worker. Nó cài Python/Piper1.8.0, FFmpeg, dependency Node hiện có và hai mô hình có nguồn. Không chép mô hình126MB vào Git. Phiên bản engine và revision/checksum model được khóa; các phụ thuộc Python đã khóa trong piper-requirements.txt; gói hệ điều hành vẫn được trình quản lý gói giải quyết tại build, không tuyên bố image tái lập bit-for-bit. Lưu phiên bản runtime khi kiểm thử. Cần giữ nguồn/giấy phép khi chia sẻ runtime/model.

Mẫu cấu hình không có bí mật: `backend/runtime/piper.env.example`. Cấu hình DB riêng và MEDIA_ROOT riêng, dùng cùng kho file với API đọc audio **của môi trường được duyệt**. Không trỏ thử vào DB demo/cũ. Khi đã có runtime:

```text
npm run jobs:worker -- --piper
npm run jobs:worker -- --piper --poll-ms 1000 --shutdown-ms 30000
```

Ctrl+C/SIGTERM dừng nhận mới, đợi job đang chạy theo cơ chế worker đã có. Chọn shutdown deadline phù hợp với thời gian tổng hợp thực tế; mặc định30s có thể ngắn hơn một lần tổng hợp60s. Hết deadline, worker thoát lỗi và giữ claim để đối soát/phục hồi lease, không ép ghi COMPLETED/FAILED khi chưa rõ SQL. Worker không tự nhận lại job COMPLETED hoặc reset toàn bộ PROCESSING. Không chạy lệnh migrate/init trên DB đang có dữ liệu chỉ để thử Piper.

## Chưa chuyển dữ liệu demo

Đổi adapter không tự làm lại audio AVAILABLE hợp lệ; job COMPLETED không được dùng API retry dành cho FAILED. Theo QT-08, mốc này giữ nguyên cơ chế tái sử dụng. **Không xóa âm thử, giả sửa script, tăng version hoặc tự reset job để lách tái sử dụng.** Sau khi adapter được chốt, cần thiết kế riêng cách chuyển đúng bốn âm thử demo có nguồn sang giọng đọc, bảo toàn văn bản/dữ liệu cũ và có đối soát/audit; chưa triển khai bước đó.

File WAV dài hơn âm thử được engine tạo không tự chứng minh đọc đúng, đủ hoặc phát âm hay. Cần người dùng nghe rà bốn bản VI/EN, đối chiếu kịch bản DRAFT-03; chưa nghiệm thu chất lượng NFR-10, trình duyệt di động/MP3 hoặc toàn bộ US-C02 AC2.

Ngày22/10/2026, người dùng đã nghe mẫu và chấp nhận bốn bản cho demo: giọng Anh ổn, giọng Việt hơi khó nghe nhưng trong ngưỡng chấp nhận. Đây là duyệt mẫu demo của người dùng, không thay kiểm chứng NFR-10 trên toàn bộ dữ liệu/ngôn ngữ hoặc nghiệm thu chính thức. Bốn âm thử trong database demo vẫn chưa chuyển sang các giọng đọc này.

## Đối chiếu yêu cầu

| AC / QT / NFR | Phạm vi mốc này | Test chứng minh | Giới hạn |
| --- | --- | --- | --- |
| US-C02 AC1/AC3; UC-13 | Nối provider vào worker/job hiện có, lỗi và explicit retry | actual CLI worker…; provider failure records safe FAILED… | Không thay API quản trị hoặc dịch máy |
| US-C02 AC2; QT-07; NFR-10 | Tạo WAV từ VI/EN đã có READY | creates four speech WAVs from unchanged DRAFT-03… | Chưa nghe nghiệm thu; chỉ hai POI/ngôn ngữ trong fixture; không thay bốn âm thử demo |
| US-C02 AC4; QT-08; NFR-09 | Giữ tái sử dụng/claim/version và chặn lượt trễ | two claimants…; delayed Piper result…; restart preserves files; hồi quy pipeline | Không có force-regenerate hoặc sửa schema |
| NFR-11/08 | Tiến trình có hạn chờ/hủy/đầu ra, lỗi an toàn | bounded child…; deadline force-kills…; external abort…; spawn failure… | Kiểm thử tiến trình/Linux; chưa đo tải lớn |
| UC-05 phần tải; US-A04 | Bundle/media kiểm token khi tải giọng đọc | MockGateway -> guest token -> VI/EN bundle -> actual speech… | Chưa kiểm giao diện/phát/seek/thiết bị; WAV là ngoại lệ đã duyệt |
| NFR-13; 4.2/4.3 | Adapter lo provider; Service/Store nghiệp vụ cũ | Lint dependency; unit + MySQL/Redis/HTTP | Không SQL trong adapter hoặc Service |

Kiểm thử provider thật được bật tường minh bằng `RUN_PIPER_TESTS=1`, cùng RUN_DB_TESTS/RUN_REDIS_TESTS. Suite này cần runtime/model; CI mặc định không có Piper nên không chạy suite provider thật, vẫn chạy unit/process-boundary và toàn bộ regression mock. Không dùng CI mock để tuyên bố đã thử model thật.

## Kết quả bản cuối

**545/545 test backend đạt, 0 lỗi, 0 hủy, 0 bỏ qua**, lint **147 file JavaScript**, mã thoát0; Node20.20.2, MySQL8 và Redis thật. Có bật suite Piper thật, không dùng âm thử thay bằng chứng model. Tăng15 test so với nền530 (9 unit/tiến trình và6 ca provider/SQL/HTTP). Lượt tập trung trước đó24/24 đạt, gồm9 hồi quy worker. Sau lượt tập trung bổ sung preflight executable và khóa phụ thuộc Python; toàn bộ545 test xác minh bản cuối có các thay đổi này. Không sửa runtime/code sau lượt hồi quy cuối, chỉ bổ sung tài liệu.

Piper1.8.0, Python3.11.2, FFmpeg5.1.9; hai checksum model khớp manifest. Suite Piper thật bản cuối đạt6/6; tạo bốn file WAV từ DRAFT-03 trong database UUID thử riêng, giữ nguyên VI/EN; restart không tái tạo audio đã xong. Tranh job, provider lỗi/retry, thiếu EN, trả kết quả sau mất lease và HTTP MockGateway→token→bundle VI/EN→audio có xác thực đều đạt. Đây không phải bằng chứng nghe nghiệm thu chất lượng hoặc demo trên thiết bị thật.

Hồ sơ ngoài repo: `C:\Users\Admin\Documents\Codex\TCV_TTS_STAGE1_20261021\KET_QUA_PIPER_STAGE1.md`. Log `evidence/full-final.log`, `targeted-1.log`, `runtime-versions.log`, SHA256 bản source và `speech-files.json`; bốn WAV mẫu trong `evidence/piper-audio/`. Không init/thay dữ liệu/container/volume demo; hai dịch vụ SQL/Redis thử được dừng sau kiểm chứng. Chưa commit/push, chưa CI cho mốc mới; không lấy CI xanh của nền làm CI mốc này.
