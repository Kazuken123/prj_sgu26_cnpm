import subprocess
import time
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

DOC_ID = "18w13JYpDX6dCXFww2o7HBQEDcMAaNlEQsbBBl3cL4Dk"
TAB_ID = "t.0"

# List in reverse order (Hình 3.50 down to Hình 3.38)
FIGURES_REVERSE = [
    {
        "fig": "Hình 3.50",
        "png": "docs/diagram/export/DFD_Level_3_P3_4_RAG_Answer_Generation.png",
        "after": "Tiến trình 3.4 phân rã thành bốn tiến trình con từ 3.4.1 đến 3.4.4"
    },
    {
        "fig": "Hình 3.49",
        "png": "docs/diagram/export/DFD_Level_3_P4_2_Pipeline_Translation_TTS.png",
        "after": "Tiến trình 4.2 phân rã thành bốn tiến trình con từ 4.2.1 đến 4.2.4"
    },
    {
        "fig": "Hình 3.48",
        "png": "docs/diagram/export/DFD_Level_2_P5_Auth_Admin_Monitoring.png",
        "after": "Tiến trình 5.0 được phân rã thành bốn tiến trình con từ 5.1 đến 5.4"
    },
    {
        "fig": "Hình 3.47",
        "png": "docs/diagram/export/DFD_Level_2_P4_Content_Knowledge_Admin.png",
        "after": "Tiến trình 4.0 được phân rã thành bốn tiến trình con từ 4.1 đến 4.4"
    },
    {
        "fig": "Hình 3.46",
        "png": "docs/diagram/export/DFD_Level_2_P3_Chatbot_RAG.png",
        "after": "Tiến trình 3.0 được phân rã thành bốn tiến trình con từ 3.1 đến 3.4"
    },
    {
        "fig": "Hình 3.45",
        "png": "docs/diagram/export/DFD_Level_2_P2_Visitor_Content_Audio.png",
        "after": "Tiến trình 2.0 được phân rã thành bốn tiến trình con từ 2.1 đến 2.4"
    },
    {
        "fig": "Hình 3.44",
        "png": "docs/diagram/export/DFD_Level_2_P1_Payment_Session.png",
        "after": "Tiến trình 1.0 được phân rã thành năm tiến trình con từ 1.1 đến 1.5"
    },
    {
        "fig": "Hình 3.43",
        "png": "docs/diagram/export/DFD_Level_1_P5_Auth_Admin_Monitoring.png",
        "after": "e. Tiến trình 5.0 Quản trị tài khoản nội bộ và giám sát hệ thống"
    },
    {
        "fig": "Hình 3.42",
        "png": "docs/diagram/export/DFD_Level_1_P4_Content_Knowledge_Admin.png",
        "after": "d. Tiến trình 4.0 Quản trị nội dung, lộ trình và kho kiến thức"
    },
    {
        "fig": "Hình 3.41",
        "png": "docs/diagram/export/DFD_Level_1_P3_Chatbot_RAG.png",
        "after": "c. Tiến trình 3.0 Xử lý hỏi đáp thông minh RAG"
    },
    {
        "fig": "Hình 3.40",
        "png": "docs/diagram/export/DFD_Level_1_P2_Visitor_Content_Audio.png",
        "after": "b. Tiến trình 2.0 Cung cấp nội dung bản đồ, lộ trình và thuyết minh"
    },
    {
        "fig": "Hình 3.39",
        "png": "docs/diagram/export/DFD_Level_1_P1_Payment_Session.png",
        "after": "a. Tiến trình 1.0 Quản lý thanh toán và phiên tham quan"
    },
    {
        "fig": "Hình 3.38",
        "png": "docs/diagram/export/DFD_Level_0_Context.png",
        "after": "Sơ đồ mức 0 biểu diễn ranh giới ngoài cùng của toàn bộ hệ thống"
    }
]

def main():
    print(f"Starting insertion of {len(FIGURES_REVERSE)} images in reverse order...")
    for idx, item in enumerate(FIGURES_REVERSE, 1):
        fig = item["fig"]
        png_path = item["png"]
        after_text = item["after"]
        
        if not os.path.exists(png_path):
            print(f"ERROR: {png_path} does not exist!")
            sys.exit(1)
            
        print(f"[{idx}/13] Inserting {fig} ({png_path}) after '{after_text[:35]}...'")
        
        # Build command: gdocs mutate insert-image-from-file DOC_ID png_path --after "..." --tab t.0
        cmd = [
            "gdocs", "mutate", "insert-image-from-file",
            DOC_ID, png_path,
            "--after", after_text,
            "--tab", TAB_ID
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', shell=True)
        if res.returncode != 0:
            print(f"FAILED on {fig}: {res.stderr}")
            sys.exit(1)
        else:
            print(f"Successfully inserted {fig}: {res.stdout.strip()}")
            
        time.sleep(1) # Polite pause to avoid rate limits

    print("All 13 images successfully inserted into Google Doc!")

if __name__ == "__main__":
    main()
