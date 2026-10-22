# KỊCH BẢN THUYẾT TRÌNH BÁO CÁO GIỮA KỲ — 13 SLIDE
## Đồ án môn học: Công nghệ phần mềm
## Tệp trình chiếu: Multilingual_Audio_Guide_System.pdf
## Tổng thời lượng: 15 phút — 2.050 từ

Phân bổ người nói:
- Bạn A: Slide 1 đến Slide 4, thời lượng 4 phút 30 giây, khoảng 610 từ.
- Bạn B: Slide 5 đến Slide 8, thời lượng 5 phút, khoảng 670 từ.
- Bạn C: Slide 9 đến Slide 13, thời lượng 5 phút 30 giây, khoảng 770 từ.

---

### Slide 1: Hệ Thống Tự Động Thuyết Minh Đa Ngôn Ngữ, 0.5 phút, 70 từ, Bạn A
- LỜI NÓI:
Kính thưa Thầy Nguyễn Quốc Huy và các bạn, bước chân đến Chùa Linh Ứng, chúng em nhận thấy một khoảng cách lớn giữa bề dày di tích lịch sử và khả năng tự tiếp cận của khách tham quan quốc tế. [CHỈ VÀO: tên đề tài ở trung tâm] Hôm nay, nhóm sinh viên lớp DCT124C1 gồm Lê Văn Hiếu, Lê Đức Anh và Dương Gia Phát xin báo cáo đồ án Hệ thống tự động thuyết minh đa ngôn ngữ. Bài trình bày tập trung vào giải pháp công nghệ, ranh giới giữa phần đã chạy được mã nguồn và phần đang ở mức thiết kế. [CHỈ VÀO: dòng thông tin nhóm bên dưới] Mục tiêu cao nhất là giúp du khách tự do tìm hiểu văn hóa bằng chính tiếng mẹ đẻ của mình. Bây giờ, em xin bắt đầu với những khó khăn thực tế mà du khách đang gặp phải.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Mục tiêu lớn nhất của đề tài này trong môn Công nghệ phần mềm là gì?
Dạ thưa Thầy, mục tiêu lớn nhất là áp dụng quy trình công nghệ phần mềm chuẩn mực từ phân tích yêu cầu, bóc tách kiến trúc ba lớp cho máy chủ đến thiết kế cơ sở dữ liệu và tự động kiểm thử, giải quyết bài toán thuyết minh định vị cho du khách.
2. Giảng viên hỏi: Hiện tại nhóm đã có sản phẩm chạy thực tế cho khách chưa?
Dạ thưa Thầy, nhóm xin nói rõ là phân hệ phục vụ du khách hiện mới hoàn thành ở mức phân tích và thiết kế kiến trúc; phần đã có mã nguồn chạy thực tế và vượt qua kiểm thử là nền tảng quản trị tài khoản nội bộ và quy trình kiểm thử tự động.
- CẢNH BÁO: Không đọc từng tên thành viên quá dài dòng, không nói hệ thống đã hoàn thiện toàn bộ.

---

### Slide 2: Ma Sát Trong Trải Nghiệm Và Thách Thức Vận Hành, 1.0 phút, 135 từ, Bạn A
- LỜI NÓI:
Đứng trước tượng Phật Bà uy nghiêm, một vị khách nước ngoài muốn hiểu về ý nghĩa lịch sử nhưng lại không có người hướng dẫn và không đọc được tiếng Việt. [CHỈ VÀO: khối bên trái, Thiếu hụt Ngôn ngữ Bản địa] Đó là rào cản thứ nhất: sự thiếu hụt nội dung bản địa hóa, đòi hỏi hệ thống phải chuẩn bị sẵn giọng đọc chuẩn cho ít nhất 15 ngôn ngữ. Khó khăn thứ hai xuất hiện khi khách có điện thoại nhưng phải liên tục cúi đầu bấm tìm từng bài thuyết minh. [CHỈ VÀO: khối ở giữa, Gián đoạn Do Tra Cứu Thủ Công] Thao tác này làm đứt gãy trải nghiệm ngắm cảnh, bắt buộc hệ thống phải tự phát âm thanh theo tọa độ di chuyển. [NGHỈ] Cuối cùng, khi khách có thắc mắc sâu hơn, họ cần một trợ lý giải đáp tức thì. [CHỈ VÀO: khối bên phải, Nhu cầu Hỏi đáp Xác thực] Trợ lý này phải lấy thông tin từ kho tư liệu đã kiểm duyệt, tuyệt đối không được tự bịa ra kiến thức sai lệch lịch sử. Ba bài toán này định hình toàn bộ thiết kế nghiệp vụ của nhóm. Tiếp theo, em xin giải thích vì sao nhóm chọn ứng dụng web thay vì bắt khách cài ứng dụng.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Con số 15 ngôn ngữ đã là cam kết cuối cùng chưa?
Dạ thưa Thầy, con số 15 ngôn ngữ là đề xuất cụ thể của nhóm trong báo cáo; tài liệu gốc ghi yêu cầu là 15 ngôn ngữ trở lên nên số lượng ngôn ngữ nghiệm thu thực tế cần được Thầy phê duyệt trước khi hoàn thành.
2. Giảng viên hỏi: Hệ thống kiểm soát việc trợ lý trí tuệ nhân tạo nói sai bằng cách nào?
Dạ thưa Thầy, hệ thống áp dụng cơ chế truy xuất dữ liệu có căn cứ, bắt buộc câu trả lời chỉ được rút trích từ tài liệu văn hóa do ban quản lý phê duyệt; phần này nhóm đã thiết kế xong nhưng chưa lập trình mã nguồn.
- CẢNH BÁO: Tránh dùng từ ảo giác tiếng Anh, hãy giải thích là hiện tượng mô hình trí tuệ nhân tạo tự bịa ra thông tin sai lệch.

---

### Slide 3: Quyết Định Kiến Trúc Tối Ưu Hóa Tiếp Cận, 1.5 phút, 205 từ, Bạn A
- LỜI NÓI:
Để đưa nội dung đến tay du khách, cách làm cũ là bắt khách tải ứng dụng từ cửa hàng trực tuyến hoặc xếp hàng thuê máy cầm tay tại cổng. [CHỈ VÀO: hai cột App Truyền Thống và Thuê Máy Audio] Cả hai cách này đều tạo ra rào cản quá lớn: khách tham quan chỉ ghé thăm một lần sẽ rất ngại cài đặt thêm phần mềm rác vào máy, còn thuê máy thì ban quản lý đối mặt với chi phí hỏng hóc và mất mát thiết bị. Nhóm chọn giải pháp ứng dụng web tải gói dữ liệu độc lập, gọi là gói bundle. [CHỈ VÀO: cột Web-Bundle được đóng khung vàng] Khách chỉ cần quét mã vuông là mở được ngay trên trình duyệt mà không mất một giây cài đặt. Về mạng kết nối, nhóm thiết kế việc tải một gói tài liệu chứa toàn bộ bài viết, tọa độ và lộ trình của đúng ngôn ngữ đã chọn một lần duy nhất. [CHỈ VÀO: khung cam Chiến lược Content Bundle bên dưới] Nhờ đó, việc dò tìm điểm gần nhất và vẽ bản đồ diễn ra ngay tại trình duyệt với độ trễ bằng không, không cần gọi máy chủ liên tục. [NHẤN MẠNH] Tuy nhiên, em xin nói rõ sự thật kỹ thuật: hệ thống chưa phải hoạt động ngoại tuyến hoàn toàn, vì tệp âm thanh, hình ảnh, đổi ngôn ngữ và hỏi đáp trợ lý vẫn cần có mạng internet để tải về. Toàn bộ cơ chế gói dữ liệu này đã hoàn thành thiết kế, chưa lập trình mã nguồn. Sau đây là hành trình cụ thể của khách từ lúc quét mã.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Gói dữ liệu bundle có chứa luôn các tệp âm thanh để nghe khi mất mạng không?
Dạ thưa Thầy, gói bundle chỉ chứa văn bản, tọa độ và đường dẫn tệp âm thanh; các tệp âm thanh được tải theo luồng mạng khi phát nên nếu mất mạng hoàn toàn thì khách không nghe được âm thanh mới.
2. Giảng viên hỏi: Khách đổi sang ngôn ngữ khác thì hệ thống xử lý thế nào?
Dạ thưa Thầy, khi đổi ngôn ngữ, trình duyệt sẽ gửi yêu cầu tải gói bundle của ngôn ngữ mới; đây là một ngoại lệ cần kết nối mạng đã được nhóm nêu rõ trong hồ sơ phân tích.
- CẢNH BÁO: [SỬA LỜI NÓI: Chữ trên slide ghi triệt tiêu độ trễ mạng trong suốt lộ trình và dễ gây hiểu nhầm là không cần mạng. Người nói phải nhấn mạnh tệp âm thanh và chatbot vẫn cần kết nối mạng.]

---

### Slide 4: Hành Trình Trải Nghiệm Khép Kín, 1.5 phút, 210 từ, Bạn A
- LỜI NÓI:
Một người đi du lịch không muốn phải điền biểu mẫu đăng ký tài khoản dài dòng chỉ để mua một chiếc vé tham quan. [CHỈ VÀO: Bước 1, Quét QR & Khởi tạo] Vì vậy, ngay khi khách quét mã tại cổng, hệ thống tự động sinh một mã định danh phiên ẩn, khách vào thẳng giao diện mà không cần tạo tài khoản. Đến bước trả tiền, khách có thể quét mã thanh toán trực tuyến hoặc đưa tiền mặt cho nhân viên quầy vé. [CHỈ VÀO: Bước 2, Thanh toán Nhanh] Nếu thanh toán trực tuyến, cổng thanh toán sẽ nhắn một bức thư xác nhận tự động, chuyên môn gọi là webhook, báo cho máy chủ biết giao dịch đã thành công kèm chữ ký số. Nếu trả tiền mặt, nhân viên bấm xác nhận trên màn hình nội bộ, máy chủ sinh một mã ngắn sáu ký tự lưu trong bộ nhớ đệm Redis với thời gian sống ngắn. Khách nhập mã này để đổi lấy giấy thông hành điện tử, gọi là token phiên vé. [CHỈ VÀO: Bước 3, Cấp Token An Toàn] Token này có hiệu lực đúng 24 giờ, lưu tại bộ nhớ trình duyệt để chứng minh quyền sử dụng ở mọi yêu cầu sau đó. [CHỈ VÀO: Bước 4, Tải Content Bundle] Có token rồi, trình duyệt mới tải gói dữ liệu ngôn ngữ mẹ đẻ về máy để sẵn sàng định vị. [NGHỈ] Em xin khẳng định: toàn bộ 4 bước trải nghiệm của khách hiện mới dừng ở bản vẽ thiết kế, chưa có mã nguồn chạy thực tế; cổng thanh toán trực tuyến cũng mới là giải pháp mô phỏng. Tiếp theo, bạn Lê Đức Anh sẽ trình bày thuật toán định vị thông minh khi khách bước vào sân chùa.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Nếu khách làm mất token hoặc vô tình xóa trình duyệt thì xử lý thế nào?
Dạ thưa Thầy, việc hỗ trợ nhân viên cấp lại token cho phiên đã thanh toán là chức năng mở rộng nhóm đề xuất cho giai đoạn sau; hiện tại quy tắc là khi mất token, khách phải liên hệ nhân viên đối chiếu mã thanh toán để được hỗ trợ thủ công.
2. Giảng viên hỏi: Vì sao phải dùng Redis để lưu mã ngắn thanh toán tiền mặt?
Dạ thưa Thầy, Redis là bộ nhớ tra cứu cực nhanh và có tính năng tự động xóa dữ liệu khi hết thời gian quy định, rất thích hợp để lưu các mã hẹn ngắn hạn mà không làm rác cơ sở dữ liệu chính; phân hệ này nhóm đã thiết kế xong nhưng chưa code.
- CẢNH BÁO: [SỬA LỜI NÓI: Slide ghi Offline-first sẵn sàng cho định vị nội bộ, người nói phải đính chính là thuật toán chạy tại client nhưng phân hệ này chưa được lập trình.]

---

### Slide 5: Nhận Thức Không Gian: Giải Mã Thuật Toán GPS, 1.5 phút, 200 từ, Bạn B
- LỜI NÓI:
Thách thức lớn nhất khi tự động phát thuyết minh ngoài trời là làm sao để điện thoại không phát âm thanh liên tục như gửi tin nhắn rác vào tai người nghe. [CHỈ VÀO: vòng tròn xanh đậm 50m bên trái] Giải pháp của nhóm là thiết lập bán kính kích hoạt 50 mét xung quanh mỗi điểm di tích. Trình duyệt liên tục nhận tọa độ vệ tinh và tự tính khoảng cách đường thẳng theo công thức Haversine ngay trên máy khách, hoàn toàn không gửi tọa độ về máy chủ. [CHỈ VÀO: mục 01 bên phải] Khi khách bước qua ranh giới 50 mét, nếu có hai điểm cùng nằm trong vùng thì thuật toán phân giải xung đột sẽ chọn điểm có khoảng cách gần nhất. [CHỈ VÀO: mục 02] Điểm cốt lõi chống làm phiền nằm ở vòng tròn màu vàng bên ngoài: ngưỡng đặt lại 75 mét, tương đương 1.5 lần bán kính kích hoạt. [CHỈ VÀO: vòng tròn nét đứt 75m và đường di chuyển] Khi một bài thuyết minh đã phát xong, dù khách có đứng nói chuyện hay đi quanh quẩn trong vùng 50 mét, hệ thống cũng tuyệt đối không phát lại. Điểm đó chỉ được phép phát lại khi khách đã đi hẳn ra ngoài vòng 75 mét rồi mới quay trở lại. [NGHỈ] Thuật toán thông minh này đã được nhóm chứng minh toán học và đặc tả thành sơ đồ hoạt động trong báo cáo, nhưng hiện tại vẫn ở trạng thái đã thiết kế, chưa lập trình mã nguồn. Bên cạnh thuyết minh tự động, khách còn có thể trò chuyện với trợ lý thông minh như thế nào, em xin chuyển sang slide tiếp theo.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Nếu du khách đứng ở nơi sóng GPS bị trôi dạt thì thuật toán có phát nhầm không?
Dạ thưa Thầy, hiện tượng trôi dạt GPS là rủi ro phần cứng thực tế; thiết kế của nhóm quy định âm thanh chỉ kích hoạt khi bài trước đã phát xong và cờ trạng thái chỉ được đặt lại khi vượt ngưỡng 75 mét để giảm thiểu tối đa hiện tượng nhảy cóc âm thanh.
2. Giảng viên hỏi: Thuật toán tính khoảng cách Haversine chạy trên máy khách có làm hao pin điện thoại không?
Dạ thưa Thầy, vì danh mục điểm tham quan tại chùa chỉ khoảng 6 đến 10 điểm nên phép tính đại số trên trình duyệt tốn rất ít tài nguyên vi xử lý so với việc gửi yêu cầu qua sóng di động về máy chủ.
- CẢNH BÁO: Không nói là nhóm đã đi đo đạc thực tế tại Chùa Linh Ứng; toàn bộ số liệu 50m và 75m là thông số cấu hình đề xuất trong hồ sơ phân tích.

---

### Slide 6: Trợ Lý Trí Tuệ Nhân Tạo: Hỏi Đáp Có Căn Cứ, 1.0 phút, 140 từ, Bạn B
- LỜI NÓI:
Khi du khách hỏi về ý nghĩa của pho tượng trước mặt, nếu dùng một mô hình trí tuệ nhân tạo thông thường, nó có thể tự bịa ra những câu chuyện truyền thuyết không có thật. [CHỈ VÀO: khối User Query trên cùng] Nhóm giải quyết vấn đề này bằng kiến trúc hỏi đáp có căn cứ. Quy trình diễn ra qua 4 bước: Đầu tiên, câu hỏi tự nhiên của khách được kiểm tra tính hợp lệ qua token phiên để chống phá hoại. [CHỈ VÀO: khối Vector Search] Bước hai, thuật toán chuyển câu hỏi thành các dãy số ngữ nghĩa để tìm kiếm đối chiếu với bảng các đoạn tài liệu nội bộ đã được phê duyệt. [CHỈ VÀO: khối Prompt Engineering] Bước ba, hệ thống gom đúng đoạn văn bản trích dẫn ghép cùng câu hỏi gửi đến mô hình ngôn ngữ. [CHỈ VÀO: khối AI Response] Cuối cùng, câu trả lời gửi về bắt buộc phải kèm trích dẫn số hiệu tài liệu nguồn. [CHỈ VÀO: khung xanh dưới đáy] Điểm cốt lõi là cơ chế chống bịa đặt: nếu câu hỏi nằm ngoài tài liệu Chùa Linh Ứng, hệ thống được lập trình để từ chối trả lời thay vì cố đoán. Toàn bộ quy trình này hiện mới dừng ở bản vẽ thiết kế, chưa lập trình và chưa kết nối dịch vụ trí tuệ nhân tạo thật. Tiếp theo là cách nhóm chuẩn bị dữ liệu cho 15 ngôn ngữ.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Nhóm đã thử nghiệm chất lượng câu trả lời với mô hình ngôn ngữ nào chưa?
Dạ thưa Thầy, nhóm chưa đấu nối mô hình ngôn ngữ thật; chất lượng trả lời và độ trễ mới được xác định trong tiêu chí kiểm thử của hồ sơ thiết kế, chưa có số liệu thực nghiệm.
2. Giảng viên hỏi: Làm sao ngăn chặn việc người dùng tiêm câu lệnh độc hại vào câu hỏi để phá hệ thống?
Dạ thưa Thầy, thiết kế quy định lớp Router kiểm tra độ dài chuỗi nhập vào, giới hạn tần suất gọi câu hỏi trên token phiên và câu lệnh hướng dẫn ép mô hình chỉ đọc dữ liệu tham chiếu chứ không thực thi lệnh người dùng.
- CẢNH BÁO: [SỬA LỜI NÓI: Chữ trên slide ghi Zero-Hallucination nghe như đã triệt tiêu hoàn toàn lỗi. Phải nói rõ đây là mục tiêu thiết kế prompt, chưa có kiểm chứng thực tế.]

---

### Slide 7: Tự Động Hóa Đường Ống Nội Dung Đa Ngôn Ngữ, 1.5 phút, 200 từ, Bạn B
- LỜI NÓI:
Nếu ban quản lý phải thuê dịch thuật thủ công từng bài viết rồi đọc ghi âm từng tệp cho 15 thứ tiếng thì chi phí và thời gian sẽ vô cùng tốn kém. [CHỈ VÀO: biểu tượng Input bên trái] Nhóm thiết kế một đường ống tự động hóa: nhân viên chỉ cần viết nội dung giới thiệu bằng tiếng Việt một lần duy nhất. [CHỈ VÀO: biểu tượng Background Worker ở giữa] Ngay khi nhân viên lưu bài, hệ thống kích hoạt một tiến trình ngầm tự động đẩy tác vụ vào hàng đợi. Tiến trình này tuần tự gọi dịch vụ dịch thuật ngữ nghĩa và dịch vụ chuyển văn bản thành giọng nói để sinh ra các tệp âm thanh cho các ngôn ngữ còn lại. [CHỈ VÀO: biểu tượng Storage & Bundle bên phải] Toàn bộ văn bản và tệp âm thanh được đánh số phiên bản, tự động đóng gói vào kho để phân phối cho khách. [NHẤN MẠNH] Điểm hay của thiết kế là cơ chế dự phòng: nếu một ngôn ngữ nào đó bị lỗi tiến trình chưa kịp sinh âm thanh, giao diện sẽ tự động trượt về tiếng Anh, rồi đến tiếng Việt kèm thông báo rõ ràng cho khách đọc chữ. [CHỈ VÀO: khung xanh Dự phòng Fallback bên dưới] Nhóm không dùng việc dự phòng này để ngụy biện cho việc thiếu nội dung. Em xin báo cáo trung thực: toàn bộ đường ống dịch tự động này mới nằm ở hồ sơ thiết kế, chưa có mã nguồn chạy nền và chưa đo lường chất lượng giọng đọc. Sau đây là bức tranh tổng thể về ranh giới an toàn của toàn hệ thống.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Nếu nhân viên sửa nội dung tiếng Việt nhiều lần thì có làm nghẽn tiến trình sinh âm thanh không?
Dạ thưa Thầy, thiết kế sử dụng số phiên bản nội dung kết hợp bộ ba điểm tham quan, ngôn ngữ và phiên bản là duy nhất trong bảng tác vụ; khi có phiên bản mới thì tác vụ cũ bị hủy bỏ để không sinh âm thanh thừa và không ghi đè dữ liệu mới.
2. Giảng viên hỏi: Chi phí gọi dịch vụ dịch và chuyển giọng nói cho 15 ngôn ngữ có tốn kém không?
Dạ thưa Thầy, vì nội dung các điểm di tích văn hóa cố định và ít thay đổi nên quy trình chỉ chạy một lần khi tạo điểm mới hoặc cập nhật nội dung, kết quả được lưu trữ để tái sử dụng lâu dài cho hàng triệu lượt khách.
- CẢNH BÁO: [SỬA LỜI NÓI: Chữ trên slide ghi sinh giọng đọc cho 15+ ngôn ngữ nghe như chức năng đã chạy xong. Phải nói rõ đây là thiết kế mục tiêu.]

---

### Slide 8: Ranh Giới Hệ Thống Khép Kín Và Các Tác Nhân, 1.0 phút, 130 từ, Bạn B
- LỜI NÓI:
Bức tranh kiến trúc an toàn của dự án được thể hiện qua sơ đồ ranh giới khép kín. [CHỈ VÀO: khối vàng Hệ Thống Lõi ở trung tâm] Hệ thống lõi của chúng em nằm ở trung tâm, bao gồm xử lý cấp token, phân phối bản đồ, hỏi đáp và ghi nhật ký kiểm toán. Phía bên trái là khách tham quan, chỉ được tương tác qua token phiên vé tạm thời có hạn 24 giờ. [CHỈ VÀO: khối Khách Tham Quan bên trái] Tuyệt đối không có chuyện tài khoản khách được chạm vào các chức năng quản trị. Phía bên phải là nhân viên và quản trị viên, tương tác qua mã xác thực nội bộ nghiêm ngặt. [CHỈ VÀO: khối Staff/Admin bên phải] Các dịch vụ bên ngoài như cổng thanh toán, trí tuệ nhân tạo và dịch thuật giọng đọc đều được kết nối thông qua các cổng trung gian riêng biệt. [CHỈ VÀO: các khối bên ngoài ở trên và dưới] Nguyên tắc bất di bất dịch là nếu dịch vụ ngoài gặp sự cố, hệ thống lõi vẫn phải đứng vững để phục vụ bản đồ và thuyết minh cơ bản. Sau đây, bạn Dương Gia Phát sẽ trình bày sâu về kỷ luật kiến trúc ba lớp và những dòng mã nguồn thực tế mà nhóm đã lập trình chạy được.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Khách tham quan có thể lợi dụng token phiên để gọi trộm các API của nhân viên không?
Dạ thưa Thầy, hoàn toàn không được vì hệ thống có lớp bảo vệ phân quyền riêng biệt; token của khách chỉ chứa định danh phiên tham quan, còn các API quản trị bắt buộc phải có mã xác thực nội bộ mang quyền nhân viên hoặc quản trị viên.
2. Giảng viên hỏi: Nếu cổng thanh toán trực tuyến bị sập thì khách có dùng được hệ thống không?
Dạ thưa Thầy, hệ thống vẫn hoạt động bình thường qua kênh bán vé tiền mặt tại quầy do nhân viên xác nhận; tính độc lập này đã được nhóm tính toán kỹ trong ranh giới hệ thống.
- CẢNH BÁO: Nhớ chỉ tay rõ ràng vào 4 hướng của sơ đồ để giảng viên thấy được sự phân lập ranh giới dữ liệu.

---

### Slide 9: Kỷ Luật Kiến Trúc: Bóc Tách Back-End 3 Lớp, 1.5 phút, 210 từ, Bạn C
- LỜI NÓI:
Em xin tiếp nối bài báo cáo bằng kỷ luật kiến trúc quan trọng nhất của đồ án: tổ chức mã nguồn máy chủ theo ba lớp tách biệt. [CHỈ VÀO: lớp trên cùng màu xanh đậm, Router] Hãy hình dung hệ thống như một tòa nhà hành chính. Lớp ngoài cùng là Router, đóng vai trò như lễ tân tiếp đón. Lễ tân tiếp nhận yêu cầu mạng, kiểm tra xem khách có mang đúng giấy tờ hợp lệ không, kiểm tra định dạng dữ liệu đầu vào rồi mới chuyển tiếp. Router tuyệt đối không được tự ý quyết định nghiệp vụ và không bao giờ được viết câu lệnh truy vấn cơ sở dữ liệu. [CHỈ VÀO: lớp ở giữa màu trắng, Service] Lớp thứ hai là Service, đóng vai trò chuyên viên nghiệp vụ. Đây là trái tim của hệ thống: kiểm tra hạn dùng của vé, tính toán khoảng cách, điều phối gọi dịch vụ ngoài. Service hoàn toàn độc lập với việc dữ liệu được lưu ở đâu. [CHỈ VÀO: lớp dưới cùng màu vàng đồng, Store] Lớp trong cùng là Store, như người thủ kho. Thủ kho là nơi duy nhất được quyền cầm chìa khóa mở cơ sở dữ liệu MySQL 8 và bộ nhớ đệm Redis 7, đảm nhiệm việc mở các giao dịch dữ liệu an toàn. [NGHỈ] [NHẤN MẠNH] Em xin vui mừng báo cáo: cấu trúc ba lớp này nhóm đã lập trình xong mã nguồn thực tế cho toàn bộ phân hệ xác thực nội bộ. Chúng em đã hiện thực luồng đăng nhập, xoay vòng mã làm mới, khóa tài khoản tạm thời 15 phút khi nhập sai 5 lần liên tiếp và ghi nhật ký kiểm toán không thể xóa sửa. Cơ sở dữ liệu bên dưới được tổ chức như thế nào, em xin chuyển sang slide 10.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Vì sao phải phân tách ba lớp phức tạp như vậy cho một ứng dụng vừa và nhỏ?
Dạ thưa Thầy, việc phân tách ba lớp giúp mã nguồn độc lập tuyệt đối; khi nhóm thay đổi hệ quản trị cơ sở dữ liệu hoặc viết bài kiểm thử giả lập, nhóm chỉ cần sửa lớp Store mà không phải đụng vào logic nghiệp vụ của Service hay giao diện của Router.
2. Giảng viên hỏi: Mã nguồn hiện tại của nhóm đã có những lớp nào chạy thật?
Dạ thưa Thầy, các lớp Router, Service và Store dành cho phân hệ xác thực nội bộ của nhân viên và quản trị viên đã chạy thật 100% trong mã nguồn và vượt qua kiểm thử; còn ba lớp cho phân hệ du khách mới ở mức thiết kế sơ đồ.
- CẢNH BÁO: Nhấn mạnh tính tuân thủ kỷ luật kiến trúc, không nhận vơ là đã viết xong ba lớp cho cả phần khách tham quan.

---

### Slide 10: Toàn Vẹn Dữ Liệu: Chuẩn Hóa 16 Bảng Lưu Trữ, 1.0 phút, 140 từ, Bạn C
- LỜI NÓI:
Trái tim dữ liệu của hệ thống được chuẩn hóa thành 16 bảng, phân chia khoa học vào 3 phân hệ độc lập. [CHỈ VÀO: cột thứ nhất, Tài Khoản & Vé] Phân hệ một gồm 6 bảng quản lý tài khoản nhân viên, mã làm mới, nhật ký kiểm toán, phiên tham quan và giao dịch tiền. [CHỈ VÀO: cột thứ hai, Nội Dung & Tour] Phân hệ hai gồm 7 bảng quản lý danh mục ngôn ngữ, điểm tham quan, bản dịch, tệp âm thanh, tiến trình nền và lộ trình mẫu. [CHỈ VÀO: cột thứ ba, Kho Tri Thức RAG] Phân hệ ba gồm 3 bảng lưu trữ tài liệu gốc, các đoạn văn bản chia nhỏ và lịch sử đối thoại. [CHỈ VÀO: khung Kỷ Luật Giao Dịch bên dưới] Để bảo đảm an toàn dòng tiền, chúng em thiết lập hai kỷ luật sắt: Thứ nhất là tính nguyên tử: việc đổi trạng thái vé tham quan và ghi nhận thanh toán bắt buộc phải chạy trong cùng một giao dịch cơ sở dữ liệu; nếu một thao tác lỗi thì toàn bộ bị hủy bỏ ngay, tuyệt đối không có chuyện thu tiền mà không cấp vé. Thứ hai là quy tắc cấm xóa dữ liệu giao dịch để phục vụ đối soát kế toán. [NGHỈ] Về hiện trạng: 3 bảng tài khoản nội bộ đã có bảng thật trong cơ sở dữ liệu; 13 bảng còn lại về nghiệp vụ tham quan đã hoàn thiện thiết kế lược đồ chi tiết và sẵn sàng chạy lệnh tạo bảng ở giai đoạn tiếp theo.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Làm sao bảo đảm webhook của cổng thanh toán gửi lặp lại không làm tăng gấp đôi doanh thu?
Dạ thưa Thầy, hệ thống kiểm tra mã giao dịch duy nhất trong bảng thanh toán và mở giao dịch nguyên tử; nếu phát hiện mã giao dịch đã ở trạng thái đã thanh toán thì hệ thống lập tức từ chối và giữ nguyên hạn vé ban đầu.
2. Giảng viên hỏi: Tại sao lại áp dụng quy tắc chặn xóa dữ liệu ở bảng thanh toán?
Dạ thưa Thầy, đây là nguyên tắc bất biến của hệ thống tài chính kế toán; dữ liệu thanh toán phải được lưu trữ vĩnh viễn để phục vụ thanh tra và đối chiếu công nợ, chỉ được phép thay đổi trạng thái chứ không được xóa dòng dữ liệu.
- CẢNH BÁO: Báo cáo đúng sự thật: mới có 3 bảng nội bộ có trong mã nguồn thực tế, 13 bảng nghiệp vụ khách đang ở dạng thiết kế lược đồ.

---

### Slide 11: Tự Động Hóa Triển Khai, 1.0 phút, 140 từ, Bạn C
- LỜI NÓI:
Để bảo đảm mã nguồn không bị lỗi khi nhiều người cùng lập trình, nhóm xây dựng dây chuyền tự động hóa kiểm tra và đóng gói trên GitHub Actions. [CHỈ VÀO: bước 1, Push & PR] Mỗi khi một thành viên đẩy mã nguồn mới lên hệ thống, dây chuyền lập tức tự động kích hoạt. [CHỈ VÀO: bước 2, Lint & Test] Bước hai là kiểm tra cú pháp và chạy tự động toàn bộ 51 bài kiểm thử đơn vị và tích hợp. Nếu có bất kỳ bài kiểm tra nào thất bại, hệ thống lập tức chặn lại không cho nhập mã nguồn. [CHỈ VÀO: bước 3, Docker Build] Bước ba, hệ thống tự động đóng gói ứng dụng thành một khối hoàn chỉnh bằng công nghệ Docker, bảo đảm phần mềm chạy trên máy cá nhân hay máy chủ đều đồng nhất. [CHỈ VÀO: bước 4, Deploy & Check] [NHẤN MẠNH] Ở bước bốn, trên slide có ghi quy trình tự động cập nhật cơ sở dữ liệu và kiểm tra sức khỏe trước khi chuyển lưu lượng. Em xin đính chính trung thực: đây là quy trình thiết kế mục tiêu; thực tế trên GitHub Actions của nhóm hiện tại đã chạy xanh 6 công việc kiểm thử và đóng gói bản phát hành thử nghiệm, nhóm chưa có máy chủ trực tuyến riêng để triển khai thực tế. Tiếp theo là slide quan trọng nhất: nhìn nhận thẳng thắn về hiện trạng đồ án.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: 51 bài kiểm thử đã chạy những trường hợp nào?
Dạ thưa Thầy, 51 bài kiểm thử tập trung kiểm tra toàn bộ luồng đăng nhập, xoay vòng mã làm mới, chặn tài khoản bị khóa, phân quyền nhân viên và kiểm tra tính toàn vẹn của cấu trúc ba lớp cho phân hệ nội bộ.
2. Giảng viên hỏi: Nhóm đã triển khai hệ thống lên máy chủ đám mây thực tế chưa?
Dạ thưa Thầy, nhóm xin nói thật là chưa triển khai lên môi trường máy chủ trực tuyến riêng; hiện tại nhóm mới kiểm chứng quy trình đóng gói container Docker tự động thành công trên máy chủ kiểm thử của GitHub Actions.
- CẢNH BÁO: [SỬA LỜI NÓI: Bước 4 trên slide ghi Deploy & Check rất dễ làm giảng viên tưởng đã có môi trường trực tuyến. Phải đính chính rõ là mới dừng ở kiểm thử và đóng gói tự động.]

---

### Slide 12: Hiện Trạng Triển Khai & Lộ Trình Nước Rút, 1.5 phút, 215 từ, Bạn C
- LỜI NÓI:
Đây là slide thể hiện rõ nhất thái độ làm việc trung thực và có trách nhiệm của nhóm. [CHỈ VÀO: cột màu xanh đậm bên trái, Hoàn Thành Chuẩn Chỉnh] Ở cột bên trái là những gì nhóm đã làm xong chuẩn chỉ: Hoàn thành 100% hồ sơ phân tích 18 Use Case và yêu cầu sản phẩm; Thiết kế hoàn chỉnh kiến trúc ba lớp và lược đồ cơ sở dữ liệu 16 bảng; Đã lập trình xong toàn bộ mã nguồn xác thực nội bộ, bảo mật mật khẩu và kiểm tra phân quyền; Thiết lập xong môi trường Docker và dây chuyền tự động chạy đạt 51 bài kiểm thử. [NGHỈ] [CHỈ VÀO: cột màu trắng bên phải, Giai Đoạn Kế Tiếp] Ở cột bên phải là những việc nhóm thẳng thắn thừa nhận chưa hoàn thành và phải làm tiếp: Chạy lệnh tạo 13 bảng cơ sở dữ liệu còn lại; Lập trình mã nguồn cho các dịch vụ vé tham quan, gói dữ liệu và định vị; Xây dựng giao diện web mô phỏng bản đồ Leaflet để trình diễn trong lớp; Đấu nối thử nghiệm dịch vụ hỏi đáp và hoàn thiện bảng điều khiển giám sát. [NHẤN MẠNH] Đặc biệt, trong quá trình tự rà soát mã nguồn, nhóm đã chủ động tìm ra một lỗi bảo mật thực tế: sau khi xoay vòng mã làm mới, việc đăng xuất bằng mã cũ chưa lập tức thu hồi phiên do sự bất đồng bộ giữa hai bộ nhớ. Nhóm không giấu lỗi mà đã ghi nhận thành một vấn đề cần xử lý trong đợt cập nhật tới. Em xin chuyển sang lời kết của bài báo cáo.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Tại sao nhóm lại tự tìm ra lỗi đăng xuất mà chưa sửa ngay?
Dạ thưa Thầy, khi viết bài kiểm thử nâng cao với các thành phần thực tế, nhóm phát hiện điểm bất đồng bộ bộ nhớ giữa nơi đổi mã và nơi hủy phiên; việc giữ lại lỗi này trong báo cáo thể hiện sự nghiêm túc trong kiểm thử và nhóm đã có phương án giải quyết dứt điểm.
2. Giảng viên hỏi: Khối lượng công việc còn lại ở cột bên phải có kịp hoàn thành cho buổi báo cáo cuối kỳ không?
Dạ thưa Thầy, vì toàn bộ phần khó nhất về phân tích nghiệp vụ, mô hình dữ liệu và khung kiến trúc ba lớp đã chuẩn hóa xong nên ở giai đoạn tới nhóm chỉ việc tập trung viết mã nguồn theo đúng thiết kế, nhóm cam kết hoàn thành đúng tiến độ.
- CẢNH BÁO: Đây là slide ăn điểm về tính trung thực học thuật, nói rõ ràng, tự tin, không lúng túng khi thừa nhận phần chưa làm.

---

### Slide 13: Tầm Nhìn Kỹ Thuật Giao Thoa Di Sản, 0.5 phút, 75 từ, Bạn C
- LỜI NÓI:
Nhìn lại toàn bộ đề tài, nhóm không chỉ đặt mục tiêu làm một trang web bình thường, mà mong muốn xây dựng một hệ thống vận hành bền vững bằng kỷ luật kỹ thuật phần mềm vững chắc. [CHỈ VÀO: ba vòng tròn liên kết xung quanh Hệ Sinh Thái Chùa Linh Ứng] Ba trụ cột chính gồm: trải nghiệm khách hàng tiện lợi, nghiệp vụ tự động hóa và kiến trúc máy chủ ba lớp tin cậy. Nhóm đã có một nền tảng kỹ thuật được kiểm chứng và một lộ trình thực hiện rõ ràng. [CHỈ VÀO: câu trích dẫn bên dưới] Nhóm sinh viên chúng em xin chân thành cảm ơn Thầy Nguyễn Quốc Huy và các bạn đã lắng nghe. Chúng em rất mong nhận được những câu hỏi và lời chỉ dẫn quý báu từ Thầy.
- NẾU BỊ HỎI:
1. Giảng viên hỏi: Đồ án này có khả năng triển khai thực tế tại Chùa Linh Ứng không?
Dạ thưa Thầy, sau khi hoàn thiện đầy đủ các phân hệ theo thiết kế và được thử nghiệm ổn định, giải pháp hoàn toàn có thể ứng dụng thực tế nhờ chi phí đầu tư thiết bị bằng không và khả năng phục vụ không giới hạn du khách.
2. Giảng viên hỏi: Bài học lớn nhất nhóm rút ra được qua giai đoạn một là gì?
Dạ thưa Thầy, bài học lớn nhất là nếu không có một hồ sơ phân tích yêu cầu tỉ mỉ và thiết kế kiến trúc ba lớp chặt chẽ ngay từ đầu thì việc viết mã nguồn sẽ rất dễ bị rối loạn và không kiểm soát được lỗi phát sinh.
- CẢNH BÁO: Kết thúc dứt khoát, chào Thầy và hội đồng lễ phép, sẵn sàng chuyển sang phần trả lời câu hỏi.

---

## PHẦN THÊM SAU 13 SLIDE

### 1. Bản rút gọn 8 phút (Khi thời gian bị cắt ngắn)
Nếu giảng viên yêu cầu báo cáo nhanh trong 8 phút, nhóm thực hiện chiến lược:
- Giữ lại 6 slide cốt lõi: Slide 2 (Vấn đề), Slide 3 (Giải pháp Web-Bundle), Slide 5 (Thuật toán GPS), Slide 9 (Kiến trúc 3 lớp), Slide 11 (Kiểm thử CI) và Slide 12 (Hiện trạng thực tế).
- Lướt nhanh trong 15 giây: Slide 1 (Bìa), Slide 4 (Hành trình), Slide 8 (Ranh giới), Slide 10 (16 bảng) và Slide 13 (Kết luận).
- Tạm bỏ qua phần phân tích sâu: Slide 6 (Chatbot RAG) và Slide 7 (Đường ống dịch) vì hai phần này hoàn toàn chưa có mã nguồn chạy thật.

**Lời nói rút gọn cho 6 slide giữ lại (khoảng 1.050 từ, 8 phút):**
- **Slide 2 (1 phút):** Vấn đề cốt lõi tại Chùa Linh Ứng là du khách thiếu ngôn ngữ bản địa, bị gián đoạn do phải tra cứu màn hình thủ công và thiếu nguồn giải đáp văn hóa xác thực.
- **Slide 3 (1.5 phút):** Thay vì bắt khách tải ứng dụng hay thuê máy móc tốn kém, nhóm chọn giải pháp web tải một gói dữ liệu bundle độc lập. Toàn bộ bài viết và tọa độ được nạp về trình duyệt một lần để tính toán không độ trễ, dù tệp âm thanh vẫn cần mạng để tải về.
- **Slide 5 (1.5 phút):** Điểm nhấn kỹ thuật định vị là thuật toán Haversine chạy trên máy khách với bán kính kích hoạt 50 mét và cơ chế chống phát lặp bằng ngưỡng rời vùng 75 mét. Khách phải đi ra xa 1.5 lần bán kính rồi quay lại mới phát lượt mới.
- **Slide 9 (1.5 phút):** Máy chủ tuân thủ nghiêm ngặt ba lớp: Router chỉ nhận yêu cầu và kiểm tra dữ liệu; Service xử lý toàn bộ quy tắc nghiệp vụ; Store chịu trách nhiệm truy vấn cơ sở dữ liệu và mở giao dịch. Nhóm đã lập trình xong mã nguồn cho phân hệ xác thực nội bộ.
- **Slide 11 (1 phút):** Dây chuyền GitHub Actions tự động kiểm tra cú pháp, chạy 51 bài kiểm thử tự động đạt 100% và đóng gói ứng dụng bằng Docker container.
- **Slide 12 (1.5 phút):** Hiện trạng trung thực: nhóm đã hoàn thành toàn bộ hồ sơ thiết kế, chạy thành công mã nguồn xác thực nội bộ và hệ thống kiểm thử tự động. Toàn bộ phân hệ vé du khách, định vị và trí tuệ nhân tạo là phần nhóm cam kết thực hiện ở giai đoạn tiếp theo.

---

### 2. Phân bổ nhịp độ nói: Slide nói chậm và Slide lướt nhanh
- **Nói chậm, nhấn giọng rõ từng chữ:**
  * Slide 5 (Thuật toán GPS): Cần giải thích cặn kẽ vì sao có số 50m và 75m, chỉ tay vào đường di chuyển để thầy thấy tư duy giải thuật.
  * Slide 9 (Kiến trúc 3 lớp): Đây là nội dung cốt lõi của môn học, phải nói chậm để khẳng định nhóm hiểu sâu về việc phân tách trách nhiệm giữa Router, Service và Store.
  * Slide 12 (Hiện trạng): Phải nói chậm rãi, chân thành khi phân định giữa phần đã có code chạy và phần mới thiết kế, nhấn mạnh việc nhóm tự tìm ra lỗi đăng xuất.
- **Nói nhanh, lướt dứt khoát:**
  * Slide 1 (Trang bìa): Đi thẳng vào vấn đề trong 30 giây, không đọc chức danh rườm rà.
  * Slide 8 (Ranh giới): Chỉ cần chỉ 4 hướng để khẳng định hệ thống lõi được bảo vệ độc lập, không kể lể chi tiết.
  * Slide 13 (Tầm nhìn kết luận): Nói súc tích câu đúc kết và chuyển ngay sang phần mời thầy chấm điểm, đặt câu hỏi.

---

### 3. Điểm yếu thật của dự án và cách trả lời giảng viên
Nếu giảng viên hỏi xoáy vào điểm yếu của dự án, người nói giữ bình tĩnh và trả lời theo mẫu sau:
"Dạ thưa Thầy, nhóm xin nhìn nhận thẳng thắn ba điểm hạn chế lớn nhất của dự án tại mốc báo cáo giữa kỳ:
Thứ nhất, về mã nguồn, nhóm mới tập trung hoàn thiện nền tảng xác thực nội bộ và kiến trúc ba lớp; toàn bộ phân hệ phục vụ du khách như thanh toán, định vị GPS, gói dữ liệu và chatbot RAG hiện mới nằm ở hồ sơ phân tích thiết kế, chưa có dòng mã nguồn nào chạy thực tế.
Thứ hai, nhóm tự phát hiện một lỗi kiểm thử bất đồng bộ trong cơ chế xoay vòng token: việc đăng xuất bằng mã cũ chưa lập tức thu hồi phiên do sự phân tách bộ nhớ độc lập giữa hai kho lưu trữ.
Thứ ba, một số giả định về việc hỗ trợ đúng 15 ngôn ngữ hay việc xem gói bundle như một giải pháp ngoại tuyến vẫn cần sự phê duyệt chính thức từ Thầy. Nhóm xem việc phát hiện sớm các hạn chế này là cơ sở quan trọng để triển khai mã nguồn an toàn và đúng hướng trong giai đoạn tiếp theo."

---

### 4. 10 con số và 10 thuật ngữ cần nhớ

**10 con số quan trọng:**
1. **3 lớp:** Kiến trúc Router, Service và Store đã có mã nguồn chạy thực tế cho phân hệ nội bộ.
2. **2 vai trò nội bộ:** Nhân viên và Quản trị viên đã có mã nguồn chạy thực tế; khách tham quan không phải vai trò đăng nhập thứ ba.
3. **5 lần sai trong 15 phút:** Cơ chế tự động khóa tài khoản nội bộ chống tấn công dò mật khẩu đã có mã nguồn chạy thực tế.
4. **24 giờ:** Thời hạn hiệu lực của vé tham quan tính từ lúc xác nhận thanh toán, đây là giả định thiết kế cần Thầy duyệt.
5. **50 mét:** Bán kính kích hoạt âm thanh mặc định xung quanh mỗi điểm di tích trong hồ sơ thiết kế.
6. **75 mét:** Ngưỡng rời vùng bằng 1.5 lần bán kính để xóa cờ chống phát lặp trong hồ sơ thiết kế.
7. **15 ngôn ngữ:** Đề xuất số lượng ngôn ngữ cụ thể của nhóm; yêu cầu gốc ghi 15 ngôn ngữ trở lên nên chưa chốt chính thức.
8. **16 bảng cơ sở dữ liệu:** Tổng số bảng chuẩn hóa trong thiết kế; trong đó 3 bảng nội bộ đã có, 13 bảng tham quan chưa chạy lệnh tạo bảng.
9. **51 bài kiểm thử đạt:** Số lượng bài kiểm thử đơn vị và tích hợp cục bộ đã chạy đạt trên máy tính.
10. **6 công việc CI thành công:** Số lượng công việc tự động kiểm tra và đóng gói chạy thành công trên GitHub Actions.

**10 thuật ngữ kỹ thuật và ví dụ đời thường:**
1. **Token:** Giấy thông hành điện tử tạm thời, cấp cho du khách dùng trong 24 giờ không cần đăng ký tài khoản.
2. **Webhook:** Tin nhắn xác nhận tự động từ cổng thanh toán gửi thẳng về máy chủ để chứng minh khách đã trả tiền.
3. **Shorted code:** Mã ngắn 6 ký tự như một chiếc phiếu hẹn có hạn dùng ngắn, lưu trên bộ nhớ đệm để khách đổi lấy vé tại quầy.
4. **Redis:** Ngăn kéo chứa phiếu hẹn tra cứu siêu nhanh và tự động hủy khi hết hạn.
5. **Content Bundle:** Gói tài liệu số hóa đóng gói toàn bộ bài viết và tọa độ nạp về điện thoại một lần duy nhất.
6. **Công thức Haversine:** Phép toán đo khoảng cách đường thẳng giữa hai điểm tọa độ trên bề mặt quả địa cầu.
7. **RAG:** Cơ chế trợ lý thông minh như người thủ thư tra cứu đúng trang sách tài liệu rồi mới trả lời câu hỏi kèm trích dẫn nguồn.
8. **Cơ chế Fallback:** Lưới dự phòng tự động chuyển về ngôn ngữ phụ như tiếng Anh hoặc tiếng Việt khi ngôn ngữ chính bị thiếu.
9. **Giao dịch nguyên tử:** Nguyên tắc gắn kết hai hành động thu tiền và cấp vé thành một thể thống nhất, một bên hỏng thì cả hai cùng hủy.
10. **Container Docker:** Chiếc thùng hàng đóng gói sẵn phần mềm kèm toàn bộ môi trường để mang sang máy tính nào cũng chạy y hệt nhau.

---

### 5. Bài tập luyện: 3 mẹo để đọc trơn và không vấp
1. **Đọc theo cụm nghĩa, không đọc từng chữ đơn lẻ:** Chia câu dài thành các vế từ 5 đến 7 từ, ngừng nhẹ ở các chỗ có dấu phẩy để lấy hơi.
2. **Thuộc lòng từ khóa mở đầu của từng slide:** Khi bấm chuyển slide, chỉ cần nhớ đúng câu dẫn đầu tiên là mạch nói tự động tuôn ra mà không cần nhìn chằm chằm vào màn hình.
3. **Luôn chuẩn bị sẵn tư thế chỉ tay vào slide:** Mắt nhìn lướt vào điện thoại, miệng nói câu tóm tắt, tay chỉ dứt khoát vào khối hình trên màn chiếu để tạo phong thái tự tin và làm chủ nội dung trước hội đồng.
