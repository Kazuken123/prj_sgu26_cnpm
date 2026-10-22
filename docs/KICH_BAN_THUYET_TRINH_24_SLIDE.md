# KỊCH BẢN THUYẾT TRÌNH BÁO CÁO GIỮA KỲ ĐỒ ÁN CÔNG NGHỆ PHẦN MỀM
## Đề tài: Hệ thống tự động thuyết minh đa ngôn ngữ cho Chùa Linh Ứng
## Khớp chính xác với 24 slide của file Bao_Cao_Thuyet_Trinh_Do_An_CNPM.pptx

Phân bổ thời lượng: 15 phút trình bày chính chia cho 3 thành viên:
- Bạn A: Phụ trách Slide 1 đến Slide 8, thời lượng khoảng 4 phút 30 giây.
- Bạn B: Phụ trách Slide 9 đến Slide 17, thời lượng khoảng 5 phút 30 giây.
- Bạn C: Phụ trách Slide 18 đến Slide 24, thời lượng khoảng 5 phút.

---

## PHẦN 1. BÀI NÓI KHỚP THEO 24 SLIDE

### Slide 1: Trang bìa
**Người nói: Bạn A**

Kính thưa Thầy Nguyễn Quốc Huy và các bạn. Hôm nay, nhóm sinh viên lớp DCT124C1 gồm ba thành viên: Lê Văn Hiếu, Lê Đức Anh và Dương Gia Phát xin phép được báo cáo tiến độ đồ án môn học Công nghệ phần mềm với đề tài: Hệ thống tự động thuyết minh đa ngôn ngữ, áp dụng cho điểm tham quan di tích Chùa Linh Ứng.

### Slide 2: Cấu trúc bài báo cáo
**Người nói: Bạn A**

Bài báo cáo của nhóm bám sát hồ sơ tài liệu đồ án và tập trung vào các nội dung đã hoàn thành chuẩn chỉnh từ Chương 1 đến Chương 4. Cấu trúc bài nói gồm 5 phần chính:
Thứ nhất là Tổng quan đề tài và bối cảnh nghiệp vụ tại Chương 1.
Thứ hai là Phân tích yêu cầu sản phẩm theo PRD tại Chương 2.
Thứ ba là Phân tích hệ thống và mô hình Use Case tại Chương 3.
Thứ tư là Thiết kế kiến trúc ba lớp và cơ sở dữ liệu tại Chương 4.
Cuối cùng, nhóm báo cáo trung thực hiện trạng mã nguồn thực tế và kế hoạch thực hiện cho các chương tiếp theo.

### Slide 3: Bối cảnh nghiệp vụ tại Chùa Linh Ứng
**Người nói: Bạn A**

Đề tài xuất phát từ 4 bài toán thực tế tại Chùa Linh Ứng:
Một là rào cản ngôn ngữ. Du khách trong và ngoài nước đến tham quan nhưng thiếu hướng dẫn viên và không đọc được tiếng Việt, do đó hệ thống đặt mục tiêu hỗ trợ từ 15 ngôn ngữ trở lên.
Hai là nhu cầu nghe thuyết minh tự động theo vị trí GPS. Khách di chuyển đến điểm nào thì điện thoại tự phát âm thanh điểm đó, không cần bấm tra cứu thủ công.
Ba là nhu cầu hỏi đáp thông minh. Du khách có nhiều thắc mắc cần trợ lý trí tuệ nhân tạo giải đáp nhanh dựa trên nguồn tài liệu đã được ban quản lý kiểm duyệt.
Bốn là quản lý phiên vé. Ban quản lý cần thu phí linh hoạt qua mã QR trực tuyến hoặc quầy tiền mặt mà không bắt buộc khách phải đăng ký tài khoản.

### Slide 4: Các bên liên quan và mục tiêu đề tài
**Người nói: Bạn A**

Về con người, hệ thống phục vụ 3 nhóm chính: Khách tham quan quét mã và nghe thuyết minh; Nhân viên hỗ trợ xác nhận tiền mặt và quản lý nội dung; Quản trị viên quản lý tài khoản nhân viên và theo dõi hệ thống.
Từ đó, nhóm xác định 5 mục tiêu nghiệp vụ cốt lõi: Hỗ trợ khách tham quan chủ động; Xóa bỏ rào cản ngôn ngữ với 15 ngôn ngữ chuẩn bị trước; Thuyết minh tự động theo tọa độ định vị; Trợ lý hỏi đáp chỉ trả lời khi có căn cứ; Vận hành quầy vé và hệ thống tập trung, ổn định.

### Slide 5: Yêu cầu nghiệp vụ cấp cao BR-01 đến BR-09
**Người nói: Bạn A**

Trên màn hình là bảng đối chiếu 9 yêu cầu nghiệp vụ cấp cao định hình hệ thống:
BR-01 là quét mã QR và trả tiền để nhận quyền sử dụng.
BR-02 là hiển thị bản đồ số và vị trí các điểm tham quan xung quanh.
BR-03 là tự động phát âm thanh khi vào bán kính điểm di tích và chống phát lặp.
BR-04 là pipeline dịch thuật và tạo âm thanh trước cho 15 ngôn ngữ.
BR-05 là tải một gói dữ liệu bundle độc lập để giao diện tự xử lý ngoại tuyến.
BR-06 là chatbot RAG trả lời câu hỏi dựa trên kho tri thức đã duyệt.
BR-07 là cung cấp tour mẫu và cho phép khách tự thêm bớt điểm tham quan.
BR-08 là phân quyền nhân viên xác nhận thu tiền và quản trị viên xem nhật ký.
BR-09 là bảng điều khiển theo dõi sức khỏe hệ thống và doanh thu thực tế.

### Slide 6: Phạm vi triển khai và ràng buộc kỹ thuật
**Người nói: Bạn A**

Nhóm phân định rõ ranh giới kỹ thuật:
Trong phạm vi thực hiện là ứng dụng web responsive chạy trên trình duyệt điện thoại, kiến trúc ba lớp Router, Service và Store, sử dụng bản đồ Leaflet, chuẩn bị âm thanh trước và có chế độ giả lập tọa độ GPS để trình diễn trên lớp.
Ngoài phạm vi là nhóm không làm ứng dụng di động riêng biệt, không làm chế độ ngoại tuyến hoàn toàn, không làm định vị trong nhà, và đã loại bỏ toàn bộ các chức năng cũ về quán ăn, thực đơn hay đánh giá.
Ràng buộc kỹ thuật gồm: chạy trên Node.js 20, framework Express, cơ sở dữ liệu MySQL 8, bộ nhớ đệm Redis 7, đóng gói Docker và kiểm thử tự động trên GitHub Actions.

### Slide 7: Hành trình trải nghiệm của du khách
**Người nói: Bạn A**

Hành trình của khách diễn ra qua 5 bước liên tục:
Bước 1, khách quét mã QR tại cổng chào để mở trang web.
Bước 2, khách chọn trả tiền online hoặc đưa tiền mặt tại quầy vé.
Bước 3, khách nhận mã và đổi lấy chuỗi token chứng nhận phiên vé có hạn 24 giờ.
Bước 4, khách chọn ngôn ngữ mẹ đẻ và tải gói dữ liệu bundle của ngôn ngữ đó.
Bước 5, khách bấm bắt đầu tham quan, đi đến đâu nghe thuyết minh tự động đến đó và có thể mở chatbot để đặt câu hỏi khi cần.

### Slide 8: Ma trận phân cấp ưu tiên tính năng MoSCoW
**Người nói: Bạn A**

Nhóm phân loại mức độ ưu tiên theo mô hình MoSCoW:
Nhóm Must Have bắt buộc có gồm: thanh toán trực tuyến mô phỏng, thanh toán tiền mặt, kiểm soát phiên vé 24 giờ, gói dữ liệu bundle, bản đồ GPS tự phát âm thanh, pipeline dịch và âm thanh, quản trị nội bộ và kiến trúc ba lớp.
Nhóm Should Have gồm: chatbot RAG tra cứu tài liệu và màn hình giám sát sức khỏe hệ thống.
Nhóm Could Have là phần mở rộng nếu có thêm thời gian: cấp lại token khi mất mã, tạo âm thanh tức thì theo yêu cầu và chỉ đường đi bộ nâng cao.
Sau đây, bạn Lê Đức Anh sẽ trình bày chi tiết các User Story và phần phân tích hệ thống.

---

### Slide 9: User Stories trọng tâm Nhóm A và Nhóm B
**Người nói: Bạn B**

Em xin tiếp tục phần báo cáo với các User Story cốt lõi của Nhóm A và Nhóm B.
Về Nhóm A thanh toán: US-A01 và US-A02 quy định thanh toán trực tuyến phải có webhook hợp lệ về chữ ký, số tiền và mã giao dịch. Webhook gửi lặp tuyệt đối không được cấp thêm vé hoặc nhân đôi doanh thu. US-A03 xử lý thanh toán tiền mặt: nhân viên xác nhận thu tiền, hệ thống sinh mã ngắn lưu trong Redis có thời gian sống hữu hạn để khách đổi lấy token một lần. US-A04 quản lý phiên vé: token khách lưu tại trình duyệt và được kiểm tra hạn dùng ở mọi API được bảo vệ.
Về Nhóm B thuyết minh: US-B02 quy định khách bấm bắt đầu tham quan để mở quyền phát âm thanh của trình duyệt. Bán kính kích hoạt là 50 mét. Khi vào vùng, điểm gần nhất sẽ phát và mỗi điểm chỉ tự phát một lần. Hệ thống chống phát lặp bằng ngưỡng rời vùng 75 mét, tức khách phải đi xa hơn 1.5 lần bán kính rồi quay lại mới phát lượt mới.

### Slide 10: User Stories trọng tâm Nhóm C, D và E
**Người nói: Bạn B**

Tại slide 10 là các User Story về dữ liệu và tiện ích:
US-C01 và US-C02 về đa ngôn ngữ: một gói bundle chứa toàn bộ thông tin điểm tham quan, tọa độ, bài viết và đường dẫn âm thanh. Khi nhân viên lưu nội dung tiếng Việt, hệ thống tự kích hoạt tác vụ nền để dịch và tạo âm thanh cho các ngôn ngữ còn lại.
US-C03 là quy tắc dự phòng: nếu thiếu ngôn ngữ đã chọn, hệ thống tự chuyển sang tiếng Anh rồi đến tiếng Việt và hiển thị đúng nhãn ngôn ngữ thực tế.
US-D01 và US-D02 về chatbot RAG: chỉ phiên vé hợp lệ mới được hỏi đáp. Hệ thống tìm kiếm đoạn văn bản phù hợp trong kho tài liệu Chùa Linh Ứng, dùng mô hình ngôn ngữ trả lời kèm nguồn dẫn chứng. Nếu không đủ dữ liệu, hệ thống thông báo chưa có thông tin.
US-E01 về lộ trình: cung cấp tour mẫu và cho phép khách tự thêm hoặc bớt điểm; giao diện tự tính toán đường nối và khoảng cách ước tính.

### Slide 11: Quy tắc nghiệp vụ và yêu cầu phi chức năng
**Người nói: Bạn B**

Về quy tắc nghiệp vụ: vé tham quan có hiệu lực 24 giờ kể từ lúc xác nhận thanh toán; không yêu cầu đăng ký tài khoản khách; xác nhận lặp không ghi nhận thêm tiền; chỉ phát âm thanh khi có thao tác mở khóa của người dùng.
Về yêu cầu phi chức năng: thời gian phản hồi API tra cứu phải dưới 200 mili giây; tải toàn bộ gói bundle dưới 2 giây; mật khẩu nhân viên băm bằng thuật toán bcrypt; token gia hạn lưu dạng băm sha256; nhập sai mật khẩu 5 lần liên tiếp sẽ khóa tài khoản 15 phút; và quy trình kiểm thử tự động phải chạy đạt trên máy chủ kiểm thử.

### Slide 12: Tác nhân và ranh giới hệ thống
**Người nói: Bạn B**

Bước sang Chương 3 về Phân tích hệ thống, nhóm phân định rõ các tác nhân và ranh giới:
Hệ thống có 3 tác nhân con người là Khách tham quan, Nhân viên và Quản trị viên; cùng 3 tác nhân hệ thống bên ngoài gồm Cổng thanh toán, Dịch vụ dịch thuật chuyển giọng nói và Dịch vụ trí tuệ nhân tạo.
Ranh giới hệ thống phân chia rõ: trình duyệt của khách chỉ nhận gói bundle để hiển thị bản đồ Leaflet, đo tọa độ GPS và phát âm thanh; toàn bộ logic kiểm tra quyền, xác minh thanh toán, quản lý dữ liệu và tạo tác vụ nền đều chạy tập trung tại máy chủ Back-end.

### Slide 13: Mô hình 18 Use Cases và bảng đối chiếu
**Người nói: Bạn B**

Hồ sơ phân tích đã mô hình hóa đầy đủ 18 Use Case bao quát toàn bộ đề tài:
Phân hệ Du khách gồm 8 Use Case từ UC-01 đến UC-08, phụ trách thanh toán, xem bản đồ, đổi ngôn ngữ, nghe thuyết minh, chỉnh tour và hỏi đáp chatbot.
Phân hệ Quản trị vận hành gồm 6 Use Case từ UC-11 đến UC-15 và UC-18, phụ trách xác nhận tiền mặt, quản lý điểm di tích, tour mẫu, kho kiến thức và theo dõi sức khỏe hệ thống.
Phân hệ Xác thực và bảo mật gồm 4 Use Case: UC-09 đăng nhập, UC-10 đăng xuất, UC-16 tạo tài khoản nhân viên và UC-17 xem nhật ký kiểm toán.
Tất cả 18 Use Case đều có bảng đối chiếu truy vết từ User Story sang, bảo đảm không bỏ sót yêu cầu nào.

### Slide 14: Đặc tả chi tiết thanh toán và xem bản đồ
**Người nói: Bạn B**

Tại slide 14 là luồng xử lý thanh toán và hình ảnh sơ đồ Use Case UC-03 trích xuất từ tài liệu thiết kế.
Luồng thanh toán bảo đảm an toàn: khách khởi tạo phiên chờ; cổng thanh toán gửi webhook hoặc nhân viên thu tiền mặt bấm xác nhận; máy chủ kiểm tra hợp lệ mới chuyển trạng thái sang đã thanh toán và sinh mã đổi token.
Sơ đồ UC-03 thể hiện rõ: sau khi có token hợp lệ, giao diện tải gói bundle và gửi yêu cầu xin quyền định vị. Khi khách cho phép, bản đồ hiển thị vị trí hiện tại và danh sách các điểm tham quan gần nhất.

### Slide 15: Sơ đồ hoạt động thuyết minh tự động GPS UC-06
**Người nói: Bạn B**

Đây là sơ đồ hoạt động của UC-06, thể hiện thuật toán thuyết minh tự động:
Khi khách bấm bắt đầu, trình duyệt lắng nghe tọa độ thiết bị qua hàm watchPosition.
Mỗi khi có tọa độ mới, hệ thống áp dụng công thức Haversine tính khoảng cách tới các điểm di tích trong gói bundle.
Nếu có điểm nằm trong bán kính 50 mét, hệ thống kiểm tra trạng thái: điểm này đã phát ở lượt này chưa và có bài nào đang phát không. Nếu thỏa mãn, âm thanh bắt đầu phát và điểm được đánh dấu là đã phát.
Để tránh trường hợp khách đứng tại chỗ mà âm thanh phát lặp đi lặp lại, thuật toán đặt ra ngưỡng 75 mét. Khách bắt buộc phải di chuyển ra xa hơn 75 mét rồi mới quay lại thì hệ thống mới cho phép phát lại điểm đó.

### Slide 16: Phân hệ đa ngôn ngữ và trợ lý hỏi đáp UC-04 và UC-08
**Người nói: Bạn B**

Slide 16 trình bày sơ đồ Use Case UC-04 và UC-08:
UC-04 là cơ chế tải gói bundle: khách đổi ngôn ngữ thì máy chủ trả về toàn bộ dữ liệu của ngôn ngữ đó, giúp máy khách không cần gửi request hỏi máy chủ mỗi khi bấm xem thông tin điểm di tích.
UC-08 là quy trình hỏi đáp RAG: câu hỏi của khách được chuyển thành vector ngữ nghĩa, đối chiếu với kho tài liệu Chùa Linh Ứng để rút trích các đoạn văn bản liên quan nhất, sau đó gửi vào mô hình ngôn ngữ để tổng hợp câu trả lời có trích dẫn nguồn.

### Slide 17: Phân hệ quản trị và vận hành
**Người nói: Bạn B**

Slide 17 tóm tắt các Use Case quản trị từ UC-09 đến UC-18:
Quản trị viên có toàn quyền tạo tài khoản nhân viên và tra cứu nhật ký kiểm toán.
Nhân viên quản lý thông tin các điểm di tích, tour mẫu và kho tài liệu.
Điểm mấu chốt trong thiết kế là nhật ký kiểm toán AUDIT_LOGS được ghi nhận tự động ở mọi hành động nhạy cảm như đổi dữ liệu, thu tiền, cấp tài khoản và không thể bị sửa hay xóa qua giao diện.
Tiếp theo, bạn Dương Gia Phát sẽ trình bày phần Thiết kế hệ thống, kiến trúc ba lớp và hiện trạng thực tế.

---

### Slide 18: Kiến trúc tổng thể và công nghệ sử dụng
**Người nói: Bạn C**

Em xin phép trình bày Chương 4 về Thiết kế hệ thống.
Kiến trúc tổng thể được tổ chức thành 4 tầng rõ rệt:
Tầng 1 là Giao diện người dùng: chạy trên trình duyệt web, sử dụng bản đồ Leaflet, OpenStreetMap và các API vị trí, âm thanh của HTML5.
Tầng 2 là Máy chủ Back-end: xây dựng trên nền tảng Node.js 20 và framework Express, tuân thủ mô hình ba lớp kèm các bộ middleware xác thực, phân quyền và xử lý lỗi.
Tầng 3 là Lưu trữ dữ liệu: gồm MySQL 8 làm nguồn dữ liệu chính cho nghiệp vụ và Redis 7 làm kho lưu trữ tạm thời cho mã đổi vé.
Tầng 4 là Các bộ điều hợp dịch vụ ngoài: kết nối cổng thanh toán, dịch thuật, tạo giọng đọc và mô hình ngôn ngữ trí tuệ nhân tạo.

### Slide 19: Thiết kế kiến trúc Back-end ba lớp
**Người nói: Bạn C**

Trọng tâm thiết kế Back-end là mô hình ba lớp phân định rõ trách nhiệm:
Lớp ngoài cùng là Router: chỉ làm nhiệm vụ tiếp nhận yêu cầu HTTP, kiểm tra tính hợp lệ của dữ liệu đầu vào và trả về mã trạng thái. Router tuyệt đối không chứa logic nghiệp vụ và không viết câu lệnh truy vấn dữ liệu.
Lớp ở giữa là Service: trung tâm xử lý toàn bộ quy tắc nghiệp vụ, tính toán khoảng cách, điều phối giao dịch và gọi các bộ điều hợp bên ngoài. Service không trực tiếp gọi câu lệnh cơ sở dữ liệu.
Lớp trong cùng là Store: đóng gói toàn bộ câu lệnh SQL tương tác với MySQL và các thao tác trên Redis. Store chịu trách nhiệm mở giao dịch dữ liệu, bảo đảm các thay đổi phải cùng thành công hoặc cùng hủy bỏ.

### Slide 20: Thiết kế thành phần phần mềm Component Design
**Người nói: Bạn C**

Về mặt thành phần phần mềm, hệ thống được module hóa thành 7 component độc lập:
AuthComponent quản lý tài khoản nhân viên, mã băm mật khẩu và phiên đăng nhập.
TouristComponent xử lý thanh toán, mã ngắn Redis và cấp token phiên vé cho du khách.
ContentComponent quản lý điểm tham quan, bản dịch và gói dữ liệu bundle.
AudioPipelineComponent quản lý tiến trình dịch thuật và tạo tệp âm thanh nền.
RouteComponent quản lý danh mục tour mẫu và thuật toán sắp xếp điểm ghé thăm.
RagComponent phụ trách chia đoạn tài liệu, tạo vector nhúng và hỏi đáp trí tuệ nhân tạo.
MonitoringComponent theo dõi sức khỏe hệ thống và số liệu phiên hoạt động.

### Slide 21: Thiết kế cơ sở dữ liệu 3 phân hệ và 16 bảng
**Người nói: Bạn C**

Cơ sở dữ liệu của hệ thống được chuẩn hóa gồm 16 bảng, chia thành 3 phân hệ mạch lạc:
Phân hệ 1 về Tài khoản và Vé gồm 6 bảng: USERS, REFRESH_TOKENS, AUDIT_LOGS, VISIT_SESSIONS, PAYMENTS và BUNDLE_ACCESS_LOGS.
Phân hệ 2 về Nội dung và Tour gồm 7 bảng: LANGUAGES, POIS, POI_TRANSLATIONS, AUDIOS, CONTENT_JOBS, TOURS và TOUR_POIS.
Phân hệ 3 về Kho tri thức và Hỏi đáp gồm 3 bảng: KNOWLEDGE_DOCUMENTS, KNOWLEDGE_CHUNKS và CHAT_LOGS.
Tất cả các bảng đều được thiết kế đầy đủ kiểu dữ liệu, khóa chính, khóa ngoại và các chỉ mục phục vụ truy vấn tốc độ cao.

### Slide 22: Quy tắc toàn vẹn dữ liệu và giao dịch
**Người nói: Bạn C**

Để hệ thống hoạt động ổn định và chính xác, nhóm thiết lập các quy tắc toàn vẹn nghiêm ngặt:
Thứ nhất, việc kích hoạt phiên vé và ghi nhận thanh toán bắt buộc nằm trong một giao dịch dữ liệu duy nhất. Nếu có lỗi, toàn bộ thay đổi phải hủy bỏ để tránh trường hợp nhận tiền mà không cấp vé.
Thứ hai, cặp điểm tham quan và mã ngôn ngữ là duy nhất; bộ ba điểm tham quan, ngôn ngữ và phiên bản trong CONTENT_JOBS là duy nhất để tác vụ nền cũ không ghi đè nội dung mới.
Thứ ba, các bảng thanh toán và phiên vé được bảo vệ bằng khóa ngoại ngăn chặn xóa dòng dữ liệu, bảo đảm số liệu kế toán đối soát luôn được toàn vẹn.

### Slide 23: Hiện trạng đồ án thực tế và kế hoạch triển khai tiếp theo
**Người nói: Bạn C**

Nhóm xin báo cáo trung thực và khách quan hiện trạng thực tế giữa phần đã có mã nguồn chạy được và phần mới ở mức phân tích thiết kế:
Phần đã có mã nguồn chạy và kiểm thử thực tế là: nền tảng xác thực nội bộ cho nhân viên và quản trị viên gồm USERS, REFRESH_TOKENS, AUDIT_LOGS; cơ chế xoay vòng token; khóa tài khoản sau 5 lần nhập sai; kiểm tra phân quyền tại máy chủ; cùng bộ 51 bài kiểm thử tự động và 6 công việc chạy thành công trên GitHub Actions CI.
Phần đã hoàn thành hồ sơ phân tích thiết kế chi tiết nhưng chưa lập trình mã nguồn là: các nghiệp vụ của du khách gồm thanh toán vé, định vị GPS, gói bundle, pipeline đa ngôn ngữ, chatbot RAG và màn hình giám sát.
Kế hoạch giai đoạn tiếp theo của nhóm là: chạy migration tạo 13 bảng cơ sở dữ liệu còn lại; hiện thực các lớp Service cho du khách; xây dựng giao diện demo Leaflet; và hoàn thiện các chương Kiểm thử, Triển khai theo đúng kế hoạch đồ án.

### Slide 24: Lời cảm ơn và phần hỏi đáp
**Người nói: Bạn C**

Nhóm sinh viên chúng em xin chân thành cảm ơn Thầy Nguyễn Quốc Huy và các bạn đã chú ý lắng nghe bài báo cáo tiến độ đồ án.
Sau đây, nhóm kính mời Thầy và các bạn đặt câu hỏi đóng góp để nhóm hoàn thiện đồ án tốt hơn trong giai đoạn tiếp theo.

---

## PHẦN 2. CÂU HỎI VẤN ĐÁP VÀ TRẢ LỜI NGẮN GỌN

### Câu 1: Vì sao du khách dùng token mà không cần đăng ký tài khoản?
Dạ, du khách đến tham quan một lần chỉ cần quyền truy cập trong thời hạn vé là 24 giờ. Hệ thống cấp một chuỗi mã token gắn liền với phiên thanh toán, giúp khách vào dùng ngay mà không phải qua các bước đăng ký tài khoản rườm rà. Quyền của khách được quản lý độc lập với tài khoản nhân viên.

### Câu 2: Vai trò của MySQL và Redis trong hệ thống khác nhau thế nào?
Dạ, MySQL là cơ sở dữ liệu quan hệ chính thống, lưu trữ lâu dài và làm nguồn đối soát cho thanh toán, phiên vé, tài khoản và nội dung. Redis đóng vai trò lưu trữ tạm thời cho các mã ngắn đổi vé có thời gian sống ngắn và bộ đếm giới hạn tần suất truy cập. Nếu Redis gặp sự cố, hệ thống không được phép bỏ qua bước kiểm tra để tự ý cấp vé.

### Câu 3: Tải gói bundle một lần thì có dùng được khi mất mạng hoàn toàn không?
Dạ, gói bundle chứa thông tin tọa độ, bài viết và đường dẫn tệp âm thanh của ngôn ngữ đang chọn, giúp máy khách tự hiển thị và tính khoảng cách mà không cần gọi API máy chủ cho từng điểm di tích. Tuy nhiên, việc phát âm thanh, tải hình ảnh, đổi ngôn ngữ hoặc hỏi đáp chatbot vẫn cần kết nối mạng để tải dữ liệu, nên hệ thống chưa hỗ trợ chế độ ngoại tuyến hoàn toàn.

### Câu 4: Nhóm đã tích hợp thanh toán thật hay dùng cổng mô phỏng?
Dạ, hiện tại phân hệ thanh toán khách mới ở mức hoàn thiện hồ sơ thiết kế. Trong giai đoạn thử nghiệm sắp tới, nhóm đề xuất sử dụng bộ điều hợp mô phỏng MockGateway để kiểm chứng luồng xử lý thành công và thất bại. Khi đủ điều kiện tài khoản và môi trường thử nghiệm, nhóm mới tích hợp cổng thanh toán trực tuyến chính thức.

### Câu 5: Chatbot RAG hoạt động ra sao và có bảo đảm không bịa thông tin không?
Dạ, chatbot hoạt động theo nguyên tắc: nhận câu hỏi, tìm kiếm các đoạn văn bản có nội dung tương đồng trong kho tài liệu Chùa Linh Ứng đã duyệt, rồi đưa vào mô hình ngôn ngữ để tổng hợp câu trả lời kèm trích dẫn nguồn. Nếu câu hỏi nằm ngoài phạm vi tài liệu, chatbot từ chối trả lời. Điều này hạn chế tối đa việc tạo thông tin sai lệch, nhưng chất lượng thực tế vẫn cần được đo lường khi chạy mã nguồn thực tế.

### Câu 6: Mã nguồn hiện tại của nhóm đã chạy được những chức năng nào?
Dạ, mã nguồn hiện tại đã hoàn thiện nền tảng xác thực nội bộ: đăng nhập, xem thông tin tài khoản, làm mới phiên, đăng xuất an toàn, quản trị viên tạo tài khoản nhân viên, khóa tài khoản tạm thời 15 phút khi nhập sai 5 lần, và ghi nhật ký kiểm toán. Toàn bộ mã nguồn này đã vượt qua 51 bài kiểm thử tự động trên GitHub Actions. Các nghiệp vụ vé tham quan của du khách là phần nhóm sẽ lập trình tiếp theo dựa trên bản thiết kế đã duyệt.
