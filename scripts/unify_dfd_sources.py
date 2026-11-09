"""Apply the five source corrections approved for the DFD business baseline.

Accept tracked insertions/deletions only inside UC-12, never across the report.
"""
from pathlib import Path
import json
import re
import sys
from docx import Document
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8')

def text(node):
    return '\n'.join(''.join(n.text or '' for n in p.iter(qn('w:t')))
                     for p in node.findall(qn('w:p')))

def main():
    doc = Document(ROOT / 'docs/CNPM_BAOCAO.docx')
    changes = []
    for table in doc.tables:
        if not table.cell(0, 0).text.startswith('Mã Use Case'):
            continue
        code = table.cell(0, 1).text.strip()
        if code == 'UC-12':
            for deleted in list(table._tbl.iter(qn('w:del'))):
                deleted.getparent().remove(deleted)
            for inserted in list(table._tbl.iter(qn('w:ins'))):
                parent = inserted.getparent()
                index = parent.index(inserted)
                for child in list(inserted):
                    parent.insert(index, child)
                    index += 1
                parent.remove(inserted)
            # The proposal is approved for DFD/report alignment; retain Could Have.
            for n in table._tbl.iter(qn('w:t')):
                if n.text:
                    n.text = n.text.replace('GIẢ ĐỊNH CHƯA DUYỆT theo mục 1.6.2, đã triển khai với cấu hình mặc định:',
                        'Phương án bàn giao bằng mã 6 số đã được xác nhận để thống nhất báo cáo và DFD; chức năng vẫn thuộc Could Have. Theo cấu hình triển khai hiện tại:')
            changes.append('UC-12: accepted scoped code-pickup revision; retained Could Have')
        if code == 'UC-06':
            seen_step_four = False
            for row in table.rows:
                cells = row.cells
                current = cells[-1].text.strip()
                if current.startswith('4. Lọc danh sách') and not seen_step_four:
                    seen_step_four = True
                    cells[-1].text = current.replace('50 mét', '30 mét')
                elif current.startswith('4. Lọc danh sách') and '30 mét' in current:
                    cells[-1].text = ('6. Kiểm tra liên kết âm thanh theo ngôn ngữ, áp dụng fallback có nhãn nếu cần; '
                        'tải và phát bài thuyết minh khi trình duyệt cho phép. Chỉ đánh dấu POI đã phát sau khi audio bắt đầu thành công. E2, E3.')
            changes.append('UC-06: 30 m default, restored playback step 6')
    for n in doc._element.body.iter(qn('w:t')):
        if n.text and re.search(r'\bmp3\b', n.text, re.I):
            n.text = re.sub(r'\bmp3\b', 'WAV', n.text, flags=re.I)
    doc.save(ROOT / 'docs/CNPM_BAOCAO.docx')
    for path in (ROOT / 'docs/diagram/use case').glob('*.draw*'):
        source = path.read_text(encoding='utf-8')
        corrected = source.replace('CHÙA LINH ỨNG', 'THẢO CẦM VIÊN SÀI GÒN')
        if corrected != source:
            path.write_text(corrected, encoding='utf-8')
    manifest = []
    for table in doc.tables:
        if table.cell(0, 0).text.startswith('Mã Use Case') and table.cell(0, 1).text.strip() in ('UC-06', 'UC-12'):
            # Keep native cell content, without duplicating horizontally merged cells.
            rows = []
            for row in table._tbl.findall(qn('w:tr')):
                rows.append([text(cell) for cell in row.findall(qn('w:tc'))])
            manifest.append({'uc': table.cell(0, 1).text.strip(), 'rows': rows})
    target = ROOT / '.local-data/dfd-approved-source-cells.json'
    target.write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
    print('\n'.join(changes))

if __name__ == '__main__':
    main()
