import os
import sys
import json
import subprocess
import re

sys.stdout.reconfigure(encoding='utf-8')

DOC_ID = "18w13JYpDX6dCXFww2o7HBQEDcMAaNlEQsbBBl3cL4Dk"
TAB_ID = "t.0"
MD_PATH = "docs/DFD_Report_Section_3_4.md"

IMAGE_MAP = [
    {
        "fig": "Hình 3.46",
        "png": "docs/diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png",
        "after": "Tiến trình 3.4 phân rã thành bốn tiến trình con từ 3.4.1 đến 3.4.4"
    },
    {
        "fig": "Hình 3.45",
        "png": "docs/diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png",
        "after": "Tiến trình 4.2 phân rã thành bốn tiến trình con từ 4.2.1 đến 4.2.4"
    },
    {
        "fig": "Hình 3.44",
        "png": "docs/diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png",
        "after": "Tiến trình 5.0 được phân rã thành bốn tiến trình con từ 5.1 đến 5.4"
    },
    {
        "fig": "Hình 3.43",
        "png": "docs/diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png",
        "after": "Tiến trình 4.0 được phân rã thành bốn tiến trình con từ 4.1 đến 4.4"
    },
    {
        "fig": "Hình 3.42",
        "png": "docs/diagram/export/DFD_Level_2_P3_Chatbot_RAG.png",
        "after": "Tiến trình 3.0 được phân rã thành bốn tiến trình con từ 3.1 đến 3.4"
    },
    {
        "fig": "Hình 3.41",
        "png": "docs/diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png",
        "after": "Tiến trình 2.0 được phân rã thành bốn tiến trình con từ 2.1 đến 2.4"
    },
    {
        "fig": "Hình 3.40",
        "png": "docs/diagram/export/DFD_Level_2_P1_Payment_Session.png",
        "after": "Tiến trình 1.0 được phân rã thành năm tiến trình con từ 1.1 đến 1.5"
    },
    {
        "fig": "Hình 3.39",
        "png": "docs/diagram/export/DFD_Level_1_System.png",
        "after": "Sơ đồ mức 1 phân rã toàn bộ hệ thống thành năm tiến trình chức năng chính"
    },
    {
        "fig": "Hình 3.38",
        "png": "docs/diagram/export/DFD_Level_0_Context.png",
        "after": "Sơ đồ mức 0 biểu diễn ranh giới ngoài cùng của toàn bộ hệ thống qua một tiến trình trung tâm duy nhất"
    }
]

def run_cmd(cmd):
    print("Running:", " ".join(cmd[:6]))
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', shell=True)
    if res.returncode != 0:
        print("ERROR:", res.stderr)
        return False, res.stderr
    return True, res.stdout

def build_clean_gdoc_ops():
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.split('\n')
    ops = []
    
    i = 0
    n = len(lines)
    while i < n:
        raw_line = lines[i]
        line = raw_line.strip()
        
        if not line or line == '---':
            i += 1
            continue
            
        line = line.replace('##### ', '').replace('#####', '').strip()
        
        if line.startswith('### 3.4.'):
            text = line.lstrip('#').strip()
            ops.append({
                "op": "heading",
                "text": text,
                "level": "2",
                "style": "HEADING_2"
            })
            i += 1
            continue

        if line.startswith('#### 3.4'):
            text = line.lstrip('#').strip()
            ops.append({
                "op": "heading",
                "text": text,
                "level": "3",
                "style": "HEADING_3"
            })
            i += 1
            continue

        if re.match(r'^[a-e]\.\s+', line):
            ops.append({
                "op": "heading",
                "text": line,
                "level": "4",
                "style": "HEADING_4"
            })
            i += 1
            continue

        if line.startswith('![') and ']' in line and '(' in line:
            i += 1
            continue

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

        if line.startswith('|') and line.endswith('|'):
            table_lines = []
            while i < n and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
                
            rows = []
            for t_line in table_lines:
                cells = [c.strip() for c in t_line.split('|')[1:-1]]
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

        if re.match(r'^Bảng 3\.\d+\s+(liệt kê|mô tả)', line):
            i += 1
            continue

        ops.append({
            "op": "append",
            "text": line,
            "style": "NORMAL_TEXT"
        })
        i += 1

    return ops

def main():
    print("=== Synchronizing Section 3.4 to Google Doc ===")
    
    # 1. Find offsets
    ok, out = run_cmd(["gdocs", "readonly", "find-offset", DOC_ID, "--text", "3.4. Sơ đồ luồng dữ liệu DFD", "--tab", TAB_ID])
    if not ok:
        print("Cannot find start offset. Authentication may be needed.")
        return False
        
    start_offset = None
    for line in out.splitlines():
        if "Offset:" in line:
            start_offset = int(line.split("Offset:")[1].strip())
            break
            
    ok, out = run_cmd(["gdocs", "readonly", "find-offset", DOC_ID, "--text", "CHƯƠNG 4: THIẾT KẾ HỆ THỐNG", "--tab", TAB_ID])
    if not ok:
        print("Cannot find end offset.")
        return False
        
    end_offset = None
    for line in out.splitlines():
        if "Offset:" in line:
            end_offset = int(line.split("Offset:")[1].strip())
            break
            
    print(f"Section 3.4 range: {start_offset} -> {end_offset}")
    
    if start_offset is not None and end_offset is not None and end_offset > start_offset:
        print(f"Deleting legacy Section 3.4 ({start_offset}..{end_offset - 1})...")
        ok, out = run_cmd(["gdocs", "mutate", "delete", DOC_ID, str(start_offset), str(end_offset - 1), "--tab", TAB_ID])
        if not ok:
            print("Failed to delete legacy Section 3.4")
            return False
            
    # 2. Batch insert clean text & tables
    ops = build_clean_gdoc_ops()
    temp_dir = os.environ.get("TEMP", "/tmp")
    ops_file = os.path.join(temp_dir, "gdoc_dfd_batch_ops.json")
    with open(ops_file, "w", encoding="utf-8") as f:
        json.dump(ops, f, ensure_ascii=False, indent=2)
        
    print(f"Batch inserting {len(ops)} operations...")
    ok, out = run_cmd(["gdocs", "mutate", "batch", DOC_ID, ops_file, "--tab", TAB_ID])
    if not ok:
        print("Failed to batch insert.")
        return False
        
    # 3. Insert images in reverse order
    print(f"Inserting {len(IMAGE_MAP)} diagram images...")
    for item in IMAGE_MAP:
        fig = item["fig"]
        png_path = item["png"]
        after_text = item["after"]
        print(f"Inserting {fig} ({png_path}) after '{after_text[:30]}...'")
        ok, out = run_cmd(["gdocs", "mutate", "insert-image-from-file", DOC_ID, png_path, "--after", after_text, "--tab", TAB_ID])
        if not ok:
            print(f"Warning: Failed to insert image {fig}")
            
    print("=== Google Doc Sync Completed Successfully ===")
    return True

if __name__ == "__main__":
    main()
