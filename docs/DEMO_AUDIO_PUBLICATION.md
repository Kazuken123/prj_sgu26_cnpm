# Chuyển riêng bốn audio demo và quay lại

Nguồn chính: Word8 Thảo Cầm Viên, đọc lại UC-13/05, US-C02 AC1–4, QT-07/08/12, NFR-09/10/11/18, 1.6.2, 4.2/4.3 và POI_TRANSLATIONS/AUDIOS/CONTENT_JOBS trong4.4.4. Nền29305d2 có CI đúng SHA8/8 xanh trước mốc này.

Ngày22/10/2026, người dùng duyệt ngoại lệ chuyển **đúng bốn âm thử demo sang bốn file Piper đã nghe**, giữ job COMPLETED/source_version và file cũ, có audit/quay lại. Đây không phải API force-regenerate cho UC-13: UC-13 vẫn chỉ retry FAILED; QT-08 vẫn tái sử dụng kết quả hợp lệ. Không giả sửa nguồn, tăng version, reset job hoặc gọi lại TTS. Không schema/migration, Word/frontend hay hành vi seed mới.

## Giữ việc thay đổi sau họp nhóm đơn giản

Giọng đọc là file riêng, không nằm trong logic thanh toán/token/bundle. Phát hành dùng UUID URL mới, giữ file cũ và lưu đủ metadata/hash trong kế hoạch và audit. Có thể quay lại theo kế hoạch cũ nếu dữ liệu vẫn khớp. Thay giọng sau này cần tạo/nghe duyệt bộ mới và một mốc phát hành mới; công cụ hiện chỉ cho chuyển âm thử chuẩn sang đúng bốn mẫu đã duyệt, không cam kết tự phát hành mọi giọng/mô hình tùy ý. Chuyển MP3/ngôn ngữ/nội dung là thay đổi phạm vi cần rà riêng.

## Hợp đồng công cụ

Chỉ CLI của người vận hành, không có HTTP endpoint. `publish-demo-audio.js` → DemoAudioService → DemoAudioStore. Store kế thừa transaction/physical DB guard/GET_LOCK của DemoSeedStore và chỉ thêm thao tác audio; không sửa mã hay hành vi seed. Media qua LocalMediaStorage, không SQL trong CLI/Service.

Cần bản sao repo ngoài OneDrive có cả `backend`, `database`, `data/demo/draft03.json` và `data/demo/piper-reviewed`. Dependency thử/Node chuẩn bị ngoài OneDrive. Nếu chạy bằng image backend mặc định, gắn bản sao này vào `/work`, đặt NODE_PATH=/app/node_modules và chạy script từ `/work/backend`; không giả định image cũ đã chứa tool/data mới. MEDIA_ROOT phải là kho media riêng của đúng demo; ứng viên không nằm trong frontend/public. Cấu hình DB được cung cấp riêng, không đọc/in `.env` thật hoặc bí mật.

```text
node backend/scripts/publish-demo-audio.js --database tcv_demo_review_20261020 --plan data/demo/piper-reviewed/manifest.json --output /path-outside-repo/audio-plan.json
node backend/scripts/publish-demo-audio.js --database tcv_demo_review_20261020 --apply /path-outside-repo/audio-plan.json
node backend/scripts/publish-demo-audio.js --database tcv_demo_review_20261020 --rollback /path-outside-repo/audio-plan.json
```

Ví dụ đường dẫn cần thay theo hệ điều hành/môi trường; không có mật khẩu/token trong lệnh. DB_NAME phải khớp đích tường minh trước khi import pool; Store kiểm SELECT DATABASE() thực sự. CLI chỉ nhận đích demo trên; Service cho thêm database fixture `tcv_seed_test_<UUID>` để kiểm thử riêng, không cho target sản xuất. Không chạy init/migration/seed vào DB đang có dữ liệu để chuyển audio.

`--plan` chỉ đọc: đối chiếu dấu nhập duy nhất và digest của DRAFT-03; toàn bộ POI/VIEN/tour/thứ tự/IDs phải khớp; bốn job COMPLETED, không claim/lease còn giữ; bốn audio hiện hành phải đúng file âm thử một giây có hash đã kiểm chứng. Đọc/kiểm file ứng viên đúng nhãn và SHA256 trong bản manifest đã duyệt. Kế hoạch có operationId, digest nguồn, metadata/hash cũ và mới; ghi file mới bằng wx để không đè kế hoạch trước.

`--apply` kiểm hash/file trước, chép ứng viên dưới UUID mới bằng chế độ không ghi đè. Sau đó lấy khóa dataset, đọc lại nguồn/metadata; chỉ khi tất cả còn khớp mới cập nhật đồng thời bốn bản ghi AUDIOS và ghi PUBLISH_DEMO_AUDIO trong cùng transaction. Không sửa POIS/POI_TRANSLATIONS/CONTENT_JOBS/TOURS/TOUR_POIS, kể cả version/trạng thái job. Gửi lại cùng kế hoạch sau commit trả UNCHANGED và không thêm audit. Nguồn/audio bị đổi thì409, không ghi đè.

`--rollback` yêu cầu audit phát hành cùng operationId/digest, metadata hiện tại phải đúng bốn audio mới và file cũ còn nguyên hash. Khôi phục đồng thời bốn tham chiếu cũ + audit ROLLBACK_DEMO_AUDIO, giữ cả hai bộ file. Gửi lại rollback là UNCHANGED. Không phát hành lại bằng cùng operationId đã rollback; cần kế hoạch/duyệt mới để tránh retry cũ đảo lại quyết định.

Không xóa file, kể cả khi SQL/audit thất bại hoặc mất xác nhận commit. Lỗi chưa rõ trả503 DEMO_AUDIO_UNAVAILABLE, giữ plan/operationId và đối soát audit trước khi thử lại. File ứng viên chưa được tham chiếu có thể được giữ để đối soát, không tự GC. Một số thao tác lỗi vẫn có thể để lại file ứng viên trong MEDIA_ROOT; không có nghĩa đã phát hành khi chưa có audit/metadata cùng transaction.

Hai action mới được bổ sung vào bộ lọc UC-17. Projection chỉ hiện operationId/digest/provider/audioCount/rollback; không trả nguyên kế hoạch rollback hoặc các trường lạ. Audit lưu actor hệ thống NULL như công cụ seed/worker hiện có, có mã duyệt để truy vết; không giả đây là thao tác HTTP có đăng nhập ADMIN. Không log mật khẩu/token.

Khách cần tải bundle mới để nhận UUID audio mới; bundle đã tải không tự bị thay trong trình duyệt. URL cũ không còn được metadata hiện hành công bố sẽ bị API từ chối, dù file vật lý được giữ để quay lại. Không tuyên bố thu hồi bản audio đã tải về máy khách.

## Đối chiếu và bằng chứng

| AC / QT / NFR | Đáp ứng trong mốc | Test chứng minh | Giới hạn |
| --- | --- | --- | --- |
| Ngoại lệ demo đã duyệt; US-C02 AC2 | Phát hành đúng4 mẫu đã nghe, giữ VI/EN | plan is read-only…; apply publishes all four… | Không mở rộng POI/ngôn ngữ/định dạng |
| QT-08; UC-13; NFR-09 | Không reset job/version, nguồn đổi thì chặn; seed không đè speech | stale source…; core before/after; seed UNCHANGED | Không force-regenerate hoặc dịch/TTS mới |
| QT-12; NFR-18 | Audio/audit cùng transaction, idempotency và đối soát | audit failure…; concurrent publishers…; lost commit acknowledgement… | Actor hệ thống, CLI vận hành riêng |
| NFR-10; UC-05 phần dữ liệu | WAV hợp lệ/hash đúng, tải qua API xác thực cũ | kiểm file trong Service; kiểm HTTP demo sau phát hành | Mẫu demo đã duyệt, chưa nghiệm thu toàn hệ thống/mobile |
| Khả năng quay lại | Khôi phục đúng metadata cũ, giữ cả hai bộ file | rollback is atomic/repeatable… | Nguồn/audio đổi về sau thì dừng đối soát, không cưỡng chế rollback |
| Kiến trúc4.2/4.3 | CLI → Service → Store, file qua adapter, không schema | lint và toàn bộ regression | Không sửa frontend hoặc Word |

Log và kết quả cuối nằm ngoài repo: `C:\Users\Admin\Documents\Codex\TCV_DEMO_AUDIO_SWITCH_20261022`. Bộ tập trung19/19 đạt (11 mới và8 audit hồi quy). Bản cuối lint152 file JavaScript đạt; full556/556 đạt, lỗi0/hủy0/bỏ qua0, chạy ngoài OneDrive với MySQL8, Redis7 và Piper thật được bật. `evidence/source-sha256.txt` đối chiếu mã/data trong repo và bản đã kiểm thử; `evidence/full-final.log` lưu log đầy đủ.

## Phát hành demo thực tế ngày 22/10/2026

Đã áp dụng trên đúng `tcv_demo_review_20261020`, operationId `340c5fd7-6895-4fa4-b820-043491e13c3e`; lần đầu PUBLISHED4 audio, gửi lại UNCHANGED. Không chạy lại seed/init/schema hoặc thay bản frontend đang chạy. Bốn job vẫn COMPLETED/version1; digest POI/nội dung VIEN/tour trước–sau khớp. Bốn âm thử cũ giữ nguyên trong volume và có bản sao bên ngoài; rollback đã kiểm thử trên DB fixture, chưa thực hiện trên demo vì đang giữ bộ Piper đã duyệt.

Metadata thời lượng làm tròn lên: Hươu VI12s/EN19s, Voi VI13s/EN19s; trình duyệt có thể hiện thời lượng chính xác khác phần giây lẻ. HTTP trên chính demo đạt23 kiểm tra, tải cả4 WAV với hash khớp manifest; kiểm mã trước thanh toán, mã đã dùng, token thiếu/sai, khách vào API nhân viên và URL audio cũ đều bị từ chối đúng. Có tạo giao dịch/phiên mô phỏng để kiểm chứng, không thu tiền thật. Bằng chứng `release/http-verification.json`, `inventory-before.json`, `inventory-after.json`, `evidence/demo-apply.log`, `evidence/demo-replay.log`.

Trình duyệt đã đi từ khởi tạo MockGateway → webhook công cụ vận hành → nhận quyền → bundle VI/EN → phát giọng Việt và Anh; ảnh `evidence/browser-audio.png` ghi PLAYING/tiến độ. Chưa nghiệm thu mobile, GPS, đường đi, MP3 hoặc chất lượng thuyết minh toàn sản phẩm.

Giới hạn giao diện cần bàn giao riêng: frontend hiện ghi cứng “âm thử MOCK một giây” và “Audio MOCK”, nên nhãn chưa phản ánh bốn file Piper mới. Không sửa frontend trong mốc này. Backend thường trực vẫn dùng image preview cũ; tool phát hành mới chạy một lần từ bản sao repo gắn read-only. Hai bộ lọc audit/projection mới chỉ có hiệu lực trên API khi triển khai bản code chứa thay đổi này, không tuyên bố image cũ đã được cập nhật. Tham chiếu media mới đã có hiệu lực ngay qua API audio cũ.
