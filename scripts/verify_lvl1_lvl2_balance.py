import xml.etree.ElementTree as ET
import sys
sys.stdout.reconfigure(encoding='utf-8')

def parse(f):
    tree = ET.parse(f)
    cells = tree.getroot().findall('.//mxCell')
    arrows = []
    for c in cells:
        if c.attrib.get('edge') == '1':
            cid = c.attrib.get('id')
            val = c.attrib.get('value', '').replace('&amp;', '&').replace('<br/>', ' ')
            src = c.attrib.get('source')
            tgt = c.attrib.get('target')
            arrows.append((cid, src, tgt, val.strip()))
    return arrows

lvl1_arrows = parse('docs/diagram/dfd/DFD_Level_1_System.drawio')
lvl2_configs = [
    ('1.0', 'P1', 'docs/diagram/dfd/DFD_Level_2_P1_Payment_Session.drawio'),
    ('2.0', 'P2', 'docs/diagram/dfd/DFD_Level_2_P2_Visitor_Content_Audio.drawio'),
    ('3.0', 'P3', 'docs/diagram/dfd/DFD_Level_2_P3_Chatbot_RAG.drawio'),
    ('4.0', 'P4', 'docs/diagram/dfd/DFD_Level_2_P4_Content_Knowledge_Admin.drawio'),
    ('5.0', 'P5', 'docs/diagram/dfd/DFD_Level_2_P5_Auth_Admin_Monitoring.drawio'),
]

print("=== KIỂM TRA ĐỐI CHIẾU NGOẠI BIÊN MỨC 1 VS MỨC 2 ===")
total_l1_in = 0
total_l1_out = 0
total_l2_in = 0
total_l2_out = 0
all_perfect = True

for p_num, p_id, f2 in lvl2_configs:
    a2 = parse(f2)
    l1_in = [a[3] for a in lvl1_arrows if a[2] == p_id and any(a[1].startswith(x) for x in ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])]
    l1_out = [a[3] for a in lvl1_arrows if a[1] == p_id and any(a[2].startswith(x) for x in ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])]
    
    l2_in = [a[3] for a in a2 if any(a[1].startswith(x) for x in ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])]
    l2_out = [a[3] for a in a2 if any(a[2].startswith(x) for x in ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])]
    
    total_l1_in += len(l1_in)
    total_l1_out += len(l1_out)
    total_l2_in += len(l2_in)
    total_l2_out += len(l2_out)
    
    in_match = (sorted(l1_in) == sorted(l2_in))
    out_match = (sorted(l1_out) == sorted(l2_out))
    if not (in_match and out_match):
        all_perfect = False
    
    status_in = "KHỚP 100%" if in_match else "LỆCH"
    status_out = "KHỚP 100%" if out_match else "LỆCH"
    
    print(f"\nTiến trình {p_num}:")
    print(f"  - Vào TN: Mức 1 ({len(l1_in)}) = {l1_in}")
    print(f"            Mức 2 ({len(l2_in)}) = {l2_in}")
    print(f"            -> {status_in}")
    print(f"  - Ra TN:  Mức 1 ({len(l1_out)}) = {l1_out}")
    print(f"            Mức 2 ({len(l2_out)}) = {l2_out}")
    print(f"            -> {status_out}")

print("\n" + "=" * 60)
print(f"TỔNG CỘNG 5 TIẾN TRÌNH:")
print(f"  - Tổng luồng vào ngoại biên: Mức 1 = {total_l1_in} | Mức 2 = {total_l2_in}")
print(f"  - Tổng luồng ra ngoại biên:  Mức 1 = {total_l1_out} | Mức 2 = {total_l2_out}")
print(f"  - KẾT LUẬN TOÀN CỤC: {'CÂN BẰNG TUYỆT ĐỐI 100%' if all_perfect else 'VẪN CÒN LỆCH'}")
print("=" * 60)
