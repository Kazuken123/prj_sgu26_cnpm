# Kế hoạch thực thi vẽ sơ đồ DFD mức 0, 1, 2, 3 và viết nội dung báo cáo cho Gemini 3.8 Flash

## 1. Mục tiêu và phạm vi thực thi

Tài liệu này quy định chi tiết toàn bộ danh sách tác nhân, kho dữ liệu, tiến trình, luồng dữ liệu, quy chuẩn tọa độ XML trên draw.io và nội dung thuyết minh báo cáo để mô hình Gemini 3.8 Flash thực thi tuần tự.

### Danh sách đầu việc cho Gemini 3.8 Flash

- [x] **Bước 1:** Tạo thư mục `docs/diagram/dfd/` và kiểm tra các tệp mẫu có sẵn tại `docs/diagram/component_diagram.drawio`, `docs/diagram/erd_diagram.drawio`.
- [x] **Bước 2:** Tạo tệp `docs/diagram/dfd/DFD_Level_0_Context.drawio` biểu diễn sơ đồ DFD mức 0 ngữ cảnh hệ thống.
- [x] **Bước 3:** Tạo tệp `docs/diagram/dfd/DFD_Level_1_System.drawio` biểu diễn sơ đồ DFD mức 1 phân rã hệ thống thành 5 tiến trình chính và 6 kho dữ liệu.
- [x] **Bước 4:** Tạo tệp `docs/diagram/dfd/DFD_Level_2_P1_Payment_Session.drawio` phân rã tiến trình `1.0 Quản lý thanh toán và phiên tham quan`.
- [x] **Bước 5:** Tạo tệp `docs/diagram/dfd/DFD_Level_2_P2_Visitor_Content_Audio.drawio` phân rã tiến trình `2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh`.
- [x] **Bước 6:** Tạo tệp `docs/diagram/dfd/DFD_Level_2_P3_Chatbot_RAG.drawio` phân rã tiến trình `3.0 Xử lý hỏi đáp thông minh RAG`.
- [x] **Bước 7:** Tạo tệp `docs/diagram/dfd/DFD_Level_2_P4_Content_Knowledge_Admin.drawio` phân rã tiến trình `4.0 Quản trị nội dung, lộ trình và kho kiến thức`.
- [x] **Bước 8:** Tạo tệp `docs/diagram/dfd/DFD_Level_2_P5_Auth_Admin_Monitoring.drawio` phân rã tiến trình `5.0 Quản trị tài khoản nội bộ và giám sát hệ thống`.
- [x] **Bước 9:** Tạo tệp `docs/diagram/dfd/DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio` phân rã chi tiết tiến trình `4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh`.
- [x] **Bước 10:** Tạo tệp `docs/diagram/dfd/DFD_Level_3_P3_4_RAG_Answer_Generation.drawio` phân rã chi tiết tiến trình `3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký`.
- [x] **Bước 11:** Kiểm tra tự động toàn bộ 9 tệp `.drawio` bằng kịch bản kiểm tra cú pháp XML, kiểm tra trùng ID, kiểm tra cân bằng luồng dữ liệu giữa các mức và kiểm tra không có đường nối cắt ngang khối.
- [x] **Bước 12:** Tạo tệp `docs/DFD_Report_Section_3_4.md` chứa nguyên văn nội dung mục `3.4. Sơ đồ luồng dữ liệu DFD` từ `3.4.1` đến `3.4.4` và ghi nội dung này vào báo cáo Google Doc ngay sau mục `3.3.18` và `Hình 3.37`.

---

## 2. Vị trí chèn trong báo cáo Google Doc

Trong tài liệu báo cáo hiện tại:
- `Chương 3: Phân tích hệ thống` gồm `3.1. Tác nhân và ranh giới hệ thống`, `3.2. Sơ đồ Use Case tổng quát`, `3.3. Phân tích các chức năng` từ `3.3.1` đến `3.3.18`, kết thúc tại `Hình 3.37: Sơ đồ hoạt động UC-18: Xem thông tin vận hành và giám sát`.
- Toàn bộ nội dung DFD được thêm mới vào **Mục 3.4. Sơ đồ luồng dữ liệu DFD** nằm ngay sau `Hình 3.37` và ngay trước `Chương 4: Thiết kế hệ thống`.
- Đánh số hình liên tiếp từ `Hình 3.38` đến `Hình 3.46`:
  - `Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống`
  - `Hình 3.39: Sơ đồ DFD mức 1 phân rã hệ thống`
  - `Hình 3.40: Sơ đồ DFD mức 2 tiến trình 1.0 Quản lý thanh toán và phiên tham quan`
  - `Hình 3.41: Sơ đồ DFD mức 2 tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh`
  - `Hình 3.42: Sơ đồ DFD mức 2 tiến trình 3.0 Xử lý hỏi đáp thông minh RAG`
  - `Hình 3.43: Sơ đồ DFD mức 2 tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức`
  - `Hình 3.44: Sơ đồ DFD mức 2 tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống`
  - `Hình 3.45: Sơ đồ DFD mức 3 tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh`
  - `Hình 3.46: Sơ đồ DFD mức 3 tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký`

---

## 3. Quy tắc bắt buộc về văn phong và ký hiệu

Khi sinh nhãn trên sơ đồ `.drawio` và khi viết văn bản báo cáo trong mục `3.4`, Gemini 3.8 Flash phải tuân thủ nghiêm ngặt:

1. **Không dùng dấu ngoặc đơn** để chèn thuật ngữ tiếng Anh, chú thích phụ hay giải thích kiểu AI trong câu văn và tên cột bảng.
2. **Không dùng dấu ba chấm** để viết tắt danh sách bảng, danh sách trường dữ liệu hay công thức; phải liệt kê đầy đủ từng tên.
3. **Văn phong sinh viên làm đồ án thực tế**: câu chữ ngắn gọn, trực tiếp mô tả đầu vào từ đâu, tiến trình xử lý gì, đọc ghi kho dữ liệu nào và trả đầu ra cho ai. Tuyệt đối không dùng các từ sáo rỗng như rõ rệt, toàn diện, minh bạch, không thể phủ nhận, đáng chú ý, tóm lại.
4. **Quy tắc chuẩn phương pháp luận DFD Gane & Sarson / Yourdon**:
   - **Tác nhân ngoài**: Danh từ chỉ người hoặc hệ thống ngoài ranh giới, giữ nguyên tên gọi ở mục `3.1.1` của báo cáo.
   - **Tiến trình**: Bắt buộc có `Số hiệu + Động từ hành động + Danh từ bổ ngữ`. Mọi tiến trình phải có ít nhất 1 luồng dữ liệu đi vào và ít nhất 1 luồng dữ liệu đi ra.
   - **Kho dữ liệu**: Chỉ xuất hiện từ DFD mức 1 trở xuống, tuyệt đối không xuất hiện ở DFD mức 0. Đặt tên theo mẫu `D1`, `D2`, `D3`, `D4`, `D5`, `D6` kèm danh từ chỉ tập dữ liệu lưu trữ.
   - **Luồng dữ liệu**: Đặt tên bằng cụm danh từ mô tả gói thông tin truyền tải, không đặt tên bằng động từ hành động hay nhánh điều kiện đúng sai.
   - **Các kết nối bị cấm trong DFD**:
     - Không nối trực tiếp từ Tác nhân ngoài sang Tác nhân ngoài.
     - Không nối trực tiếp từ Tác nhân ngoài vào Kho dữ liệu hoặc từ Kho dữ liệu ra Tác nhân ngoài.
     - Không nối trực tiếp từ Kho dữ liệu sang Kho dữ liệu.
   - **Luật bảo toàn và cân bằng luồng dữ liệu**:
     - Tổng các luồng đi vào và đi ra giữa các Tác nhân ngoài với Tiến trình `0` ở DFD mức 0 phải khớp hoàn toàn với tổng các luồng đi vào và đi ra giữa các Tác nhân ngoài với các tiến trình `1.0`, `2.0`, `3.0`, `4.0`, `5.0` ở DFD mức 1.
     - Các luồng đi vào và đi ra của mỗi tiến trình cha `X.0` ở DFD mức 1 phải khớp với các luồng biên nối tới Tác nhân ngoài, Kho dữ liệu và Tiến trình khác ở sơ đồ DFD mức 2 phân rã tiến trình `X.0`.
     - Các luồng đi vào và đi ra của tiến trình `X.Y` ở DFD mức 2 phải khớp với các luồng biên ở sơ đồ DFD mức 3 phân rã tiến trình `X.Y`.

---

## 4. Quy chuẩn kỹ thuật vẽ file `.drawio` bằng XML `mxGraphModel`

Mọi tệp `.drawio` trong `docs/diagram/dfd/` phải sử dụng định dạng XML chuẩn của draw.io và đồng bộ bảng màu đen trắng trung tính với `docs/diagram/component_diagram.drawio` và `docs/diagram/erd_diagram.drawio`.

### 4.1. Khung cấu trúc tệp XML chuẩn

```xml
<mxfile host="app.diagrams.net" agent="Antigravity" version="24.7.17">
  <diagram id="dfd_level_x" name="DFD_Level_X">
    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Các phần tử mxCell đặt tại đây -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### 4.2. Định nghĩa kiểu dáng hình học chuẩn cho 4 phần tử DFD

1. **Tác nhân ngoài — Hình chữ nhật vuông góc viền đậm:**
   - Style: `rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#111827;`
   - Kích thước chuẩn: `width="170" height="60"`

2. **Tiến trình xử lý — Hình chữ nhật bo tròn có ngăn tiêu đề số hiệu hoặc phân dòng rõ ràng:**
   - Style: `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#374151;strokeWidth=1.8;fontFamily=Arial;fontSize=12;fontColor=#111827;`
   - Nội dung nhãn `value`: `<b>1.0</b><br/>Quản lý thanh toán và phiên tham quan`
   - Kích thước chuẩn: `width="210" height="80"` (riêng Tiến trình `0` ở DFD mức 0 dùng `width="280" height="110"` và `strokeWidth=2.2`)

3. **Kho dữ liệu — Hình chữ nhật mở cạnh phải theo chuẩn Gane & Sarson:**
   - Style: `shape=partialRectangle;whiteSpace=wrap;html=1;left=1;right=0;top=1;bottom=1;fillColor=#F9FAFB;strokeColor=#374151;strokeWidth=1.8;fontFamily=Arial;fontSize=12;fontColor=#111827;align=left;spacingLeft=12;`
   - Nội dung nhãn `value`: `<b>D1</b> | Tài khoản và Phiên nội bộ`
   - Kích thước chuẩn: `width="230" height="50"`

4. **Luồng dữ liệu — Đường gấp khúc vuông góc có mũi tên đặc và nhãn nền trắng:**
   - Style: `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;fontFamily=Arial;fontSize=11;fontColor=#111827;labelBackgroundColor=#FFFFFF;`
   - Bắt buộc khai báo `exitX`, `exitY`, `exitDx=0`, `exitDy=0`, `entryX`, `entryY`, `entryDx=0`, `entryDy=0` và danh sách `<Array as="points"><mxPoint x="..." y="..."/></Array>` khi nối giữa hai khối không nằm thẳng hàng hoặc khi có hai luồng ngược chiều giữa cùng một cặp khối.
   - Nếu giữa khối A và khối B có cả luồng đi và luồng về, hai cạnh phải tách điểm neo cách nhau tối thiểu `0.25` trên cạnh khối (ví dụ luồng đi dùng `exitY=0.35;entryY=0.35;`, luồng về dùng `exitY=0.65;entryY=0.65;`) để hai đường tên song song cách nhau tối thiểu 24px, không đè chữ lên nhau.

---

## 5. Danh mục chuẩn hóa các phần tử hệ thống

### 5.1. Danh sách 6 Tác nhân ngoài (khớp mục 3.1.1 báo cáo)

| Mã | Tên tác nhân ngoài trên sơ đồ | Vai trò trong mã nguồn và báo cáo |
| :--- | :--- | :--- |
| `E1` | `Khách tham quan` | Người dùng cuối truy cập ứng dụng web di động không cần tạo tài khoản, thanh toán, nhận token phiên, xem bản đồ, nghe thuyết minh, tùy chỉnh lộ trình cục bộ và hỏi chatbot |
| `E2` | `Nhân viên` | Người dùng nội bộ vai trò `STAFF` xác nhận thu tiền mặt, cấp mã ngắn 6 chữ số, tra cứu cấp lại token, quản lý điểm tham quan, bản dịch, lộ trình mẫu và tài liệu kho kiến thức |
| `E3` | `Quản trị viên` | Người dùng nội bộ vai trò `ADMIN` kế thừa quyền nhân viên và thực hiện tạo tài khoản nhân viên, xem nhật ký thao tác, xem bảng điều khiển sức khỏe và thống kê vận hành |
| `E4` | `Cổng thanh toán` | Hệ thống thanh toán trực tuyến bên ngoài nhận yêu cầu tạo giao dịch và gửi thông báo kết quả thanh toán qua webhook có chữ ký số |
| `E5` | `Dịch vụ dịch và TTS` | Hệ thống xử lý ngôn ngữ và giọng nói bên ngoài nhận văn bản tiếng Việt từ tác vụ nền và trả về văn bản dịch cùng tệp âm thanh thuyết minh `.wav` |
| `E6` | `Dịch vụ embedding và LLM` | Hệ thống trí tuệ nhân tạo bên ngoài nhận đoạn tài liệu hoặc câu hỏi để sinh vector nhúng và tổng hợp câu trả lời có trích dẫn nguồn |

### 5.2. Danh sách 6 Kho dữ liệu (khớp 16 bảng MySQL + bộ nhớ đệm Redis + kho tệp Media ở mục 4.4 báo cáo)

| Mã kho | Nhãn hiển thị trên sơ đồ | Các bảng vật lý và bộ nhớ ánh xạ trong mã nguồn |
| :--- | :--- | :--- |
| `D1` | `D1 | Tài khoản và Phiên nội bộ` | Bảng `USERS`, bảng `REFRESH_TOKENS`, bộ khóa phiên đăng nhập trên `Redis` |
| `D2` | `D2 | Phiên tham quan và Thanh toán` | Bảng `VISIT_SESSIONS`, bảng `PAYMENTS`, bộ khóa mã một lần và mã ngắn trên `Redis` |
| `D3` | `D3 | Điểm tham quan và Nội dung đa ngôn ngữ` | Bảng `LANGUAGES`, bảng `POIS`, bảng `POI_TRANSLATIONS`, bảng `AUDIOS`, bảng `CONTENT_JOBS`, kho tệp âm thanh và hình ảnh `Media Storage` |
| `D4` | `D4 | Lộ trình tham quan` | Bảng `TOURS`, bảng `TOUR_POIS` |
| `D5` | `D5 | Kho kiến thức` | Bảng `KNOWLEDGE_DOCUMENTS`, bảng `KNOWLEDGE_CHUNKS` |
| `D6` | `D6 | Nhật ký và Thống kê` | Bảng `AUDIT_LOGS`, bảng `CHAT_LOGS`, bảng `BUNDLE_ACCESS_LOGS`, bảng `ANALYTICS_SESSIONS`, bảng `ANALYTICS_PRESENCE`, bảng `ANALYTICS_POI_VISITS` |

---

## 6. Đặc tả chi tiết từng sơ đồ DFD mức 0, 1, 2, 3

### 6.1. DFD Mức 0 — Sơ đồ ngữ cảnh (`docs/diagram/dfd/DFD_Level_0_Context.drawio`)

- **Kích thước trang:** `pageWidth="1600" pageHeight="1000"`
- **Tiến trình trung tâm:**
  - `P0`: `0 | Hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn` đặt tại `(x=660, y=430, width=280, height=110)`
- **Vị trí 6 Tác nhân ngoài:**
  - `E1 Khách tham quan`: `(x=80, y=220, width=180, height=60)`
  - `E2 Nhân viên`: `(x=80, y=520, width=180, height=60)`
  - `E3 Quản trị viên`: `(x=80, y=780, width=180, height=60)`
  - `E4 Cổng thanh toán`: `(x=1340, y=220, width=180, height=60)`
  - `E5 Dịch vụ dịch và TTS`: `(x=1340, y=500, width=180, height=60)`
  - `E6 Dịch vụ embedding và LLM`: `(x=1340, y=780, width=180, height=60)`
- **Danh sách đầy đủ các luồng dữ liệu ở DFD Mức 0:**
  1. `E1 -> P0`: `Yêu cầu thanh toán, mã đổi phiên, ngôn ngữ, vị trí GPS và câu hỏi`
  2. `P0 -> E1`: `Thông tin giao dịch, token phiên, gói nội dung bản đồ, âm thanh và câu trả lời`
  3. `E2 -> P0`: `Thông tin đăng nhập, xác nhận tiền mặt, dữ liệu điểm tham quan, lộ trình và tài liệu`
  4. `P0 -> E2`: `Token nội bộ, mã ngắn 6 chữ số, trạng thái phiên khách và kết quả cập nhật nội dung`
  5. `E3 -> P0`: `Thông tin đăng nhập, thông tin tạo nhân viên và bộ lọc tra cứu giám sát`
  6. `P0 -> E3`: `Hồ sơ nhân viên mới, nhật ký thao tác và báo cáo sức khỏe vận hành`
  7. `P0 -> E4`: `Yêu cầu khởi tạo giao dịch thanh toán trực tuyến`
  8. `E4 -> P0`: `Thông báo kết quả thanh toán webhook kèm chữ ký số`
  9. `P0 -> E5`: `Văn bản thuyết minh tiếng Việt và yêu cầu sinh giọng đọc đa ngôn ngữ`
  10. `E5 -> P0`: `Bản dịch đa ngôn ngữ và tệp âm thanh thuyết minh WAV`
  11. `P0 -> E6`: `Đoạn tài liệu kiến thức, câu hỏi truy vấn và ngữ cảnh trích dẫn`
  12. `E6 -> P0`: `Vector nhúng và câu trả lời kèm trích dẫn nguồn`

---

### 6.2. DFD Mức 1 — Sơ đồ phân rã hệ thống (`docs/diagram/dfd/DFD_Level_1_System.drawio`)

- **Kích thước trang:** `pageWidth="2000" pageHeight="1400"`
- **5 Tiến trình chính (cột giữa `x=760`):**
  - `P1`: `1.0 | Quản lý thanh toán và phiên tham quan` — `(x=760, y=100, width=240, height=85)` — ánh xạ `UC-01`, `UC-02`, `UC-11`, `UC-12`
  - `P2`: `2.0 | Cung cấp nội dung bản đồ, lộ trình và thuyết minh` — `(x=760, y=350, width=240, height=85)` — ánh xạ `UC-03`, `UC-04`, `UC-05`, `UC-06`, `UC-07`
  - `P3`: `3.0 | Xử lý hỏi đáp thông minh RAG` — `(x=760, y=600, width=240, height=85)` — ánh xạ `UC-08`
  - `P4`: `4.0 | Quản trị nội dung, lộ trình và kho kiến thức` — `(x=760, y=850, width=240, height=85)` — ánh xạ `UC-13`, `UC-14`, `UC-15` và Pipeline xử lý nền
  - `P5`: `5.0 | Quản trị tài khoản nội bộ và giám sát hệ thống` — `(x=760, y=1120, width=240, height=85)` — ánh xạ `UC-09`, `UC-10`, `UC-16`, `UC-17`, `UC-18`
- **Vị trí 6 Tác nhân ngoài (cột trái `x=80` và cột phải ngoài `x=1720`):**
  - `E1 Khách tham quan`: `(x=80, y=280, width=180, height=60)`
  - `E2 Nhân viên`: `(x=80, y=760, width=180, height=60)`
  - `E3 Quản trị viên`: `(x=80, y=1120, width=180, height=60)`
  - `E4 Cổng thanh toán`: `(x=1720, y=110, width=180, height=60)`
  - `E5 Dịch vụ dịch và TTS`: `(x=1720, y=850, width=180, height=60)`
  - `E6 Dịch vụ embedding và LLM`: `(x=1720, y=660, width=180, height=60)`
- **Vị trí 6 Kho dữ liệu (cột trung gian phải `x=1260`):**
  - `D2 | Phiên tham quan và Thanh toán`: `(x=1260, y=190, width=250, height=50)`
  - `D3 | Điểm tham quan và Nội dung đa ngôn ngữ`: `(x=1260, y=420, width=250, height=50)`
  - `D4 | Lộ trình tham quan`: `(x=1260, y=520, width=250, height=50)`
  - `D5 | Kho kiến thức`: `(x=1260, y=730, width=250, height=50)`
  - `D6 | Nhật ký và Thống kê`: `(x=1260, y=990, width=250, height=50)`
  - `D1 | Tài khoản và Phiên nội bộ`: `(x=1260, y=1210, width=250, height=50)`
- **Danh sách đầy đủ các luồng dữ liệu ở DFD Mức 1:**
  - **Nhóm tiến trình `1.0`:**
    1. `E1 -> P1`: `Yêu cầu khởi tạo phiên và mã đổi token`
    2. `P1 -> E1`: `Thông tin thanh toán trực tuyến và token phiên khách`
    3. `P1 -> E4`: `Yêu cầu khởi tạo giao dịch thanh toán trực tuyến`
    4. `E4 -> P1`: `Thông báo kết quả thanh toán webhook kèm chữ ký số`
    5. `E2 -> P1`: `Yêu cầu tạo phiên tiền mặt, xác nhận thu tiền và tra cứu phiên`
    6. `P1 -> E2`: `Mã ngắn 6 chữ số, thông tin phiên khách và token cấp lại`
    7. `P1 <-> D2`: `Dữ liệu phiên tham quan, giao dịch thanh toán và mã tạm thời`
    8. `P1 -> D6`: `Nhật ký xác nhận thanh toán và cấp lại token`
  - **Nhóm tiến trình `2.0`:**
    9. `E1 -> P2`: `Lựa chọn ngôn ngữ, lộ trình, vị trí GPS và yêu cầu phát thuyết minh`
    10. `P2 -> E1`: `Gói nội dung bản đồ, danh sách điểm tham quan, lộ trình và tệp âm thanh`
    11. `D2 -> P2`: `Trạng thái hiệu lực của token phiên khách`
    12. `D3 -> P2`: `Thông tin điểm tham quan, bản dịch đã công bố và tệp âm thanh`
    13. `D4 -> P2`: `Danh sách lộ trình mẫu và thứ tự điểm dừng`
    14. `P2 -> D6`: `Nhật ký tải gói nội dung, tín hiệu hiện diện và lượt ghé điểm tham quan`
  - **Nhóm tiến trình `3.0`:**
    15. `E1 -> P3`: `Câu hỏi của khách tham quan kèm ngôn ngữ phiên`
    16. `P3 -> E1`: `Câu trả lời kèm danh sách trích dẫn nguồn`
    17. `D2 -> P3`: `Trạng thái phiên khách và bộ đếm giới hạn tần suất hỏi`
    18. `D5 -> P3`: `Các đoạn tài liệu kiến thức đã công bố và vector nhúng`
    19. `P3 -> E6`: `Câu hỏi truy vấn và ngữ cảnh đoạn kiến thức`
    20. `E6 -> P3`: `Vector câu hỏi và câu trả lời có trích dẫn nguồn`
    21. `P3 -> D6`: `Nhật ký câu hỏi, câu trả lời và trích dẫn`
  - **Nhóm tiến trình `4.0`:**
    22. `E2 -> P4`: `Dữ liệu điểm tham quan, bản dịch, lộ trình mẫu và tài liệu kiến thức`
    23. `P4 -> E2`: `Trạng thái cập nhật nội dung, tiến độ tác vụ nền và kết quả công bố`
    24. `P4 <-> D3`: `Hồ sơ điểm tham quan, bản dịch, tệp âm thanh và trạng thái tác vụ nội dung`
    25. `P4 <-> D4`: `Thông tin lộ trình mẫu và danh sách điểm dừng`
    26. `P4 <-> D5`: `Tài liệu kho kiến thức, đoạn phân mảnh và vector nhúng`
    27. `P4 -> E5`: `Văn bản thuyết minh tiếng Việt và yêu cầu sinh giọng đọc đa ngôn ngữ`
    28. `E5 -> P4`: `Bản dịch đa ngôn ngữ và tệp âm thanh thuyết minh WAV`
    29. `P4 -> E6`: `Các đoạn tài liệu kiến thức cần tạo vector nhúng`
    30. `E6 -> P4`: `Danh sách vector nhúng của đoạn tài liệu`
    31. `P4 -> D6`: `Nhật ký thay đổi điểm tham quan, lộ trình và tài liệu`
  - **Nhóm tiến trình `5.0`:**
    32. `E2 -> P5`: `Thông tin đăng nhập, yêu cầu làm mới phiên và đăng xuất của nhân viên`
    33. `P5 -> E2`: `Token truy cập nội bộ và trạng thái phiên đăng nhập`
    34. `E3 -> P5`: `Thông tin đăng nhập, hồ sơ nhân viên mới và bộ lọc tra cứu giám sát`
    35. `P5 -> E3`: `Hồ sơ nhân viên vừa tạo, danh sách nhật ký thao tác và báo cáo giám sát`
    36. `P5 <-> D1`: `Hồ sơ tài khoản nội bộ, mật khẩu băm và refresh token`
    37. `D2 -> P5`: `Số liệu giao dịch thanh toán và phiên tham quan`
    38. `D3 -> P5`: `Số liệu điểm tham quan, độ phủ ngôn ngữ và tác vụ nội dung lỗi`
    39. `D5 -> P5`: `Số liệu tài liệu kiến thức và trạng thái sẵn sàng truy hồi`
    40. `D6 <-> P5`: `Nhật ký thao tác quản trị, nhật ký hỏi đáp và thống kê khách trực tuyến`

---

### 6.3. DFD Mức 2 — Phân rã 5 tiến trình chính

#### 6.3.1. Sơ đồ DFD Mức 2 Tiến trình 1.0 (`docs/diagram/dfd/DFD_Level_2_P1_Payment_Session.drawio`)
Phân rã tiến trình `1.0 Quản lý thanh toán và phiên tham quan` (tương ứng `payment.service.js`, `online-checkout.js`, `online-webhook.js`, `online-exchange.js`):
- **Các tiến trình con:**
  - `1.1 Khởi tạo phiên và yêu cầu thanh toán trực tuyến`: Nhận yêu cầu từ `Khách tham quan`, kiểm tra phiên hiện hành tại `D2`, gọi `Cổng thanh toán` tạo giao dịch, lưu bản ghi `VISIT_SESSIONS` và `PAYMENTS` trạng thái chờ vào `D2`, trả thông tin giao dịch cho `Khách tham quan`.
  - `1.2 Xác minh webhook và kích hoạt mã đổi phiên`: Nhận thông báo webhook kèm chữ ký số từ `Cổng thanh toán`, kiểm tra chữ ký và số tiền với `D2`, cập nhật giao dịch thành công, sinh `one_time_code` có thời hạn lưu vào `D2`.
  - `1.3 Xác nhận tiền mặt và cấp mã ngắn 6 chữ số`: Nhận yêu cầu tạo phiên tiền mặt hoặc xác nhận thu tiền từ `Nhân viên`, cập nhật trạng thái thanh toán tiền mặt trong `D2`, sinh `shorted_code` 6 chữ số có thời hạn lưu vào `D2`, ghi nhật ký vào `D6` và trả mã ngắn cho `Nhân viên`.
  - `1.4 Đổi mã xác thực và cấp token phiên khách`: Nhận `one_time_code` hoặc `shorted_code` từ `Khách tham quan`, kiểm tra giới hạn thử sai và đối chiếu mã tại `D2`, thu hồi mã một lần sau khi dùng, phát hành `tcv_visit_` token có hạn 24 giờ lưu vào `D2` và trả token cho `Khách tham quan`.
  - `1.5 Tra cứu phiên và cấp lại token khách`: Nhận mã tra cứu từ `Nhân viên`, truy vấn thông tin phiên và lịch sử thanh toán tại `D2`, phát hành lại token hoặc mã ngắn mới nếu phiên còn hạn, ghi nhật ký cấp lại vào `D6` và trả kết quả cho `Nhân viên`.

#### 6.3.2. Sơ đồ DFD Mức 2 Tiến trình 2.0 (`docs/diagram/dfd/DFD_Level_2_P2_Visitor_Content_Audio.drawio`)
Phân rã tiến trình `2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh` (tương ứng `content.service.js`, `tour.service.js`, `visitor-analytics.service.js`, `online-visitor.service.js`):
- **Các tiến trình con:**
  - `2.1 Kiểm tra hiệu lực phiên tham quan và ngôn ngữ`: Nhận yêu cầu tải nội dung kèm `tcv_visit_` token và mã ngôn ngữ từ `Khách tham quan`, đối chiếu thời hạn phiên tại `D2` và danh sách ngôn ngữ hoạt động tại `D3`, chuyển yêu cầu hợp lệ sang tiến trình tổng hợp.
  - `2.2 Tổng hợp gói nội dung điểm tham quan và lộ trình`: Đọc danh sách điểm tham quan, tọa độ, bán kính kích hoạt, bản dịch đã công bố từ `D3` và danh sách lộ trình mẫu từ `D4`, đóng gói gói dữ liệu bản đồ và lộ trình trả về cho `Khách tham quan`, đồng thời ghi nhận lượt tải vào `D6`.
  - `2.3 Cung cấp tệp âm thanh thuyết minh`: Nhận yêu cầu phát âm thanh thủ công hoặc tự động theo vị trí GPS từ `Khách tham quan`, đọc đường dẫn và luồng tệp âm thanh đang hoạt động từ `D3`, truyền tệp âm thanh về cho `Khách tham quan`.
  - `2.4 Ghi nhận hiện diện trực tuyến và thống kê điểm ghé`: Nhận tín hiệu nhịp tim hiện diện và sự kiện ghé điểm tham quan theo GPS từ `Khách tham quan`, cập nhật trạng thái phiên trực tuyến và lượt ghé điểm tham quan vào `D6`.

#### 6.3.3. Sơ đồ DFD Mức 2 Tiến trình 3.0 (`docs/diagram/dfd/DFD_Level_2_P3_Chatbot_RAG.drawio`)
Phân rã tiến trình `3.0 Xử lý hỏi đáp thông minh RAG` (tương ứng `chat.service.js`, `knowledge.service.js`):
- **Các tiến trình con:**
  - `3.1 Kiểm tra phiên khách và giới hạn tần suất hỏi`: Nhận câu hỏi và mã ngôn ngữ từ `Khách tham quan`, kiểm tra hiệu lực `tcv_visit_` token và bộ đếm giới hạn số câu hỏi mỗi phút tại `D2`.
  - `3.2 Kiểm tra phạm vi câu hỏi và tạo vector truy vấn`: Kiểm tra độ dài và phạm vi chủ đề câu hỏi, gửi câu hỏi sang `Dịch vụ embedding và LLM` để nhận vector nhúng của câu hỏi.
  - `3.3 Truy hồi đoạn kiến thức tương đồng`: Đọc các đoạn kiến thức thuộc tài liệu ở trạng thái `PUBLISHED` từ `D5`, tính độ tương đồng ngữ nghĩa với vector câu hỏi để chọn ra tập đoạn kiến thức có điểm cao nhất vượt ngưỡng.
  - `3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký`: Gửi câu hỏi kèm các đoạn kiến thức truy hồi sang `Dịch vụ embedding và LLM`, kiểm tra tính hợp lệ của trích dẫn trong câu trả lời nhận về, lưu lịch sử hỏi đáp vào `D6` và trả câu trả lời kèm trích dẫn cho `Khách tham quan`.

#### 6.3.4. Sơ đồ DFD Mức 2 Tiến trình 4.0 (`docs/diagram/dfd/DFD_Level_2_P4_Content_Knowledge_Admin.drawio`)
Phân rã tiến trình `4.0 Quản trị nội dung, lộ trình và kho kiến thức` (tương ứng `poi.service.js`, `translation.service.js`, `content-job.service.js`, `pipeline.service.js`, `tour.service.js`, `knowledge.service.js`):
- **Các tiến trình con:**
  - `4.1 Cập nhật điểm tham quan và khởi tạo tác vụ nội dung`: Nhận thông tin tạo mới, chỉnh sửa, ngừng kích hoạt điểm tham quan hoặc chỉnh sửa bản dịch từ `Nhân viên`, lưu dữ liệu gốc vào `D3`, tăng `source_version`, khởi tạo bản ghi `CONTENT_JOBS` trong `D3`, ghi nhật ký vào `D6` và báo kết quả cho `Nhân viên`.
  - `4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh`: Đọc các tác vụ chờ từ `D3`, gửi văn bản gốc sang `Dịch vụ dịch và TTS`, nhận bản dịch đa ngôn ngữ và tệp âm thanh `.wav`, lưu tệp vào kho media cùng bản ghi `POI_TRANSLATIONS` và `AUDIOS` trong `D3`, cập nhật trạng thái hoàn tất tác vụ.
  - `4.3 Quản lý lộ trình tham quan mẫu`: Nhận thông tin tạo, sửa, sắp xếp thứ tự điểm dừng hoặc đổi trạng thái lộ trình từ `Nhân viên`, kiểm tra các điểm tham quan đang hoạt động tại `D3`, cập nhật bảng `TOURS` và `TOUR_POIS` trong `D4`, ghi nhật ký vào `D6` và trả kết quả cho `Nhân viên`.
  - `4.4 Phân đoạn tài liệu và tạo vector kho kiến thức`: Nhận tài liệu mới hoặc cập nhật từ `Nhân viên`, lưu thông tin tài liệu vào `D5`, tách văn bản thành các đoạn nhỏ, gửi các đoạn văn bản sang `Dịch vụ embedding và LLM` để lấy vector nhúng, lưu các đoạn kèm vector vào `D5`, chuyển trạng thái tài liệu sang `PUBLISHED`, ghi nhật ký vào `D6` và trả kết quả cho `Nhân viên`.

#### 6.3.5. Sơ đồ DFD Mức 2 Tiến trình 5.0 (`docs/diagram/dfd/DFD_Level_2_P5_Auth_Admin_Monitoring.drawio`)
Phân rã tiến trình `5.0 Quản trị tài khoản nội bộ và giám sát hệ thống` (tương ứng `auth.service.js`, `audit.service.js`, `monitoring.service.js`, `operations.service.js`):
- **Các tiến trình con:**
  - `5.1 Xác thực đăng nhập và quản lý phiên nội bộ`: Nhận thông tin đăng nhập, làm mới token hoặc đăng xuất từ `Nhân viên` và `Quản trị viên`, đối chiếu mật khẩu băm và trạng thái tài khoản tại `D1`, phát hành hoặc thu hồi access token và refresh token trong `D1`, ghi nhật ký xác thực vào `D6`.
  - `5.2 Tạo và quản lý tài khoản nhân viên`: Nhận thông tin tạo tài khoản nhân viên mới từ `Quản trị viên`, kiểm tra trùng tên đăng nhập tại `D1`, băm mật khẩu và lưu tài khoản vai trò `STAFF` vào `D1`, ghi nhật ký tạo tài khoản vào `D6` và trả hồ sơ nhân viên cho `Quản trị viên`.
  - `5.3 Truy vấn và lọc nhật ký thao tác`: Nhận bộ lọc thời gian, tác nhân, hành động từ `Quản trị viên`, truy vấn dữ liệu bảng `AUDIT_LOGS` trong `D6` và trả danh sách nhật ký phân trang cho `Quản trị viên`.
  - `5.4 Tổng hợp chỉ số sức khỏe và thống kê vận hành`: Nhận yêu cầu xem giám sát từ `Quản trị viên`, đọc số liệu phiên và giao dịch từ `D2`, độ phủ nội dung và tác vụ lỗi từ `D3`, trạng thái tài liệu từ `D5`, thống kê hỏi đáp và số khách đang trực tuyến từ `D6`, tổng hợp báo cáo sức khỏe hệ thống trả về cho `Quản trị viên`.

---

### 6.4. DFD Mức 3 — Phân rã chi tiết 2 tiến trình phức tạp nhất

#### 6.4.1. Sơ đồ DFD Mức 3 Tiến trình 4.2 (`docs/diagram/dfd/DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio`)
Phân rã tiến trình `4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh` (khớp chính xác mã nguồn `pipeline.service.js`, `pipeline-translation.js`, `pipeline-audio.js`, `media.service.js`):
- **Các tiến trình con mức 3:**
  - `4.2.1 Nhận tác vụ chờ và cấp quyền giữ phiên xử lý`: Đọc tác vụ trạng thái `QUEUED` hoặc `RETRY_WAIT` từ `D3`, kiểm tra khóa chống chạy trùng và cập nhật trạng thái `RUNNING` kèm mã phiên giữ tác vụ vào `D3`.
  - `4.2.2 Kiểm tra phiên bản nguồn và dịch văn bản đa ngôn ngữ`: Đọc văn bản thuyết minh tiếng Việt và `source_version` hiện hành từ `D3`, gửi văn bản sang `Dịch vụ dịch và TTS`, nhận bản dịch các ngôn ngữ đích và lưu bản dịch trạng thái `DRAFT` vào `D3`.
  - `4.2.3 Tổng hợp âm thanh WAV và kiểm tra định dạng tệp`: Gửi văn bản từng ngôn ngữ sang `Dịch vụ dịch và TTS` để tổng hợp giọng đọc, kiểm tra kích thước tệp, phần đầu định dạng `RIFF/WAVE` và thời lượng âm thanh hợp lệ.
  - `4.2.4 Lưu kho tệp media và công bố trạng thái hoàn tất`: Ghi tệp âm thanh `.wav` vào kho media, cập nhật bản ghi `AUDIOS` đang hoạt động, chuyển bản dịch sang `PUBLISHED` và cập nhật trạng thái tác vụ `SUCCEEDED` hoặc `FAILED` kèm số lần thử vào `D3`.

#### 6.4.2. Sơ đồ DFD Mức 3 Tiến trình 3.4 (`docs/diagram/dfd/DFD_Level_3_P3_4_RAG_Answer_Generation.drawio`)
Phân rã tiến trình `3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký` (khớp chính xác mã nguồn `chat.service.js`):
- **Các tiến trình con mức 3:**
  - `3.4.1 Đóng gói lời nhắc hệ thống kèm ngữ cảnh đoạn kiến thức`: Nhận câu hỏi hợp lệ từ tiến trình `3.1` và danh sách đoạn kiến thức tương đồng từ tiến trình `3.3`, ghép nối chỉ thị giới hạn phạm vi Thảo Cầm Viên và danh sách mã đoạn trích dẫn thành gói lời nhắc hoàn chỉnh.
  - `3.4.2 Gọi mô hình ngôn ngữ sinh phản hồi theo ngữ cảnh`: Gửi gói lời nhắc sang `Dịch vụ embedding và LLM` và nhận văn bản phản hồi cùng danh sách mã tài liệu được viện dẫn.
  - `3.4.3 Kiểm tra trích dẫn hợp lệ và lọc liên kết ngoài nguồn`: Đối chiếu các mã trích dẫn trong phản hồi với tập đoạn kiến thức đầu vào, loại bỏ các đường dẫn ngoài nguồn và thay thế bằng thông báo chuẩn nếu phản hồi vượt ngoài tài liệu.
  - `3.4.4 Lưu nhật ký hỏi đáp và trả kết quả cho khách`: Ghi bản ghi câu hỏi, câu trả lời đã kiểm duyệt, danh sách trích dẫn và thời gian xử lý vào bảng `CHAT_LOGS` thuộc `D6`, đồng thời trả câu trả lời kèm trích dẫn về cho `Khách tham quan`.

---

## 7. Ma trận kiểm증 cân bằng luồng dữ liệu giữa các mức

Gemini 3.8 Flash phải kiểm tra bảng đối chiếu này trước khi hoàn tất các tệp `.drawio`:

| Tác nhân / Kho biên | Luồng ở mức cha | Luồng tương ứng ở mức con | Trạng thái cân bằng |
| :--- | :--- | :--- | :--- |
| `Khách tham quan` ↔ Hệ thống | 1 luồng tổng hợp vào `P0`, 1 luồng tổng hợp ra từ `P0` ở Mức 0 | Tách thành đúng 3 luồng vào (`P1`, `P2`, `P3`) và 3 luồng ra (`P1`, `P2`, `P3`) ở Mức 1 | Cân bằng đầy đủ |
| `Nhân viên` ↔ Hệ thống | 1 luồng tổng hợp vào `P0`, 1 luồng tổng hợp ra từ `P0` ở Mức 0 | Tách thành đúng 3 luồng vào (`P1`, `P4`, `P5`) và 3 luồng ra (`P1`, `P4`, `P5`) ở Mức 1 | Cân bằng đầy đủ |
| `Quản trị viên` ↔ Hệ thống | 1 luồng vào `P0`, 1 luồng ra từ `P0` ở Mức 0 | Khớp 1 luồng vào `P5` và 1 luồng ra từ `P5` ở Mức 1 | Cân bằng đầy đủ |
| `Cổng thanh toán` ↔ Hệ thống | 1 luồng ra từ `P0`, 1 luồng vào `P0` ở Mức 0 | Khớp 1 luồng ra từ `P1` (`1.1`) và 1 luồng vào `P1` (`1.2`) ở Mức 1 và Mức 2 | Cân bằng đầy đủ |
| `Dịch vụ dịch và TTS` ↔ Hệ thống | 1 luồng ra từ `P0`, 1 luồng vào `P0` ở Mức 0 | Khớp 1 luồng ra từ `P4` (`4.2` -> `4.2.2`, `4.2.3`) và 1 luồng vào `P4` (`4.2.2`, `4.2.3`) ở Mức 1, 2, 3 | Cân bằng đầy đủ |
| `Dịch vụ embedding và LLM` ↔ Hệ thống | 1 luồng ra từ `P0`, 1 luồng vào `P0` ở Mức 0 | Khớp các luồng trao đổi tại `P3` (`3.2`, `3.4` -> `3.4.2`) và `P4` (`4.4`) ở Mức 1, 2, 3 | Cân bằng đầy đủ |

---

## 8. Nội dung chuẩn cho mục 3.4 trong báo cáo Google Doc

Khi thực hiện **Bước 12**, Gemini 3.8 Flash xuất nguyên văn nội dung dưới đây vào `docs/DFD_Report_Section_3_4.md` và chèn vào Google Doc sau `Hình 3.37`:

### Cấu trúc đề mục cần ghi vào báo cáo

- **3.4. Sơ đồ luồng dữ liệu DFD**
  - Mở đầu ngắn gọn 1 đoạn văn nêu mục đích phân tích luồng dữ liệu qua 4 mức từ mức 0 đến mức 3, liệt kê 6 tác nhân ngoài và 6 kho dữ liệu.
- **3.4.1. Sơ đồ DFD mức 0**
  - Vị trí chèn `Hình 3.38: Sơ đồ DFD mức 0 ngữ cảnh hệ thống`.
  - Bảng mô tả các luồng dữ liệu trao đổi giữa 6 tác nhân ngoài và tiến trình trung tâm `0`.
- **3.4.2. Sơ đồ DFD mức 1**
  - Vị trí chèn `Hình 3.39: Sơ đồ DFD mức 1 phân rã hệ thống`.
  - Bảng ánh xạ 6 kho dữ liệu `D1` đến `D6` với các bảng cơ sở dữ liệu vật lý.
  - Bảng mô tả chức năng, luồng đầu vào, kho dữ liệu truy cập và luồng đầu ra của 5 tiến trình `1.0`, `2.0`, `3.0`, `4.0`, `5.0`.
- **3.4.3. Sơ đồ DFD mức 2**
  - `a. Phân rã tiến trình 1.0 Quản lý thanh toán và phiên tham quan` kèm `Hình 3.40` và bảng mô tả tiến trình `1.1` đến `1.5`.
  - `b. Phân rã tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh` kèm `Hình 3.41` và bảng mô tả tiến trình `2.1` đến `2.4`.
  - `c. Phân rã tiến trình 3.0 Xử lý hỏi đáp thông minh RAG` kèm `Hình 3.42` và bảng mô tả tiến trình `3.1` đến `3.4`.
  - `d. Phân rã tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức` kèm `Hình 3.43` và bảng mô tả tiến trình `4.1` đến `4.4`.
  - `e. Phân rã tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống` kèm `Hình 3.44` và bảng mô tả tiến trình `5.1` đến `5.4`.
- **3.4.4. Sơ đồ DFD mức 3**
  - `a. Phân rã tiến trình 4.2 Xử lý nền dịch văn bản và tổng hợp âm thanh` kèm `Hình 3.45` và bảng mô tả tiến trình `4.2.1` đến `4.2.4`.
  - `b. Phân rã tiến trình 3.4 Tổng hợp câu trả lời có trích dẫn và ghi nhật ký` kèm `Hình 3.46` và bảng mô tả tiến trình `3.4.1` đến `3.4.4`.

---

## 9. Quy trình kiểm tra nghiệm thu dành cho Gemini 3.8 Flash

Sau khi tạo xong 9 tệp `.drawio` và tệp nội dung báo cáo, Gemini 3.8 Flash phải chạy một đoạn lệnh Python ngắn qua `run_command` để kiểm tra:
1. Tất cả 9 tệp `.drawio` đều phân tích cú pháp XML thành công bằng `xml.etree.ElementTree`.
2. Không có hai phần tử `mxCell` nào trùng thuộc tính `id` trong cùng một tệp.
3. Mọi cạnh `edge="1"` đều có `source` và `target` trỏ tới `id` tồn tại, không có cạnh nào nối trực tiếp giữa hai Tác nhân ngoài, giữa hai Kho dữ liệu, hoặc giữa Tác nhân ngoài với Kho dữ liệu.
4. Không có bất kỳ phần tử Kho dữ liệu nào xuất hiện trong `DFD_Level_0_Context.drawio`.
5. Trong văn bản báo cáo `docs/DFD_Report_Section_3_4.md` không xuất hiện ký tự ngoặc đơn `(`, `)` hay dấu ba chấm `...`.
