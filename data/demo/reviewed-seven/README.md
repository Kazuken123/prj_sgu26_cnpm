# Hươu/Voi — bộ dữ liệu demo bảy ngôn ngữ đã duyệt

Bổ sung `zh-Hans`, `ko`, `ja`, `ru`, `fr` cho hai POI trong [DRAFT-03](../draft03.json), giữ VI/EN. Kết quả dự kiến: 2 POI × 7 ngôn ngữ = 14 bản nội dung và 14 audio. Đây là dữ liệu demo đồ án, chưa đủ yêu cầu 15+ và chưa được người bản ngữ rà độc lập.

## Nội dung trong Git

- `TRANSLATIONS_DRAFT_01.json`: nguyên văn mười bộ tên/giới thiệu/kịch bản đọc đã duyệt, không dịch lại lúc nhập.
- `BAN_DICH_HUOU_VOI_DRAFT_01.md`: bản đọc và hồ sơ nội dung. Nguồn dữ kiện theo bản VI DRAFT-03 và [hồ sơ nguồn](../OSM_SAVED_RECORDS.md); các bản dịch không bổ sung thông tin cá thể/lịch hoạt động.
- `DUYET_NOI_DUNG_DRAFT_01_20261023.json`: hash xác định chính xác bản dịch/nguồn đã duyệt.
- `SOURCE_DRAFT03_REVIEWED.json`: bản nguồn DRAFT-03 dùng khi duyệt, giữ nguyên byte để đối chiếu hash trên Windows/Linux và trong gói phát hành. `.gitattributes` tại đây ngăn Git đổi kiểu xuống dòng của hồ sơ có hash; công cụ vẫn đối chiếu nội dung và phiên bản thực trong DB, không lấy bản lưu làm lý do bỏ qua xung đột nguồn.
- `DUYET_GIONG_DEMO_20261023.json`: quyết định tạm duyệt giọng, Nhật nữ speaker 0; các đường dẫn samples là dấu vết hồ sơ nghe cũ, không phải file bắt buộc của bộ nhập. Không đóng gói các mẫu nghe cũ ở đây.
- `APPROVAL_IMPORT_20261023.json`: cho phép nhập vào database demo riêng sau bước duyệt mẫu.
- `operator/`: chính công cụ nhập đã dùng trên demo, chuyển đường dẫn tuyệt đối trên máy tác giả thành đường dẫn tương đối trong repo.
- `compose.worker.yml`: overlay chọn worker Piper bảy giọng, không bật mock translator.

Giữ nguyên `approved=false`, `sourceVersion=null` và các trạng thái lịch sử trong file nháp. Không sửa file đã duyệt để làm đẹp trạng thái: quyết định duyệt nằm ở các hồ sơ riêng. Công cụ đối chiếu SHA256 với bản duyệt và đọc phiên bản nguồn thực trong DB trước khi ghi. Quyền nhập lần này được ghi trong APPROVAL_IMPORT, khác lần duyệt chỉ để nghe mẫu trước đó.

Tọa độ vẫn là **“Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa.”** Tour Hươu → Voi là **lộ trình demo do nhóm đề xuất**, không phải tuyến chính thức hoặc đường đi thực địa đã nghiệm thu. Tên/mô tả tour dùng chung, không gắn nhãn đã dịch.

Không đưa database dump, tài khoản, mật khẩu, token, model lớn hoặc audio mới sinh từ DB lên Git. Audio mới được worker tạo từ kịch bản đã duyệt bằng runtime [Piper bảy giọng](../../../docs/PIPER_DEMO7.md). Bốn WAV VI/EN đã được duyệt và đóng gói từ mốc trước vẫn ở [piper-reviewed](../piper-reviewed/README.md). Đây là giọng đọc thật; không gọi là âm thử mock một giây. Nội dung dịch thủ công không phải bằng chứng hệ thống tự động dịch.

## Điều kiện trước khi nhập

Dùng bản sao repo đầy đủ **ngoài OneDrive** và cấu hình demo riêng theo [README nền](../README.md). Không dùng .env thật của hệ thống khác, không đọc/in hoặc commit bí mật. Database bắt buộc là `tcv_demo_review_20261020` trong đúng project demo riêng. Không init lại DB đang có dữ liệu hoặc xóa volume.

Máy mới phải hoàn tất mốc DRAFT-03 trước: schema/migration hiện có, seed hai POI VI/EN, một tour, có ADMIN ACTIVE qua bootstrap hiện có và bốn job VI/EN COMPLETED với audio AVAILABLE. Nếu cần cả 14 audio đều là giọng thật, phát hành bốn WAV VI/EN theo [hướng dẫn đã có](../../../docs/DEMO_AUDIO_PUBLICATION.md) trước khi nhập năm ngôn ngữ mới. Công cụ này bảo toàn bốn audio hiện hành, không tự chuyển âm thử thành speech.

Trước khi nhập, **dừng worker mock** của đúng project demo; chưa chạy worker Piper cho đến khi đủ mười bản dịch READY. Không tăng phiên bản nguồn, sửa giả nội dung hoặc reset job COMPLETED để tạo job mới. Công cụ chỉ thêm năm danh mục ngôn ngữ/mười job còn thiếu và gọi TranslationService hiện có; toàn bộ nhập và audit trong cùng transaction. Bản hiện có khác nguồn duyệt, ngôn ngữ tắt, job PROCESSING/FAILED hoặc dữ liệu không khớp sẽ dừng đối soát, không tự sửa.

## Nhập bằng công cụ trong repo

Ví dụ PowerShell chạy ở root bản sao repo ngoài OneDrive, với project mới theo compose mặc định `tcv-browser-demo-draft03`. Nếu đang dùng project khác, phải thêm **đúng `-p` và các override đang chạy** vào mọi lệnh; không nhận nhầm volume của project khác. Env-file phải là cấu hình demo hiện có của project đó, không sinh lại mật khẩu cho volume đã tồn tại.

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml stop worker

$repoSource = (Get-Location).Path.Replace('\', '/')
$evidenceDir = Join-Path (Split-Path -Parent (Get-Location).Path) 'tcv-demo-seven-evidence'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
$evidenceMount = $evidenceDir.Replace('\', '/')
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'

$importArgs = @(
  'compose', '--env-file', 'demo.local.env', '-f', 'compose.demo.yml',
  'run', '--no-deps', '--workdir', '/evidence',
  '-e', 'NODE_PATH=/app/node_modules',
  '-v', "${repoSource}/backend:/work/backend:ro",
  '-v', "${repoSource}/data/demo:/work/data/demo:ro",
  '-v', "${evidenceMount}:/evidence",
  'backend', 'node', '/work/data/demo/reviewed-seven/operator/import.cjs'
)

& docker @importArgs plan "plan-$runId.json"
# Đọc bản plan: đúng hai POI, đúng nguồn/version, thêm tối đa 5 ngôn ngữ/10 job/10 bản dịch.
# Chỉ chạy apply khi đã đối soát plan đúng database/dataset đã duyệt.
& docker @importArgs apply "apply-$runId.json"
& docker @importArgs apply "repeat-$runId.json"
```

Đầu ra kỳ vọng lần đầu `IMPORTED` 10; chạy lại `UNCHANGED` 10. Không ghi đè file evidence đã tồn tại. Báo OPERATION_UNCONFIRMED thì đọc lại DB trước khi gửi lại; không coi lỗi ghi file đầu ra là chắc chắn transaction chưa commit. Evidence chứa nội dung demo và ID vận hành, không cần đưa vào Git.

Nếu đã thêm đủ năm ngôn ngữ trước đó, công cụ yêu cầu tên danh mục khớp hồ sơ này; không tự đổi tên hoặc bật lại ngôn ngữ đang tắt. Nếu đã có READY khác nội dung thì dừng. Đây là bộ nhập riêng cho hai POI/version 1, không phải API thêm ngôn ngữ hoặc seed tổng quát.

## Tạo audio và bàn giao frontend

Build runtime ngoài OneDrive theo [PIPER_DEMO7.md](../../../docs/PIPER_DEMO7.md), dùng tag `tcv-piper-demo7:local`. Sau khi bản dịch đã nhập đủ, bật worker với overlay:

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml -f data/demo/reviewed-seven/compose.worker.yml up -d --no-deps --no-build worker
docker compose --env-file demo.local.env -f compose.demo.yml -f data/demo/reviewed-seven/compose.worker.yml logs --tail 30 worker
```

Worker giữ concurrency 1, tái sử dụng bản READY đúng phiên bản và không gọi MockTranslation. Chờ mười job mới COMPLETED rồi kiểm 14 AUDIOS AVAILABLE và file WAV thật. Audio lỗi phải dùng quy trình xem lỗi/retry hiện có sau đối soát; không tự gán trạng thái AVAILABLE hoặc COMPLETED bằng SQL. Khi bật lại worker, tiếp tục dùng overlay Piper này, không vô tình quay về worker --mock của compose nền.

Frontend nhận token khách, gọi `/api/content/bundle?languageCode=vi` để lấy danh mục `languages`, rồi tải bundle tương ứng khi đổi ngôn ngữ. Kiểm đủ `vi`, `en`, `zh-Hans`, `ko`, `ja`, `ru`, `fr`; text/audio phải đúng mã và `isFallback=false`. Tải `audio.url` kèm `Authorization: Bearer <token khách>`, không gọi API quản trị cho khách. Không đưa token vào URL. Giao diện chọn/phát bảy ngôn ngữ chưa được thay đổi bởi gói dữ liệu này.

**Không chạy lại seed DRAFT-03 cũ sau khi mở rộng rồi ép nó trả UNCHANGED:** guard cũ được thiết kế cho hai ngôn ngữ và có thể từ chối bộ mở rộng. Dùng công cụ nhập bảy ngôn ngữ này để kiểm chạy lặp; không nới guard seed cũ.

## Bằng chứng và giới hạn kiểm chứng

Trên demo local ngày23/10/2026, công cụ gốc đã nhập10/10, replay UNCHANGED trước/sau worker, 14 WAV hợp lệ, giữ bốn WAV cũ, restart không đổi dữ liệu và 75/75 HTTP đạt. Guard công cụ5/5 đạt. Bộ runtime đã có bằng chứng hồi quy riêng. Chi tiết phiên gốc nằm ngoài repo tại TCV_DEMO_7_LANG_IMPORT_20261023/KET_QUA_NHAP_7_NGON_NGU.md.

**Lần đóng gói này chỉ sao chép dữ liệu/công cụ và sửa đường dẫn, theo yêu cầu không chạy lại test.** Đã kiểm tĩnh hash dữ liệu, đường dẫn import và diff; chưa chạy lại quy trình dựng mới từ gói repo này trên máy khác. Không dùng kết quả nhập trước đó để khẳng định các lệnh đóng gói vừa được chạy lại. Chưa nghiệm thu15+, GPS, mobile hoặc chất lượng phát âm độc lập.
