# UC-12 — Cấp lại token khách (Could Have, US-A04 AC4–AC5)

Phạm vi: nhân viên STAFF/ADMIN hỗ trợ khách **đã kích hoạt vé** nhưng mất token trên thiết bị (xóa dữ liệu trình duyệt, đổi máy). Không đổi schema: dùng cột `VISIT_SESSIONS.reissue_count` đã có. Không thay đổi cơ chế xác thực nội bộ.

**Quyết định đã chốt với nhóm** (vẫn là GIẢ ĐỊNH chờ giảng viên duyệt theo mục 1.6.2 báo cáo):

| Nội dung | Giá trị | Cấu hình |
|---|---|---|
| Thông tin đối chiếu | `session_id` + `payment_ref` + thời điểm thanh toán | — |
| Sai lệch thời điểm thanh toán | ±10 phút so với `paid_at` | `VISIT_TOKEN_REISSUE_PAID_AT_TOLERANCE_MINUTES` (1–1440) |
| Số lần cấp lại tối đa mỗi vé | 2 | `VISIT_TOKEN_REISSUE_LIMIT` (1–10) |
| Cách bàn giao | Mã nhận vé 6 số, dùng một lần, TTL = `CASH_CODE_TTL_SECONDS` (không vượt hạn vé) | — |

Bàn giao bằng mã 6 số thay vì hiển thị token thô vì giao diện khách chỉ có ô nhập mã 6 số (trang `/payment`); không sửa giao diện khách.

## API (chỉ STAFF/ADMIN, `Cache-Control: no-store`)

### `POST /api/admin/payments/reissue/verify` — bước 1–3, không thay đổi dữ liệu

Body: `{ sessionId, paymentRef, paidAt }` (`paidAt` ISO UTC; `reason` được phép gửi kèm nhưng không bắt buộc ở bước này).

200: `{ data: { sessionId, paymentRef, paymentMethod, amount, currency, paidAt, expiresAt, reissueCount, maxReissues, remainingAfter, pendingPickup } }`

### `POST /api/admin/payments/reissue` — bước 5

Body: `{ sessionId, paymentRef, paidAt, reason }` (`reason` 5–255 ký tự, không chứa `<` `>`).

200: tóm tắt như trên (không có `pendingPickup`) kèm `{ shortedCode, codeExpiresAt, renewedCode, reissueNumber }`.

### Khách nhận vé mới

Dùng API có sẵn `POST /api/payments/exchange-cash-code` với `{ shortedCode }`. Trả `{ sessionId, token, tokenType, expiresAt }`; `expiresAt` là hạn vé ban đầu.

## Mã lỗi

| HTTP | Mã | Khi nào |
|---|---|---|
| 400 | `INVALID_REISSUE_INPUT` | Sai định dạng, thiếu lý do, gửi trường do server quản lý |
| 401 / 403 | `MISSING_ACCESS_TOKEN` / `FORBIDDEN` | Chưa đăng nhập, sai vai trò, tài khoản bị khóa (kiểm tra lại trong transaction) |
| 409 | `REISSUE_VERIFICATION_FAILED` | Phiên không tồn tại **hoặc** thông tin không khớp (cùng một lỗi để không dò được dữ liệu) |
| 409 | `REISSUE_PAYMENT_NOT_PAID`, `VISIT_SESSION_NOT_ACTIVE`, `VISIT_SESSION_EXPIRED` | Vé chưa thanh toán, bị thu hồi, hết hạn |
| 409 | `REISSUE_NOT_NEEDED` | Phiên chưa từng đổi token → dùng UC-11 (cấp mã tiền mặt) hoặc đổi mã online |
| 409 | `REISSUE_LIMIT_REACHED` | Đã cấp lại đủ số lần |
| 409 | `REISSUE_CHANGED`, `PAYMENT_SESSION_INCONSISTENT` | Phiên vừa thay đổi / dữ liệu cần đối soát |
| 503 | `CASH_CODE_UNAVAILABLE` | Redis lỗi → **rollback**, token cũ vẫn dùng được, chưa tính lần cấp lại |
| 503 | `REISSUE_PERSISTENCE_UNAVAILABLE` | Kết quả chưa xác định (mất phản hồi) → đối soát trước khi thử lại |
| 503 | `REISSUE_NOT_CONFIGURED` | Cấu hình giới hạn không hợp lệ (đóng an toàn) |

## Luồng xử lý và tính nhất quán

1. `PaymentStore.withTokenReissue` mở transaction, kiểm tra lại tài khoản nội bộ, khóa `PAYMENTS`/`VISIT_SESSIONS` bằng `FOR UPDATE` **cùng thứ tự** với xác nhận tiền mặt, cấp mã và đổi mã.
2. Service kiểm tra lại toàn bộ điều kiện dưới khóa.
3. `revoke`: `UPDATE VISIT_SESSIONS SET token_hash = NULL, reissue_count = reissue_count + 1 WHERE session_id = ? AND token_hash = ? AND reissue_count = ? AND status = 'ACTIVE' AND expires_at > UTC_TIMESTAMP(3)` — hai yêu cầu đồng thời không thể cùng tăng bộ đếm. `expires_at` không đổi. Token cũ bị từ chối ngay vì xác thực khách tra theo `token_hash`.
4. Tạo mã Redis (`purpose: "REISSUE"`, `reissueNumber`) **trước khi commit**: Redis lỗi → rollback toàn bộ. Mã cấp lần đầu còn sót hoặc mã của lần cấp lại cũ bị xóa (so khớp `issueId`).
5. Ghi `AUDIT_LOGS` action `REISSUE_VISITOR_TOKEN` (nhân viên, lý do, lần cấp lại, hạn mã; không lưu token hay mã).
6. Khi khách nhập mã: luồng đổi mã chấp nhận mã `REISSUE` đúng `reissueNumber` cho phiên có `token_hash IS NULL AND reissue_count > 0` (cả CASH và ONLINE) và ghi token với điều kiện `reissue_count` không đổi. Mã cấp lần đầu không dùng được cho phiên đã cấp lại và ngược lại.

**Trạng thái chờ nhận** (`token_hash IS NULL`, `reissue_count > 0`): xảy ra khi khách chưa nhập mã, mã hết hạn hoặc mất phản hồi sau commit. Đối chiếu lại sẽ trả `pendingPickup: true`; cấp lại lúc này chỉ **tạo lại mã**, không tăng bộ đếm (`renewedCode: true`).

UC-11 (cấp mã tiền mặt) và đổi mã online tiếp tục từ chối phiên đã cấp lại (`VISIT_TOKEN_ALREADY_ISSUED`).

## Kiểm thử

| Tệp | Nội dung |
|---|---|
| `backend/tests/token-reissue.test.js` | 14 ca: đối chiếu, sai lệch giờ, phân quyền, giới hạn, đồng thời, rollback Redis/audit, mã sót, mất phản hồi |
| `backend/tests/token-reissue.http.test.js` | Route, vai trò, `no-store`, ánh xạ lỗi |
| `backend/tests/token-reissue-boundaries.test.js` | UC-11 / online không mở cửa phụ; mã lần cấp lại cũ bị từ chối |
| `backend/tests/token-reissue-config.test.js` | Giá trị mặc định và giới hạn cấu hình |
| `backend/tests/audit-reissue.test.js` | Projection nhật ký UC-17 lọc markup và bí mật |
| `backend/tests/token-reissue.integration.test.js` | MySQL thật (`RUN_DB_TESTS=1`): thu hồi, khóa dòng, giới hạn, tài khoản bị khóa |

Chưa kiểm thử trên staging với thiết bị thật.
