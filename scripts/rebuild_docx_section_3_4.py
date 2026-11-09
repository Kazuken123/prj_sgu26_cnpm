import os
import sys
import re
import docx
from PIL import Image
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = "docs/CNPM_BAOCAO.docx"
MD_PATH = "docs/DFD_Report_Section_3_4.md"

IMAGE_MAP = {
    'Hình 3.38': 'docs/diagram/export/DFD_Level_0_Context.png',
    'Hình 3.39': 'docs/diagram/export/DFD_Level_1_System.png',
    'Hình 3.40': 'docs/diagram/export/DFD_Level_2_P1_Payment_Session.png',
    'Hình 3.41': 'docs/diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png',
    'Hình 3.42': 'docs/diagram/export/DFD_Level_2_P3_Chatbot_RAG.png',
    'Hình 3.43': 'docs/diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png',
    'Hình 3.44': 'docs/diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png',
    'Hình 3.45': 'docs/diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png',
    'Hình 3.46': 'docs/diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png',
}

def format_table(table):
    table.autofit = False
    widths = ([0.45, 1.15, 1.75, 1.35, 1.5] if len(table.columns) == 5
              else [0.5, 1.5, 1.9, 2.3])
    for column, width in zip(table.columns, widths):
        column.width = Inches(width)
    header = OxmlElement('w:tblHeader')
    table.rows[0]._tr.get_or_add_trPr().append(header)
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
    
    for row_idx, row in enumerate(table.rows):
        for cell, width in zip(row.cells, widths):
            cell.width = Inches(width)
            for p in cell.paragraphs:
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(10)
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

def parse_md(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.split('\n')
    elements = []
    
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i].strip()
        if not line or line == '---':
            i += 1
            continue
            
        line = line.replace('##### ', '').replace('#####', '').strip()
        
        if line.startswith('### 3.4.'):
            text = line.lstrip('#').strip()
            elements.append(('heading2', text))
            i += 1
        elif line.startswith('#### 3.4'):
            text = line.lstrip('#').strip()
            elements.append(('heading3', text))
            i += 1
        elif re.match(r'^[a-e]\.\s+', line):
            elements.append(('heading4', line))
            i += 1
        elif line.startswith('![') and ']' in line and '(' in line:
            # Skip raw markdown image link
            i += 1
        elif line.startswith('*Hình 3.') and line.endswith('*'):
            text = line.strip('*').strip()
            # Extract fig id (e.g. Hình 3.38)
            m = re.match(r'^(Hình 3\.\d+)', text)
            fig_id = m.group(1) if m else ""
            img_path = IMAGE_MAP.get(fig_id, "")
            elements.append(('figure', (text, img_path)))
            i += 1
        elif line.startswith('*Bảng 3.') and line.endswith('*'):
            text = line.strip('*').strip()
            elements.append(('tbl_caption', text))
            i += 1
        elif line.startswith('|'):
            table_lines = []
            while i < n and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            rows = parse_markdown_table(table_lines)
            elements.append(('table', rows))
        elif re.match(r'^Bảng 3\.\d+\s+(liệt kê|mô tả)', line):
            # Redundant intro sentence -> skip
            i += 1
        else:
            elements.append(('p', line))
            i += 1
            
    return elements

def main():
    if not os.path.exists(DOCX_PATH):
        print(f"Error: {DOCX_PATH} does not exist!")
        sys.exit(1)
        
    doc = docx.Document(DOCX_PATH)
    body = doc._body._element
    
    # Verify all images exist
    for fig_id, path in IMAGE_MAP.items():
        if not os.path.exists(path):
            print(f"Error: {path} not found!")
            sys.exit(1)
            
    # Find start and end nodes in body
    start_elem = None
    end_elem = None
    
    for child in list(body):
        text = child.text.strip() if child.text else ""
        if '3.4. Sơ đồ luồng dữ liệu' in text and start_elem is None:
            start_elem = child
        if 'CHƯƠNG 4: THIẾT KẾ HỆ THỐNG' in text and end_elem is None:
            end_elem = child
            
    if start_elem is None or end_elem is None:
        print(f"Could not locate boundaries: start={start_elem}, end={end_elem}")
        sys.exit(1)
        
    print(f"Found boundaries: start_elem={start_elem.tag}, end_elem={end_elem.tag}")
    
    # We want to delete all elements from start_elem up to right before end_elem
    # Check if there is a page break paragraph right before end_elem
    prev = end_elem.getprevious()
    anchor_elem = end_elem
    if prev is not None and ('br' in prev.xml and 'page' in prev.xml):
        anchor_elem = prev
        print("Using page break before Chapter 4 as anchor.")
        
    # Collect all elements to remove
    to_remove = []
    curr = start_elem
    while curr is not None and curr != anchor_elem:
        nxt = curr.getnext()
        to_remove.append(curr)
        curr = nxt
        
    print(f"Removing {len(to_remove)} legacy elements from Section 3.4...")
    for elem in to_remove:
        body.remove(elem)
        
    # Now build new elements from markdown
    elements = parse_md(MD_PATH)
    print(f"Parsed {len(elements)} clean items from {MD_PATH}")
    
    # Wrap anchor_elem in a dummy paragraph to use insert_paragraph_before
    # In python-docx, we can find the paragraph object wrapping anchor_elem
    anchor_p = None
    for p in doc.paragraphs:
        if p._p == anchor_elem:
            anchor_p = p
            break
            
    if anchor_p is None:
        anchor_p = doc.paragraphs[-1]
        
    for item_type, data in elements:
        if item_type == 'heading2':
            p = anchor_p.insert_paragraph_before(data, style='Heading 2')
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'heading3':
            p = anchor_p.insert_paragraph_before(data, style='Heading 3')
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'heading4':
            p = anchor_p.insert_paragraph_before(data)
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(11.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'figure':
            caption_text, img_path = data
            # 1. Insert image paragraph
            p_img = anchor_p.insert_paragraph_before()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(4)
            p_img.paragraph_format.keep_with_next = True
            run = p_img.add_run()
            with Image.open(img_path) as image:
                ratio = image.height / image.width
            width = min(6.2, 7.0 / ratio)
            run.add_picture(img_path, width=Inches(width))
            
            # 2. Insert figure caption paragraph
            p_cap = anchor_p.insert_paragraph_before(caption_text)
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(8)
            for r in p_cap.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(10.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'tbl_caption':
            p = anchor_p.insert_paragraph_before(data)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(10.5)
                r.font.italic = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif item_type == 'p':
            p = anchor_p.insert_paragraph_before(data)
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
            anchor_p._p.addprevious(table._tbl)
            
            sp = anchor_p.insert_paragraph_before("")
            sp.paragraph_format.space_before = Pt(2)
            sp.paragraph_format.space_after = Pt(6)
            
    doc.save(DOCX_PATH)
    print(f"Successfully rebuilt Section 3.4 in {DOCX_PATH} with 9 clean images and tables!")

if __name__ == "__main__":
    main()
