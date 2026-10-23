# Backend có dữ liệu DRAFT-03 cho frontend — demo trình duyệt

Bộ mở rộng hai POI lên **bảy ngôn ngữ** đã được đóng gói tại [reviewed-seven](reviewed-seven/README.md), gồm bản dịch đã duyệt, nguồn/duyệt và công cụ nhập chạy lặp. Phần hướng dẫn bên dưới là bước nền VI/EN; đọc hướng dẫn mở rộng trước khi bổ sung năm ngôn ngữ và không chạy ép seed hai ngôn ngữ trên bộ đã mở rộng.

Bộ [tám POI bổ sung VI/EN](eight-pois/README.md) là bước sau Hươu/Voi bảy ngôn ngữ; tọa độ mới chỉ là vị trí minh họa đã được chấp nhận cho demo. Bộ này giữ40 job của năm ngôn ngữ khác ở PENDING chờ nội dung được duyệt, không tự chạy worker mock cho chúng.

Bộ này gồm hai POI Hươu cao cổ/Voi châu Á, tên/giới thiệu/kịch bản đọc VI và EN đã được chủ đồ án duyệt, một **lộ trình demo do nhóm đề xuất** theo thứ tự Hươu → Voi. Dữ liệu không chứa tài khoản, mật khẩu, token hoặc giao dịch. `draft03.json`, `OSM_SAVED_RECORDS.md`, `compose.demo.yml` và code seed nằm trong repo, không phụ thuộc manifest bên ngoài máy tác giả.

**Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa.** Giữ `osmCheckedAt=null`; quyết định dùng nguồn cũ được ghi bằng `locationEvidence.mode=SAVED_SOURCE_ACCEPTED` và xác nhận dùng cho demo trình duyệt. Không tự điền ngày kiểm tra mới. Bằng chứng cũ và nguồn nội dung ở [OSM_SAVED_RECORDS.md](OSM_SAVED_RECORDS.md).

Không xác nhận node hươu là khu cạnh voi; chưa nghiệm thu GPS, đường đi hoặc khả năng tiếp cận. Tour không phải tuyến chính thức. Audio là **WAV âm thử mock một giây, không đọc kịch bản**; bản EN là nội dung biên soạn đã duyệt, không phải dịch bằng MockTranslation. Giá 50.000 VND là cấu hình thử cho quyền dùng hệ thống, không phải tuyên bố giá vé chính thức của Thảo Cầm Viên.

Đoạn trên mô tả **lần seed ban đầu**. Bộ bốn giọng đọc Piper đã được người dùng nghe duyệt nằm trong [piper-reviewed](piper-reviewed/README.md); bước chuyển riêng có kiểm tra/quay lại tại [DEMO_AUDIO_PUBLICATION.md](../../docs/DEMO_AUDIO_PUBLICATION.md). Seed lặp không thay audio đã phát hành về âm thử; trạng thái sau chuyển phải đối chiếu audit phát hành, không suy từ nhãn seed ban đầu.

## 1. Chuẩn bị source và cấu hình riêng

Cần Docker Desktop với Compose v2 và Internet để build image lần đầu. Dùng toàn bộ source có mốc này trong thư mục **ngoài OneDrive**. Không cài dependency hoặc chạy test trong OneDrive. Nếu mốc chưa được chủ đồ án commit/push, cần bản sao working tree đầy đủ; clone HEAD cũ từ GitHub chưa có những file mới này.

Làm việc ở root của bản sao repo. Không dùng `.env` thật của môi trường khác. File mẫu công khai ở `data/demo/demo.env.example`, chỉ chứa placeholder. Sinh cấu hình riêng bằng PowerShell sau; không in các giá trị và không ghi đè file đã tồn tại:

```powershell
if (Test-Path -LiteralPath demo.local.env) { throw 'Giữ cấu hình hiện có; không sinh lại mật khẩu cho volume đã khởi tạo.' }
function New-DemoSecret {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$settings = @('DEMO_PORT=18080', 'DEMO_PUBLIC_BASE_URL=http://127.0.0.1:18080')
foreach ($key in @('DEMO_DB_ROOT_PASSWORD','DEMO_DB_PASSWORD','DEMO_JWT_SECRET','DEMO_WEBHOOK_SECRET')) {
  $settings += $key + '=' + (New-DemoSecret)
}
Set-Content -LiteralPath demo.local.env -Value $settings -Encoding ASCII
```

`demo.local.env` đã được gitignore/dockerignore; không gửi file này, không đưa vào image hoặc log. Không chạy `docker compose config` để in toàn bộ môi trường; muốn kiểm cấu hình dùng `config --quiet`. Cần đổi port thì đổi đồng thời `DEMO_PORT` và `DEMO_PUBLIC_BASE_URL`; không thay credentials khi volume đã tồn tại.

## 2. Dựng schema/migration và nhập dữ liệu

Compose riêng có project `tcv-browser-demo-draft03`, database cố định `tcv_demo_review_20261020`, volume MySQL/Redis/media và network riêng. MySQL/Redis không mở cổng host; backend chỉ bind loopback. Kiểm tra project/tên volume chưa thuộc dữ liệu khác trước lần đầu, không tự nhận tài nguyên có sẵn không rõ nguồn.

Backend nối cả mạng nội bộ `demo_only` và bridge `demo_access` để publish cổng localhost. Database/Redis/worker chỉ ở mạng nội bộ. Giữ cấu hình này khi dựng mới; không gỡ `demo_access` rồi coi health trong container là bằng chứng truy cập được từ trình duyệt host.

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml config --quiet
docker compose --env-file demo.local.env -f compose.demo.yml build backend
docker compose --env-file demo.local.env -f compose.demo.yml up -d --wait database redis
docker compose --env-file demo.local.env -f compose.demo.yml run --name tcv-demo-migrate migrate
docker compose --env-file demo.local.env -f compose.demo.yml run --name tcv-demo-seed-first seed
docker compose --env-file demo.local.env -f compose.demo.yml run --name tcv-demo-seed-repeat seed
docker compose --env-file demo.local.env -f compose.demo.yml up -d --wait backend worker
```

Các tên container run phía trên dành cho lần dựng đầu; lần khác dùng tên mới hoặc chỉ chạy bước còn thiếu, không xóa container cũ để giải phóng tên. Migrate dùng nguyên migration 001–006 đã có; không có migration mới. `database/init_db.sql` chỉ được entrypoint MySQL chạy trên volume mới trống. **Không chạy lại init_db.sql vào database có dữ liệu.** Nếu volume cũ thiếu schema, dừng đối soát thay vì reset.

Seed lần đầu trả `CREATED`: hai POI ACTIVE/version1, bốn văn bản VI/EN READY/version1, bốn job PENDING, một tour/hai liên kết và dấu audit cùng transaction. Seed không chèn URL audio giả. Lần hai phải trả `UNCHANGED`; không tăng phiên bản, tạo thêm audit/job hoặc sửa POI cũ. Lần đầu có bất kỳ POI/tour không rõ sở hữu, nội dung khác hoặc dấu nhập không khớp thì dừng. Không đổi `datasetId` để vượt xung đột.

Worker mock lấy bốn job, tái sử dụng đúng bản VI/EN đã duyệt và tạo WAV hợp lệ; chỉ sau khi có tệp và metadata hợp lệ mới công bố audio AVAILABLE. Đợi bốn job COMPLETED qua log worker hoặc đối soát DB trước demo. Đừng mô tả âm thử là đang đọc văn bản. Chạy lại seed sau worker cũng phải `UNCHANGED`.

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml logs --tail 20 worker
Invoke-RestMethod http://127.0.0.1:18080/health/ready
```

File audio giữ trên volume media qua restart container. Không chạy `down -v`, xóa volume, reset DB hoặc thao tác stack cũ. Có thể dừng/khởi động lại đúng backend/worker demo bằng `stop backend worker` / `up -d --wait backend worker`; không cần seed lại để phục hồi dữ liệu.

## 3. API cho frontend

Backend mặc định: `http://127.0.0.1:18080`. Đây là địa chỉ API, **chưa có frontend khách mới nối luồng**. CORS demo cho `http://localhost:5500`, `http://127.0.0.1:5500`, `http://localhost:5173` và `http://127.0.0.1:5173`; cần origin khác thì chốt cấu hình, không tắt xác thực hoặc dùng chế độ trình duyệt không an toàn.

1. `POST /api/payments/online-checkout`, JSON `{}`, header `Idempotency-Key: <UUID mới cho một yêu cầu mua>`. Server định giá. Phản hồi `data` có `sessionId`, `paymentRef`, `authCode`, `paymentUrl` và các hạn liên quan. Retry cùng yêu cầu giữ cùng key; không tạo thanh toán mới khi mất phản hồi. Không ghi token/authCode vào log.
2. Mở `paymentUrl` chỉ thấy checkout **MOCK**, không thu tiền thật. Trước webhook hợp lệ, đổi mã trả 409; redirect không cấp quyền. Người vận hành mô phỏng SUCCESS bằng công cụ backend dưới đây, không đưa secret/chữ ký vào JavaScript frontend:

```powershell
docker compose --env-file demo.local.env -f compose.demo.yml exec -e MOCK_PAYMENT_BASE_URL=http://127.0.0.1:3000 backend node scripts/mock-payment.js <paymentRef> SUCCESS
```

Override URL ở riêng lệnh vận hành để nó gọi loopback **trong container**; URL phát cho trình duyệt vẫn là host port18080. Có thể dùng `FAILED` để thử thất bại. Không thêm endpoint công khai cho frontend tự ký webhook.

3. `POST /api/payments/sessions/<sessionId>/exchange-online-code`, JSON `{"authCode":"<mã đã nhận>"}`. Thành công trả `data.token` và `expiresAt`; mã chỉ đổi một lần. Không tự mua lại khi gặp mã hết hạn/đã dùng, cần đối soát giao dịch. PENDING chỉ thử lại hữu hạn, không polling liên tục.
4. `GET /api/visits/me`, header `Authorization: Bearer <token khách>` để xem phiên tối thiểu.
5. `GET /api/content/bundle?languageCode=vi` hoặc `en`, cùng Bearer token. `data.pois` gồm thông tin chung và `text`/`audio` có ngôn ngữ thực tế, cờ fallback; tour dùng `items` với `poiId`/`sequenceNo`, `localization=SHARED`. Bundle không chứa nguồn bí mật, tài khoản hoặc giao dịch. Tour description giữ cảnh báo tọa độ tham khảo.
6. `GET <poi.audio.url>`, cùng Bearer token, trả `audio/wav`. Không truyền token qua query string. `<audio src>` tự nó không gắn được header Bearer; dùng fetch có xác thực rồi Blob URL khi triển khai frontend. Giải phóng Blob URL khi đổi điểm/đổi ngôn ngữ; không công khai file media.

Ví dụ gọi từ origin frontend đã cấu hình, sau khi có token:

```javascript
const base = 'http://127.0.0.1:18080';
const headers = { Authorization: `Bearer ${guestToken}` };
const response = await fetch(`${base}/api/content/bundle?languageCode=en`, { headers });
if (!response.ok) throw new Error(`Bundle HTTP ${response.status}`);
const { data } = await response.json();
const poi = data.pois[0];
if (poi.audio.status === 'AVAILABLE') {
  const audioResponse = await fetch(base + poi.audio.url, { headers });
  if (!audioResponse.ok) throw new Error(`Audio HTTP ${audioResponse.status}`);
  const blobUrl = URL.createObjectURL(await audioResponse.blob());
  // Dùng blobUrl cho trình phát; phát sau thao tác người dùng.
  // Khi không dùng nữa: URL.revokeObjectURL(blobUrl).
}
```

Thiếu/sai/hết hạn/thu hồi token hoặc phiên chưa PAID: bị từ chối. JWT STAFF/ADMIN không thay được token khách; token khách không dùng vào API quản trị. Lỗi trả `{code,error}`, không hiển thị lỗi bằng HTML thực thi. Không gọi API admin POI thay bundle cho khách. Khi đổi ngôn ngữ, tải bundle mới, chặn phản hồi cũ ghi đè và ghi đúng ngôn ngữ fallback. Chưa có GPS/tự phát hoặc đường đi được nghiệm thu.

## 4. Trước khi bắt đầu frontend

Kiểm health200; seed CREATED rồi UNCHANGED; đủ 2 POI/4 văn bản/1 tour/4 job COMPLETED/4 WAV AVAILABLE; EN khớp file đã duyệt, không có tiền tố MockTranslation; thử thanh toán mock và API từ chối sai quyền. Chỉ sau đó nối một lát cắt khách: thanh toán mock → token → bundle → chọn POI → văn bản → bấm tải/phát âm thử. Thống nhất nhãn MOCK và cảnh báo nguồn tọa độ ngay khi làm frontend, chưa làm giọng đọc thật/GPS hoặc mở rộng phân hệ trong mốc bàn giao này.
