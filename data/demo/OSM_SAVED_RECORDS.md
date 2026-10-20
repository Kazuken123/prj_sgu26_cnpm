# Bản ghi nguồn OSM đã lưu — không phải lần kiểm tra mới

Đây là bản chép có cấu trúc từ lần đọc trước được ghi trong hồ sơ DRAFT-02 ngày **20/10/2026**, không phải XML/JSON thô hoặc phản hồi OSM mới. DRAFT-02 đã lưu URL, node ID, phiên bản, tên/tag và tọa độ. SHA-256 hồ sơ DRAFT-02 tại thời điểm đóng gói: `3394efab8df296df1ef3c759de7d1507925333cd842f771f8f7a2322920e807a`.

- Hươu cao cổ / Giraffes: [node 6045633938](https://www.openstreetmap.org/node/6045633938), version **5**, latitude **10.7880953**, longitude **106.7078014**; name=Hươu cao cổ, name:en=Giraffes, attraction=animal, tourism=attraction, zoo=enclosure.
- Voi / Elephants: [node 6045634869](https://www.openstreetmap.org/node/6045634869), version **3**, latitude **10.7886498**, longitude **106.7071674**; name=Voi, name:en=Elephants, attraction=animal, tourism=attraction, zoo=enclosure.

Ngày ở trên là ngày đọc cũ được ghi trong hồ sơ, không phải ngày khảo sát thực địa hoặc thời điểm chỉnh sửa node. Hồ sơ không lưu được thời điểm đọc đến giây hoặc nguyên phản hồi API; không tự bổ sung các dữ liệu đó. Số chữ số tọa độ không bảo đảm độ chính xác theo mét.

Lần thử tái truy cập trước nhập không thành công. Chủ đồ án đã chấp nhận dùng bản ghi cũ cho **demo trình duyệt riêng**, không bắt buộc truy cập lại nguồn thành công. `osmCheckedAt` trong `draft03.json` giữ **null**. `locationEvidence.mode=SAVED_SOURCE_ACCEPTED` ghi nhận quyết định sử dụng có giới hạn, không phải xác nhận mới của OSM hoặc Thảo Cầm Viên.

**Tọa độ tham khảo từ bản ghi nguồn đã lưu, chưa tái xác minh tại lần nhập, chưa khảo sát thực địa.**

Không xác nhận node hươu là khu cạnh voi: [trang chính thức về hươu cao cổ](https://saigonzoo.vn/thuc-vat/huou-cao-co-clv38.html) mô tả hai khu, chưa đối chiếu khu nào với node. Node voi chỉ mang tên Voi; việc dùng làm POI nội dung Voi châu Á là lựa chọn demo có giới hạn, chưa khảo sát biển tên hoặc khu đang mở. Không dùng tọa độ chung/cổng để thay thế các điểm này, không coi là tọa độ khách đứng.

Khi tái sử dụng dữ liệu OSM cần giữ ghi công **© OpenStreetMap contributors** và [thông tin bản quyền/giấy phép ODbL](https://www.openstreetmap.org/copyright). Không gắn các điểm vào chỉ dẫn GPS/đi bộ đã nghiệm thu.

## Nguồn nội dung loài — dữ kiện chung, không gắn với một cá thể

- [Hươu cao cổ — Thảo Cầm Viên](https://saigonzoo.vn/thuc-vat/huou-cao-co-clv38.html): nội dung địa điểm công bố, chưa chứng minh hiện trạng khu/cá thể tại lần nhập.
- [Giraffe — San Diego Zoo Wildlife Alliance](https://animals.sandiegozoo.org/animals/giraffe): cổ/chân dài, lá cây trên cao và hoa văn khác nhau giữa cá thể.
- [Voi châu Á — Thảo Cầm Viên](https://saigonzoo.vn/dong-vat/voi-chau-a-clv4.html): nội dung địa điểm công bố; không đưa tuổi/tên/lịch chăm sóc vào bộ demo.
- [Asian elephant — Smithsonian's National Zoo](https://nationalzoo.si.edu/animals/asian-elephant): cấu tạo vòi, lấy thức ăn/hút nước đưa vào miệng, thức ăn thực vật.

Các nguồn được đọc trong hồ sơ trước đó, ghi ngày 20/10/2026; không ghi đây là lần kiểm tra mới. Không thấy ngày cập nhật riêng đáng tin cậy cho các trang loài trong lần đọc cũ. Nội dung VI/EN được biên soạn ngắn, giữ dữ kiện đã duyệt; không sao chép ảnh hoặc toàn bài nguồn.

Chủ đồ án đã duyệt tên, giới thiệu, kịch bản đọc VI/EN của DRAFT-03 trong chat. Bản EN là bản dịch biên soạn đã duyệt, không phải đầu ra MockTranslation. Không có tọa độ/cá thể/lịch mới được tự thêm. Kịch bản đọc là văn bản chuẩn bị; audio của demo vẫn là âm thử WAV mock một giây, **không đọc kịch bản**.
