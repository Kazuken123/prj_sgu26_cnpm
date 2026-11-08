### 3.4. Sơ đồ luồng dữ liệu DFD

Phần này mô tả chi tiết các luồng dữ liệu di chuyển qua các tiến trình xử lý trong hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn. Hệ thống được phân rã theo bốn cấp độ từ mức 0 đến mức 3, tương tác với sáu tác nhân ngoài gồm Khách tham quan, Nhân viên, Quản trị viên, Cổng thanh toán, Dịch vụ dịch và TTS, Dịch vụ embedding và LLM, cùng sáu kho dữ liệu lưu trữ từ D1 đến D6.

#### 3.4.1. Sơ đồ DFD mức 0

Sơ đồ mức 0 biểu diễn ranh giới ngoài cùng của toàn bộ hệ thống qua một tiến trình trung tâm duy nhất, xác định các luồng thông tin trao đổi trực tiếp với sáu tác nhân bên ngoài ranh giới ứng dụng.

![Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống](file:///docs/diagram/dfd/DFD_Level_0_Context.drawio)

*Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống*

Bảng 3.19 liệt kê chi tiết các luồng dữ liệu trao đổi giữa tiến trình trung tâm và sáu tác nhân ngoài ở mức ngữ cảnh.

*Bảng 3.19: Bảng mô tả luồng dữ liệu DFD mức 0*

| Số hiệu luồng | Hướng truyền dữ liệu | Tên luồng dữ liệu | Nội dung dữ liệu trao đổi |
| :--- | :--- | :--- | :--- |
| F01 | Khách tham quan gửi đến Hệ thống | Yêu cầu thanh toán, mã đổi phiên, ngôn ngữ, vị trí GPS và câu hỏi | Yêu cầu tạo phiên thanh toán trực tuyến, mã đổi một lần hoặc mã ngắn 6 chữ số, mã ngôn ngữ lựa chọn, tọa độ GPS hiện thời và câu hỏi tra cứu thông tin |
| F02 | Hệ thống gửi đến Khách tham quan | Thông tin giao dịch, token phiên, gói nội dung bản đồ, âm thanh và câu trả lời | Đường dẫn thanh toán, token phiên có hạn 24 giờ, danh sách điểm tham quan, tọa độ kích hoạt, tệp âm thanh thuyết minh và câu trả lời kèm trích dẫn |
| F03 | Nhân viên gửi đến Hệ thống | Thông tin đăng nhập, xác nhận tiền mặt, dữ liệu điểm tham quan, lộ trình và tài liệu | Tên đăng nhập, mật khẩu, yêu cầu tạo phiên tiền mặt kèm số tiền thu, dữ liệu tọa độ điểm tham quan, bản thuyết minh tiếng Việt, lộ trình mẫu và tài liệu kiến thức |
| F04 | Hệ thống gửi đến Nhân viên | Token nội bộ, mã ngắn 6 chữ số, trạng thái phiên khách và kết quả cập nhật nội dung | Token truy cập tài khoản nội bộ, mã ngắn 6 chữ số cấp cho khách mua vé giấy, trạng thái phiên tham quan cần hỗ trợ và kết quả lưu dữ liệu |
| F05 | Quản trị viên gửi đến Hệ thống | Thông tin đăng nhập, thông tin tạo nhân viên và bộ lọc tra cứu giám sát | Tên đăng nhập, mật khẩu, hồ sơ nhân viên mới cần cấp quyền và tiêu chí lọc nhật ký hệ thống |
| F06 | Hệ thống gửi đến Quản trị viên | Hồ sơ nhân viên mới, nhật ký thao tác và báo cáo sức khỏe vận hành | Hồ sơ nhân viên vừa khởi tạo, danh sách nhật ký kiểm toán phân trang, số lượng khách trực tuyến và tỷ lệ hoàn thành tác vụ nền |
| F07 | Hệ thống gửi đến Cổng thanh toán | Yêu cầu khởi tạo giao dịch thanh toán trực tuyến | Mã đơn hàng, số tiền thanh toán vé thuyết minh và địa chỉ nhận phản hồi webhook |
| F08 | Cổng thanh toán gửi đến Hệ thống | Thông báo kết quả thanh toán webhook kèm chữ ký số | Trạng thái giao dịch thành công, mã giao dịch cổng thanh toán và chữ ký số xác thực tính toàn vẹn |
| F09 | Hệ thống gửi đến Dịch vụ dịch và TTS | Văn bản thuyết minh tiếng Việt và yêu cầu sinh giọng đọc đa ngôn ngữ | Đoạn văn bản thuyết minh tiếng Việt nguồn, mã ngôn ngữ đích cần dịch và tham số giọng đọc |
| F10 | Dịch vụ dịch và TTS gửi đến Hệ thống | Bản dịch đa ngôn ngữ và tệp âm thanh thuyết minh WAV | Đoạn văn bản đã dịch sang tiếng Anh hoặc tiếng Trung và luồng nhị phân tệp âm thanh định dạng WAV chuẩn |
| F11 | Hệ thống gửi đến Dịch vụ embedding và LLM | Đoạn tài liệu kiến thức, câu hỏi truy vấn và ngữ cảnh trích dẫn | Đoạn văn bản kiến thức cần trích xuất đặc trưng hoặc câu hỏi của khách ghép nối với ngữ cảnh đoạn trích dẫn |
| F12 | Dịch vụ embedding và LLM gửi đến Hệ thống | Vector nhúng và câu trả lời kèm trích dẫn nguồn | Mảng số thực biểu diễn vector ngữ nghĩa và câu trả lời hoàn chỉnh kèm danh sách mã đoạn tài liệu làm căn cứ |

---

#### 3.4.2. Sơ đồ DFD mức 1

Sơ đồ mức 1 phân rã tiến trình trung tâm 0 thành năm tiến trình chức năng chính, đồng thời bổ sung sáu kho dữ liệu logic lưu trữ trạng thái hoạt động của hệ thống.

![Hình 3.39: Sơ đồ DFD mức 1 phân rã hệ thống](file:///docs/diagram/dfd/DFD_Level_1_System.drawio)

*Hình 3.39: Sơ đồ DFD mức 1 phân rã hệ thống*

Bảng 3.20 quy định ánh xạ giữa sáu kho dữ liệu logic trên sơ đồ DFD mức 1 với các bảng cơ sở dữ liệu quan hệ, bộ nhớ đệm và kho tệp vật lý trong mã nguồn.

*Bảng 3.20: Ánh xạ kho dữ liệu logic với cấu trúc lưu trữ vật lý*

| Mã kho | Tên kho dữ liệu logic | Thành phần lưu trữ vật lý tương ứng | Mục đích lưu trữ trong hệ thống |
| :--- | :--- | :--- | :--- |
| D1 | Tài khoản và Phiên nội bộ | Bảng USERS, bảng REFRESH_TOKENS, bộ khóa phiên Redis | Quản lý thông tin đăng nhập, mật khẩu băm, quyền hạn nhân viên và token làm mới phiên làm việc |
| D2 | Phiên tham quan và Thanh toán | Bảng VISIT_SESSIONS, bảng PAYMENTS, bộ khóa mã tạm thời Redis | Quản lý token phiên 24 giờ của khách, lịch sử giao dịch tiền mặt hoặc cổng thanh toán, mã một lần và mã ngắn 6 chữ số |
| D3 | Điểm tham quan và Nội dung đa ngôn ngữ | Bảng LANGUAGES, bảng POIS, bảng POI_TRANSLATIONS, bảng AUDIOS, bảng CONTENT_JOBS, kho tệp Media | Lưu trữ tọa độ địa lý, bán kính kích hoạt GPS, văn bản thuyết minh đa ngôn ngữ, tệp âm thanh WAV và hàng đợi tác vụ nền |
| D4 | Lộ trình tham quan | Bảng TOURS, bảng TOUR_POIS | Lưu trữ danh mục các tour tham quan gợi ý theo chủ đề và danh sách thứ tự các điểm dừng trong từng lộ trình |
| D5 | Kho kiến thức | Bảng KNOWLEDGE_DOCUMENTS, bảng KNOWLEDGE_CHUNKS | Lưu trữ các văn bản tài liệu nguồn phục vụ hỏi đáp thông minh, các đoạn văn bản phân đoạn và mảng vector nhúng ngữ nghĩa |
| D6 | Nhật ký và Thống kê | Bảng AUDIT_LOGS, bảng CHAT_LOGS, bảng BUNDLE_ACCESS_LOGS, bảng ANALYTICS_SESSIONS, bảng ANALYTICS_PRESENCE, bảng ANALYTICS_POI_VISITS | Ghi vết hành động quản trị, lịch sử hỏi đáp chatbot, lượt tải nội dung, trạng thái hiện diện trực tuyến và tần suất khách ghé các điểm |

Bảng 3.21 mô tả vai trò nghiệp vụ, các luồng vào ra và kho dữ liệu truy xuất của từng tiến trình trong DFD mức 1.

*Bảng 3.21: Bảng mô tả năm tiến trình chính trong DFD mức 1*

| Số hiệu tiến trình | Tên tiến trình | Luồng dữ liệu đầu vào | Kho dữ liệu truy xuất | Luồng dữ liệu đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 | Quản lý thanh toán và phiên tham quan | Yêu cầu tạo phiên trực tuyến từ Khách tham quan, webhook kết quả từ Cổng thanh toán, yêu cầu tạo phiên tiền mặt và tra cứu từ Nhân viên | Đọc và ghi D2, ghi nhật ký vào D6 | Thông tin thanh toán và token phiên gửi cho Khách tham quan, yêu cầu giao dịch gửi Cổng thanh toán, mã ngắn 6 chữ số và token cấp lại gửi cho Nhân viên |
| 2.0 | Cung cấp nội dung bản đồ, lộ trình và thuyết minh | Yêu cầu tải gói nội dung, yêu cầu phát âm thanh, tọa độ GPS và nhịp tim hiện diện từ Khách tham quan | Đọc hiệu lực phiên từ D2, đọc điểm tham quan và âm thanh từ D3, đọc lộ trình từ D4, ghi nhật ký vào D6 | Gói dữ liệu bản đồ, danh sách điểm tham quan, danh sách lộ trình và tệp âm thanh thuyết minh gửi cho Khách tham quan |
| 3.0 | Xử lý hỏi đáp thông minh RAG | Câu hỏi của Khách tham quan kèm mã ngôn ngữ, vector câu hỏi và phản hồi từ Dịch vụ embedding và LLM | Đọc hiệu lực phiên và kiểm tra giới hạn tần suất từ D2, đọc đoạn kiến thức từ D5, ghi lịch sử vào D6 | Câu hỏi cần nhúng và lời nhắc kèm ngữ cảnh gửi Dịch vụ embedding và LLM, câu trả lời kèm trích dẫn gửi cho Khách tham quan |
| 4.0 | Quản trị nội dung, lộ trình và kho kiến thức | Dữ liệu điểm tham quan, bản dịch, lộ trình mẫu, tài liệu kiến thức từ Nhân viên, bản dịch và tệp WAV từ Dịch vụ dịch và TTS, vector nhúng từ Dịch vụ embedding và LLM | Đọc và ghi D3, đọc và ghi D4, đọc và ghi D5, ghi nhật ký vào D6 | Trạng thái cập nhật gửi Nhân viên, văn bản gốc gửi Dịch vụ dịch và TTS, đoạn văn bản gửi Dịch vụ embedding và LLM |
| 5.0 | Quản trị tài khoản nội bộ và giám sát hệ thống | Thông tin đăng nhập từ Nhân viên và Quản trị viên, hồ sơ nhân viên mới và bộ lọc giám sát từ Quản trị viên | Đọc và ghi tài khoản tại D1, đọc số liệu phiên từ D2, đọc số liệu nội dung từ D3, đọc số liệu tài liệu từ D5, đọc và ghi D6 | Token phiên nội bộ gửi Nhân viên và Quản trị viên, hồ sơ nhân viên mới, nhật ký thao tác và báo cáo chỉ số sức khỏe gửi Quản trị viên |

---

#### 3.4.3. Sơ đồ DFD mức 2

DFD mức 2 phân rã chi tiết từng tiến trình trong năm tiến trình chính ở mức 1 thành các tiến trình con xử lý các bước nghiệp vụ cụ thể.

##### a. Phân rã tiến trình 1.0 Quản lý thanh toán và phiên tham quan

Tiến trình 1.0 được phân rã thành năm tiến trình con từ 1.1 đến 1.5, xử lý các nghiệp vụ thanh toán trực tuyến, thanh toán tiền mặt tại quầy, đổi mã xác thực lấy token phiên và tra cứu cấp lại token khi khách gặp sự cố.

![Hình 3.40: Sơ đồ DFD mức 2 tiến trình 1.0 Quản lý thanh toán và phiên tham quan](file:///docs/diagram/dfd/DFD_Level_2_P1_Payment_Session.drawio)

*Hình 3.40: Sơ đồ DFD mức 2 tiến trình 1.0 Quản lý thanh toán và phiên tham quan*

Bảng 3.22 mô tả các tiến trình con thuộc tiến trình 1.0.

*Bảng 3.22: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 1.0*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Khởi tạo phiên và yêu cầu thanh toán trực tuyến | Yêu cầu tạo phiên từ Khách tham quan | Tạo bản ghi phiên trạng thái chờ trong D2, gọi cổng thanh toán tạo đơn hàng | Mã thanh toán gửi Khách tham quan, yêu cầu giao dịch gửi Cổng thanh toán |
| 1.2 | Xác minh webhook và kích hoạt mã đổi phiên | Webhook kèm chữ ký số từ Cổng thanh toán | Kiểm tra tính hợp lệ của chữ ký số, đối chiếu số tiền trong D2, cập nhật trạng thái thanh toán thành công và sinh mã một lần | Cập nhật bản ghi D2, sinh mã một lần có thời hạn sử dụng |
| 1.3 | Xác nhận tiền mặt và cấp mã ngắn 6 chữ số | Yêu cầu tạo phiên tiền mặt từ Nhân viên | Lưu bản ghi phiên tiền mặt vào D2, sinh mã ngắn 6 chữ số lưu vào bộ đệm Redis trong D2, ghi nhật ký vào D6 | Mã ngắn 6 chữ số gửi Nhân viên để in hoặc cấp cho khách |
| 1.4 | Đổi mã xác thực và cấp token phiên khách | Mã một lần hoặc mã ngắn từ Khách tham quan | Kiểm tra mã trong D2, chống thử sai qua Redis, thu hồi mã sau một lần dùng và phát hành token phiên có hạn 24 giờ | Token phiên tham quan gửi cho Khách tham quan, lưu token vào D2 |
| 1.5 | Tra cứu phiên và cấp lại token khách | Mã tra cứu từ Nhân viên | Tìm kiếm bản ghi phiên trong D2, đối chiếu lịch sử thanh toán, nếu phiên còn hạn thì cấp lại token hoặc mã mới, ghi nhật ký vào D6 | Thông tin phiên và token cấp lại gửi cho Nhân viên |

##### b. Phân rã tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh

Tiến trình 2.0 được phân rã thành bốn tiến trình con từ 2.1 đến 2.4, phụ trách kiểm tra quyền truy cập phiên tham quan, đóng gói nội dung bản đồ theo ngôn ngữ, truyền tải tệp âm thanh và theo dõi vị trí hiện diện của khách.

![Hình 3.41: Sơ đồ DFD mức 2 tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh](file:///docs/diagram/dfd/DFD_Level_2_P2_Visitor_Content_Audio.drawio)

*Hình 3.41: Sơ đồ DFD mức 2 tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh*

Bảng 3.23 mô tả các tiến trình con thuộc tiến trình 2.0.

*Bảng 3.23: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 2.0*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | Kiểm tra hiệu lực phiên tham quan và ngôn ngữ | Token phiên và mã ngôn ngữ từ Khách tham quan | Đối chiếu thời hạn 24 giờ của token trong D2, kiểm tra mã ngôn ngữ trong danh mục hoạt động của D3 | Yêu cầu tải nội dung hợp lệ chuyển tiếp sang tiến trình 2.2 |
| 2.2 | Tổng hợp gói nội dung điểm tham quan và lộ trình | Yêu cầu hợp lệ từ tiến trình 2.1 | Đọc tọa độ, bán kính, bản dịch từ D3, đọc danh sách lộ trình từ D4, ghép gói dữ liệu hoàn chỉnh, ghi nhận lượt tải vào D6 | Gói dữ liệu bản đồ, danh sách điểm tham quan và lộ trình gửi Khách tham quan |
| 2.3 | Cung cấp tệp âm thanh thuyết minh | Yêu cầu phát âm thanh thủ công hoặc GPS từ Khách tham quan | Đọc đường dẫn và luồng dữ liệu tệp âm thanh WAV tương ứng với ngôn ngữ đã chọn từ kho media trong D3 | Tệp âm thanh thuyết minh truyền về thiết bị của Khách tham quan |
| 2.4 | Ghi nhận hiện diện trực tuyến và thống kê điểm ghé | Tín hiệu nhịp tim định kỳ và sự kiện GPS ghé điểm từ Khách tham quan | Cập nhật thời điểm hoạt động gần nhất vào phiên trực tuyến và tăng bộ đếm lượt khách ghé điểm tham quan trong D6 | Bản ghi thống kê hiện diện và lượt ghé cập nhật trong D6 |

##### c. Phân rã tiến trình 3.0 Xử lý hỏi đáp thông minh RAG

Tiến trình 3.0 được phân rã thành bốn tiến trình con từ 3.1 đến 3.4, thực hiện chu trình kiểm tra phiên, tạo vector câu hỏi, tìm kiếm đoạn kiến thức tương đồng và tổng hợp câu trả lời có trích dẫn nguồn rõ ràng.

![Hình 3.42: Sơ đồ DFD mức 2 tiến trình 3.0 Xử lý hỏi đáp thông minh RAG](file:///docs/diagram/dfd/DFD_Level_2_P3_Chatbot_RAG.drawio)

*Hình 3.42: Sơ đồ DFD mức 2 tiến trình 3.0 Xử lý hỏi đáp thông minh RAG*

Bảng 3.24 mô tả các tiến trình con thuộc tiến trình 3.0.

*Bảng 3.24: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 3.0*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | Kiểm tra phiên khách và giới hạn tần suất hỏi | Câu hỏi, token phiên và mã ngôn ngữ từ Khách tham quan | Đối chiếu token phiên trong D2, kiểm tra số câu hỏi gửi lên trong một phút để chống lạm dụng | Câu hỏi hợp lệ chưa vượt ngưỡng chuyển tiếp sang tiến trình 3.2 |
| 3.2 | Kiểm tra phạm vi câu hỏi và tạo vector truy vấn | Câu hỏi hợp lệ từ tiến trình 3.1 | Kiểm tra độ dài câu hỏi, gửi văn bản sang dịch vụ ngoài để lấy mảng số thực biểu diễn ngữ nghĩa | Câu hỏi cần tạo vector gửi Dịch vụ embedding và LLM, nhận về vector câu hỏi |
| 3.3 | Truy hồi đoạn kiến thức tương đồng | Vector câu hỏi và câu hỏi gốc từ tiến trình 3.2 | Đọc các đoạn kiến thức đã công bố và vector tương ứng trong D5, tính điểm tương đồng ngữ nghĩa để chọn ra các đoạn phù hợp nhất | Tập các đoạn kiến thức có độ tương đồng cao nhất chuyển sang tiến trình 3.4 |
| 3.4 | Tổng hợp câu trả lời có trích dẫn và ghi nhật ký | Câu hỏi gốc và tập đoạn kiến thức từ tiến trình 3.3 | Đóng gói lời nhắc, gọi mô hình ngôn ngữ sinh câu trả lời, kiểm duyệt trích dẫn hợp lệ, lưu lịch sử vào D6 | Câu trả lời kèm danh sách nguồn trích dẫn gửi cho Khách tham quan |

##### d. Phân rã tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức

Tiến trình 4.0 được phân rã thành bốn tiến trình con từ 4.1 đến 4.4, phục vụ các thao tác cập nhật dữ liệu của nhân viên, điều phối dây chuyền dịch và tạo giọng đọc tự động, quản lý tour mẫu và lập chỉ mục kho kiến thức hỏi đáp.

![Hình 3.43: Sơ đồ DFD mức 2 tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức](file:///docs/diagram/dfd/DFD_Level_2_P4_Content_Knowledge_Admin.drawio)

*Hình 3.43: Sơ đồ DFD mức 2 tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức*

Bảng 3.25 mô tả các tiến trình con thuộc tiến trình 4.0.

*Bảng 3.25: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 4.0*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | Cập nhật điểm tham quan và khởi tạo tác vụ nội dung | Dữ liệu điểm tham quan và văn bản thuyết minh tiếng Việt từ Nhân viên | Lưu dữ liệu điểm tham quan vào D3, tăng số phiên bản nguồn, tạo tác vụ nền ở trạng thái chờ trong D3, ghi nhật ký vào D6 | Kết quả lưu dữ liệu và mã tác vụ tạo mới gửi cho Nhân viên |
| 4.2 | Xử lý nền dịch văn bản và tổng hợp âm thanh | Tác vụ chờ trong D3 và văn bản tiếng Việt gốc | Đọc tác vụ, gọi dịch vụ ngoài dịch văn bản và sinh âm thanh WAV, lưu tệp vào kho media và công bố bản ghi trong D3 | Bản dịch, tệp âm thanh và trạng thái hoàn tất tác vụ lưu vào D3 |
| 4.3 | Quản lý lộ trình tham quan mẫu | Thông tin lộ trình, danh sách điểm dừng và thời lượng từ Nhân viên | Kiểm tra tính hợp lệ của các điểm tham quan trong D3, lưu bản ghi lộ trình và thứ tự điểm dừng vào D4, ghi nhật ký vào D6 | Kết quả cập nhật lộ trình mẫu gửi cho Nhân viên |
| 4.4 | Phân đoạn tài liệu và tạo vector kho kiến thức | Tài liệu kiến thức mới hoặc sửa đổi từ Nhân viên | Lưu tài liệu vào D5, chia nhỏ văn bản thành các đoạn, gửi sang dịch vụ ngoài tạo vector nhúng, lưu vector vào D5, chuyển trạng thái công bố và ghi nhật ký vào D6 | Kết quả công bố tài liệu kiến thức gửi cho Nhân viên |

##### e. Phân rã tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống

Tiến trình 5.0 được phân rã thành bốn tiến trình con từ 5.1 đến 5.4, đảm nhiệm xác thực nhân sự nội bộ, quản lý người dùng vai trò nhân viên, tra cứu nhật ký kiểm toán và tổng hợp bảng điều khiển giám sát sức khỏe vận hành.

![Hình 3.44: Sơ đồ DFD mức 2 tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống](file:///docs/diagram/dfd/DFD_Level_2_P5_Auth_Admin_Monitoring.drawio)

*Hình 3.44: Sơ đồ DFD mức 2 tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống*

Bảng 3.26 mô tả các tiến trình con thuộc tiến trình 5.0.

*Bảng 3.26: Bảng mô tả các tiến trình con trong DFD mức 2 của tiến trình 5.0*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 5.1 | Xác thực đăng nhập và quản lý phiên nội bộ | Tên đăng nhập và mật khẩu từ Nhân viên hoặc Quản trị viên | Đối chiếu mật khẩu băm trong D1, cấp access token thời hạn ngắn và lưu refresh token vào D1, ghi nhật ký vào D6 | Token phiên nội bộ trả về cho Nhân viên hoặc Quản trị viên |
| 5.2 | Tạo và quản lý tài khoản nhân viên | Hồ sơ nhân viên mới cần khởi tạo từ Quản trị viên | Kiểm tra trùng tên đăng nhập trong D1, băm mật khẩu, gán vai trò nhân viên và lưu vào D1, ghi nhật ký vào D6 | Hồ sơ nhân viên mới tạo thành công gửi cho Quản trị viên |
| 5.3 | Truy vấn và lọc nhật ký thao tác | Bộ lọc thời gian, tác nhân và loại hành động từ Quản trị viên | Truy vấn dữ liệu từ bảng nhật ký kiểm toán trong D6 theo điều kiện lọc và thực hiện phân trang | Danh sách bản ghi nhật ký thao tác gửi cho Quản trị viên |
| 5.4 | Tổng hợp chỉ số sức khỏe và thống kê vận hành | Yêu cầu xem báo cáo giám sát từ Quản trị viên | Đọc số liệu phiên và doanh thu từ D2, độ phủ nội dung và lỗi tác vụ từ D3, số tài liệu từ D5, lượng khách trực tuyến và hỏi đáp từ D6 | Báo cáo tổng hợp sức khỏe hệ thống và thống kê vận hành gửi Quản trị viên |

---

#### 3.4.4. Sơ đồ DFD mức 3

DFD mức 3 thực hiện phân rã chi tiết sâu hơn đối với hai tiến trình có logic xử lý phức tạp nhất trong hệ thống gồm tiến trình 4.2 thuộc dây chuyền xử lý nền đa ngôn ngữ và tiến trình 3.4 thuộc cơ chế tạo câu trả lời của mô hình ngôn ngữ.

##### a. Phân rã tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh

Tiến trình 4.2 phân rã thành bốn tiến trình con từ 4.2.1 đến 4.2.4 mô tả chính xác chu trình xử lý của worker nền trong mã nguồn, bao gồm cơ chế tranh chấp khóa tác vụ, dịch văn bản tự động, tổng hợp tệp âm thanh và lưu kho tệp truyền thông.

![Hình 3.45: Sơ đồ DFD mức 3 tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh](file:///docs/diagram/dfd/DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio)

*Hình 3.45: Sơ đồ DFD mức 3 tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh*

Bảng 3.27 mô tả các tiến trình con thuộc tiến trình 4.2.

*Bảng 3.27: Bảng mô tả các tiến trình con trong DFD mức 3 của tiến trình 4.2*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 4.2.1 | Nhận tác vụ chờ và cấp quyền giữ phiên xử lý | Tác vụ ở trạng thái chờ xử lý hoặc chờ thử lại từ D3 | Đọc tác vụ, áp dụng khóa phiên xử lý để chống chạy trùng lặp giữa nhiều worker, cập nhật trạng thái đang chạy vào D3 | Thông tin tác vụ và mã điểm tham quan chuyển tiếp sang tiến trình 4.2.2 |
| 4.2.2 | Kiểm tra phiên bản nguồn và dịch văn bản đa ngôn ngữ | Thông tin tác vụ từ tiến trình 4.2.1 và văn bản thuyết minh tiếng Việt từ D3 | Kiểm tra số phiên bản nguồn, gửi văn bản gốc sang dịch vụ ngoài để dịch sang tiếng Anh và tiếng Trung, lưu bản dịch tạm thời vào D3 | Văn bản đã dịch từng ngôn ngữ chuyển tiếp sang tiến trình 4.2.3 |
| 4.2.3 | Tổng hợp âm thanh WAV và kiểm tra định dạng tệp | Văn bản dịch từ tiến trình 4.2.2 | Gửi văn bản từng ngôn ngữ sang dịch vụ ngoài để tổng hợp giọng đọc, kiểm tra phần đầu tệp định dạng WAV và dung lượng tệp hợp lệ | Luồng nhị phân tệp âm thanh WAV hợp lệ chuyển sang tiến trình 4.2.4 |
| 4.2.4 | Lưu kho tệp media và công bố trạng thái hoàn tất | Tệp âm thanh WAV từ tiến trình 4.2.3 | Ghi tệp âm thanh vào thư mục lưu trữ media trên đĩa, cập nhật bản ghi âm thanh đang hoạt động, chuyển trạng thái bản dịch sang công bố và đổi trạng thái tác vụ thành công trong D3 | Cập nhật hoàn tất toàn bộ dữ liệu nội dung đa ngôn ngữ trong D3 |

##### b. Phân rã tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký

Tiến trình 3.4 phân rã thành bốn tiến trình con từ 3.4.1 đến 3.4.4 mô tả cơ chế ghép nối lời nhắc, truy vấn mô hình trí tuệ nhân tạo, kiểm duyệt căn cứ tài liệu và ghi nhận dữ liệu phục vụ đối soát chất lượng.

![Hình 3.46: Sơ đồ DFD mức 3 tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký](file:///docs/diagram/dfd/DFD_Level_3_P3_4_RAG_Answer_Generation.drawio)

*Hình 3.46: Sơ đồ DFD mức 3 tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký*

Bảng 3.28 mô tả các tiến trình con thuộc tiến trình 3.4.

*Bảng 3.28: Bảng mô tả các tiến trình con trong DFD mức 3 của tiến trình 3.4*

| Số hiệu | Tên tiến trình con | Đầu vào | Xử lý nghiệp vụ | Đầu ra |
| :--- | :--- | :--- | :--- | :--- |
| 3.4.1 | Đóng gói lời nhắc hệ thống kèm ngữ cảnh đoạn kiến thức | Câu hỏi hợp lệ từ tiến trình 3.1 và tập đoạn kiến thức tương đồng từ tiến trình 3.3 | Ghép nối chỉ thị phạm vi Thảo Cầm Viên, nội dung các đoạn tài liệu tương đồng và mã trích dẫn tương ứng thành lời nhắc hoàn chỉnh | Gói lời nhắc hoàn chỉnh chuyển tiếp sang tiến trình 3.4.2 |
| 3.4.2 | Gọi mô hình ngôn ngữ sinh phản hồi theo ngữ cảnh | Gói lời nhắc hoàn chỉnh từ tiến trình 3.4.1 | Gửi lời nhắc sang dịch vụ mô hình ngôn ngữ bên ngoài, nhận về văn bản trả lời và danh sách các mã tài liệu được mô hình viện dẫn | Phản hồi thô và danh sách mã viện dẫn chuyển sang tiến trình 3.4.3 |
| 3.4.3 | Kiểm tra trích dẫn hợp lệ và lọc liên kết ngoài nguồn | Phản hồi thô và danh sách mã viện dẫn từ tiến trình 3.4.2 | Đối chiếu các mã trích dẫn trong văn bản trả lời với tập đoạn kiến thức đầu vào, lọc bỏ các liên kết lạ ngoài nguồn dữ liệu | Câu trả lời đã kiểm duyệt trích dẫn và lọc liên kết chuyển sang tiến trình 3.4.4 |
| 3.4.4 | Lưu nhật ký hỏi đáp và trả kết quả cho khách | Câu trả lời đã kiểm duyệt từ tiến trình 3.4.3 | Ghi nhận câu hỏi, câu trả lời, thời gian xử lý và danh sách trích dẫn vào bảng nhật ký hỏi đáp trong D6 | Câu trả lời hoàn chỉnh kèm danh sách trích dẫn gửi về Khách tham quan |
