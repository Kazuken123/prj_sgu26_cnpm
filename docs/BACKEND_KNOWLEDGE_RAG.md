# Backend kho kiến thức và chatbot RAG — UC-15 / UC-08

Phạm vi: phần bổ sung của người nhận việc theo `GIAO_VIEC_KHO_TRI_THUC_RAG.md`. Toàn bộ backend có sẵn trước đó là đóng góp của người giao việc. Trạng thái: **chưa tích hợp** (router chưa gắn vào `server.js`), **chỉ kiểm bằng adapter MOCK**, chưa kiểm chứng chất lượng RAG với embedding/LLM thật. Code gốc: `76f1603` (cần người giao việc xác nhận là commit gốc; mốc tham chiếu trong tài liệu giao việc là `b6120c8`).

## 1. File bổ sung (không sửa file có sẵn, không migration, không dependency)

| File | Vai trò |
| --- | --- |
| `backend/routers/knowledge.router.js` | API quản trị kho kiến thức, `createAuthMiddleware` + `requireRole("STAFF","ADMIN")` |
| `backend/routers/chat.router.js` | API hỏi đáp, `createVisitorMiddleware(paymentService)`; `Cache-Control: no-store` |
| `backend/services/knowledge.service.js`, `knowledge.validation.js` | UC-15: Pha 1, chia đoạn, embedding ngoài transaction, Pha 2, xử lý lại, trạng thái dẫn xuất |
| `backend/services/chat.service.js`, `chat.validation.js`, `chat-prompt.js` | UC-08: kiểm tra, rate limit, truy hồi, gọi LLM, nguồn, NO_CONTEXT/FAILED, CHAT_LOGS |
| `backend/services/rag-support.js` | Timeout hữu hạn, kiểm vector, cosine, chia đoạn, che token/khóa |
| `backend/services/rag.config.js` | Cấu hình RAG/rate limit từ env, có mặc định (đặt tạm trong `services/` vì `config/` là phần dùng chung) |
| `backend/stores/knowledge.store.js`, `chat.store.js` | SQL tham số hóa, transaction qua `AuthStore.transaction`, audit qua `AuditLogStore.create(entry, connection)` |
| `backend/adapters/mock-embedding.js`, `mock-llm.js` | Adapter MOCK (chỉ kiểm luồng) |
| `backend/tests/knowledge.test.js`, `chat.test.js` | Unit/HTTP (Store giả lập, auth thật của fixture, `PaymentService.authenticateVisitor` thật) |
| `backend/tests/knowledge-rag.integration.test.js` | MySQL 8 + Redis thật, JWT nội bộ thật, token khách qua luồng tiền mặt thật |
| `backend/tests/knowledge-rag-eval.test.js`, `tests/fixtures/knowledge-rag-eval.json` | Bộ đánh giá NFR-17 (18 câu, 4 nhóm, tiêu chí cố định trước) |

## 2. Contract đề xuất (chưa phải contract đã chốt)

Lỗi theo quy ước có sẵn: `{ "code": "...", "error": "..." }`.

**Kho kiến thức** — `/api/admin/knowledge-documents`, Bearer JWT nội bộ, STAFF/ADMIN.

| Method | Path | Body | Kết quả |
| --- | --- | --- | --- |
| GET | `/` | query `status?=ACTIVE\|INACTIVE`, `page?`, `limit?≤100` | `{data:{items,total,page,limit}}` |
| GET | `/:id` | — | `{data: document}` (kèm `content`) |
| POST | `/` | `{title, content, source?}` | 201 `{data:{document, processing}}` |
| PUT | `/:id` | `{title, content, source?, expectedVersion}` | `{data:{document, processing}}`; 409 `KNOWLEDGE_VERSION_CONFLICT` |
| POST | `/:id/deactivate` | — | `{data: document}` (lặp lại là no-op) |
| POST | `/:id/reprocess` | — | `{data:{document, processing}}`; 409 `KNOWLEDGE_DOCUMENT_DEACTIVATED` |

`document`: `documentId, title, source, status (ACTIVE|INACTIVE), contentVersion, processingStatus (READY|PENDING|FAILED|DEACTIVATED), lastError, chunkCount, embeddingModel, createdAt, updatedAt`.
`processing`: `{result: PUBLISHED|FAILED|SUPERSEDED, code?, chunkCount?}`. Tài liệu đã lưu ở Pha 1 vẫn trả 201/200 khi embedding lỗi (UC-15 E4), để nhân viên bấm "Xử lý lại".
Giới hạn: tiêu đề ≤ 255, nội dung ≤ 20 000 ký tự, nguồn ≤ 1 000 (không bắt buộc), không nhận trường lạ. Body JSON còn bị giới hạn 32 KB bởi `server.js`.

**Chat** — `POST /api/chat/questions`, Bearer token khách `tcv_visit_…`, body đúng một trường `{ "question": "..." }` (≤ 1 000 ký tự). Phiên lấy từ `req.visit`, không nhận `sessionId/role` từ body.

```json
{ "data": { "status": "SUCCESS", "answer": "…",
  "sources": [{ "documentId": 12, "chunkId": "345", "sourceVersion": 3, "title": "Voi châu Á", "source": "…" }] } }
```

| HTTP | code | Khi nào | Ghi CHAT_LOGS |
| --- | --- | --- | --- |
| 200 | — | `status` SUCCESS hoặc NO_CONTEXT (`sources: []`) | Có |
| 400 | `INVALID_QUESTION` | Rỗng, quá dài, ký tự điều khiển, trường lạ | Không |
| 401 | `MISSING_VISITOR_TOKEN`, `INVALID_VISITOR_TOKEN`, `INVALID_VISITOR_SESSION`, `VISIT_SESSION_EXPIRED` | Từ middleware khách có sẵn | Không |
| 429 | `CHAT_RATE_LIMITED` | Vượt giới hạn theo phiên hoặc IP | Không |
| 503 | `CHAT_PROTECTION_UNAVAILABLE` | Redis lỗi: không bỏ giới hạn | Không |
| 503 | `CHAT_PROVIDER_UNAVAILABLE` | Embedding/LLM lỗi, timeout, trả sai định dạng; đọc truy hồi lỗi | Có, `FAILED`, `answer` NULL |
| 503 | `CHAT_LOG_UNAVAILABLE` | Không ghi được CHAT_LOGS | — |

`sources` luôn dựng từ các đoạn đã truy hồi mà mô hình trích dẫn; chunk id lạ bị loại, và câu trả lời không còn trích dẫn hợp lệ trở thành NO_CONTEXT. Liên kết trong câu trả lời không xuất hiện trong nguồn sẽ bị loại. Frontend phải hiển thị `answer` dạng text, không phải HTML.

## 3. Cách xử lý chính

- **UC-15 Pha 1:** khóa tài liệu, kiểm tra lại tài khoản trong transaction, lưu `INACTIVE` (tạo mới: version 1; sửa: version + 1), ghi `CREATE_/UPDATE_KNOWLEDGE_DOCUMENT` trong cùng transaction.
- **Ngoài transaction:** chia đoạn cố định có chồng lặp (800/120 ký tự, ngắt theo đoạn, câu, từ), embedding có timeout.
- **Pha 2:** kiểm tra lại version và tài liệu chưa bị ngừng; xóa toàn bộ đoạn cũ của tài liệu, chèn bộ đoạn mới, chuyển `ACTIVE`, ghi `PUBLISH_KNOWLEDGE_DOCUMENT`, tất cả trong một transaction. Lệch version → `SUPERSEDED`, không ghi gì.
- **Ngừng sử dụng (A1):** `INACTIVE` + tăng version + `DEACTIVATE_KNOWLEDGE_DOCUMENT` cùng transaction, nên tác vụ đang chạy không kích hoạt lại được.
- **Xử lý đồng bộ trong request:** không thêm cơ chế nền, không dùng `CONTENT_JOBS`. Tiến trình dừng giữa chừng thì tài liệu ở `PENDING` và nhân viên chạy lại (NFR-09).
- **Truy hồi:** chỉ `status='ACTIVE'`, `source_version = content_version`, `embedding_model` = mô hình cấu hình. Từng vector được kiểm là mảng số hữu hạn, đúng số chiều, khác vector 0. Lấy top-k theo cosine với ngưỡng tối thiểu. Mô hình phải khớp cả khi tạo embedding và khi hỏi.
- **Rate limit:** dùng `RedisStore.consumeLookup` có sẵn với key riêng `chat:ip:<sha256>`, `chat:session:<sha256>`; không đụng key hay TTL của phân hệ khác.
- **An toàn:** prompt đặt tài liệu/câu hỏi trong khối dữ liệu đã escape; chatbot không có công cụ. Token khách, JWT, `Bearer …`, `sk-…`, chuỗi hex 64 ký tự, `api_key=` bị che trước khi ghi log và trước khi gửi cho provider.

## 4. Biến cấu hình (mặc định dùng được, chưa đưa vào `.env.example`)

`RAG_PROVIDER=MOCK` (chỉ chấp nhận MOCK), `RAG_EMBEDDING_MODEL=mock-hash-v1`, `RAG_EMBEDDING_DIMENSIONS=256`, `RAG_EMBEDDING_TIMEOUT_MS=10000`, `RAG_LLM_TIMEOUT_MS=20000`, `RAG_CHUNK_SIZE=800`, `RAG_CHUNK_OVERLAP=120`, `RAG_MAX_CHUNKS=64`, `RAG_TOP_K=4`, `RAG_MIN_SCORE=0.2`, `CHAT_RATE_WINDOW_SECONDS=60`, `CHAT_RATE_SESSION_LIMIT=10`, `CHAT_RATE_IP_LIMIT=30`. Các ngưỡng là đề xuất, chưa được chốt; `RAG_MIN_SCORE` chỉ hiệu chỉnh cho mock.

## 5. Chạy kiểm thử (ngoài OneDrive, bản sao không có `.git`, `node_modules`, `.env`)

```sh
docker network create kb-rag-test-net
docker run -d --name kb-rag-test-mysql --network kb-rag-test-net -e MYSQL_ROOT_PASSWORD=kb-rag-test-only mysql:8.0
docker run -d --name kb-rag-test-redis --network kb-rag-test-net redis:7-alpine
docker run --rm --network kb-rag-test-net -v "$COPY":/app -w /app/backend \
  -e NODE_ENV=test -e RUN_DB_TESTS=1 -e RUN_REDIS_TESTS=1 -e DB_HOST=kb-rag-test-mysql -e DB_USER=root \
  -e DB_PASSWORD=kb-rag-test-only -e DB_NAME=food_tour_db -e REDIS_URL=redis://kb-rag-test-redis:6379 \
  -e JWT_SECRET=ci-test-only-secret-at-least-32-bytes node:20 sh -c "npm ci && npm run lint && npm run test:coverage"
```

Mật khẩu và secret trên chỉ dùng cho container thử, không phải bí mật thật. Integration test tự tạo rồi xóa database `tcv_knowledge_test_<uuid>`, Redis dùng prefix riêng. Đặt `RAG_EVAL_REPORT=<file>` để xuất báo cáo bộ đánh giá ra JSON.

**Kết quả ngày 23/10/2026 (Node 20.20.2, MySQL 8.0, Redis 7, local):** `npm run lint` đạt; `npm run test:coverage` **661/661 đạt**, 0 lỗi, 0 bỏ qua. Trong đó 55 test mới: 44 unit/HTTP, 10 integration MySQL/Redis, 1 bộ đánh giá. Toàn bộ test cũ vẫn đạt. Chưa xác minh CI GitHub vì chưa commit/push. Lưu ý: nếu thiếu `NODE_ENV=test`, 11 test cũ `data/demo/eight-pois` thất bại do chính điều kiện của chúng, không liên quan đến code mới.

**Smoke với server thật (23/10/2026, Node 20, MySQL 8 + Redis 7 trong container thử, DB `tcv_kb_smoke` riêng):**
- Chuẩn bị: `init_db.sql` → `npm run db:migrate` → `npm run bootstrap:admin`.
- Script tạm (không commit) dựng `express()` gồm `express.json` → 2 router mới (singleton mặc định, nối MySQL/Redis qua `DB_*`, `REDIS_URL`) → nguyên `createApp()` của `server.js` → `errorHandler`.
- Kết quả:

| Bước | Kết quả |
| --- | --- |
| `/health/ready` | 200 |
| Đăng nhập ADMIN | 200 |
| Tạo tài liệu | 201 `PUBLISHED`/`READY` |
| Danh sách tài liệu | `total = 1` |
| Không có token | 401 |
| Khách (token từ luồng tiền mặt `VISIT_PRICE_VND=50000`) hỏi | 200 `SUCCESS`, có nguồn |
| JWT nội bộ gọi chat | 401 |
| Route cũ `/api/admin/pois` | 200 |
| CHAT_LOGS | 1 dòng `SUCCESS` |

`server.js` gốc chưa có 2 route này cho tới khi áp dụng mục 8.1.

## 6. Bộ đánh giá NFR-17 — kết quả MOCK (không phải chất lượng RAG)

| Nhóm | MOCK đạt | Ý nghĩa |
| --- | --- | --- |
| answerable (5) | 5/5 | Luồng truy hồi và nguồn đúng trên dữ liệu có kiểm soát |
| out_of_kb (4) | 4/4 | Ngưỡng điểm loại câu ngoài kho trên dữ liệu này |
| multilingual (4) | 0/4 | Mock bag-of-words không hiểu đa ngôn ngữ: cần embedding đa ngôn ngữ thật |
| privilege (5) | 2/5 | Mock không biết từ chối. Invariant backend vẫn đạt cả 18 câu: không lộ nội dung injection, nguồn chỉ từ truy hồi, không có công cụ để gọi |

Ngôn ngữ câu trả lời, độ đúng sự kiện và khả năng từ chối **chưa kiểm chứng**. Dữ liệu trong bộ đánh giá là dữ liệu minh họa.

## 7. Đối chiếu yêu cầu

| Mã | Trạng thái | Bằng chứng / ghi chú |
| --- | --- | --- |
| US-D01 AC1 (STAFF/ADMIN tạo/sửa/ngừng; tiêu đề, nội dung, nguồn) | Đạt một phần (mock) | `knowledge.test.js` quyền/validation; nguồn **không bắt buộc**, xem mục 8.4 |
| US-D01 AC2 (xử lý, trạng thái/lỗi, không dùng nội dung cũ) | Đạt (mock), trạng thái dẫn xuất từ audit | integration "edit during embedding", "deactivation during embedding", "retrieval excludes…" |
| US-D01 AC3 (truy hồi được, bị loại sau khi ngừng) | Đạt với mock | integration HTTP + "retrieval excludes…"; chưa kiểm embedding thật |
| US-D02 AC1 (chỉ phiên hợp lệ; dữ liệu, tần suất) | Đạt | `chat.test.js` HTTP 401; integration hết hạn, 429, Redis lỗi |
| US-D02 AC2 (truy hồi, ngôn ngữ, nguồn, thiếu căn cứ) | Đạt một phần | Nguồn/NO_CONTEXT đạt với mock; **ngôn ngữ trả lời chưa kiểm chứng** |
| US-D02 AC3 (không công cụ; log thời điểm/phiên/nguồn/trạng thái, không secret) | Đạt (mock) | Test che token, CHAT_LOGS không chứa token |
| US-D02 AC4 (provider lỗi/timeout; bộ đánh giá; kiểm chứng thật) | Đạt một phần | Lỗi/timeout đạt; bộ đánh giá có; **chưa chạy provider thật** |
| UC-15 luồng chính, A1, A2, E1–E4 | Đạt (mock) | `knowledge.test.js`, integration (trigger SQL gây lỗi chunks/audit) |
| UC-08 luồng chính, A1, A2, E1–E3 | Đạt luồng với mock; A2 phụ thuộc LLM thật | `chat.test.js`, integration |
| QT-01 | Đạt | Token khách → API quản trị 401; JWT → chat 401 |
| QT-11 | Đạt về cơ chế | Chỉ dùng nguồn ACTIVE/version hiện hành; không có công cụ |
| QT-12 | Đạt ghi audit | Hành động mới **chưa lọc/đọc được** qua API audit (mục 8.5) |
| NFR-07 | Đạt | Tại ngưỡng/vượt ngưỡng, Redis lỗi → 503 |
| NFR-08 | Đạt cho phần mới | SQL tham số hóa; che token; frontend cần hiển thị text |
| NFR-09 | Đạt | Lưu lặp, tác vụ cũ gặp bản mới, xử lý lại không trùng |
| NFR-11 | Đạt (mock) | Timeout hữu hạn, lỗi chat không ảnh hưởng API khác |
| NFR-13 | Đạt | `npm run lint` kiểm tra phân lớp |
| NFR-17 | Có bộ đánh giá + harness; **chưa kiểm chứng thật** | `knowledge-rag-eval.test.js` |

## 8. Việc cần người giao việc quyết định hoặc tích hợp

1. **Gắn router (`server.js`, file dùng chung — chưa sửa, chờ người điều phối duyệt):** thay đổi tối thiểu gồm 3 chỗ.
   ```js
   // đầu file
   const { createKnowledgeRouter } = require("./routers/knowledge.router");
   const defaultKnowledgeService = require("./services/knowledge.service");
   const { createChatRouter } = require("./routers/chat.router");
   const defaultChatService = require("./services/chat.service");
   // tham số createApp({...}): thêm
   knowledgeService = defaultKnowledgeService, chatService = defaultChatService
   // sau dòng app.use("/api/admin/payments", ...), trước createFrontendRouter/errorHandler
   app.use("/api/admin/knowledge-documents", createKnowledgeRouter(authService, knowledgeService));
   app.use("/api/chat", createChatRouter(paymentService, chatService));
   ```
   - Import các module mới không tạo kết nối DB/Redis (pool của mysql2 kết nối lười; cấu hình RAG đọc khi có request đầu tiên).
   - Cấu hình RAG sai thì request đầu tiên trả 500 `INTERNAL_ERROR`, không làm sập tiến trình.
   - Nên chạy lại `server.test.js` và `frontend.http.test.js` sau khi gắn.
2. **Provider thật (blocker cho NFR-17 / US-D02 AC4):** cần chốt nhà cung cấp, mô hình embedding (đa ngôn ngữ), số chiều, LLM, dữ liệu được phép gửi và ngân sách. Sau đó chỉ cần thêm adapter HTTP (`fetch` có sẵn trong Node 20, không thêm dependency) cùng `getRagConfig` cho provider mới.
3. **Trạng thái xử lý (đề xuất migration, chưa thực hiện):** schema chỉ có ACTIVE/INACTIVE. Hiện `PENDING/FAILED/DEACTIVATED` và `lastError` được dẫn xuất từ AUDIT_LOGS của tài liệu (ghi nguyên tử cùng thay đổi). Phương án sạch hơn là thêm cột `processing_status`, `last_error_code` vào KNOWLEDGE_DOCUMENTS (và chỉ mục `(resource_type, resource_id)` nếu tiếp tục dẫn xuất từ audit).
4. **Nguồn bắt buộc hay không:** US-D01 AC1 ghi "tài liệu có … nguồn", UC-15 bước 5 ghi "khuyến nghị", E2 và schema chỉ bắt buộc tiêu đề/nội dung. Hiện đang **không bắt buộc**; đổi được bằng một dòng trong `knowledge.validation.js`.
5. **API audit:** `services/audit.validation.js` / `audit-details.js` có danh sách action cố định, nên các action mới không lọc được và `details` bị ẩn. Đây là phần tra cứu audit chung, không thuộc gói này.
6. **Cấu hình:** có chuyển `services/rag.config.js` sang `config/` không, và đưa biến nào vào `.env.example`.
7. **Monitoring** vẫn trả `chatbot: NOT_IMPLEMENTED` (không thuộc gói). CHAT_LOGS đã có dữ liệu để thống kê.
8. **Phiên hết hạn giữa lúc xử lý:** quyền khách được kiểm tra khi request bắt đầu (như các API khách có sẵn); câu trả lời của request đó vẫn được trả.

## 9. Mục báo cáo Word cần cập nhật (không sửa Word gốc)

Chương 5–6: phần đã xây dựng của UC-15/UC-08, contract mục 2, kết quả test mục 5, kết quả đánh giá mock mục 6 với ghi chú "chưa kiểm chứng provider thật". Mục 4.4.4: cách hiển thị trạng thái xử lý (dẫn xuất từ AUDIT_LOGS) nếu không duyệt migration.
