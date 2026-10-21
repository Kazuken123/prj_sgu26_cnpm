# Bốn giọng đọc demo đã được nghe duyệt

Ngày22/10/2026, người dùng nghe/chấp nhận bốn mẫu: EN ổn; VI hơi khó nghe nhưng trong ngưỡng demo. Đây không phải nghiệm thu toàn bộ NFR-10. Tên, giới thiệu và kịch bản VI/EN vẫn lấy nguyên DRAFT-03; dữ kiện/nguồn/OSM của dataset gốc không đổi.

`manifest.json` gắn từng UUID WAV với POI/ngôn ngữ và SHA256 của đúng file đã nghe, không phải bản tổng hợp lại. WAV PCM mono16bit/16000Hz. Engine Piper1.8.0, VI vais1000-medium, EN ljspeech-medium; nguồn/giấy phép mô hình tại `docs/THIRD_PARTY_PIPER.md`. Không có trọng số mô hình hoặc bí mật trong thư mục này.

Đây là dữ liệu ứng viên để phát hành có kiểm tra, không phải thư mục public của frontend. Chép đúng nội dung này khi dựng bản sao ngoài OneDrive. Công cụ `backend/scripts/publish-demo-audio.js` kiểm target/nguồn/hash/metadata rồi lưu vào MEDIA_ROOT riêng và cập nhật tham chiếu hiện hành. Không chép file vào frontend/public hoặc tự sửa SQL để bỏ qua kiểm tra. API audio vẫn yêu cầu token khách hợp lệ.

`data/demo/draft03.json` giữ nhãn âm thử của **lần seed ban đầu**. Seed lặp giữ nguyên dữ liệu và không hạ audio đã phát hành về âm thử. Bước phát hành riêng và audit mới mô tả trạng thái audio sau chuyển. Không tự đổi hợp đồng seed để tạo job trùng.
