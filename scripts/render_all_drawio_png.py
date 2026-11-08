import os
import sys
import json
import html
import time
import subprocess
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops

sys.stdout.reconfigure(encoding='utf-8')

TEMP_DIR = os.environ['TEMP']
USER_DATA = os.path.join(TEMP_DIR, 'edge_user_profile')
EDGE_BIN = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

DIAGRAMS = [
    ("DFD_Level_0_Context", "docs/diagram/dfd/DFD_Level_0_Context.drawio", "docs/diagram/export/DFD_Level_0_Context.png"),
    ("DFD_Level_1_P1_Payment_Session", "docs/diagram/dfd/DFD_Level_1_P1_Payment_Session.drawio", "docs/diagram/export/DFD_Level_1_P1_Payment_Session.png"),
    ("DFD_Level_1_P2_Visitor_Content_Audio", "docs/diagram/dfd/DFD_Level_1_P2_Visitor_Content_Audio.drawio", "docs/diagram/export/DFD_Level_1_P2_Visitor_Content_Audio.png"),
    ("DFD_Level_1_P3_Chatbot_RAG", "docs/diagram/dfd/DFD_Level_1_P3_Chatbot_RAG.drawio", "docs/diagram/export/DFD_Level_1_P3_Chatbot_RAG.png"),
    ("DFD_Level_1_P4_Content_Knowledge_Admin", "docs/diagram/dfd/DFD_Level_1_P4_Content_Knowledge_Admin.drawio", "docs/diagram/export/DFD_Level_1_P4_Content_Knowledge_Admin.png"),
    ("DFD_Level_1_P5_Auth_Admin_Monitoring", "docs/diagram/dfd/DFD_Level_1_P5_Auth_Admin_Monitoring.drawio", "docs/diagram/export/DFD_Level_1_P5_Auth_Admin_Monitoring.png"),
    ("DFD_Level_2_P1_Payment_Session", "docs/diagram/dfd/DFD_Level_2_P1_Payment_Session.drawio", "docs/diagram/export/DFD_Level_2_P1_Payment_Session.png"),
    ("DFD_Level_2_P2_Visitor_Content_Audio", "docs/diagram/dfd/DFD_Level_2_P2_Visitor_Content_Audio.drawio", "docs/diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png"),
    ("DFD_Level_2_P3_Chatbot_RAG", "docs/diagram/dfd/DFD_Level_2_P3_Chatbot_RAG.drawio", "docs/diagram/export/DFD_Level_2_P3_Chatbot_RAG.png"),
    ("DFD_Level_2_P4_Content_Knowledge_Admin", "docs/diagram/dfd/DFD_Level_2_P4_Content_Knowledge_Admin.drawio", "docs/diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png"),
    ("DFD_Level_2_P5_Auth_Admin_Monitoring", "docs/diagram/dfd/DFD_Level_2_P5_Auth_Admin_Monitoring.drawio", "docs/diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png"),
    ("DFD_Level_3_P4_2_Pipeline_Translation_TTS", "docs/diagram/dfd/DFD_Level_3_P4_2_Pipeline_Translation_TTS.drawio", "docs/diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png"),
    ("DFD_Level_3_P3_4_RAG_Answer_Generation", "docs/diagram/dfd/DFD_Level_3_P3_4_RAG_Answer_Generation.drawio", "docs/diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png"),
]

def render_diagram(name, drawio_path, out_png_path):
    print(f"--- Rendering {name} ---")
    tree = ET.parse(drawio_path)
    root = tree.getroot()
    model = root.find('.//mxGraphModel')
    pw = int(model.attrib.get('pageWidth', '1800')) if model is not None else 1800
    ph = int(model.attrib.get('pageHeight', '1000')) if model is not None else 1000

    win_w = max(pw + 100, 1800)
    win_h = max(ph + 100, 1200)

    with open(drawio_path, 'r', encoding='utf-8') as f:
        xml_content = f.read()

    config = {
        'highlight': '#0000ff',
        'nav': False,
        'resize': True,
        'toolbar': '',
        'edit': '_blank',
        'xml': xml_content
    }

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{name}</title>
    <style>
        body {{ margin: 0; padding: 20px; background: white; }}
        .mxgraph {{ background: white; }}
    </style>
</head>
<body>
    <div class="mxgraph" style="max-width:100%;border:none;" data-mxgraph="{html.escape(json.dumps(config))}"></div>
    <script type="text/javascript" src="https://viewer.diagrams.net/js/viewer-static.min.js"></script>
</body>
</html>"""

    html_file = os.path.join(TEMP_DIR, f"{name}.html")
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    temp_png = os.path.join(TEMP_DIR, f"{name}_raw.png")
    file_url = f"file:///{html_file.replace('\\', '/')}"

    cmd = [
        EDGE_BIN,
        "--headless=new",
        f"--user-data-dir={USER_DATA}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-fre",
        "--disable-search-engine-choice-screen",
        "--disable-features=PrivacySandboxSettings4",
        "--allow-file-access-from-files",
        f"--window-size={win_w},{win_h}",
        "--virtual-time-budget=6000",
        f"--screenshot={temp_png}",
        file_url
    ]

    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    time.sleep(1)

    if not os.path.exists(temp_png):
        print(f"Error: {temp_png} was not generated!")
        return False

    # Crop tightly with padding
    im = Image.open(temp_png).convert('RGB')
    bg = Image.new('RGB', im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg)
    bbox = diff.getbbox()
    if bbox:
        pad = 25
        padded_bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(im.size[0], bbox[2] + pad),
            min(im.size[1], bbox[3] + pad)
        )
        cropped = im.crop(padded_bbox)
    else:
        cropped = im

    os.makedirs(os.path.dirname(out_png_path), exist_ok=True)
    cropped.save(out_png_path, "PNG")
    print(f"Saved {name} -> {out_png_path} ({cropped.size[0]}x{cropped.size[1]}, {os.path.getsize(out_png_path)} bytes)")
    return True

def main():
    success_count = 0
    for name, drawio_path, out_png_path in DIAGRAMS:
        ok = render_diagram(name, drawio_path, out_png_path)
        if ok:
            success_count += 1
    print(f"\nCompleted: {success_count}/{len(DIAGRAMS)} diagrams rendered.")

if __name__ == "__main__":
    main()
