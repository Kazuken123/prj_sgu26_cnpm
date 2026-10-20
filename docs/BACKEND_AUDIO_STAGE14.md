# Mốc 14 — Audio mock, lưu file riêng và API tải có xác thực

## Nguồn và quyết định

Đã đọc lại Word 8 trước code: US-C02 AC1–AC4, US-C03 AC1–AC3 để phân biệt fallback/on-demand, quyền khách US-A04 AC1–AC3; QT-07/08/12; NFR-02/06/08/09/10/11/13; UC-13 toàn bộ, giả định 1.6.2 và phụ thuộc kho media, thiết kế ba lớp/adapter, schema/ràng buộc POI_TRANSLATIONS/AUDIOS/CONTENT_JOBS.

Người dùng đã chốt **lưu local/volume riêng ngoài public, API tải kiểm tra phiên khách**. File của lượt bị từ chối trước công bố được dọn khi biết chắc chưa lưu tham chiếu; nếu SQL chưa rõ kết quả thì giữ file để đối soát. Không tự chọn public URL hoặc kho cloud khác.

Mốc văn bản `e52180a` đã commit/push theo yêu cầu và CI completed/success trước khi code mốc này: https://github.com/Kazuken123/prj_sgu26_cnpm/actions/runs/39385088056 . Mốc 14 hiện **chưa commit/push**, chưa có CI của code mới.

## Phạm vi thực sự đã có

PipelineService có `prepareAudio(jobId, claimId)` và `runJob(jobId)`. runJob nhận một job → chuẩn bị/reuse văn bản → tạo/reuse file → lưu audio AVAILABLE và job COMPLETED cùng audit. Không giữ transaction SQL trong khi gọi TTS hoặc filesystem.

Đây là **luồng kỹ thuật qua Service đã có kiểm thử SQL, filesystem và HTTP**, chưa có tiến trình quét hàng đợi tự chạy khi nhân viên lưu POI. Không expose API sinh audio cho khách (Could Have), không thêm CLI chạy mock trên database nghiệp vụ. Chưa TTS thật, giọng đọc đa ngôn ngữ, worker phục hồi hoặc bundle/frontend.

MockTtsAdapter sinh **âm báo WAV dài một giây**, không đọc kịch bản và không chứng minh chất lượng thuyết minh. MockTranslation vẫn chỉ thêm nhãn vào nguồn. COMPLETED của test mock chỉ chứng minh trạng thái kỹ thuật; không coi đã đủ nội dung nghiệm thu. Adapter mock phải được truyền tường minh, không tự bật qua Service/Router.

## Tạo và công bố audio

1. Khóa POI → job, kiểm PROCESSING/claim_id/source_version; target text phải READY và đúng phiên bản, đủ tên/mô tả/kịch bản.
2. Nếu audio hiện hành AVAILABLE và đúng phiên bản, kiểm file trên đĩa và metadata trước khi tái sử dụng. Thiếu/hỏng file thì không coi là tái sử dụng được. Tiếng Việt dùng kịch bản nguồn, không gọi dịch.
3. Gọi TTS qua adapter ngoài transaction; đầu vào chỉ kịch bản hệ thống, ngôn ngữ và AbortSignal. Timeout cấu hình `audioTimeoutMs` qua constructor, mặc định kỹ thuật 10000 ms, miền 1–120000 ms; không phải số báo cáo chốt. Không tự retry provider. Hết hạn có abort; provider phớt lờ hủy cũng không được ghi kết quả về muộn.
4. Hợp đồng adapter ban đầu là WAV PCM 16-bit, mono, 16 kHz với header chuẩn 44 byte; kiểm header, kích thước, byte rate và data length. Giới hạn kỹ thuật **10 MiB/file**. Nhà cung cấp trả MP3/định dạng khác phải được adapter chuyển đổi sau này; hiện không tuyên bố hỗ trợ. duration là số giây làm tròn lên để khớp cột INT, file_size tính từ bytes thực.
5. Sinh tên UUID riêng cho mỗi file ứng viên, ghi độc quyền (`wx`, không overwrite), sync và đóng file trong adapter local. Tên không lấy từ POI/kịch bản hoặc đường dẫn provider. API URL tương ứng là `/api/media/audio/<uuid>.wav`; không lưu đường dẫn vật lý vào database.
6. Mở transaction mới, kiểm lại claim/phiên bản và kịch bản. Upsert audio trên translation_id duy nhất, cập nhật job COMPLETED/xóa claim_id và ghi COMPLETE_CONTENT_JOB cùng transaction. Chỉ COMPLETED khi text và file đã sẵn sàng; audit provider=MOCK/ADAPTER hoặc REUSED.

Hai worker nhận cùng job chỉ một lượt được gọi TTS. Hai lần chuẩn bị audio đồng thời dùng cùng claim có thể tạo ứng viên riêng, nhưng chỉ một lượt hoàn tất; lượt bị từ chối dọn đúng file riêng của nó. Không xóa file của lượt thắng.

## Lỗi, filesystem và đối soát

Mã an toàn mới: CONTENT_TRANSLATION_NOT_READY, TTS_TIMEOUT, TTS_PROVIDER_FAILED, TTS_RESULT_INVALID, MEDIA_STORAGE_FAILED. API trạng thái chỉ trả mã/thông báo đã duyệt, không raw lỗi/đường dẫn/secret.

Lỗi TTS hoặc lưu file chuyển job FAILED, xóa claim và lưu audio FAILED cùng audit; text READY được giữ để retry tái sử dụng. Nguồn đã đổi thì chỉ kết thúc job cũ FAILED/CONTENT_SOURCE_OUTDATED, không cập nhật audio của nguồn mới. Claim đã mất thì không được ghi thất bại vào lượt mới.

SQL và filesystem **không có transaction chung**:

- Lỗi/timeout trước bước công bố: không có tham chiếu SQL; dọn file ứng viên của chính lượt. Adapter local hủy/ghi lỗi dọn file đã mở của chính nó; không xóa file có sẵn khi bị EEXIST.
- Nguồn đổi hoặc claim mất khi kiểm lại: không công bố ứng viên và dọn file riêng. Lưu file hoàn thành muộn sau timeout cũng có cleanup, không mở lại job.
- Lỗi giai đoạn lưu SQL, kể cả audit/metadata, trả CONTENT_AUDIO_UNAVAILABLE và **giữ ứng viên một cách bảo thủ** vì Service không có bằng chứng chắc chắn commit đã xảy ra hay chưa. Có thể còn file dư sau rollback; chưa có bộ dọn file định kỳ.
- Mất phản hồi commit sau thành công: SQL vẫn COMPLETED/AVAILABLE, file được giữ nguyên và tải được; claim cũ không hoàn tất lần hai. Cần đọc trạng thái để đối soát, không tự xóa file vì HTTP/driver báo lỗi.
- File cũ sau thay thế cũng chưa tự xóa; không dọn volume hoặc xóa đệ quy thư mục media để xử lý file dư. Công cụ đối soát/GC, dung lượng và backup là phần cần làm tiếp.

## Lưu trữ và cấu hình

LocalMediaStorage yêu cầu MEDIA_ROOT là thư mục tuyệt đối riêng; không có mặc định tự ghi vào repo. Kiểm canonical path và từ chối root filesystem hoặc nằm trong frontend; chỉ nhận tên UUID.wav, từ chối traversal/absolute key, file không thường và symlink khi đọc. Giới hạn kích thước được kiểm ở cả đầu ghi và đọc. Quyền tệp/thư mục là 0600/0700 theo khả năng OS; chưa kiểm chứng ACL Windows hoặc volume trên staging.

Node trực tiếp: cấu hình MEDIA_ROOT trong backend/.env, dùng đường dẫn riêng ngoài frontend/public và nên ngoài checkout Git. Không commit media thật hoặc .env. Chưa tạo thư mục media nghiệp vụ hoặc sửa .env thật trong phiên này.

Compose: MEDIA_ROOT=/var/lib/tcv/media, named volume media_data gắn vào đường dẫn đó. Cấu hình nhằm giữ file qua rebuild/recreate container; **chưa chạy Docker để chứng minh persistence thực tế**. Test filesystem xác nhận bytes vẫn đọc được qua một instance adapter mới. Không chạy docker down -v hoặc xóa volume; cần backup riêng. Migration vẫn đến 005 của mốc trước, không có migration mới.

## API tải có xác thực

`GET /api/media/audio/:key`, Authorization Bearer token khách. Router dùng middleware khách sẵn có, nên mỗi request kiểm SQL hash token, payment PAID, visit ACTIVE/còn hạn; JWT STAFF/ADMIN không thay token khách. MediaService gọi ContentStore và adapter; Router không SQL/Redis/filesystem.

ContentStore chỉ cho audio AVAILABLE, text READY, các phiên bản khớp POI hiện hành, POI ACTIVE và ngôn ngữ đang bật. Không tự fallback ngôn ngữ hoặc phát file ngoài SQL. UUID tồn tại trên đĩa nhưng chưa công bố không được tải qua endpoint. File không qua /demo hoặc static public.

200 trả bytes audio/wav, Cache-Control=no-store, X-Content-Type-Options=nosniff và tên tải an toàn. 401 với token thiếu/sai/hết hạn/thu hồi/chưa trả tiền/nội bộ; key sai 400, không có audio phù hợp 404, lỗi SQL/file/metadata 503. Không nhận token qua query string. Hạn chế quyền có hiệu lực ở request kế tiếp, không thu hồi bytes khách đã tải.

Phiên bản này tải toàn bộ file có giới hạn vào bộ nhớ; chưa hỗ trợ HTTP Range/streaming tối ưu. Frontend tương lai cần fetch với Authorization rồi dùng Blob URL cho audio, thay vì đưa token vào URL. Chưa thử sự kiện playing, mở khóa autoplay, Chrome Android/Safari iOS, mạng yếu hoặc tải đồng thời lớn; không công nhận NFR-02/12 đã đạt.

## Đối chiếu AC / QT / NFR

| AC / QT / NFR | Đã đáp ứng chưa | Test nào chứng minh | Ghi chú |
| --- | --- | --- | --- |
| US-C02 AC1, điều phối job nền | Có runJob qua Service, local đạt | POI -> text -> actual WAV -> AVAILABLE/COMPLETED | Chưa tiến trình quét hàng đợi tự chạy. |
| US-C02 AC2; QT-07; NFR-10 | Chưa đủ nội dung thật | Vietnamese audio uses original script; mock WAV header/duration | Âm báo mock, không phải TTS/giọng đọc hoặc bản dịch thật. |
| US-C02 AC3; UC-13 E4, lỗi/retry | Local đạt phần audio | TTS error/timeout/invalid; storage failure; staff retry reuses text | Phục hồi PROCESSING bị gián đoạn chưa code. |
| US-C02 AC4; QT-08 | Local đạt chống trùng/tái sử dụng/phiên bản | 20 workers one asset; same-claim competition; valid reuse; missing/corrupt repair; old claim/source edit | Một row audio hiện hành, file cũ/dư chưa GC. |
| US-A04 AC1/AC2; NFR-06, phần API | Local đạt tải bằng token hợp lệ và từ chối trạng thái sai | CASH -> visitor token -> HTTP bytes; revoked/expired/unpaid/internal rejected | Frontend và dữ liệu đã tải không bị thu hồi. |
| QT-12; NFR-08 | Local đạt audit, lỗi an toàn và đường dẫn giới hạn | traversal/absolute keys; private root; safe storage error; metadata filtering; authenticated HTTP | Không tuyên bố audit toàn bộ bảo mật hoặc filesystem không thể bị quản trị OS can thiệp. |
| NFR-09, nguồn/lượt cũ và retry | Local đạt | source edit after save; old claim result; late storage completion | Recovery trong fixture chỉ mô phỏng việc reset an toàn, chưa phải chức năng phục hồi. |
| NFR-11, TTS/media | Local đạt lỗi/timeout hữu hạn bằng mock | mock TTS timeout; storage late completion cleanup; SQL rollback/uncertain ack | Chưa nhà cung cấp thật; file dư cần đối soát riêng. |
| NFR-13 | Local đạt phân lớp/cú pháp | check.js 96 file; mock và Store/adapter thay thế | Thao tác file ở adapter, SQL ở Store. |
| NFR-02/12, phát trên thiết bị | Chưa kiểm chứng | Chỉ kiểm bytes/WAV/HTTP, không test sự kiện playing | Không dùng test tone/server làm bằng chứng GPS/audio trình duyệt thật. |
| US-C03, fallback/on-demand | Ngoài phạm vi | Không thêm endpoint tạo audio hoặc fallback cho khách | On-demand Could Have chưa được yêu cầu. |

## Kiểm chứng và giới hạn Git

**350 test local đạt, 0 lỗi; kiểm tra cú pháp/phân lớp 96 file JavaScript đạt.** Mốc này thêm 25 test: 5 filesystem/WAV, 5 Service và 15 SQL/filesystem/HTTP tích hợp. Kiểm thử toàn bộ auth/POI/job/CASH/ONLINE/văn bản cũ vẫn chạy hồi quy.

SQL local **MariaDB 10.4.32**, media là file thật trong thư mục tạm riêng, payment code trong test media dùng Redis thay thế. RUN_DB_TESTS=1, RUN_REDIS_TESTS=0; 15 ca Redis thật riêng chưa bật local; skipped=0 không chứng minh các suite tắt đã chạy. Không nâng cấp database nghiệp vụ hoặc chạy dịch vụ TTS thật.

Log: `C:\Users\Admin\AppData\Local\Temp\tcv-audio-full-b196a9385aaa4637bcd14b9df4c13596\all-tests.log`.

Mốc này chưa commit/push; chưa xác minh MySQL 8/Redis thật/CI mới cho thay đổi audio. e52180a đã push/CI xanh chỉ là mốc văn bản trước đó. Chờ người dùng yêu cầu commit/push, CI xanh trước mốc nghiệp vụ kế tiếp.

## Báo cáo cần cập nhật sau khi duyệt

- 1.6.2/phụ thuộc kho media: ghi lựa chọn local/volume riêng và tải qua API có xác thực; persistence Docker/staging chưa kiểm chứng.
- 4.2–4.3: TTS Adapter, LocalMediaStorage, MediaService/Router; provider ngoài transaction, kiểm claim/phiên bản trước công bố; không có transaction chung SQL–file.
- 4.4.4 AUDIOS: không thêm cột, làm rõ file_url là API path được bảo vệ, duration giây làm tròn lên, file_size theo bytes; AVAILABLE sau file thành công. CONTENT_JOBS hoàn tất xóa claim, FAILED/retry giữ đúng phiên bản. ERD không có thay đổi schema mới.
- UC-13 bước 7/8/E4: text READY chưa đủ; audio/job/audit chốt cùng nhau; timeout, file dư, commit chưa rõ và worker cũ được xử lý như trên. Worker tự chạy/phục hồi vẫn chưa làm.
- Kiểm thử/hiện trạng: phân biệt code có mock và nội dung thật; không ghi đã hoàn tất đa ngôn ngữ, phát trên điện thoại hoặc triển khai thực tế chỉ vì 350 test đạt.

Nguồn và độ tin cậy: Word 8 đọc lại, lựa chọn media của người dùng và code/350 test local; mock không phải chất lượng thuyết minh thật, giới hạn CI/triển khai/frontend/worker/GC được nêu rõ.
