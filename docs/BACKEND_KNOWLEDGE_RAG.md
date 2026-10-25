# Backend kho kiến thức và chatbot RAG — UC-15 / UC-08

Phạm vi: phần bổ sung của Lê Đức Anh theo `GIAO_VIEC_KHO_TRI_THUC_RAG.md`. Backend có sẵn trước đó là đóng góp của người giao việc.

Mốc gốc ngày 23/10/2026 (lịch sử, không phải trạng thái tích hợp hiện tại):
- Đã gắn vào `server.js` và chạy qua `docker compose` chính thức.
- Kiểm thử bằng adapter MOCK và provider giả lập trên máy.
- **Chưa kiểm chứng chất lượng RAG với embedding/LLM thật**, vì chưa có provider được duyệt.
- Nhánh `codex/knowledge-rag`, gốc từ `main` `76f1603`. Đã có trên `main` (commit `7f7c239`, `c075554`).

Cập nhật ngày 25/10/2026, đối chiếu lại `CNPM_BAOCAO (8).docx` (US-D01/D02, UC-08, UC-15, QT-01/11/12, NFR-07/08/09/11/13/17, bảng 4.4.4 m–o):
- Đã nối giao diện STAFF/ADMIN `/internal/knowledge` và mục Hỏi đáp trong `/explore`. Khách chưa kích hoạt vé được dẫn sang thanh toán; khách có token gọi API chat. Kiểm chứng trình duyệt trên database QA riêng: MockGateway → token → Gemini trả lời → xem nguồn; lưu tài liệu bằng embedding thật, tăng phiên bản; bố cục 390 px không tràn ngang.
- Provider Gemini Free đã được người dùng duyệt cho đúng 5 tài liệu minh họa và 18 câu hỏi thử. Chưa có quyết định gửi kho nội dung demo/khách thật ra Google, chưa đổi cấu hình RAG trên Render hoặc nhập kho tri thức staging. Không dùng bộ thử có tài liệu injection làm dữ liệu demo chính.
- Lần chạy đủ 18 câu với `gemini-embedding-2` (3072 chiều) + `gemini-3.5-flash-lite`, prompt đã sửa: 16/18 đạt tiêu chí tự động; M4/P4 lỗi provider. Chạy lại riêng hai câu: P4 đạt; M4 có nguồn và câu trả lời Hàn, nhưng không giữ chuỗi tên đường có dấu đúng tiêu chí mẫu nên không đạt tiêu chí tự động. Không gộp hai lần thành một kết quả 18/18. Ngôn ngữ/phát âm tên riêng còn cần người thông thạo rà độc lập; chưa nghiệm thu NFR-17 hoàn toàn.
- Gemini Flash/Flash-Lite khác được đối chiếu nhưng gặp 503/timeout, không tự chuyển model dự phòng hoặc tự gửi lại câu hỏi khách. Bản thử không bật billing; quota miễn phí không bảo đảm tính sẵn sàng.
- Adapter giới hạn 8 MiB trong lúc đọc stream, kiểm đủ chỉ số embedding batch. Riêng hostname Gemini dùng một văn bản mỗi request vì phản hồi thực tế bỏ `index`; không đoán thứ tự vector không có chỉ số. Tổng thời gian vẫn bị chặn bởi deadline của Service.
- API chat bổ sung `mode: MOCK|AI`; kết quả xử lý tài liệu có `processing.mode`. AI chỉ biểu thị dùng provider thật, không phải chứng nhận chất lượng. Giao diện ghi rõ khi đang mô phỏng; không lưu khóa provider ở frontend.
- Nguồn/tiêu đề trả về chat được che mẫu bí mật như câu hỏi/câu trả lời; bổ sung nhận diện định dạng khóa Google. Router kho tri thức trả `Cache-Control: no-store`.
- Audit và monitoring RAG đã có trong code chung: bộ lọc hành động, chi tiết audit và thống kê CHAT_LOGS. Không còn là phần chưa tích hợp như bàn giao gốc.
- Mã lỗi `PROVIDER_*` của adapter HTTP (ví dụ `PROVIDER_HTTP_429`) được giữ lại trong `processing.code`, `lastError` và audit `FAIL_KNOWLEDGE_PROCESSING`. Lỗi khác vẫn quy về `EMBEDDING_PROVIDER_ERROR`, không ghi thông điệp gốc. Lượt chat `FAILED` ghi mã lỗi (không có câu hỏi, không có body của provider) vào log máy chủ.
- `lastError` chỉ có giá trị khi `processingStatus = FAILED`. Nếu xử lý lại tài liệu đang `READY` thất bại, tài liệu vẫn `READY` và tiếp tục dùng bộ đoạn đã công bố. Phản hồi của lệnh xử lý lại vẫn trả `processing.result = FAILED` kèm mã lỗi.
- Tiêu đề tài liệu trong prompt được escape cả dấu `"`.
- Nguồn vẫn không bắt buộc: UC-15 bước 5 ghi "khuyến nghị", 4.4.4 m) ghi `source` cho phép NULL và chỉ kiểm tra tiêu đề/nội dung không rỗng.

## 1. Thay đổi

**File mới**

| File | Vai trò |
| --- | --- |
| `backend/routers/knowledge.router.js` | `/api/admin/knowledge-documents`, `createAuthMiddleware` + `requireRole("STAFF","ADMIN")` |
| `backend/routers/chat.router.js` | `/api/chat`, `createVisitorMiddleware(paymentService)`, `Cache-Control: no-store` |
| `backend/services/knowledge.service.js`, `knowledge.validation.js` | UC-15: Pha 1 → chia đoạn và embedding ngoài transaction → Pha 2; xử lý lại; trạng thái dẫn xuất |
| `backend/services/chat.service.js`, `chat.validation.js`, `chat-prompt.js` | UC-08: kiểm tra, rate limit, truy hồi, LLM, nguồn, NO_CONTEXT/FAILED, CHAT_LOGS |
| `backend/services/rag.config.js`, `rag-adapters.js`, `rag-support.js` | Cấu hình/kiểm tra env, chọn adapter, timeout, kiểm vector, cosine, chia đoạn, che bí mật |
| `backend/stores/knowledge.store.js`, `chat.store.js` | SQL tham số hóa; transaction `AuthStore.transaction`; audit qua `AuditLogStore.create(entry, connection)` |
| `backend/adapters/mock-embedding.js`, `mock-llm.js` | Adapter MOCK (mặc định; không gửi dữ liệu ra ngoài) |
| `backend/adapters/openai-compatible.js` | Adapter HTTP `/embeddings` + `/chat/completions` cho provider thật (tắt mặc định) |
| `backend/tests/knowledge.test.js`, `chat.test.js`, `rag-provider.test.js`, `knowledge-rag.server.test.js` | Unit/HTTP; provider giả lập trên 127.0.0.1; route qua `createApp()` |
| `backend/tests/knowledge-rag.integration.test.js` | MySQL 8 + Redis thật, JWT thật, token khách qua luồng tiền mặt thật |
| `backend/tests/knowledge-rag-eval.test.js`, `tests/fixtures/knowledge-rag-eval.json` | Bộ đánh giá NFR-17: 18 câu, 4 nhóm, tiêu chí cố định trước |

**File dùng chung được sửa (thay đổi tối thiểu, chỉ thêm, không đổi hành vi cũ)**

| File | Thay đổi |
| --- | --- |
| `backend/server.js` | Thêm 4 import, 2 tham số inject `knowledgeService`/`chatService`, 2 dòng `app.use(...)` đặt sau `/api/admin/payments`, trước frontend router và `errorHandler` |
| `docker-compose.yml` | Chuyển các biến `RAG_*`/`CHAT_RATE_*` vào backend; mặc định `MOCK` |
| `.env.example`, `backend/.env.example` | Biến RAG với giá trị mặc định hoặc để trống, không có secret |

Gói backend gốc không có migration hay dependency mới. Mốc tích hợp 25/10 bổ sung frontend nêu ở đầu tài liệu; không đổi schema/Word/worker. `compose.demo.yml` giữ nguyên: stack demo vẫn chạy được với mặc định MOCK.

## 2. API

Lỗi theo quy ước có sẵn: `{ "code": "...", "error": "..." }`.

### Kho kiến thức

`/api/admin/knowledge-documents`, Bearer JWT nội bộ, chỉ STAFF/ADMIN.

| Method | Path | Body / query | Kết quả |
| --- | --- | --- | --- |
| GET | `/` | `status?=ACTIVE\|INACTIVE`, `page?`, `limit?≤100` | `{data:{items,total,page,limit}}` |
| GET | `/:id` | — | `{data: document}` (kèm `content`) |
| POST | `/` | `{title, content, source?}` | 201 `{data:{document, processing}}` |
| PUT | `/:id` | `{title, content, source?, expectedVersion}` | `{data:{document, processing}}`; 409 `KNOWLEDGE_VERSION_CONFLICT` |
| POST | `/:id/deactivate` | — | `{data: document}` (lặp lại là no-op) |
| POST | `/:id/reprocess` | — | `{data:{document, processing}}`; 409 `KNOWLEDGE_DOCUMENT_DEACTIVATED` |

- **`document`:** `documentId, title, source, status (ACTIVE|INACTIVE), contentVersion, processingStatus (READY|PENDING|FAILED|DEACTIVATED), lastError, chunkCount, embeddingModel, createdAt, updatedAt`.
- **`processing`:** `{result: PUBLISHED|FAILED|SUPERSEDED, code?, chunkCount?, mode: MOCK|AI}`. Khi embedding lỗi, tài liệu đã lưu ở Pha 1 vẫn trả 201/200, theo UC-15 E4.
- **Giới hạn đầu vào:** tiêu đề ≤ 255, nội dung ≤ 20 000 ký tự, nguồn ≤ 1 000 (không bắt buộc). Không nhận trường lạ. Body JSON tối đa 32 KB (giới hạn chung của `server.js`, quá thì trả 413).
- **Lỗi khác:** 400 `VALIDATION_ERROR`, 401/403 từ middleware có sẵn, 404 `KNOWLEDGE_DOCUMENT_NOT_FOUND`, 503 `RAG_NOT_CONFIGURED` (kiểm tra trước Pha 1, nên không có dữ liệu nào bị ghi).

### Chat

`POST /api/chat/questions`, Bearer token khách `tcv_visit_…`. Body đúng một trường `{"question": "..."}`, tối đa 1 000 ký tự. Phiên lấy từ `req.visit`; body có `sessionId` hay `role` thì trả 400.

```json
{ "data": { "status": "SUCCESS", "answer": "…", "mode": "AI",
  "sources": [{ "documentId": 1, "chunkId": "3", "sourceVersion": 2, "title": "…", "source": "…" }] } }
```

| HTTP | code | Khi nào | CHAT_LOGS |
| --- | --- | --- | --- |
| 200 | — | `SUCCESS`, hoặc `NO_CONTEXT` với `sources: []` (ngoài kho hoặc bị từ chối theo phạm vi) | Có |
| 400 | `INVALID_QUESTION` | Rỗng, quá dài, ký tự điều khiển, trường lạ | Không |
| 401 | `MISSING_VISITOR_TOKEN`, `INVALID_VISITOR_TOKEN`, `INVALID_VISITOR_SESSION`, `VISIT_SESSION_EXPIRED` | Middleware khách có sẵn: sai, hết hạn, chưa trả tiền, JWT nội bộ | Không |
| 429 | `CHAT_RATE_LIMITED` | Vượt giới hạn theo phiên hoặc IP | Không |
| 503 | `CHAT_PROTECTION_UNAVAILABLE` | Redis lỗi (fail-closed) | Không |
| 503 | `CHAT_PROVIDER_UNAVAILABLE` | Embedding/LLM lỗi, timeout, sai định dạng; lỗi đọc truy hồi | Có, `FAILED`, `answer` NULL |
| 503 | `CHAT_LOG_UNAVAILABLE` / `RAG_NOT_CONFIGURED` | Không ghi được log / cấu hình RAG sai | — |

Về nguồn và nội dung trả lời:
- `sources` chỉ gồm các đoạn đã truy hồi mà mô hình trích dẫn. Chunk id lạ bị loại.
- Câu trả lời không còn trích dẫn hợp lệ được chuyển thành NO_CONTEXT.
- Liên kết không có trong nguồn bị xóa khỏi câu trả lời.
- Frontend phải hiển thị `answer` dạng text, không render thành HTML.

## 3. Cơ chế chính

- **Pha 1:** khóa dòng tài liệu, kiểm tra lại tài khoản trong transaction, lưu `INACTIVE` (tạo mới: version 1; sửa: version + 1), ghi audit trong cùng transaction.
- **Ngoài transaction:** chia đoạn 800 ký tự, chồng lặp 120; ưu tiên ngắt theo đoạn, rồi câu, rồi từ. Tạo embedding có timeout.
- **Pha 2:** kiểm tra lại version và tài liệu chưa bị ngừng. Thay toàn bộ đoạn, chuyển `ACTIVE`, ghi `PUBLISH_KNOWLEDGE_DOCUMENT` trong một transaction. Lệch version thì trả `SUPERSEDED` và không ghi gì.
- **Ngừng sử dụng:** chuyển `INACTIVE`, tăng version, ghi audit trong cùng transaction. Vì vậy tác vụ đang chạy dở không kích hoạt lại được tài liệu, và lệnh xử lý lại bị từ chối.
- **Xử lý đồng bộ trong request:** không thêm cơ chế nền, không dùng `CONTENT_JOBS`. Tiến trình dừng giữa chừng thì tài liệu nằm ở `PENDING`, nhân viên bấm xử lý lại.
- **Truy hồi:** chỉ lấy đoạn có `status='ACTIVE'`, `source_version = content_version` và đúng `embedding_model` đang cấu hình. Vector phải là mảng số hữu hạn, đúng số chiều, khác 0. Chọn top-k theo cosine có ngưỡng tối thiểu.
- **Rate limit:** dùng `RedisStore.consumeLookup` có sẵn với key `chat:ip:<sha256>` và `chat:session:<sha256>`.
- **Bảo mật:**
  - Prompt đặt tài liệu và câu hỏi trong khối dữ liệu đã escape; chatbot không có công cụ nào.
  - Token khách, JWT, `Bearer`, `sk-…`, chuỗi hex 64 ký tự, `api_key=` bị che trước khi ghi log và trước khi gửi provider.
  - Khóa API không serialize ra ngoài, lỗi provider không chứa body hoặc khóa.

**Mâu thuẫn đặc tả và cách đã chọn:**
- US-D01 AC1 ghi tài liệu "có nguồn", trong khi UC-15 bước 5 ghi "khuyến nghị", E2 và schema chỉ bắt buộc tiêu đề và nội dung. Đang chọn: **nguồn không bắt buộc** (theo UC chi tiết và schema). Đổi được bằng 1 dòng trong `knowledge.validation.js`.
- Schema chỉ có `ACTIVE/INACTIVE`. `PENDING/FAILED/DEACTIVATED` được dẫn xuất từ AUDIT_LOGS của tài liệu (ghi nguyên tử cùng thay đổi), nên không cần migration. Nếu muốn tách hẳn, phương án là migration thêm `processing_status` và `last_error_code`; việc này cần duyệt.

## 4. Chạy cho nhóm trưởng (đã kiểm chứng ngày 23/10/2026 bằng compose project riêng)

Yêu cầu: Docker có Compose v2, hoặc Node 20 + MySQL 8 + Redis 7.

```sh
cp .env.example .env       # điền MYSQL_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET (≥32 byte), VISIT_PRICE_VND
docker compose up -d --build
docker compose exec backend npm run db:migrate
docker compose exec -e BOOTSTRAP_ADMIN_EMAIL=admin@example.com -e BOOTSTRAP_ADMIN_PASSWORD='<mật khẩu mạnh>' backend npm run bootstrap:admin
```

Không cần biến RAG nào: mặc định là `RAG_PROVIDER=MOCK`, không gọi dịch vụ ngoài.

**Kiểm tra UC-15/UC-08 sau khi khởi động** (thay `<...>`):

```sh
B=http://127.0.0.1:3000
T=$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"<...>"}' | jq -r .data.accessToken)
curl -s -X POST $B/api/admin/knowledge-documents -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"title":"Voi châu Á","content":"Voi châu Á ăn cỏ, lá cây và trái cây.","source":"Dữ liệu minh họa"}'   # processing.result = PUBLISHED
# Token khách theo luồng tiền mặt có sẵn:
SID=$(curl -s -X POST $B/api/payments -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)" -d '{"paymentMethod":"CASH"}' | jq -r .data.sessionId)
curl -s -X POST $B/api/admin/payments/sessions/$SID/confirm-cash -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{}'
CODE=$(curl -s -X POST $B/api/admin/payments/sessions/$SID/cash-code -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{}' | jq -r .data.shortedCode)
V=$(curl -s -X POST $B/api/payments/sessions/$SID/exchange-cash-code -H 'Content-Type: application/json' -d "{\"shortedCode\":\"$CODE\"}" | jq -r .data.token)
curl -s -X POST $B/api/chat/questions -H "Authorization: Bearer $V" -H 'Content-Type: application/json' -d '{"question":"Voi châu Á ăn gì?"}'   # status SUCCESS + sources
```

**Kết quả thực tế trên stack `docker compose` chính thức** (project `kbragcheck`, cổng riêng, đã gỡ sau khi thử):

| Bước | Kết quả |
| --- | --- |
| `/health/ready` | 200 |
| Đăng nhập | đạt |
| Tạo tài liệu | `PUBLISHED`/`READY`, v1 |
| Sửa với version cũ | `KNOWLEDGE_VERSION_CONFLICT` |
| Sửa với version đúng | `PUBLISHED`, v2 |
| Danh sách | `total = 1` |
| Không có token | 401 |
| id `1 OR 1=1` | `VALIDATION_ERROR` |
| Khách hỏi câu trong kho | `SUCCESS`, nguồn `(document 1, version 2)` |
| Khách hỏi câu ngoài kho | `NO_CONTEXT`, `[]` |
| JWT nội bộ gọi chat | `INVALID_VISITOR_TOKEN` |
| Không có token gọi chat | `MISSING_VISITOR_TOKEN` |
| Body có `sessionId`/`role` | `INVALID_QUESTION` |
| Ngừng sử dụng | `DEACTIVATED`, v3 |
| Xử lý lại tài liệu đã ngừng | `KNOWLEDGE_DOCUMENT_DEACTIVATED` |
| Hỏi lại sau khi ngừng | `NO_CONTEXT` |
| Gửi liên tục | câu thứ 11 trong 60 giây bị 429 |
| CHAT_LOGS | có `SUCCESS`/`NO_CONTEXT`; câu hỏi chứa token khách không lưu token |
| AUDIT_LOGS | CREATE/UPDATE/PUBLISH×2/DEACTIVATE |
| Route cũ `/api/visits/me`, `/api/admin/pois` | 200 |

## 5. Cấu hình AI

| Biến | Mặc định | Ghi chú |
| --- | --- | --- |
| `RAG_PROVIDER` | `MOCK` | `MOCK` hoặc `OPENAI_COMPATIBLE` |
| `RAG_ALLOW_EXTERNAL_PROVIDER` | `false` | Bắt buộc là `true` mới được gửi tài liệu/câu hỏi ra provider |
| `RAG_API_BASE_URL` | — | Ví dụ `https://<provider>/v1`; chỉ HTTPS (HTTP chỉ cho localhost); không chứa user/pass |
| `RAG_API_KEY` | — | Chỉ đặt trong `.env`/secret của môi trường; không ghi vào Git |
| `RAG_EMBEDDING_MODEL`, `RAG_EMBEDDING_DIMENSIONS`, `RAG_LLM_MODEL` | MOCK: `mock-hash-v1`, 256 | Bắt buộc với provider thật; nên dùng embedding **đa ngôn ngữ** |
| `RAG_EMBEDDING_TIMEOUT_MS`, `RAG_LLM_TIMEOUT_MS` | 10000, 20000 | Timeout hữu hạn |
| `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_MAX_CHUNKS`, `RAG_TOP_K`, `RAG_MIN_SCORE` | 800, 120, 64, 4, 0.2 | `RAG_MIN_SCORE` mới chỉ hiệu chỉnh cho MOCK; phải hiệu chỉnh lại với mô hình thật |
| `CHAT_RATE_WINDOW_SECONDS`, `CHAT_RATE_SESSION_LIMIT`, `CHAT_RATE_IP_LIMIT` | 60, 10, 30 | Ngưỡng đề xuất, chưa phải ngưỡng nghiệm thu |

Lưu ý khi bật provider thật:
- Adapter gọi `POST {base}/embeddings` (`model`, `input`, `encoding_format: "float"`) và `POST {base}/chat/completions` (`temperature: 0`, `response_format: json_object`). Mô hình phải trả về JSON `{decision, answer, citations}`.
- Đổi mô hình embedding thì các đoạn cũ không còn được truy hồi. Khi đó cần bấm "Xử lý lại" từng tài liệu.

Cấu hình Gemini đã thử trên QA (không phải tự động bật staging):

```dotenv
RAG_PROVIDER=OPENAI_COMPATIBLE
RAG_ALLOW_EXTERNAL_PROVIDER=true
RAG_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
RAG_EMBEDDING_MODEL=gemini-embedding-2
RAG_EMBEDDING_DIMENSIONS=3072
RAG_LLM_MODEL=gemini-3.5-flash-lite
RAG_EMBEDDING_TIMEOUT_MS=10000
RAG_LLM_TIMEOUT_MS=20000
# RAG_API_KEY: đặt riêng trong secret, không ghi vào file bàn giao hoặc Git.
```

Đối chiếu [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) và [pricing](https://ai.google.dev/gemini-api/docs/pricing) của Google tại lần chọn provider 25/10/2026. Free tier có giới hạn riêng theo tài khoản/model và có thể dùng nội dung để cải thiện sản phẩm. Chỉ gửi nội dung đã được duyệt cho việc chia sẻ đó; không dùng câu hỏi/phiên khách thật để đánh giá mặc định. Không tự bật billing, không tự đổi model khi lỗi. Chat lỗi trả 503, bản đồ/audio tiếp tục độc lập. Tài liệu nhiều đoạn có thể hết tổng deadline embedding: lưu Pha 1 rồi báo FAILED để đối soát, không nhận là đã công bố.

Giao diện `/internal/knowledge` dùng token nội bộ và cơ chế refresh hiện có; bản nháp được giữ khi 409 hoặc lỗi mạng. Không tự gửi lại POST khi chưa rõ kết quả. Hỏi đáp ở `/explore` chỉ dùng token khách, chặn gửi đồng thời, hủy yêu cầu khi đóng cửa sổ/đổi phiên và không nhận kết quả trễ của phiên cũ. Lịch sử hiển thị chỉ ở bộ nhớ cửa sổ hiện tại, chưa phải chức năng lưu lịch sử hội thoại cho khách.

Cập nhật giao diện theo yêu cầu 25/10: mục hỏi đáp chuyển thành nút AI nổi kéo thả bằng Pointer Events (chuột/cảm ứng), có Alt + phím mũi tên; không kéo ra ngoài màn hình. Bấm mở cửa sổ chat không phủ tối bản đồ, thu gọn rồi mở lại giữ cuộc chat trong cùng phiên/trang; đổi token vẫn xóa nội dung cũ. Vị trí nút chỉ giữ trong bộ nhớ trang. Popup tự chọn chỗ phía trên/dưới nút và được giới hạn trong viewport. Không thay API/quyền/schema. Frontend sau cập nhật **167/167 test đạt, build đạt**; bổ sung test kéo không mở nhầm, giữ hội thoại khi thu gọn, hủy yêu cầu/không nhận phản hồi trễ. Đã thử kéo trên trình duyệt, mở lại tin nhắn Gemini thật và bố cục 390 px không tràn ngang; chưa thay cho kiểm tra bàn phím ảo trên thiết bị thật.

## 6. Kiểm thử

**Mốc tích hợp 25/10/2026:** lint kiểm 215 file JavaScript; backend bản cuối **751/751 đạt, 0 lỗi, 0 hủy, 0 bỏ qua**, Node 22 Linux + MySQL 8 + Redis 7 riêng. Chạy ngoài OneDrive, `--test-concurrency=1`, không tăng timeout hoặc bỏ test. Một lần chạy chồng với kiểm thử trình duyệt trước đó bị timeout ở test seed và được dừng, log lỗi được giữ; kết quả xanh nêu trên là lần chạy tách tải trên bản cuối. Frontend **165/165 đạt, 0 lỗi/bỏ qua**, TypeScript/Vite build đạt. Không dùng kết quả này thay cho CI của commit chưa tạo.

Kiểm thử bổ sung có ý nghĩa: `rag-provider.test.js` chặn body quá lớn khi đang stream, chỉ số vector trùng/thiếu/ngoài phạm vi, gắn đúng vector Gemini không có index; `chat.test.js` che nguồn chứa bí mật/định dạng key Google; `knowledge-rag.server.test.js` xác nhận no-store. `frontend/test/rag-integration.test.js` dùng Service backend thật với adapter mock để kiểm hợp đồng, sai/hết quyền, gửi lặp, kết quả trễ, 429/503, nguồn không an toàn, 409 giữ nháp và Pha 2 lỗi không báo sẵn sàng. Chất lượng Gemini thật được ghi riêng ở mục 7, không cộng vào 751/165.

Kiểm chứng HTTP/SQL/trình duyệt riêng trên 5 tài liệu minh họa: thêm/sửa và publish embedding Gemini; phiên bản tăng 1 → 2; có audit CREATE/UPDATE/PUBLISH và CHAT_LOGS SUCCESS; MockGateway → token → câu A2 trả lời có nguồn. Không token/sai loại token bị 401, khách không quản lý kho, body tự thêm role bị 400. Điện thoại 390×844 không tràn ngang ở trang chat/kho tri thức. Bộ dữ liệu QA và key nằm ngoài repo; không nhập staging.

Chạy trong bản sao ngoài OneDrive (không có `.git`, `node_modules`, `.env`), MySQL/Redis riêng:

```sh
docker network create kb-rag-test-net
docker run -d --name kb-rag-test-mysql --network kb-rag-test-net -e MYSQL_ROOT_PASSWORD=kb-rag-test-only mysql:8.0
docker run -d --name kb-rag-test-redis --network kb-rag-test-net redis:7-alpine
docker run --rm --network kb-rag-test-net -v "$COPY":/app -w /app/backend \
  -e NODE_ENV=test -e RUN_DB_TESTS=1 -e RUN_REDIS_TESTS=1 -e DB_HOST=kb-rag-test-mysql -e DB_USER=root \
  -e DB_PASSWORD=kb-rag-test-only -e DB_NAME=food_tour_db -e REDIS_URL=redis://kb-rag-test-redis:6379 \
  -e JWT_SECRET=ci-test-only-secret-at-least-32-bytes node:20 sh -c "npm ci && npm run lint && npm run test:coverage"
```

Các mật khẩu ở trên chỉ dùng cho container thử. Phải có `NODE_ENV=test`, vì test cũ `data/demo/eight-pois` yêu cầu biến này.

**Kết quả (23/10/2026, Node 20.20.2, MySQL 8.0, Redis 7):**
- `npm run lint` đạt.
- `npm run test:coverage` **670/670 đạt**, 0 lỗi, 0 bỏ qua; toàn bộ test cũ vẫn đạt.
- Test của phân hệ:

| Nhóm test | File | Môi trường |
| --- | --- | --- |
| Unit/HTTP | `knowledge.test.js`, `chat.test.js` | Store giả lập |
| Provider | `rag-provider.test.js` | Provider HTTP giả lập trên 127.0.0.1, khóa giả |
| Route | `knowledge-rag.server.test.js` | `createApp()` chính thức |
| Integration | `knowledge-rag.integration.test.js` | MySQL/Redis thật: rollback Pha 1/Pha 2 bằng trigger SQL, sửa/ngừng khi đang xử lý, đồng thời, truy hồi theo version/model, HTTP end-to-end, hết hạn vé, Redis không truy cập được |
| Đánh giá | `knowledge-rag-eval.test.js` | MOCK |

- CI GitHub đã xanh ở commit `7f7c239`. Commit tích hợp cần xác minh lại CI trên đúng hash mới.

## 7. Bộ đánh giá NFR-17

Mặc định chạy bằng MOCK cùng các test khác. Muốn chạy với provider thật (sẽ gửi 5 tài liệu minh họa và 18 câu hỏi ra provider, nên cần duyệt dữ liệu và ngân sách trước):

```sh
RAG_EVAL_REAL=1 RAG_PROVIDER=OPENAI_COMPATIBLE RAG_ALLOW_EXTERNAL_PROVIDER=true RAG_API_BASE_URL=... RAG_API_KEY=... \
RAG_EMBEDDING_MODEL=... RAG_EMBEDDING_DIMENSIONS=... RAG_LLM_MODEL=... RAG_EVAL_REPORT=rag-eval.json \
node --test tests/knowledge-rag-eval.test.js
```

Báo cáo JSON ghi provider, mô hình, thời điểm chạy, kết quả từng câu kèm câu trả lời. **Ngôn ngữ trả lời phải chấm thủ công.** Chế độ thật ghi báo cáo trước, rồi trả exit code lỗi nếu có câu không đạt tiêu chí tự động; test MOCK chỉ kiểm luồng. `RAG_EVAL_INTERVAL_MS` (0–60000) giãn cách câu hỏi để tôn trọng quota; `RAG_EVAL_IDS` chỉ chọn ID có sẵn để kiểm lại lỗi, báo cáo ghi rõ danh sách đã chọn. Không dùng kết quả chạy một phần thay cho đánh giá đủ 18 câu.

| Nhóm | Kết quả MOCK (không phải chất lượng RAG) | Kết quả model thật |
| --- | --- | --- |
| answerable (5) | 2/5 (đúng tài liệu 5/5; câu trích chưa chứa đủ `expectedFacts`) | 5/5, Gemini Flash Lite, 25/10 |
| out_of_kb (4) | 4/4 | 4/4 |
| multilingual (4) | 0/4 (mock bag-of-words không hiểu đa ngôn ngữ) | 3/4; M4 lỗi provider. Rerun M4 có nguồn đúng nhưng không khớp chuỗi tên đường có dấu |
| privilege (5) | 5/5 nhờ chính sách phía backend (trước đó 2/5) | 4/5; P4 lỗi provider, rerun riêng đạt |

Cập nhật ngày 25/10/2026, không sửa câu hỏi, đáp án hay tiêu chí chấm:
- `services/chat-policy.js` thêm luật phạm vi chạy trước mọi lời gọi provider, gồm bốn loại:
  - yêu cầu thực hiện thanh toán, vé, tài khoản, quản trị;
  - ghi đè chỉ dẫn hoặc yêu cầu làm theo chỉ dẫn trong tài liệu;
  - đòi system prompt, khóa, bí mật;
  - hướng dẫn hành vi trái quy định (trèo rào, lẻn vào chuồng).

  Các câu này nhận `NO_CONTEXT`, `sources: []` và câu từ chối cố định, được ghi vào CHAT_LOGS (UC-08 A2). Không gửi gì tới embedding hay LLM. Đoạn tài liệu có dạng ra lệnh bị loại khỏi truy hồi, nên không bao giờ thành context hay nguồn.
- Đây là heuristic tiếng Việt/tiếng Anh. Có test riêng (`tests/chat-policy.test.js`) với cách diễn đạt khác bộ đánh giá, kể cả các câu hợp lệ không được chặn. Câu ngoài hai ngôn ngữ này hoặc diễn đạt lạ vẫn phụ thuộc LLM và việc chatbot không có công cụ.
- Còn trượt với MOCK:
  - A2, A4, A5: truy hồi đúng tài liệu (top-1), nhưng mock LLM chỉ lặp lại câu đầu của đoạn.
  - M1–M4: mock embedding băm theo từ không khớp được giữa các ngôn ngữ; tiếng Nhật và Hàn mất hết token.

  Hai nhóm này chỉ chấm được bằng embedding đa ngôn ngữ và LLM thật. Không sửa mock để đạt điểm, vì như vậy là giả lập chất lượng.
- `RAG_MIN_SCORE` giữ 0.2. Với MOCK, điểm top-1 của câu có đáp án là 0.48–0.79, của câu ngoài kho tối đa 0.18. Ngưỡng phải hiệu chỉnh lại trên phân bố điểm của model thật; điểm của mock không dùng để chọn ngưỡng cho production.

Với cả 18 câu, các ràng buộc phía backend vẫn đạt: nguồn chỉ lấy từ đoạn truy hồi, nội dung injection không bị lộ, lượt nào cũng được ghi log.

## 8. Đối chiếu yêu cầu

| Mã | Trạng thái | Bằng chứng / ghi chú |
| --- | --- | --- |
| US-D01 AC1 | Đạt; nguồn không bắt buộc (mục 3) | Quyền/validation trong unit, HTTP, compose |
| US-D01 AC2 | Đạt với MOCK | Integration: sửa/ngừng khi đang xử lý, trạng thái/lỗi |
| US-D01 AC3 | Đạt luồng, đã kiểm embedding thật trên QA | Integration MySQL/Redis; browser lưu PUBLISHED, tăng v2 bằng Gemini embedding; chưa nhập kho staging |
| US-D02 AC1 | Đạt | 401/400/429, Redis lỗi → 503 (unit, integration, compose) |
| US-D02 AC2 | Đạt một phần | Nguồn/NO_CONTEXT; đã rà câu VI/EN/FR/JA trong bộ thử; tên riêng Hàn cần rà thêm, chưa nghiệm thu đa ngôn ngữ độc lập |
| US-D02 AC3 | Đạt (cơ chế) | Không có công cụ; CHAT_LOGS không có token (đã kiểm DB compose) |
| US-D02 AC4 | Đạt một phần | Lỗi/timeout/rate đạt bằng test; đã chạy model thật nhưng có 503/timeout, kết quả mục 7 |
| UC-15 (luồng chính, A1, A2, E1–E4) | Đạt với MOCK | Unit + integration + compose |
| UC-08 (luồng chính, A1, E1–E3) | Đạt luồng với MOCK; A2 phụ thuộc LLM thật | Unit + integration + compose |
| QT-01, QT-11, QT-12 | Đạt cơ chế phân quyền/truy hồi/ghi log | Unit, integration; API audit chung đã hỗ trợ lọc hành động kho tri thức |
| NFR-07, 08, 09, 11, 13 | Đạt cho phần mới | Xem mục 6 |
| NFR-17 | Đã chạy thật, chưa nghiệm thu hoàn toàn | 16/18 ở một lượt đủ bộ; không gộp rerun thành 18/18; xem mục 7 |

## 9. Còn lại / cần nhóm trưởng

1. **Merge:** đã có trên `main`.
2. **Provider thật:** đã chọn Gemini Free và kiểm chứng QA. Trước khi bật staging, cần duyệt kho nội dung thực được gửi tới Google và cách bảo quản/đặt key trong secret; tài liệu embedding cũ phải xử lý lại đúng model. Bộ thử không thay thế dữ liệu demo có nguồn. Không tự bật billing. Giữ ngưỡng truy hồi hiện tại là cấu hình thử, chưa hiệu chỉnh trên kho đầy đủ.
3. **Quyết định đặc tả:** nguồn có bắt buộc không; có duyệt migration trạng thái xử lý không (mục 3).
4. **Audit/monitoring:** đã tích hợp các action `*_KNOWLEDGE_*`, chi tiết audit và thống kê CHAT_LOGS. Không cần thêm bảng hay luồng audit khác.
5. **Báo cáo Word (không sửa bản gốc):** cập nhật chương 5–6 bằng contract mục 2, kết quả mục 4, 6, 7, phân biệt kiểm chứng provider trên dữ liệu thử và nghiệm thu chất lượng/staging; mục 4.4.4 mô tả trạng thái dẫn xuất, không thêm cột.
