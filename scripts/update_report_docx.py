import os
import sys
import re
import shutil
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = "docs/CNPM_BAOCAO.docx"
MD_PATH = "docs/DFD_Report_Section_3_4.md"

def set_cell_border(cell, **kwargs):
    """
    Set cell borders
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='FF0000', space='0')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(r"""
        <w:tcBorders %s>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tcBorders>
    """ % nsdecls('w'))
    tcPr.append(tcBorders)

def format_table(table):
    # Set table borders
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(r"""
        <w:tblBorders %s>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
    """ % nsdecls('w'))
    tblPr.append(tblBorders)
    
    # Format cells
    for row_idx, row in enumerate(table.rows):
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(10.5)
                    r.font.color.rgb = RGBColor(0, 0, 0)
                    if row_idx == 0:
                        r.font.bold = True

def parse_markdown_table(table_lines):
    rows = []
    for line in table_lines:
        line = line.strip()
        if not line.startswith('|') or not line.endswith('|'):
            continue
        cells = [c.strip() for c in line.split('|')[1:-1]]
        if all(re.match(r'^:?-+:?$', c) for c in cells):
            continue
        rows.append(cells)
    return rows

def build_section_elements(doc, md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.split('\n')
    elements = [] # list of ('heading2', text), ('heading3', text), ('p', text), ('fig_caption', text), ('tbl_caption', text), ('table', rows)
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line == '---':
            i += 1
            continue
        
        if line.startswith('### '):
            text = line[4:].strip()
            elements.append(('heading2', text))
            i += 1
        elif line.startswith('#### '):
            text = line[5:].strip()
            elements.append(('heading3', text))
            i += 1
        elif line.startswith('![') and '](file://' in line:
            # Markdown image line -> skip because caption follows
            i += 1
        elif line.startswith('*Hình ') and line.endswith('*'):
            text = line.strip('*')
            elements.append(('fig_caption', text))
            i += 1
        elif line.startswith('*Bảng ') and line.endswith('*'):
            text = line.strip('*')
            elements.append(('tbl_caption', text))
            i += 1
        elif line.startswith('|'):
            # Collect table lines
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            rows = parse_markdown_table(table_lines)
            elements.append(('table', rows))
        else:
            elements.append(('p', line))
            i += 1
            
    return elements

def main():
    if not os.path.exists(DOCX_PATH):
        print(f"Error: {DOCX_PATH} not found.")
        sys.exit(1)
        
    doc = docx.Document(DOCX_PATH)
    
    # Locate insertion point: paragraph right before Chapter 4
    target_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == "CHƯƠNG 4: THIẾT KẾ HỆ THỐNG":
            target_idx = i
            break
            
    if target_idx is None:
        print("Could not find CHƯƠNG 4 in docx!")
        sys.exit(1)
        
    print(f"Found CHƯƠNG 4 at paragraph index {target_idx}")
    
    # We want to insert before paragraph 456 (which has the page break before CHƯƠNG 4)
    # Let's inspect paragraphs 450 to target_idx
    insert_before_p = None
    for idx in range(target_idx - 5, target_idx):
        p = doc.paragraphs[idx]
        if 'br' in p._element.xml and 'page' in p._element.xml:
            insert_before_p = p
            print(f"Found page break paragraph at index {idx}")
            break
            
    if insert_before_p is None:
        insert_before_p = doc.paragraphs[target_idx]
        print(f"Using CHƯƠNG 4 paragraph itself as insertion anchor.")

    elements = build_section_elements(doc, MD_PATH)
    print(f"Parsed {len(elements)} items from {MD_PATH}")

    # Insert elements sequentially before insert_before_p
    # Note: to preserve order when using insert_paragraph_before on the anchor,
    # if we insert each item before insert_before_p, they will be placed in correct order!
    for item_type, data in elements:
        if item_type == 'heading2':
            p = insert_before_p.insert_paragraph_before(data, style='Heading 2')
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'heading3':
            p = insert_before_p.insert_paragraph_before(data, style='Heading 3')
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'fig_caption':
            p = insert_before_p.insert_paragraph_before(data)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(8)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'tbl_caption':
            p = insert_before_p.insert_paragraph_before(data)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(4)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.italic = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'p':
            p = insert_before_p.insert_paragraph_before(data)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.line_spacing = 1.2
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'table':
            rows_data = data
            if not rows_data:
                continue
            num_rows = len(rows_data)
            num_cols = len(rows_data[0])
            table = doc.add_table(rows=num_rows, cols=num_cols)
            for r_idx, row in enumerate(rows_data):
                for c_idx, val in enumerate(row):
                    if c_idx < num_cols:
                        table.cell(r_idx, c_idx).text = val
            format_table(table)
            # Move table before insert_before_p
            insert_before_p._p.addprevious(table._tbl)
            
            # Add small empty spacing paragraph after table
            sp = insert_before_p.insert_paragraph_before("")
            sp.paragraph_format.space_before = Pt(2)
            sp.paragraph_format.space_after = Pt(6)

    # Now also add the 8 POIs documentation in Section 4.4.4 g)
    poi_anchor = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip().startswith('h) Bảng POI_TRANSLATIONS'):
            poi_anchor = p
            break
            
    if poi_anchor:
        print(f"Found POI_TRANSLATIONS anchor at paragraph for 8 POIs table")
        p_intro = poi_anchor.insert_paragraph_before(
            "Để phục vụ dữ liệu thực nghiệm phong phú cho hệ thống thuyết minh tại Thảo Cầm Viên Sài Gòn, "
            "hệ thống đã bổ sung thêm 8 điểm tham quan thực tế bao gồm động vật, thực vật và di tích lịch sử văn hóa. "
            "Dữ liệu được nạp thông qua tệp kịch bản nạp độc lập database/seeds/001_additional_pois.sql, "
            "tuân thủ toàn vẹn khóa ngoại và hỗ trợ đầy đủ hai ngôn ngữ tiếng Việt và tiếng Anh."
        )
        p_intro.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_intro.paragraph_format.line_spacing = 1.2
        p_intro.paragraph_format.space_after = Pt(6)
        for r in p_intro.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(11)
            
        p_tbl_cap = poi_anchor.insert_paragraph_before(
            "Bảng 4.29: Danh mục 8 điểm tham quan thực tế bổ sung cho Thảo Cầm Viên Sài Gòn"
        )
        p_tbl_cap.paragraph_format.space_before = Pt(6)
        p_tbl_cap.paragraph_format.space_after = Pt(4)
        for r in p_tbl_cap.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(11)
            r.font.italic = True
            
        poi_rows = [
            ["STT", "Tên điểm tham quan", "Phân loại", "Tình trạng bảo tồn", "Tọa độ GPS", "Bán kính kích hoạt"],
            ["1", "Hổ Bengal", "ANIMAL", "Nguy cấp IUCN", "10.787250, 106.705800", "30 mét"],
            ["2", "Gấu ngựa", "ANIMAL", "Sắp nguy cấp IUCN", "10.787800, 106.705100", "30 mét"],
            ["3", "Báo hoa mai", "ANIMAL", "Sắp nguy cấp IUCN", "10.788200, 106.704700", "30 mét"],
            ["4", "Chim hồng hạc", "ANIMAL", "Ít quan tâm IUCN", "10.788700, 106.704200", "30 mét"],
            ["5", "Cá sấu hoa cà", "ANIMAL", "Ít quan tâm IUCN", "10.789100, 106.703800", "30 mét"],
            ["6", "Vượn má vàng", "ANIMAL", "Nguy cấp IUCN", "10.786900, 106.706200", "30 mét"],
            ["7", "Đền thờ Vua Hùng", "HERITAGE", "Di tích văn hóa", "10.786500, 106.706800", "35 mét"],
            ["8", "Cây đa cổ thụ di sản", "PLANT", "Cây cổ thụ di sản", "10.787500, 106.705500", "35 mét"]
        ]
        poi_table = doc.add_table(rows=len(poi_rows), cols=len(poi_rows[0]))
        for r_idx, row in enumerate(poi_rows):
            for c_idx, val in enumerate(row):
                poi_table.cell(r_idx, c_idx).text = val
        format_table(poi_table)
        poi_anchor._p.addprevious(poi_table._tbl)
        
        sp = poi_anchor.insert_paragraph_before("")
        sp.paragraph_format.space_after = Pt(6)

    # Save to original path
    doc.save(DOCX_PATH)
    print(f"Successfully updated {DOCX_PATH} with Section 3.4 and 8 POIs table!")

if __name__ == "__main__":
    main()
