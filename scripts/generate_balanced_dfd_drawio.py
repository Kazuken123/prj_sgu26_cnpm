import os
import sys
import html

sys.stdout.reconfigure(encoding='utf-8')

OUT_DIR = "docs/diagram/dfd"
os.makedirs(OUT_DIR, exist_ok=True)

def xml_escape(text: str) -> str:
    if not text:
        return ""
    unescaped = html.unescape(text)
    return (unescaped
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;"))

class Box:
    def __init__(self, cell_id, text, x, y, w, h, box_type="process"):
        self.cell_id = cell_id
        self.text = text
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.box_type = box_type

    @property
    def right(self):
        return self.x + self.w

    @property
    def bottom(self):
        return self.y + self.h

    @property
    def center_x(self):
        return self.x + self.w / 2.0

    @property
    def center_y(self):
        return self.y + self.h / 2.0


class StraightDrawioDiagram:
    def __init__(self, diagram_id, name, width=1200, height=800):
        self.diagram_id = diagram_id
        self.name = name
        self.width = width
        self.height = height
        self.elements = []
        self.boxes = {}

    def add_title(self, text):
        elem = f'''        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Arial;fontSize=15;fontStyle=1;fillColor=none;strokeColor=none;fontColor=#111827;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="20" y="10" width="{self.width - 40}" height="30" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)

    def add_process(self, cell_id, text, x, y, w, h):
        b = Box(cell_id, text, x, y, w, h, "process")
        self.boxes[cell_id] = b
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#111827;align=center;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)
        return b

    def add_actor(self, cell_id, text, x, y, w, h):
        b = Box(cell_id, text, x, y, w, h, "actor")
        self.boxes[cell_id] = b
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=13;fontStyle=1;fontColor=#111827;align=center;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)
        return b

    def add_store(self, cell_id, text, x, y, w, h):
        b = Box(cell_id, text, x, y, w, h, "store")
        self.boxes[cell_id] = b
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="shape=partialRectangle;whiteSpace=wrap;html=1;left=1;right=0;top=1;bottom=1;fillColor=#F9FAFB;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#111827;align=left;spacingLeft=10;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)
        return b

    def add_straight_h_arrow(self, cell_id, src_id, tgt_id, label, y_level, label_offset=None):
        """
        Guarantees 100% DEAD HORIZONTAL LINE: Delta Y = 0.00000 px.
        Automatically calculates exact exitY on src and entryY on tgt.
        """
        src = self.boxes[src_id]
        tgt = self.boxes[tgt_id]

        exit_y = (y_level - src.y) / float(src.h)
        entry_y = (y_level - tgt.y) / float(tgt.h)

        if src.x < tgt.x:
            exit_x = 1.0
            entry_x = 0.0
        else:
            exit_x = 0.0
            entry_x = 1.0

        style = (f"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
                 f"strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;"
                 f"fontFamily=Arial;fontSize=10;fontColor=#111827;labelBackgroundColor=#FFFFFF;spacing=2;"
                 f"exitX={exit_x:.4f};exitY={exit_y:.4f};exitDx=0;exitDy=0;"
                 f"entryX={entry_x:.4f};entryY={entry_y:.4f};entryDx=0;entryDy=0;")

        offset_xml = ""
        if label_offset:
            offset_xml = f'<mxPoint x="{label_offset[0]}" y="{label_offset[1]}" as="offset" />'

        elem = f'''        <mxCell id="{cell_id}" parent="1" style="{style}" value="{xml_escape(label)}" edge="1" source="{src_id}" target="{tgt_id}">
          <mxGeometry relative="1" as="geometry">{offset_xml}</mxGeometry>
        </mxCell>'''
        self.elements.append(elem)

    def add_straight_v_arrow(self, cell_id, src_id, tgt_id, label, x_level, label_offset=None):
        """
        Guarantees 100% DEAD VERTICAL LINE: Delta X = 0.00000 px.
        Automatically calculates exact exitX on src and entryX on tgt.
        """
        src = self.boxes[src_id]
        tgt = self.boxes[tgt_id]

        exit_x = (x_level - src.x) / float(src.w)
        entry_x = (x_level - tgt.x) / float(tgt.w)

        if src.y < tgt.y:
            exit_y = 1.0
            entry_y = 0.0
        else:
            exit_y = 0.0
            entry_y = 1.0

        style = (f"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
                 f"strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;"
                 f"fontFamily=Arial;fontSize=10;fontColor=#111827;labelBackgroundColor=#FFFFFF;spacing=2;"
                 f"exitX={exit_x:.4f};exitY={exit_y:.4f};exitDx=0;exitDy=0;"
                 f"entryX={entry_x:.4f};entryY={entry_y:.4f};entryDx=0;entryDy=0;")

        offset_xml = ""
        if label_offset:
            offset_xml = f'<mxPoint x="{label_offset[0]}" y="{label_offset[1]}" as="offset" />'

        elem = f'''        <mxCell id="{cell_id}" parent="1" style="{style}" value="{xml_escape(label)}" edge="1" source="{src_id}" target="{tgt_id}">
          <mxGeometry relative="1" as="geometry">{offset_xml}</mxGeometry>
        </mxCell>'''
        self.elements.append(elem)

    def add_orthogonal_stepped_arrow(self, cell_id, src_id, tgt_id, label, waypoints, exit_xy=None, entry_xy=None, label_offset=None):
        """
        Guarantees STRICT 90-DEGREE ORTHOGONAL STEPPED LINE.
        All intermediate waypoints form pure horizontal and vertical segments.
        """
        style = ("edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
                 "strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;"
                 "fontFamily=Arial;fontSize=10;fontColor=#111827;labelBackgroundColor=#FFFFFF;spacing=2;")
        if exit_xy:
            style += f"exitX={exit_xy[0]:.4f};exitY={exit_xy[1]:.4f};exitDx=0;exitDy=0;"
        if entry_xy:
            style += f"entryX={entry_xy[0]:.4f};entryY={entry_xy[1]:.4f};entryDx=0;entryDy=0;"

        pts = "".join([f'<mxPoint x="{int(pt[0])}" y="{int(pt[1])}" />' for pt in waypoints])
        pts_xml = f'<Array as="points">{pts}</Array>'

        offset_xml = ""
        if label_offset:
            offset_xml = f'<mxPoint x="{label_offset[0]}" y="{label_offset[1]}" as="offset" />'

        elem = f'''        <mxCell id="{cell_id}" parent="1" style="{style}" value="{xml_escape(label)}" edge="1" source="{src_id}" target="{tgt_id}">
          <mxGeometry relative="1" as="geometry">{pts_xml}{offset_xml}</mxGeometry>
        </mxCell>'''
        self.elements.append(elem)

    def save(self, filepath):
        content = f'''<?xml version="1.0" encoding="utf-8"?>
<mxfile host="app.diagrams.net" agent="Antigravity" version="24.7.17">
  <diagram id="{self.diagram_id}" name="{self.name}">
    <mxGraphModel dx="{self.width}" dy="{self.height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.width}" pageHeight="{self.height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{chr(10).join(self.elements)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Generated: {filepath} ({self.width}x{self.height})")


# ==================================================================================
# 1. DFD MỨC 0 — NGỮ CẢNH HỆ THỐNG
# ==================================================================================
def build_level_0():
    d = StraightDrawioDiagram("dfd_0", "DFD Mức 0", width=1200, height=760)
    d.add_title("SƠ ĐỒ DFD MỨC 0 — NGỮ CẢNH HỆ THỐNG THUYẾT MINH ĐA NGÔN NGỮ")

    # Center Process
    d.add_process("P0", "<b>0</b><br/><br/>Hệ thống thuyết minh<br/>đa ngôn ngữ<br/>Thảo Cầm Viên Sài Gòn", 450, 70, 260, 650)

    # Left Actors
    d.add_actor("E1", "Khách tham quan", 40, 70, 180, 270)
    d.add_actor("E2", "Nhân viên", 40, 370, 180, 190)
    d.add_actor("E3", "Quản trị viên", 40, 590, 180, 130)

    # Right Actors (Aligned to match horizontal arrow heights)
    d.add_actor("E4", "Cổng thanh toán", 940, 70, 190, 110)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 940, 230, 190, 110)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 940, 390, 190, 330)

    # Left - Khách tham quan (3 pairs = 6 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f01", "E1", "P0", "Yêu cầu thanh toán &amp; đổi phiên", 95)
    d.add_straight_h_arrow("f02", "P0", "E1", "Thông tin thanh toán &amp; token phiên", 135)
    d.add_straight_h_arrow("f03", "E1", "P0", "Yêu cầu nội dung, GPS &amp; hiện diện", 185)
    d.add_straight_h_arrow("f04", "P0", "E1", "Gói bản đồ, lộ trình &amp; âm thanh", 225)
    d.add_straight_h_arrow("f05", "E1", "P0", "Câu hỏi tra cứu thông tin", 275)
    d.add_straight_h_arrow("f06", "P0", "E1", "Câu trả lời có trích dẫn nguồn", 315)

    # Left - Nhân viên (2 pairs = 4 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f07", "E2", "P0", "Xác nhận tiền mặt &amp; tra cứu phiên", 405)
    d.add_straight_h_arrow("f08", "P0", "E2", "Mã ngắn 6 chữ số &amp; token cấp lại", 445)
    d.add_straight_h_arrow("f09", "E2", "P0", "Dữ liệu điểm tham quan, tour &amp; tài liệu", 495)
    d.add_straight_h_arrow("f10", "P0", "E2", "Kết quả cập nhật &amp; tiến độ tác vụ", 535)

    # Left - Quản trị viên (1 pair = 2 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f11", "E3", "P0", "Hồ sơ nhân viên mới &amp; bộ lọc giám sát", 625)
    d.add_straight_h_arrow("f12", "P0", "E3", "Hồ sơ đã tạo, nhật ký &amp; báo cáo", 685)

    # Right - Cổng thanh toán (1 pair = 2 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f13", "P0", "E4", "Yêu cầu giao dịch thanh toán", 95)
    d.add_straight_h_arrow("f14", "E4", "P0", "Webhook kết quả thanh toán chữ ký số", 145)

    # Right - Dịch vụ dịch và TTS (1 pair = 2 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f15", "P0", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", 255)
    d.add_straight_h_arrow("f16", "E5", "P0", "Bản dịch đa ngôn ngữ &amp; tệp âm thanh WAV", 305)

    # Right - Dịch vụ embedding và LLM (2 pairs = 4 arrows, 100% straight horizontal)
    d.add_straight_h_arrow("f17", "P0", "E6", "Câu hỏi truy vấn &amp; ngữ cảnh trích dẫn", 430)
    d.add_straight_h_arrow("f18", "E6", "P0", "Vector câu hỏi &amp; câu trả lời mô hình", 485)
    d.add_straight_h_arrow("f19", "P0", "E6", "Đoạn tài liệu kiến thức cần tạo vector", 575)
    d.add_straight_h_arrow("f20", "E6", "P0", "Mảng vector nhúng của đoạn tài liệu", 655)

    d.save(os.path.join(OUT_DIR, "DFD_Level_0_Context.drawio"))


# ==================================================================================
# 2. DFD MỨC 1 — PHÂN RÃ TOÀN HỆ THỐNG
# ==================================================================================
def build_level_1():
    d = StraightDrawioDiagram("dfd_1", "DFD Mức 1 Toàn hệ thống", width=1560, height=1100)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — PHÂN RÃ TOÀN HỆ THỐNG THUYẾT MINH ĐA NGÔN NGỮ")

    # TOP: Nhân viên (Quầy vé)
    d.add_actor("E2_Top", "Nhân viên (Quầy vé)", 350, 50, 260, 45)

    # Left Column Actors
    d.add_actor("E1", "Khách tham quan", 30, 165, 160, 415)
    d.add_actor("E2_Left", "Nhân viên (Nội dung)", 30, 650, 160, 105)
    d.add_actor("E3", "Quản trị viên", 30, 810, 160, 105)

    # Center-Left Column Processes (x=350, w=260)
    d.add_process("P1", "<b>1.0</b><br/><br/>Quản lý thanh toán<br/>và phiên tham quan", 350, 165, 260, 105)
    d.add_process("P2", "<b>2.0</b><br/><br/>Cung cấp nội dung bản đồ,<br/>lộ trình và thuyết minh", 350, 325, 260, 105)
    d.add_process("P3", "<b>3.0</b><br/><br/>Xử lý hỏi đáp thông minh<br/>trợ lý ảo RAG", 350, 485, 260, 105)
    d.add_process("P4", "<b>4.0</b><br/><br/>Quản trị nội dung, lộ trình<br/>và kho kiến thức", 350, 650, 260, 105)
    d.add_process("P5", "<b>5.0</b><br/><br/>Quản trị tài khoản nội bộ<br/>và giám sát hệ thống", 350, 810, 260, 105)

    # Center-Right Column Data Stores (x=760, w=220)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 760, 240, 220, 60)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 760, 340, 220, 60)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 760, 430, 220, 55)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 760, 560, 220, 60)
    d.add_store("D1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 760, 810, 220, 60)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 760, 960, 460, 85)

    # Right Column External Services (x=1300, w=190)
    d.add_actor("E4", "Cổng thanh toán", 1300, 165, 190, 80)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 1300, 485, 190, 120)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 1300, 650, 190, 80)

    # 1. External Flows (100% Straight)
    # E2_Top <-> P1 (100% Straight Vertical)
    d.add_straight_v_arrow("f07", "E2_Top", "P1", "Xác nhận tiền mặt<br/>&amp; tra cứu phiên", 410)
    d.add_straight_v_arrow("f08", "P1", "E2_Top", "Mã ngắn 6 chữ số<br/>&amp; token cấp lại", 550)

    # E1 <-> P1, P2, P3 (100% Straight Horizontal)
    d.add_straight_h_arrow("f01", "E1", "P1", "Yêu cầu thanh toán &amp; mã đổi phiên", 190)
    d.add_straight_h_arrow("f02", "P1", "E1", "Thông tin thanh toán &amp; token phiên", 240)

    d.add_straight_h_arrow("f03", "E1", "P2", "Yêu cầu nội dung, GPS &amp; hiện diện", 350)
    d.add_straight_h_arrow("f04", "P2", "E1", "Gói bản đồ, lộ trình &amp; tệp âm thanh", 400)

    d.add_straight_h_arrow("f05", "E1", "P3", "Câu hỏi tra cứu thông tin", 510)
    d.add_straight_h_arrow("f06", "P3", "E1", "Câu trả lời có trích dẫn nguồn", 560)

    # E2_Left <-> P4 (100% Straight Horizontal)
    d.add_straight_h_arrow("f09", "E2_Left", "P4", "Dữ liệu điểm tham quan, tour &amp; tài liệu", 675)
    d.add_straight_h_arrow("f10", "P4", "E2_Left", "Kết quả cập nhật &amp; tiến độ tác vụ", 725)

    # E3 <-> P5 (100% Straight Horizontal)
    d.add_straight_h_arrow("f11", "E3", "P5", "Hồ sơ nhân viên mới &amp; bộ lọc giám sát", 835)
    d.add_straight_h_arrow("f12", "P5", "E3", "Hồ sơ đã tạo, nhật ký &amp; báo cáo", 885)

    # P1 <-> E4 (100% Straight Horizontal passing above D2)
    d.add_straight_h_arrow("f13", "P1", "E4", "Yêu cầu giao dịch thanh toán", 185)
    d.add_straight_h_arrow("f14", "E4", "P1", "Webhook kết quả thanh toán chữ ký số", 225)

    # P3 <-> E6 (100% Straight Horizontal passing between D4 and D5)
    d.add_straight_h_arrow("f17", "P3", "E6", "Câu hỏi truy vấn &amp; ngữ cảnh trích dẫn", 515)
    d.add_straight_h_arrow("f18", "E6", "P3", "Vector câu hỏi &amp; câu trả lời mô hình", 555)

    # P4 <-> E5 (100% Straight Horizontal passing between D5 and D1)
    d.add_straight_h_arrow("f15", "P4", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", 675)
    d.add_straight_h_arrow("f16", "E5", "P4", "Bản dịch đa ngôn ngữ &amp; tệp âm thanh WAV", 715)

    # P4 <-> E6 (Right Corridor - 100% Orthogonal)
    d.add_orthogonal_stepped_arrow("f19", "P4", "E6", "Đoạn tài liệu kiến thức cần tạo vector",
                                  waypoints=[(610, 740), (1240, 740), (1240, 580), (1300, 580)],
                                  exit_xy=(1.0, 0.8571), entry_xy=(0.0, 0.7917))
    d.add_orthogonal_stepped_arrow("f20", "E6", "P4", "Mảng vector nhúng của đoạn tài liệu",
                                  waypoints=[(1300, 600), (1210, 600), (1210, 755), (610, 755)],
                                  exit_xy=(0.0, 0.9583), entry_xy=(1.0, 1.0))

    # 2. Data Store Connections (100% Orthogonal)
    d.add_straight_h_arrow("ds_p1_d2", "P1", "D2", "Lưu phiên, thanh toán &amp; mã tạm", 255)
    d.add_straight_h_arrow("ds_d3_p2", "D3", "P2", "Đọc điểm tham quan, bản dịch, WAV", 370)
    d.add_straight_h_arrow("ds_p5_d1", "P5", "D1", "Quản lý tài khoản &amp; phiên nội bộ", 840)

    # Stepped orthogonal store links
    d.add_orthogonal_stepped_arrow("ds_d2_p2", "D2", "P2", "Kiểm tra token phiên 24h",
                                  waypoints=[(760, 290), (690, 290), (690, 350), (610, 350)],
                                  exit_xy=(0.0, 0.8333), entry_xy=(1.0, 0.2381))
    d.add_orthogonal_stepped_arrow("ds_d2_p3", "D2", "P3", "Kiểm tra phiên &amp; rate limit",
                                  waypoints=[(760, 295), (660, 295), (660, 505), (610, 505)],
                                  exit_xy=(0.0, 0.9167), entry_xy=(1.0, 0.1905))

    d.add_orthogonal_stepped_arrow("ds_p4_d3", "P4", "D3", "Ghi điểm tham quan, bản dịch, WAV",
                                  waypoints=[(610, 660), (700, 660), (700, 390), (760, 390)],
                                  exit_xy=(1.0, 0.0952), entry_xy=(0.0, 0.8333))

    d.add_orthogonal_stepped_arrow("ds_d4_p2", "D4", "P2", "Đọc danh sách lộ trình",
                                  waypoints=[(760, 455), (680, 455), (680, 410), (610, 410)],
                                  exit_xy=(0.0, 0.4545), entry_xy=(1.0, 0.8095))

    d.add_orthogonal_stepped_arrow("ds_p4_d4", "P4", "D4", "Lưu danh mục tour &amp; thứ tự điểm",
                                  waypoints=[(610, 680), (720, 680), (720, 470), (760, 470)],
                                  exit_xy=(1.0, 0.2857), entry_xy=(0.0, 0.7273))

    d.add_orthogonal_stepped_arrow("ds_d5_p3", "D5", "P3", "Truy hồi đoạn kiến thức tương đồng",
                                  waypoints=[(760, 580), (670, 580), (670, 570), (610, 570)],
                                  exit_xy=(0.0, 0.3333), entry_xy=(1.0, 0.8095))

    d.add_orthogonal_stepped_arrow("ds_p4_d5", "P4", "D5", "Lưu tài liệu, đoạn &amp; vector",
                                  waypoints=[(610, 705), (710, 705), (710, 610), (760, 610)],
                                  exit_xy=(1.0, 0.5238), entry_xy=(0.0, 0.8333))

    # Central Logging Bus to D6 (100% Orthogonal with dedicated vertical channels)
    d.add_orthogonal_stepped_arrow("ds_p1_d6", "P1", "D6", "Ghi log thanh toán",
                                  waypoints=[(610, 270), (1120, 270), (1120, 960)],
                                  exit_xy=(1.0, 1.0), entry_xy=(0.7826, 0.0))
    d.add_orthogonal_stepped_arrow("ds_p2_d6", "P2", "D6", "Ghi log hiện diện, tải gói",
                                  waypoints=[(610, 420), (1080, 420), (1080, 960)],
                                  exit_xy=(1.0, 0.9048), entry_xy=(0.6957, 0.0))
    d.add_orthogonal_stepped_arrow("ds_p3_d6", "P3", "D6", "Ghi log hỏi đáp RAG",
                                  waypoints=[(610, 580), (1040, 580), (1040, 960)],
                                  exit_xy=(1.0, 0.9048), entry_xy=(0.6087, 0.0))
    d.add_orthogonal_stepped_arrow("ds_p4_d6", "P4", "D6", "Ghi log cập nhật nội dung",
                                  waypoints=[(610, 750), (1000, 750), (1000, 960)],
                                  exit_xy=(1.0, 0.9524), entry_xy=(0.5217, 0.0))

    d.add_orthogonal_stepped_arrow("ds_d6_p5", "D6", "P5", "Đọc toàn bộ nhật ký &amp; thống kê",
                                  waypoints=[(760, 990), (660, 990), (660, 900), (610, 900)],
                                  exit_xy=(0.0, 0.3529), entry_xy=(1.0, 0.8571))

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_System.drawio"))


# ==================================================================================
# 3. DFD MỨC 2 — TIẾN TRÌNH 1.0 (QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN)
# ==================================================================================
def build_level_2_p1():
    d = StraightDrawioDiagram("dfd_2_p1", "DFD Mức 2 Tiến trình 1.0", width=1220, height=840)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 1.0 QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 70, 160, 490)
    d.add_actor("E2", "Nhân viên", 30, 600, 160, 190)

    # Sub-processes Center (x=410, w=250)
    d.add_process("P1_1", "<b>1.1</b><br/>Khởi tạo phiên và<br/>yêu cầu thanh toán online", 410, 70, 250, 85)
    d.add_process("P1_2", "<b>1.2</b><br/>Xác minh webhook và<br/>kích hoạt mã đổi phiên", 410, 205, 250, 85)
    d.add_process("P1_3", "<b>1.3</b><br/>Xác nhận tiền mặt và<br/>cấp mã ngắn 6 chữ số", 410, 345, 250, 85)
    d.add_process("P1_4", "<b>1.4</b><br/>Đổi mã xác thực và<br/>cấp token phiên khách", 410, 485, 250, 85)
    d.add_process("P1_5", "<b>1.5</b><br/>Tra cứu phiên và<br/>cấp lại token khách", 410, 630, 250, 85)

    # Right Side: External Actor & Data Stores
    d.add_actor("E4", "Cổng thanh toán", 940, 70, 180, 85)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 940, 205, 180, 365)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 940, 630, 180, 120)

    # E1 <-> 1.1 (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e1_p11", "E1", "P1_1", "Yêu cầu thanh toán online", 95)
    d.add_straight_h_arrow("f_p11_e1", "P1_1", "E1", "Thông tin thanh toán &amp; QR", 135)

    # 1.1 -> E4 (100% Straight Horizontal)
    d.add_straight_h_arrow("f_p11_e4", "P1_1", "E4", "Yêu cầu giao dịch thanh toán", 95)

    # E4 -> 1.2 (100% Orthogonal)
    d.add_orthogonal_stepped_arrow("f_e4_p12", "E4", "P1_2", "Webhook kết quả thanh toán chữ ký số",
                                  waypoints=[(940, 135), (830, 135), (830, 230), (660, 230)],
                                  exit_xy=(0.0, 0.7647), entry_xy=(1.0, 0.2941))

    # E1 <-> 1.4 (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e1_p14", "E1", "P1_4", "Nhập mã đổi phiên / mã 6 số", 505)
    d.add_straight_h_arrow("f_p14_e1", "P1_4", "E1", "Token phiên tham quan 24h", 545)

    # E2 <-> 1.5 (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e2_p15", "E2", "P1_5", "Tra cứu phiên cần hỗ trợ", 650)
    d.add_straight_h_arrow("f_p15_e2", "P1_5", "E2", "Token cấp lại cho khách", 690)

    # E2 <-> 1.3 (Corridor on left: x=240, 360 - 100% Orthogonal)
    d.add_orthogonal_stepped_arrow("f_e2_p13", "E2", "P1_3", "Xác nhận tiền mặt tại quầy",
                                  waypoints=[(190, 630), (250, 630), (250, 365), (410, 365)],
                                  exit_xy=(1.0, 0.1579), entry_xy=(0.0, 0.2353))
    d.add_orthogonal_stepped_arrow("f_p13_e2", "P1_3", "E2", "Mã ngắn 6 chữ số cấp khách",
                                  waypoints=[(410, 410), (350, 410), (350, 660), (190, 660)],
                                  exit_xy=(0.0, 0.7647), entry_xy=(1.0, 0.3158))

    # Internal Flows (100% Straight Vertical)
    d.add_straight_v_arrow("int_11_12", "P1_1", "P1_2", "Mã giao dịch chờ đối soát", 535)
    d.add_straight_v_arrow("int_13_14", "P1_3", "P1_4", "Mã ngắn 6 số kích hoạt", 535)
    # Internal stepped 1.2 -> 1.4
    d.add_orthogonal_stepped_arrow("int_12_14", "P1_2", "P1_4", "Mã một lần kích hoạt",
                                  waypoints=[(410, 260), (380, 260), (380, 500), (410, 500)],
                                  exit_xy=(0.0, 0.6471), entry_xy=(0.0, 0.1765))

    # Store Connections (100% Straight Horizontal & Orthogonal)
    d.add_orthogonal_stepped_arrow("st_p11_d2", "P1_1", "D2", "Tạo bản ghi phiên chờ",
                                  waypoints=[(660, 135), (860, 135), (860, 230), (940, 230)],
                                  exit_xy=(1.0, 0.7647), entry_xy=(0.0, 0.0685))

    d.add_straight_h_arrow("st_p12_d2", "P1_2", "D2", "Cập nhật thanh toán &amp; sinh mã", 260)
    d.add_straight_h_arrow("st_p13_d2", "P1_3", "D2", "Lưu phiên tiền mặt &amp; mã ngắn", 385)
    d.add_straight_h_arrow("st_p14_d2", "P1_4", "D2", "Thu hồi mã &amp; cấp token 24h", 525)

    d.add_orthogonal_stepped_arrow("st_p15_d2", "P1_5", "D2", "Tra cứu phiên &amp; cấp lại token",
                                  waypoints=[(660, 650), (860, 650), (860, 545), (940, 545)],
                                  exit_xy=(1.0, 0.2353), entry_xy=(0.0, 0.9315))

    # D6 connections
    d.add_orthogonal_stepped_arrow("st_p13_d6", "P1_3", "D6", "Ghi log tiền mặt",
                                  waypoints=[(660, 410), (880, 410), (880, 660), (940, 660)],
                                  exit_xy=(1.0, 0.7647), entry_xy=(0.0, 0.2500))
    d.add_straight_h_arrow("st_p15_d6", "P1_5", "D6", "Ghi log cấp lại token", 700)

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P1_Payment_Session.drawio"))


# ==================================================================================
# 4. DFD MỨC 2 — TIẾN TRÌNH 2.0 (CUNG CẤP NỘI DUNG, LỘ TRÌNH VÀ THUYẾT MINH)
# ==================================================================================
def build_level_2_p2():
    d = StraightDrawioDiagram("dfd_2_p2", "DFD Mức 2 Tiến trình 2.0", width=1220, height=780)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 2.0 CUNG CẤP NỘI DUNG BẢN ĐỒ, LỘ TRÌNH VÀ THUYẾT MINH")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 70, 160, 600)

    # Sub-processes
    d.add_process("P2_1", "<b>2.1</b><br/>Kiểm tra hiệu lực phiên<br/>tham quan và ngôn ngữ", 400, 70, 250, 90)
    d.add_process("P2_2", "<b>2.2</b><br/>Tổng hợp gói nội dung<br/>điểm tham quan và lộ trình", 400, 230, 250, 95)
    d.add_process("P2_3", "<b>2.3</b><br/>Cung cấp tệp âm thanh<br/>thuyết minh đa ngôn ngữ", 400, 390, 250, 95)
    d.add_process("P2_4", "<b>2.4</b><br/>Ghi nhận hiện diện trực tuyến<br/>và thống kê điểm ghé", 400, 550, 250, 90)

    # Right Data Stores (Aligned directly with corresponding process)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 940, 70, 190, 90)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 940, 215, 190, 150)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 940, 400, 190, 75)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 940, 535, 190, 135)

    # 1. External Flows (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e1_p21", "E1", "P2_1", "Token phiên &amp; mã ngôn ngữ", 115)
    d.add_straight_h_arrow("f_p22_e1", "P2_2", "E1", "Gói dữ liệu bản đồ &amp; lộ trình", 275)
    d.add_straight_h_arrow("f_p23_e1", "P2_3", "E1", "Tệp âm thanh thuyết minh WAV", 435)
    d.add_straight_h_arrow("f_e1_p24", "E1", "P2_4", "Tọa độ GPS &amp; nhịp tim hiện diện", 595)

    # 2. Internal Flows (100% Straight Vertical)
    d.add_straight_v_arrow("int_21_22", "P2_1", "P2_2", "Phiên hợp lệ tải nội dung", 525)
    d.add_straight_v_arrow("int_22_23", "P2_2", "P2_3", "Phiên hợp lệ phát âm thanh", 525)

    # 3. Store Interactions (100% Straight Horizontal & Orthogonal)
    d.add_straight_h_arrow("st_d2_p21", "D2", "P2_1", "Đối chiếu hiệu lực token phiên", 115)
    d.add_straight_h_arrow("st_d3_p22", "D3", "P2_2", "Đọc tọa độ, bán kính &amp; bản dịch", 260)
    d.add_orthogonal_stepped_arrow("st_d3_p23", "D3", "P2_3", "Đọc luồng tệp âm thanh WAV",
                                  waypoints=[(940, 335), (780, 335), (780, 420), (650, 420)],
                                  exit_xy=(0.0, 0.8000), entry_xy=(1.0, 0.3158))

    d.add_orthogonal_stepped_arrow("st_d4_p22", "D4", "P2_2", "Đọc danh sách lộ trình &amp; điểm dừng",
                                  waypoints=[(940, 435), (820, 435), (820, 305), (650, 305)],
                                  exit_xy=(0.0, 0.4667), entry_xy=(1.0, 0.7895))

    d.add_orthogonal_stepped_arrow("st_p22_d6", "P2_2", "D6", "Ghi log tải gói nội dung",
                                  waypoints=[(650, 320), (860, 320), (860, 560), (940, 560)],
                                  exit_xy=(1.0, 0.9474), entry_xy=(0.0, 0.1852))

    d.add_straight_h_arrow("st_p24_d6", "P2_4", "D6", "Cập nhật hiện diện &amp; lượt ghé", 615)

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P2_Visitor_Content_Audio.drawio"))


# ==================================================================================
# 5. DFD MỨC 2 — TIẾN TRÌNH 3.0 (XỬ LÝ HỎI ĐÁP THÔNG MINH TRỢ LÝ ẢO RAG)
# ==================================================================================
def build_level_2_p3():
    d = StraightDrawioDiagram("dfd_2_p3", "DFD Mức 2 Tiến trình 3.0", width=1220, height=760)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 3.0 XỬ LÝ HỎI ĐÁP THÔNG MINH RAG")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 70, 160, 590)

    # Sub-processes Center
    d.add_process("P3_1", "<b>3.1</b><br/>Kiểm tra phiên khách và<br/>giới hạn tần suất hỏi", 400, 70, 250, 90)
    d.add_process("P3_2", "<b>3.2</b><br/>Kiểm tra phạm vi câu hỏi<br/>và tạo vector truy vấn", 400, 225, 250, 90)
    d.add_process("P3_3", "<b>3.3</b><br/>Truy hồi đoạn kiến thức<br/>tương đồng ngữ nghĩa", 400, 380, 250, 90)
    d.add_process("P3_4", "<b>3.4</b><br/>Tổng hợp câu trả lời<br/>có trích dẫn và ghi nhật ký", 400, 540, 250, 95)

    # Right Column (Aligned directly with corresponding process)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 940, 70, 190, 90)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 940, 205, 190, 130)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 940, 380, 190, 90)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 940, 540, 190, 95)

    # 1. External Flows (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e1_p31", "E1", "P3_1", "Câu hỏi tra cứu, token &amp; ngôn ngữ", 115)
    d.add_straight_h_arrow("f_p34_e1", "P3_4", "E1", "Câu trả lời kèm trích dẫn nguồn", 585)

    # P3_2 <-> E6 (100% Straight Horizontal)
    d.add_straight_h_arrow("f_p32_e6", "P3_2", "E6", "Câu hỏi cần tạo vector nhúng", 245)
    d.add_straight_h_arrow("f_e6_p32", "E6", "P3_2", "Vector biểu diễn ngữ nghĩa", 295)

    # P3_4 <-> E6 (100% Orthogonal with dedicated vertical channels)
    d.add_orthogonal_stepped_arrow("f_p34_e6", "P3_4", "E6", "Lời nhắc kèm ngữ cảnh trích dẫn",
                                  waypoints=[(650, 560), (860, 560), (860, 320), (940, 320)],
                                  exit_xy=(1.0, 0.2105), entry_xy=(0.0, 0.8846), label_offset=(-70, 0))
    d.add_orthogonal_stepped_arrow("f_e6_p34", "E6", "P3_4", "Câu trả lời mô hình &amp; mã trích dẫn",
                                  waypoints=[(940, 335), (800, 335), (800, 605), (650, 605)],
                                  exit_xy=(0.0, 1.0000), entry_xy=(1.0, 0.6842), label_offset=(70, 0))

    # 2. Internal Flows (100% Straight Vertical)
    d.add_straight_v_arrow("int_31_32", "P3_1", "P3_2", "Câu hỏi hợp lệ chưa vượt hạn mức", 525)
    d.add_straight_v_arrow("int_32_33", "P3_2", "P3_3", "Vector câu hỏi kèm câu hỏi gốc", 525)
    d.add_straight_v_arrow("int_33_34", "P3_3", "P3_4", "Tập đoạn kiến thức tương đồng cao nhất", 525)

    # 3. Store Interactions (100% Straight Horizontal)
    d.add_straight_h_arrow("st_d2_p31", "D2", "P3_1", "Kiểm tra hiệu lực phiên &amp; rate limit", 115)
    d.add_straight_h_arrow("st_d5_p33", "D5", "P3_3", "Đọc các đoạn tài liệu &amp; vector nhúng", 425)
    d.add_straight_h_arrow("st_p34_d6", "P3_4", "D6", "Ghi lịch sử hỏi đáp, câu hỏi &amp; trích dẫn", 585)

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P3_Chatbot_RAG.drawio"))


# ==================================================================================
# 6. DFD MỨC 2 — TIẾN TRÌNH 4.0 (QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC)
#    (CRITICAL: SOLVES ALL ISSUES IN USER'S SCREENSHOT)
# ==================================================================================
def build_level_2_p4():
    d = StraightDrawioDiagram("dfd_2_p4", "DFD Mức 2 Tiến trình 4.0", width=1280, height=920)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 4.0 QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC")

    # Actor Left: Nhân viên
    d.add_actor("E2", "Nhân viên", 40, 70, 160, 760)

    # Sub-processes Center: Process Column (x=380, w=250)
    d.add_process("P4_1", "<b>4.1</b><br/>Cập nhật điểm tham quan<br/>và khởi tạo tác vụ nội dung", 380, 70, 250, 90)
    d.add_process("P4_2", "<b>4.2</b><br/>Xử lý nền dịch văn bản<br/>và tổng hợp âm thanh", 380, 230, 250, 90)
    d.add_process("P4_3", "<b>4.3</b><br/>Quản lý lộ trình<br/>tham quan mẫu", 380, 410, 250, 90)
    d.add_process("P4_4", "<b>4.4</b><br/>Phân đoạn tài liệu và<br/>tạo vector kho kiến thức", 380, 590, 250, 100)

    # Right Column: Data Stores & External Services (x=930, w=190)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 930, 70, 190, 90)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 930, 230, 190, 90)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 930, 410, 190, 90)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 930, 560, 190, 65)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 930, 645, 190, 95)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 930, 770, 190, 80)

    # 1. External Flows Left (100% STRAIGHT HORIZONTAL - Delta Y = 0.0000 px)
    d.add_straight_h_arrow("f_e2_p41", "E2", "P4_1", "Dữ liệu điểm tham quan tiếng Việt", 95)
    d.add_straight_h_arrow("f_p41_e2", "P4_1", "E2", "Kết quả lưu &amp; mã tác vụ tạo mới", 135)

    d.add_straight_h_arrow("f_e2_p43", "E2", "P4_3", "Dữ liệu lộ trình &amp; điểm dừng", 435)
    d.add_straight_h_arrow("f_p43_e2", "P4_3", "E2", "Kết quả cập nhật lộ trình mẫu", 475)

    d.add_straight_h_arrow("f_e2_p44", "E2", "P4_4", "Tài liệu kiến thức mới / sửa đổi", 615)
    d.add_straight_h_arrow("f_p44_e2", "P4_4", "E2", "Kết quả phân đoạn &amp; công bố", 665)

    # 2. Right Side 100% STRAIGHT HORIZONTAL ARROWS (Delta Y = 0.0000 px)
    d.add_straight_h_arrow("st_p41_d3", "P4_1", "D3", "Lưu điểm tham quan &amp; tạo tác vụ chờ", 95)

    d.add_straight_h_arrow("f_p42_e5", "P4_2", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", 250, label_offset=(-30, 0))
    d.add_straight_h_arrow("f_e5_p42", "E5", "P4_2", "Bản dịch &amp; tệp âm thanh WAV", 290, label_offset=(-30, 0))

    d.add_straight_h_arrow("st_p43_d4", "P4_3", "D4", "Lưu bản ghi lộ trình &amp; điểm dừng", 445, label_offset=(-30, 0))

    d.add_straight_h_arrow("st_p44_d5", "P4_4", "D5", "Lưu tài liệu, các đoạn &amp; vector", 595, label_offset=(-30, 0))

    d.add_straight_h_arrow("f_p44_e6", "P4_4", "E6", "Đoạn văn bản cần tạo vector", 660, label_offset=(-30, 0))
    d.add_straight_h_arrow("f_e6_p44", "E6", "P4_4", "Danh sách vector nhúng ngữ nghĩa", 705, label_offset=(-30, 0))

    # 3. Internal Pipeline Flow (100% Straight Vertical)
    d.add_straight_v_arrow("int_41_42", "P4_1", "P4_2", "Thông báo tác vụ dịch &amp; TTS mới tạo", 505)

    # 4. Stepped Store Interactions: 4.2 <-> D3 in the clear gap y=160..230
    d.add_orthogonal_stepped_arrow("st_d3_p42", "D3", "P4_2", "Đọc tác vụ chờ &amp; văn bản gốc",
                                  waypoints=[(960, 160), (960, 185), (570, 185), (570, 230)],
                                  exit_xy=(0.1579, 1.0), entry_xy=(0.7600, 0.0), label_offset=(0, -10))
    d.add_orthogonal_stepped_arrow("st_p42_d3", "P4_2", "D3", "Lưu bản dịch, WAV &amp; hoàn tất",
                                  waypoints=[(610, 230), (610, 205), (1020, 205), (1020, 160)],
                                  exit_xy=(0.9200, 0.0), entry_xy=(0.4737, 1.0), label_offset=(0, 10))

    # 5. Logging to D6:
    # 4.1 -> D6 via clean right corridor at x=880
    d.add_orthogonal_stepped_arrow("st_p41_d6", "P4_1", "D6", "Ghi log điểm tham quan",
                                  waypoints=[(630, 145), (880, 145), (880, 790), (930, 790)],
                                  exit_xy=(1.0, 0.8333), entry_xy=(0.0, 0.2500), label_offset=(-60, 0))

    # 4.3 -> D6 via clean corridor at x=860
    d.add_orthogonal_stepped_arrow("st_p43_d6", "P4_3", "D6", "Ghi log lộ trình",
                                  waypoints=[(630, 485), (860, 485), (860, 815), (930, 815)],
                                  exit_xy=(1.0, 0.8333), entry_xy=(0.0, 0.5625), label_offset=(-60, 0))

    # 4.4 -> D6 exits bottom of 4.4 across bottom clear area!
    d.add_orthogonal_stepped_arrow("st_p44_d6", "P4_4", "D6", "Ghi log kho kiến thức",
                                  waypoints=[(550, 690), (550, 840), (930, 840)],
                                  exit_xy=(0.6800, 1.0), entry_xy=(0.0, 0.8750), label_offset=(-60, 0))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P4_Content_Knowledge_Admin.drawio"))


# ==================================================================================
# 7. DFD MỨC 2 — TIẾN TRÌNH 5.0 (QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG)
# ==================================================================================
def build_level_2_p5():
    d = StraightDrawioDiagram("dfd_2_p5", "DFD Mức 2 Tiến trình 5.0", width=1240, height=880)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 5.0 QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG")

    # Actors Left
    d.add_actor("E3", "Quản trị viên", 40, 70, 160, 740)

    # Sub-processes Center
    d.add_process("P5_1", "<b>5.1</b><br/>Xác thực đăng nhập và<br/>quản lý phiên nội bộ", 390, 70, 250, 90)
    d.add_process("P5_2", "<b>5.2</b><br/>Tạo và quản lý<br/>tài khoản nhân viên", 390, 225, 250, 90)
    d.add_process("P5_3", "<b>5.3</b><br/>Truy vấn và lọc<br/>nhật ký thao tác", 390, 380, 250, 90)
    d.add_process("P5_4", "<b>5.4</b><br/>Tổng hợp chỉ số sức khỏe<br/>và thống kê vận hành", 390, 560, 250, 140)

    # Right: Data Stores (Aligned directly with corresponding process)
    d.add_store("D1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 930, 70, 200, 90)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 930, 225, 200, 120)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 930, 375, 200, 60)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 930, 465, 200, 60)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 930, 555, 200, 60)

    # 1. External Flows (100% Straight Horizontal)
    d.add_straight_h_arrow("f_e3_p51", "E3", "P5_1", "Thông tin đăng nhập nội bộ", 95)
    d.add_straight_h_arrow("f_p51_e3", "P5_1", "E3", "Token phiên nội bộ", 135)

    d.add_straight_h_arrow("f_e3_p52", "E3", "P5_2", "Hồ sơ nhân viên mới cần cấp", 250)
    d.add_straight_h_arrow("f_p52_e3", "P5_2", "E3", "Hồ sơ nhân viên tạo thành công", 290)

    d.add_straight_h_arrow("f_e3_p53", "E3", "P5_3", "Bộ lọc tra cứu nhật ký kiểm toán", 405)
    d.add_straight_h_arrow("f_p53_e3", "P5_3", "E3", "Danh sách nhật ký phân trang", 445)

    d.add_straight_h_arrow("f_e3_p54", "E3", "P5_4", "Yêu cầu xem báo cáo giám sát", 590)
    d.add_straight_h_arrow("f_p54_e3", "P5_4", "E3", "Báo cáo sức khỏe &amp; thống kê", 660)

    # 2. Store Interactions (100% Straight Horizontal & Orthogonal)
    d.add_straight_h_arrow("st_d1_p51", "D1", "P5_1", "Đối chiếu mật khẩu băm", 95)
    d.add_straight_h_arrow("st_p51_d1", "P5_1", "D1", "Lưu refresh token phiên", 135)

    d.add_orthogonal_stepped_arrow("st_p52_d1", "P5_2", "D1", "Lưu tài khoản mới",
                                  waypoints=[(640, 250), (840, 250), (840, 150), (930, 150)],
                                  exit_xy=(1.0, 0.2778), entry_xy=(0.0, 0.8889), label_offset=(0, -25))
    d.add_straight_h_arrow("st_p52_d6", "P5_2", "D6", "Ghi log tạo tài khoản", 285)

    d.add_orthogonal_stepped_arrow("st_d6_p53", "D6", "P5_3", "Đọc danh sách bản ghi nhật ký",
                                  waypoints=[(930, 310), (800, 310), (800, 425), (640, 425)],
                                  exit_xy=(0.0, 0.7083), entry_xy=(1.0, 0.5000))

    # Inputs into 5.4 distributed cleanly across right side (100% Orthogonal)
    d.add_orthogonal_stepped_arrow("st_d6_p54", "D6", "P5_4", "Đọc thống kê khách &amp; hỏi đáp",
                                  waypoints=[(930, 330), (770, 330), (770, 580), (640, 580)],
                                  exit_xy=(0.0, 0.8750), entry_xy=(1.0, 0.1429))
    d.add_orthogonal_stepped_arrow("st_d2_p54", "D2", "P5_4", "Đọc số liệu phiên &amp; doanh thu",
                                  waypoints=[(930, 405), (790, 405), (790, 615), (640, 615)],
                                  exit_xy=(0.0, 0.5000), entry_xy=(1.0, 0.3929))
    d.add_orthogonal_stepped_arrow("st_d3_p54", "D3", "P5_4", "Đọc độ phủ ngôn ngữ &amp; lỗi tác vụ",
                                  waypoints=[(930, 495), (810, 495), (810, 645), (640, 645)],
                                  exit_xy=(0.0, 0.5000), entry_xy=(1.0, 0.6071))
    d.add_orthogonal_stepped_arrow("st_d5_p54", "D5", "P5_4", "Đọc số tài liệu đã công bố",
                                  waypoints=[(930, 585), (830, 585), (830, 675), (640, 675)],
                                  exit_xy=(0.0, 0.5000), entry_xy=(1.0, 0.8214))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P5_Auth_Admin_Monitoring.drawio"))


# ==================================================================================
# 8. DFD MỨC 3 — TIẾN TRÌNH 4.2 (XỬ LÝ NỀN DỊCH VĂN BẢN VÀ TỔNG HỢP ÂM THANH)
# ==================================================================================
def build_level_3_p4_2():
    d = StraightDrawioDiagram("dfd_3_p42", "DFD Mức 3 Tiến trình 4.2", width=1220, height=720)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 4.2 XỬ LÝ NỀN DỊCH VĂN BẢN VÀ TỔNG HỢP ÂM THANH")

    # Sub-processes (Vertical Pipeline)
    d.add_process("P4_2_1", "<b>4.2.1</b><br/>Nhận tác vụ chờ và<br/>cấp quyền giữ phiên xử lý", 400, 70, 260, 80)
    d.add_process("P4_2_2", "<b>4.2.2</b><br/>Kiểm tra phiên bản nguồn<br/>và dịch văn bản đa ngôn ngữ", 400, 220, 260, 85)
    d.add_process("P4_2_3", "<b>4.2.3</b><br/>Tổng hợp âm thanh WAV<br/>và kiểm tra định dạng tệp", 400, 380, 260, 85)
    d.add_process("P4_2_4", "<b>4.2.4</b><br/>Lưu kho tệp media và<br/>công bố trạng thái hoàn tất", 400, 540, 260, 80)

    # Vertical Pipeline Sequence (100% Straight Vertical)
    d.add_straight_v_arrow("v_421_422", "P4_2_1", "P4_2_2", "Thông tin tác vụ &amp; mã điểm", 530)
    d.add_straight_v_arrow("v_422_423", "P4_2_2", "P4_2_3", "Văn bản bản dịch cần đọc", 530)
    d.add_straight_v_arrow("v_423_424", "P4_2_3", "P4_2_4", "Tệp âm thanh WAV hợp lệ", 530)

    # Stores & Actors
    d.add_store("D3_Left", "<b>D3</b> | Điểm tham quan &amp; Media", 40, 70, 200, 80)
    d.add_store("D3_Right", "<b>D3</b> | Điểm tham quan &amp; Media", 940, 540, 200, 80)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 940, 240, 200, 180)

    # Store Interactions Left (100% Straight Horizontal)
    d.add_straight_h_arrow("f_d3_p421", "D3_Left", "P4_2_1", "Tác vụ ở trạng thái chờ xử lý", 95)
    d.add_straight_h_arrow("f_p421_d3", "P4_2_1", "D3_Left", "Khóa phiên &amp; cập nhật đang chạy", 130)

    # E5 Interactions Right (100% Straight Horizontal)
    d.add_straight_h_arrow("f_p422_e5", "P4_2_2", "E5", "Văn bản gốc tiếng Việt", 260)
    d.add_straight_h_arrow("f_e5_p422", "E5", "P4_2_2", "Bản dịch tiếng Anh / Trung", 290)

    d.add_straight_h_arrow("f_p423_e5", "P4_2_3", "E5", "Văn bản dịch &amp; giọng đọc", 395)
    d.add_straight_h_arrow("f_e5_p423", "E5", "P4_2_3", "Luồng nhị phân tệp WAV", 420)

    # D3_Right Interaction (100% Straight Horizontal)
    d.add_straight_h_arrow("f_p424_d3", "P4_2_4", "D3_Right", "Lưu WAV &amp; đổi trạng thái hoàn tất", 580)

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio"))


# ==================================================================================
# 9. DFD MỨC 3 — TIẾN TRÌNH 3.4 (TỔNG HỢP CÂU TRẢ LỜI CÓ TRÍCH DẪN VÀ GHI NHẬT KÝ)
# ==================================================================================
def build_level_3_p3_4():
    d = StraightDrawioDiagram("dfd_3_p34", "DFD Mức 3 Tiến trình 3.4", width=1220, height=720)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 3.4 TỔNG HỢP CÂU TRẢ LỜI CÓ TRÍCH DẪN VÀ GHI NHẬT KÝ")

    # Inputs from Previous Steps Left
    d.add_process("P3_1_In", "<b>3.1</b><br/>Kiểm tra phiên khách", 40, 70, 190, 60)
    d.add_process("P3_3_In", "<b>3.3</b><br/>Truy hồi đoạn tương đồng", 40, 150, 190, 60)

    # Sub-processes (Vertical Pipeline)
    d.add_process("P3_4_1", "<b>3.4.1</b><br/>Đóng gói lời nhắc hệ thống<br/>kèm ngữ cảnh đoạn kiến thức", 400, 70, 260, 80)
    d.add_process("P3_4_2", "<b>3.4.2</b><br/>Gọi mô hình ngôn ngữ<br/>sinh phản hồi theo ngữ cảnh", 400, 220, 260, 85)
    d.add_process("P3_4_3", "<b>3.4.3</b><br/>Kiểm tra trích dẫn hợp lệ<br/>và lọc liên kết ngoài nguồn", 400, 380, 260, 85)
    d.add_process("P3_4_4", "<b>3.4.4</b><br/>Lưu nhật ký hỏi đáp<br/>và trả kết quả cho khách", 400, 540, 260, 80)

    # Vertical Pipeline Sequence (100% Straight Vertical)
    d.add_straight_v_arrow("v_341_342", "P3_4_1", "P3_4_2", "Gói lời nhắc hoàn chỉnh", 530)
    d.add_straight_v_arrow("v_342_343", "P3_4_2", "P3_4_3", "Phản hồi thô &amp; mã trích dẫn", 530)
    d.add_straight_v_arrow("v_343_344", "P3_4_3", "P3_4_4", "Câu trả lời đã kiểm duyệt", 530)

    # Inputs to 3.4.1 (100% Straight Horizontal & Orthogonal)
    d.add_straight_h_arrow("f_31_341", "P3_1_In", "P3_4_1", "Câu hỏi hợp lệ &amp; ngôn ngữ", 100)
    d.add_orthogonal_stepped_arrow("f_33_341", "P3_3_In", "P3_4_1", "Đoạn kiến thức tương đồng",
                                  waypoints=[(230, 180), (315, 180), (315, 130), (400, 130)],
                                  exit_xy=(1.0, 0.5000), entry_xy=(0.0, 0.7500))

    # LLM Interaction (100% Straight Horizontal)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 940, 220, 200, 85)
    d.add_straight_h_arrow("f_p342_e6", "P3_4_2", "E6", "Gói lời nhắc câu hỏi &amp; ngữ cảnh", 245)
    d.add_straight_h_arrow("f_e6_p342", "E6", "P3_4_2", "Văn bản phản hồi &amp; trích dẫn", 285)

    # Final outputs (100% Straight Horizontal)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 40, 540, 200, 80)
    d.add_actor("E1", "Khách tham quan", 940, 540, 200, 80)

    d.add_straight_h_arrow("f_p344_d6", "P3_4_4", "D6", "Ghi câu hỏi, trả lời &amp; trích dẫn", 580)
    d.add_straight_h_arrow("f_p344_e1", "P3_4_4", "E1", "Câu trả lời kèm danh sách trích dẫn", 580)

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P3_4_RAG_Answer_Generation.drawio"))


def main():
    print("=== Generating 9 Straight, Non-Slanted, Balanced DFD Diagrams ===")
    build_level_0()
    build_level_1()
    build_level_2_p1()
    build_level_2_p2()
    build_level_2_p3()
    build_level_2_p4()
    build_level_2_p5()
    build_level_3_p4_2()
    build_level_3_p3_4()
    print("=== Done ===")

if __name__ == "__main__":
    main()
