# Căn cứ nghiệp vụ của bộ DFD

Bộ DFD bám Chương 2, QT-01–QT-14, mục 3.1–3.3 và 16 bảng Chương 4 của báo cáo Thảo Cầm Viên Sài Gòn. Tên hệ thống đã thống nhất; UC-06 dùng 30 m mặc định và có bước phát audio; định dạng audio WAV; UC-12 dùng mã nhận vé 6 số và giữ mức Could Have. Không thêm GPS tracking, tour cá nhân lưu server hoặc các bảng ANALYTICS_*.

## Mức 1 tương ứng 18 Use Case

Theo yêu cầu đã xác nhận, mỗi Use Case là một chức năng riêng ở mức 1. Số hiệu n.0 tương ứng UC-nn; không gộp thành năm nhóm chức năng.

| Tiến trình | Use Case | Chức năng |
| :--- | :--- | :--- |
| 1.0 | UC-01 | Thanh toán trực tuyến |
| 2.0 | UC-02 | Thanh toán tiền mặt |
| 3.0 | UC-03 | Xem bản đồ và thông tin POI |
| 4.0 | UC-04 | Lựa chọn ngôn ngữ |
| 5.0 | UC-05 | Nghe thuyết minh thủ công |
| 6.0 | UC-06 | Nghe thuyết minh tự động theo vị trí |
| 7.0 | UC-07 | Lựa chọn và tùy chỉnh lộ trình |
| 8.0 | UC-08 | Hỏi đáp bằng chatbot RAG |
| 9.0 | UC-09 | Đăng nhập nội bộ |
| 10.0 | UC-10 | Đăng xuất nội bộ |
| 11.0 | UC-11 | Xác nhận thanh toán tiền mặt |
| 12.0 | UC-12 | Cấp lại token khách |
| 13.0 | UC-13 | Quản lý POI và nội dung đa ngôn ngữ |
| 14.0 | UC-14 | Quản lý lộ trình mẫu |
| 15.0 | UC-15 | Quản lý kho kiến thức |
| 16.0 | UC-16 | Tạo tài khoản STAFF |
| 17.0 | UC-17 | Xem nhật ký thao tác |
| 18.0 | UC-18 | Giám sát sức khỏe và sử dụng |

Mức 2 phân rã năm chức năng phức tạp 1.0, 3.0, 8.0, 13.0 và 18.0. Mười ba chức năng còn lại là các tiến trình lá ở mức 1. Mức 3 phân rã 13.2 dịch–TTS và 8.4 sinh câu trả lời RAG; không dùng lại số hiệu của mô hình năm nhóm cũ.

Ranh giới gồm cả web và backend. GPS, phát audio và lộ trình tùy chỉnh chạy tại client. Tác nhân ngoài là khách, STAFF, ADMIN, cổng thanh toán, dịch/TTS và embedding/LLM. ADMIN kế thừa quyền STAFF. Đăng nhập không điều phối các yêu cầu quản trị khác; mỗi chức năng nhận dữ liệu và kiểm tra quyền của chính nó.

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


## Bố cục và kiểm tra

Mỗi DFD là một ảnh PNG và một trang Draw.io nguyên vẹn; không chia ảnh thành các phần tiếp nối. Tiến trình thật chỉ xuất hiện một lần trong sơ đồ. Vòng tròn có mã tiến trình là đầu nối tới phần tử cùng mã; tác nhân/kho lặp giữ cùng mã logic. Chữ đậm, nét đen 3,5 đơn vị, nhãn nằm trên mũi tên. Word chèn ảnh trên trang khổ lớn riêng để phóng to xem; các trang văn bản/bảng giữ khổ báo cáo.

Trước mỗi lần vẽ, `validate_business_sources()` đọc lại dấu kiểm nguồn báo cáo, đủ 18 đặc tả Use Case, sơ đồ Use Case và schema. Tên 18 tiến trình phải khớp trực tiếp các bảng đặc tả trong Word. Đổi nguồn nghiệp vụ cần được rà soát trước khi cập nhật dấu kiểm; không tự mở rộng phạm vi để làm cân bằng luồng.

- `dfd_business_model.py`: chức năng, dữ liệu và truy vết UC; 13 kho SQL tương ứng đúng 16 bảng.
- `generate_balanced_dfd_drawio.py`: sinh 9 sơ đồ nguyên vẹn sau khi kiểm tra nguồn.
- `verify_lvl1_lvl2_balance.py`: kiểm tra đủ 18 chức năng, luồng ngữ cảnh, biên từng tiến trình được phân rã, kho đọc/ghi và luồng biên mức 3.
- `verify_dfd_readability.py`: kiểm tra một ảnh/trang cho mỗi sơ đồ, chữ đậm, nét dày, nhãn không che mũi tên và độ phân giải đủ để phóng to.
- Bảng 3.19–3.28 lấy từ từ điển nghiệp vụ; `rebuild_docx_section_3_4.py` chèn 9 ảnh khổ lớn, `full_gdoc_sync.py` xuất manifest cho connector Google Docs.

Schema được đối chiếu từ repository. Bộ DFD không khẳng định trạng thái migration của database đang chạy và không thay đổi schema hoặc nghiệp vụ ứng dụng.
