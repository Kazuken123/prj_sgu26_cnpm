# Nguồn runtime và mô hình Piper

Chỉ mốc nghiên cứu/demo nội bộ, không đưa trọng số mô hình vào Git. Không suy ra giấy phép của engine áp dụng cho mọi giọng hoặc dataset. Khi phân phối image/model cần giữ thông báo/giấy phép tương ứng và kiểm tra điều kiện nguồn; tài liệu này không thay các văn bản giấy phép gốc.

- Engine: OHF-Voice/Piper, package `piper-tts==1.8.0`, GPL-3.0-or-later theo metadata PyPI. Nguồn: https://github.com/OHF-Voice/piper1-gpl ; giấy phép: https://github.com/OHF-Voice/piper1-gpl/blob/main/LICENSE.md ; metadata: https://pypi.org/project/piper-tts/1.8.0/ . Không sửa mã engine.
- Chuyển mẫu âm thanh: FFmpeg do Debian cung cấp; nguồn/giấy phép tùy thành phần build: https://ffmpeg.org/legal.html . Thông báo gói nằm trong `/usr/share/doc/` của image; không tự coi mọi build chỉ có một loại giấy phép.
- Kho mô hình: https://huggingface.co/rhasspy/piper-voices ; revision `5041a7a49ae5b3a0f30e6837769eb03fdbb231bd`. Checksum/kích thước trong `backend/runtime/piper-voices.json`, đối chiếu metadata LFS của kho trước khi tải.
- VI: vais1000-medium, một speaker,22050Hz. Model card: https://huggingface.co/rhasspy/piper-voices/blob/5041a7a49ae5b3a0f30e6837769eb03fdbb231bd/vi/vi_VN/vais1000/medium/MODEL_CARD . Card dẫn dataset VAIS-1000 và CC BY4.0, ghi fine-tune từ lessac medium. Giữ nguyên card và đường dẫn nguồn; không diễn giải thành giọng được huấn luyện từ đầu bởi nhóm.
- EN: ljspeech-medium, một speaker,22050Hz theo cấu hình/card. Model card: https://huggingface.co/rhasspy/piper-voices/blob/5041a7a49ae5b3a0f30e6837769eb03fdbb231bd/en/en_US/ljspeech/medium/MODEL_CARD . Card dẫn LJ Speech dataset https://keithito.com/LJ-Speech-Dataset/ và ghi public domain. Card có mô tả lịch sử re-encode22500Hz; adapter dùng sample_rate22050 trong config đã khóa, không đoán từ câu mô tả.

Bộ cài giữ `vi-MODEL_CARD.md`, `en-MODEL_CARD.md` và manifest trong `/opt/piper-models`. Nội dung POI DRAFT-03 có hồ sơ nguồn/duyệt riêng; không lẫn nguồn mô hình giọng đọc với nguồn thông tin về động vật.
