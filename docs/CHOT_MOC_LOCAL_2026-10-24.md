# Chốt mốc local 24/10/2026 — chờ duyệt tích hợp remote

## Đã kiểm chứng

10POI,15ngôn ngữ,150WAV; nguồn/giới hạn bản dịch và tọađộ được ghi rõ. Publicmap/giới thiệu không cần vé, script/audio cần token. ONLINE/MockGateway + CASH sáu số giữ nguyên. Map chuyển dự phòng một lần sang OSMFrance quaHTTPS khi nền OSMchính lỗi; đã xác nhận ảnh256px và marker/lộ trình trên trình duyệt. Có lộ trình tùy chỉnh client, điểm xuất phát, Haversine/nearest-neighbor, không API tuyến; có giả lập vị trí có nhãn. Có màn hình STAFF/ADMIN nhập bản dịch đã duyệt theoAPIcũ, giữbảnREADY và draftkhi409.

TọađộV1:3điểmOSMtheobản ghi nguồn đãlưu,7điểmmôphỏngtheosơđồ, đượcngườidùngchấpnhận. KhôngkhẳngđịnhchínhxácGPS/đườngđi/cá thểcây. Operatorvịtrídryrun/planHash,rowlock,transaction,audit,replayUNCHANGED,driftstop;không schema. BảnUUIDthửnhậpUPDATED→UNCHANGED,bảotoàntext/audio/job/payment/token.

## Bằng chứng ngoài repo

C:/Users/Admin/Documents/Codex/TCV_FINAL_REVIEW_20261024/
- backend-full-final.log: lint đạt,730/730,39suites,fail/cancel/skip=0;MySQL8.4+Valkey8Redis-compatible,bảnsaoLinuxsạch,ngoàiOneDrive.
- frontend-close-final-tests.log:120/120,fail/cancel/skip=0. frontend-close-build.log:TypeScript/Vitebuildđạt.
- http-final.json:185bướcthànhcông;15bundle/150WAV,ONLINE/CASHvàcác catừchối;đãkiểmnhãn3OSM/7môphỏng. Khônglưutoken/mậtkhẩu.
- image-close-final.log/image-close-check.log:imagetcv-final-staging:20261024buildđạt,nạpserverđược,manifest10POI,150WAV.
- locations-real-application.json,bảnđồchínhthức/bằngchứnghandoff,screenshotBAN_DO_VA_LO_TRINH.png.

Preview localhost:18085/explore;chỉdatabaseUUIDthửtcv_staging_test_fd7c8c9cadb24d3aa54df58a56c47f40. Chưa đổiAiven/stagingbằngphầnmớicủachatnày.

## Đối chiếu phạm vi

| AC/QT/NFR | Kết quả | Chứng minh/giới hạn |
|---|---|---|
| US-A01–04;UC01/02;QT01–05/13/14;NFR05–08 | Hồi quyđạt | Backend730,HTTP185;ONLINEvẫnmock,CASHsáusốtheongoạilệđãduyệt |
| US-B01/C01;UC03/04;QT06/07 | Đạtphạmviđãduyệt | Publicmapkhôngscript/audio,bundleđượcxácthực;quyếtđịnhxemtrướccầnđưavàoWordsaunày |
| US-B02;UC06;QT09 | Cócodevàtest | GPSmôphỏngcónhãn,trìnhduyệttựphát;chưanghiệmthuGPSthựcđịa |
| US-E01;UC07;QT10 | Cócode/test/browser | Thêm/bỏđiểm,khôngtrùng,điểmxuấtphát,sắpthứtựvàkhoảngcáchướctính;khôngphảiđườngđibộ |
| US-C02/C03;QT07/08;NFR09/10 | Kiểm kêkỹthuậtđạt | 150text/150WAV;API/UIbảndịchthủcông,bảo vệREADY;chưaràchấtlượngđộclậpbởingườibảnngữ |
| NFR12 | Chưađủbằngchứngnghiệmthutấtcảthiếtbị | Trìnhduyệtdesktop/in-appđãkiểm;chưaAndroid/iOSthậthoặcGPSthựcđịa |
| NFR13/14 | Localđạt | Lint/test/build;chưaCIcommitmớicủaphầnnày |
| NFR15/18 | Chưađưalênstaging | Cầnchốtremote,tíchhợp,CI,deployimage150rồiimport15/tọađộvàoAiven |
| UC08/15 | Ngoàiphạmvimốcnày | Thànhviênkhácphụtrách;khôngghihoànthành |

## Phát sinh GitHub và điều kiện trước push

origin/main đãcó1ea1eb6sau93cea93,thêmbackend/schema007GPSanalytics4bảngvàUIvậnhành. Ngườidùngchốtràriêng/chưatíchhợp. BáocáoC:/Users/Admin/Documents/Codex/TCV_FINAL_REVIEW_20261024/RA_SOAT_1ea1eb6_CHO_DUYET.md nêulỗihợpthứcmigrationstaging/guard16bảng,quyềnthốngkêSTAFFkhácWordADMIN,chỉsốvétrảphíbịbỏUI,GPSđịnhkỳcầnthayyêucầu. CIcủa1ea1eb6xanhkhôngthayCIcủabảnsửalocal. Chưamerge,chưachạymigration007,khôngpushđèremote.

Bướctiếp:ngườidùngduyệtphạmvịtíchhợp1ea1eb6→ghépgiữnguyêncácsửađãtest→kiểmthửphầngiáonhau→pushmộtlần→CIđúngcommit→deploy150image→import15ngônngữ→cậpnhậttọađộV1→replayUNCHANGEDvàsmokestaging. KhôngsửaWord,khôngđổiRAGtrongmốcnày. Giữ70audiocũ+80mới;workersinhfilemớitrênRenderFreevẫnchưabật(theobộdemocốđịnhđãchốt).
