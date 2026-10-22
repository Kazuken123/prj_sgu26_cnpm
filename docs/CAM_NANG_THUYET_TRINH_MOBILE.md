# CẨM NANG CẦM ĐIỆN THOẠI THUYẾT TRÌNH — 24 SLIDE
## Đồ án môn học Công nghệ phần mềm — Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng
## Thiết kế tối ưu cho màn hình điện thoại: câu ngắn, ngắt dòng thoáng, liếc nhanh không vấp

---

### SLIDE 1: TRANG BÌA
* Người nói: Bạn A
* Điểm nhìn: Màn hình hiện tên đề tài và tên 3 thành viên

Kính thưa Thầy Nguyễn Quốc Huy và các bạn.
Hôm nay, nhóm sinh viên lớp DCT124C1 gồm Lê Văn Hiếu, Lê Đức Anh và Dương Gia Phát xin báo cáo tiến độ đồ án môn học Công nghệ phần mềm:
Hệ thống tự động thuyết minh đa ngôn ngữ tại điểm di tích Chùa Linh Ứng.

---

### SLIDE 2: CẤU TRÚC BÁO CÁO
* Người nói: Bạn A
* Điểm nhìn: 4 thẻ nội dung trên màn hình

Bài báo cáo gồm 5 phần chính, bám sát các nội dung đã hoàn thành chuẩn chỉnh từ Chương 1 đến Chương 4:
Phần 1: Tổng quan đề tài và bối cảnh nghiệp vụ.
Phần 2: Phân tích yêu cầu sản phẩm theo PRD.
Phần 3: Phân tích hệ thống và mô hình Use Case.
Phần 4: Thiết kế kiến trúc ba lớp và cơ sở dữ liệu.
Phần 5: Báo cáo trung thực hiện trạng mã nguồn thực tế và kế hoạch giai đoạn tiếp theo.

---

### SLIDE 3: BỐI CẢNH TẠI CHÙA LINH ỨNG
* Người nói: Bạn A
* Điểm nhìn: 4 vấn đề nghiệp vụ

Đề tài giải quyết 4 bài toán thực tế tại Chùa Linh Ứng:
Một là rào cản ngôn ngữ của du khách, hệ thống đặt mục tiêu hỗ trợ từ 15 ngôn ngữ trở lên bằng cả bài viết và giọng đọc.
Hai là nhu cầu nghe thuyết minh tự động theo tọa độ định vị GPS khi đến gần di tích.
Ba là nhu cầu hỏi đáp thông minh với trợ lý trí tuệ nhân tạo dựa trên tài liệu đã duyệt.
Bốn là quản lý vé tham quan linh hoạt bằng mã QR và tiền mặt mà không bắt buộc khách phải tạo tài khoản.

---

### SLIDE 4: BÊN LIÊN QUAN VÀ MỤC TIÊU
* Người nói: Bạn A
* Điểm nhìn: 3 tác nhân con người và 5 mục tiêu

Hệ thống phục vụ 3 nhóm người dùng: Khách tham quan, Nhân viên điểm đến và Quản trị viên hệ thống.
Nhóm hướng đến 5 mục tiêu cốt lõi:
Hỗ trợ tham quan chủ động trên bản đồ số.
Xóa bỏ rào cản ngôn ngữ.
Thuyết minh tự động chính xác theo vị trí.
Hỏi đáp có căn cứ xác thực.
Vận hành quầy vé và hệ thống tập trung, an toàn.

---

### SLIDE 5: YÊU CẦU CẤP CAO BR-01 ĐẾN BR-09
* Người nói: Bạn A
* Điểm nhìn: Bảng 9 yêu cầu nghiệp vụ

Hệ thống được định hình qua 9 yêu cầu nghiệp vụ cấp cao:
Từ BR-01 đến BR-03 là quét QR thanh toán, xem bản đồ định vị và tự phát âm thanh chống lặp.
BR-04 và BR-05 là xử lý dữ liệu trước cho 15 ngôn ngữ và tải gói dữ liệu độc lập một lần.
BR-06 và BR-07 là trợ lý hỏi đáp có dẫn nguồn và lộ trình tham quan tùy chỉnh.
BR-08 và BR-09 là phân quyền nhân viên, lưu nhật ký kiểm toán và bảng theo dõi sức khỏe hệ thống.

---

### SLIDE 6: PHẠM VI VÀ RÀNG BUỘC KỸ THUẬT
* Người nói: Bạn A
* Điểm nhìn: 3 cột phạm vi và công nghệ

Trong phạm vi: ứng dụng web chạy trên điện thoại, kiến trúc ba lớp, bản đồ Leaflet, chuẩn bị âm thanh trước và có chế độ giả lập GPS để thử nghiệm trong lớp.
Ngoài phạm vi: nhóm không làm ứng dụng di động riêng, không làm chế độ dùng hoàn toàn khi mất mạng, không làm định vị trong nhà, và đã xóa bỏ các nghiệp vụ cũ về quán ăn, thực đơn.
Công nghệ bắt buộc: Node.js 20, framework Express, cơ sở dữ liệu MySQL 8, bộ nhớ đệm Redis 7, đóng gói Docker và kiểm thử tự động trên GitHub Actions.

---

### SLIDE 7: HÀNH TRÌNH CỦA DU KHÁCH
* Người nói: Bạn A
* Điểm nhìn: 5 bước trải nghiệm

Trải nghiệm của khách gồm 5 bước liền mạch:
Bước 1: Quét mã QR tại cổng để mở trang web.
Bước 2: Chọn trả tiền trực tuyến hoặc trả tiền mặt tại quầy.
Bước 3: Đổi mã lấy chuỗi token phiên vé có hạn 24 giờ.
Bước 4: Chọn ngôn ngữ mẹ đẻ và tải gói dữ liệu của ngôn ngữ đó.
Bước 5: Bấm bắt đầu tham quan, di chuyển để nghe thuyết minh tự động và hỏi đáp trợ lý khi cần.

---

### SLIDE 8: MA TRẬN PHÂN CẤP ƯU TIÊN MOSCOW
* Người nói: Bạn A
* Điểm nhìn: 3 cột Must, Should, Could

Nhóm phân loại ưu tiên theo mô hình MoSCoW:
Nhóm bắt buộc có gồm thanh toán vé, phiên khách 24 giờ, gói dữ liệu, bản đồ GPS tự phát âm thanh, pipeline đa ngôn ngữ, quản trị tài khoản và kiến trúc ba lớp.
Nhóm nên có gồm chatbot hỏi đáp trên kho tài liệu và bảng giám sát hệ thống.
Nhóm mở rộng gồm cấp lại vé khi mất mã, tạo âm thanh tức thì theo yêu cầu và chỉ đường đi bộ nâng cao.
Sau đây, bạn Lê Đức Anh sẽ trình bày chi tiết các User Story và phần phân tích hệ thống.

---

### SLIDE 9: USER STORIES NHÓM A VÀ B
* Người nói: Bạn B
* Điểm nhìn: 4 khối User Story thanh toán và thuyết minh

Nhóm A về thanh toán:
Thanh toán trực tuyến bắt buộc có webhook hợp lệ về chữ ký, số tiền và mã giao dịch; webhook gửi lặp tuyệt đối không tạo thêm vé.
Thanh toán tiền mặt: nhân viên bấm nhận tiền, hệ thống tạo mã ngắn lưu trong Redis có thời gian sống hữu hạn để khách đổi lấy token một lần.
Nhóm B về thuyết minh:
Khách bấm bắt đầu tham quan để mở quyền âm thanh của trình duyệt.
Bán kính kích hoạt là 50 mét, điểm gần nhất sẽ phát và mỗi điểm chỉ phát một lần.
Hệ thống chống phát lặp bằng ngưỡng rời vùng 75 mét: khách phải đi ra xa hơn 1.5 lần bán kính rồi quay lại mới phát lượt mới.

---

### SLIDE 10: USER STORIES NHÓM C, D VÀ E
* Người nói: Bạn B
* Điểm nhìn: 4 khối đa ngôn ngữ, chatbot và lộ trình

Nhóm C về đa ngôn ngữ:
Gói bundle chứa toàn bộ thông tin điểm tham quan, bài viết và đường dẫn âm thanh.
Khi lưu nội dung tiếng Việt, hệ thống tự chạy tác vụ nền để dịch và tạo âm thanh cho các ngôn ngữ còn lại.
Nếu thiếu ngôn ngữ đã chọn, hệ thống tự chuyển sang tiếng Anh rồi tiếng Việt.
Nhóm D về chatbot:
Chỉ khách có phiên vé hợp lệ mới được đặt câu hỏi. Chatbot tìm tài liệu liên quan trong kho dữ liệu Chùa Linh Ứng và trả lời kèm nguồn trích dẫn.
Nhóm E về lộ trình:
Cung cấp tour mẫu và cho phép khách tự thêm bớt điểm tham quan theo ý muốn.

---

### SLIDE 11: QUY TẮC NGHIỆP VỤ VÀ PHI CHỨC NĂNG
* Người nói: Bạn B
* Điểm nhìn: 2 cột quy tắc và tiêu chuẩn kỹ thuật

Quy tắc nghiệp vụ:
Vé tham quan có giá trị đúng 24 giờ kể từ thời điểm thanh toán.
Khách không cần tạo tài khoản cá nhân.
Xác nhận thanh toán lặp không được tăng thêm doanh thu.
Tiêu chuẩn phi chức năng:
Thời gian phản hồi API dưới 200 mili giây.
Tải gói dữ liệu bundle dưới 2 giây.
Mật khẩu nhân viên băm bằng thuật toán bcrypt.
Nhập sai mật khẩu 5 lần liên tiếp sẽ tự động khóa tài khoản trong 15 phút.

---

### SLIDE 12: TÁC NHÂN VÀ RANH GIỚI HỆ THỐNG
* Người nói: Bạn B
* Điểm nhìn: Sơ đồ tác nhân và 2 vùng ranh giới

Tác nhân hệ thống gồm 3 nhóm người dùng: Khách tham quan, Nhân viên và Quản trị viên; cùng 3 dịch vụ ngoài: Cổng thanh toán, Dịch vụ dịch thuật chuyển giọng nói và Dịch vụ trí tuệ nhân tạo.
Ranh giới hệ thống:
Trình duyệt chỉ nhận gói dữ liệu để hiển thị bản đồ, đo vị trí GPS và phát âm thanh.
Toàn bộ logic kiểm tra quyền, xác minh tiền, quản lý dữ liệu và tạo tác vụ nền đều chạy tập trung tại máy chủ Back-end.

---

### SLIDE 13: MÔ HÌNH 18 USE CASES TỔNG QUÁT
* Người nói: Bạn B
* Điểm nhìn: 3 cột 18 Use Case

Hồ sơ phân tích mô hình hóa đủ 18 Use Case:
Phân hệ Du khách gồm 8 Use Case từ UC-01 đến UC-08: thanh toán, xem bản đồ, chọn ngôn ngữ, nghe thuyết minh, chỉnh tour và hỏi đáp chatbot.
Phân hệ Quản trị vận hành gồm 6 Use Case từ UC-11 đến UC-15 và UC-18: xác nhận tiền mặt, quản lý điểm di tích, tour mẫu, kho kiến thức và giám sát hệ thống.
Phân hệ Xác thực gồm 4 Use Case: UC-09 đăng nhập, UC-10 đăng xuất, UC-16 tạo nhân viên và UC-17 xem nhật ký kiểm toán.
Tất cả đều có bảng đối chiếu truy vết từ User Story sang.

---

### SLIDE 14: ĐẶC TẢ THANH TOÁN VÀ XEM BẢN ĐỒ
* Người nói: Bạn B
* Điểm nhìn: Luồng thanh toán và sơ đồ hình UC-03 bên phải

Khách chọn trả tiền, máy chủ tạo phiên chờ.
Khi có webhook thanh toán online hoặc nhân viên bấm xác nhận tiền mặt, máy chủ kiểm tra hợp lệ mới đổi trạng thái sang đã thanh toán và sinh mã đổi token.
Sơ đồ UC-03 bên phải thể hiện: sau khi có token hợp lệ, giao diện tải gói bundle và xin quyền GPS. Khi khách đồng ý, màn hình hiển thị vị trí của khách và các điểm tham quan gần nhất.

---

### SLIDE 15: SƠ ĐỒ HOẠT ĐỘNG THUYẾT MINH GPS UC-06
* Người nói: Bạn B
* Điểm nhìn: Sơ đồ hoạt động bên trái và các bước thuật toán bên phải

Đây là sơ đồ hoạt động của UC-06:
Khi khách bấm bắt đầu, trình duyệt lắng nghe tọa độ liên tục.
Mỗi khi có tọa độ mới, giao diện tính khoảng cách Haversine tới các điểm di tích trong gói bundle.
Nếu có điểm nằm trong bán kính 50 mét, hệ thống kiểm tra điểm này đã phát chưa và có âm thanh nào đang chạy không. Nếu đủ điều kiện, âm thanh sẽ phát.
Sau khi phát xong, khách phải di chuyển ra xa hơn 75 mét rồi mới quay lại thì hệ thống mới cho phép phát lại điểm đó.

---

### SLIDE 16: ĐA NGÔN NGỮ VÀ TRỢ LÝ HỎI ĐÁP
* Người nói: Bạn B
* Điểm nhìn: 2 sơ đồ UC-04 và UC-08

Sơ đồ UC-04 bên trái: khách đổi ngôn ngữ thì máy chủ tải toàn bộ dữ liệu của ngôn ngữ đó về máy khách. Khách bấm xem điểm không cần gửi yêu cầu hỏi lại máy chủ.
Sơ đồ UC-08 bên phải: câu hỏi của khách được chuyển thành vector ngữ nghĩa để tìm đoạn văn bản phù hợp trong kho tài liệu Chùa Linh Ứng, sau đó mô hình ngôn ngữ tổng hợp câu trả lời kèm nguồn trích dẫn.

---

### SLIDE 17: PHÂN HỆ QUẢN TRỊ VÀ VẬN HÀNH
* Người nói: Bạn B
* Điểm nhìn: 4 thẻ chức năng quản trị

Quản trị viên có quyền tạo tài khoản nhân viên và tra cứu nhật ký kiểm toán.
Nhân viên quản lý điểm tham quan, lộ trình mẫu và kho tài liệu.
Mọi thao tác đổi dữ liệu, thu tiền, cấp tài khoản đều tự động ghi vào nhật ký AUDIT_LOGS và không thể sửa hay xóa qua giao diện.
Tiếp theo, bạn Dương Gia Phát sẽ trình bày phần Thiết kế hệ thống và hiện trạng thực tế.

---

### SLIDE 18: KIẾN TRÚC TỔNG THỂ VÀ CÔNG NGHỆ
* Người nói: Bạn C
* Điểm nhìn: 4 dải tầng kiến trúc từ trên xuống dưới

Kiến trúc hệ thống được chia thành 4 tầng rõ ràng:
Tầng 1: Giao diện web chạy trên điện thoại, dùng Leaflet, OpenStreetMap và API âm thanh của trình duyệt.
Tầng 2: Máy chủ Back-end viết bằng Node.js 20 và framework Express, chạy theo mô hình ba lớp kèm middleware xác thực và phân quyền.
Tầng 3: Cơ sở dữ liệu MySQL 8 lưu trữ dữ liệu chính thức và Redis 7 lưu mã ngắn đổi vé.
Tầng 4: Các bộ điều hợp dịch vụ ngoài kết nối thanh toán, dịch thuật, giọng đọc và trí tuệ nhân tạo.

---

### SLIDE 19: THIẾT KẾ BACK-END BA LỚP
* Người nói: Bạn C
* Điểm nhìn: 3 cột Router, Service, Store

Ba lớp trong Back-end có trách nhiệm hoàn toàn độc lập:
Lớp Router ở ngoài cùng: tiếp nhận yêu cầu HTTP, kiểm tra định dạng dữ liệu đầu vào và trả về mã trạng thái. Router không chứa logic nghiệp vụ và không viết truy vấn cơ sở dữ liệu.
Lớp Service ở giữa: xử lý toàn bộ quy tắc nghiệp vụ, tính khoảng cách, điều phối giao dịch và gọi các bộ điều hợp ngoài.
Lớp Store ở trong cùng: đóng gói toàn bộ câu lệnh SQL và Redis, mở giao dịch dữ liệu để bảo đảm các thao tác phải cùng thành công hoặc cùng hủy bỏ.

---

### SLIDE 20: THIẾT KẾ THÀNH PHẦN COMPONENT DESIGN
* Người nói: Bạn C
* Điểm nhìn: Lưới 7 thành phần phần mềm

Hệ thống được chia thành 7 component độc lập:
AuthComponent quản lý đăng nhập nhân viên và phiên làm việc.
TouristComponent xử lý thanh toán và cấp token phiên vé cho du khách.
ContentComponent quản lý điểm tham quan và gói dữ liệu bundle.
AudioPipelineComponent quản lý tiến trình dịch và tạo giọng đọc nền.
RouteComponent quản lý danh mục tour mẫu.
RagComponent chia đoạn tài liệu và hỏi đáp trí tuệ nhân tạo.
MonitoringComponent theo dõi sức khỏe và thống kê hệ thống.

---

### SLIDE 21: CƠ SỞ DỮ LIỆU 3 PHÂN HỆ VÀ 16 BẢNG
* Người nói: Bạn C
* Điểm nhìn: 3 khối cơ sở dữ liệu

Cơ sở dữ liệu gồm 16 bảng, chia thành 3 phân hệ:
Phân hệ 1 về Tài khoản và Vé gồm 6 bảng: USERS, REFRESH_TOKENS, AUDIT_LOGS, VISIT_SESSIONS, PAYMENTS và BUNDLE_ACCESS_LOGS.
Phân hệ 2 về Nội dung và Tour gồm 7 bảng: LANGUAGES, POIS, POI_TRANSLATIONS, AUDIOS, CONTENT_JOBS, TOURS và TOUR_POIS.
Phân hệ 3 về Kho tài liệu gồm 3 bảng: KNOWLEDGE_DOCUMENTS, KNOWLEDGE_CHUNKS và CHAT_LOGS.
Các bảng đều có khóa chính, khóa ngoại và chỉ mục tìm kiếm đầy đủ.

---

### SLIDE 22: QUY TẮC TOÀN VẸN VÀ GIAO DỊCH
* Người nói: Bạn C
* Điểm nhìn: 6 thẻ quy tắc toàn vẹn

Các quy tắc toàn vẹn bảo đảm tính đúng đắn của dữ liệu:
Kích hoạt phiên vé và ghi nhận tiền bắt buộc thực hiện trong một giao dịch dữ liệu duy nhất.
Cặp điểm tham quan và ngôn ngữ là duy nhất; bộ ba điểm tham quan, ngôn ngữ và phiên bản là duy nhất để tác vụ nền cũ không ghi đè dữ liệu mới.
Các bảng thanh toán và phiên vé áp dụng khóa ngoại chặn xóa dữ liệu để bảo vệ số liệu kế toán đối soát.

---

### SLIDE 23: HIỆN TRẠNG VÀ KẾ HOẠCH TRIỂN KHAI
* Người nói: Bạn C
* Điểm nhìn: Cột đã xong bên trái và cột kế hoạch bên phải

Nhóm báo cáo trung thực hiện trạng mã nguồn thực tế so với hồ sơ thiết kế:
Phần đã có mã nguồn chạy và kiểm thử thực tế: nền tảng xác thực nội bộ nhân viên gồm USERS, REFRESH_TOKENS, AUDIT_LOGS; cơ chế xoay vòng token; khóa tài khoản sau 5 lần sai; cùng 51 bài kiểm thử tự động và 6 công việc chạy thành công trên GitHub Actions CI.
Phần đã hoàn thành thiết kế nhưng chưa lập trình mã nguồn: toàn bộ nghiệp vụ vé du khách, GPS, gói bundle, pipeline âm thanh, chatbot RAG và màn hình giám sát.
Kế hoạch tiếp theo: chạy migration tạo 13 bảng dữ liệu còn lại, lập trình các lớp Service cho du khách và xây dựng giao diện demo Leaflet.

---

### SLIDE 24: LỜI CẢM ƠN VÀ HỎI ĐÁP
* Người nói: Bạn C
* Điểm nhìn: Chữ cảm ơn và Q&A chính giữa

Nhóm sinh viên chúng em xin chân thành cảm ơn Thầy Nguyễn Quốc Huy và các bạn đã chú ý lắng nghe bài báo cáo tiến độ đồ án.
Sau đây, nhóm kính mời Thầy và các bạn đặt câu hỏi đóng góp để nhóm tiếp tục hoàn thiện đồ án.
