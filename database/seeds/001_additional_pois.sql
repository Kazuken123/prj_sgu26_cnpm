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

-- =========================================================================
-- BO SUNG 104 BAN DICH CHO 13 NGON NGU CON LAI CUA 8 POI (11 -> 18)
-- zh-Hans, ko, ja, ru, fr, de, es, it, pt-BR, nl, pl, cs, tr
-- =========================================================================

-- POI 11: Hổ Bengal
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '孟加拉虎',
       '孟加拉虎是威猛的顶级捕食者，拥有标志性的橙色皮毛和深色条纹，在野外提供了完美的伪装。',
       '孟加拉虎是威猛的顶级捕食者，拥有标志性的橙色皮毛和深色条纹，在野外提供了完美的伪装。每只老虎的条纹都是独一无二的，就像人类的指纹一样。与其他猫科动物不同，孟加拉虎非常喜欢水，在炎热的日子里经常泡在水中降温。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '벵골호랑이',
       '벵골호랑이는 검은 줄무늬가 있는 주황색 털을 가진 강력한 최상위 포식자로 자연 속에서 완벽한 위장을 자랑합니다.',
       '벵골호랑이는 검은 줄무늬가 있는 주황색 털을 가진 강력한 포식자입니다. 각 개체의 줄무늬 패턴은 사람의 지문처럼 저마다 고유합니다. 다른 고양잇과 동물과 달리 물을 아주 좋아하여 더운 날에는 물속에 들어가 더위를 식히곤 합니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'ベンガルトラ',
       'ベンガルトラは、オレンジ色の毛並みに黒い縞模様が特徴的な力強い頂点捕食者であり、自然界で完璧に身を隠します。',
       'ベンガルトラは、オレンジ色の体に黒い縞模様を持つ力強い捕食者です。その縞模様は人間の指紋のように一頭一頭異なります。多くのネコ科動物とは異なり、水を好み、暑い日には涼むために水に浸かる姿がよく見られます。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Бенгальский тигр',
       'Бенгальский тигр — могучий верховный хищник с характерной оранжевой шерстью и черными полосами, обеспечивающими идеальную маскировку.',
       'Бенгальский тигр — сильный хищник с узнаваемой оранжевой шерстью и темными вертикальными полосами. Рисунок полос у каждого тигра уникален, как отпечатки пальцев человека. В отличие от большинства кошачьих, бенгальские тигры любят воду и часто купаются в жаркие дни.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Tigre du Bengale',
       'Le tigre du Bengale est un prédateur puissant reconnaissable à son pelage orangé rayé de noir, parfait pour le camouflage.',
       'Le tigre du Bengale est un formidable prédateur doté d''un pelage orange vif rayé de noir qui lui assure un camouflage parfait dans la nature. Chaque individu possède un motif de rayures unique, tout comme les empreintes digitales humaines. Contrairement à beaucoup d''autres félins, le tigre adore l''eau et s''y baigne souvent pour se rafraîchir.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Königstiger',
       'Der Königstiger ist ein kraftvolles Raubtier, das für sein orangefarbenes Fell mit schwarzen Streifen bekannt ist.',
       'Der Königstiger ist ein eindrucksvolles Raubtier mit markanten schwarzen Streifen auf orangefarbenem Grund. Das Streifenmuster ist bei jedem Tier einzigartig, ähnlich wie ein menschlicher Fingerabdruck. Anders als viele andere Katzen lieben Tiger das Wasser und nehmen an heißen Tagen gerne ein kühles Bad.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Tigre de Bengala',
       'El tigre de Bengala es un depredador imponente conocido por su pelaje anaranjado con rayas oscuras que le proporcionan un camuflaje ideal.',
       'El tigre de Bengala es un cazador formidable reconocible por su pelaje naranja con rayas verticales oscuras. El patrón de rayas es único en cada individuo, igual que las huellas dactilares. A diferencia de otros felinos, los tigres disfrutan del agua y con frecuencia se sumergen para refrescarse en días calurosos.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Tigre del Bengala',
       'La tigre del Bengala è un potente predatore dall''inconfondibile mantello arancione a strisce scure, perfetto per mimetizzarsi.',
       'La tigre del Bengala è un maestoso predatore dotato di un mantello arancione con caratteristiche strisce scure. Ogni esemplare presenta una disposizione di strisce unica, proprio come le impronte digitali umane. A differenza di molti altri felini, le tigri amano l''acqua e vi si immergono regolarmente per trovare refrigerio.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Tigre-de-bengala',
       'O tigre-de-bengala é um predador poderoso com pelagem alaranjada e listras escuras que garantem excelente camuflagem.',
       'O tigre-de-bengala é um predador fascinante reconhecido pela pelagem laranja com listras pretas. O padrão de listras de cada indivíduo é único, funcionando como uma impressão digital. Ao contrário de muitos felinos, os tigres adoram água e entram nela com frequência para se refrescar nos dias quentes.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Bengaalse tijger',
       'De Bengaalse tijger is een krachtig toproofdier met een opvallende oranje vacht met donkere strepen.',
       'De Bengaalse tijger is een machtig roofdier dat direct te herkennen is aan zijn oranje vacht met zwarte strepen. Het streeppatroon is bij ieder individu uniek, vergelijkbaar met een menselijke vingerafdruk. In tegenstelling tot veel andere katachtigen houden tijgers erg van water en zwemmen ze graag ter verkoeling.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Tygrys bengalski',
       'Tygrys bengalski to potężny drapieżnik o charakterystycznej pomarańczowej sierści w czarne pręgi, zapewniającej doskonały kamuflaż.',
       'Tygrys bengalski to majestatyczny drapieżnik z charakterystycznym pomarańczowym futrem w ciemne pionowe pręgi. Układ pasków każdego osobnika jest unikalny niczym linie papilarne u człowieka. W przeciwieństwie do większości kotów, tygrysy uwielbiają wodę i chętnie zażywają kąpieli w upalne dni.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Tygr bengálský',
       'Tygr bengálský je silný vrcholový predátor známý svou oranžovou srstí s tmavými pruhy pro dokonalé maskování.',
       'Tygr bengálský je úchvatná šelma s výraznou oranžovou srstí a černými pruhy. Každý jedinec má zcela jedinečný vzor pruhů, podobně jako lidské otisky prstů. Na rozdíl od většiny kočkovitých šelem tygři milují vodu a v horkých dnech se v ní s oblibou chladí.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Bengal Kaplanı',
       'Bengal kaplanı, siyah çizgili turuncu kürküyle mükemmel kamuflaj sağlayan güçlü bir yırtıcıdır.',
       'Bengal kaplanı, turuncu kürk üzerindeki koyu çizgileriyle tanınan güçlü bir avcıdır. Her kaplanın çizgi deseni, tıpkı insan parmak izi gibi tamamen kendine özgüdür. Çoğu kedigilin aksine kaplanlar suyu çok sever ve sıcak günlerde serinlemek için sık sık suya girerler.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Hổ Bengal'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 12: Gấu ngựa
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '亚洲黑熊',
       '亚洲黑熊拥有一身油亮的黑毛和胸前醒目的白色V形斑纹，是出色的爬树高手。',
       '亚洲黑熊身披浓密的黑毛，胸前有一道醒目的白色月牙形或V形斑纹。它们长着圆圆的大耳朵和结实的弯爪，能够非常灵巧地攀爬高树，在树冠上寻找成熟的野果和蜂蜜。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '반달가슴곰',
       '반달가슴곰은 윤기 나는 검은 털과 가슴의 선명한 V자형 흰 무늬가 특징인 능숙한 나무타기 명수입니다.',
       '반달가슴곰은 짙은 검은색 털과 가슴에 뚜렷한 흰색 반달 무늬를 지니고 있습니다. 둥근 귀와 단단하고 굽은 발톱을 이용하여 나무를 능숙하게 오르며 숲속의 열매와 달콤한 벌꿀을 찾아 먹습니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'ツキノワグマ',
       'ツキノワグマは、つややかな黒い毛並みと胸元の白い三日月模様が特徴で、木登りが得意です。',
       'ツキノワグマは、光沢のある黒い毛と胸元にある鮮やかな白いV字または三日月模様が特徴です。丸い耳と力強いかぎ爪を巧みに使い、器用に木に登って木の実やハチミツを探します。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Гималайский медведь',
       'Гималайский медведь отличается блестящей черной шерстью, белым полумесяцем на груди и превосходным умением лазать по деревьям.',
       'Гималайский медведь обладает блестящим черным мехом и характерным белым или кремовым пятном в форме буквы V на груди. Большие округлые уши и острые загнутые когти помогают ему ловко лазать по деревьям в поисках сочных плодов и меда.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Ours noir d''Asie',
       'L''ours noir d''Asie se distingue par sa fourrure noire brillante et son croissant blanc en forme de V sur la poitrine.',
       'L''ours noir d''Asie arbore un pelage noir luisant rehaussé d''une marque blanche en forme de V sur le poitrail. Doté d''oreilles arrondies et de griffes puissantes et recourbées, cet ours est un grimpeur agile qui passe beaucoup de temps dans les arbres pour trouver des fruits et du miel sauvage.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Kragenbär',
       'Der Kragenbär zeichnet sich durch glänzendes schwarzes Fell und eine weiße V-förmige Zeichnung auf der Brust aus.',
       'Der Kragenbär besitzt ein dichtes schwarzes Fell mit einer markanten weißen halbmondförmigen Zeichnung auf der Brust. Seine runden Ohren und die kräftigen gebogenen Krallen machen ihn zu einem hervorragenden Kletterer, der hoch in den Baumkronen nach Früchten und Honig sucht.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Oso negro asiático',
       'El oso negro asiático presenta un pelaje negro brillante y una distintiva marca blanca en forma de V en el pecho.',
       'El oso negro asiático se caracteriza por su lustroso pelaje oscuro y una mancha blanca o crema en forma de V sobre el pecho. Posee orejas redondeadas y garras curvadas muy fuertes que le permiten trepar con gran agilidad a los árboles para alimentarse de frutos y miel.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Orso tibetano',
       'L''orso tibetano sfoggia una folta pelliccia nera e un disegno bianco a forma di mezzaluna o V sul petto.',
       'L''orso tibetano è facilmente riconoscibile dal mantello nero lucido e dal disegno bianco a V sul petto. Le grandi orecchie arrotondate e i robusti artigli ricurvi lo rendono un eccezionale arrampicatore, capace di salire in cima agli alberi per procurarsi frutti selvatici e miele.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Urso-negro-asiático',
       'O urso-negro-asiático tem pelagem negra brilhante e uma faixa branca em V no peito, sendo um excelente escalador.',
       'O urso-negro-asiático exibe pelos pretos brilhantes e uma faixa clara em formato de V no tórax. Com orelhas arredondadas e garras curvas afiadas, ele escala árvores com facilidade impressionante para coletar frutos maduros e colmeias nas florestas.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Aziatische zwarte beer',
       'De Aziatische zwarte beer heeft een glanzend zwarte vacht met een witte V-vormige vlek op de borst en klimt behendig in bomen.',
       'De Aziatische zwarte beer valt op door zijn glanzend zwarte vacht en een lichte halvemaanvormige vlek op de borst. Met zijn ronde oren en scherpe gekromde klauwen klimt hij moeiteloos hoog in de bomen om zich te voeden met vruchten en honing.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Niedźwiedź himalajski',
       'Niedźwiedź himalajski wyróżnia się czarną lśniącą sierścią i białym półksiężycem na piersi, świetnie wspinając się po drzewach.',
       'Niedźwiedź himalajski ma gęste czarne futro z charakterystycznym białym znakiem w kształcie litery V na klatce piersiowej. Okrągłe uszy oraz mocne zakrzywione pazury pomagają mu sprawnie wspinać się na wysokie gałęzie w poszukiwaniu owoców i leśnego miodu.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Medvěd ušatý',
       'Medvěd ušatý má lesklou černou srst s bílou skvrnou ve tvaru písmene V na hrudi a je vynikajícím lezcem.',
       'Medvěd ušatý zaujme lesklou černou srstí a nápadnou světlou skvrnou ve tvaru písmene V na hrudi. Díky kulatým uším a silným zahnutým drápům velmi obratně šplhá do korun stromů, kde hledá zralé plody a med lesních včel.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Asya Kara Ayısı',
       'Asya kara ayısı, parlak siyah kürkü ve göğsündeki beyaz hilal deseniyle tanınan usta bir tırmanıcıdır.',
       'Asya kara ayısı, parlak siyah tüyleri ve göğsünde yer alan beyaz V şeklindeki lekesiyle dikkat çeker. Yuvarlak kulakları ve kıvrık pençeleri sayesinde ağaçlara ustalıkla tırmanarak yabani meyveler ve bal arar.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Gấu ngựa'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 13: Báo hoa mai
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '花豹',
       '花豹是优雅而敏捷的大型猫科动物，全身布满玫瑰形斑纹，以出色的隐蔽和攀爬能力著称。',
       '花豹是独居的猎手，拥有极强的力量与耐力。身上的花斑图案在丛林树影中提供了绝佳的隐蔽效果。它们不仅奔跑敏捷，还常常将捕获的猎物拖上高高的树枝，以防其他食肉动物争夺。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '표범',
       '표범은 날렵한 몸에 장미 모양의 반점이 덮여 있으며 뛰어난 인내력과 은신 능력으로 유명합니다.',
       '표범은 단독 생활을 즐기는 맹수로 탁월한 은신 기술을 지녔습니다. 몸 전체의 매화꽃 같은 반점 무늬는 나뭇가지와 그림자 속에서 몸을 숨기기에 이상적입니다. 힘이 매우 세어 사냥감을 물고 나무 위로 끌어올리기도 합니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'ヒョウ',
       'ヒョウは、しなやかな体と美しい梅花状の斑紋を持つ大型ネコ科動物で、優れた忍耐力と木登りで知られます。',
       'ヒョウは単独で狩りを行う敏捷な捕食者です。体表に散らばる花のようなロゼット模様は、木の葉の木漏れ日の中で完璧なカモフラージュとなります。獲物を咥えて高い木の上へと運び上げる驚異的な筋力を誇ります。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Леопард',
       'Леопард — изящная и сильная крупная кошка с характерными розетками на шерсти, известная ловкостью и скрытностью.',
       'Леопард — скрытный одиночный охотник, отличающийся гибкостью и терпением. Узор из кольцевых пятен на его теле помогает незаметно передвигаться среди ветвей и теней. Леопарды славятся способностью затаскивать тяжелую добычу высоко на деревья.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Léopard',
       'Le léopard est un grand félin agile couvert de rosettes tachetées, renommé pour sa force et son art du camouflage.',
       'Le léopard est un prédateur solitaire célèbre pour sa souplesse et ses talents de chasseur à l''affût. Ses superbes taches en forme de rosettes le rendent presque invisible dans la pénombre de la végétation. Il est capable de hisser de lourdes proies dans les arbres pour les déguster en toute tranquillité.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Leopard',
       'Der Leopard ist eine anmutige Großkatze mit charakteristischem Rosettenmuster, berühmt für Kletterkünste und Tarnung.',
       'Der Leopard ist ein geschickter Einzelgänger, der für seine Geduld und Kraft bekannt ist. Das auffällige Rosettenfell tarnt ihn meisterhaft im Blätterdach und im Schattenspiel der Bäume. Häufig schleppt er seine Beute hoch hinauf auf dicke Äste, um sie vor Fressfeinden zu schützen.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Leopardo',
       'El leopardo es un gran felino ágil con un manto cubierto de rosetas, famoso por su fuerza y capacidad para camuflarse.',
       'El leopardo es un cazador sigiloso y solitario dotado de una agilidad asombrosa. Las manchas en forma de roseta sobre su cuerpo le permiten mimetizarse a la perfección entre las ramas y la maleza. Posee la fuerza necesaria para subir a los árboles presas que duplican su peso.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Leopardo',
       'Il leopardo è un grande felino elegante dal mantello a rosette, celebre per la sua agilità e l''abilità nel mimetizzarsi.',
       'Il leopardo è un predatore solitario famoso per la sua forza e furtività. Il manto cosparso di rosette fornisce un camuffamento straordinario nella vegetazione. Questo formidabile felino ha la peculiare abitudine di issare le prede sui rami degli alberi per tenerle al sicuro.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Leopardo',
       'O leopardo é um grande felino elegante coberto por rosetas escuras, conhecido por sua força e discrição ao caçar.',
       'O leopardo é um caçador solitário notável pela agilidade e capacidade de se camuflar na vegetação. Suas manchas circulares em forma de roseta confundem os olhares entre sombras e galhos. Ele possui grande força muscular, conseguindo carregar carcaças pesadas para o alto dos troncos.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Luipaard',
       'Het luipaard is een sierlijke grote katachtige met een rosettenpatroon, befaamd om zijn camouflage en klimkracht.',
       'Het luipaard is een behendige solitaire jager met een prachtige goudgele vacht vol donkere rozetten. Dankzij dit patroon valt hij nauwelijks op tussen de takken. Met zijn krachtige kaken kan hij prooien die zwaarder zijn dan hijzelf hoog in een boom slepen.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Lampart',
       'Lampart to zwinny wielki kot o ciele pokrytym cętkami w kształcie rozetek, słynący z siły i mistrzowskiego kamuflażu.',
       'Lampart to cichy i silny drapieżnik prowadzący samotny tryb życia. Cętki w kształcie rozetek doskonale maskują go w cieniu gęstych gałęzi. Zwierzę to potrafi wspiąć się na wysokie drzewo, trzymając w pyszczku zdobycz o znacznej wadze.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Levhart skvrnitý',
       'Levhart je mrštná velká kočkovitá šelma posetá rozetovými skvrnami, proslulá svou silou a dokonalým maskováním.',
       'Levhart je samotářský lovec známý svou obratností a trpělivostí. Rozetový vzor na srsti mu umožňuje nepozorovaně splynout s okolní vegetací. Má neuvěřitelnou sílu, díky níž dokáže vytáhnout ulovenou kořist vysoko do koruny stromů.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Pars (Leopar)',
       'Pars, rozet biçimli benekleriyle göze çarpan, mükemmel gizlenme ve tırmanma yeteneğine sahip çevik bir kedigildir.',
       'Pars, gücü ve gizlenme yeteneğiyle öne çıkan yalnız bir avcıdır. Vücudundaki rozet şeklindeki benekler, ağaç gölgeleri arasında adeta görünmez olmasını sağlar. Güçlü çenesiyle avladığı ağır hayvanları ağaç dallarına kadar taşıyabilir.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Báo hoa mai'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 14: Chim hồng hạc
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '火烈鸟',
       '火烈鸟以其纤长的双腿、优美的颈部以及因富含类胡萝卜素食物而呈现的绚丽粉红色羽毛而闻名。',
       '火烈鸟是群居的水鸟，以其醒目的粉红色羽毛和单腿站立的独特姿态吸引着无数游客。它们粉红色的羽毛来自于所摄食的富含类胡萝卜素的甲壳类动物和藻类。弯曲的特殊鸟喙如同天然滤网，便于在水中滤食浮游生物。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '플라밍고 (홍학)',
       '홍학은 긴 다리와 우아한 목, 카로티노이드가 풍부한 먹이에서 비롯된 화려한 분홍빛 깃털로 유명합니다.',
       '홍학은 아름다운 분홍빛 깃털과 한 발로 균형을 잡고 서 있는 독특한 모습으로 잘 알려진 군집성 조류입니다. 깃털의 분홍색은 먹이인 미세 조류와 갑각류 속 카로티노이드 성분 덕분입니다. 구부러진 부리로 물속의 먹이를 손쉽게 걸러 먹습니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'フラミンゴ',
       'フラミンゴは、長い脚と優雅な首、そしてカロテノイドを含む食事によって生まれる鮮やかなピンクの羽が特徴です。',
       'フラミンゴは群れで暮らす優美な水鳥で、鮮やかなピンク色の羽と一本足で休む姿で親しまれています。この鮮やかな色は、好んで食べる甲殻類や藻類に含まれる色素に由来します。特徴的な形のくちばしで水中の微小な生物を器用に濾し取って食べます。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Фламинго',
       'Фламинго известны длинными ногами, грациозной шеей и ярким розовым оперением, цвет которого зависит от диеты.',
       'Фламинго — колониальные птицы, привлекающие внимание нежно-розовым оперением и привычкой стоять на одной ноге. Розовый цвет их перьев обусловлен пигментами каротиноидами, содержащимися в водорослях и ракообразных. Их изогнутый клюв служит фильтром для добывания пищи со дна водоемов.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Flamant rose',
       'Le flamant rose est célèbre pour ses longues pattes, son cou gracieux et son plumage rose hérité de son alimentation.',
       'Le flamant rose est un oiseau grégaire emblématique réputé pour sa posture en équilibre sur une patte et son plumage délicatement teinté. Sa couleur provient des pigments caroténoïdes présents dans les petites crevettes et les algues qu''il consomme. Son bec courbé est conçu pour filtrer l''eau et en extraire les nutriments.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Flamingo',
       'Der Flamingo besticht durch lange Beine, einen geschwungenen Hals und leuchtend rosafarbenes Gefieder.',
       'Flamingos sind gesellige Vögel, die für ihr leuchtend rosa Gefieder und das Stehen auf einem Bein bekannt sind. Ihre charakteristische Farbe verdanken sie Carotinoiden in ihrer Nahrung aus Algen und Kleinkrebsen. Mit ihrem speziell geformten Schnabel filtern sie Plankton geschickt aus dem Wasser.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Flamenco',
       'El flamenco destaca por sus patas delgadas, cuello curvado y llamativo plumaje rosado derivado de los carotenoides.',
       'El flamenco es un ave gregaria reconocida por su hermoso plumaje rosa y su costumbre de descansar sobre una sola pata. Su color distintivo proviene de los pigmentos de las algas y pequeños crustáceos de los que se alimenta. Su pico curvado actúa como un colador natural para filtrar el alimento del agua.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Fenicottero',
       'Il fenicottero è celebre per le zampe slanciate, il collo elegante e il piumaggio rosato derivato dalla sua alimentazione.',
       'Il fenicottero è un uccello gregario dal caratteristico piumaggio rosa intenso che ama riposare su una zampa sola. Il colore delle sue penne deriva dai pigmenti carotenoidi presenti nelle alghe e nei piccoli crostacei che filtra con il becco incurvato nelle acque poco profonde.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Flamingo',
       'O flamingo é famoso por suas pernas longas, pescoço gracioso e plumagem rosada adquirida por meio de sua alimentação.',
       'O flamingo é uma ave aquática elegante famosa por suas penas de tom rosa vibrante e pelo hábito curioso de se equilibrar em uma perna só. A coloração rosa vem de carotenoides presentes nos crustáceos e algas que consome, filtrados com maestria por meio de seu bico curvado.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Flamingo',
       'De flamingo valt op door zijn ranke poten, sierlijke hals en roze verenkleed dat ontstaat door zijn dieet.',
       'Flamingo''s zijn sociale waadvogels die bekendstaan om hun roze veren en het vermogen om langdurig op één poot te staan. Hun kleur ontstaat door natuurlijke pigmenten in het voedsel van algen en kreeftachtigen, die ze met hun gebogen snavel uit het water zeven.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Flaming',
       'Flaming słynie z długich smukłych nóg, giętkiej szyi i różowego upierzenia, którego odcień zależy od zjadanych skorupiaków.',
       'Flamingi to towarzyskie ptaki brodzące o zjawiskowym różowym upierzeniu, często odpoczywające na jednej nodze. Swój charakterystyczny kolor zawdzięczają diecie bogatej w karotenoidy z glonów i drobnych skorupiaków, które filtrują z wody przy pomocy zakrzywionego dzioba.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Plameňák',
       'Plameňák je známý dlouhýma nohama, štíhlým krkem a zářivě růžovým peřím pocházejícím z přirozené potravy.',
       'Plameňáci jsou společenští vodní ptáci vyhledávaní pro své jemné růžové peří a zvyk odpočívat na jedné noze. Růžový odstín získávají z karotenoidů obsažených v drobných korýších a řasách, které šikovně cedí z vody svým speciálně zahnutým zobákem.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Flamingo',
       'Flamingo, ince uzun bacakları, kavisli boynu ve beslenmesindeki karotenoidler sayesinde pembeleşen tüyleriyle bilinir.',
       'Flamingolar, zarif pembe tüyleri ve tek ayak üzerinde durma alışkanlıklarıyla tanınan sosyal su kuşlarıdır. Göz alıcı pembe tonlarını beslendikleri kabuklular ve su yosunlarındaki pigmentlerden alırlar. Eğri gagaları sudaki besinleri süzmek için mükemmel bir filtre işlevi görür.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Chim hồng hạc'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 15: Cá sấu hoa cà
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '湾鳄 (咸水鳄)',
       '湾鳄是地球上现存体型最大的爬行动物，具备惊人的咬合力与在淡水及咸水环境中生存的强劲适应力。',
       '湾鳄又称咸水鳄，是世界上现存最大的爬行动物。它们拥有极其强大的咬合力，能够悄无声息地潜伏在水面下伏击靠近的猎物。它们特殊的盐腺构造让它们既能在内陆河流生活，也能在广阔的海水中长途跋涉。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '바다악어',
       '바다악어는 지구상에서 가장 거대한 파충류로 강력한 턱 힘과 해수 및 담수를 넘나드는 뛰어난 적응력을 지녔습니다.',
       '바다악어는 현존하는 가장 큰 파충류로 엄청난 턱 힘을 자랑합니다. 눈과 콧구멍만 수면 위로 내놓은 채 조용히 숨어 사냥감을 기습하는 데 능숙합니다. 체내 염분을 배출하는 특수 기관 덕분에 강물뿐만 아니라 바다에서도 자유롭게 헤엄쳐 다닙니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'イリエワニ',
       'イリエワニは現生最大の爬虫類であり、圧倒的な噛む力と淡水から海水まで適応できる高い生存能力を持ちます。',
       'イリエワニは地球上で最も巨大な爬虫類であり、動物界屈指の強力な顎の力を誇ります。水面に目と鼻だけを出して気配を消し、獲物に音もなく近づきます。塩分を排出する腺を持っているため、河川だけでなく外海を長距離泳ぐことも可能です。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Гребнистый крокодил',
       'Гребнистый крокодил — крупнейшая рептилия на планете, обладающая сокрушительной силой укуса и выносливостью.',
       'Гребнистый крокодил — самый крупный современный представитель пресмыкающихся. Он обладает чудовищной силой сжатия челюстей и мастерски устраивает засады у кромки воды. Благодаря солевыводящим железам этот крокодил прекрасно чувствует себя как в пресных реках, так и в соленом море.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Crocodile marin',
       'Le crocodile marin est le plus grand reptile vivant sur Terre, réputé pour sa morsure foudroyante et son endurance aquatique.',
       'Le crocodile marin est le géant du monde des reptiles. Ce prédateur redoutable dispose d''une puissance de morsure colossale et chasse en restant presque entièrement immergé à la surface de l''eau. Ses glandes spéciales lui permettent de vivre aussi bien dans les estuaires saumâtres qu''en haute mer.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Leistenkrokodil',
       'Das Leistenkrokodil ist das größte lebende Reptil der Erde mit gewaltiger Beißkraft und hoher Anpassungsfähigkeit.',
       'Das Leistenkrokodil, auch Salzwasserkrokodil genannt, ist das größte heute lebende Kriechtier. Mit einer der stärksten Beißkräfte im Tierreich lauert es fast unsichtbar an der Wasseroberfläche auf Beute. Dank spezieller Salzdrüsen kann es problemlos im Meer schwimmen und neue Lebensräume erschließen.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Cocodrilo marino',
       'El cocodrilo marino es el reptil vivo más grande del mundo, con una fuerza de mordida demoledora y gran tolerancia a la salinidad.',
       'El cocodrilo marino es el reptil más voluminoso del planeta. Dotado de una mordida devastadora, se camufla dejando solo los ojos y las fosas nasales fuera del agua para sorprender a sus presas. Gracias a sus glándulas salinas, tolera el agua de mar y puede recorrer largas distancias oceánicas.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Coccodrillo marino',
       'Il coccodrillo marino è il più grande rettile vivente, noto per il morso potentissimo e la capacità di nuotare in mare aperto.',
       'Il coccodrillo marino è il più imponente rettile della Terra. Possiede una straordinaria forza mascellare e caccia tendendo agguati con il corpo quasi del tutto immerso nell''acqua. Le sue ghiandole saline gli consentono di navigare senza problemi tra fiumi d''acqua dolce e mari aperti.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Crocodilo-de-água-salgada',
       'O crocodilo-de-água-salgada é o maior réptil do planeta, dotado de mordida formidável e grande resistência aquática.',
       'O crocodilo-de-água-salgada é o maior réptil vivo da Terra. Apresenta uma das mordidas mais fortes do reino animal e costuma espreitar suas presas silenciosamente sob a água. Dotado de glândulas que eliminam o excesso de sal, ele viaja longas distâncias marítimas com facilidade.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Zeekrokodil',
       'De zeekrokodil is het grootste levende reptiel ter wereld met een verpletterende bijtkracht en een grote zouttolerantie.',
       'De zeekrokodil is het grootste hedendaagse reptiel ter wereld. Met zijn ontzagwekkende bijtkracht ligt hij roerloos onder het wateroppervlak te wachten om zijn prooi te grijpen. Speciale zoutklieren stellen hem in staat om zowel in zoetwaterrivieren als in de open zee te overleven.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Krokodyl różańcowy',
       'Krokodyl różańcowy to największy współczesny gad na świecie, charakteryzujący się potężnym uściskiem szczęk.',
       'Krokodyl różańcowy jest największym żyjącym gadem na Ziemi. Dysponuje niezwykle silnym zgryzem i doskonale maskuje się tuż pod powierzchnią wody, czekając na nieostrożną ofiarę. Dzięki gruczołom solnym bez trudu pływa zarówno w rzekach, jak i w morskich wodach przybrzeżnych.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Krokodýl mořský',
       'Krokodýl mořský je největší žijící plaz na světě, který vyniká drtivou silou stisku čelistí a schopností plavat v moři.',
       'Krokodýl mořský je nejmohutnějším plazem současnosti s obrovskou silou skusu. Loví ze zálohy a pod hladinou dokáže nehybně vyčkávat dlouhé hodiny. Vylučovací žlázy mu umožňují bez problémů snášet slanou vodu a podnikat daleké cesty podél pobřeží.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Tuzlu Su Timsahı',
       'Tuzlu su timsahı, muazzam çene kuvveti ve hem tatlı hem tuzlu suda yaşayabilme yeteneğiyle dünyanın en büyük sürüngenidir.',
       'Tuzlu su timsahı, yaşayan en büyük sürüngen türüdür. Doğadaki en güçlü ısırma kuvvetlerinden birine sahiptir ve avını su yüzeyinin hemen altından sinsice pusuya düşürür. Vücudundaki özel tuz bezleri sayesinde nehirlerin yanı sıra açık denizlerde de uzun mesafeler kat edebilir.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cá sấu hoa cà'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 16: Vượn má vàng
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '黄颊黑冠长臂猿',
       '黄颊长臂猿是中南半岛特有的濒危树栖灵长类，以优美的高亢啼鸣和修长的双臂著称。',
       '黄颊长臂猿以其在清晨林冠间回荡的美妙啼鸣而闻名。雄性成年时长臂猿通体乌黑，脸颊两侧有金黄色的毛发；雌性成年后则通体呈现柔和的金黄色毛皮。它们利用修长有力的手臂在树冠间优雅荡跃。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '노란뺨긴팔원숭이',
       '노란뺨긴팔원숭이는 인도차이나 고유의 멸종위기 영장류로, 아름다운 아침 울음소리와 긴 팔을 활용한 활강이 특징입니다.',
       '노란뺨긴팔원숭이는 아침마다 숲 전체에 울려 퍼지는 맑은 노래로 유명합니다. 다 자란 수컷은 노란 뺨을 제외하고 온몸이 검은색인 반면, 성체 암컷은 따뜻한 황금빛 털을 지닙니다. 긴 팔을 이용해 나뭇가지 사이를 그네 타듯 경쾌하게 이동합니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'キホオシロハラボウシテナガザル (キホオテナガザル)',
       'キホオテナガザルはインドシナ原産の希少な樹上性霊長類で、美しく響く鳴き交わしと長い腕が特徴です。',
       'キホオテナガザルは、朝の森に響き渡る美しいデュエットの鳴き声で知られています。大人のオスは頬の黄色を除いて全身が黒く、大人のメスは全身が明るい黄褐色になります。長い腕を使って樹冠から樹冠へと華麗に腕渡りを行います。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Желтощекий хохлатый гиббон',
       'Желтощекий гиббон — редкий древесный примат Индокитая, известный утренними мелодичными песнями и длинными руками.',
       'Желтощекие гиббоны славятся своими звонкими утренними перекличками, разносящимися по кронам деревьев. Взрослые самцы окрашены в черный цвет с золотистыми щеками, а самки обладают светлым золотисто-бежевым мехом. С помощью длинных рук они легко перелетают с ветки на ветку.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Gibbon à joues jaunes',
       'Le gibbon à joues jaunes est un primate arboricole menacé d''Indochine réputé pour ses chants mélodieux et ses longs bras.',
       'Les gibbons à joues jaunes sont célèbres pour leurs chants matinaux harmonieux qui résonnent à travers la forêt. Les mâles adultes sont entièrement noirs avec des joues dorées, tandis que les femelles arborent un beau pelage fauve doré. Leurs bras démesurés leur permettent de se balancer avec grâce de branche en branche.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Gelbwangen-Schopfgibbon',
       'Der Gelbwangen-Schopfgibbon ist ein seltener Primat Indochinas, bekannt für melodische Duette und geschickte Hangelschwünge.',
       'Gelbwangen-Schopfgibbons sind für ihre melodischen morgendlichen Rufe bekannt, die weit durch die Wipfel dringen. Männchen sind tiefschwarz mit goldgelben Wangen, während die Weibchen ein helles gelbbraunes Fell tragen. Dank ihrer langen Arme bewegen sie sich elegant schwingend durch das Geäst.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Gibón de mejillas doradas',
       'El gibón de mejillas doradas es un primate arborícola amenazado de Indochina célebre por sus cantos y ágiles desplazamientos.',
       'El gibón de mejillas doradas es famoso por sus melodiosos dúos matutinos que resuenan en la copa de los árboles. Los machos son completamente negros con mejillas doradas, mientras que las hembras adultas tienen un pelaje beige dorado. Utilizan sus largos brazos para balancearse con gran soltura entre las ramas.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Gibbone dalle guance dorate',
       'Il gibbone dalle guance dorate è un raro primate arboricolo dell''Indocina, noto per i vocalizzi melodici e le lunghe braccia.',
       'I gibboni dalle guance dorate sono rinomati per i suggestivi canti del mattino con cui delimitano il territorio. I maschi adulti hanno un mantello nero con guance dorate, mentre le femmine presentano una colorazione beige dorata. Grazie alle lunghe braccia si spostano velocemente saltando tra gli alberi.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Gibão-de-bochechas-douradas',
       'O gibão-de-bochechas-douradas é um primata arborícola ameaçado da Indochina famoso por cantos melodiosos e braços compridos.',
       'O gibão-de-bochechas-douradas é conhecido pelos belos duetos vocais matinais que ecoam pelas copas da floresta. Os machos têm pelagem preta com bochechas amarelas, enquanto as fêmeas adultas exibem um tom dourado suave. Seus braços compridos garantem um deslocamento ágil entre os galhos.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Goudwanggibbon',
       'De goudwanggibbon is een bedreigde boom bewonende primaat uit Indochina, beroemd om zijn ochtendzang en lange armen.',
       'Goudwanggibbons zijn bekend om hun melodieuze ochtendgezang dat ver door het bladerdak weerklinkt. Volwassen mannetjes zijn gitzwart met goudkleurige wangen, terwijl vrouwtjes een lichte goudbruine vacht hebben. Met hun lange armen slingeren ze behendig van tak naar tak.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Gibon żółtolicy',
       'Gibon żółtolicy to zagrożony nadrzewny ssak naczelny z Indochin, słynący z melodyjnych nawoływań i długich ramion.',
       'Gibony żółtolice słyną z porannych duetów wokalnych rozbrzmiewających w koronach drzew. Samce są kruczoczarne ze złocistymi policzkami, a dorosłe samice mają futro o ciepłym płowym odcieniu. Długie kończyny pozwalają im na zwinne przemieszczanie się wśród gałęzi.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Gibon zlatolící',
       'Gibon zlatolící je ohrožený stromový primát z Indočíny, proslulý melodickým zpěvem a dlouhými pažemi.',
       'Giboni zlatolící jsou vyhlášení svým harmonickým ranním zpěvem nesoucím se korunami stromů. Dospělí samci jsou černí se žlutými lícemi, zatímco samice mají půvabnou světle plavou srst. Pomocí dlouhých paží ladně přeskakují z větve na větev.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Sarı Yanaklı Gibon',
       'Sarı yanaklı gibon, melodik sabah ötüşleri ve uzun kollarıyla bilinen, Çinhindi''ne özgü nesli tehlikedeki bir primattır.',
       'Sarı yanaklı gibonlar, sabahları ağaç tepelerinden yankılanan melodik sesleriyle tanınırlar. Yetişkin erkekler sarı yanakları dışında tamamen siyahken, dişiler açık altın rengi kürke sahiptir. Uzun kolları sayesinde dallar arasında adeta uçarcasına sallanarak ilerlerler.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Vượn má vàng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 17: Đền thờ Vua Hùng
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '雄王殿',
       '雄王殿庄严地坐落于西贡动植物园主入口附近，始建于1926年，具有浓郁的传统东方宫廷建筑风格。',
       '雄王殿位于草禽园正门附近，建于1926年，呈现出典型的东方宫廷建筑风貌，拥有典雅的飞檐屋顶和精细的龙凤浮雕。这里是清幽祥和的文化圣地，供当地民众与八方游客瞻仰进香，缅怀奠定越南民族根基的雄王先祖。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '훙왕 신전',
       '훙왕 신전은 동물원 정문 인근에 1926년 건립된 유서 깊은 사당으로 베트남 전통 궁궐 양식이 돋보입니다.',
       '훙왕 신전은 사이공 동식물원 정문 인근에 위치하며 1926년에 세워진 전통 동양 궁정 양식의 사당입니다. 곡선미를 자랑하는 기와지붕과 정교한 용과 봉황 부조가 조화를 이룹니다. 건국 시조 훙왕의 은덕을 기리며 향을 올리는 고요한 문화 역사 공간입니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', 'フン王廟 (フン・ヴオン廟)',
       'フン王廟は1926年に正門近くに建立された歴史ある廟殿で、伝統的な東洋宮廷建築の趣を漂わせています。',
       'フン王廟はサイゴン動植物園の正門近くに位置し、1926年に建立された格式高い東洋宮廷様式の建造物です。反り上がった瓦屋根や精緻な龍と鳳凰の彫刻が印象的です。ベトナム建国の祖である歴代フン王の功績を偲び、祈りを捧げる静謐な文化遺産です。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Храм королей Хунгов',
       'Храм королей Хунгов, возведенный в 1926 году возле главных ворот, выполнен в традиционном восточном дворцовом стиле.',
       'Храм королей Хунгов расположен неподалеку от главного входа в ботанический сад. Построенный в 1926 году, он отражает традиции восточной дворцовой архитектуры с изящно изогнутой крышей и искусными барельефами. Это священное место почитания легендарных правителей-основателей вьетнамского государства.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Temple des Rois Hung',
       'Le temple des Rois Hung, érigé en 1926 près de l''entrée principale, arbore une architecture traditionnelle impériale.',
       'Situé à proximité de l''entrée principale, le temple des Rois Hung a été bâti en 1926 selon une architecture d''inspiration impériale avec ses toits courbés et ses décors finement ouvragés. Ce sanctuaire paisible est dédié aux rois fondateurs légendaires de la nation vietnamienne.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Tempel der Hung-Könige',
       'Der 1926 nahe dem Haupteingang erbaute Tempel der Hung-Könige besticht durch traditionelle kaiserliche Architektur.',
       'Der Tempel der Hung-Könige befindet sich nahe dem Haupteingang des Gartens und wurde 1926 errichtet. Seine geschwungenen Ziegeldächer und filigranen Verzierungen spiegeln die ostasiatische kaiserliche Baukunst wider. Der Tempel dient als ehrwürdiger Ort des Gedenkens an die legendären Staatsgründer Vietnams.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Templo de los Reyes Hung',
       'El Templo de los Reyes Hung, erigido en 1926 junto a la entrada principal, luce una arquitectura imperial tradicional.',
       'Ubicado junto al acceso principal, el Templo de los Reyes Hung fue construido en 1926 siguiendo el estilo arquitectónico palaciego oriental, con tejados curvados e intrincados relieves. Representa un espacio solemne de homenaje a los monarcas fundadores de la civilización vietnamita.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Tempio dei Re Hung',
       'Il Tempio dei Re Hung, edificato nel 1926 vicino all''ingresso principale, presenta una suggestiva architettura imperiale.',
       'Situato nei pressi dell''ingresso principale, il Tempio dei Re Hung fu eretto nel 1926 in stile imperiale orientale, caratterizzato da tetti spioventi e decorazioni finemente intagliate. È un luogo di grande valore storico dedicato alla memoria dei leggendari fondatori della nazione.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Templo dos Reis Hung',
       'O Templo dos Reis Hung, construído em 1926 perto do portão principal, exibe arquitetura imperial tradicional vietnamita.',
       'Situado próximo à entrada principal do zoológico, o Templo dos Reis Hung foi erguido em 1926 com elementos clássicos da arquitetura oriental, incluindo telhados curvos e esculturas detalhadas. É um refúgio cultural sereno dedicado aos míticos fundadores da nação vietnamita.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Tempel van de Hung-koningen',
       'De Tempel van de Hung-koningen, gebouwd in 1926 nabij de hoofdingang, toont traditionele oosterse paleisarchitectuur.',
       'Vlak bij de hoofdingang staat de Tempel van de Hung-koningen uit 1926, gebouwd in klassieke keizerlijke stijl met sierlijk gebogen daken en steenreliëfs. Deze vredige herdenkingsplaats eert de mythische grondleggers van de Vietnamese natie.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Świątynia Królów Hung',
       'Świątynia Królów Hung wybudowana w 1926 roku przy bramie głównej wyróżnia się tradycyjną architekturą cesarską.',
       'Świątynia Królów Hung znajduje się w pobliżu głównego wejścia do ogrodu i powstała w 1926 roku. Charakteryzuje się wschodnią architekturą pałacową ze spadzistymi dachami i misternymi rzeźbieniami. To dostojne miejsce pamięci poświęcone legendarnym założycielom państwa wietnamskiego.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Chrám králů Hung',
       'Chrám králů Hung postavený roku 1926 u hlavní brány zaujme tradiční orientální architekturou císařského stylu.',
       'Chrám králů Hung stojí nedaleko hlavního vstupu do botanické zahrady a byl vybudován v roce 1926. Vyznačuje se tradičním stylem s typicky prohnutými střechami a detailními reliéfy. Slouží jako důstojné pietní místo připomínající bájné zakladatele vietnamského národa.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Hung Kralları Tapınağı',
       '1926 yılında ana kapının yanına inşa edilen Hung Kralları Tapınağı, geleneksel saray mimarisini yansıtır.',
       'Bahçenin ana girişine yakın bir konumda bulunan Hung Kralları Tapınağı, 1926 yılında geleneksel Doğu saray mimarisiyle inşa edilmiştir. Kıvrımlı kiremit çatıları ve zarif kabartmalarıyla dikkat çeker. Vietnam ulusunun temellerini atan efsanevi kralların anısına adanmış huzurlu bir mekandır.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Đền thờ Vua Hùng'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');

-- POI 18: Cây đa cổ thụ di sản
INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'zh-Hans', '古榕树遗产',
       '百年历史的遗产古榕树，树冠枝繁叶茂遮天蔽日，粗壮的气生根如立柱般深深扎入大地。',
       '这株古榕树在西贡动植物园扎根已逾百年，浓密的树冠为庭院洒下大片阴凉。巨大的气生根从高高的枝干垂入土壤，化作一根根粗壮挺拔的天然支柱，见证着古老植物园历久弥新的旺盛生命力。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'zh-Hans');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ko', '백년 유산 벵갈보리수',
       '100년 이상의 역사를 지닌 고목으로 넓은 그늘을 드리우며 지면으로 뻗은 거대한 기근 기둥이 인상적입니다.',
       '동식물원 안에 자리한 이 백년 유산 보리수나무는 넓은 가지를 펼쳐 시원한 녹음을 선사합니다. 가지에서 아래로 뻗어 내려 땅에 단단히 뿌리내린 굵은 공기뿌리 기둥들은 오랜 역사를 품은 식물원의 강인한 생명력을 증명합니다.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ko');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ja', '百年の遺産 ガジュマルの巨木',
       '樹齢100年を超える名木で、広大な木陰を作り出し、地面へと伸びる巨大な気根の柱が荘厳です。',
       'このガジュマルの古木は、サイゴン植物園で一世紀以上の歳月を重ねてきました。大きく広がった樹冠が心地よい木陰を提供します。枝から垂れ下がった無数の気根が地面に達して太い柱となり、悠久の時を刻む植物園の逞しい生命力を象徴しています。',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ja');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'ru', 'Вековой баньян-наследие',
       'Столетний баньян с пышной тенистой кроной и могучими столбовидными воздушными корнями, уходящими в землю.',
       'Этот вековой баньян украшает ботанический сад уже более сотни лет. Его раскидистая крона укрывает гостей прохладной тенью. Могучие воздушные корни спускаются с ветвей прямо в землю, образуя живые колонны, олицетворяющие несокрушимую жизненную силу природы.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'ru');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'fr', 'Banyan centenaire du patrimoine',
       'Ce banyan majestueux de plus d''un siècle déploie une vaste canopée ombragée soutenue par d''impressionnantes racines piliers.',
       'Ce splendide banyan centenaire prospère au cœur du jardin botanique depuis plus de cent ans. Sa ramure généreuse offre une ombre bienfaisante aux visiteurs. Ses puissantes racines aériennes retombent jusqu''au sol pour former de solides piliers végétaux, symboles de longévité et de force.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'fr');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'de', 'Historischer Banyan-Baum',
       'Ein über hundert Jahre alter Banyan-Baum mit ausladender Krone und mächtigen säulenartigen Luftwurzeln.',
       'Dieser ehrwürdige Banyan-Baum wächst seit über einem Jahrhundert im Botanischen Garten. Seine weite Krone spendet wohltuenden Schatten. Die imposanten Luftwurzeln senken sich von den Ästen herab in die Erde und bilden natürliche Säulen, die von der beständigen Lebenskraft des Gartens zeugen.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'de');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'es', 'Banián centenario patrimonial',
       'Banián centenario con una frondosa copa que brinda amplia sombra y majestuosas raíces aéreas ancladas al suelo.',
       'Este majestuoso árbol de banián ha crecido en el jardín botánico durante más de cien años. Su amplia copa ofrece un cobijo fresco frente al sol tropical. Sus enormes raíces aéreas caen desde las ramas hasta clavarse en la tierra como columnas vivientes, símbolo de resistencia centenaria.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'es');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'it', 'Banyan secolare del patrimonio',
       'Un maestoso banyan centenario dalla folta chioma ombrosa, sostenuta da caratteristiche e robuste radici aeree a pilastro.',
       'Questo magnifico banyan secolare vive nel giardino botanico da oltre un secolo. La sua ampia chioma regala una piacevole ombra ai visitatori. Le robuste radici aeree scendono dai rami fino a radicarsi nel terreno come solide colonne, a testimonianza della vitalità della natura.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'it');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pt-BR', 'Figueira-banyana centenária',
       'Árvore centenária com copa frondosa e raízes aéreas colunares imponentes firmemente fixadas ao solo.',
       'Esta imponente figueira-banyana floresce no jardim botânico há mais de cem anos. Sua copa generosa projeta sombras refrescantes sobre o pátio. Raízes aéreas monumentais descem dos galhos e fincam-se no chão como colunas vivas, testemunhando a resiliência vegetal ao longo das décadas.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pt-BR');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'nl', 'Eeuwenoude Banyanboom',
       'Een meer dan honderd jaar oude banyanboom met een weelderig bladerdak en indrukwekkende luchtwortelpilaren.',
       'Deze imposante banyanboom siert de botanische tuin al ruim een eeuw. Zijn uitgestrekte kruin biedt aangename schaduw. De dikke luchtwortels zakken vanuit de takken naar beneden en verankeren zich als natuurlijke pilaren in de aarde, als toonbeeld van tijdloze levenskracht.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'nl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'pl', 'Stuletni banian dziedzictwa',
       'Ponadstuletni banian o rozłożystej koronie dającej upragniony cień i potężnych korzeniach powietrznych wrastających w ziemię.',
       'Ten wiekowy banian rośnie w ogrodzie botanicznym od ponad stu lat. Jego szeroka korona rzuca orzeźwiający cień na dziedziniec. Imponujące korzenie powietrzne opadają z konarów i wrastają w ziemię, tworząc masywne kolumny będące symbolem niesłabnącej siły natury.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'pl');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'cs', 'Památný banyánovník',
       'Více než stoletý banyán s rozložitou korunou a mohutnými vzdušnými kořeny, které vytvářejí přírodní sloupy v zemi.',
       'Tento majestátní banyánovník roste v botanické zahradě již déle než jedno století. Jeho košatá koruna vytváří příjemný stín. Mohutné vzdušné kořeny splývají z větví přímo do země jako pevné dřevěné sloupy, které dokládají vytrvalou sílu zdejší flóry.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'cs');

INSERT INTO POI_TRANSLATIONS (poi_id, language_code, name, description, audio_script, source_version, status)
SELECT p.poi_id, 'tr', 'Yüzyıllık Miras Banyan Ağacı',
       'Yüzyılı aşkın geçmişe sahip ulu banyan ağacı, geniş gölgeli tacı ve yere kök salan heybetli hava kökleriyle dikkat çeker.',
       'Bu ulu banyan ağacı, yüz yılı aşkın süredir botanik bahçesinde yaşamını sürdürmektedir. Geniş yapraklı dalları ziyaretçilere serin bir gölge sunar. Dallarından aşağıya sarkarak toprağa kenetlenen güçlü hava kökleri, bahçenin zamana meydan okuyan canlılığının kanıtıdır.',
       1, 'READY'
FROM POIS p
WHERE p.name = 'Cây đa cổ thụ di sản'
  AND NOT EXISTS (SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt.poi_id = p.poi_id AND pt.language_code = 'tr');
