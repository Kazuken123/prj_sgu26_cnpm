import subprocess
import time
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

DOC_ID = "18w13JYpDX6dCXFww2o7HBQEDcMAaNlEQsbBBl3cL4Dk"
TAB_ID = "t.0"

REMAINING_IMAGES = [
    {
        "fig": "Hình 3.39",
        "png": "docs/diagram/export/DFD_Level_1_System.png",
        "after": "Sơ đồ mức 1 phân rã toàn bộ hệ thống thành năm tiến trình chức năng chính"
    },
    {
        "fig": "Hình 3.40",
        "png": "docs/diagram/export/DFD_Level_2_P1_Payment_Session.png",
        "after": "Tiến trình 1.0 được phân rã thành năm tiến trình con từ 1.1 đến 1.5"
    },
    {
        "fig": "Hình 3.41",
        "png": "docs/diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png",
        "after": "Tiến trình 2.0 được phân rã thành bốn tiến trình con từ 2.1 đến 2.4"
    },
    {
        "fig": "Hình 3.42",
        "png": "docs/diagram/export/DFD_Level_2_P3_Chatbot_RAG.png",
        "after": "Tiến trình 3.0 được phân rã thành bốn tiến trình con từ 3.1 đến 3.4"
    },
    {
        "fig": "Hình 3.43",
        "png": "docs/diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png",
        "after": "Tiến trình 4.0 được phân rã thành bốn tiến trình con từ 4.1 đến 4.4"
    },
    {
        "fig": "Hình 3.44",
        "png": "docs/diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png",
        "after": "Tiến trình 5.0 được phân rã thành bốn tiến trình con từ 5.1 đến 5.4"
    },
    {
        "fig": "Hình 3.45",
        "png": "docs/diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png",
        "after": "Tiến trình 4.2 phân rã thành bốn tiến trình con từ 4.2.1 đến 4.2.4"
    },
    {
        "fig": "Hình 3.46",
        "png": "docs/diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png",
        "after": "Tiến trình 3.4 phân rã thành bốn tiến trình con từ 3.4.1 đến 3.4.4"
    }
]

def main():
    print(f"Inserting remaining {len(REMAINING_IMAGES)} images into Google Doc...")
    for idx, item in enumerate(REMAINING_IMAGES, 1):
        fig = item["fig"]
        png_path = item["png"]
        after_text = item["after"]
        
        if not os.path.exists(png_path):
            print(f"Error: {png_path} does not exist!")
            sys.exit(1)
            
        print(f"[{idx}/{len(REMAINING_IMAGES)}] Inserting {fig} ({png_path}) after '{after_text[:35]}...'")
        cmd = [
            "gdocs", "mutate", "insert-image-from-file",
            DOC_ID, png_path,
            "--after", after_text,
            "--tab", TAB_ID
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', shell=True)
        if res.returncode != 0:
            print(f"ERROR inserting {fig}:", res.stderr)
        else:
            print(f"Success: {fig} inserted.")
        time.sleep(2)
        
    print("=== All Images Inserted Successfully ===")

if __name__ == "__main__":
    main()
