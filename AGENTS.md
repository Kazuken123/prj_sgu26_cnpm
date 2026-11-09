# Project Rules & Git Hygiene Guidelines

## 1. Local-Only Files (Không commit/push lên Git/GitHub)
Các file sau đây chỉ phục vụ công việc tại local, không phải mã nguồn ứng dụng (codebase), tuyệt đối không commit hoặc push lên GitHub:
- **Presentation generator scripts & outputs:** `generate_presentation*.py`, `*.pptx`, `Bao_Cao_Thuyet_Trinh*`, `cam_nang_thuyet_trinh*`, `CAM_NANG_THUYET_TRINH*`, `KICH_BAN_THUYET_TRINH*`, `docs/slides_pdf_images/`.
- **Python cache & bytecode:** `__pycache__/`, `*.pyc`, `*.pyo`, `.pytest_cache/`.
- **Scratch & planning notes:** `gratify.md`, `PLAN.md`, các file log, file tạm.

## 2. Quy trình kiểm tra trước khi Commit & Push
- Trước khi thực hiện `git commit` hoặc `git push`, luôn kiểm tra danh sách file bằng `git status`.
- Nếu có file phát sinh ngoài codebase lọt vào vùng theo dõi, phải dùng `git rm --cached` để giữ file ở local và xoá khỏi git tracking, đồng thời khai báo mẫu loại trừ vào `.gitignore`.
