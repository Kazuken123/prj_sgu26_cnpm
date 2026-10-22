import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Bảng màu chuyên nghiệp
    NAVY = RGBColor(15, 44, 89)        # #0F2C59 - Tiêu đề chính, thanh thương hiệu
    BLUE_MID = RGBColor(30, 58, 138)   # #1E3A8A - Màu nhấn thứ cấp
    TEAL = RGBColor(13, 148, 136)      # #0D9488 - Điểm nhấn chức năng
    AMBER = RGBColor(217, 119, 6)      # #D97706 - Cảnh báo, Could Have
    DARK_TEXT = RGBColor(15, 23, 42)   # #0F172A - Chữ chính
    MUTED_TEXT = RGBColor(100, 116, 139) # #64748B - Chữ phụ, ghi chú
    BG_LIGHT = RGBColor(248, 250, 252) # #F8FAFC - Nền slide
    CARD_BG = RGBColor(255, 255, 255)  # Trắng
    CARD_BORDER = RGBColor(226, 232, 240) # Viền card
    CARD_BG_ALT = RGBColor(241, 245, 249) # Xám nhẹ
    GREEN_ACCENT = RGBColor(22, 101, 52) # Xanh lá cho Must Have
    GREEN_BG = RGBColor(220, 252, 231)

    diagram_dir = r"c:\Users\giuag\.gemini\antigravity\scratch\prj_sgu26_cnpm\docs\diagram\export"

    def set_slide_background(slide, color=BG_LIGHT):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, category, title, subtitle=None):
        # Thanh đỉnh nhỏ màu navy
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = NAVY
        top_bar.line.fill.background()

        # Category Pill
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.35), Inches(2.6), Inches(0.35))
        pill.fill.solid()
        pill.fill.fore_color.rgb = CARD_BG_ALT
        pill.line.color.rgb = CARD_BORDER
        pill.line.width = Pt(1)
        tf_pill = pill.text_frame
        tf_pill.word_wrap = True
        tf_pill.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_pill = tf_pill.paragraphs[0]
        p_pill.text = category.upper()
        p_pill.font.size = Pt(10)
        p_pill.font.bold = True
        p_pill.font.color.rgb = BLUE_MID
        p_pill.font.name = "Segoe UI"
        p_pill.alignment = PP_ALIGN.CENTER

        # Title
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.733), Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"

        if subtitle:
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.size = Pt(12)
            p2.font.color.rgb = MUTED_TEXT
            p2.font.name = "Segoe UI"

    def add_footer(slide, current_page, total_pages=24):
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.0), Inches(11.733), Pt(1))
        line.fill.solid()
        line.fill.fore_color.rgb = CARD_BORDER
        line.line.fill.background()

        tb = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(9.0), Inches(0.35))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = "Đồ án Công nghệ phần mềm — Hệ thống tự động thuyết minh đa ngôn ngữ Chùa Linh Ứng"
        p.font.size = Pt(9.5)
        p.font.color.rgb = MUTED_TEXT
        p.font.name = "Segoe UI"

        tb_pg = slide.shapes.add_textbox(Inches(10.5), Inches(7.05), Inches(2.0), Inches(0.35))
        tf_pg = tb_pg.text_frame
        p_pg = tf_pg.paragraphs[0]
        p_pg.text = f"{current_page} / {total_pages}"
        p_pg.font.size = Pt(9.5)
        p_pg.font.bold = True
        p_pg.font.color.rgb = BLUE_MID
        p_pg.font.name = "Segoe UI"
        p_pg.alignment = PP_ALIGN.RIGHT

    def create_card(slide, left, top, width, height, title=None, bg_color=CARD_BG, border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
        
        # Nếu có title, thêm dải tiêu đề
        if title:
            tb = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(0.12), width - Inches(0.3), Inches(0.4))
            tf = tb.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = title
            p.font.size = Pt(13)
            p.font.bold = True
            p.font.color.rgb = BLUE_MID
            p.font.name = "Segoe UI"
        return card

    # ==================== SLIDE 1: TRANG BÌA ====================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, RGBColor(241, 245, 249))

    # Cột nhấn bên trái
    side_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.6), Inches(7.5))
    side_bar.fill.solid()
    side_bar.fill.fore_color.rgb = NAVY
    side_bar.line.fill.background()

    # Thẻ chính giữa
    card_title = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(0.9), Inches(11.0), Inches(5.7))
    card_title.fill.solid()
    card_title.fill.fore_color.rgb = CARD_BG
    card_title.line.color.rgb = CARD_BORDER
    card_title.line.width = Pt(1.5)

    tb_t = slide1.shapes.add_textbox(Inches(1.8), Inches(1.3), Inches(9.8), Inches(2.2))
    tf_t = tb_t.text_frame
    tf_t.word_wrap = True
    
    p_sub = tf_t.paragraphs[0]
    p_sub.text = "BÁO CÁO ĐỒ ÁN MÔN HỌC — CÔNG NGHỆ PHẦN MỀM"
    p_sub.font.size = Pt(13)
    p_sub.font.bold = True
    p_sub.font.color.rgb = TEAL
    p_sub.font.name = "Segoe UI"

    p_main = tf_t.add_paragraph()
    p_main.text = "Hệ Thống Tự Động Thuyết Minh Đa Ngôn Ngữ"
    p_main.font.size = Pt(28)
    p_main.font.bold = True
    p_main.font.color.rgb = NAVY
    p_main.font.name = "Segoe UI"
    p_main.space_before = Pt(8)

    p_loc = tf_t.add_paragraph()
    p_loc.text = "Địa điểm ứng dụng: Quần thể văn hóa Chùa Linh Ứng"
    p_loc.font.size = Pt(15)
    p_loc.font.color.rgb = MUTED_TEXT
    p_loc.font.name = "Segoe UI"
    p_loc.space_before = Pt(6)

    # Đường phân cách ngang
    div = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.8), Inches(3.7), Inches(9.8), Pt(1.5))
    div.fill.solid()
    div.fill.fore_color.rgb = CARD_BORDER
    div.line.fill.background()

    # Khung thông tin giảng viên & sinh viên
    tb_info = slide1.shapes.add_textbox(Inches(1.8), Inches(3.9), Inches(4.5), Inches(2.3))
    tf_info = tb_info.text_frame
    tf_info.word_wrap = True

    p_gv_label = tf_info.paragraphs[0]
    p_gv_label.text = "GIẢNG VIÊN HƯỚNG DẪN"
    p_gv_label.font.size = Pt(11)
    p_gv_label.font.bold = True
    p_gv_label.font.color.rgb = BLUE_MID
    p_gv_label.font.name = "Segoe UI"

    p_gv = tf_info.add_paragraph()
    p_gv.text = "Thầy Nguyễn Quốc Huy"
    p_gv.font.size = Pt(14)
    p_gv.font.bold = True
    p_gv.font.color.rgb = DARK_TEXT
    p_gv.font.name = "Segoe UI"

    p_time = tf_info.add_paragraph()
    p_time.text = "Thời gian: Tháng 9 Năm 2026\nĐơn vị: Trường Đại học Sài Gòn"
    p_time.font.size = Pt(12)
    p_time.font.color.rgb = MUTED_TEXT
    p_time.font.name = "Segoe UI"
    p_time.space_before = Pt(12)

    tb_team = slide1.shapes.add_textbox(Inches(6.8), Inches(3.9), Inches(5.0), Inches(2.3))
    tf_team = tb_team.text_frame
    tf_team.word_wrap = True

    p_sv_label = tf_team.paragraphs[0]
    p_sv_label.text = "NHÓM SINH VIÊN THỰC HIỆN — LỚP DCT124C1"
    p_sv_label.font.size = Pt(11)
    p_sv_label.font.bold = True
    p_sv_label.font.color.rgb = BLUE_MID
    p_sv_label.font.name = "Segoe UI"

    members = [
        ("Lê Văn Hiếu", "3124411091"),
        ("Lê Đức Anh", "3124411009"),
        ("Dương Gia Phát", "3124411212")
    ]
    for name, mssv in members:
        p_m = tf_team.add_paragraph()
        p_m.text = f"•  {name} — MSSV: {mssv}"
        p_m.font.size = Pt(13)
        p_m.font.color.rgb = DARK_TEXT
        p_m.font.name = "Segoe UI"
        p_m.space_before = Pt(3)

    # ==================== SLIDE 2: MỤC LỤC & PHẠM VI BÁO CÁO ====================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2)
    add_header(slide2, "TỔNG QUAN", "Cấu Trúc Bài Báo Cáo", "Tập trung trình bày các nội dung đã hoàn thành chuẩn chỉnh trong hồ sơ đồ án")
    add_footer(slide2, 2)

    # 4 Cards cho 4 chương hoàn thiện
    cards_data = [
        ("01", "Chương 1: Tổng Quan Đề Tài", "Bối cảnh thực tế Chùa Linh Ứng, rào cản ngôn ngữ, 5 mục tiêu nghiệp vụ, 9 yêu cầu nghiệp vụ cấp cao và phạm vi hệ thống.", BLUE_MID),
        ("02", "Chương 2: Yêu Cầu Sản Phẩm PRD", "Tình huống sử dụng, ma trận phân cấp ưu tiên, 8 nhóm User Story kèm tiêu chí nghiệm thu và quy tắc nghiệp vụ.", TEAL),
        ("03", "Chương 3: Phân Tích Hệ Thống", "Tác nhân, ranh giới, mô hình 18 Use Case tổng quát, ma trận truy vết và đặc tả chi tiết các Use Case cốt lõi.", NAVY),
        ("04", "Chương 4: Thiết Kế Hệ Thống", "Kiến trúc tổng thể, mô hình 3 lớp Router-Service-Store, thiết kế thành phần và cơ sở dữ liệu 16 bảng dữ liệu.", BLUE_MID),
    ]
    for idx, (num, c_title, c_desc, color_accent) in enumerate(cards_data):
        left = Inches(0.8 + idx * 2.98)
        top = Inches(1.8)
        w = Inches(2.8)
        h = Inches(3.8)
        c = create_card(slide2, left, top, w, h)
        
        # Số thứ tự nổi bật
        tb_num = slide2.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), Inches(1.0), Inches(0.5))
        tf_num = tb_num.text_frame
        p_n = tf_num.paragraphs[0]
        p_n.text = num
        p_n.font.size = Pt(26)
        p_n.font.bold = True
        p_n.font.color.rgb = color_accent
        p_n.font.name = "Segoe UI"

        # Tên chương
        tb_ct = slide2.shapes.add_textbox(left + Inches(0.2), top + Inches(0.8), w - Inches(0.4), Inches(0.9))
        tf_ct = tb_ct.text_frame
        tf_ct.word_wrap = True
        p_ct = tf_ct.paragraphs[0]
        p_ct.text = c_title
        p_ct.font.size = Pt(13)
        p_ct.font.bold = True
        p_ct.font.color.rgb = DARK_TEXT
        p_ct.font.name = "Segoe UI"

        # Mô tả
        tb_cd = slide2.shapes.add_textbox(left + Inches(0.2), top + Inches(1.8), w - Inches(0.4), Inches(1.8))
        tf_cd = tb_cd.text_frame
        tf_cd.word_wrap = True
        p_cd = tf_cd.paragraphs[0]
        p_cd.text = c_desc
        p_cd.font.size = Pt(11)
        p_cd.font.color.rgb = MUTED_TEXT
        p_cd.font.name = "Segoe UI"

    # Lưu ý dưới chân
    c_note = create_card(slide2, Inches(0.8), Inches(5.8), Inches(11.733), Inches(0.9), bg_color=CARD_BG_ALT)
    tb_nt = slide2.shapes.add_textbox(Inches(1.0), Inches(5.85), Inches(11.3), Inches(0.8))
    tf_nt = tb_nt.text_frame
    tf_nt.word_wrap = True
    p_nt = tf_nt.paragraphs[0]
    p_nt.text = "Nguyên tắc báo cáo đồ án: Báo cáo trung thực và chuẩn xác theo hiện trạng tài liệu. Bài trình bày tập trung toàn bộ vào các nội dung Phân tích yêu cầu và Thiết kế hệ thống đã được hoàn thiện chuẩn chỉnh ở Chương 1 đến Chương 4; các chương xây dựng và kiểm thử còn lại được trình bày rõ ở phần kế hoạch."
    p_nt.font.size = Pt(11)
    p_nt.font.color.rgb = DARK_TEXT
    p_nt.font.name = "Segoe UI"

    # ==================== SLIDE 3: BỐI CẢNH & VẤN ĐỀ NGHIỆP VỤ (CHƯƠNG 1) ====================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3)
    add_header(slide3, "CHƯƠNG 1: TỔNG QUAN", "Bối Cảnh Nghiệp Vụ Tại Chùa Linh Ứng", "Thực trạng tham quan và các thách thức vận hành cần giải quyết bằng giải pháp phần mềm")
    add_footer(slide3, 3)

    probs = [
        ("Rào Cản Ngôn Ngữ Du Khách", "Khách trong nước và quốc tế đến Chùa Linh Ứng gặp khó khăn khi tiếp cận thông tin lịch sử, văn hóa bằng ngôn ngữ mẹ đẻ. Nhu cầu cần hỗ trợ từ 15 ngôn ngữ trở lên bằng cả văn bản và âm thanh giọng đọc chuẩn."),
        ("Thuyết Minh Theo Tọa Độ GPS", "Khách tham quan cần nhận biết các điểm di tích ở gần và tự động nghe giới thiệu khi di chuyển vào phạm vi kích hoạt, loại bỏ thao tác tìm kiếm thủ công liên tục trên màn hình điện thoại."),
        ("Hỏi Đáp Thông Minh Có Căn Cứ", "Trong quá trình tham quan, du khách thường xuyên có thắc mắc chuyên sâu. Cần trợ lý trí tuệ nhân tạo giải đáp tức thì dựa trên kho kiến thức được ban quản lý kiểm duyệt, tránh thông tin sai lệch."),
        ("Quản Lý Phiên Và Quyền Truy Cập", "Đơn vị vận hành cần cơ chế thu phí linh hoạt qua mã QR trực tuyến hoặc quầy tiền mặt, cấp quyền truy cập theo thời hạn phiên tham quan mà không bắt buộc du khách phải tải app hay đăng ký tài khoản.")
    ]
    for i, (p_title, p_desc) in enumerate(probs):
        row = i // 2
        col = i % 2
        left = Inches(0.8 + col * 6.0)
        top = Inches(1.8 + row * 2.5)
        w = Inches(5.7)
        h = Inches(2.2)
        create_card(slide3, left, top, w, h, title=f"Vấn Đề {i+1}: {p_title}")
        tb = slide3.shapes.add_textbox(left + Inches(0.2), top + Inches(0.6), w - Inches(0.4), h - Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = p_desc
        p.font.size = Pt(12)
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"

    # ==================== SLIDE 4: CÁC BÊN LIÊN QUAN & MỤC TIÊU CỐT LÕI (CHƯƠNG 1) ====================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4)
    add_header(slide4, "CHƯƠNG 1: TỔNG QUAN", "Các Bên Liên Quan Và Mục Tiêu Đề Tài", "Xác định vai trò tương tác và 5 mục tiêu cốt lõi của hệ thống")
    add_footer(slide4, 4)

    # Cột trái: Các bên liên quan (width = 4.2)
    create_card(slide4, Inches(0.8), Inches(1.8), Inches(4.2), Inches(4.9), title="Các Bên Liên Quan Chính")
    tb_sh = slide4.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(3.8), Inches(4.1))
    tf_sh = tb_sh.text_frame
    tf_sh.word_wrap = True
    stakeholders = [
        ("Khách tham quan", "Quét QR, thanh toán nhận phiên vé không cần tài khoản; xem bản đồ, nghe thuyết minh tự động và hỏi đáp chatbot."),
        ("Nhân viên (STAFF)", "Đăng nhập nội bộ, xác nhận thanh toán tiền mặt tại quầy, cập nhật nội dung điểm tham quan và quản lý kho kiến thức."),
        ("Quản trị viên (ADMIN)", "Quản lý tài khoản nhân viên, xem nhật ký kiểm toán hệ thống và giám sát sức khỏe dịch vụ, số liệu vận hành.")
    ]
    for s_name, s_role in stakeholders:
        p1 = tf_sh.add_paragraph() if tf_sh.paragraphs[0].text else tf_sh.paragraphs[0]
        p1.text = s_name
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = BLUE_MID
        p1.font.name = "Segoe UI"
        
        p2 = tf_sh.add_paragraph()
        p2.text = s_role
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = DARK_TEXT
        p2.font.name = "Segoe UI"
        p2.space_after = Pt(8)

    # Cột phải: 5 mục tiêu cốt lõi (width = 7.3)
    create_card(slide4, Inches(5.2), Inches(1.8), Inches(7.3), Inches(4.9), title="5 Mục Tiêu Nghiệp Vụ Cốt Lõi")
    tb_obj = slide4.shapes.add_textbox(Inches(5.4), Inches(2.4), Inches(6.9), Inches(4.1))
    tf_obj = tb_obj.text_frame
    tf_obj.word_wrap = True
    goals = [
        ("Hỗ trợ tham quan chủ động", "Giúp khách định vị trên bản đồ số, theo dõi các điểm xung quanh và xem nội dung thuyết minh theo lộ trình mong muốn."),
        ("Xóa bỏ rào cản ngôn ngữ", "Pipeline dịch thuật và chuyển văn bản thành giọng nói chuẩn bị sẵn nội dung cho 15 ngôn ngữ, bao gồm tiếng Việt."),
        ("Thuyết minh vị trí chính xác", "Tự động phát âm thanh khi vào bán kính 50m của điểm di tích; cơ chế chống phát lặp thông minh với ngưỡng phục hồi 75m."),
        ("Hỏi đáp có căn cứ xác thực", "Ứng dụng mô hình RAG kết nối kho tài liệu Chùa Linh Ứng, chỉ phản hồi dựa trên kiến thức được duyệt, thông báo rõ khi thiếu thông tin."),
        ("Vận hành tập trung và tin cậy", "Quản lý phiên vé, phân quyền nghiêm ngặt, ghi nhật ký kiểm toán không thể xóa sửa và giám sát trạng thái hệ thống theo thời gian thực.")
    ]
    for g_title, g_desc in goals:
        p1 = tf_obj.add_paragraph() if tf_obj.paragraphs[0].text else tf_obj.paragraphs[0]
        p1.text = f"•  {g_title}: "
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = TEAL
        p1.font.name = "Segoe UI"
        
        run = p1.add_run()
        run.text = g_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p1.space_after = Pt(6)

    # ==================== SLIDE 5: YÊU CẦU NGHIỆP VỤ CẤP CAO BR-01 -> BR-09 ====================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5)
    add_header(slide5, "CHƯƠNG 1: TỔNG QUAN", "Yêu Cầu Nghiệp Vụ Cấp Cao (BR-01 Đến BR-09)", "Khung yêu cầu định hình toàn bộ tính năng và tiêu chuẩn nghiệm thu của sản phẩm")
    add_footer(slide5, 5)

    br_list = [
        ("BR-01", "Truy cập & Thanh toán", "Quét QR, thanh toán trực tuyến hoặc tiền mặt để nhận quyền truy cập; không yêu cầu đăng ký tài khoản."),
        ("BR-02", "Bản đồ & Tọa độ GPS", "Hiển thị bản đồ số, vị trí hiện tại của khách và danh sách các điểm tham quan lân cận theo khoảng cách."),
        ("BR-03", "Thuyết minh tự động", "Tự động kích hoạt âm thanh khi vào bán kính điểm di tích, chống phát lặp trong cùng một lượt tiếp cận."),
        ("BR-04", "Pipeline đa ngôn ngữ", "Tự động dịch nội dung và tạo trước âm thanh cho 15 ngôn ngữ; hỗ trợ chuyển đổi ngôn ngữ linh hoạt."),
        ("BR-05", "Gói dữ liệu độc lập", "Tải gói dữ liệu đầy đủ một lần; giao diện tự tính toán khoảng cách và hiển thị, không gọi lại API lấy điểm."),
        ("BR-06", "Hỏi đáp RAG có căn cứ", "Trợ lý trí tuệ nhân tạo giải đáp câu hỏi du khách dựa trên kho kiến thức được duyệt; từ chối khi thiếu căn cứ."),
        ("BR-07", "Lộ trình tùy chỉnh", "Cung cấp lộ trình mẫu và cho phép khách tự thêm bớt điểm tham quan, hiển thị hướng di chuyển giữa các điểm."),
        ("BR-08", "Quản trị nội bộ & Vé", "Nhân viên xác nhận thanh toán tiền mặt, cập nhật nội dung; quản trị viên quản lý tài khoản và xem nhật ký."),
        ("BR-09", "Giám sát hệ thống", "Cung cấp bảng theo dõi sức khỏe dịch vụ, thống kê phiên truy cập, doanh thu, ngôn ngữ và câu hỏi hỏi đáp.")
    ]
    # Tạo bảng 10 hàng 3 cột
    table_shape = slide5.shapes.add_table(10, 3, Inches(0.8), Inches(1.8), Inches(11.733), Inches(4.9))
    tbl = table_shape.table
    tbl.columns[0].width = Inches(1.2)
    tbl.columns[1].width = Inches(2.8)
    tbl.columns[2].width = Inches(7.733)

    headers = ["Mã BR", "Nhóm Nghiệp Vụ", "Nội Dung Yêu Cầu Chi Tiết"]
    for j, h_text in enumerate(headers):
        cell = tbl.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)
        p.font.name = "Segoe UI"
        p.alignment = PP_ALIGN.CENTER if j == 0 else PP_ALIGN.LEFT

    for i, (code, grp, desc) in enumerate(br_list):
        row_idx = i + 1
        bg = CARD_BG if i % 2 == 0 else CARD_BG_ALT
        
        c0 = tbl.cell(row_idx, 0)
        c0.fill.solid()
        c0.fill.fore_color.rgb = bg
        p0 = c0.text_frame.paragraphs[0]
        p0.text = code
        p0.font.size = Pt(10)
        p0.font.bold = True
        p0.font.color.rgb = BLUE_MID
        p0.font.name = "Segoe UI"
        p0.alignment = PP_ALIGN.CENTER

        c1 = tbl.cell(row_idx, 1)
        c1.fill.solid()
        c1.fill.fore_color.rgb = bg
        p1 = c1.text_frame.paragraphs[0]
        p1.text = grp
        p1.font.size = Pt(10)
        p1.font.bold = True
        p1.font.color.rgb = DARK_TEXT
        p1.font.name = "Segoe UI"

        c2 = tbl.cell(row_idx, 2)
        c2.fill.solid()
        c2.fill.fore_color.rgb = bg
        p2 = c2.text_frame.paragraphs[0]
        p2.text = desc
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = DARK_TEXT
        p2.font.name = "Segoe UI"

    # ==================== SLIDE 6: PHẠM VI & RÀNG BUỘC KỸ THUẬT (CHƯƠNG 1) ====================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6)
    add_header(slide6, "CHƯƠNG 1: TỔNG QUAN", "Phạm Vi Triển Khai Và Ràng Buộc Kỹ Thuật", "Quy định ranh giới chức năng và các quyết định công nghệ bắt buộc")
    add_footer(slide6, 6)

    # 3 Khối: Phạm vi trong, Ngoài phạm vi, Ràng buộc công nghệ
    c1 = create_card(slide6, Inches(0.8), Inches(1.8), Inches(3.7), Inches(4.9), title="Chức Năng Trong Phạm Vi")
    tb1 = slide6.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(3.3), Inches(4.1))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    in_scope = [
        "Ứng dụng web responsive chạy mượt trên trình duyệt di động.",
        "Xác thực phiên tham quan qua mã thanh toán tiền mặt và cổng trực tuyến.",
        "Bản đồ OpenStreetMap và thư viện Leaflet hiển thị điểm di tích.",
        "Thuyết minh tự động theo vị trí GPS và chế độ giả lập tọa độ khi trình diễn.",
        "Pipeline dịch và tạo âm thanh chuẩn bị trước dữ liệu đa ngôn ngữ.",
        "Trợ lý hỏi đáp RAG với kho dữ liệu di tích Chùa Linh Ứng.",
        "Quản trị nội bộ và giao diện giám sát vận hành hệ thống."
    ]
    for item in in_scope:
        p = tf1.add_paragraph() if tf1.paragraphs[0].text else tf1.paragraphs[0]
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"
        p.space_after = Pt(4)

    c2 = create_card(slide6, Inches(4.8), Inches(1.8), Inches(3.7), Inches(4.9), title="Ngoài Phạm Vi Thực Hiện")
    tb2 = slide6.shapes.add_textbox(Inches(5.0), Inches(2.4), Inches(3.3), Inches(4.1))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    out_scope = [
        "Không xây dựng ứng dụng di động riêng biệt cho iOS hoặc Android.",
        "Không hỗ trợ chế độ ứng dụng PWA và hoạt động ngoại tuyến.",
        "Không triển khai công nghệ định vị trong nhà bằng Bluetooth hay cảm biến phụ.",
        "Không tích hợp chỉ đường đi bộ chi tiết theo mạng lưới đường phố phức tạp.",
        "Loại bỏ hoàn toàn các chức năng quản lý chủ quán, thực đơn ăn uống và đánh giá ẩm thực từ các phiên bản cũ."
    ]
    for item in out_scope:
        p = tf2.add_paragraph() if tf2.paragraphs[0].text else tf2.paragraphs[0]
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"
        p.space_after = Pt(6)

    c3 = create_card(slide6, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.9), title="Ràng Buộc Kỹ Thuật Bắt Buộc")
    tb3 = slide6.shapes.add_textbox(Inches(9.0), Inches(2.4), Inches(3.3), Inches(4.1))
    tf3 = tb3.text_frame
    tf3.word_wrap = True
    constraints = [
        "Môi trường chạy: Node.js 20 và framework Express.",
        "Cơ sở dữ liệu: MySQL 8 làm nguồn đối soát chính xác cho thanh toán và phiên.",
        "Bộ nhớ đệm: Redis 7 lưu trữ mã ngắn, giới hạn tần suất truy cập và session tạm.",
        "Kiến trúc: Bắt buộc tuân thủ nghiêm ngặt 3 lớp Router – Service – Store.",
        "Đóng gói & CI/CD: Triển khai Docker container và tự động kiểm thử qua GitHub Actions."
    ]
    for item in constraints:
        p = tf3.add_paragraph() if tf3.paragraphs[0].text else tf3.paragraphs[0]
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"
        p.space_after = Pt(6)

    # ==================== SLIDE 7: HÀNH TRÌNH NGƯỜI DÙNG & TÌNH HUỐNG SỬ DỤNG (CHƯƠNG 2) ====================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7)
    add_header(slide7, "CHƯƠNG 2: PRD", "Hành Trình Trải Nghiệm Của Du Khách", "Quy trình khép kín từ lúc quét mã QR đến khi tham quan và hỏi đáp tại điểm di tích")
    add_footer(slide7, 7)

    steps = [
        ("Bước 1", "Quét QR Tại Cổng", "Khách quét mã QR tại điểm đón tiếp, mở trang web trên trình duyệt điện thoại mà không cần tải ứng dụng."),
        ("Bước 2", "Chọn Hình Thức Trả Phí", "Chọn thanh toán online qua cổng thanh toán hoặc trả tiền mặt cho nhân viên để nhận mã ngắn đổi vé."),
        ("Bước 3", "Đổi Token Phiên Vé", "Nhập mã đổi quyền; hệ thống cấp token phiên tham quan có hiệu lực 24 giờ, lưu tại bộ nhớ trình duyệt."),
        ("Bước 4", "Tải Gói Dữ Liệu Ngôn Ngữ", "Chọn ngôn ngữ mẹ đẻ trong 15 ngôn ngữ; tải toàn bộ tọa độ, bài viết và lộ trình trong 1 gói dữ liệu duy nhất."),
        ("Bước 5", "Tham Quan & Thuyết Minh", "Bật tính năng tham quan; âm thanh tự động phát khi đến gần điểm di tích; đặt câu hỏi cho trợ lý RAG khi cần.")
    ]
    for idx, (s_num, s_title, s_desc) in enumerate(steps):
        left = Inches(0.8 + idx * 2.38)
        top = Inches(2.0)
        w = Inches(2.25)
        h = Inches(4.5)
        create_card(slide7, left, top, w, h)

        # Badge bước
        b = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), top + Inches(0.25), Inches(1.85), Inches(0.4))
        b.fill.solid()
        b.fill.fore_color.rgb = BLUE_MID
        b.line.fill.background()
        p_b = b.text_frame.paragraphs[0]
        p_b.text = s_num
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = RGBColor(255, 255, 255)
        p_b.alignment = PP_ALIGN.CENTER

        tb = slide7.shapes.add_textbox(left + Inches(0.15), top + Inches(0.8), w - Inches(0.3), Inches(3.5))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p1 = tf.paragraphs[0]
        p1.text = s_title
        p1.font.size = Pt(12.5)
        p1.font.bold = True
        p1.font.color.rgb = DARK_TEXT
        p1.font.name = "Segoe UI"
        p1.space_after = Pt(8)

        p2 = tf.add_paragraph()
        p2.text = s_desc
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = MUTED_TEXT
        p2.font.name = "Segoe UI"

    # ==================== SLIDE 8: MA TRẬN PHÂN CẤP ƯU TIÊN MOSCOW (CHƯƠNG 2) ====================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8)
    add_header(slide8, "CHƯƠNG 2: PRD", "Ma Trận Phân Cấp Ưu Tiên Tính Năng (MoSCoW)", "Xác định rõ phạm vi phiên bản cốt lõi và các phần mở rộng phục vụ nghiệm thu")
    add_footer(slide8, 8)

    # 3 Cột: Must Have, Should Have, Could Have
    col_w = Inches(3.7)
    gap = Inches(0.3)

    # Must Have
    c_must = create_card(slide8, Inches(0.8), Inches(1.8), col_w, Inches(4.9))
    tb_m = slide8.shapes.add_textbox(Inches(0.95), Inches(1.9), col_w - Inches(0.3), Inches(4.6))
    tf_m = tb_m.text_frame
    tf_m.word_wrap = True
    p_m_h = tf_m.paragraphs[0]
    p_m_h.text = "MUST HAVE (BẮT BUỘC CÓ)"
    p_m_h.font.size = Pt(12)
    p_m_h.font.bold = True
    p_m_h.font.color.rgb = GREEN_ACCENT
    must_items = [
        "Thanh toán trực tuyến giả lập và thanh toán tiền mặt tại quầy vé.",
        "Cấp và kiểm tra hiệu lực phiên tham quan 24 giờ của du khách.",
        "Gói dữ liệu tham quan độc lập tải một lần theo ngôn ngữ.",
        "Bản đồ số, thuyết minh thủ công và tự động theo tọa độ GPS.",
        "Pipeline dịch và tạo âm thanh chuẩn bị sẵn cho đa ngôn ngữ.",
        "Quản trị điểm tham quan, quản lý tài khoản nhân viên và ghi nhật ký.",
        "Kiến trúc Back-end 3 lớp, Docker và kiểm thử tự động CI."
    ]
    for item in must_items:
        p = tf_m.add_paragraph()
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.space_before = Pt(4)

    # Should Have
    c_should = create_card(slide8, Inches(0.8 + 1 * (3.7 + 0.3)), Inches(1.8), col_w, Inches(4.9))
    tb_s = slide8.shapes.add_textbox(Inches(0.95 + 1 * (3.7 + 0.3)), Inches(1.9), col_w - Inches(0.3), Inches(4.6))
    tf_s = tb_s.text_frame
    tf_s.word_wrap = True
    p_s_h = tf_s.paragraphs[0]
    p_s_h.text = "SHOULD HAVE (NÊN CÓ)"
    p_s_h.font.size = Pt(12)
    p_s_h.font.bold = True
    p_s_h.font.color.rgb = BLUE_MID
    should_items = [
        "Trợ lý hỏi đáp RAG kết nối kho tri thức đã kiểm duyệt.",
        "Quản trị tài liệu kiến thức: phân đoạn văn bản và cập nhật chỉ mục tìm kiếm.",
        "Bảng điều khiển giám sát sức khỏe dịch vụ hệ thống.",
        "Thống kê phiên hoạt động, doanh thu thực tế, lượt tải ngôn ngữ và câu hỏi hỏi đáp.",
        "Cơ chế dự phòng ngôn ngữ: tự động chuyển về tiếng Anh hoặc tiếng Việt khi thiếu âm thanh."
    ]
    for item in should_items:
        p = tf_s.add_paragraph()
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.space_before = Pt(6)

    # Could Have
    c_could = create_card(slide8, Inches(0.8 + 2 * (3.7 + 0.3)), Inches(1.8), col_w, Inches(4.9))
    tb_c = slide8.shapes.add_textbox(Inches(0.95 + 2 * (3.7 + 0.3)), Inches(1.9), col_w - Inches(0.3), Inches(4.6))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    p_c_h = tf_c.paragraphs[0]
    p_c_h.text = "COULD HAVE (MỞ RỘNG)"
    p_c_h.font.size = Pt(12)
    p_c_h.font.bold = True
    p_c_h.font.color.rgb = AMBER
    could_items = [
        "Hỗ trợ nhân viên cấp lại token khi du khách làm mất mã phiên.",
        "Tạo âm thanh tức thời theo yêu cầu riêng lẻ của du khách.",
        "Tích hợp môi trường thử nghiệm thanh toán Payoo thực tế.",
        "Chỉ đường đi bộ nâng cao theo bản đồ mạng lưới đường thực.",
        "Truyền phát âm thanh giọng đọc trực tiếp bằng cơ chế SSE."
    ]
    for item in could_items:
        p = tf_c.add_paragraph()
        p.text = f"•  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.space_before = Pt(6)

    # ==================== SLIDE 9: USER STORIES TRỌNG TÂM - NHÓM A & B ====================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide9)
    add_header(slide9, "CHƯƠNG 2: PRD", "User Stories Trọng Tâm: Nhóm A Và Nhóm B", "Đặc tả yêu cầu truy cập, thanh toán và thuyết minh định vị kèm tiêu chí chấp nhận AC")
    add_footer(slide9, 9)

    # 4 Cards cho US-A01, US-A02, US-A03, US-B02
    us_data = [
        ("US-A01 & US-A02: Thanh Toán Online", "Là khách tham quan, tôi muốn thanh toán trực tuyến và nhận token để sử dụng hệ thống ngay lập tức.", [
            "AC1: Webhook thanh toán bắt buộc kiểm tra chữ ký, mã giao dịch và số tiền.",
            "AC2: Webhook gửi lặp tuyệt đối không tạo thêm phiên hoặc nhân đôi doanh thu.",
            "AC3: Mã đổi quyền có thời hạn và chỉ được đổi thành token đúng một lần."
        ]),
        ("US-A03: Thanh Toán Tiền Mặt", "Là khách tham quan, tôi muốn trả tiền mặt cho nhân viên và nhập mã ngắn để kích hoạt quyền tham quan.", [
            "AC1: Khách tạo phiên chờ thanh toán, nhân viên xác nhận đã nhận tiền.",
            "AC2: Hệ thống tạo mã ngắn lưu trong Redis kèm thời gian sống hữu hạn.",
            "AC3: Mã ngắn hợp lệ chỉ đổi thành token một lần, tự hủy khi hết hạn hoặc dùng rồi."
        ]),
        ("US-A04: Quản Lý Phiên Khách", "Là khách tham quan, tôi muốn sử dụng hệ thống liên tục trong thời hạn vé mà không bị ngắt quãng.", [
            "AC1: Token gắn với phiên tham quan đã thanh toán, thời hạn mặc định 24 giờ.",
            "AC2: Mọi API nghiệp vụ được bảo vệ đều kiểm tra tính hợp lệ và thời hạn phiên.",
            "AC3: Token khách tuyệt đối không được phép truy cập vào chức năng nội bộ."
        ]),
        ("US-B02: Thuyết Minh Tự Động GPS", "Là khách tham quan, tôi muốn nghe thuyết minh tự động khi đến gần điểm di tích mà không phải bấm chọn.", [
            "AC1: Bắt đầu kích hoạt âm thanh khi vào bán kính 50m của điểm tham quan.",
            "AC2: Mỗi điểm chỉ tự phát đúng một lần trong một lượt đến gần.",
            "AC3: Cơ chế chống lặp: chỉ đặt lại lượt mới khi khách rời xa vượt ngưỡng 75m."
        ])
    ]
    for idx, (title, as_a, acs) in enumerate(us_data):
        r = idx // 2
        c = idx % 2
        left = Inches(0.8 + c * 6.0)
        top = Inches(1.8 + r * 2.5)
        w = Inches(5.7)
        h = Inches(2.3)
        create_card(slide9, left, top, w, h, title=title)
        tb = slide9.shapes.add_textbox(left + Inches(0.15), top + Inches(0.55), w - Inches(0.3), h - Inches(0.65))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_story = tf.paragraphs[0]
        p_story.text = as_a
        p_story.font.size = Pt(10)
        p_story.font.italic = True
        p_story.font.color.rgb = MUTED_TEXT
        p_story.space_after = Pt(4)

        for ac in acs:
            p_ac = tf.add_paragraph()
            p_ac.text = f"• {ac}"
            p_ac.font.size = Pt(9.5)
            p_ac.font.color.rgb = DARK_TEXT

    # ==================== SLIDE 10: USER STORIES TRỌNG TÂM - NHÓM C, D & E ====================
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide10)
    add_header(slide10, "CHƯƠNG 2: PRD", "User Stories Trọng Tâm: Nhóm C, D Và E", "Đặc tả yêu cầu nội dung đa ngôn ngữ, trợ lý hỏi đáp và tùy chỉnh lộ trình")
    add_footer(slide10, 10)

    us_cde = [
        ("US-C01 & US-C02: Nội Dung Đa Ngôn Ngữ", "Quản lý dữ liệu POI, tự động dịch và tạo âm thanh trước; tải gói bundle độc lập.", [
            "AC1: Một gói bundle chứa toàn bộ thông tin POI, tọa độ, bài viết và đường dẫn âm thanh.",
            "AC2: Giao diện chỉ tải bundle một lần theo ngôn ngữ, không gọi lại API lấy POI khi di chuyển.",
            "AC3: Cập nhật nội dung tiếng Việt tự động tạo tác vụ nền dịch thuật và tạo âm thanh."
        ]),
        ("US-C03: Dự Phòng Ngôn Ngữ Fallback", "Đảm bảo trải nghiệm liền mạch khi ngôn ngữ hoặc âm thanh chưa sẵn sàng.", [
            "AC1: Thiếu nội dung ngôn ngữ yêu cầu: ưu tiên tự động chuyển về tiếng Anh, sau đó tiếng Việt.",
            "AC2: Chưa có tệp âm thanh: cho phép khách đọc văn bản kèm thông báo rõ ràng.",
            "AC3: Giao diện hiển thị đúng nhãn ngôn ngữ thực tế, không gây hiểu lầm cho người dùng."
        ]),
        ("US-D01 & US-D02: Trợ Lý Hỏi Đáp RAG", "Du khách đặt câu hỏi tự nhiên để nhận câu trả lời chính xác có nguồn dẫn chứng.", [
            "AC1: Chỉ du khách có phiên tham quan hợp lệ mới được gửi câu hỏi đến chatbot.",
            "AC2: Hệ thống truy hồi đoạn tài liệu phù hợp, trả lời bằng mô hình ngôn ngữ kèm trích dẫn nguồn.",
            "AC3: Không đủ căn cứ trả lời: hệ thống chủ động thông báo chưa có thông tin xác thực."
        ]),
        ("US-E01: Lộ Trình Tham Quan Tùy Chỉnh", "Lựa chọn tour mẫu hoặc tự chọn danh sách các điểm muốn ghé thăm.", [
            "AC1: Tour mẫu có sẵn danh sách các điểm di tích được sắp xếp theo trình tự tham quan hợp lý.",
            "AC2: Khách tự do thêm hoặc bớt điểm; giao diện tự tính khoảng cách tối ưu giữa các điểm.",
            "AC3: Bản đồ hiển thị đường nối trực quan và khoảng cách ước tính giữa các điểm tham quan."
        ])
    ]
    for idx, (title, as_a, acs) in enumerate(us_cde):
        r = idx // 2
        c = idx % 2
        left = Inches(0.8 + c * 6.0)
        top = Inches(1.8 + r * 2.5)
        w = Inches(5.7)
        h = Inches(2.3)
        create_card(slide10, left, top, w, h, title=title)
        tb = slide10.shapes.add_textbox(left + Inches(0.15), top + Inches(0.55), w - Inches(0.3), h - Inches(0.65))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_story = tf.paragraphs[0]
        p_story.text = as_a
        p_story.font.size = Pt(10)
        p_story.font.italic = True
        p_story.font.color.rgb = MUTED_TEXT
        p_story.space_after = Pt(4)

        for ac in acs:
            p_ac = tf.add_paragraph()
            p_ac.text = f"• {ac}"
            p_ac.font.size = Pt(9.5)
            p_ac.font.color.rgb = DARK_TEXT

    # ==================== SLIDE 11: QUY TẮC NGHIỆP VỤ & YÊU CẦU PHI CHỨC NĂNG ====================
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide11)
    add_header(slide11, "CHƯƠNG 2: PRD", "Quy Tắc Nghiệp Vụ Và Yêu Cầu Phi Chức Năng", "Thiết lập các tiêu chuẩn vận hành an toàn, hiệu năng và độ tin cậy của hệ thống")
    add_footer(slide11, 11)

    # Cột trái: Quy tắc nghiệp vụ
    create_card(slide11, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Quy Tắc Nghiệp Vụ Cốt Lõi")
    tb_biz = slide11.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_biz = tb_biz.text_frame
    tf_biz.word_wrap = True
    biz_rules = [
        ("Thời hạn phiên vé", "Phiên tham quan có hiệu lực đúng 24 giờ kể từ thời điểm xác nhận thanh toán thành công. Không tự động gia hạn."),
        ("Không lưu tài khoản khách", "Không yêu cầu khách tạo tài khoản cá nhân; quyền sử dụng gắn liền hoàn toàn với phiên thanh toán và token."),
        ("Bảo toàn doanh thu", "Xác nhận webhook lặp hoặc nhập mã nhiều lần tuyệt đối không tạo bản ghi thanh toán mới hoặc kéo dài thời hạn vé."),
        ("Bán kính kích hoạt âm thanh", "Bán kính mặc định 50m; chỉ kích hoạt khi âm thanh sẵn sàng và du khách đã thực hiện thao tác mở khóa âm thanh."),
        ("Chống phát lặp thông minh", "Sau khi đã phát, chỉ cho phép phát lại điểm đó nếu du khách đã di chuyển ra xa vượt ngưỡng 75m rồi quay trở lại.")
    ]
    for b_title, b_desc in biz_rules:
        p1 = tf_biz.add_paragraph() if tf_biz.paragraphs[0].text else tf_biz.paragraphs[0]
        p1.text = f"• {b_title}: "
        p1.font.size = Pt(10.5)
        p1.font.bold = True
        p1.font.color.rgb = BLUE_MID
        p1.font.name = "Segoe UI"
        
        run = p1.add_run()
        run.text = b_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p1.space_after = Pt(6)

    # Cột phải: Yêu cầu phi chức năng (NFR)
    create_card(slide11, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Yêu Cầu Phi Chức Năng (NFR)")
    tb_nfr = slide11.shapes.add_textbox(Inches(7.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_nfr = tb_nfr.text_frame
    tf_nfr.word_wrap = True
    nfr_items = [
        ("Hiệu năng phản hồi", "Thời gian phản hồi các API tra cứu dưới 200 mili giây. Tải toàn bộ gói dữ liệu bundle ngôn ngữ dưới 2 giây trên mạng di động 4G."),
        ("An toàn & Bảo mật", "Mật khẩu nhân viên băm bằng thuật ngữ bcrypt; refresh token lưu dạng băm sha256; tự động khóa tài khoản 15 phút sau 5 lần nhập sai liên tiếp."),
        ("Kiểm soát phiên", "Xoay vòng refresh token sau mỗi lần cấp mới access token; vô hiệu hóa toàn bộ phiên khi đăng xuất an toàn."),
        ("Độ tin cậy dữ liệu", "MySQL làm nguồn đối soát chính thức; Redis chỉ đóng vai trò lưu trữ tạm thời, lỗi Redis không làm sai lệch số liệu thanh toán."),
        ("Chất lượng mã nguồn", "Tự động kiểm tra chất lượng mã nguồn qua linter, đạt tỷ lệ bao phủ kiểm thử đơn vị và kiểm thử tích hợp trên GitHub Actions.")
    ]
    for n_title, n_desc in nfr_items:
        p1 = tf_nfr.add_paragraph() if tf_nfr.paragraphs[0].text else tf_nfr.paragraphs[0]
        p1.text = f"• {n_title}: "
        p1.font.size = Pt(10.5)
        p1.font.bold = True
        p1.font.color.rgb = TEAL
        p1.font.name = "Segoe UI"
        
        run = p1.add_run()
        run.text = n_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p1.space_after = Pt(6)

    # ==================== SLIDE 12: TÁC NHÂN & RANH GIỚI HỆ THỐNG (CHƯƠNG 3) ====================
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide12)
    add_header(slide12, "CHƯƠNG 3: PHÂN TÍCH", "Tác Nhân Và Ranh Giới Hệ Thống", "Xác định rõ các thực thể tương tác và ranh giới trách nhiệm của ứng dụng")
    add_footer(slide12, 12)

    # Cột trái: Tác nhân người dùng & hệ thống ngoài
    create_card(slide12, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Phân Loại Tác Nhân (Actors)")
    tb_act = slide12.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_act = tb_act.text_frame
    tf_act.word_wrap = True
    actors = [
        ("Khách tham quan", "Người dùng trực tiếp quét QR, trả phí, sử dụng bản đồ, nghe audio và tương tác với chatbot."),
        ("Nhân viên (STAFF)", "Người dùng nội bộ chịu trách nhiệm xác nhận tiền mặt, quản lý điểm tham quan và cập nhật kho kiến thức."),
        ("Quản trị viên (ADMIN)", "Người dùng đặc quyền cao nhất: tạo tài khoản nhân viên, kiểm tra nhật ký và giám sát hệ thống."),
        ("Cổng thanh toán", "Hệ thống bên thứ ba nhận yêu cầu trả phí và gửi webhook thông báo kết quả giao dịch."),
        ("Dịch vụ Dịch thuật & TTS", "Dịch vụ bên ngoài hỗ trợ pipeline tạo tự động nội dung văn bản và tệp âm thanh giọng đọc."),
        ("Dịch vụ AI (Embedding & LLM)", "Mô hình ngôn ngữ phục vụ tìm kiếm ngữ cảnh và tạo câu trả lời cho phân hệ chatbot.")
    ]
    for a_name, a_desc in actors:
        p1 = tf_act.add_paragraph() if tf_act.paragraphs[0].text else tf_act.paragraphs[0]
        p1.text = f"• {a_name}: "
        p1.font.size = Pt(10)
        p1.font.bold = True
        p1.font.color.rgb = BLUE_MID
        p1.font.name = "Segoe UI"
        
        run = p1.add_run()
        run.text = a_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p1.space_after = Pt(4)

    # Cột phải: Ranh giới hệ thống
    create_card(slide12, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Ranh Giới Hệ Thống (System Boundary)")
    tb_bd = slide12.shapes.add_textbox(Inches(7.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_bd = tb_bd.text_frame
    tf_bd.word_wrap = True
    boundaries = [
        ("Phía Trình Duyệt (Client)", "Chỉ đảm nhận hiển thị bản đồ số Leaflet, định vị GPS thiết bị, giải mã âm thanh và sắp xếp lộ trình từ gói dữ liệu đã tải. Không chứa khóa bảo mật hay logic xác thực."),
        ("Phía Máy Chủ (Back-end)", "Trung tâm điều phối: xác minh webhook, sinh mã ngắn Redis, cấp phát token, phân quyền người dùng, đóng gói dữ liệu bundle và lưu trữ cơ sở dữ liệu MySQL."),
        ("Kết Nối Dịch Vụ Ngoài", "Tất cả giao tiếp với cổng thanh toán, dịch thuật, TTS và trí tuệ nhân tạo đều đi qua lớp Adapter riêng biệt để dễ dàng kiểm thử và thay thế."),
        ("Tính Khép Kín Dữ Liệu", "Dữ liệu địa điểm, tọa độ, bản dịch và kho kiến thức được lưu trữ tập trung tại máy chủ, không phụ thuộc vào hạ tầng mạng cục bộ tại chùa.")
    ]
    for b_title, b_desc in boundaries:
        p1 = tf_bd.add_paragraph() if tf_bd.paragraphs[0].text else tf_bd.paragraphs[0]
        p1.text = f"• {b_title}: "
        p1.font.size = Pt(10.5)
        p1.font.bold = True
        p1.font.color.rgb = TEAL
        p1.font.name = "Segoe UI"
        
        run = p1.add_run()
        run.text = b_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p1.space_after = Pt(8)

    # ==================== SLIDE 13: MÔ HÌNH 18 USE CASES TỔNG QUÁT ====================
    slide13 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide13)
    add_header(slide13, "CHƯƠNG 3: PHÂN TÍCH", "Mô Hình 18 Use Cases Và Bảng Đối Chiếu", "Bao quát toàn diện các chức năng nghiệp vụ của du khách và công tác quản trị")
    add_footer(slide13, 13)

    # 3 Khối Use Case: Du khách (8 UC), Nghiệp vụ quản trị (6 UC), Hệ thống & Bảo mật (4 UC)
    uc_groups = [
        ("Phân Hệ Du Khách (8 Use Cases)", [
            "UC-01: Thanh toán trực tuyến",
            "UC-02: Thanh toán tiền mặt tại quầy",
            "UC-03: Xem bản đồ và thông tin điểm tham quan",
            "UC-04: Lựa chọn ngôn ngữ tham quan",
            "UC-05: Nghe thuyết minh thủ công",
            "UC-06: Nghe thuyết minh tự động theo tọa độ GPS",
            "UC-07: Lựa chọn và tùy chỉnh lộ trình",
            "UC-08: Hỏi đáp thông tin với trợ lý RAG"
        ]),
        ("Phân Hệ Quản Trị Vận Hành (6 Use Cases)", [
            "UC-11: Xác nhận thanh toán tiền mặt và cấp mã",
            "UC-12: Hỗ trợ cấp lại token phiên tham quan",
            "UC-13: Quản lý điểm tham quan và nội dung đa ngôn ngữ",
            "UC-14: Quản lý và thiết lập lộ trình mẫu",
            "UC-15: Quản lý tài liệu và kho kiến thức hỏi đáp",
            "UC-18: Giám sát sức khỏe dịch vụ và thống kê sử dụng"
        ]),
        ("Phân Hệ Xác Thực & Bảo Mật (4 Use Cases)", [
            "UC-09: Đăng nhập nội bộ nhân viên và quản trị",
            "UC-10: Đăng xuất an toàn và hủy phiên truy cập",
            "UC-16: Quản trị viên khởi tạo tài khoản nhân viên",
            "UC-17: Tra cứu và kiểm tra nhật ký kiểm toán hệ thống"
        ])
    ]
    for idx, (grp_name, uc_items) in enumerate(uc_groups):
        left = Inches(0.8 + idx * 4.0)
        top = Inches(1.8)
        w = Inches(3.7)
        h = Inches(4.9)
        create_card(slide13, left, top, w, h, title=grp_name)
        tb = slide13.shapes.add_textbox(left + Inches(0.15), top + Inches(0.6), w - Inches(0.3), Inches(4.1))
        tf = tb.text_frame
        tf.word_wrap = True
        for item in uc_items:
            p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p.text = item
            p.font.size = Pt(10)
            p.font.color.rgb = DARK_TEXT
            p.font.name = "Segoe UI"
            p.space_after = Pt(6)

    # ==================== SLIDE 14: ĐẶC TẢ USE CASE DU KHÁCH (UC-01 ĐẾN UC-06) ====================
    slide14 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide14)
    add_header(slide14, "CHƯƠNG 3: PHÂN TÍCH", "Đặc Tả Chi Tiết: Thanh Toán Và Xem Bản Đồ", "Trình bày luồng xử lý và chèn sơ đồ Use Case UC-03 Xem bản đồ và điểm tham quan")
    add_footer(slide14, 14)

    # Cột trái: Bảng luồng xử lý UC-01 & UC-02
    create_card(slide14, Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.9), title="Luồng Xử Lý Thanh Toán (UC-01 & UC-02)")
    tb_flow = slide14.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(5.4), Inches(4.1))
    tf_flow = tb_flow.text_frame
    tf_flow.word_wrap = True
    flow_steps = [
        ("1. Khởi tạo phiên", "Khách chọn hình thức trả phí. Hệ thống tạo phiên tham quan ở trạng thái chờ xác nhận."),
        ("2. Thanh toán trực tuyến (UC-01)", "Khách thanh toán qua cổng; cổng gửi webhook. Máy chủ xác minh chữ ký và chuyển trạng thái sang đã thanh toán."),
        ("3. Thanh toán tiền mặt (UC-02)", "Khách đưa tiền cho nhân viên; nhân viên bấm xác nhận; máy chủ tạo mã ngắn 6 ký tự lưu trên Redis."),
        ("4. Đổi mã lấy Token", "Khách nhập mã ngắn; máy chủ kiểm tra Redis, đánh dấu đã dùng và cấp token JWT phiên tham quan."),
        ("5. Bắt đầu phiên tham quan", "Token được lưu tại trình duyệt; các yêu cầu sau đó sử dụng token này để lấy dữ liệu di tích.")
    ]
    for s_title, s_desc in flow_steps:
        p1 = tf_flow.add_paragraph() if tf_flow.paragraphs[0].text else tf_flow.paragraphs[0]
        p1.text = s_title
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = BLUE_MID
        
        p2 = tf_flow.add_paragraph()
        p2.text = s_desc
        p2.font.size = Pt(10)
        p2.font.color.rgb = DARK_TEXT
        p2.space_after = Pt(4)

    # Cột phải: Chèn sơ đồ Use Case UC-03
    create_card(slide14, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.9), title="Sơ Đồ Use Case UC-03")
    uc03_img = os.path.join(diagram_dir, "UC-03_Use-Case.png")
    if os.path.exists(uc03_img):
        slide14.shapes.add_picture(uc03_img, Inches(7.1), Inches(2.5), width=Inches(5.2))
    tb_cap = slide14.shapes.add_textbox(Inches(7.1), Inches(5.2), Inches(5.2), Inches(1.2))
    tf_cap = tb_cap.text_frame
    tf_cap.word_wrap = True
    p_c = tf_cap.paragraphs[0]
    p_c.text = "Sơ đồ tương tác UC-03: Khách tham quan tải gói dữ liệu bundle, cấp quyền GPS thiết bị và tương tác chọn điểm tham quan trên bản đồ Leaflet."
    p_c.font.size = Pt(10)
    p_c.font.color.rgb = MUTED_TEXT

    # ==================== SLIDE 15: SƠ ĐỒ HOẠT ĐỘNG THUYẾT MINH TỰ ĐỘNG GPS (UC-06) ====================
    slide15 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide15)
    add_header(slide15, "CHƯƠNG 3: PHÂN TÍCH", "Sơ Đồ Hoạt Động Thuyết Minh Tự Động (UC-06)", "Quy trình tính toán khoảng cách GPS và thuật toán kích hoạt âm thanh chống phát lặp")
    add_footer(slide15, 15)

    # Chèn ảnh sơ đồ UC-06 Activity bên trái
    uc06_act = os.path.join(diagram_dir, "UC-06_Activity.png")
    if os.path.exists(uc06_act):
        slide15.shapes.add_picture(uc06_act, Inches(0.8), Inches(1.8), height=Inches(4.9))

    # Cột phải: Phân tích thuật toán và quy tắc logic
    create_card(slide15, Inches(5.0), Inches(1.8), Inches(7.5), Inches(4.9), title="Thuật Toán Kích Hoạt Âm Thanh Tọa Độ GPS")
    tb_algo = slide15.shapes.add_textbox(Inches(5.2), Inches(2.4), Inches(7.1), Inches(4.1))
    tf_algo = tb_algo.text_frame
    tf_algo.word_wrap = True
    algo_steps = [
        ("Kích hoạt phiên tham quan", "Khách bấm nút 'Bắt đầu tham quan' trên giao diện nhằm mở khóa chính sách phát âm thanh tự động của trình duyệt di động."),
        ("Lắng nghe vị trí thiết bị", "Hàm navigator.geolocation.watchPosition liên tục nhận tọa độ vĩ độ và kinh độ mới của du khách."),
        ("Tính khoảng cách Haversine", "Giao diện dùng công thức Haversine tính toán khoảng cách giữa vị trí hiện tại với tất cả các điểm di tích trong gói bundle."),
        ("Kiểm tra bán kính 50 mét", "Lọc các điểm có khoảng cách nhỏ hơn hoặc bằng 50m. Nếu có nhiều điểm thỏa mãn, ưu tiên chọn điểm gần nhất."),
        ("Kiểm tra trạng thái phát", "Nếu điểm chưa được phát trong lượt này và không có âm thanh khác đang chạy, tiến hành phát audio."),
        ("Ngưỡng rời vùng 75 mét", "Sau khi đã phát, chỉ đặt lại trạng thái để phát lại khi khách di chuyển ra xa hơn 75m (1.5 lần bán kính kích hoạt) rồi quay lại.")
    ]
    for a_title, a_desc in algo_steps:
        p = tf_algo.add_paragraph() if tf_algo.paragraphs[0].text else tf_algo.paragraphs[0]
        p.text = f"• {a_title}: "
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = BLUE_MID
        
        run = p.add_run()
        run.text = a_desc
        run.font.bold = False
        run.font.color.rgb = DARK_TEXT
        p.space_after = Pt(4)

    # ==================== SLIDE 16: PHÂN HỆ ĐA NGÔN NGỮ & HỎI ĐÁP RAG (UC-04 & UC-08) ====================
    slide16 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide16)
    add_header(slide16, "CHƯƠNG 3: PHÂN TÍCH", "Đa Ngôn Ngữ Và Trợ Lý Hỏi Đáp (UC-04 & UC-08)", "Cơ chế phân phối gói dữ liệu độc lập và quy trình xử lý câu hỏi có kiểm chứng")
    add_footer(slide16, 16)

    # Bên trái: UC-04 và ảnh sơ đồ
    create_card(slide16, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), title="UC-04: Tải Gói Dữ Liệu Theo Ngôn Ngữ")
    uc04_img = os.path.join(diagram_dir, "UC-04_Use-Case.png")
    if os.path.exists(uc04_img):
        slide16.shapes.add_picture(uc04_img, Inches(1.0), Inches(2.4), width=Inches(5.3))
    tb_u4 = slide16.shapes.add_textbox(Inches(1.0), Inches(4.5), Inches(5.3), Inches(2.0))
    tf_u4 = tb_u4.text_frame
    tf_u4.word_wrap = True
    u4_points = [
        "Du khách chọn ngôn ngữ mong muốn từ menu góc phải.",
        "Máy chủ kiểm tra phiên vé và đóng gói toàn bộ POI, bản dịch và đường dẫn audio tương ứng.",
        "Nếu thiếu dữ liệu ngôn ngữ yêu cầu, tự động áp dụng cơ chế chuyển đổi dự phòng sang tiếng Anh hoặc tiếng Việt."
    ]
    for pt in u4_points:
        p = tf_u4.add_paragraph() if tf_u4.paragraphs[0].text else tf_u4.paragraphs[0]
        p.text = f"• {pt}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.space_after = Pt(3)

    # Bên phải: UC-08 và ảnh sơ đồ
    create_card(slide16, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), title="UC-08: Hỏi Đáp Bằng Trí Tuệ Nhân Tạo RAG")
    uc08_img = os.path.join(diagram_dir, "UC-08_Use-Case.png")
    if os.path.exists(uc08_img):
        slide16.shapes.add_picture(uc08_img, Inches(7.0), Inches(2.4), width=Inches(5.3))
    tb_u8 = slide16.shapes.add_textbox(Inches(7.0), Inches(4.5), Inches(5.3), Inches(2.0))
    tf_u8 = tb_u8.text_frame
    tf_u8.word_wrap = True
    u8_points = [
        "Khách gửi câu hỏi; máy chủ chuyển câu hỏi thành vector biểu diễn ngữ nghĩa.",
        "Hệ thống tìm kiếm các đoạn tài liệu tương đồng nhất trong kho kiến thức Chùa Linh Ứng.",
        "Mô hình ngôn ngữ tổng hợp câu trả lời kèm theo trích dẫn nguồn văn bản xác thực.",
        "Tuyệt đối từ chối trả lời nếu câu hỏi nằm ngoài phạm vi kiến thức được duyệt."
    ]
    for pt in u8_points:
        p = tf_u8.add_paragraph() if tf_u8.paragraphs[0].text else tf_u8.paragraphs[0]
        p.text = f"• {pt}"
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT
        p.space_after = Pt(3)

    # ==================== SLIDE 17: PHÂN HỆ QUẢN TRỊ & VẬN HÀNH (UC-09 ĐẾN UC-18) ====================
    slide17 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide17)
    add_header(slide17, "CHƯƠNG 3: PHÂN TÍCH", "Đặc Tả Phân Hệ Quản Trị Và Vận Hành", "Quy trình xác thực nội bộ, quản trị điểm tham quan và theo dõi hoạt động")
    add_footer(slide17, 17)

    admin_features = [
        ("Xác Thực & Quản Lý Phiên (UC-09, 10, 16)", [
            "Chỉ có 2 vai trò nội bộ: Nhân viên (STAFF) và Quản trị viên (ADMIN).",
            "Chỉ có ADMIN mới có quyền tạo tài khoản STAFF; không mở đăng ký tự do.",
            "Khóa tài khoản 15 phút sau 5 lần nhập sai; xoay vòng refresh token bảo mật.",
            "Đăng xuất an toàn lập tức hủy token và vô hiệu hóa phiên làm việc."
        ]),
        ("Quản Trị Dữ Liệu Tham Quan (UC-13, 14)", [
            "STAFF và ADMIN tạo mới, cập nhật tọa độ, bán kính và nội dung đọc của POI.",
            "Lưu nội dung tiếng Việt tự động kích hoạt tiến trình dịch và sinh âm thanh.",
            "Thiết lập danh sách và thứ tự các điểm tham quan trong tour mẫu.",
            "Ẩn điểm di tích khi cần bảo trì; điểm bị ẩn không xuất hiện trong bundle."
        ]),
        ("Quản Lý Kho Tri Thức (UC-15)", [
            "Cập nhật tài liệu văn hóa lịch sử chính thống về Chùa Linh Ứng.",
            "Hệ thống tự động phân tách tài liệu thành các đoạn văn bản có kích thước chuẩn.",
            "Tạo vector nhúng và cập nhật chỉ mục tìm kiếm phục vụ trợ lý RAG.",
            "Ngừng sử dụng tài liệu lập tức loại bỏ các đoạn văn bản khỏi truy hồi."
        ]),
        ("Nhật Ký & Giám Sát (UC-17, 18)", [
            "Ghi nhật ký kiểm toán cho mọi thao tác nhạy cảm: thu tiền, đổi dữ liệu, cấp tài khoản.",
            "Nhật ký lưu trữ bất biến: không thể sửa hoặc xóa qua bất kỳ giao diện nào.",
            "Bảng điều khiển giám sát sức khỏe dịch vụ và số liệu thống kê thời gian thực.",
            "Thống kê riêng biệt: số phiên vé hợp lệ, tổng doanh thu và lượt hỏi chatbot."
        ])
    ]
    for idx, (title, items) in enumerate(admin_features):
        r = idx // 2
        c = idx % 2
        left = Inches(0.8 + c * 6.0)
        top = Inches(1.8 + r * 2.5)
        w = Inches(5.7)
        h = Inches(2.3)
        create_card(slide17, left, top, w, h, title=title)
        tb = slide17.shapes.add_textbox(left + Inches(0.15), top + Inches(0.55), w - Inches(0.3), h - Inches(0.65))
        tf = tb.text_frame
        tf.word_wrap = True
        for item in items:
            p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p.text = f"• {item}"
            p.font.size = Pt(9.5)
            p.font.color.rgb = DARK_TEXT
            p.space_after = Pt(2)

    # ==================== SLIDE 18: KIẾN TRÚC TỔNG THỂ & CÔNG NGHỆ (CHƯƠNG 4) ====================
    slide18 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide18)
    add_header(slide18, "CHƯƠNG 4: THIẾT KẾ", "Kiến Trúc Tổng Thể Và Công Nghệ Sử Dụng", "Mô hình kiến trúc phân tầng chịu tải và danh mục công nghệ lựa chọn")
    add_footer(slide18, 18)

    # 4 Tầng kiến trúc: Trình duyệt -> Cổng API -> Kho lưu trữ -> Dịch vụ ngoài
    layers = [
        ("Tầng Giao Diện (Client Demo)", "Trang web ứng dụng đơn Leaflet, OpenStreetMap, HTML5 Geolocation, Audio API. Chạy mượt mà trên Safari/Chrome điện thoại."),
        ("Tầng Ứng Dụng (Node.js Back-end)", "Framework Express, kiến trúc 3 lớp Router-Service-Store, các Middleware xác thực JWT, phân quyền vai trò và xử lý lỗi tập trung."),
        ("Tầng Dữ Liệu (Data Storage)", "MySQL 8 làm cơ sở dữ liệu quan hệ lưu trữ dữ liệu kinh doanh chính thống; Redis 7 làm kho bộ nhớ đệm và quản lý mã ngắn tạm thời."),
        ("Tầng Dịch Vụ Ngoài (Adapters)", "PaymentGateway mô phỏng thanh toán, TranslationAdapter dịch thuật, TTSAdapter tạo giọng đọc và AIAdapter kết nối mô hình ngôn ngữ.")
    ]
    for idx, (l_title, l_desc) in enumerate(layers):
        top = Inches(1.8 + idx * 1.25)
        create_card(slide18, Inches(0.8), top, Inches(11.733), Inches(1.1))
        
        # Nhãn tầng
        badge = slide18.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top + Inches(0.2), Inches(2.8), Inches(0.7))
        badge.fill.solid()
        badge.fill.fore_color.rgb = BLUE_MID
        badge.line.fill.background()
        p_bg = badge.text_frame.paragraphs[0]
        p_bg.text = l_title
        p_bg.font.size = Pt(11)
        p_bg.font.bold = True
        p_bg.font.color.rgb = RGBColor(255, 255, 255)
        p_bg.alignment = PP_ALIGN.CENTER

        tb = slide18.shapes.add_textbox(Inches(4.0), top + Inches(0.15), Inches(8.3), Inches(0.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = l_desc
        p.font.size = Pt(11)
        p.font.color.rgb = DARK_TEXT
        p.font.name = "Segoe UI"

    # ==================== SLIDE 19: KIẾN TRÚC BACK-END 3 LỚP (CHƯƠNG 4) ====================
    slide19 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide19)
    add_header(slide19, "CHƯƠNG 4: THIẾT KẾ", "Thiết Kế Kiến Trúc Back-end Ba Lớp", "Phân định nghiêm ngặt trách nhiệm giữa Router, Service và Store")
    add_footer(slide19, 19)

    layers_3 = [
        ("Lớp Định Tuyến (ROUTER)", "Tiếp nhận yêu cầu HTTP", [
            "Tiếp nhận request từ client, kiểm tra định dạng dữ liệu đầu vào (Validation Schema).",
            "Gọi phương thức xử lý tương ứng từ lớp Service.",
            "Đóng gói kết quả và trả về HTTP Status Code (200, 201, 400, 401, 403, 404, 500).",
            "Nguyên tắc: Tuyệt đối không chứa logic nghiệp vụ và không viết truy vấn cơ sở dữ liệu."
        ]),
        ("Lớp Nghiệp Vụ (SERVICE)", "Trung tâm xử lý logic", [
            "Thực hiện toàn bộ quy tắc nghiệp vụ: kiểm tra hạn vé, chống phát lặp, điều phối pipeline.",
            "Tính toán khoảng cách, đóng gói bundle dữ liệu tham quan.",
            "Điều phối giao dịch đa bảng và gọi các bộ điều hợp dịch vụ ngoài (Adapters).",
            "Nguyên tắc: Không trực tiếp gọi driver kết nối cơ sở dữ liệu hoặc xử lý HTTP."
        ]),
        ("Lớp Lưu Trữ (STORE)", "Truy xuất cơ sở dữ liệu", [
            "Đóng gói toàn bộ câu lệnh truy vấn SQL tương tác với MySQL.",
            "Tương tác với Redis để quản lý mã ngắn và bộ đếm giới hạn truy cập.",
            "Quản lý giao dịch dữ liệu (Transaction Commit / Rollback) đảm bảo tính toàn vẹn.",
            "Nguyên tắc: Chỉ chịu trách nhiệm lưu trữ và truy hồi dữ liệu, không quyết định nghiệp vụ."
        ])
    ]
    for idx, (name, role, details) in enumerate(layers_3):
        left = Inches(0.8 + idx * 4.0)
        top = Inches(1.8)
        w = Inches(3.7)
        h = Inches(4.9)
        create_card(slide19, left, top, w, h)

        # Header card
        h_box = slide19.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, w, Inches(0.9))
        h_box.fill.solid()
        h_box.fill.fore_color.rgb = NAVY if idx == 1 else BLUE_MID
        h_box.line.fill.background()
        
        tf_h = h_box.text_frame
        p_h1 = tf_h.paragraphs[0]
        p_h1.text = name
        p_h1.font.size = Pt(12)
        p_h1.font.bold = True
        p_h1.font.color.rgb = RGBColor(255, 255, 255)
        p_h1.alignment = PP_ALIGN.CENTER
        
        p_h2 = tf_h.add_paragraph()
        p_h2.text = role
        p_h2.font.size = Pt(10)
        p_h2.font.color.rgb = RGBColor(203, 213, 225)
        p_h2.alignment = PP_ALIGN.CENTER

        tb = slide19.shapes.add_textbox(left + Inches(0.15), top + Inches(1.05), w - Inches(0.3), Inches(3.7))
        tf = tb.text_frame
        tf.word_wrap = True
        for d in details:
            p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p.text = f"• {d}"
            p.font.size = Pt(10)
            p.font.color.rgb = DARK_TEXT
            p.space_after = Pt(8)

    # ==================== SLIDE 20: THIẾT KẾ THÀNH PHẦN (COMPONENT DESIGN) (CHƯƠNG 4) ====================
    slide20 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide20)
    add_header(slide20, "CHƯƠNG 4: THIẾT KẾ", "Thiết Kế Thành Phần Phần Mềm (Component Design)", "Cấu trúc module hóa độc lập, giao tiếp lỏng lẻo thông qua giao diện dịch vụ")
    add_footer(slide20, 20)

    components = [
        ("AuthComponent", "Quản lý định danh nhân viên, cấp phát JWT, xoay vòng refresh token, khóa tài khoản tạm thời và ghi nhận nhật ký đăng nhập."),
        ("TouristComponent", "Tiếp nhận quét QR, phối hợp thanh toán trực tuyến hoặc tiền mặt, sinh mã ngắn Redis và cấp token phiên vé du khách."),
        ("ContentComponent", "Quản lý danh mục điểm tham quan, lưu trữ bài viết đa ngôn ngữ và tạo gói dữ liệu bundle độc lập phục vụ du khách."),
        ("AudioPipelineComponent", "Tiếp nhận sự kiện cập nhật nội dung, điều phối tiến trình dịch thuật nền và tạo âm thanh giọng đọc tự động."),
        ("RouteComponent", "Cung cấp danh mục lộ trình tham quan mẫu, hỗ trợ du khách tùy biến thêm bớt điểm và tối ưu hóa thứ tự ghé thăm."),
        ("RagComponent", "Quản lý tài liệu tri thức, phân đoạn văn bản, tạo chỉ mục vector ngữ nghĩa và điều phối hỏi đáp trí tuệ nhân tạo."),
        ("MonitoringComponent", "Thu thập số liệu phiên tham quan thực tế, kiểm tra trạng thái sống của dịch vụ và cung cấp dữ liệu báo cáo vận hành.")
    ]
    # Trình bày dạng lưới các card
    for idx, (c_name, c_desc) in enumerate(components):
        if idx < 4:
            left = Inches(0.8 + idx * 2.98)
            top = Inches(1.8)
            w = Inches(2.8)
            h = Inches(2.35)
        else:
            left = Inches(0.8 + (idx - 4) * 3.98)
            top = Inches(4.35)
            w = Inches(3.8)
            h = Inches(2.35)

        create_card(slide20, left, top, w, h, title=c_name)
        tb = slide20.shapes.add_textbox(left + Inches(0.15), top + Inches(0.55), w - Inches(0.3), h - Inches(0.65))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = c_desc
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT

    # ==================== SLIDE 21: THIẾT KẾ CƠ SỞ DỮ LIỆU - 3 PHÂN HỆ VÀ 16 BẢNG (CHƯƠNG 4) ====================
    slide21 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide21)
    add_header(slide21, "CHƯƠNG 4: THIẾT KẾ", "Thiết Kế Cơ Sở Dữ Liệu: 3 Phân Hệ Và 16 Bảng", "Cấu trúc dữ liệu chuẩn hóa, phân vùng logic rõ ràng và quan hệ toàn vẹn")
    add_footer(slide21, 21)

    db_subsystems = [
        ("Phân Hệ 1: Tài Khoản & Vé", [
            ("USERS", "Tài khoản nhân viên và quản trị viên."),
            ("REFRESH_TOKENS", "Lưu trữ băm token gia hạn an toàn."),
            ("AUDIT_LOGS", "Nhật ký kiểm toán thao tác bất biến."),
            ("VISIT_SESSIONS", "Phiên tham quan 24 giờ của du khách."),
            ("PAYMENTS", "Giao dịch thanh toán online / tiền mặt."),
            ("BUNDLE_ACCESS_LOGS", "Nhật ký tải gói bundle của du khách.")
        ]),
        ("Phân Hệ 2: Nội Dung & Tour", [
            ("LANGUAGES", "Danh mục 15 ngôn ngữ hỗ trợ."),
            ("POIS", "Điểm tham quan, tọa độ, bán kính."),
            ("POI_TRANSLATIONS", "Bản dịch văn bản theo từng ngôn ngữ."),
            ("AUDIOS", "Đường dẫn tệp âm thanh thuyết minh."),
            ("CONTENT_JOBS", "Tác vụ dịch và tạo audio nền."),
            ("TOURS", "Danh mục lộ trình tham quan mẫu."),
            ("TOUR_POIS", "Thứ tự các điểm trong từng tour.")
        ]),
        ("Phân Hệ 3: Kho Tri Thức RAG", [
            ("KNOWLEDGE_DOCUMENTS", "Tài liệu văn hóa lịch sử gốc."),
            ("KNOWLEDGE_CHUNKS", "Các đoạn văn bản đã phân tách."),
            ("CHAT_LOGS", "Lịch sử câu hỏi và câu trả lời.")
        ])
    ]
    for idx, (s_title, tbls) in enumerate(db_subsystems):
        left = Inches(0.8 + idx * 4.0)
        top = Inches(1.8)
        w = Inches(3.7)
        h = Inches(4.9)
        create_card(slide21, left, top, w, h, title=s_title)
        tb = slide21.shapes.add_textbox(left + Inches(0.15), top + Inches(0.55), w - Inches(0.3), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True
        for t_name, t_purpose in tbls:
            p1 = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p1.text = t_name
            p1.font.size = Pt(10)
            p1.font.bold = True
            p1.font.color.rgb = BLUE_MID
            
            p2 = tf.add_paragraph()
            p2.text = t_purpose
            p2.font.size = Pt(9.5)
            p2.font.color.rgb = DARK_TEXT
            p2.space_after = Pt(3)

    # ==================== SLIDE 22: QUY TẮC TOÀN VẸN DỮ LIỆU & GIAO DỊCH (CHƯƠNG 4) ====================
    slide22 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide22)
    add_header(slide22, "CHƯƠNG 4: THIẾT KẾ", "Quy Tắc Toàn Vẹn Dữ Liệu Và Giao Dịch", "Đảm bảo tính nhất quán nghiệp vụ và kiểm soát đồng thời tại máy chủ")
    add_footer(slide22, 22)

    integrity_rules = [
        ("Toàn Vẹn Giao Dịch Thanh Toán", "Kích hoạt phiên tham quan và ghi nhận thanh toán bắt buộc thực hiện trong cùng một giao dịch cơ sở dữ liệu. Nhận webhook lặp tuyệt đối không cộng dồn doanh thu."),
        ("Toàn Vẹn Quyền Hạn Tham Quan", "Kiểm tra đồng thời trạng thái phiên, thời điểm hết hạn và giá trị băm token. Token hết hạn lập tức bị từ chối quyền truy cập API nội dung."),
        ("Độc Nhất Dữ Liệu Đa Ngôn Ngữ", "Mỗi cặp POI và mã ngôn ngữ là duy nhất. Bộ ba POI, ngôn ngữ và phiên bản trong CONTENT_JOBS là duy nhất; tác vụ cũ không ghi đè dữ liệu mới."),
        ("Toàn Vẹn Lộ Trình Tham Quan", "Một điểm tham quan không thể xuất hiện nhiều lần trong cùng một tour; thứ tự các điểm được cập nhật nguyên tử trong giao dịch."),
        ("Bảo Vệ Dữ Liệu Lịch Sử", "Các bảng thanh toán và phiên tham quan áp dụng ON DELETE RESTRICT để chống xóa nhầm dữ liệu đối soát; chỉ cho phép vô hiệu hóa bằng trạng thái."),
        ("Kiểm Soát Thao Tác Đồng Thời", "Các thao tác xác nhận tiền mặt, nhận tác vụ nền hoặc đổi mã ngắn đều được kiểm tra trạng thái và cập nhật nguyên tử để tránh xử lý trùng lặp.")
    ]
    for idx, (rule_title, rule_desc) in enumerate(integrity_rules):
        r = idx // 2
        c = idx % 2
        left = Inches(0.8 + c * 6.0)
        top = Inches(1.8 + r * 1.65)
        w = Inches(5.7)
        h = Inches(1.5)
        create_card(slide22, left, top, w, h, title=rule_title)
        tb = slide22.shapes.add_textbox(left + Inches(0.15), top + Inches(0.45), w - Inches(0.3), Inches(0.95))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = rule_desc
        p.font.size = Pt(10)
        p.font.color.rgb = DARK_TEXT

    # ==================== SLIDE 23: HIỆN TRẠNG THỰC TẾ & KẾ HOẠCH HOÀN THIỆN ====================
    slide23 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide23)
    add_header(slide23, "TỔNG KẾT", "Hiện Trạng Đồ Án Và Kế Hoạch Triển Khai Tiếp Theo", "Báo cáo trung thực tiến độ đạt được và lộ trình hiện thực hóa các chương tiếp theo")
    add_footer(slide23, 23)

    # Cột trái: Đã hoàn thành chuẩn chỉnh
    c_done = create_card(slide23, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Nội Dung Đã Hoàn Thành Chuẩn Chỉnh")
    tb_dn = slide23.shapes.add_textbox(Inches(1.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_dn = tb_dn.text_frame
    tf_dn.word_wrap = True
    done_items = [
        "Hoàn thiện 100% hồ sơ Chương 1: Bối cảnh nghiệp vụ Chùa Linh Ứng, mục tiêu, yêu cầu BR-01..BR-09, phạm vi và ràng buộc kỹ thuật.",
        "Hoàn thiện 100% hồ sơ Chương 2 (PRD): User Stories chi tiết kèm tiêu chuẩn AC, quy tắc nghiệp vụ, yêu cầu phi chức năng và ma trận nghiệm thu.",
        "Hoàn thiện 100% hồ sơ Chương 3 (Phân tích): Mô hình hóa 18 Use Cases chuẩn mực, đặc tả chi tiết luồng chính/phụ và ma trận truy vết.",
        "Hoàn thiện phần lớn Chương 4 (Thiết kế): Kiến trúc 3 lớp Router-Service-Store, thiết kế component và cơ sở dữ liệu 16 bảng chi tiết.",
        "Mã nguồn hiện tại: Đã xây dựng hoàn chỉnh nền tảng xác thực nội bộ (USERS, REFRESH_TOKENS, AUDIT_LOGS), middleware bảo mật, kiểm thử và Docker CI."
    ]
    for item in done_items:
        p = tf_dn.add_paragraph() if tf_dn.paragraphs[0].text else tf_dn.paragraphs[0]
        p.text = f"✔  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = GREEN_ACCENT
        p.space_after = Pt(6)

    # Cột phải: Kế hoạch triển khai giai đoạn tiếp theo
    c_plan = create_card(slide23, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), title="Kế Hoạch Triển Khai Giai Đoạn Tiếp Theo")
    tb_pl = slide23.shapes.add_textbox(Inches(7.0), Inches(2.4), Inches(5.3), Inches(4.1))
    tf_pl = tb_pl.text_frame
    tf_pl.word_wrap = True
    plan_items = [
        "Xây dựng hệ thống (Chương 5): Thực hiện migration cơ sở dữ liệu cho 13 bảng nghiệp vụ tham quan mới; hiện thực các Service thanh toán, bundle, audio và RAG.",
        "Thiết kế giao diện: Xây dựng trang web demo Leaflet tại /demo và giao diện quản trị, giám sát vận hành.",
        "Kiểm thử & Đánh giá (Chương 6): Viết bộ kiểm thử đơn vị và tích hợp cho luồng đổi mã, tự phát GPS và truy xuất RAG; đo lường tỷ lệ bao phủ mã nguồn.",
        "Triển khai & Vận hành (Chương 7): Hoàn thiện quy trình CD, kịch bản sao lưu phục hồi dữ liệu và hướng dẫn chạy demo trên môi trường thực nghiệm.",
        "Kết luận & Đánh giá (Chương 8): Tổng kết mức độ đáp ứng yêu cầu so với PRD ban đầu và đề xuất hướng phát triển mở rộng."
    ]
    for item in plan_items:
        p = tf_pl.add_paragraph() if tf_pl.paragraphs[0].text else tf_pl.paragraphs[0]
        p.text = f"➔  {item}"
        p.font.size = Pt(10)
        p.font.color.rgb = BLUE_MID
        p.space_after = Pt(6)

    # ==================== SLIDE 24: KẾT THÚC & Q&A ====================
    slide24 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide24, RGBColor(241, 245, 249))

    side_bar24 = slide24.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.6), Inches(7.5))
    side_bar24.fill.solid()
    side_bar24.fill.fore_color.rgb = NAVY
    side_bar24.line.fill.background()

    card_end = slide24.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.5), Inches(5.1))
    card_end.fill.solid()
    card_end.fill.fore_color.rgb = CARD_BG
    card_end.line.color.rgb = CARD_BORDER
    card_end.line.width = Pt(1.5)

    tb_e = slide24.shapes.add_textbox(Inches(2.0), Inches(1.8), Inches(9.5), Inches(3.8))
    tf_e = tb_e.text_frame
    tf_e.word_wrap = True

    p_e1 = tf_e.paragraphs[0]
    p_e1.text = "XIN CHÂN THÀNH CẢM ƠN"
    p_e1.font.size = Pt(30)
    p_e1.font.bold = True
    p_e1.font.color.rgb = NAVY
    p_e1.font.name = "Segoe UI"
    p_e1.alignment = PP_ALIGN.CENTER

    p_e2 = tf_e.add_paragraph()
    p_e2.text = "Thầy Nguyễn Quốc Huy và Hội Đồng Giảng Viên Đã Lắng Nghe Báo Cáo"
    p_e2.font.size = Pt(16)
    p_e2.font.color.rgb = MUTED_TEXT
    p_e2.font.name = "Segoe UI"
    p_e2.alignment = PP_ALIGN.CENTER
    p_e2.space_before = Pt(8)

    p_e3 = tf_e.add_paragraph()
    p_e3.text = "PHẦN HỎI ĐÁP — Q & A"
    p_e3.font.size = Pt(20)
    p_e3.font.bold = True
    p_e3.font.color.rgb = TEAL
    p_e3.font.name = "Segoe UI"
    p_e3.alignment = PP_ALIGN.CENTER
    p_e3.space_before = Pt(24)

    p_e4 = tf_e.add_paragraph()
    p_e4.text = "Nhóm thực hiện: Lê Văn Hiếu — Lê Đức Anh — Dương Gia Phát (Lớp DCT124C1)"
    p_e4.font.size = Pt(13)
    p_e4.font.color.rgb = DARK_TEXT
    p_e4.font.name = "Segoe UI"
    p_e4.alignment = PP_ALIGN.CENTER
    p_e4.space_before = Pt(12)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    out = r"c:\Users\giuag\.gemini\antigravity\scratch\prj_sgu26_cnpm\docs\Bao_Cao_Thuyet_Trinh_Do_An_CNPM.pptx"
    build_presentation(out)
    # Lưu thêm 1 bản tại root để người dùng tiện truy cập ngay
    out_root = r"c:\Users\giuag\.gemini\antigravity\scratch\prj_sgu26_cnpm\Bao_Cao_Thuyet_Trinh_Do_An_CNPM.pptx"
    build_presentation(out_root)
