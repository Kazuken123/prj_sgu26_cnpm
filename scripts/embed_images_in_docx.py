import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import sys

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = "docs/CNPM_BAOCAO.docx"
doc = docx.Document(DOCX_PATH)

FIGURE_IMAGE_MAP = {
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

# Clean any #####
for p in doc.paragraphs:
    if '#####' in p.text:
        p.text = p.text.replace('##### ', '').replace('#####', '')

# Insert pictures before each figure caption
inserted = 0
for p in list(doc.paragraphs):
    for fig_key, img_path in FIGURE_IMAGE_MAP.items():
        if p.text.strip().startswith(fig_key):
            img_p = p.insert_paragraph_before()
            img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            img_p.paragraph_format.space_before = Pt(8)
            img_p.paragraph_format.space_after = Pt(4)
            run = img_p.add_run()
            run.add_picture(img_path, width=Inches(6.2))
            inserted += 1
            print(f"Inserted {img_path} before {fig_key}")
            break

doc.save(DOCX_PATH)
print(f"Done! Inserted {inserted}/9 images into {DOCX_PATH}")
