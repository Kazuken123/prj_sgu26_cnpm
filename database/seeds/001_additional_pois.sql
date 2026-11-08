-- Bo sung 8 diem tham quan thuc te cho Thao Cam Vien Sai Gon
-- Bao gom ca dong vat, thuc vat va di tich lich su van hoa

-- 1. Ho Bengal
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Hổ Bengal', 'ANIMAL', 'Nguy cấp IUCN', '09:00 - 17:00', 10.78725000, 106.70580000, 30, 11, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Hổ Bengal');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Hổ Bengal',
       'Hổ Bengal là loài thú săn mồi dũng mãnh, sở hữu bộ lông màu cam sọc đen đặc trưng giúp ngụy trang hoàn hảo trong tự nhiên.',
       'Hổ Bengal là loài thú săn mồi dũng mãnh, sở hữu bộ lông màu cam sọc đen giúp ngụy trang hoàn hảo trong tự nhiên. Mỗi cá thể có một kiểu sọc vằn riêng biệt như dấu vân tay của con người. Loài hổ này rất thích ngâm mình dưới làn nước mát để giải nhiệt vào những ngày nắng nóng.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Bengal Tiger',
       'The Bengal tiger is a powerful apex predator recognizable by its iconic orange coat with dark vertical stripes.',
       'The Bengal tiger is a powerful predator recognizable by its orange coat with dark vertical stripes. Every individual possesses a unique stripe pattern, much like human fingerprints. Unlike many other cats, Bengal tigers are fond of water and frequently submerge themselves to cool off on hot days.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 2. Gấu ngựa
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Gấu ngựa', 'ANIMAL', 'Sắp nguy cấp IUCN', '09:00 - 17:00', 10.78780000, 106.70510000, 30, 12, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Gấu ngựa');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Gấu ngựa',
       'Gấu ngựa có bộ lông đen bóng và vệt lông màu trắng hình chữ V ngay trước ngực, có khả năng leo trèo khéo léo.',
       'Gấu ngựa có bộ lông đen bóng cùng một vệt lông trắng hình chữ V nổi bật ngay trước ngực. Đôi tai tròn lớn và bộ vuốt cong khỏe giúp chúng leo trèo trên cây thoăn thoắt để tìm kiếm quả chín mọng và mật ong trong rừng.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Asian Black Bear',
       'The Asian black bear features glossy black fur and a striking white or cream V-shaped crescent across its chest.',
       'The Asian black bear features glossy black fur and a striking white or cream V-shaped crescent across its chest. With rounded ears and strong curved claws, these bears are remarkably agile climbers that spend significant time foraging high in the trees for wild fruits and honey.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 3. Báo hoa mai
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Báo hoa mai', 'ANIMAL', 'Sắp nguy cấp IUCN', '09:00 - 17:30', 10.78740000, 106.70610000, 30, 13, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Báo hoa mai');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Báo hoa mai',
       'Báo hoa mai là loài thú họ mèo lớn với các đốm hoa mai tròn phủ khắp cơ thể thon gọn, nổi tiếng bởi sự dẻo dai và khả năng ẩn nấp.',
       'Báo hoa mai là loài động vật săn mồi đơn độc, nổi tiếng với sự dẻo dai và kỹ năng rình rập bậc thầy. Các đốm hoa mai trên cơ thể giúp chúng ẩn nấp kín đáo giữa các cành cây rậm rạp và bóng râm của khu rừng.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Leopard',
       'The leopard is an exceptionally agile big cat recognized by rosette-shaped spots across its sleek and muscular body.',
       'The leopard is an elusive solitary feline known for remarkable strength, stealth, and tree-climbing prowess. Its coat is covered in beautiful rosettes that provide camouflage among tree branches and dappled sunlight in dense forests.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 4. Chim hồng hạc
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Chim hồng hạc', 'ANIMAL', 'Ít quan tâm IUCN', '08:30 - 17:30', 10.78650000, 106.70550000, 30, 14, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Chim hồng hạc');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Chim hồng hạc',
       'Chim hồng hạc là loài chim nước duyên dáng với bộ lông màu hồng rực rỡ, chiếc cổ dài cong uyển chuyển và đôi chân mảnh mai.',
       'Đàn chim hồng hạc tại hồ nước thu hút mọi ánh nhìn nhờ sắc hồng nổi bật trên bộ lông. Màu sắc này bắt nguồn từ các sắc tố tự nhiên trong thức ăn hàng ngày của chúng như tôm nhỏ và tảo biển. Chúng thường đứng thăng bằng trên một chân khi nghỉ ngơi.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Greater Flamingo',
       'The greater flamingo is an elegant wading bird recognized by vibrant pink plumage, a slender curved neck and long legs.',
       'Flamingos at the lagoon stand out with their bright pink plumage and graceful postures. This iconic coloration comes directly from carotenoid pigments in their diet of aquatic invertebrates and algae. They frequently rest by standing balanced on one leg.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 5. Cá sấu hoa cà
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Cá sấu hoa cà', 'ANIMAL', 'Ít quan tâm IUCN', '09:00 - 17:00', 10.78820000, 106.70650000, 30, 15, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Cá sấu hoa cà');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Cá sấu hoa cà',
       'Cá sấu hoa cà là loài bò sát thủy sinh khổng lồ cổ xưa, sở hữu lớp vảy giáp cứng cáp và lực cắn uy lực bậc nhất hành tinh.',
       'Cá sấu hoa cà là đại diện tiêu biểu của nhóm bò sát cổ xưa thời tiền sử. Chúng thích phơi mình bất động trên bờ cỏ để sưởi ấm và tích lũy năng lượng. Khi ở dưới nước, đôi mắt và lỗ mũi nhô cao giúp chúng dễ dàng quan sát xung quanh trong khi cơ thể vẫn ngập sâu.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Saltwater Crocodile',
       'The saltwater crocodile is an ancient apex reptile possessing armor-like scales and one of the strongest bite forces in nature.',
       'The saltwater crocodile is an impressive remnant of prehistoric reptiles. They spend long periods basking quietly along sunlit banks to regulate body temperature. In water, their elevated eyes and nostrils allow them to remain almost completely submerged while breathing and scanning the surroundings.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 6. Vượn má vàng
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Vượn má vàng', 'ANIMAL', 'Nguy cấp IUCN', '08:30 - 16:30', 10.78760000, 106.70680000, 30, 16, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Vượn má vàng');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Vượn má vàng',
       'Vượn má vàng là loài linh trưởng quý hiếm đặc hữu của vùng Đông Dương với đôi tay dài thoăn thoắt và tiếng hót ngân vang buổi sớm.',
       'Vượn má vàng nổi tiếng với những bài hót ngân vang vào mỗi buổi sớm mai để đánh dấu chủ quyền lãnh thổ. Con đực sở hữu bộ lông đen nhánh cùng hai bên má vàng nổi bật, trong khi con cái trưởng thành lại khoác lên mình bộ lông màu vàng sáng dịu dàng.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Yellow-cheeked Gibbon',
       'The yellow-cheeked gibbon is an endangered arboreal primate native to Indochina famed for melodic territorial calls and long arms.',
       'Yellow-cheeked gibbons are celebrated for their elaborate morning duets that resonate through the treetops. Males are completely black with golden cheeks, whereas mature adult females show a soft golden-buff coat throughout their bodies.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 7. Đền thờ Vua Hùng
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Đền thờ Vua Hùng', 'HERITAGE', 'Di tích lịch sử cấp thành phố', '07:30 - 17:00', 10.78610000, 106.70500000, 35, 17, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Đền thờ Vua Hùng');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Đền thờ Vua Hùng',
       'Đền thờ Vua Hùng nằm trang nghiêm gần cổng chính Thảo Cầm Viên, xây dựng năm 1926 mang đậm phong cách kiến trúc cung đình truyền thống.',
       'Đền thờ Vua Hùng tọa lạc ngay gần cổng chính Thảo Cầm Viên, được xây dựng từ năm 1926 mang đậm phong cách kiến trúc cung đình phương Đông với mái ngói cong và phù điêu rồng phượng tinh xảo. Đây là không gian văn hóa tâm linh thanh tịnh, nơi người dân và du khách dâng hương tri ân cội nguồn các vua Hùng có công dựng nước.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Hung Kings Temple',
       'The Hung Kings Temple is a historic heritage sanctuary built in 1926 near the main gate, featuring traditional imperial Vietnamese architecture.',
       'Located near the main entrance, the Hung Kings Temple was erected in 1926 featuring traditional imperial architecture with ornate curved tiled roofs and intricate stone carvings. It serves as a peaceful commemorative space honoring the ancestral founders of the nation.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');

-- 8. Cây đa cổ thụ di sản
INSERT INTO POIS (name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version)
SELECT 'Cây đa cổ thụ di sản', 'PLANT', 'Cây cổ thụ cần bảo tồn', '07:00 - 18:00', 10.78690000, 106.70620000, 30, 18, 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM POIS WHERE name = 'Cây đa cổ thụ di sản');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'vi', 'Cây đa cổ thụ di sản',
       'Cây đa cổ thụ hơn trăm năm tuổi với tán lá rộng che mát một khoảng sân và hệ rễ phụ đồ sộ bám chặt vào lòng đất.',
       'Cây đa cổ thụ Thảo Cầm Viên có tuổi đời hơn một thế kỷ, tán lá xòe rộng phủ bóng mát cả một khoảng sân vườn. Hệ rễ phụ khổng lồ từ trên cành buông thẳng xuống đất tạo thành những cột trụ vững chãi, minh chứng cho sức sống bền bỉ theo thời gian của vườn bách thảo lâu đời.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'vi');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'en', 'Heritage Banyan Tree',
       'This century-old heritage banyan tree boasts a sprawling leafy canopy and magnificent aerial root pillars firmly anchored to the earth.',
       'This majestic heritage banyan tree has thrived in the botanical garden for well over a century. Its massive aerial root pillars drop down from soaring branches into the earth, forming sturdy wooden columns that demonstrate enduring resilience.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'en');
