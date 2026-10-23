# Tám POI bổ sung — VI/EN đã duyệt, vị trí minh họa

Bổ sung Hà mã, Tê giác trắng, Trầm hương, Ngọc lan, Trám trắng, Cát anh, Bảo tàng Động–Thực vật và Quán Nhan Hương. Giữ nguyên Hươu/Voi và tour Hươu → Voi. Mục tiêu của mốc này là **10 POI có VI/EN**, chưa phải 10 POI đủ bảy ngôn ngữ.

**Bước hoàn tất năm ngôn ngữ còn lại:** bộ `languages-five.json` bổ sung40 bản dịch Trung giản thể/Hàn/Nhật/Nga/Pháp theo nguồn VI đã duyệt. Chủ đồ án giao AI rà và nhập demo, sau đó kiểm tra trên web; quyết định/phạm vi và hash nằm trong `languages-five-authorization.json`. Dùng `operator/languages.run.cjs` theo mục cuối để tiếp tục từ30 lên70 bộ nội dung/audio, không thay bản VI/EN hoặc tạo thêm job. Những số40 PENDING ở phần nền bên dưới mô tả trạng thái trước bước này.

`approved.json` chứa tên, giới thiệu và kịch bản đọc VI/EN nguyên nội dung DRAFT-02 đã được chủ đồ án duyệt. `SOURCE_DRAFT02_APPROVED.md` giữ văn bản nguồn và URL tham khảo của từng POI. Trạng thái “chờ duyệt” trong bản nguồn là lịch sử; quyết định duyệt và hash nằm riêng tại `approval.json`. Không sửa bản nguồn để làm giả lịch sử phê duyệt. `.gitattributes` giữ nguyên byte của các file có hash trên Windows/Linux.

## Vị trí và dữ kiện chưa xác minh

**Cả tám tọa độ trong bộ này là vị trí minh họa do nhóm đặt cho demo trình duyệt, không phải vị trí chuồng, cây hoặc công trình đã xác minh. Không dùng để nghiệm thu GPS, khoảng cách thực địa, đường đi hoặc khả năng tiếp cận.** Người dùng duyệt phương án này ngày23/10/2026 sau khi được hỏi riêng về trường tọa độ bắt buộc.

Đã tham khảo [trang bản đồ chính thức](https://www.saigonzoo.vn/p/ban-do-duong-di-hp13.html) và [bài giới thiệu tham quan](https://www.saigonzoo.vn/mot-ngay-tai-thao-cam-vien-56.html). Các nguồn này không được dùng để gán tám tọa độ chính xác trong manifest. Lượt truy vấn OSM/Overpass của phiên chuẩn bị không thành công; không giả có kết quả node hoặc thời điểm tái xác minh. `sourceUrl` và `osmCheckedAt` trong locationEvidence để null; nhãn `SIMULATED_BROWSER_DEMO` có trong từng POI của manifest.

Nội dung động/thực vật là kiến thức về loài, không phải xác nhận cá thể/cây tại vị trí minh họa. Bảo tàng không phải Bảo tàng Lịch sử TP.HCM; không hứa lịch mở cửa/hiện vật cụ thể. Không thêm ảnh, giờ hoạt động, lịch cho ăn, tình trạng bảo tồn hoặc dữ kiện chưa được duyệt. Giao diện không được dùng các marker này để tuyên bố đã khảo sát thực địa; mốc này không sửa frontend để thêm nhãn mới.

## Điều kiện và quy tắc nhập

Chỉ dùng database demo riêng `tcv_demo_review_20261020`. Trước đó phải có Hươu/Voi đủ bảy ngôn ngữ và 14 audio AVAILABLE, các job cũ COMPLETED, một tour đúng thứ tự và ADMIN ACTIVE. Xem [mốc bảy ngôn ngữ](../reviewed-seven/README.md) để dựng bộ nền. Không init lại DB có dữ liệu hoặc đổi mật khẩu của volume đang có.

CLI → Service → Store, tận dụng PoiService và TranslationService hiện có trong cùng transaction; cùng advisory lock dataset nền. Tạo đúng tám POI, 16 bản VI/EN, 56 job và audit. Vì bảy ngôn ngữ đang bật, mỗi POI mới phải có bảy job theo Word; **không tắt ngôn ngữ để né tạo job**. Mốc này chỉ tạo âm thanh cho 16 job VI/EN, giữ 40 job còn lại PENDING chờ bản dịch được duyệt. Không chạy worker quét toàn bộ hàng đợi khi còn thiếu 40 bản dịch này.

Chạy lại manifest giống nhau trả UNCHANGED, không tạo trùng hoặc ghi đè. Nguồn/phiên bản/manifest/dataset khác dự kiến, tên không thuộc bộ nhập hoặc job đang PROCESSING phải dừng đối soát. Không reset COMPLETED hoặc tự sửa source_version. Tác vụ FAILED cần API retry hiện có sau khi đối soát; seed không tự retry. Không sửa tour để ép chứa đủ mười điểm.

## Thao tác từ bản sao repo ngoài OneDrive

Không cài dependency hoặc chạy test trong OneDrive. Dùng env-file demo riêng đã có mà không đọc/in giá trị. Mẫu dưới dùng project mặc định của compose.demo.yml; nếu đang dùng project khác, bổ sung đúng `-p` và override đang áp dụng vào mọi lệnh, không tạo project/volume mới nhầm đích.

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml stop worker
$repoSource = (Get-Location).Path.Replace('\', '/')
$evidenceDir = Join-Path (Split-Path -Parent (Get-Location).Path) 'tcv-eight-poi-evidence'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
$evidenceMount = $evidenceDir.Replace('\', '/')
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$toolArgs = @(
  'compose', '--env-file', 'demo.local.env', '-f', 'compose.demo.yml',
  'run', '--no-deps', '--workdir', '/evidence', '-e', 'NODE_PATH=/app/node_modules',
  '-v', "${repoSource}/backend:/work/backend:ro",
  '-v', "${repoSource}/data/demo:/work/data/demo:ro",
  '-v', "${evidenceMount}:/evidence",
  'backend', 'node', '/work/data/demo/eight-pois/operator/run.cjs'
)
& docker @toolArgs plan "plan-$runId.json"
# Đối soát đúng nguồn/dataset/DB và 8 POI, 56 job trước khi apply.
& docker @toolArgs inventory "before-$runId.json"
& docker @toolArgs apply "apply-$runId.json"
& docker @toolArgs apply "repeat-$runId.json"
```

Output evidence không được ghi đè; dùng tên mới mỗi lượt. Nếu mất phản hồi hoặc ghi evidence lỗi, đọc lại DB trước khi kết luận chưa commit. Không đưa evidence chứa ID vận hành vào bộ dữ liệu nguồn.

## Tạo speech VI/EN theo đúng danh sách job

Build runtime [Piper bảy ngôn ngữ](../../../docs/PIPER_DEMO7.md) từ bản sao ngoài OneDrive trước. Dùng image `tcv-piper-demo7:local` đã có bộ giọng và tài nguyên; **không bật worker polling toàn hàng đợi** cho mốc này. Thêm overlay runtime bên dưới rồi gọi CLI render, nó chỉ chọn job VI/EN của tám POI thuộc marker riêng:

```powershell
# Thêm overlay image vào đúng vị trí trước run, giữ các tham số/mount đã có.
$renderArgs = @($toolArgs[0..4]) + @('-f', 'data/demo/eight-pois/compose.operator.yml') + @($toolArgs[5..($toolArgs.Length - 1)])
# Chỉ dùng compose run cho công cụ, không dùng up backend với overlay này.
& docker @renderArgs render "audio-$runId.json"
& docker @toolArgs apply "repeat-after-audio-$runId.json"
```

Render dùng PipelineService/claim/lease/heartbeat và adapter Piper hiện có, không dịch bằng mock, không đánh dấu AVAILABLE trước khi có WAV hợp lệ. Chạy render lại bỏ qua COMPLETED và kiểm file/hash, không tạo lại audio còn hợp lệ. Khi hoàn tất cần kiểm **30 bản READY + 30 audio AVAILABLE + 30 job COMPLETED**, cùng **40 job PENDING**: Hươu/Voi có14 bộ, tám POI mới có16 bộ VI/EN. Những con số này không phải đã đạt10×7.

Bundle VI/EN phải trả10 POI, audio đúng mã ngôn ngữ và isFallback=false. Với năm ngôn ngữ khác, tám POI mới sẽ fallback sang EN và phải ghi đúng languageCode/isFallback; không tính fallback là đủ nội dung của ngôn ngữ yêu cầu. Giữ tour cũ chỉ có Hươu/Voi là chủ ý của mốc, không phải tour mười điểm đã được duyệt.

## Kiểm thử

`operator/operator.test.cjs` chạy trên database UUID riêng qua entry `backend/tests/eight-poi-demo.test.js` khi RUN_DB_TESTS=1, NODE_ENV=test. Gồm hash sai, đích database sai, ADMIN không hợp lệ, nội dung không thuộc dataset, audit thất bại rollback nguyên bộ, nhiều yêu cầu đồng thời và nguồn đã thay đổi không bị seed ghi đè. Fixture có nhãn TEST và không dùng DB demo; metadata audio fixture không phải bằng chứng speech.

Nguồn và độ tin cậy: nội dung DRAFT-02 do chủ đồ án duyệt; nguồn tham khảo nằm trong hồ sơ; các tọa độ mới là minh họa được chấp nhận riêng. Chưa nghiệm thu GPS, mobile, bản dịch người bản ngữ hoặc15+ ngôn ngữ. Không sửa schema, Word, frontend hoặc tự commit/push.

## Hoàn tất40 job năm ngôn ngữ còn lại

Sau khi xong VI/EN, giữ worker quét cả hàng đợi dừng cho tới khi đã nhập đủ40 bản dịch. Dùng cùng tham số/env-file/project/volume của phần nền; chỉ đổi entry point CLI:

```powershell
$languageArgs = @($toolArgs)
$languageArgs[$languageArgs.Length - 1] = '/work/data/demo/eight-pois/operator/languages.run.cjs'
$languageRenderArgs = @($renderArgs)
$languageRenderArgs[$languageRenderArgs.Length - 1] = '/work/data/demo/eight-pois/operator/languages.run.cjs'
& docker @languageArgs plan "languages-plan-$runId.json"
& docker @languageArgs inventory "languages-before-$runId.json"
& docker @languageArgs apply "languages-apply-$runId.json"
& docker @languageArgs apply "languages-repeat-$runId.json"
& docker @languageRenderArgs render "languages-audio-$runId.json"
```

Công cụ dùng nguyên Store/transaction và TranslationService/PipelineService hiện có. Guard mới đối chiếu nguồn VI/EN, phiên bản, toàn bộ40 bản dịch theo hash, không lọc bỏ các ngôn ngữ lạ. Các guard VI/EN cũ giữ nguyên; không chạy lại CLI nền sau khi đã thêm40 bản dịch vì guard nền cố ý chỉ nhận giai đoạn VI/EN. Dùng CLI languages cho plan/replay/inventory/render tiếp theo. READY khác nội dung, nguồn đổi, job PROCESSING/FAILED đều dừng đối soát, không ghi đè hoặc tự retry.

Kết quả cần xác minh sau render: **10 POI ×7 ngôn ngữ =70 bản READY,70 WAV AVAILABLE,70 job COMPLETED**, không còn40 PENDING hoặc fallback trong ma trận này. Giữ nguyên30 nội dung/audio cũ và tour hai điểm. Bản dịch là nội dung AI đối chiếu thủ công, không phải tính năng dịch tự động và không đồng nghĩa đã được người bản ngữ nghiệm thu.
