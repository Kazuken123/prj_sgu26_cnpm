# Worker Piper — bộ bảy ngôn ngữ tùy chọn

Nguồn yêu cầu: Word CNPM_BAOCAO (8).docx, 1.6.2, US-C02 AC1–4, QT-07/08/12, NFR-09/10/11/13, UC-13/05, 4.2/4.3/4.4.4. CI nền c3eebb4 xanh 8/8 trước code. Người dùng tạm duyệt mẫu Trung/Hàn/Nga/Pháp và chọn Nhật nữ ngày23/10/2026; đây là duyệt nghe cho demo, chưa thay nghiệm thu chất lượng ngôn ngữ độc lập.

## Phạm vi

Mặc định `PIPER_VOICE_SET=vi-en` giữ manifest/runtime VI/EN hiện có. Chỉ bật `demo7` khi đã dựng đủ bộ giọng và resource; thêm `zh-Hans`, `ko`, `ja`, `ru`, `fr`. Mã Trung giản thể là zh-Hans; không tự đồng nhất với zh/zh-CN/zh-Hant. JA dùng Hi-Fi-Captain nữ speaker0; adapter đối chiếu cả num_speakers=2 và speaker_id_map.female=0, không bỏ kiểm tra số người nói.

Pipeline/Router/Service/Store, claim/lease/heartbeat, retry và phiên bản không đổi. Chỉ tái sử dụng bản READY đúng phiên bản, không gọi MockTranslation trong chế độ Piper. Không tự bật LANGUAGES, tạo job cho POI cũ, tăng source_version hoặc thay audio AVAILABLE. Tích hợp provider không đồng nghĩa bộ demo đủ bảy ngôn ngữ; việc đăng ký ngôn ngữ/job và nhập nội dung thuộc mốc dữ liệu riêng.

## Dựng runtime ngoài OneDrive

Chuẩn bị bản sao repo không .git/node_modules/.env thật, rồi dựng hai image theo thứ tự:

```text
docker build -f backend/Dockerfile.piper -t tcv-piper-worker:local .
docker build -f backend/Dockerfile.piper-demo7 -t tcv-piper-demo7:local .
```

Image thứ hai dựa trên image VI/EN hiện tại; có thể đổi tên bằng build-arg PIPER_BASE_IMAGE. Không thay Dockerfile/Compose mặc định hoặc demo đang chạy. Không commit model/tokenizer vào Git. Image cần Internet lúc build; tải model/resources ghim revision/size/SHA256, model card được giữ trong thư mục model. Python extra/dependency ghim theo bộ đã thử. Gói hệ điều hành vẫn theo image nền, không tuyên bố bit-for-bit reproducible.

Image demo7 đặt PIPER_VOICE_SET=demo7, PIPER_RESOURCE_DIR=/opt/piper-resources; model VI/EN ở /opt/piper-models, năm model mới ở /opt/piper-models/demo7. Cần cấp riêng cấu hình DB, MEDIA_ROOT và kho audio phù hợp **môi trường đã duyệt**, không thử trên DB nghiệp vụ cũ. Worker khởi động như cũ:

```text
npm run jobs:worker -- --piper
```

Không thêm dịch vụ HTTP TTS hoặc cổng vận hành mới. Concurrency Piper vẫn1, timeout hữu hạn cũ. Bộ bảy model không tự làm tăng số job trên mỗi POI đang có.

## Ngoại tuyến và bảo vệ tiến trình

Đường demo7 gọi runtime/piper-synthesize.py bằng tiến trình con không shell; văn bản chỉ qua stdin. Child không nhận JWT/DB secret. Wrapper đặt cache HF tường minh trong resourceDir, bật offline và dùng Python audit hook từ chối socket connect/getaddrinfo/urllib request, kể cả thư viện cố tải tài nguyên thiếu. Lỗi chỉ ghi thông báo cố định; bounded runner không đưa stderr ra API/log nghiệp vụ.

Wrapper gọi PiperVoice.load với download_dir tường minh, khắc phục trường hợp CLI Piper1.8 không truyền --data-dir xuống loader. Không dựa vào cwd/tmpdir hoặc cho phép tải ở lượt xử lý job. Preflight kiểm toàn bộ model/config và phiên âm Nhật/Trung trước khi polling; thiếu dữ liệu/cache/dependency thì startup thất bại an toàn. Preflight có deadline qua bounded runner.

Bộ cài resource tải gói G2PW ghim hash, chỉ giải nén file/thư mục thường trong đích, chặn path traversal/symlink và giới hạn kích thước; từ chối ghi đè thư mục đã có. Tokenizer được cài vào cache local ghim revision, không tải trọng số BERT/PyTorch. Audio vẫn chuyển thực sự từ22050 sang16000Hz mono PCM16 WAV, giới hạn dung lượng/timeout/hủy cũ giữ nguyên.

## Nguồn giọng và giới hạn

Manifest mới piper-demo7-voices.json dùng cùng revision kho rhasspy/piper-voices với VI/EN. Các thư mục nguồn, size và SHA256 nằm trong manifest; card đi kèm sau build.

- Pháp SIWIS: card dataset CC-BY4.0; cần giữ ghi công.
- Nga Denis: card dataset CC0.
- Hàn KSS và Nhật Hi-Fi-Captain: card dataset CC-BY-NC-SA4.0; bộ này hướng tới demo đồ án phi thương mại. Không gọi “miễn phí mọi mục đích” hoặc tự coi đã chốt điều kiện triển khai thương mại.
- Trung Chaowen: card dataset CC0, fine-tune từ Xiao Ya; nguồn nền Xiao Ya ghi điều kiện non-commercial. Giữ truy vết và không khẳng định card CC0 đã tự giải quyết mọi điều kiện checkpoint nền.

Không đổi provider, không dùng Huayan có card dataset Unknown. Giọng nghe chấp nhận được không chứng minh dịch đúng mọi từ hoặc đáp ứng NFR-10/12 trên toàn dữ liệu/thiết bị. Các bản dịch mới được người dùng duyệt ở hồ sơ ngoài repo; không đưa hồ sơ/model lớn vào đây chỉ để chạy test.

## Kiểm chứng

CI mặc định không tải runtime/model, vẫn chạy unit/process mock. Kiểm Piper thật: RUN_PIPER_TESTS=1 cùng RUN_DB_TESTS=1/RUN_REDIS_TESTS=1. Kiểm thêm bộ7: RUN_PIPER_DEMO7_TESTS=1 và PIPER_VOICE_SET=demo7 với runtime/resource đã dựng.

Test bổ sung giữ bảo vệ cấu hình/speaker/phonemizer và đường preflight; bài integration bộ7 dùng DB thử ngẫu nhiên, nhập văn bản thử có nhãn, worker thật, restart giữ kết quả, MockGateway → token → bundle bảy ngôn ngữ đúng mã → WAV có xác thực, không fallback để giả đủ. Không phải dữ liệu demo đã nhập hoặc chứng minh browser phát audio/GPS. Runtime installer có unittest Python riêng: `python -m unittest discover -s runtime -p test_piper_resources.py`.

Với máy/container ít CPU, chạy toàn bộ file test bằng `node --test --test-concurrency=1 tests/*.test.js` sau lint. Cách này chỉ giới hạn số file chạy song song; các ca tranh job/yêu cầu đồng thời trong từng bài vẫn giữ nguyên. Không tăng timeout provider để bù tình trạng quá tải của test runner.

Kết quả chạy thực tế và bảng AC/QT/NFR lưu trong hồ sơ ngoài repo của phiên; không dùng CI của c3eebb4 để báo CI bản TTS chưa commit.
