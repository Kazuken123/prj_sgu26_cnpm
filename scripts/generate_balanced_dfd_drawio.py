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

class DrawioDiagram:
    def __init__(self, diagram_id, name, width=1200, height=800):
        self.diagram_id = diagram_id
        self.name = name
        self.width = width
        self.height = height
        self.elements = []

    def add_title(self, text):
        elem = f'''        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Arial;fontSize=16;fontStyle=1;fillColor=none;strokeColor=none;fontColor=#111827;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="30" y="10" width="{self.width - 60}" height="30" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)

    def add_process(self, cell_id, text, x, y, w, h):
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#111827;align=center;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)

    def add_actor(self, cell_id, text, x, y, w, h):
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=13;fontStyle=1;fontColor=#111827;align=center;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)

    def add_store(self, cell_id, text, x, y, w, h):
        elem = f'''        <mxCell id="{cell_id}" parent="1" style="shape=partialRectangle;whiteSpace=wrap;html=1;left=1;right=0;top=1;bottom=1;fillColor=#F9FAFB;strokeColor=#111827;strokeWidth=2;fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#111827;align=left;spacingLeft=10;" value="{xml_escape(text)}" vertex="1">
          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />
        </mxCell>'''
        self.elements.append(elem)

    def add_arrow(self, cell_id, source_id, target_id, label, waypoints=None, exit_xy=None, entry_xy=None, label_offset=None):
        style = "rounded=0;html=1;strokeColor=#374151;strokeWidth=1.5;endArrow=block;endFill=1;fontFamily=Arial;fontSize=10;fontColor=#111827;labelBackgroundColor=#FFFFFF;spacing=2;"
        if exit_xy:
            style += f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
        if entry_xy:
            style += f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
        
        pts_xml = ""
        if waypoints:
            style += "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;"
            pts = "".join([f'<mxPoint x="{pt[0]}" y="{pt[1]}" />' for pt in waypoints])
            pts_xml = f'<Array as="points">{pts}</Array>'
        else:
            style += "edgeStyle=none;"

        offset_xml = ""
        if label_offset:
            offset_xml = f'<mxPoint x="{label_offset[0]}" y="{label_offset[1]}" as="offset" />'

        elem = f'''        <mxCell id="{cell_id}" parent="1" style="{style}" value="{xml_escape(label)}" edge="1" source="{source_id}" target="{target_id}">
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
    d = DrawioDiagram("dfd_0", "DFD Mức 0", width=1100, height=750)
    d.add_title("SƠ ĐỒ DFD MỨC 0 — NGỮ CẢNH HỆ THỐNG THUYẾT MINH ĐA NGÔN NGỮ")

    # Center Process
    d.add_process("P0", "<b>0</b><br/><br/>Hệ thống thuyết minh<br/>đa ngôn ngữ<br/>Thảo Cầm Viên Sài Gòn", 430, 85, 240, 625)

    # Left Actors
    d.add_actor("E1", "Khách tham quan", 30, 95, 170, 265)
    d.add_actor("E2", "Nhân viên", 30, 395, 170, 165)
    d.add_actor("E3", "Quản trị viên", 30, 595, 170, 115)

    # Right Actors
    d.add_actor("E4", "Cổng thanh toán", 900, 105, 170, 100)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 900, 270, 170, 100)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 900, 440, 170, 270)

    # Flows Left - Khách tham quan (3 vào, 3 ra)
    d.add_arrow("f01", "E1", "P0", "Yêu cầu thanh toán &amp; đổi phiên", exit_xy=(1, 0.12), entry_xy=(0, 0.07))
    d.add_arrow("f02", "P0", "E1", "Thông tin thanh toán &amp; token phiên", exit_xy=(0, 0.14), entry_xy=(1, 0.28))
    d.add_arrow("f03", "E1", "P0", "Yêu cầu nội dung, GPS &amp; hiện diện", exit_xy=(1, 0.46), entry_xy=(0, 0.21))
    d.add_arrow("f04", "P0", "E1", "Gói bản đồ, lộ trình &amp; âm thanh", exit_xy=(0, 0.28), entry_xy=(1, 0.62))
    d.add_arrow("f05", "E1", "P0", "Câu hỏi tra cứu thông tin", exit_xy=(1, 0.78), entry_xy=(0, 0.35))
    d.add_arrow("f06", "P0", "E1", "Câu trả lời có trích dẫn nguồn", exit_xy=(0, 0.42), entry_xy=(1, 0.92))

    # Flows Left - Nhân viên (2 vào, 2 ra)
    d.add_arrow("f07", "E2", "P0", "Xác nhận tiền mặt &amp; tra cứu phiên", exit_xy=(1, 0.20), entry_xy=(0, 0.53))
    d.add_arrow("f08", "P0", "E2", "Mã ngắn 6 chữ số &amp; token cấp lại", exit_xy=(0, 0.60), entry_xy=(1, 0.45))
    d.add_arrow("f09", "E2", "P0", "Dữ liệu điểm tham quan, tour &amp; tài liệu", exit_xy=(1, 0.70), entry_xy=(0, 0.67))
    d.add_arrow("f10", "P0", "E2", "Kết quả cập nhật &amp; tiến độ tác vụ", exit_xy=(0, 0.74), entry_xy=(1, 0.90))

    # Flows Left - Quản trị viên (2 vào, 2 ra)
    d.add_arrow("f11", "E3", "P0", "Hồ sơ nhân viên mới &amp; bộ lọc giám sát", exit_xy=(1, 0.35), entry_xy=(0, 0.87))
    d.add_arrow("f12", "P0", "E3", "Hồ sơ đã tạo, nhật ký &amp; báo cáo", exit_xy=(0, 0.94), entry_xy=(1, 0.75))

    # Flows Right - Cổng thanh toán (1 vào, 1 ra)
    d.add_arrow("f13", "P0", "E4", "Yêu cầu giao dịch thanh toán", exit_xy=(1, 0.06), entry_xy=(0, 0.30))
    d.add_arrow("f14", "E4", "P0", "Webhook kết quả thanh toán chữ ký số", exit_xy=(0, 0.70), entry_xy=(1, 0.13))

    # Flows Right - Dịch vụ dịch và TTS (1 vào, 1 ra)
    d.add_arrow("f15", "P0", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", exit_xy=(1, 0.30), entry_xy=(0, 0.30))
    d.add_arrow("f16", "E5", "P0", "Bản dịch đa ngôn ngữ &amp; tệp âm thanh WAV", exit_xy=(0, 0.70), entry_xy=(1, 0.37))

    # Flows Right - Dịch vụ embedding và LLM (2 vào, 2 ra)
    d.add_arrow("f17", "P0", "E6", "Câu hỏi truy vấn &amp; ngữ cảnh trích dẫn", exit_xy=(1, 0.60), entry_xy=(0, 0.22))
    d.add_arrow("f18", "E6", "P0", "Vector câu hỏi &amp; câu trả lời mô hình", exit_xy=(0, 0.40), entry_xy=(1, 0.67))
    d.add_arrow("f19", "P0", "E6", "Đoạn tài liệu kiến thức cần tạo vector", exit_xy=(1, 0.80), entry_xy=(0, 0.72))
    d.add_arrow("f20", "E6", "P0", "Mảng vector nhúng của đoạn tài liệu", exit_xy=(0, 0.90), entry_xy=(1, 0.87))

    d.save(os.path.join(OUT_DIR, "DFD_Level_0_Context.drawio"))


# ==================================================================================
# 2. DFD MỨC 1 — PHÂN RÃ TOÀN HỆ THỐNG
# ==================================================================================
def build_level_1():
    d = DrawioDiagram("dfd_1", "DFD Mức 1 Toàn hệ thống", width=1520, height=1080)
    d.add_title("SƠ ĐỒ DFD MỨC 1 — PHÂN RÃ TOÀN HỆ THỐNG THUYẾT MINH ĐA NGÔN NGỮ")

    # TOP: Nhân viên (Quầy vé) - x=340, y=55, w=260, h=45 (Below Title)
    d.add_actor("E2_Top", "Nhân viên (Quầy vé)", 340, 55, 260, 45)

    # Left Column Actors (x=30, w=150)
    d.add_actor("E1", "Khách tham quan", 30, 175, 150, 400)
    d.add_actor("E2_Left", "Nhân viên (Nội dung)", 30, 645, 150, 115)
    d.add_actor("E3", "Quản trị viên", 30, 810, 150, 105)

    # Center-Left Column Processes (x=340, w=260)
    d.add_process("P1", "<b>1.0</b><br/><br/>Quản lý thanh toán<br/>và phiên tham quan", 340, 175, 260, 105)
    d.add_process("P2", "<b>2.0</b><br/><br/>Cung cấp nội dung bản đồ,<br/>lộ trình và thuyết minh", 340, 335, 260, 105)
    d.add_process("P3", "<b>3.0</b><br/><br/>Xử lý hỏi đáp thông minh<br/>trợ lý ảo RAG", 340, 495, 260, 105)
    d.add_process("P4", "<b>4.0</b><br/><br/>Quản trị nội dung, lộ trình<br/>và kho kiến thức", 340, 650, 260, 115)
    d.add_process("P5", "<b>5.0</b><br/><br/>Quản trị tài khoản nội bộ<br/>và giám sát hệ thống", 340, 810, 260, 105)

    # Center-Right Column Data Stores (x=730, w=210)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 730, 250, 210, 60)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 730, 350, 210, 60)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 730, 435, 210, 55)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 730, 565, 210, 60)
    d.add_store("D1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 730, 825, 210, 60)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 730, 960, 450, 85)

    # Right Column External Services (x=1260, w=180)
    d.add_actor("E4", "Cổng thanh toán", 1260, 160, 180, 80)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 1260, 490, 180, 120)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 1260, 655, 180, 80)

    # ------------------ EXTERNAL FLOWS (BALANCED) ------------------
    # E2_Top <-> P1
    d.add_arrow("f07", "E2_Top", "P1", "Xác nhận tiền mặt<br/>&amp; tra cứu phiên", exit_xy=(0.25, 1), entry_xy=(0.25, 0))
    d.add_arrow("f08", "P1", "E2_Top", "Mã ngắn 6 chữ số<br/>&amp; token cấp lại", exit_xy=(0.75, 0), entry_xy=(0.75, 1))

    # E1 <-> P1, P2, P3 (Straight Horizontal Lines)
    d.add_arrow("f01", "E1", "P1", "Yêu cầu thanh toán &amp; mã đổi phiên", exit_xy=(1, 0.08), entry_xy=(0, 0.25))
    d.add_arrow("f02", "P1", "E1", "Thông tin thanh toán &amp; token phiên", exit_xy=(0, 0.75), entry_xy=(1, 0.22))
    
    d.add_arrow("f03", "E1", "P2", "Yêu cầu nội dung, GPS &amp; hiện diện", exit_xy=(1, 0.46), entry_xy=(0, 0.25))
    d.add_arrow("f04", "P2", "E1", "Gói bản đồ, lộ trình &amp; tệp âm thanh", exit_xy=(0, 0.75), entry_xy=(1, 0.60))

    d.add_arrow("f05", "E1", "P3", "Câu hỏi tra cứu thông tin", exit_xy=(1, 0.86), entry_xy=(0, 0.25))
    d.add_arrow("f06", "P3", "E1", "Câu trả lời có trích dẫn nguồn", exit_xy=(0, 0.75), entry_xy=(1, 0.98))

    # E2_Left <-> P4 (Straight Horizontal Lines)
    d.add_arrow("f09", "E2_Left", "P4", "Dữ liệu điểm tham quan, tour &amp; tài liệu", exit_xy=(1, 0.25), entry_xy=(0, 0.25))
    d.add_arrow("f10", "P4", "E2_Left", "Kết quả cập nhật &amp; tiến độ tác vụ", exit_xy=(0, 0.72), entry_xy=(1, 0.72))

    # E3 <-> P5 (Straight Horizontal Lines)
    d.add_arrow("f11", "E3", "P5", "Hồ sơ nhân viên mới &amp; bộ lọc giám sát", exit_xy=(1, 0.25), entry_xy=(0, 0.25))
    d.add_arrow("f12", "P5", "E3", "Hồ sơ đã tạo, nhật ký &amp; báo cáo", exit_xy=(0, 0.72), entry_xy=(1, 0.72))

    # P1 <-> E4 (Straight Horizontal Lines Above D2)
    d.add_arrow("f13", "P1", "E4", "Yêu cầu giao dịch thanh toán", exit_xy=(1, 0.15), entry_xy=(0, 0.35))
    d.add_arrow("f14", "E4", "P1", "Webhook kết quả thanh toán chữ ký số", exit_xy=(0, 0.75), entry_xy=(1, 0.45))

    # P3 <-> E6 (Straight Horizontal Lines Between D4 and D5)
    d.add_arrow("f17", "P3", "E6", "Câu hỏi truy vấn &amp; ngữ cảnh trích dẫn", exit_xy=(1, 0.20), entry_xy=(0, 0.20))
    d.add_arrow("f18", "E6", "P3", "Vector câu hỏi &amp; câu trả lời mô hình", exit_xy=(0, 0.50), entry_xy=(1, 0.50))

    # P4 <-> E5 (Straight Horizontal Lines Between D5 and D1)
    d.add_arrow("f15", "P4", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", exit_xy=(1, 0.15), entry_xy=(0, 0.25))
    d.add_arrow("f16", "E5", "P4", "Bản dịch đa ngôn ngữ &amp; tệp âm thanh WAV", exit_xy=(0, 0.75), entry_xy=(1, 0.40))

    # P4 <-> E6 (Right Corridor)
    d.add_arrow("f19", "P4", "E6", "Đoạn tài liệu kiến thức cần tạo vector", waypoints=[(600, 725), (1220, 725), (1220, 580)], exit_xy=(1, 0.65), entry_xy=(0, 0.75))
    d.add_arrow("f20", "E6", "P4", "Mảng vector nhúng của đoạn tài liệu", waypoints=[(1260, 600), (1190, 600), (1190, 755)], exit_xy=(0, 0.90), entry_xy=(1, 0.90))

    # ------------------ DATA STORE CONNECTIONS (INTER-PROCESS LINKS) ------------------
    # 1.0 writes D2
    d.add_arrow("ds_p1_d2", "P1", "D2", "Lưu phiên, thanh toán &amp; mã tạm", exit_xy=(1, 0.85), entry_xy=(0, 0.35))
    
    # 2.0 reads D2
    d.add_arrow("ds_d2_p2", "D2", "P2", "Kiểm tra token phiên 24h", waypoints=[(730, 290), (670, 290), (670, 350)], exit_xy=(0, 0.70), entry_xy=(1, 0.15))
    
    # 3.0 reads D2
    d.add_arrow("ds_d2_p3", "D2", "P3", "Kiểm tra phiên &amp; rate limit", waypoints=[(730, 305), (650, 305), (650, 510)], exit_xy=(0, 0.90), entry_xy=(1, 0.15))

    # 2.0 reads D3
    d.add_arrow("ds_d3_p2", "D3", "P2", "Đọc điểm tham quan, bản dịch, WAV", exit_xy=(0, 0.50), entry_xy=(1, 0.50))
    
    # 4.0 writes D3
    d.add_arrow("ds_p4_d3", "P4", "D3", "Ghi điểm tham quan, bản dịch, WAV", waypoints=[(600, 660), (670, 660), (670, 390)], exit_xy=(1, 0.08), entry_xy=(0, 0.70))

    # 2.0 reads D4
    d.add_arrow("ds_d4_p2", "D4", "P2", "Đọc danh sách lộ trình", waypoints=[(730, 455), (660, 455), (660, 415)], exit_xy=(0, 0.35), entry_xy=(1, 0.80))
    
    # 4.0 writes D4
    d.add_arrow("ds_p4_d4", "P4", "D4", "Lưu danh mục tour &amp; thứ tự điểm", waypoints=[(600, 680), (690, 680), (690, 470)], exit_xy=(1, 0.25), entry_xy=(0, 0.65))

    # 3.0 reads D5
    d.add_arrow("ds_d5_p3", "D5", "P3", "Truy hồi đoạn kiến thức tương đồng", exit_xy=(0, 0.50), entry_xy=(1, 0.80))
    
    # 4.0 writes D5
    d.add_arrow("ds_p4_d5", "P4", "D5", "Lưu tài liệu, đoạn &amp; vector", waypoints=[(600, 705), (670, 705), (670, 615)], exit_xy=(1, 0.45), entry_xy=(0, 0.80))

    # 5.0 reads/writes D1
    d.add_arrow("ds_p5_d1", "P5", "D1", "Quản lý tài khoản &amp; phiên nội bộ", exit_xy=(1, 0.45), entry_xy=(0, 0.45))

    # Central Logging Bus to D6
    d.add_arrow("ds_p1_d6", "P1", "D6", "Ghi log thanh toán", waypoints=[(600, 275), (1100, 275), (1100, 960)], exit_xy=(1, 0.95), entry_xy=(0.85, 0))
    d.add_arrow("ds_p2_d6", "P2", "D6", "Ghi log hiện diện, tải gói", waypoints=[(600, 430), (1060, 430), (1060, 960)], exit_xy=(1, 0.88), entry_xy=(0.75, 0))
    d.add_arrow("ds_p3_d6", "P3", "D6", "Ghi log hỏi đáp RAG", waypoints=[(600, 585), (1020, 585), (1020, 960)], exit_xy=(1, 0.88), entry_xy=(0.65, 0))
    d.add_arrow("ds_p4_d6", "P4", "D6", "Ghi log cập nhật nội dung", waypoints=[(600, 755), (980, 755), (980, 960)], exit_xy=(1, 0.90), entry_xy=(0.55, 0))
    d.add_arrow("ds_d6_p5", "D6", "P5", "Đọc toàn bộ nhật ký &amp; thống kê", waypoints=[(730, 990), (640, 990), (640, 895)], exit_xy=(0, 0.35), entry_xy=(1, 0.80))

    d.save(os.path.join(OUT_DIR, "DFD_Level_1_System.drawio"))


# ==================================================================================
# 3. DFD MỨC 2 — TIẾN TRÌNH 1.0 (QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN)
# ==================================================================================
def build_level_2_p1():
    d = DrawioDiagram("dfd_2_p1", "DFD Mức 2 Tiến trình 1.0", width=1180, height=840)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 1.0 QUẢN LÝ THANH TOÁN VÀ PHIÊN THAM QUAN")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 80, 150, 480)
    d.add_actor("E2", "Nhân viên", 30, 600, 150, 190)

    # Sub-processes Center (x=410, w=240)
    d.add_process("P1_1", "<b>1.1</b><br/>Khởi tạo phiên và<br/>yêu cầu thanh toán online", 410, 80, 240, 85)
    d.add_process("P1_2", "<b>1.2</b><br/>Xác minh webhook và<br/>kích hoạt mã đổi phiên", 410, 215, 240, 85)
    d.add_process("P1_3", "<b>1.3</b><br/>Xác nhận tiền mặt và<br/>cấp mã ngắn 6 chữ số", 410, 355, 240, 85)
    d.add_process("P1_4", "<b>1.4</b><br/>Đổi mã xác thực và<br/>cấp token phiên khách", 410, 495, 240, 85)
    d.add_process("P1_5", "<b>1.5</b><br/>Tra cứu phiên và<br/>cấp lại token khách", 410, 640, 240, 85)

    # Right Side: External Actor & Data Stores
    d.add_actor("E4", "Cổng thanh toán", 920, 90, 170, 85)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 920, 260, 170, 270)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 920, 615, 170, 120)

    # 1. External Flows (Balanced with Level 1 P1)
    # E1 <-> 1.1, 1.4 (Straight Horizontal Lines)
    d.add_arrow("f_e1_p11", "E1", "P1_1", "Yêu cầu thanh toán online", exit_xy=(1, 0.05), entry_xy=(0, 0.30))
    d.add_arrow("f_p11_e1", "P1_1", "E1", "Thông tin thanh toán &amp; QR", exit_xy=(0, 0.70), entry_xy=(1, 0.12))
    
    d.add_arrow("f_e1_p14", "E1", "P1_4", "Nhập mã đổi phiên / mã 6 số", exit_xy=(1, 0.88), entry_xy=(0, 0.25))
    d.add_arrow("f_p14_e1", "P1_4", "E1", "Token phiên tham quan 24h", exit_xy=(0, 0.75), entry_xy=(1, 0.95))

    # E2 <-> 1.3, 1.5 (Corridor on left between x=210 and 380)
    d.add_arrow("f_e2_p13", "E2", "P1_3", "Xác nhận tiền mặt tại quầy", waypoints=[(180, 630), (220, 630), (220, 375)], exit_xy=(1, 0.15), entry_xy=(0, 0.25))
    d.add_arrow("f_p13_e2", "P1_3", "E2", "Mã ngắn 6 chữ số cấp khách", waypoints=[(410, 420), (360, 420), (360, 660), (180, 660)], exit_xy=(0, 0.75), entry_xy=(1, 0.32))
    
    d.add_arrow("f_e2_p15", "E2", "P1_5", "Tra cứu phiên cần hỗ trợ", exit_xy=(1, 0.65), entry_xy=(0, 0.35))
    d.add_arrow("f_p15_e2", "P1_5", "E2", "Token cấp lại cho khách", exit_xy=(0, 0.75), entry_xy=(1, 0.85))

    # 1.1, 1.2 <-> E4
    d.add_arrow("f_p11_e4", "P1_1", "E4", "Yêu cầu giao dịch thanh toán", exit_xy=(1, 0.30), entry_xy=(0, 0.30))
    d.add_arrow("f_e4_p12", "E4", "P1_2", "Webhook kết quả thanh toán chữ ký số", waypoints=[(920, 150), (810, 150), (810, 240)], exit_xy=(0, 0.70), entry_xy=(1, 0.30))

    # 2. Internal Flows Between Sub-Processes
    d.add_arrow("int_11_12", "P1_1", "P1_2", "Mã giao dịch chờ đối soát", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("int_12_14", "P1_2", "P1_4", "Mã một lần kích hoạt", waypoints=[(410, 275), (380, 275), (380, 510)], exit_xy=(0, 0.70), entry_xy=(0, 0.15))
    d.add_arrow("int_13_14", "P1_3", "P1_4", "Mã ngắn 6 số kích hoạt", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # 3. Store Interactions (D2 & D6)
    d.add_arrow("st_p11_d2", "P1_1", "D2", "Tạo bản ghi phiên chờ", waypoints=[(650, 135), (850, 135), (850, 280)], exit_xy=(1, 0.65), entry_xy=(0, 0.08))
    d.add_arrow("st_p12_d2", "P1_2", "D2", "Cập nhật thanh toán &amp; sinh mã", exit_xy=(1, 0.65), entry_xy=(0, 0.25))
    d.add_arrow("st_p13_d2", "P1_3", "D2", "Lưu phiên tiền mặt &amp; mã ngắn", exit_xy=(1, 0.50), entry_xy=(0, 0.50))
    d.add_arrow("st_p14_d2", "P1_4", "D2", "Thu hồi mã &amp; cấp token 24h", exit_xy=(1, 0.50), entry_xy=(0, 0.75))
    d.add_arrow("st_p15_d2", "P1_5", "D2", "Tra cứu phiên &amp; cấp lại token", waypoints=[(650, 660), (850, 660), (850, 515)], exit_xy=(1, 0.25), entry_xy=(0, 0.95))

    d.add_arrow("st_p13_d6", "P1_3", "D6", "Ghi log tiền mặt", waypoints=[(650, 420), (880, 420), (880, 650)], exit_xy=(1, 0.75), entry_xy=(0, 0.30))
    d.add_arrow("st_p15_d6", "P1_5", "D6", "Ghi log cấp lại token", exit_xy=(1, 0.75), entry_xy=(0, 0.75))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P1_Payment_Session.drawio"))


# ==================================================================================
# 4. DFD MỨC 2 — TIẾN TRÌNH 2.0 (CUNG CẤP NỘI DUNG, LỘ TRÌNH VÀ THUYẾT MINH)
# ==================================================================================
def build_level_2_p2():
    d = DrawioDiagram("dfd_2_p2", "DFD Mức 2 Tiến trình 2.0", width=1180, height=760)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 2.0 CUNG CẤP NỘI DUNG BẢN ĐỒ, LỘ TRÌNH VÀ THUYẾT MINH")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 80, 150, 570)

    # Sub-processes
    d.add_process("P2_1", "<b>2.1</b><br/>Kiểm tra hiệu lực phiên<br/>tham quan và ngôn ngữ", 380, 80, 240, 90)
    d.add_process("P2_2", "<b>2.2</b><br/>Tổng hợp gói nội dung<br/>điểm tham quan và lộ trình", 380, 235, 240, 95)
    d.add_process("P2_3", "<b>2.3</b><br/>Cung cấp tệp âm thanh<br/>thuyết minh đa ngôn ngữ", 380, 395, 240, 95)
    d.add_process("P2_4", "<b>2.4</b><br/>Ghi nhận hiện diện trực tuyến<br/>và thống kê điểm ghé", 380, 555, 240, 90)

    # Right Data Stores
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 900, 80, 180, 70)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 900, 195, 180, 140)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 900, 375, 180, 70)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 900, 505, 180, 140)

    # 1. External Flows (Balanced with Level 1 P2 - 100% Straight Horizontal)
    d.add_arrow("f_e1_p21", "E1", "P2_1", "Token phiên &amp; mã ngôn ngữ", exit_xy=(1, 0.06), entry_xy=(0, 0.40))
    d.add_arrow("f_p22_e1", "P2_2", "E1", "Gói dữ liệu bản đồ &amp; lộ trình", exit_xy=(0, 0.45), entry_xy=(1, 0.35))
    d.add_arrow("f_p23_e1", "P2_3", "E1", "Tệp âm thanh thuyết minh WAV", exit_xy=(0, 0.45), entry_xy=(1, 0.63))
    d.add_arrow("f_e1_p24", "E1", "P2_4", "Tọa độ GPS &amp; nhịp tim hiện diện", exit_xy=(1, 0.90), entry_xy=(0, 0.40))

    # 2. Internal Flows Between Sub-Processes
    d.add_arrow("int_21_22", "P2_1", "P2_2", "Phiên hợp lệ tải nội dung", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("int_22_23", "P2_2", "P2_3", "Phiên hợp lệ phát âm thanh", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # 3. Store Interactions
    d.add_arrow("st_d2_p21", "D2", "P2_1", "Đối chiếu hiệu lực token phiên", exit_xy=(0, 0.50), entry_xy=(1, 0.50))
    
    d.add_arrow("st_d3_p22", "D3", "P2_2", "Đọc tọa độ, bán kính &amp; bản dịch", exit_xy=(0, 0.30), entry_xy=(1, 0.30))
    d.add_arrow("st_d3_p23", "D3", "P2_3", "Đọc luồng tệp âm thanh WAV", exit_xy=(0, 0.85), entry_xy=(1, 0.25))

    d.add_arrow("st_d4_p22", "D4", "P2_2", "Đọc danh sách lộ trình &amp; điểm dừng", waypoints=[(900, 410), (810, 410), (810, 290)], exit_xy=(0, 0.50), entry_xy=(1, 0.60))
    
    d.add_arrow("st_p22_d6", "P2_2", "D6", "Ghi log tải gói nội dung", waypoints=[(620, 315), (860, 315), (860, 530)], exit_xy=(1, 0.85), entry_xy=(0, 0.20))
    d.add_arrow("st_p24_d6", "P2_4", "D6", "Cập nhật hiện diện &amp; lượt ghé", exit_xy=(1, 0.50), entry_xy=(0, 0.75))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P2_Visitor_Content_Audio.drawio"))


# ==================================================================================
# 5. DFD MỨC 2 — TIẾN TRÌNH 3.0 (XỬ LÝ HỎI ĐÁP THÔNG MINH TRỢ LÝ ẢO RAG)
# ==================================================================================
def build_level_2_p3():
    d = DrawioDiagram("dfd_2_p3", "DFD Mức 2 Tiến trình 3.0", width=1180, height=760)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 3.0 XỬ LÝ HỎI ĐÁP THÔNG MINH RAG")

    # Actors Left
    d.add_actor("E1", "Khách tham quan", 30, 80, 150, 560)

    # Sub-processes
    d.add_process("P3_1", "<b>3.1</b><br/>Kiểm tra phiên khách và<br/>giới hạn tần suất hỏi", 380, 80, 240, 90)
    d.add_process("P3_2", "<b>3.2</b><br/>Kiểm tra phạm vi câu hỏi<br/>và tạo vector truy vấn", 380, 230, 240, 90)
    d.add_process("P3_3", "<b>3.3</b><br/>Truy hồi đoạn kiến thức<br/>tương đồng ngữ nghĩa", 380, 380, 240, 90)
    d.add_process("P3_4", "<b>3.4</b><br/>Tổng hợp câu trả lời<br/>có trích dẫn và ghi nhật ký", 380, 540, 240, 100)

    # Right: Reordered to match process vertical alignment!
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 900, 80, 180, 70)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 900, 380, 180, 70)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 900, 190, 180, 150)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 900, 545, 180, 90)

    # 1. External Flows (Balanced with Level 1 P3)
    d.add_arrow("f_e1_p31", "E1", "P3_1", "Câu hỏi tra cứu, token &amp; ngôn ngữ", exit_xy=(1, 0.06), entry_xy=(0, 0.40))
    d.add_arrow("f_p34_e1", "P3_4", "E1", "Câu trả lời kèm trích dẫn nguồn", exit_xy=(0, 0.45), entry_xy=(1, 0.90))

    # P3_2 <-> E6 (Straight Horizontal)
    d.add_arrow("f_p32_e6", "P3_2", "E6", "Câu hỏi cần tạo vector nhúng", exit_xy=(1, 0.25), entry_xy=(0, 0.35))
    d.add_arrow("f_e6_p32", "E6", "P3_2", "Vector biểu diễn ngữ nghĩa", exit_xy=(0, 0.65), entry_xy=(1, 0.65))

    # P3_4 <-> E6 (Separated Vertical Lines with Labels near Endpoints)
    d.add_arrow("f_p34_e6", "P3_4", "E6", "Lời nhắc kèm ngữ cảnh trích dẫn", waypoints=[(620, 560), (840, 560), (840, 310)], exit_xy=(1, 0.20), entry_xy=(0, 0.80), label_offset=(-70, 0))
    d.add_arrow("f_e6_p34", "E6", "P3_4", "Câu trả lời mô hình &amp; mã trích dẫn", waypoints=[(900, 335), (800, 335), (800, 590)], exit_xy=(0, 0.95), entry_xy=(1, 0.50), label_offset=(60, 0))

    # 2. Internal Flows Between Sub-Processes
    d.add_arrow("int_31_32", "P3_1", "P3_2", "Câu hỏi hợp lệ chưa vượt hạn mức", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("int_32_33", "P3_2", "P3_3", "Vector câu hỏi kèm câu hỏi gốc", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("int_33_34", "P3_3", "P3_4", "Tập đoạn kiến thức tương đồng cao nhất", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # 3. Store Interactions (Straight Horizontal)
    d.add_arrow("st_d2_p31", "D2", "P3_1", "Kiểm tra hiệu lực phiên &amp; rate limit", exit_xy=(0, 0.50), entry_xy=(1, 0.50))
    d.add_arrow("st_d5_p33", "D5", "P3_3", "Đọc các đoạn tài liệu &amp; vector nhúng", exit_xy=(0, 0.50), entry_xy=(1, 0.50))
    d.add_arrow("st_p34_d6", "P3_4", "D6", "Ghi lịch sử hỏi đáp, câu hỏi &amp; trích dẫn", exit_xy=(1, 0.80), entry_xy=(0, 0.50))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P3_Chatbot_RAG.drawio"))


# ==================================================================================
# 6. DFD MỨC 2 — TIẾN TRÌNH 4.0 (QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC)
# ==================================================================================
def build_level_2_p4():
    d = DrawioDiagram("dfd_2_p4", "DFD Mức 2 Tiến trình 4.0", width=1200, height=980)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 4.0 QUẢN TRỊ NỘI DUNG, LỘ TRÌNH VÀ KHO KIẾN THỨC")

    # Actors Left
    d.add_actor("E2", "Nhân viên", 30, 80, 150, 750)

    # Sub-processes Spaced Out Vertically
    d.add_process("P4_1", "<b>4.1</b><br/>Cập nhật điểm tham quan<br/>và khởi tạo tác vụ nội dung", 390, 80, 240, 95)
    d.add_process("P4_2", "<b>4.2</b><br/>Xử lý nền dịch văn bản<br/>và tổng hợp âm thanh", 390, 270, 240, 95)
    d.add_process("P4_3", "<b>4.3</b><br/>Quản lý lộ trình<br/>tham quan mẫu", 390, 480, 240, 95)
    d.add_process("P4_4", "<b>4.4</b><br/>Phân đoạn tài liệu và<br/>tạo vector kho kiến thức", 390, 690, 240, 105)

    # Right: Vertically Aligned Directly Opposite the Corresponding Process!
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 910, 70, 180, 120)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 910, 260, 180, 110)
    d.add_store("D4", "<b>D4</b> | Lộ trình tham quan", 910, 475, 180, 75)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 910, 640, 180, 75)
    d.add_actor("E6", "Dịch vụ embedding và LLM", 910, 745, 180, 90)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 910, 865, 180, 85)

    # 1. External Flows (Balanced with Level 1 P4 - 100% Straight Horizontal)
    d.add_arrow("f_e2_p41", "E2", "P4_1", "Dữ liệu điểm tham quan tiếng Việt", exit_xy=(1, 0.04), entry_xy=(0, 0.30))
    d.add_arrow("f_p41_e2", "P4_1", "E2", "Kết quả lưu &amp; mã tác vụ tạo mới", exit_xy=(0, 0.70), entry_xy=(1, 0.09))
    
    d.add_arrow("f_e2_p43", "E2", "P4_3", "Dữ liệu lộ trình &amp; điểm dừng", exit_xy=(1, 0.55), entry_xy=(0, 0.30))
    d.add_arrow("f_p43_e2", "P4_3", "E2", "Kết quả cập nhật lộ trình mẫu", exit_xy=(0, 0.70), entry_xy=(1, 0.60))

    d.add_arrow("f_e2_p44", "E2", "P4_4", "Tài liệu kiến thức mới / sửa đổi", exit_xy=(1, 0.84), entry_xy=(0, 0.25))
    d.add_arrow("f_p44_e2", "P4_4", "E2", "Kết quả phân đoạn &amp; công bố", exit_xy=(0, 0.65), entry_xy=(1, 0.89))

    # P4_2 <-> E5 (Straight Horizontal)
    d.add_arrow("f_p42_e5", "P4_2", "E5", "Văn bản gốc &amp; yêu cầu tạo giọng đọc", exit_xy=(1, 0.25), entry_xy=(0, 0.25))
    d.add_arrow("f_e5_p42", "E5", "P4_2", "Bản dịch &amp; tệp âm thanh WAV", exit_xy=(0, 0.75), entry_xy=(1, 0.75))

    # P4_4 <-> E6 (Straight Horizontal)
    d.add_arrow("f_p44_e6", "P4_4", "E6", "Đoạn văn bản cần tạo vector", exit_xy=(1, 0.65), entry_xy=(0, 0.35))
    d.add_arrow("f_e6_p44", "E6", "P4_4", "Danh sách vector nhúng ngữ nghĩa", exit_xy=(0, 0.75), entry_xy=(1, 0.90))

    # 2. Internal Flows Between Sub-Processes
    d.add_arrow("int_41_42", "P4_1", "P4_2", "Thông báo tác vụ dịch &amp; TTS mới tạo", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # 3. Store Interactions
    d.add_arrow("st_p41_d3", "P4_1", "D3", "Lưu điểm tham quan &amp; tạo tác vụ chờ", exit_xy=(1, 0.30), entry_xy=(0, 0.30))
    d.add_arrow("st_d3_p42", "D3", "P4_2", "Đọc tác vụ chờ &amp; văn bản gốc", waypoints=[(910, 150), (790, 150), (790, 285)], exit_xy=(0, 0.65), entry_xy=(1, 0.15))
    d.add_arrow("st_p42_d3", "P4_2", "D3", "Lưu bản dịch, WAV &amp; hoàn tất", waypoints=[(630, 310), (840, 310), (840, 175)], exit_xy=(1, 0.45), entry_xy=(0, 0.85), label_offset=(0, -40))

    d.add_arrow("st_p43_d4", "P4_3", "D4", "Lưu bản ghi lộ trình &amp; điểm dừng", exit_xy=(1, 0.50), entry_xy=(0, 0.50))
    d.add_arrow("st_p44_d5", "P4_4", "D5", "Lưu tài liệu, các đoạn &amp; vector", exit_xy=(1, 0.20), entry_xy=(0, 0.50))

    d.add_arrow("st_p41_d6", "P4_1", "D6", "Ghi log điểm tham quan", waypoints=[(630, 140), (880, 140), (880, 885)], exit_xy=(1, 0.60), entry_xy=(0, 0.20))
    d.add_arrow("st_p43_d6", "P4_3", "D6", "Ghi log lộ trình", waypoints=[(630, 540), (860, 540), (860, 915)], exit_xy=(1, 0.60), entry_xy=(0, 0.50))
    d.add_arrow("st_p44_d6", "P4_4", "D6", "Ghi log kho kiến thức", waypoints=[(630, 750), (820, 750), (820, 940)], exit_xy=(1, 0.55), entry_xy=(0, 0.85), label_offset=(-30, 0))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P4_Content_Knowledge_Admin.drawio"))


# ==================================================================================
# 7. DFD MỨC 2 — TIẾN TRÌNH 5.0 (QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG)
# ==================================================================================
def build_level_2_p5():
    d = DrawioDiagram("dfd_2_p5", "DFD Mức 2 Tiến trình 5.0", width=1200, height=880)
    d.add_title("SƠ ĐỒ DFD MỨC 2 — TIẾN TRÌNH 5.0 QUẢN TRỊ TÀI KHOẢN NỘI BỘ VÀ GIÁM SÁT HỆ THỐNG")

    # Actors Left
    d.add_actor("E3", "Quản trị viên", 30, 80, 150, 700)

    # Sub-processes
    d.add_process("P5_1", "<b>5.1</b><br/>Xác thực đăng nhập và<br/>quản lý phiên nội bộ", 390, 80, 240, 95)
    d.add_process("P5_2", "<b>5.2</b><br/>Tạo và quản lý<br/>tài khoản nhân viên", 390, 240, 240, 95)
    d.add_process("P5_3", "<b>5.3</b><br/>Truy vấn và lọc<br/>nhật ký thao tác", 390, 400, 240, 95)
    d.add_process("P5_4", "<b>5.4</b><br/>Tổng hợp chỉ số sức khỏe<br/>và thống kê vận hành", 390, 580, 240, 125)

    # Right: Data Stores
    d.add_store("D1", "<b>D1</b> | Tài khoản &amp; Phiên nội bộ", 910, 80, 180, 85)
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 910, 210, 180, 110)
    d.add_store("D2", "<b>D2</b> | Phiên &amp; Thanh toán", 910, 360, 180, 60)
    d.add_store("D3", "<b>D3</b> | Điểm tham quan &amp; Media", 910, 450, 180, 60)
    d.add_store("D5", "<b>D5</b> | Kho kiến thức RAG", 910, 540, 180, 60)

    # 1. External Flows (Balanced with Level 1 P5 - 100% Straight Horizontal)
    d.add_arrow("f_e3_p51", "E3", "P5_1", "Thông tin đăng nhập nội bộ", exit_xy=(1, 0.04), entry_xy=(0, 0.30))
    d.add_arrow("f_p51_e3", "P5_1", "E3", "Token phiên nội bộ", exit_xy=(0, 0.70), entry_xy=(1, 0.10))

    d.add_arrow("f_e3_p52", "E3", "P5_2", "Hồ sơ nhân viên mới cần cấp", exit_xy=(1, 0.25), entry_xy=(0, 0.30))
    d.add_arrow("f_p52_e3", "P5_2", "E3", "Hồ sơ nhân viên tạo thành công", exit_xy=(0, 0.70), entry_xy=(1, 0.32))

    d.add_arrow("f_e3_p53", "E3", "P5_3", "Bộ lọc tra cứu nhật ký kiểm toán", exit_xy=(1, 0.48), entry_xy=(0, 0.30))
    d.add_arrow("f_p53_e3", "P5_3", "E3", "Danh sách nhật ký phân trang", exit_xy=(0, 0.70), entry_xy=(1, 0.54))

    d.add_arrow("f_e3_p54", "E3", "P5_4", "Yêu cầu xem báo cáo giám sát", exit_xy=(1, 0.75), entry_xy=(0, 0.25))
    d.add_arrow("f_p54_e3", "P5_4", "E3", "Báo cáo sức khỏe &amp; thống kê", exit_xy=(0, 0.65), entry_xy=(1, 0.85))

    # 2. Store Interactions
    d.add_arrow("st_d1_p51", "D1", "P5_1", "Đối chiếu mật khẩu băm", exit_xy=(0, 0.35), entry_xy=(1, 0.35))
    d.add_arrow("st_p51_d1", "P5_1", "D1", "Lưu refresh token phiên", exit_xy=(1, 0.70), entry_xy=(0, 0.75))

    d.add_arrow("st_p52_d1", "P5_2", "D1", "Lưu tài khoản mới", waypoints=[(630, 260), (840, 260), (840, 150)], exit_xy=(1, 0.25), entry_xy=(0, 0.90), label_offset=(0, -40))
    d.add_arrow("st_p52_d6", "P5_2", "D6", "Ghi log tạo tài khoản", exit_xy=(1, 0.65), entry_xy=(0, 0.35), label_offset=(-40, 0))

    d.add_arrow("st_d6_p53", "D6", "P5_3", "Đọc danh sách bản ghi nhật ký", waypoints=[(910, 280), (800, 280), (800, 435)], exit_xy=(0, 0.65), entry_xy=(1, 0.40))
    
    # Inputs into 5.4 distributed cleanly across right side
    d.add_arrow("st_d6_p54", "D6", "P5_4", "Đọc thống kê khách &amp; hỏi đáp", waypoints=[(910, 305), (770, 305), (770, 600)], exit_xy=(0, 0.90), entry_xy=(1, 0.15))
    d.add_arrow("st_d2_p54", "D2", "P5_4", "Đọc số liệu phiên &amp; doanh thu", waypoints=[(910, 390), (790, 390), (790, 630)], exit_xy=(0, 0.50), entry_xy=(1, 0.40))
    d.add_arrow("st_d3_p54", "D3", "P5_4", "Đọc độ phủ ngôn ngữ &amp; lỗi tác vụ", waypoints=[(910, 480), (810, 480), (810, 660)], exit_xy=(0, 0.50), entry_xy=(1, 0.65))
    d.add_arrow("st_d5_p54", "D5", "P5_4", "Đọc số tài liệu đã công bố", waypoints=[(910, 570), (830, 570), (830, 690)], exit_xy=(0, 0.50), entry_xy=(1, 0.90))

    d.save(os.path.join(OUT_DIR, "DFD_Level_2_P5_Auth_Admin_Monitoring.drawio"))


# ==================================================================================
# 8. DFD MỨC 3 — TIẾN TRÌNH 4.2 (XỬ LÝ NỀN DỊCH VĂN BẢN VÀ TỔNG HỢP ÂM THANH)
# ==================================================================================
def build_level_3_p4_2():
    d = DrawioDiagram("dfd_3_p42", "DFD Mức 3 Tiến trình 4.2", width=1180, height=720)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 4.2 XỬ LÝ NỀN DỊCH VĂN BẢN VÀ TỔNG HỢP ÂM THANH")

    # Sub-processes (Vertical Pipeline)
    d.add_process("P4_2_1", "<b>4.2.1</b><br/>Nhận tác vụ chờ và<br/>cấp quyền giữ phiên xử lý", 400, 80, 250, 80)
    d.add_process("P4_2_2", "<b>4.2.2</b><br/>Kiểm tra phiên bản nguồn<br/>và dịch văn bản đa ngôn ngữ", 400, 230, 250, 85)
    d.add_process("P4_2_3", "<b>4.2.3</b><br/>Tổng hợp âm thanh WAV<br/>và kiểm tra định dạng tệp", 400, 390, 250, 85)
    d.add_process("P4_2_4", "<b>4.2.4</b><br/>Lưu kho tệp media và<br/>công bố trạng thái hoàn tất", 400, 550, 250, 80)

    # Vertical Flows (Pipeline Sequence)
    d.add_arrow("v_421_422", "P4_2_1", "P4_2_2", "Thông tin tác vụ &amp; mã điểm", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("v_422_423", "P4_2_2", "P4_2_3", "Văn bản bản dịch cần đọc", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("v_423_424", "P4_2_3", "P4_2_4", "Tệp âm thanh WAV hợp lệ", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # Stores & Actors
    d.add_store("D3_Left", "<b>D3</b> | Điểm tham quan &amp; Media", 40, 80, 180, 80)
    d.add_store("D3_Right", "<b>D3</b> | Điểm tham quan &amp; Media", 900, 550, 180, 80)
    d.add_actor("E5", "Dịch vụ dịch và TTS", 900, 260, 180, 160)

    # Store Interactions & External Flows
    d.add_arrow("f_d3_p421", "D3_Left", "P4_2_1", "Tác vụ ở trạng thái chờ xử lý", exit_xy=(1, 0.35), entry_xy=(0, 0.35))
    d.add_arrow("f_p421_d3", "P4_2_1", "D3_Left", "Khóa phiên &amp; cập nhật đang chạy", exit_xy=(0, 0.75), entry_xy=(1, 0.75))

    d.add_arrow("f_p422_e5", "P4_2_2", "E5", "Văn bản gốc tiếng Việt", exit_xy=(1, 0.35), entry_xy=(0, 0.25))
    d.add_arrow("f_e5_p422", "E5", "P4_2_2", "Bản dịch tiếng Anh / Trung", exit_xy=(0, 0.45), entry_xy=(1, 0.75))

    d.add_arrow("f_p423_e5", "P4_2_3", "E5", "Văn bản dịch &amp; giọng đọc", exit_xy=(1, 0.35), entry_xy=(0, 0.70))
    d.add_arrow("f_e5_p423", "E5", "P4_2_3", "Luồng nhị phân tệp WAV", exit_xy=(0, 0.90), entry_xy=(1, 0.75))

    d.add_arrow("f_p424_d3", "P4_2_4", "D3_Right", "Lưu WAV &amp; đổi trạng thái hoàn tất", exit_xy=(1, 0.50), entry_xy=(0, 0.50))

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio"))


# ==================================================================================
# 9. DFD MỨC 3 — TIẾN TRÌNH 3.4 (TỔNG HỢP CÂU TRẢ LỜI CÓ TRÍCH DẪN VÀ GHI NHẬT KÝ)
# ==================================================================================
def build_level_3_p3_4():
    d = DrawioDiagram("dfd_3_p34", "DFD Mức 3 Tiến trình 3.4", width=1180, height=720)
    d.add_title("SƠ ĐỒ DFD MỨC 3 — TIẾN TRÌNH 3.4 TỔNG HỢP CÂU TRẢ LỜI CÓ TRÍCH DẪN VÀ GHI NHẬT KÝ")

    # Inputs from Previous Steps Left
    d.add_process("P3_1_In", "<b>3.1</b><br/>Kiểm tra phiên khách", 40, 80, 180, 60)
    d.add_process("P3_3_In", "<b>3.3</b><br/>Truy hồi đoạn tương đồng", 40, 160, 180, 60)

    # Sub-processes (Vertical Pipeline)
    d.add_process("P3_4_1", "<b>3.4.1</b><br/>Đóng gói lời nhắc hệ thống<br/>kèm ngữ cảnh đoạn kiến thức", 400, 80, 250, 80)
    d.add_process("P3_4_2", "<b>3.4.2</b><br/>Gọi mô hình ngôn ngữ<br/>sinh phản hồi theo ngữ cảnh", 400, 230, 250, 85)
    d.add_process("P3_4_3", "<b>3.4.3</b><br/>Kiểm tra trích dẫn hợp lệ<br/>và lọc liên kết ngoài nguồn", 400, 390, 250, 85)
    d.add_process("P3_4_4", "<b>3.4.4</b><br/>Lưu nhật ký hỏi đáp<br/>và trả kết quả cho khách", 400, 550, 250, 80)

    # Vertical Flows
    d.add_arrow("v_341_342", "P3_4_1", "P3_4_2", "Gói lời nhắc hoàn chỉnh", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("v_342_343", "P3_4_2", "P3_4_3", "Phản hồi thô &amp; mã trích dẫn", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
    d.add_arrow("v_343_344", "P3_4_3", "P3_4_4", "Câu trả lời đã kiểm duyệt", exit_xy=(0.5, 1), entry_xy=(0.5, 0))

    # Inputs to 3.4.1
    d.add_arrow("f_31_341", "P3_1_In", "P3_4_1", "Câu hỏi hợp lệ &amp; ngôn ngữ", exit_xy=(1, 0.50), entry_xy=(0, 0.35))
    d.add_arrow("f_33_341", "P3_3_In", "P3_4_1", "Đoạn kiến thức tương đồng", waypoints=[(220, 190), (310, 190), (310, 140)], exit_xy=(1, 0.50), entry_xy=(0, 0.75))

    # LLM Interaction
    d.add_actor("E6", "Dịch vụ embedding và LLM", 900, 230, 180, 85)
    d.add_arrow("f_p342_e6", "P3_4_2", "E6", "Gói lời nhắc câu hỏi &amp; ngữ cảnh", exit_xy=(1, 0.35), entry_xy=(0, 0.35))
    d.add_arrow("f_e6_p342", "E6", "P3_4_2", "Văn bản phản hồi &amp; trích dẫn", exit_xy=(0, 0.75), entry_xy=(1, 0.75))

    # Final outputs
    d.add_store("D6", "<b>D6</b> | Nhật ký &amp; Thống kê", 40, 550, 180, 80)
    d.add_actor("E1", "Khách tham quan", 900, 550, 180, 80)

    d.add_arrow("f_p344_d6", "P3_4_4", "D6", "Ghi câu hỏi, trả lời &amp; trích dẫn", exit_xy=(0, 0.50), entry_xy=(1, 0.50))
    d.add_arrow("f_p344_e1", "P3_4_4", "E1", "Câu trả lời kèm danh sách trích dẫn", exit_xy=(1, 0.50), entry_xy=(0, 0.50))

    d.save(os.path.join(OUT_DIR, "DFD_Level_3_P3_4_RAG_Answer_Generation.drawio"))


def main():
    print("=== Generating 9 Balanced, Beautiful, Collision-Free DFD Diagrams ===")
    build_level_0()
    build_level_1()
    build_level_2_p1()
    build_level_2_p2()
    build_level_2_p3()
    build_level_2_p4()
    build_level_2_p5()
    build_level_3_p4_2()
    build_level_3_p3_4()
    print("=== All 9 Diagrams Generated Successfully ===")

if __name__ == "__main__":
    main()
