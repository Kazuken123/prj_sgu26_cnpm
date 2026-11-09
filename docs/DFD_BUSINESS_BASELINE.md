# Căn cứ nghiệp vụ của bộ DFD

Bộ DFD bám Chương 2, QT-01–QT-14, mục 3.1–3.3 và 16 bảng Chương 4 của báo cáo Thảo Cầm Viên Sài Gòn. Các điểm nguồn đã được xác nhận trong đợt sửa ngày 09/11/2026: tên hệ thống thống nhất; UC-06 dùng 30 m mặc định và có bước phát audio; audio WAV; UC-12 nhận mã 6 số, vẫn là Could Have. Không đưa GPS tracking, tour cá nhân lưu server hoặc các bảng ANALYTICS_* vào phạm vi.

## Ranh giới và truy vết

Ranh giới gồm cả web và backend. GPS, trình phát và sắp tour khách nằm tại client. MySQL, Redis, media, worker và adapter là thành phần bên trong; tác nhân ngoài là khách, STAFF, ADMIN, cổng thanh toán, dịch/TTS và embedding/LLM. ADMIN kế thừa quyền STAFF.

| Nhóm DFD | Use case | Điều kiện phải giữ |
| :--- | :--- | :--- |
| 1.0 Thanh toán/quyền khách | UC-01,02,11,12 | Một phiên/payment; webhook độc lập redirect; xác nhận hợp lệ rồi mới đổi mã một lần; cấp lại giữ hạn vé. |
| 2.0 Khai thác nội dung | UC-03–07 | Bundle chứa URL, không chứa byte audio; GPS và tour tùy chỉnh tại client; không ghi GPS/tour cá nhân vào SQL. |
| 3.0 RAG | UC-08 | Hạn mức Redis; embedding câu hỏi → truy hồi ACTIVE đúng phiên bản → prompt/LLM → kiểm tra nguồn → CHAT_LOGS. |
| 4.0 Quản trị nội dung | UC-13–15 | Yêu cầu POI, tour, tài liệu đi vào đúng chức năng; dữ liệu nguồn, tác vụ, tệp và metadata tách biệt; chống kết quả cũ ghi đè. |
| 5.0 Tài khoản/giám sát | UC-09,10,16–18 | STAFF/ADMIN có đăng nhập/đăng xuất riêng; tạo STAFF/audit/monitoring không đi qua đăng nhập để điều phối; các chức năng đọc không sửa dữ liệu. |

## Kho dữ liệu

| Kho | Bảng hoặc loại lưu trữ |
| :--- | :--- |
| D1 | USERS |
| D2 | REFRESH_TOKENS |
| D3 | VISIT_SESSIONS |
| D4 | PAYMENTS |
| D5 | LANGUAGES |
| D6 | POIS, POI_TRANSLATIONS |
| D7 | AUDIOS |
| D8 | CONTENT_JOBS |
| D9 | TOURS, TOUR_POIS |
| D10 | KNOWLEDGE_DOCUMENTS, KNOWLEDGE_CHUNKS |
| D11 | AUDIT_LOGS |
| D12 | CHAT_LOGS |
| D13 | BUNDLE_ACCESS_LOGS |
| R1 | Mã tạm và hạn mức Redis, có TTL |
| M1 | Byte tệp media; metadata/đường dẫn ở SQL |

Các ký hiệu kho/tác nhân có thể lặp để giảm đường giao nhau nhưng giữ cùng mã logic. Tiến trình thật chỉ xuất hiện một lần trong một sơ đồ; tiến trình ngoài phạm vi sơ đồ mức 3 được ghi là tham chiếu mức cha.

## Nguồn và kiểm tra

- Nguồn Use Case: `docs/diagram/use case/`; đặc tả UC trong `docs/CNPM_BAOCAO.docx`, đồng bộ với Google Docs của báo cáo.
- `scripts/dfd_business_model.py`: từ điển dữ liệu và ánh xạ UC của từng luồng; F01–F28 là họ dữ liệu, có các thành phần khi phân rã. Không cố định số mũi tên ở mức con bằng số mũi tên ở mức cha.
- `docs/diagram/dfd/dfd_source_manifest.json`: dấu kiểm nội dung nguồn đã chốt; thay đổi UC/schema cần được rà soát trước khi cập nhật dấu kiểm.
- `scripts/generate_balanced_dfd_drawio.py`: trước mỗi sơ đồ đọc/kiểm tra nguồn và hợp đồng nghiệp vụ, sau đó mới bố trí hình.
- `scripts/verify_lvl1_lvl2_balance.py`: kiểm tra nguồn, 18 UC, 16 bảng, thứ tự embedding, quyền STAFF/ADMIN, nguồn monitoring, không ghi tour cá nhân/GPS; kiểm tra bảo toàn thành phần dữ liệu và chiều kho giữa các mức, hình học và nguồn UC của từng mũi tên.
- Bảng báo cáo lấy từ từ điển nghiệp vụ được truy vết, không dùng chính sơ đồ để tự chứng minh yêu cầu đúng.

Lệnh tái sinh: chạy kiểm tra nguồn, sinh Draw.io, xuất PNG, cập nhật bảng báo cáo, dựng mục 3.4 của Word. Chỉ đồng bộ Google Docs sau khi kiểm tra hình và tài liệu. Tệp `full_gdoc_sync.py` xuất manifest cho connector; không tự xóa hoặc nối nội dung vào cuối Google Docs.

Schema được đối chiếu từ repository. Bộ DFD không khẳng định trạng thái migration của một database đang chạy và không thay đổi schema hoặc nghiệp vụ ứng dụng.
