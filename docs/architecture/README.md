# Kiến trúc Hệ thống & Cơ sở dữ liệu Thảo Cầm Viên Sài Gòn

Tài liệu này chứa các sơ đồ kiến trúc và cơ sở dữ liệu dạng HTML tương tác độc lập (interactive standalone HTML) được tạo bởi công cụ và kỹ năng **Archify** (`.agents/skills/archify`).

## 1. Danh sách Sơ đồ Tương tác

| Sơ đồ | Định dạng | Mô tả nội dung | Liên kết file |
|---|---|---|---|
| **Kiến trúc Hệ thống (System Architecture)** | HTML Tương tác | Luồng khách tham quan (Mobile/PWA), quầy vé (Staff POS), API Gateway Express, Content/Audio 15 ngôn ngữ, RAG Chatbot Gemini, Piper TTS, MariaDB, Redis và hạ tầng Render | [architecture-tcv-audioguide.html](./architecture-tcv-audioguide.html) |
| **Cơ sở dữ liệu (Database ERD)** | HTML Tương tác | Thực thể và quan hệ CSDL MariaDB: phân hệ người dùng & bảo mật (`USERS`, `REFRESH_TOKENS`), phiên & thanh toán (`VISIT_SESSIONS`, `PAYMENTS`), tour & POI đa ngữ (`POIS`, `AUDIOS`), kho tri thức (`KNOWLEDGE_CHUNKS`, `CHAT_LOGS`) | [erd-tcv-database.html](./erd-tcv-database.html) |

## 2. Các tính năng của Sơ đồ Archify

- **Tương tác động (Live / Motion):** Tự động mô phỏng dòng dữ liệu và request giữa các tầng thành phần.
- **Chế độ Sáng / Tối (Light / Dark mode):** Tùy chỉnh giao diện hiển thị phù hợp.
- **Thẻ thông tin (Info Cards):** Tóm tắt nhanh các khía cạnh nghiệp vụ, bảo mật, địa lý và hạ tầng.
- **Góc nhìn định hướng (Guided Views):** Chọn nhanh góc nhìn theo từng luồng:
  - *Visitor Experience:* Trải nghiệm khách tham quan trên bản đồ số và thuyết minh audio.
  - *RAG AI Assistant:* Luồng hỏi đáp tự động với mô hình Gemini và Vector Search.
  - *Staff Operations:* Luồng bán vé tại quầy, cấp mã 6 số và quản lý nội dung.
- **Trích dẫn mã nguồn (Source Evidence):** Liên kết trực tiếp đến commit Git `1b9e17c3de63386d6c875c1dafb8e370a4ebc9f2` trên GitHub.

## 3. Cách cập nhật hoặc kết xuất lại sơ đồ

Kỹ năng Archify đã được tích hợp sẵn vào dự án tại thư mục `.agents/skills/archify/`.

Kiểm tra công cụ:
```bash
node .agents/skills/archify/bin/archify.mjs doctor
```

Kiểm tra và hoàn thiện sơ đồ:
```bash
# Sơ đồ kiến trúc
node .agents/skills/archify/bin/archify.mjs finalize architecture .archify/architecture-tcv-audioguide-20261026-130800/candidate.json docs/architecture/architecture-tcv-audioguide.html --repo-root . --quality showcase --json

# Sơ đồ cơ sở dữ liệu (ERD)
node .agents/skills/archify/bin/archify.mjs finalize erd .archify/erd-tcv-database-20261026-131300/candidate.json docs/architecture/erd-tcv-database.html --repo-root . --quality standard --json
```
