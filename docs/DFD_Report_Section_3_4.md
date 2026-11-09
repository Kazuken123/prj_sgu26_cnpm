### 3.4. Sơ đồ luồng dữ liệu DFD

Phần này mô tả chi tiết các luồng dữ liệu di chuyển qua các tiến trình xử lý trong hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn. Hệ thống được phân rã theo bốn cấp độ từ mức 0 đến mức 3, tương tác với sáu tác nhân ngoài gồm Khách tham quan, Nhân viên, Quản trị viên, Cổng thanh toán, Dịch vụ dịch và TTS, Dịch vụ embedding và LLM, cùng sáu kho dữ liệu lưu trữ từ D1 đến D6.

#### 3.4.1. Sơ đồ DFD mức 0

Sơ đồ mức 0 biểu diễn ranh giới ngoài cùng của toàn bộ hệ thống qua một tiến trình trung tâm duy nhất, xác định các luồng thông tin trao đổi trực tiếp với sáu tác nhân bên ngoài ranh giới ứng dụng.

![Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống](diagram/export/DFD_Level_0_Context.png)

*Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống*

*Bảng 3.19: Bảng mô tả luồng dữ liệu DFD mức 0*

| Số hiệu luồng | Hướng truyền dữ liệu | Tên luồng dữ liệu | Nội dung dữ liệu trao đổi |
| :--- | :--- | :--- | :--- |
| F01 | Khách tham quan → Hệ thống (0) | Yêu cầu thanh toán & mã đổi phiên | Thông tin tạo giao dịch hoặc mã một lần/mã ngắn dùng đổi token phiên. |
| F02 | Hệ thống (0) → Khách tham quan | Thông tin thanh toán & token phiên | Thông tin giao dịch thanh toán và token phiên tham quan. |
| F03 | Khách tham quan → Hệ thống (0) | Yêu cầu nội dung, GPS & hiện diện | Ngôn ngữ, yêu cầu nội dung, tọa độ GPS và tín hiệu hiện diện. |
| F04 | Hệ thống (0) → Khách tham quan | Gói bản đồ, lộ trình & tệp âm thanh | Điểm tham quan, dữ liệu bản đồ, lộ trình và nội dung âm thanh. |
| F05 | Khách tham quan → Hệ thống (0) | Câu hỏi tra cứu thông tin | Nội dung câu hỏi của khách cần tra cứu. |
| F06 | Hệ thống (0) → Khách tham quan | Câu trả lời có trích dẫn nguồn | Văn bản trả lời cùng danh sách nguồn trích dẫn hợp lệ. |
| F07 | Nhân viên → Hệ thống (0) | Xác nhận tiền mặt & tra cứu phiên | Thông tin xác nhận thu tiền mặt hoặc tiêu chí tra cứu phiên khách. |
| F08 | Hệ thống (0) → Nhân viên | Mã ngắn 6 chữ số & token cấp lại | Mã ngắn sáu chữ số hoặc token cấp lại cho phiên cần hỗ trợ. |
| F09 | Nhân viên → Hệ thống (0) | Dữ liệu điểm tham quan, tour & tài liệu | Thông tin điểm tham quan, nội dung nguồn, tour và tài liệu kiến thức. |
| F10 | Hệ thống (0) → Nhân viên | Kết quả cập nhật & tiến độ tác vụ | Kết quả lưu dữ liệu và tiến độ xử lý tác vụ nội dung. |
| F11 | Quản trị viên → Hệ thống (0) | Hồ sơ nhân viên mới & bộ lọc giám sát | Hồ sơ nhân viên cần tạo và tiêu chí lọc nhật ký, báo cáo. |
| F12 | Hệ thống (0) → Quản trị viên | Hồ sơ đã tạo, nhật ký & báo cáo | Hồ sơ nhân viên đã tạo, danh sách nhật ký và báo cáo giám sát. |
| F13 | Hệ thống (0) → Cổng thanh toán | Yêu cầu giao dịch thanh toán | Thông tin đơn hàng, số tiền và dữ liệu yêu cầu giao dịch. |
| F14 | Cổng thanh toán → Hệ thống (0) | Webhook kết quả thanh toán chữ ký số | Trạng thái, mã giao dịch và chữ ký số của webhook. |
| F15 | Hệ thống (0) → Dịch vụ dịch và TTS | Văn bản gốc & yêu cầu tạo giọng đọc | Văn bản nguồn, ngôn ngữ đích và tham số tổng hợp giọng đọc. |
| F16 | Dịch vụ dịch và TTS → Hệ thống (0) | Bản dịch đa ngôn ngữ & tệp âm thanh WAV | Văn bản đã dịch và dữ liệu tệp âm thanh định dạng WAV. |
| F17 | Hệ thống (0) → Dịch vụ embedding và LLM | Câu hỏi truy vấn & ngữ cảnh trích dẫn | Câu hỏi đã chuẩn hóa kèm các đoạn kiến thức và mã nguồn trích dẫn. |
| F18 | Dịch vụ embedding và LLM → Hệ thống (0) | Kết quả đối chiếu & câu trả lời mô hình | Kết quả đối chiếu cùng văn bản trả lời của mô hình. |
| F19 | Hệ thống (0) → Dịch vụ embedding và LLM | Đoạn tài liệu kiến thức cần tạo vector | Các đoạn văn bản kiến thức cần biểu diễn thành vector. |
| F20 | Dịch vụ embedding và LLM → Hệ thống (0) | Mảng vector nhúng của đoạn tài liệu | Mảng số thực biểu diễn vector nhúng cho từng đoạn tài liệu. |

---

#### 3.4.2. Sơ đồ DFD mức 1

Sơ đồ mức 1 phân rã toàn bộ hệ thống thành năm tiến trình chức năng chính từ 1.0 đến 5.0, kết nối đầy đủ và cân bằng với sáu tác nhân ngoài cùng sáu kho dữ liệu logic từ D1 đến D6.

![Hình 3.39: Sơ đồ DFD mức 1 phân rã toàn hệ thống](diagram/export/DFD_Level_1_System.png)

*Hình 3.39: Sơ đồ DFD mức 1 phân rã toàn hệ thống*

*Bảng 3.20: Ánh xạ kho dữ liệu logic với cấu trúc lưu trữ vật lý*

| Mã kho | Tên kho dữ liệu logic | Thành phần lưu trữ vật lý tương ứng | Mục đích lưu trữ trong hệ thống |
| :--- | :--- | :--- | :--- |
| D1 | Tài khoản và Phiên nội bộ | Bảng USERS, bảng REFRESH_TOKENS, bộ khóa phiên Redis | Quản lý thông tin đăng nhập, mật khẩu băm, quyền hạn nhân viên và token làm mới phiên làm việc |
| D2 | Phiên tham quan và Thanh toán | Bảng VISIT_SESSIONS, bảng PAYMENTS, bộ khóa mã tạm thời Redis | Quản lý token phiên 24 giờ của khách, lịch sử giao dịch tiền mặt hoặc cổng thanh toán, mã một lần và mã ngắn 6 chữ số |
| D3 | Điểm tham quan và Nội dung đa ngôn ngữ | Bảng LANGUAGES, bảng POIS, bảng POI_TRANSLATIONS, bảng AUDIOS, bảng CONTENT_JOBS, kho tệp Media | Lưu trữ tọa độ địa lý, bán kính kích hoạt GPS, văn bản thuyết minh đa ngôn ngữ, tệp âm thanh WAV và hàng đợi tác vụ nền |
| D4 | Lộ trình tham quan | Bảng TOURS, bảng TOUR_POIS | Lưu trữ danh mục các tour tham quan gợi ý theo chủ đề và danh sách thứ tự các điểm dừng trong từng lộ trình |
| D5 | Kho kiến thức | Bảng KNOWLEDGE_DOCUMENTS, bảng KNOWLEDGE_CHUNKS | Lưu trữ các văn bản tài liệu nguồn phục vụ hỏi đáp thông minh, các đoạn văn bản phân đoạn và mảng vector nhúng ngữ nghĩa |
| D6 | Nhật ký và Thống kê | Bảng AUDIT_LOGS, bảng CHAT_LOGS, bảng BUNDLE_ACCESS_LOGS, bảng ANALYTICS_SESSIONS, bảng ANALYTICS_PRESENCE, bảng ANALYTICS_POI_VISITS | Ghi vết hành động quản trị, lịch sử hỏi đáp chatbot, lượt tải nội dung, trạng thái hiện diện trực tuyến và tần suất khách ghé các điểm |

Ở mức phân tích logic, D6 bao gồm nhật ký và tập số liệu vận hành tổng hợp; các chỉ số nghiệp vụ được biểu diễn qua kho logic này, không khẳng định tồn tại thêm bảng vật lý hoặc thay đổi mã nguồn ứng dụng. Tiến trình 5.4 đọc D6 và số liệu tài khoản, phiên nội bộ từ D1. Các luồng điều phối nội bộ trong Bảng 3.22–3.28 ghi rõ tiến trình trung gian thay vì mô tả là trao đổi trực tiếp với tác nhân ngoài.

*Bảng 3.21: Bảng mô tả năm tiến trình chính trong DFD mức 1*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Kho dữ liệu đọc/ghi | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 | Quản lý thanh toán và phiên tham quan | Khách tham quan → F01: Yêu cầu thanh toán & mã đổi phiên; Nhân viên → F07: Xác nhận tiền mặt & tra cứu phiên; Cổng thanh toán → F14: Webhook kết quả thanh toán chữ ký số | Ghi D2; Đọc D2; Ghi D6 | F02: Thông tin thanh toán & token phiên → Khách tham quan; F08: Mã ngắn 6 chữ số & token cấp lại → Nhân viên; F13: Yêu cầu giao dịch thanh toán → Cổng thanh toán |
| 2.0 | Cung cấp nội dung bản đồ, lộ trình và thuyết minh | Khách tham quan → F03: Yêu cầu nội dung, GPS & hiện diện | Đọc D2; Đọc D3; Đọc D4; Ghi D6 | F04: Gói bản đồ, lộ trình & tệp âm thanh → Khách tham quan |
| 3.0 | Xử lý hỏi đáp thông minh RAG | Khách tham quan → F05: Câu hỏi tra cứu thông tin; Dịch vụ embedding và LLM → F18: Kết quả đối chiếu & câu trả lời mô hình | Đọc D2; Đọc D5; Ghi D6 | F06: Câu trả lời có trích dẫn nguồn → Khách tham quan; F17: Câu hỏi truy vấn & ngữ cảnh trích dẫn → Dịch vụ embedding và LLM |
| 4.0 | Quản trị nội dung, lộ trình và kho kiến thức | Nhân viên → F09: Dữ liệu điểm tham quan, tour & tài liệu; Dịch vụ dịch và TTS → F16: Bản dịch đa ngôn ngữ & tệp âm thanh WAV; Dịch vụ embedding và LLM → F20: Mảng vector nhúng của đoạn tài liệu | Ghi D3; Đọc D3; Ghi D4; Ghi D5; Ghi D6 | F10: Kết quả cập nhật & tiến độ tác vụ → Nhân viên; F15: Văn bản gốc & yêu cầu tạo giọng đọc → Dịch vụ dịch và TTS; F19: Đoạn tài liệu kiến thức cần tạo vector → Dịch vụ embedding và LLM |
| 5.0 | Quản trị tài khoản nội bộ và giám sát hệ thống | Quản trị viên → F11: Hồ sơ nhân viên mới & bộ lọc giám sát | Đọc D1; Ghi D1; Đọc D6; Ghi D6 | F12: Hồ sơ đã tạo, nhật ký & báo cáo → Quản trị viên |

---

#### 3.4.3. Sơ đồ DFD mức 2

DFD mức 2 phân rã chi tiết từng tiến trình trong năm tiến trình chính ở mức 1 thành các tiến trình con xử lý các bước nghiệp vụ cụ thể.

a. Phân rã tiến trình 1.0 Quản lý thanh toán và phiên tham quan

Tiến trình 1.0 được phân rã thành năm tiến trình con từ 1.1 đến 1.5, xử lý các nghiệp vụ thanh toán trực tuyến, thanh toán tiền mặt tại quầy, đổi mã xác thực lấy token phiên và tra cứu cấp lại token khi khách gặp sự cố.

![Hình 3.40: Sơ đồ DFD mức 2 tiến trình 1.0 Quản lý thanh toán và phiên tham quan](diagram/export/DFD_Level_2_P1_Payment_Session.png)

*Hình 3.40: Sơ đồ DFD mức 2 tiến trình 1.0 Quản lý thanh toán và phiên tham quan*

*Bảng 3.22: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 1.0*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Khởi tạo phiên và yêu cầu thanh toán online | Khách tham quan → F01: Yêu cầu thanh toán & mã đổi phiên | Tạo phiên chờ và yêu cầu giao dịch; chuyển thông tin thanh toán cho 1.4. | F13: Yêu cầu giao dịch thanh toán → Cổng thanh toán; Mã giao dịch chờ đối soát → 1.2; Thông tin thanh toán tạo mới → 1.4; Tạo bản ghi phiên chờ → D2 |
| 1.2 | Xác minh webhook và kích hoạt mã đổi phiên | Cổng thanh toán → F14: Webhook kết quả thanh toán chữ ký số; 1.1 → Mã giao dịch chờ đối soát; D2 → Đọc giao dịch chờ đối soát | Xác minh chữ ký, đối soát giao dịch và kích hoạt mã một lần. | Mã một lần kích hoạt → 1.4; Cập nhật thanh toán & sinh mã → D2 |
| 1.3 | Xác nhận tiền mặt và cấp mã ngắn 6 chữ số | Nhân viên → F07: Xác nhận tiền mặt & tra cứu phiên; 1.5 → Token phiên tìm thấy cấp lại | Xác nhận tiền mặt, cấp mã ngắn; điều phối tra cứu và nhận token cấp lại từ 1.5. | F08: Mã ngắn 6 chữ số & token cấp lại → Nhân viên; Mã ngắn 6 số kích hoạt → 1.4; Yêu cầu tra cứu sự cố phiên → 1.5; Lưu phiên tiền mặt & mã ngắn → D2; Ghi log tiền mặt → D6 |
| 1.4 | Đổi mã xác thực và cấp token phiên khách | 1.3 → Mã ngắn 6 số kích hoạt; 1.2 → Mã một lần kích hoạt; 1.1 → Thông tin thanh toán tạo mới; D2 → Đọc mã đổi phiên & hạn sử dụng | Đối chiếu mã và hạn sử dụng, thu hồi mã đã dùng, cấp token phiên. | F02: Thông tin thanh toán & token phiên → Khách tham quan; Thu hồi mã & cấp token 24h → D2 |
| 1.5 | Tra cứu phiên và cấp lại token khách | 1.3 → Yêu cầu tra cứu sự cố phiên; D2 → Đọc phiên & lịch sử thanh toán | Đối chiếu phiên và lịch sử thanh toán; cấp lại token qua 1.3. | Token phiên tìm thấy cấp lại → 1.3; Lưu token cấp lại → D2; Ghi log cấp lại token → D6 |

b. Phân rã tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh

Tiến trình 2.0 được phân rã thành bốn tiến trình con từ 2.1 đến 2.4, phụ trách kiểm tra quyền truy cập phiên tham quan, đóng gói nội dung bản đồ theo ngôn ngữ, truyền tải tệp âm thanh và theo dõi vị trí hiện diện của khách.

![Hình 3.41: Sơ đồ DFD mức 2 tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh](diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png)

*Hình 3.41: Sơ đồ DFD mức 2 tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh*

*Bảng 3.23: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 2.0*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | Kiểm tra hiệu lực phiên tham quan và ngôn ngữ | Khách tham quan → F03: Yêu cầu nội dung, GPS & hiện diện; D2 → Đối chiếu hiệu lực token phiên | Đối chiếu token phiên; chuyển yêu cầu nội dung và dữ liệu hiện diện cho các bước sau. | Phiên hợp lệ tải nội dung → 2.2; Tọa độ GPS & tín hiệu hiện diện → 2.4 |
| 2.2 | Tổng hợp gói nội dung điểm tham quan và lộ trình | 2.1 → Phiên hợp lệ tải nội dung; 2.3 → Luồng âm thanh ghép gói; D3 → Đọc tọa độ, bán kính & bản dịch; D4 → Đọc danh sách lộ trình & điểm dừng | Ghép dữ liệu D3, D4 và luồng âm thanh từ 2.3 thành gói trả khách. | F04: Gói bản đồ, lộ trình & tệp âm thanh → Khách tham quan; Yêu cầu tải tệp âm thanh → 2.3; Ghi log tải gói nội dung → D6 |
| 2.3 | Cung cấp tệp âm thanh thuyết minh đa ngôn ngữ | 2.2 → Yêu cầu tải tệp âm thanh; D3 → Đọc luồng tệp âm thanh WAV | Đọc tệp WAV theo yêu cầu của 2.2 và chuyển luồng âm thanh về 2.2. | Luồng âm thanh ghép gói → 2.2 |
| 2.4 | Ghi nhận hiện diện trực tuyến và thống kê điểm ghé | 2.1 → Tọa độ GPS & tín hiệu hiện diện | Cập nhật số liệu hiện diện và lượt ghé từ dữ liệu GPS do 2.1 chuyển tiếp. | Cập nhật hiện diện & lượt ghé → D6 |

c. Phân rã tiến trình 3.0 Xử lý hỏi đáp thông minh RAG

Tiến trình 3.0 được phân rã thành bốn tiến trình con từ 3.1 đến 3.4, thực hiện chu trình kiểm tra phiên, chuẩn hóa truy vấn, tìm kiếm đoạn kiến thức tương đồng và tổng hợp câu trả lời có trích dẫn nguồn rõ ràng.

![Hình 3.42: Sơ đồ DFD mức 2 tiến trình 3.0 Xử lý hỏi đáp thông minh RAG](diagram/export/DFD_Level_2_P3_Chatbot_RAG.png)

*Hình 3.42: Sơ đồ DFD mức 2 tiến trình 3.0 Xử lý hỏi đáp thông minh RAG*

*Bảng 3.24: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 3.0*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | Kiểm tra phiên khách và giới hạn tần suất hỏi | Khách tham quan → F05: Câu hỏi tra cứu thông tin; D2 → Kiểm tra hiệu lực phiên & rate limit | Kiểm tra hiệu lực phiên và hạn mức hỏi đáp. | Câu hỏi hợp lệ chưa vượt hạn mức → 3.2 |
| 3.2 | Kiểm tra phạm vi câu hỏi và chuẩn hóa truy vấn | 3.1 → Câu hỏi hợp lệ chưa vượt hạn mức | Kiểm tra phạm vi, độ dài và chuẩn hóa truy vấn; chuyển câu hỏi và ngôn ngữ cho 3.4. | Truy vấn đã chuẩn hóa → 3.3; Câu hỏi hợp lệ & ngôn ngữ → 3.4 |
| 3.3 | Truy hồi đoạn kiến thức tương đồng ngữ nghĩa | 3.2 → Truy vấn đã chuẩn hóa; D5 → Đọc các đoạn tài liệu & vector nhúng | Đối chiếu truy vấn với các đoạn kiến thức và vector lưu trong D5; chọn tập đoạn phù hợp. | Tập đoạn kiến thức tương đồng cao nhất → 3.4 |
| 3.4 | Tổng hợp câu trả lời có trích dẫn và ghi nhật ký | Dịch vụ embedding và LLM → F18: Kết quả đối chiếu & câu trả lời mô hình; 3.3 → Tập đoạn kiến thức tương đồng cao nhất; 3.2 → Câu hỏi hợp lệ & ngôn ngữ | Ghép câu hỏi với tập đoạn đã truy hồi, gọi LLM, kiểm duyệt trích dẫn và ghi nhật ký. | F06: Câu trả lời có trích dẫn nguồn → Khách tham quan; F17: Câu hỏi truy vấn & ngữ cảnh trích dẫn → Dịch vụ embedding và LLM; Ghi lịch sử hỏi đáp, câu hỏi & trích dẫn → D6 |

d. Phân rã tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức

Tiến trình 4.0 được phân rã thành bốn tiến trình con từ 4.1 đến 4.4, phục vụ các thao tác cập nhật dữ liệu của nhân viên, điều phối dây chuyền dịch và tạo giọng đọc tự động, quản lý tour mẫu và lập chỉ mục kho kiến thức hỏi đáp.

![Hình 3.43: Sơ đồ DFD mức 2 tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức](diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png)

*Hình 3.43: Sơ đồ DFD mức 2 tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức*

*Bảng 3.25: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 4.0*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | Cập nhật điểm tham quan và khởi tạo tác vụ nội dung | Nhân viên → F09: Dữ liệu điểm tham quan, tour & tài liệu; 4.3 → Xác nhận lưu lộ trình; 4.4 → Xác nhận tạo vector kiến thức | Lưu nội dung và tác vụ chờ; phân phối dữ liệu tour, tài liệu; tổng hợp kết quả trả nhân viên. | F10: Kết quả cập nhật & tiến độ tác vụ → Nhân viên; Thông báo tác vụ dịch & TTS mới tạo → 4.2; Dữ liệu tour & lộ trình tham quan → 4.3; Dữ liệu tài liệu kho kiến thức mới → 4.4; Lưu điểm tham quan & tạo tác vụ chờ → D3; Ghi log điểm tham quan → D6 |
| 4.2 | Xử lý nền dịch văn bản và tổng hợp âm thanh | Dịch vụ dịch và TTS → F16: Bản dịch đa ngôn ngữ & tệp âm thanh WAV; 4.1 → Thông báo tác vụ dịch & TTS mới tạo; D3 → Đọc tác vụ chờ & văn bản gốc | Đọc tác vụ và nguồn từ D3; gửi yêu cầu dịch/TTS, nhận bản dịch và WAV rồi lưu hoàn tất. | F15: Văn bản gốc & yêu cầu tạo giọng đọc → Dịch vụ dịch và TTS; Lưu bản dịch, WAV & hoàn tất → D3 |
| 4.3 | Quản lý lộ trình tham quan mẫu | 4.1 → Dữ liệu tour & lộ trình tham quan | Lưu lộ trình và thứ tự điểm dừng; trả xác nhận về 4.1. | Xác nhận lưu lộ trình → 4.1; Lưu bản ghi lộ trình & điểm dừng → D4; Ghi log lộ trình → D6 |
| 4.4 | Phân đoạn tài liệu và tạo vector kho kiến thức | Dịch vụ embedding và LLM → F20: Mảng vector nhúng của đoạn tài liệu; 4.1 → Dữ liệu tài liệu kho kiến thức mới | Phân đoạn tài liệu, yêu cầu vector nhúng, lưu vào D5 và trả xác nhận về 4.1. | F19: Đoạn tài liệu kiến thức cần tạo vector → Dịch vụ embedding và LLM; Xác nhận tạo vector kiến thức → 4.1; Lưu tài liệu, các đoạn & vector → D5; Ghi log kho kiến thức → D6 |

e. Phân rã tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống

Tiến trình 5.0 được phân rã thành bốn tiến trình con từ 5.1 đến 5.4, đảm nhiệm xác thực nhân sự nội bộ, quản lý người dùng vai trò nhân viên, tra cứu nhật ký kiểm toán và tổng hợp bảng điều khiển giám sát sức khỏe vận hành.

![Hình 3.44: Sơ đồ DFD mức 2 tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống](diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png)

*Hình 3.44: Sơ đồ DFD mức 2 tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống*

*Bảng 3.26: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 5.0*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 5.1 | Xác thực đăng nhập và quản lý phiên nội bộ | Quản trị viên → F11: Hồ sơ nhân viên mới & bộ lọc giám sát; 5.2 → Hồ sơ nhân viên đã khởi tạo; 5.3 → Danh sách nhật ký phân trang; 5.4 → Báo cáo thống kê & sức khỏe; D1 → Đối chiếu mật khẩu băm | Đối chiếu thông tin tài khoản và lưu phiên; phân phối yêu cầu và tổng hợp kết quả trả quản trị viên. | F12: Hồ sơ đã tạo, nhật ký & báo cáo → Quản trị viên; Yêu cầu cấp tài khoản nhân viên → 5.2; Bộ lọc tra cứu kiểm toán → 5.3; Yêu cầu tổng hợp báo cáo → 5.4; Lưu refresh token phiên → D1 |
| 5.2 | Tạo và quản lý tài khoản nhân viên | 5.1 → Yêu cầu cấp tài khoản nhân viên | Tạo tài khoản, lưu D1 và ghi nhật ký D6; trả hồ sơ về 5.1. | Hồ sơ nhân viên đã khởi tạo → 5.1; Lưu tài khoản mới → D1; Ghi log tạo tài khoản → D6 |
| 5.3 | Truy vấn và lọc nhật ký thao tác | 5.1 → Bộ lọc tra cứu kiểm toán; D6 → Đọc danh sách bản ghi nhật ký | Lọc và phân trang nhật ký D6; trả kết quả về 5.1. | Danh sách nhật ký phân trang → 5.1 |
| 5.4 | Tổng hợp chỉ số sức khỏe và thống kê vận hành | 5.1 → Yêu cầu tổng hợp báo cáo; D6 → Đọc thống kê vận hành tập trung; D1 → Đọc số liệu tài khoản & phiên nội bộ | Tổng hợp số liệu vận hành từ kho logic D6 và thông tin tài khoản/phiên nội bộ D1; trả báo cáo về 5.1. | Báo cáo thống kê & sức khỏe → 5.1 |

---

#### 3.4.4. Sơ đồ DFD mức 3

DFD mức 3 thực hiện phân rã chi tiết sâu hơn đối với hai tiến trình có logic xử lý phức tạp nhất trong hệ thống gồm tiến trình 4.2 thuộc dây chuyền xử lý nền đa ngôn ngữ và tiến trình 3.4 thuộc cơ chế tạo câu trả lời của mô hình ngôn ngữ.

a. Phân rã tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh

Tiến trình 4.2 phân rã thành bốn tiến trình con từ 4.2.1 đến 4.2.4 mô tả pipeline logic gồm tiếp nhận tác vụ, điều phối dịch và tạo giọng đọc, kiểm tra kết quả và lưu nội dung hoàn tất. Các tương tác dịch/TTS và ghi kho được gộp theo luồng dữ liệu ở tiến trình cha; sơ đồ không biểu diễn từng lần gọi dịch vụ hay từng lần cập nhật trạng thái kỹ thuật.

![Hình 3.45: Sơ đồ DFD mức 3 tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh](diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png)

*Hình 3.45: Sơ đồ DFD mức 3 tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh*

*Bảng 3.27: Bảng mô tả các tiến trình con trong DFD mức 3 của tiến trình 4.2*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 4.2.1 | Nhận tác vụ chờ và cấp quyền giữ phiên xử lý | 4.1 → Thông báo tác vụ dịch & TTS mới tạo; D3 → Đọc tác vụ chờ & văn bản gốc | Tiếp nhận thông báo 4.1, đọc tác vụ và nguồn D3; giữ quyền xử lý trong phạm vi pipeline. | Tác vụ đã khóa phiên & văn bản gốc → 4.2.2 |
| 4.2.2 | Kiểm tra phiên bản nguồn và dịch văn bản đa ngôn ngữ | 4.2.1 → Tác vụ đã khóa phiên & văn bản gốc | Kiểm tra nguồn và điều phối yêu cầu dịch/TTS qua F15; chuyển dữ liệu kiểm tra WAV cho 4.2.3. | Bản dịch đa ngôn ngữ cần kiểm tra WAV → 4.2.3; F15: Văn bản gốc & yêu cầu tạo giọng đọc → Dịch vụ dịch và TTS |
| 4.2.3 | Tổng hợp âm thanh WAV và kiểm tra định dạng tệp | 4.2.2 → Bản dịch đa ngôn ngữ cần kiểm tra WAV; Dịch vụ dịch và TTS → F16: Bản dịch đa ngôn ngữ & tệp âm thanh WAV | Nhận kết quả dịch/TTS qua F16, kiểm tra tính hợp lệ của bản dịch và tệp WAV. | Bản dịch & tệp âm thanh WAV hợp lệ → 4.2.4 |
| 4.2.4 | Lưu kho tệp media và công bố trạng thái hoàn tất | 4.2.3 → Bản dịch & tệp âm thanh WAV hợp lệ | Lưu bản dịch và WAV, công bố trạng thái hoàn tất vào D3 bằng một luồng ghi tổng hợp. | Lưu bản dịch, WAV & hoàn tất → D3 |

b. Phân rã tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký

Tiến trình 3.4 phân rã thành bốn tiến trình con từ 3.4.1 đến 3.4.4 mô tả cơ chế ghép nối lời nhắc, truy vấn mô hình trí tuệ nhân tạo, kiểm duyệt căn cứ tài liệu và ghi nhận dữ liệu phục vụ đối soát chất lượng.

![Hình 3.46: Sơ đồ DFD mức 3 tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký](diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png)

*Hình 3.46: Sơ đồ DFD mức 3 tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký*

*Bảng 3.28: Bảng mô tả các tiến trình con trong DFD mức 3 của tiến trình 3.4*

| Số hiệu | Tên tiến trình | Luồng dữ liệu đầu vào | Xử lý nghiệp vụ | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 3.4.1 | Đóng gói lời nhắc hệ thống kèm ngữ cảnh đoạn kiến thức | 3.2 → Câu hỏi hợp lệ & ngôn ngữ; 3.3 → Tập đoạn kiến thức tương đồng cao nhất | Ghép câu hỏi/ngôn ngữ từ 3.2 và tập đoạn từ 3.3 thành gói lời nhắc. | Gói lời nhắc hoàn chỉnh → 3.4.2 |
| 3.4.2 | Gọi mô hình ngôn ngữ sinh phản hồi theo ngữ cảnh | 3.4.1 → Gói lời nhắc hoàn chỉnh; Dịch vụ embedding và LLM → F18: Kết quả đối chiếu & câu trả lời mô hình | Gửi câu hỏi kèm ngữ cảnh qua F17, nhận kết quả mô hình qua F18. | Phản hồi thô & mã trích dẫn → 3.4.3; F17: Câu hỏi truy vấn & ngữ cảnh trích dẫn → Dịch vụ embedding và LLM |
| 3.4.3 | Kiểm tra trích dẫn hợp lệ và lọc liên kết ngoài nguồn | 3.4.2 → Phản hồi thô & mã trích dẫn | Đối chiếu mã trích dẫn và lọc các liên kết ngoài nguồn. | Câu trả lời đã kiểm duyệt → 3.4.4 |
| 3.4.4 | Lưu nhật ký hỏi đáp và trả kết quả cho khách | 3.4.3 → Câu trả lời đã kiểm duyệt | Ghi lịch sử hỏi đáp vào D6 và trả câu trả lời có trích dẫn cho khách qua F06. | Ghi lịch sử hỏi đáp, câu hỏi & trích dẫn → D6; F06: Câu trả lời có trích dẫn nguồn → Khách tham quan |
