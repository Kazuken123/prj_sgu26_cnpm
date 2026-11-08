# -*- coding: utf-8 -*-
"""
scripts/generate_clean_dfd_drawio.py
Generate 13 clean, compact, zero-overlap Draw.io XML files for DFD Level 0, Level 1, Level 2, and Level 3.
Complies with compact 1060px canvas width, 12-13px typography, and 100% straight-line non-overlapping connectors.
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

OUT_DIR = "docs/diagram/dfd"
os.makedirs(OUT_DIR, exist_ok=True)

def xml_escape(val):
    if val is None:
        return ""
    return (str(val)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;"))

class DrawioDiagram:
    def __init__(self, diag_id, name, width=1060, height=720):
        self.diag_id = diag_id
        self.name = name
        self.width = width
        self.height = height
        self.cells = []
        self.cell_index = 2
        self.nodes = {}

    def add_title(self, text):
        cid = "title"
        style = ("text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;"
                 "fontFamily=Arial;fontSize=15;fontStyle=1;fillColor=none;strokeColor=none;fontColor=#111827;")
        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" vertex="1">\n'
            f'  <mxGeometry x="30" y="20" width="{self.width - 60}" height="40" as="geometry" />\n'
            f'</mxCell>'
        )

    def add_actor(self, cid, text, x, y, w, h):
        style = ("rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;"
                 "strokeWidth=2;fontFamily=Arial;fontSize=13;fontStyle=1;fontColor=#111827;align=center;")
        self.nodes[cid] = (x, y, w, h)
        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" vertex="1">\n'
            f'  <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n'
            f'</mxCell>'
        )

    def add_process(self, cid, text, x, y, w, h):
        style = ("rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#374151;"
                 "strokeWidth=1.8;fontFamily=Arial;fontSize=13;fontColor=#111827;align=center;")
        self.nodes[cid] = (x, y, w, h)
        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" vertex="1">\n'
            f'  <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n'
            f'</mxCell>'
        )

    def add_store(self, cid, text, x, y, w, h):
        style = ("shape=partialRectangle;whiteSpace=wrap;html=1;left=1;right=0;top=1;bottom=1;"
                 "fillColor=#F9FAFB;strokeColor=#374151;strokeWidth=1.8;fontFamily=Arial;fontSize=12;"
                 "fontColor=#111827;align=left;spacingLeft=10;")
        self.nodes[cid] = (x, y, w, h)
        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" vertex="1">\n'
            f'  <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n'
            f'</mxCell>'
        )

    def add_horizontal_arrow(self, cid, src_id, tgt_id, y_line, text):
        if src_id not in self.nodes or tgt_id not in self.nodes:
            raise ValueError(f"Unknown node {src_id} or {tgt_id}")
        x1, y1, w1, h1 = self.nodes[src_id]
        x2, y2, w2, h2 = self.nodes[tgt_id]

        if x1 < x2:
            exitX = 1.0
            entryX = 0.0
        else:
            exitX = 0.0
            entryX = 1.0

        exitY = round((y_line - y1) / float(h1), 4)
        entryY = round((y_line - y2) / float(h2), 4)

        style = (f"edgeStyle=none;rounded=0;html=1;exitX={exitX};exitY={exitY};entryX={entryX};entryY={entryY};"
                 f"strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;fontFamily=Arial;"
                 f"fontSize=12;fontColor=#111827;labelBackgroundColor=#FFFFFF;")

        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" edge="1" source="{src_id}" target="{tgt_id}">\n'
            f'  <mxGeometry relative="1" as="geometry" />\n'
            f'</mxCell>'
        )

    def add_vertical_arrow(self, cid, src_id, tgt_id, text):
        if src_id not in self.nodes or tgt_id not in self.nodes:
            raise ValueError(f"Unknown node {src_id} or {tgt_id}")

        style = ("edgeStyle=none;rounded=0;html=1;exitX=0.5;exitY=1;entryX=0.5;entryY=0;"
                 "strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;fontFamily=Arial;"
                 "fontSize=12;fontColor=#111827;labelBackgroundColor=#FFFFFF;")

        self.cells.append(
            f'<mxCell id="{cid}" parent="1" style="{style}" value="{xml_escape(text)}" edge="1" source="{src_id}" target="{tgt_id}">\n'
            f'  <mxGeometry relative="1" as="geometry" />\n'
            f'</mxCell>'
        )

    def to_xml(self):
        cells_xml = "\n        ".join(self.cells)
        return (
            f"<?xml version='1.0' encoding='utf-8'?>\n"
            f'<mxfile host="app.diagrams.net" agent="Antigravity" version="24.7.17">\n'
            f'  <diagram id="{self.diag_id}" name="{xml_escape(self.name)}">\n'
            f'    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" '
            f'arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.width}" pageHeight="{self.height}" math="0" shadow="0">\n'
            f'      <root>\n'
            f'        <mxCell id="0" />\n'
            f'        <mxCell id="1" parent="0" />\n'
            f'        {cells_xml}\n'
            f'      </root>\n'
            f'    </mxGraphModel>\n'
            f'  </diagram>\n'
            f'</mxfile>\n'
        )

    def save(self, filepath):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(self.to_xml())
        print(f"Generated: {filepath} ({self.width}x{self.height})")


# ----------------------------------------------------------------------------------
# DIAGRAM 1: DFD Level 0 Context
# ----------------------------------------------------------------------------------
def build_dfd_level_0():
    d = DrawioDiagram("dfd_level_0", "DFD Mức 0 Ngữ cảnh", width=1060, height=730)
    d.add_title("SƠ ĐỒ DFD MỨC 0 — NGỮ CẢNH HỆ THỐNG")

    # Center Process
    d.add_process("P0", "<b>0</b><br/><br/>Hệ thống thuyết minh<br/>đa ngôn ngữ<br/>Thảo Cầm Viên Sài Gòn", 410, 100, 250, 570)

    # Left Actors
    d.add_actor("E1", "Khách tham quan", 30, 110, 170, 110)
    d.add_actor("E2", "Nhân viên", 30, 330, 170, 110)
    d.add_actor("E3", "Quản trị viên", 30, 550, 170, 110)

    # Right Actors
    d.add_actor("E4", "Cổng thanh toán", 870, 110, 160, 110)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 870, 330, 160, 110)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 870, 550, 160, 110)

    # Connectors Left
    d.add_horizontal_arrow("f_e1_p0", "E1", "P0", 140, "Yêu cầu thanh toán, mã đổi phiên,<br/>ngôn ngữ, GPS và câu hỏi")
    d.add_horizontal_arrow("f_p0_e1", "P0", "E1", 195, "Thông tin giao dịch, token phiên,<br/>gói bản đồ, âm thanh &amp; trả lời")

    d.add_horizontal_arrow("f_e2_p0", "E2", "P0", 360, "Thông tin đăng nhập, xác nhận tiền mặt,<br/>điểm tham quan, lộ trình và tài liệu")
    d.add_horizontal_arrow("f_p0_e2", "P0", "E2", 415, "Token nội bộ, mã ngắn 6 chữ số,<br/>trạng thái phiên và kết quả cập nhật")

    d.add_horizontal_arrow("f_e3_p0", "E3", "P0", 580, "Thông tin đăng nhập, hồ sơ tạo<br/>nhân viên và bộ lọc giám sát")
    d.add_horizontal_arrow("f_p0_e3", "P0", "E3", 635, "Hồ sơ nhân viên mới, nhật ký<br/>thao tác và báo cáo sức khỏe")

    # Connectors Right
    d.add_horizontal_arrow("f_p0_e4", "P0", "E4", 140, "Yêu cầu khởi tạo giao dịch<br/>thanh toán trực tuyến")
    d.add_horizontal_arrow("f_e4_p0", "E4", "P0", 195, "Thông báo kết quả thanh toán<br/>webhook kèm chữ ký số")

    d.add_horizontal_arrow("f_p0_e5", "P0", "E5", 360, "Văn bản thuyết minh tiếng Việt và<br/>yêu cầu sinh giọng đọc đa ngôn ngữ")
    d.add_horizontal_arrow("f_e5_p0", "E5", "P0", 415, "Bản dịch đa ngôn ngữ và<br/>tệp âm thanh thuyết minh WAV")

    d.add_horizontal_arrow("f_p0_e6", "P0", "E6", 580, "Đoạn tài liệu kiến thức, câu hỏi<br/>truy vấn và ngữ cảnh trích dẫn")
    d.add_horizontal_arrow("f_e6_p0", "E6", "P0", 635, "Vector nhúng và câu trả lời<br/>kèm trích dẫn nguồn")

    d.save(os.path.join(OUT_DIR, "DFD_Level_0_Context.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 2: DFD Level 1 Process 1.0 (Payment & Session)
# ----------------------------------------------------------------------------------
def build_dfd_level_1_p1():
    d = DrawioDiagram("dfd_level_1_p1", "DFD Mức 1 Tiến trình 1.0", width=1060, height=590)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — TIẾN TRÌNH 1.0 QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN")

    # Center Process
    d.add_process("P1", "<b>1.0</b><br/><br/>Quản lý thanh toán<br/>và phiên tham quan", 410, 95, 250, 440)

    # Left Column
    d.add_actor("E1", "Khách tham quan", 30, 110, 170, 110)
    d.add_actor("E2", "Nhân viên", 30, 360, 170, 110)

    # Right Column
    d.add_actor("E4", "Cổng thanh toán", 870, 105, 160, 90)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 245, 160, 90)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 395, 160, 75)

    # Connectors Left
    d.add_horizontal_arrow("f_e1_p1", "E1", "P1", 140, "Yêu cầu tạo phiên<br/>và mã đổi token")
    d.add_horizontal_arrow("f_p1_e1", "P1", "E1", 195, "Thông tin giao dịch<br/>và token phiên")

    d.add_horizontal_arrow("f_e2_p1", "E2", "P1", 390, "Xác nhận thu tiền mặt<br/>và tra cứu phiên")
    d.add_horizontal_arrow("f_p1_e2", "P1", "E2", 445, "Mã ngắn 6 chữ số<br/>và token cấp lại")

    # Connectors Right
    d.add_horizontal_arrow("f_p1_e4", "P1", "E4", 130, "Yêu cầu khởi tạo giao dịch<br/>thanh toán trực tuyến")
    d.add_horizontal_arrow("f_e4_p1", "E4", "P1", 175, "Webhook thông báo kết quả<br/>kèm chữ ký số")

    d.add_horizontal_arrow("f_p1_d2", "P1", "D2", 270, "Ghi phiên, thanh toán<br/>và mã tạm thời")
    d.add_horizontal_arrow("f_d2_p1", "D2", "P1", 315, "Đọc thông tin phiên<br/>và mã xác thực")

    d.add_horizontal_arrow("f_p1_d6", "P1", "D6", 432, "Ghi nhật ký thu tiền<br/>và cấp lại token")

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_P1_Payment_Session.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 3: DFD Level 1 Process 2.0 (Visitor Content & Audio)
# ----------------------------------------------------------------------------------
def build_dfd_level_1_p2():
    d = DrawioDiagram("dfd_level_1_p2", "DFD Mức 1 Tiến trình 2.0", width=1060, height=620)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — TIẾN TRÌNH 2.0 CUNG CẤP NỘI DUNG BẢN ĐỒ, LỘ TRÌNH VÀ THUYẾT MINH")

    # Center Process
    d.add_process("P2", "<b>2.0</b><br/><br/>Cung cấp nội dung bản đồ,<br/>lộ trình và thuyết minh", 410, 95, 250, 470)

    # Left Column
    d.add_actor("E1", "Khách tham quan", 30, 200, 170, 220)

    # Right Column
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 105, 160, 75)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 220, 160, 75)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 870, 335, 160, 75)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 450, 160, 75)

    # Connectors Left
    d.add_horizontal_arrow("f_e1_p2_1", "E1", "P2", 235, "Token phiên, ngôn ngữ<br/>và yêu cầu tải gói")
    d.add_horizontal_arrow("f_p2_e1", "P2", "E1", 310, "Gói bản đồ, điểm dừng,<br/>lộ trình và tệp âm thanh")
    d.add_horizontal_arrow("f_e1_p2_2", "E1", "P2", 385, "Tọa độ GPS hiện tại<br/>và tín hiệu hiện diện")

    # Connectors Right
    d.add_horizontal_arrow("f_d2_p2", "D2", "P2", 142, "Đọc trạng thái hiệu lực<br/>của token phiên")
    d.add_horizontal_arrow("f_d3_p2", "D3", "P2", 257, "Đọc điểm tham quan,<br/>bản dịch và tệp WAV")
    d.add_horizontal_arrow("f_d4_p2", "D4", "P2", 372, "Đọc danh sách lộ trình<br/>và thứ tự điểm dừng")
    d.add_horizontal_arrow("f_p2_d6", "P2", "D6", 487, "Ghi nhật ký tải gói,<br/>hiện diện và điểm ghé")

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_P2_Visitor_Content_Audio.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 4: DFD Level 1 Process 3.0 (Chatbot RAG)
# ----------------------------------------------------------------------------------
def build_dfd_level_1_p3():
    d = DrawioDiagram("dfd_level_1_p3", "DFD Mức 1 Tiến trình 3.0", width=1060, height=620)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — TIẾN TRÌNH 3.0 XỬ LÝ HỎI ĐÁP THÔNG MINH RAG")

    # Center Process
    d.add_process("P3", "<b>3.0</b><br/><br/>Xử lý hỏi đáp thông minh<br/>trợ lý ảo RAG", 410, 95, 250, 470)

    # Left Column
    d.add_actor("E1", "Khách tham quan", 30, 240, 170, 130)

    # Right Column
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 105, 160, 75)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 870, 220, 160, 95)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức", 870, 355, 160, 75)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 465, 160, 75)

    # Connectors Left
    d.add_horizontal_arrow("f_e1_p3", "E1", "P3", 275, "Câu hỏi tra cứu<br/>kèm token và ngôn ngữ")
    d.add_horizontal_arrow("f_p3_e1", "P3", "E1", 335, "Câu trả lời kèm danh sách<br/>trích dẫn nguồn")

    # Connectors Right
    d.add_horizontal_arrow("f_d2_p3", "D2", "P3", 142, "Đọc hiệu lực phiên và<br/>bộ đếm giới hạn hỏi")
    d.add_horizontal_arrow("f_p3_e6", "P3", "E6", 245, "Câu hỏi truy vấn và lời nhắc<br/>kèm ngữ cảnh trích dẫn")
    d.add_horizontal_arrow("f_e6_p3", "E6", "P3", 290, "Vector câu hỏi và câu trả lời<br/>mô hình sinh ra")
    d.add_horizontal_arrow("f_d5_p3", "D5", "P3", 392, "Đọc các đoạn kiến thức<br/>và vector nhúng tương đồng")
    d.add_horizontal_arrow("f_p3_d6", "P3", "D6", 502, "Ghi lịch sử câu hỏi,<br/>câu trả lời và trích dẫn")

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_P3_Chatbot_RAG.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 5: DFD Level 1 Process 4.0 (Content Knowledge Admin)
# ----------------------------------------------------------------------------------
def build_dfd_level_1_p4():
    d = DrawioDiagram("dfd_level_1_p4", "DFD Mức 1 Tiến trình 4.0", width=1060, height=750)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — TIẾN TRÌNH 4.0 QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC")

    # Center Process
    d.add_process("P4", "<b>4.0</b><br/><br/>Quản trị nội dung, lộ trình<br/>và kho kiến thức", 410, 90, 250, 620)

    # Left Column
    d.add_actor("E2", "Nhân viên", 30, 310, 170, 140)

    # Right Column
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 90, 160, 90)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 870, 210, 160, 90)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 870, 330, 160, 80)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức", 870, 440, 160, 80)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 870, 550, 160, 80)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 655, 160, 55)

    # Connectors Left
    d.add_horizontal_arrow("f_e2_p4", "E2", "P4", 345, "Dữ liệu điểm tham quan,<br/>lộ trình và tài liệu kiến thức")
    d.add_horizontal_arrow("f_p4_e2", "P4", "E2", 415, "Trạng thái cập nhật, tác vụ<br/>dịch thuật và kết quả công bố")

    # Connectors Right
    d.add_horizontal_arrow("f_p4_d3", "P4", "D3", 115, "Ghi điểm tham quan, bản dịch,<br/>tệp WAV và tạo tác vụ nền")
    d.add_horizontal_arrow("f_d3_p4", "D3", "P4", 160, "Đọc điểm tham quan, bản gốc<br/>và tác vụ dịch chờ xử lý")

    d.add_horizontal_arrow("f_p4_e5", "P4", "E5", 235, "Văn bản tiếng Việt gốc và<br/>yêu cầu sinh giọng đọc")
    d.add_horizontal_arrow("f_e5_p4", "E5", "P4", 280, "Bản dịch đa ngôn ngữ và<br/>tệp âm thanh WAV")

    d.add_horizontal_arrow("f_p4_d4", "P4", "D4", 355, "Ghi cập nhật thông tin<br/>lộ trình và điểm dừng")
    d.add_horizontal_arrow("f_d4_p4", "D4", "P4", 395, "Đọc danh sách lộ trình<br/>và các điểm tham quan")

    d.add_horizontal_arrow("f_p4_d5", "P4", "D5", 465, "Ghi tài liệu, phân đoạn<br/>và lưu vector nhúng")
    d.add_horizontal_arrow("f_d5_p4", "D5", "P4", 505, "Đọc tài liệu và trạng thái<br/>phân đoạn kiến thức")

    d.add_horizontal_arrow("f_p4_e6", "P4", "E6", 575, "Các đoạn văn bản tài liệu<br/>cần tạo vector nhúng")
    d.add_horizontal_arrow("f_e6_p4", "E6", "P4", 615, "Danh sách vector biểu diễn<br/>ngữ nghĩa của từng đoạn")

    d.add_horizontal_arrow("f_p4_d6", "P4", "D6", 682, "Ghi nhật ký thay đổi<br/>nội dung và tài liệu")

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_P4_Content_Knowledge_Admin.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 6: DFD Level 1 Process 5.0 (Auth Admin Monitoring)
# ----------------------------------------------------------------------------------
def build_dfd_level_1_p5():
    d = DrawioDiagram("dfd_level_1_p5", "DFD Mức 1 Tiến trình 5.0", width=1060, height=750)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — TIẾN TRÌNH 5.0 QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG")

    # Center Process
    d.add_process("P5", "<b>5.0</b><br/><br/>Quản trị tài khoản nội bộ<br/>và giám sát hệ thống", 410, 90, 250, 620)

    # Left Column
    d.add_actor("E2", "Nhân viên", 30, 140, 170, 110)
    d.add_actor("E3", "Quản trị viên", 30, 430, 170, 140)

    # Right Column
    d.add_store("D1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 870, 90, 160, 85)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 200, 160, 85)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 315, 160, 70)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 415, 160, 70)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức", 870, 515, 160, 70)

    # Connectors Left
    d.add_horizontal_arrow("f_e2_p5", "E2", "P5", 170, "Thông tin đăng nhập<br/>và làm mới phiên")
    d.add_horizontal_arrow("f_p5_e2", "P5", "E2", 225, "Token truy cập nội bộ<br/>cho nhân viên")

    d.add_horizontal_arrow("f_e3_p5", "E3", "P5", 470, "Thông tin đăng nhập, hồ sơ tạo<br/>nhân viên và bộ lọc tra cứu")
    d.add_horizontal_arrow("f_p5_e3", "P5", "E3", 535, "Token, hồ sơ nhân viên mới,<br/>nhật ký và báo cáo sức khỏe")

    # Connectors Right
    d.add_horizontal_arrow("f_d1_p5", "D1", "P5", 115, "Đọc mật khẩu băm và<br/>trạng thái tài khoản")
    d.add_horizontal_arrow("f_p5_d1", "P5", "D1", 155, "Lưu tài khoản mới, refresh<br/>token và thời điểm đăng nhập")

    d.add_horizontal_arrow("f_p5_d6", "P5", "D6", 225, "Ghi nhật ký đăng nhập và<br/>thao tác quản trị viên")
    d.add_horizontal_arrow("f_d6_p5", "D6", "P5", 265, "Đọc nhật ký thao tác và<br/>số lượng khách trực tuyến")

    d.add_horizontal_arrow("f_d2_p5", "D2", "P5", 350, "Đọc số liệu phiên tham quan<br/>và doanh thu thanh toán")
    d.add_horizontal_arrow("f_d3_p5", "D3", "P5", 450, "Đọc độ phủ ngôn ngữ<br/>và số tác vụ nền lỗi")
    d.add_horizontal_arrow("f_d5_p5", "D5", "P5", 550, "Đọc số lượng tài liệu<br/>kiến thức đã công bố")

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_P5_Auth_Admin_Monitoring.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 7: DFD Level 2 Process 1.0 (Payment & Session)
# ----------------------------------------------------------------------------------
def build_dfd_level_2_p1():
    d = DrawioDiagram("dfd_level_2_p1", "DFD Mức 2 Tiến trình 1.0", width=1060, height=830)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 1.0 QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN")

    # Sub-processes
    d.add_process("P1_1", "<b>1.1</b><br/>Khởi tạo phiên và yêu cầu<br/>thanh toán trực tuyến", 410, 85, 250, 105)
    d.add_process("P1_2", "<b>1.2</b><br/>Xác minh webhook và<br/>kích hoạt mã đổi phiên", 410, 230, 250, 95)
    d.add_process("P1_3", "<b>1.3</b><br/>Xác nhận tiền mặt và<br/>cấp mã ngắn 6 chữ số", 410, 365, 250, 105)
    d.add_process("P1_4", "<b>1.4</b><br/>Đổi mã xác thực và<br/>cấp token phiên khách", 410, 510, 250, 95)
    d.add_process("P1_5", "<b>1.5</b><br/>Tra cứu phiên và<br/>cấp lại token khách", 410, 650, 250, 120)

    # Row 1 (1.1)
    d.add_actor("E1_R1", "Khách tham quan", 30, 85, 170, 105)
    d.add_actor("E4_R1", "Cổng thanh toán", 870, 85, 160, 45)
    d.add_store("D2_R1", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 145, 160, 45)

    d.add_horizontal_arrow("f_e1_p11", "E1_R1", "P1_1", 112, "Yêu cầu khởi tạo phiên<br/>thanh toán trực tuyến")
    d.add_horizontal_arrow("f_p11_e1", "P1_1", "E1_R1", 162, "Mã thanh toán và<br/>liên kết giao dịch")
    d.add_horizontal_arrow("f_p11_e4", "P1_1", "E4_R1", 107, "Yêu cầu tạo giao dịch<br/>cổng thanh toán")
    d.add_horizontal_arrow("f_p11_d2", "P1_1", "D2_R1", 167, "Ghi bản ghi phiên<br/>và thanh toán chờ")

    # Row 2 (1.2)
    d.add_actor("E4_R2", "Cổng thanh toán", 30, 230, 170, 95)
    d.add_store("D2_R2", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 230, 160, 95)

    d.add_horizontal_arrow("f_e4_p12", "E4_R2", "P1_2", 277, "Webhook thông báo kết quả<br/>kèm chữ ký số")
    d.add_horizontal_arrow("f_p12_d2", "P1_2", "D2_R2", 255, "Cập nhật thanh toán thành công<br/>và sinh mã một lần")
    d.add_horizontal_arrow("f_d2_p12", "D2_R2", "P1_2", 300, "Đọc thông tin phiên và<br/>chữ ký đối chiếu")

    # Row 3 (1.3)
    d.add_actor("E2_R3", "Nhân viên", 30, 365, 170, 105)
    d.add_store("D2_R3", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 365, 160, 45)
    d.add_store("D6_R3", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 425, 160, 45)

    d.add_horizontal_arrow("f_e2_p13", "E2_R3", "P1_3", 392, "Yêu cầu tạo phiên tiền mặt<br/>và số tiền đã thu")
    d.add_horizontal_arrow("f_p13_e2", "P1_3", "E2_R3", 442, "Mã ngắn 6 chữ số<br/>cấp cho khách")
    d.add_horizontal_arrow("f_p13_d2", "P1_3", "D2_R3", 387, "Ghi phiên tiền mặt và<br/>lưu mã ngắn vào bộ đệm")
    d.add_horizontal_arrow("f_p13_d6", "P1_3", "D6_R3", 447, "Nhật ký xác nhận<br/>thanh toán tiền mặt")

    # Row 4 (1.4)
    d.add_actor("E1_R4", "Khách tham quan", 30, 510, 170, 95)
    d.add_store("D2_R4", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 510, 160, 95)

    d.add_horizontal_arrow("f_e1_p14", "E1_R4", "P1_4", 535, "Nhập mã một lần hoặc<br/>mã ngắn 6 chữ số")
    d.add_horizontal_arrow("f_p14_e1", "P1_4", "E1_R4", 580, "Token phiên tham quan<br/>hiệu lực 24 giờ")
    d.add_horizontal_arrow("f_d2_p14", "D2_R4", "P1_4", 535, "Đọc mã xác thực và<br/>đối chiếu thời hạn")
    d.add_horizontal_arrow("f_p14_d2", "P1_4", "D2_R4", 580, "Thu hồi mã một lần và<br/>lưu token phiên")

    # Row 5 (1.5)
    d.add_actor("E2_R5", "Nhân viên", 30, 650, 170, 120)
    d.add_store("D2_R5", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 645, 160, 65)
    d.add_store("D6_R5", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 725, 160, 45)

    d.add_horizontal_arrow("f_e2_p15", "E2_R5", "P1_5", 680, "Mã tra cứu phiên<br/>cần hỗ trợ cấp lại")
    d.add_horizontal_arrow("f_p15_e2", "P1_5", "E2_R5", 740, "Thông tin phiên và<br/>token cấp lại cho khách")
    d.add_horizontal_arrow("f_d2_p15", "D2_R5", "P1_5", 662, "Đọc thông tin phiên và<br/>lịch sử giao dịch")
    d.add_horizontal_arrow("f_p15_d2", "P1_5", "D2_R5", 697, "Cập nhật token mới nếu<br/>phiên còn hạn")
    d.add_horizontal_arrow("f_p15_d6", "P1_5", "D6_R5", 747, "Nhật ký thao tác<br/>cấp lại token khách")

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P1_Payment_Session.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 8: DFD Level 2 Process 2.0 (Visitor Content & Audio)
# ----------------------------------------------------------------------------------
def build_dfd_level_2_p2():
    d = DrawioDiagram("dfd_level_2_p2", "DFD Mức 2 Tiến trình 2.0", width=1060, height=710)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 2.0 CUNG CẤP NỘI DUNG BẢN ĐỒ, LỘ TRÌNH VÀ THUYẾT MINH")

    # Sub-processes
    d.add_process("P2_1", "<b>2.1</b><br/>Kiểm tra hiệu lực phiên<br/>tham quan và ngôn ngữ", 410, 85, 250, 85)
    d.add_process("P2_2", "<b>2.2</b><br/>Tổng hợp gói nội dung<br/>điểm tham quan và lộ trình", 410, 230, 250, 130)
    d.add_process("P2_3", "<b>2.3</b><br/>Cung cấp tệp âm thanh<br/>thuyết minh", 410, 410, 250, 95)
    d.add_process("P2_4", "<b>2.4</b><br/>Ghi nhận hiện diện trực tuyến<br/>và thống kê điểm ghé", 410, 560, 250, 85)

    # Vertical Flows
    d.add_vertical_arrow("f_p21_p22", "P2_1", "P2_2", "Yêu cầu hợp lệ kèm<br/>phiên và ngôn ngữ")

    # Row 1 (2.1)
    d.add_actor("E1_R1", "Khách tham quan", 30, 85, 170, 85)
    d.add_store("D2_R1", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 85, 160, 40)
    d.add_store("D3_R1", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 130, 160, 40)

    d.add_horizontal_arrow("f_e1_p21", "E1_R1", "P2_1", 127, "Token phiên khách và<br/>mã ngôn ngữ lựa chọn")
    d.add_horizontal_arrow("f_d2_p21", "D2_R1", "P2_1", 105, "Trạng thái hiệu lực<br/>của token phiên")
    d.add_horizontal_arrow("f_d3_p21", "D3_R1", "P2_1", 150, "Danh mục ngôn ngữ<br/>đang hoạt động")

    # Row 2 (2.2)
    d.add_actor("E1_R2", "Khách tham quan", 30, 230, 170, 130)
    d.add_store("D3_R2", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 225, 160, 36)
    d.add_store("D4_R2", "<b>D4</b> | Lộ trình tham quan", 870, 273, 160, 36)
    d.add_store("D6_R2", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 321, 160, 36)

    d.add_horizontal_arrow("f_p22_e1", "P2_2", "E1_R2", 295, "Gói nội dung bản đồ,<br/>điểm tham quan và lộ trình")
    d.add_horizontal_arrow("f_d3_p22", "D3_R2", "P2_2", 243, "Điểm tham quan, tọa độ,<br/>bán kính và bản dịch")
    d.add_horizontal_arrow("f_d4_p22", "D4_R2", "P2_2", 291, "Danh sách lộ trình mẫu<br/>và thứ tự điểm dừng")
    d.add_horizontal_arrow("f_p22_d6", "P2_2", "D6_R2", 339, "Nhật ký tải gói nội dung<br/>theo ngôn ngữ")

    # Row 3 (2.3)
    d.add_actor("E1_R3", "Khách tham quan", 30, 410, 170, 95)
    d.add_store("D3_R3", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 410, 160, 95)

    d.add_horizontal_arrow("f_e1_p23", "E1_R3", "P2_3", 435, "Yêu cầu phát âm thanh<br/>thuyết minh thủ công/GPS")
    d.add_horizontal_arrow("f_p23_e1", "P2_3", "E1_R3", 480, "Tệp âm thanh thuyết minh<br/>phát tại thiết bị")
    d.add_horizontal_arrow("f_d3_p23", "D3_R3", "P2_3", 457, "Đường dẫn và luồng<br/>tệp âm thanh WAV")

    # Row 4 (2.4)
    d.add_actor("E1_R4", "Khách tham quan", 30, 560, 170, 85)
    d.add_store("D6_R4", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 560, 160, 85)

    d.add_horizontal_arrow("f_e1_p24", "E1_R4", "P2_4", 602, "Tín hiệu nhịp tim hiện diện<br/>và sự kiện GPS ghé điểm")
    d.add_horizontal_arrow("f_p24_d6", "P2_4", "D6_R4", 602, "Ghi nhận trạng thái khách<br/>và thống kê lượt ghé")

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P2_Visitor_Content_Audio.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 9: DFD Level 2 Process 3.0 (Chatbot RAG)
# ----------------------------------------------------------------------------------
def build_dfd_level_2_p3():
    d = DrawioDiagram("dfd_level_2_p3", "DFD Mức 2 Tiến trình 3.0", width=1060, height=710)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 3.0 XỬ LÝ HỎI ĐÁP THÔNG MINH RAG")

    # Sub-processes
    d.add_process("P3_1", "<b>3.1</b><br/>Kiểm tra phiên khách và<br/>giới hạn tần suất hỏi", 410, 85, 250, 80)
    d.add_process("P3_2", "<b>3.2</b><br/>Kiểm tra phạm vi câu hỏi<br/>và tạo vector truy vấn", 410, 230, 250, 85)
    d.add_process("P3_3", "<b>3.3</b><br/>Truy hồi đoạn kiến thức<br/>tương đồng", 410, 380, 250, 80)
    d.add_process("P3_4", "<b>3.4</b><br/>Tổng hợp câu trả lời<br/>có trích dẫn và ghi nhật ký", 410, 525, 250, 120)

    # Vertical Flows
    d.add_vertical_arrow("f_p31_p32", "P3_1", "P3_2", "Câu hỏi hợp lệ<br/>chưa vượt hạn mức")
    d.add_vertical_arrow("f_p32_p33", "P3_2", "P3_3", "Vector câu hỏi<br/>kèm câu hỏi gốc")
    d.add_vertical_arrow("f_p33_p34", "P3_3", "P3_4", "Tập các đoạn kiến thức<br/>tương đồng cao nhất")

    # Row 1 (3.1)
    d.add_actor("E1_R1", "Khách tham quan", 30, 85, 170, 80)
    d.add_store("D2_R1", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 85, 160, 80)

    d.add_horizontal_arrow("f_e1_p31", "E1_R1", "P3_1", 125, "Câu hỏi của khách<br/>kèm token phiên và ngôn ngữ")
    d.add_horizontal_arrow("f_d2_p31", "D2_R1", "P3_1", 125, "Kiểm tra hiệu lực token<br/>và tăng bộ đếm tần suất")

    # Row 2 (3.2)
    d.add_actor("E6_R2", "Dịch vụ embedding và LLM", 870, 230, 160, 85)

    d.add_horizontal_arrow("f_p32_e6", "P3_2", "E6_R2", 252, "Văn bản câu hỏi<br/>cần tạo vector nhúng")
    d.add_horizontal_arrow("f_e6_p32", "E6_R2", "P3_2", 292, "Vector biểu diễn ngữ nghĩa<br/>của câu hỏi")

    # Row 3 (3.3)
    d.add_store("D5_R3", "<b>D5</b> | Kho kiến thức", 870, 380, 160, 80)

    d.add_horizontal_arrow("f_d5_p33", "D5_R3", "P3_3", 420, "Các đoạn kiến thức đã công bố<br/>và vector nhúng tương đồng")

    # Row 4 (3.4)
    d.add_actor("E1_R4", "Khách tham quan", 30, 525, 170, 120)
    d.add_actor("E6_R4", "Dịch vụ embedding và LLM", 870, 520, 160, 65)
    d.add_store("D6_R4", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 605, 160, 45)

    d.add_horizontal_arrow("f_p34_e1", "P3_4", "E1_R4", 585, "Câu trả lời hoàn chỉnh<br/>kèm danh sách trích dẫn")
    d.add_horizontal_arrow("f_p34_e6", "P3_4", "E6_R4", 538, "Lời nhắc kèm ngữ cảnh<br/>đoạn kiến thức và câu hỏi")
    d.add_horizontal_arrow("f_e6_p34", "E6_R4", "P3_4", 573, "Câu trả lời mô hình<br/>kèm mã đoạn trích dẫn")
    d.add_horizontal_arrow("f_p34_d6", "P3_4", "D6_R4", 627, "Nhật ký câu hỏi, câu trả lời,<br/>thời gian và trích dẫn")

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P3_Chatbot_RAG.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 10: DFD Level 2 Process 4.0 (Content Knowledge Admin)
# ----------------------------------------------------------------------------------
def build_dfd_level_2_p4():
    d = DrawioDiagram("dfd_level_2_p4", "DFD Mức 2 Tiến trình 4.0", width=1060, height=820)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 4.0 QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC")

    # Sub-processes
    d.add_process("P4_1", "<b>4.1</b><br/>Cập nhật điểm tham quan<br/>và khởi tạo tác vụ nội dung", 410, 85, 250, 95)
    d.add_process("P4_2", "<b>4.2</b><br/>Xử lý nền dịch văn bản<br/>và tổng hợp âm thanh", 410, 225, 250, 95)
    d.add_process("P4_3", "<b>4.3</b><br/>Quản lý lộ trình<br/>tham quan mẫu", 410, 365, 250, 120)
    d.add_process("P4_4", "<b>4.4</b><br/>Phân đoạn tài liệu và<br/>tạo vector kho kiến thức", 410, 525, 250, 235)

    # Row 1 (4.1)
    d.add_actor("E2_R1", "Nhân viên", 30, 85, 170, 95)
    d.add_store("D3_R1", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 85, 160, 45)
    d.add_store("D6_R1", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 135, 160, 45)

    d.add_horizontal_arrow("f_e2_p41", "E2_R1", "P4_1", 112, "Dữ liệu điểm tham quan và<br/>bản thuyết minh tiếng Việt")
    d.add_horizontal_arrow("f_p41_e2", "P4_1", "E2_R1", 155, "Kết quả cập nhật và<br/>mã tác vụ tạo mới")
    d.add_horizontal_arrow("f_p41_d3", "P4_1", "D3_R1", 107, "Ghi điểm tham quan, tăng<br/>phiên bản &amp; tạo tác vụ")
    d.add_horizontal_arrow("f_p41_d6", "P4_1", "D6_R1", 157, "Nhật ký cập nhật<br/>điểm tham quan")

    # Row 2 (4.2)
    d.add_store("D3_R2", "<b>D3</b> | Điểm tham quan &amp; Media", 30, 225, 170, 95)
    d.add_actor("E5_R2", "Dịch vụ dịch và TTS", 870, 225, 160, 95)

    d.add_horizontal_arrow("f_d3_p42", "D3_R2", "P4_2", 250, "Đọc tác vụ chờ xử lý và<br/>bản thuyết minh tiếng Việt")
    d.add_horizontal_arrow("f_p42_d3", "P4_2", "D3_R2", 295, "Lưu bản dịch, tệp âm thanh<br/>và cập nhật trạng thái")
    d.add_horizontal_arrow("f_p42_e5", "P4_2", "E5_R2", 250, "Văn bản tiếng Việt cần dịch<br/>và yêu cầu tạo âm thanh")
    d.add_horizontal_arrow("f_e5_p42", "E5_R2", "P4_2", 295, "Bản dịch đa ngôn ngữ<br/>và tệp âm thanh WAV")

    # Row 3 (4.3)
    d.add_actor("E2_R3", "Nhân viên", 30, 365, 170, 72)
    d.add_store("D3_R3", "<b>D3</b> | Điểm tham quan", 30, 445, 170, 40)
    d.add_store("D4_R3", "<b>D4</b> | Lộ trình tham quan", 870, 365, 160, 72)
    d.add_store("D6_R3", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 445, 160, 40)

    d.add_horizontal_arrow("f_e2_p43", "E2_R3", "P4_3", 382, "Dữ liệu lộ trình mẫu, danh sách<br/>điểm dừng và thời lượng")
    d.add_horizontal_arrow("f_p43_e2", "P4_3", "E2_R3", 422, "Kết quả cập nhật<br/>lộ trình mẫu")
    d.add_horizontal_arrow("f_d3_p43", "D3_R3", "P4_3", 465, "Đọc danh sách điểm<br/>tham quan đang hoạt động")
    d.add_horizontal_arrow("f_p43_d4", "P4_3", "D4_R3", 382, "Ghi thông tin lộ trình<br/>và thứ tự điểm dừng")
    d.add_horizontal_arrow("f_d4_p43", "D4_R3", "P4_3", 422, "Đọc danh sách lộ trình<br/>và điểm dừng hiện hành")
    d.add_horizontal_arrow("f_p43_d6", "P4_3", "D6_R3", 465, "Nhật ký thay đổi lộ trình")

    # Row 4 (4.4)
    d.add_actor("E2_R4", "Nhân viên", 30, 525, 170, 235)
    d.add_store("D5_R4", "<b>D5</b> | Kho kiến thức", 870, 525, 160, 82)
    d.add_actor("E6_R4", "Dịch vụ embedding &amp; LLM", 870, 620, 160, 82)
    d.add_store("D6_R4", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 715, 160, 45)

    d.add_horizontal_arrow("f_e2_p44", "E2_R4", "P4_4", 585, "Tài liệu kho kiến thức<br/>mới hoặc chỉnh sửa")
    d.add_horizontal_arrow("f_p44_e2", "P4_4", "E2_R4", 685, "Kết quả công bố<br/>tài liệu kiến thức")
    d.add_horizontal_arrow("f_p44_d5", "P4_4", "D5_R4", 545, "Ghi tài liệu, tách đoạn<br/>và lưu vector nhúng")
    d.add_horizontal_arrow("f_d5_p44", "D5_R4", "P4_4", 588, "Đọc trạng thái phân đoạn<br/>và tài liệu kiến thức")
    d.add_horizontal_arrow("f_p44_e6", "P4_4", "E6_R4", 640, "Các đoạn văn bản cần<br/>tạo vector nhúng")
    d.add_horizontal_arrow("f_e6_p44", "E6_R4", "P4_4", 683, "Danh sách vector nhúng<br/>của từng đoạn")
    d.add_horizontal_arrow("f_p44_d6", "P4_4", "D6_R4", 738, "Nhật ký cập nhật<br/>kho kiến thức")

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P4_Content_Knowledge_Admin.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 11: DFD Level 2 Process 5.0 (Auth Admin Monitoring)
# ----------------------------------------------------------------------------------
def build_dfd_level_2_p5():
    d = DrawioDiagram("dfd_level_2_p5", "DFD Mức 2 Tiến trình 5.0", width=1060, height=820)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 5.0 QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG")

    # Sub-processes
    d.add_process("P5_1", "<b>5.1</b><br/>Xác thực đăng nhập và<br/>quản lý phiên nội bộ", 410, 85, 250, 145)
    d.add_process("P5_2", "<b>5.2</b><br/>Tạo và quản lý<br/>tài khoản nhân viên", 410, 265, 250, 130)
    d.add_process("P5_3", "<b>5.3</b><br/>Truy vấn và lọc<br/>nhật ký thao tác", 410, 430, 250, 95)
    d.add_process("P5_4", "<b>5.4</b><br/>Tổng hợp chỉ số sức khỏe<br/>và thống kê vận hành", 410, 560, 250, 185)

    # Row 1 (5.1)
    d.add_actor("E2_R1", "Nhân viên", 30, 85, 170, 68)
    d.add_actor("E3_R1", "Quản trị viên", 30, 162, 170, 68)
    d.add_store("D1_R1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 870, 85, 160, 85)
    d.add_store("D6_R1", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 182, 160, 48)

    d.add_horizontal_arrow("f_e2_p51", "E2_R1", "P5_1", 102, "Tên đăng nhập &amp; mật khẩu NV")
    d.add_horizontal_arrow("f_p51_e2", "P5_1", "E2_R1", 136, "Token truy cập cho NV")
    d.add_horizontal_arrow("f_e3_p51", "E3_R1", "P5_1", 179, "Tên đăng nhập &amp; mật khẩu QTV")
    d.add_horizontal_arrow("f_p51_e3", "P5_1", "E3_R1", 213, "Token truy cập cho QTV")
    d.add_horizontal_arrow("f_d1_p51", "D1_R1", "P5_1", 106, "Đọc mật khẩu băm và<br/>trạng thái tài khoản")
    d.add_horizontal_arrow("f_p51_d1", "P5_1", "D1_R1", 150, "Lưu refresh token và<br/>cập nhật đăng nhập")
    d.add_horizontal_arrow("f_p51_d6", "P5_1", "D6_R1", 206, "Ghi nhật ký đăng nhập<br/>và làm mới phiên")

    # Row 2 (5.2)
    d.add_actor("E3_R2", "Quản trị viên", 30, 265, 170, 130)
    d.add_store("D1_R2", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 870, 265, 160, 78)
    d.add_store("D6_R2", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 352, 160, 43)

    d.add_horizontal_arrow("f_e3_p52", "E3_R2", "P5_2", 300, "Thông tin tài khoản<br/>nhân viên mới")
    d.add_horizontal_arrow("f_p52_e3", "P5_2", "E3_R2", 360, "Hồ sơ nhân viên mới<br/>tạo thành công")
    d.add_horizontal_arrow("f_d1_p52", "D1_R2", "P5_2", 282, "Kiểm tra trùng tên đăng nhập")
    d.add_horizontal_arrow("f_p52_d1", "P5_2", "D1_R2", 322, "Lưu tài khoản nhân viên mới<br/>và mật khẩu băm")
    d.add_horizontal_arrow("f_p52_d6", "P5_2", "D6_R2", 374, "Ghi nhật ký tạo<br/>tài khoản nhân viên")

    # Row 3 (5.3)
    d.add_actor("E3_R3", "Quản trị viên", 30, 430, 170, 95)
    d.add_store("D6_R3", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 430, 160, 95)

    d.add_horizontal_arrow("f_e3_p53", "E3_R3", "P5_3", 455, "Bộ lọc tra cứu nhật ký<br/>theo thời gian và tác nhân")
    d.add_horizontal_arrow("f_p53_e3", "P5_3", "E3_R3", 500, "Danh sách nhật ký<br/>thao tác phân trang")
    d.add_horizontal_arrow("f_d6_p53", "D6_R3", "P5_3", 477, "Đọc danh sách bản ghi<br/>nhật ký thao tác")

    # Row 4 (5.4)
    d.add_actor("E3_R4", "Quản trị viên", 30, 560, 170, 185)
    d.add_store("D2_R4", "<b>D2</b> | Phiên &amp; Thanh toán", 870, 560, 160, 38)
    d.add_store("D3_R4", "<b>D3</b> | Điểm tham quan &amp; Media", 870, 608, 160, 38)
    d.add_store("D5_R4", "<b>D5</b> | Kho kiến thức", 870, 656, 160, 38)
    d.add_store("D6_R4", "<b>D6</b> | Nhật ký &amp; Thống kê", 870, 704, 160, 41)

    d.add_horizontal_arrow("f_e3_p54", "E3_R4", "P5_4", 615, "Yêu cầu xem chỉ số giám sát<br/>và sức khỏe hệ thống")
    d.add_horizontal_arrow("f_p54_e3", "P5_4", "E3_R4", 690, "Báo cáo chỉ số sức khỏe<br/>và thống kê vận hành")
    d.add_horizontal_arrow("f_d2_p54", "D2_R4", "P5_4", 579, "Số liệu phiên &amp; doanh thu")
    d.add_horizontal_arrow("f_d3_p54", "D3_R4", "P5_4", 627, "Độ phủ ngôn ngữ &amp; tác vụ lỗi")
    d.add_horizontal_arrow("f_d5_p54", "D5_R4", "P5_4", 675, "Số lượng tài liệu đã công bố")
    d.add_horizontal_arrow("f_d6_p54", "D6_R4", "P5_4", 724, "Thống kê hỏi đáp &amp; khách online")

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P5_Auth_Admin_Monitoring.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 12: DFD Level 3 Process 4.2 (Pipeline Translation TTS)
# ----------------------------------------------------------------------------------
def build_dfd_level_3_p4_2():
    d = DrawioDiagram("dfd_level_3_p42", "DFD Mức 3 Tiến trình 4.2", width=1060, height=690)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 4.2 XỬ LÝ NỀN DỊCH VĂN BẢN VÀ TỔNG HỢP ÂM THANH")

    # Sub-processes
    d.add_process("P4_2_1", "<b>4.2.1</b><br/>Nhận tác vụ chờ và<br/>cấp quyền giữ phiên xử lý", 410, 85, 250, 80)
    d.add_process("P4_2_2", "<b>4.2.2</b><br/>Kiểm tra phiên bản nguồn<br/>và dịch văn bản đa ngôn ngữ", 410, 235, 250, 85)
    d.add_process("P4_2_3", "<b>4.2.3</b><br/>Tổng hợp âm thanh WAV<br/>và kiểm tra định dạng tệp", 410, 390, 250, 85)
    d.add_process("P4_2_4", "<b>4.2.4</b><br/>Lưu kho tệp media và<br/>công bố trạng thái hoàn tất", 410, 545, 250, 80)

    # Vertical Flows
    d.add_vertical_arrow("f_p421_p422", "P4_2_1", "P4_2_2", "Thông tin tác vụ và<br/>mã điểm tham quan")
    d.add_vertical_arrow("f_p422_p423", "P4_2_2", "P4_2_3", "Văn bản bản dịch<br/>cần tạo giọng đọc")
    d.add_vertical_arrow("f_p423_p424", "P4_2_3", "P4_2_4", "Tệp âm thanh WAV hợp lệ<br/>kèm mã ngôn ngữ")

    # Row 1 (4.2.1)
    d.add_store("D3_R1", "<b>D3</b> | Điểm tham quan &amp; Media", 30, 85, 170, 80)

    d.add_horizontal_arrow("f_d3_p421", "D3_R1", "P4_2_1", 105, "Tác vụ ở trạng thái chờ<br/>xử lý hoặc chờ thử lại")
    d.add_horizontal_arrow("f_p421_d3", "P4_2_1", "D3_R1", 145, "Cập nhật trạng thái đang chạy<br/>và khóa phiên xử lý")

    # Row 2 (4.2.2)
    d.add_store("D3_R2", "<b>D3</b> | Điểm tham quan &amp; Media", 30, 235, 170, 85)
    d.add_actor("E5_R2", "Dịch vụ dịch và TTS", 870, 235, 160, 85)

    d.add_horizontal_arrow("f_d3_p422", "D3_R2", "P4_2_2", 257, "Văn bản thuyết minh tiếng Việt<br/>và số phiên bản nguồn")
    d.add_horizontal_arrow("f_p422_d3", "P4_2_2", "D3_R2", 297, "Lưu bản dịch ở<br/>trạng thái bản thảo")
    d.add_horizontal_arrow("f_p422_e5", "P4_2_2", "E5_R2", 257, "Văn bản tiếng Việt gốc<br/>kèm danh mục ngôn ngữ đích")
    d.add_horizontal_arrow("f_e5_p422", "E5_R2", "P4_2_2", 297, "Bản dịch của các<br/>ngôn ngữ đích")

    # Row 3 (4.2.3)
    d.add_actor("E5_R3", "Dịch vụ dịch và TTS", 870, 390, 160, 85)

    d.add_horizontal_arrow("f_p423_e5", "P4_2_3", "E5_R3", 412, "Văn bản từng ngôn ngữ<br/>và tham số giọng đọc")
    d.add_horizontal_arrow("f_e5_p423", "E5_R3", "P4_2_3", 452, "Luồng nhị phân<br/>tệp âm thanh WAV")

    # Row 4 (4.2.4)
    d.add_store("D3_R4", "<b>D3</b> | Điểm tham quan &amp; Media", 30, 545, 170, 80)

    d.add_horizontal_arrow("f_p424_d3", "P4_2_4", "D3_R4", 585, "Lưu tệp âm thanh vào kho media,<br/>công bố bản dịch và hoàn tất")

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio"))


# ----------------------------------------------------------------------------------
# DIAGRAM 13: DFD Level 3 Process 3.4 (RAG Answer Generation)
# ----------------------------------------------------------------------------------
def build_dfd_level_3_p3_4():
    d = DrawioDiagram("dfd_level_3_p34", "DFD Mức 3 Tiến trình 3.4", width=1060, height=690)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 3.4 TỔNG HỢP CÂU TRẢ LỜI CÓ TRÍCH DẪN VÀ GHI NHẬT KÝ")

    # Sub-processes
    d.add_process("P3_4_1", "<b>3.4.1</b><br/>Đóng gói lời nhắc hệ thống<br/>kèm ngữ cảnh đoạn kiến thức", 410, 85, 250, 85)
    d.add_process("P3_4_2", "<b>3.4.2</b><br/>Gọi mô hình ngôn ngữ<br/>sinh phản hồi theo ngữ cảnh", 410, 235, 250, 85)
    d.add_process("P3_4_3", "<b>3.4.3</b><br/>Kiểm tra trích dẫn hợp lệ<br/>và lọc liên kết ngoài nguồn", 410, 390, 250, 85)
    d.add_process("P3_4_4", "<b>3.4.4</b><br/>Lưu nhật ký hỏi đáp<br/>và trả kết quả cho khách", 410, 545, 250, 80)

    # Vertical Flows
    d.add_vertical_arrow("f_p341_p342", "P3_4_1", "P3_4_2", "Gói lời nhắc hoàn chỉnh<br/>kèm quy tắc nghiệp vụ")
    d.add_vertical_arrow("f_p342_p343", "P3_4_2", "P3_4_3", "Phản hồi thô và<br/>danh sách mã viện dẫn")
    d.add_vertical_arrow("f_p343_p344", "P3_4_3", "P3_4_4", "Câu trả lời đã kiểm duyệt<br/>trích dẫn và lọc liên kết")

    # Row 1 (3.4.1)
    d.add_process("P3_1_R1", "<b>3.1</b><br/>Kiểm tra phiên khách", 30, 85, 170, 38)
    d.add_process("P3_3_R1", "<b>3.3</b><br/>Truy hồi đoạn tương đồng", 30, 132, 170, 38)

    d.add_horizontal_arrow("f_p31_p341", "P3_1_R1", "P3_4_1", 104, "Câu hỏi hợp lệ<br/>và mã ngôn ngữ")
    d.add_horizontal_arrow("f_p33_p341", "P3_3_R1", "P3_4_1", 151, "Các đoạn kiến thức tương đồng<br/>kèm mã trích dẫn")

    # Row 2 (3.4.2)
    d.add_actor("E6_R2", "Dịch vụ embedding và LLM", 870, 235, 160, 85)

    d.add_horizontal_arrow("f_p342_e6", "P3_4_2", "E6_R2", 257, "Gói lời nhắc chứa<br/>câu hỏi và ngữ cảnh")
    d.add_horizontal_arrow("f_e6_p342", "E6_R2", "P3_4_2", 297, "Văn bản phản hồi<br/>kèm các mã viện dẫn")

    # Row 4 (3.4.4)
    d.add_store("D6_R4", "<b>D6</b> | Nhật ký &amp; Thống kê", 30, 545, 170, 80)
    d.add_actor("E1_R4", "Khách tham quan", 870, 545, 160, 80)

    d.add_horizontal_arrow("f_p344_d6", "P3_4_4", "D6_R4", 585, "Ghi nhận câu hỏi, câu trả lời,<br/>thời gian và trích dẫn")
    d.add_horizontal_arrow("f_p344_e1", "P3_4_4", "E1_R4", 585, "Câu trả lời hoàn chỉnh<br/>kèm danh sách trích dẫn")

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P3_4_RAG_Answer_Generation.drawio"))


def main():
    print("=== Generating 13 Clean DFD Draw.io Diagrams ===")
    build_dfd_level_0()
    build_dfd_level_1_p1()
    build_dfd_level_1_p2()
    build_dfd_level_1_p3()
    build_dfd_level_1_p4()
    build_dfd_level_1_p5()
    build_dfd_level_2_p1()
    build_dfd_level_2_p2()
    build_dfd_level_2_p3()
    build_dfd_level_2_p4()
    build_dfd_level_2_p5()
    build_dfd_level_3_p4_2()
    build_dfd_level_3_p3_4()
    print("=== All 13 Diagrams Generated Successfully ===")

if __name__ == "__main__":
    main()
