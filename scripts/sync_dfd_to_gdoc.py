import os
import re
import json
import sys

def parse_dfd_markdown(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    ops = []
    
    i = 0
    n = len(lines)
    while i < n:
        raw_line = lines[i]
        line = raw_line.strip()
        
        if not line or line == '---':
            i += 1
            continue
            
        # 1. Heading 2 (### 3.4. ...)
        if line.startswith('### 3.4'):
            text = line.lstrip('#').strip()
            ops.append({
                "op": "heading",
                "text": text,
                "level": "2",
                "style": "HEADING_2"
            })
            i += 1
            continue

        # 2. Heading 3 (#### 3.4.x. ...)
        if line.startswith('#### '):
            text = line.lstrip('#').strip()
            ops.append({
                "op": "heading",
                "text": text,
                "level": "3",
                "style": "HEADING_3"
            })
            i += 1
            continue

        # 3. Subsection headings (a. ..., b. ..., c. ..., d. ..., e. ...)
        if re.match(r'^[a-e]\.\s+', line):
            ops.append({
                "op": "heading",
                "text": line,
                "level": "4",
                "style": "HEADING_4"
            })
            i += 1
            continue

        # 4. Skip markdown images (![...](...))
        if line.startswith('![') and ']' in line and '(' in line:
            i += 1
            continue

        # 5. Figure caption (*Hình 3.xx: ...*)
        if line.startswith('*Hình 3.') and line.endswith('*'):
            text = line.strip('*').strip()
            ops.append({
                "op": "append",
                "text": text,
                "bold": True,
                "style": "NORMAL_TEXT"
            })
            i += 1
            continue

        # 6. Table caption (*Bảng 3.xx: ...*)
        if line.startswith('*Bảng 3.') and line.endswith('*'):
            text = line.strip('*').strip()
            ops.append({
                "op": "append",
                "text": text,
                "bold": True,
                "style": "NORMAL_TEXT"
            })
            i += 1
            continue

        # 7. Markdown table
        if line.startswith('|') and line.endswith('|'):
            table_lines = []
            while i < n and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
                
            rows = []
            for t_line in table_lines:
                cells = [c.strip() for c in t_line.split('|')[1:-1]]
                # Skip separator row | :--- | :--- |
                if all(re.match(r'^:?-+:?$', c) for c in cells):
                    continue
                rows.append(cells)
                
            ops.append({
                "op": "insert-table",
                "table_data": rows,
                "values": rows,
                "header_rows": 1,
                "table_header_bold": True
            })
            continue

        # 8. Filter redundant table intro sentences if any
        if re.match(r'^Bảng 3\.\d+\s+(liệt kê|mô tả)', line):
            i += 1
            continue

        # 9. Normal paragraph
        ops.append({
            "op": "append",
            "text": line,
            "style": "NORMAL_TEXT"
        })
        i += 1

    return ops

def main():
    md_path = "docs/DFD_Report_Section_3_4.md"
    temp_dir = os.environ.get("TEMP", "/tmp")
    out_path = os.path.join(temp_dir, "gdoc_dfd_clean_ops.json")
    
    ops = parse_dfd_markdown(md_path)
    print(f"Generated {len(ops)} ops from {md_path}")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(ops, f, ensure_ascii=False, indent=2)
        
    print(f"Wrote batch operations to {out_path}")

if __name__ == "__main__":
    main()
