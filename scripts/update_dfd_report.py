"""Synchronize report tables from the UC-traced data dictionary, not from layout."""
from pathlib import Path
import re,sys
from dfd_business_model import ACTORS,STORES,PARENTS,PROCESSES,EDGES,FAMILIES,parent,level_three
from generate_balanced_dfd_drawio import definitions,number,NAMES
from verify_lvl1_lvl2_balance import validate_business_sources
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'docs/DFD_Report_Section_3_4.md'
sys.stdout.reconfigure(encoding='utf-8')
OPS={
'P1_1':'Tạo hoặc dùng lại đúng phiên/payment chờ, giá do server xác định; trả thông tin khởi tạo trước khi đổi token.',
'P1_2':'Xác minh chữ ký, mã giao dịch và số tiền; cập nhật payment và kích hoạt đúng phiên nguyên tử; chống thông báo lặp.',
'P1_3':'Tra cứu đúng phiên, kiểm tra quyền và tiền đã nhận; xác nhận PAID/ACTIVE cùng audit, sau đó cấp mã ngắn Redis.',
'P1_4':'Kiểm tra mã/phiên/TTL/hạn mức; chỉ PAID còn hạn mới đổi một lần. Giữ mã khi giao dịch còn PENDING.',
'P1_5':'Could Have: đối chiếu giao dịch, giữ hạn vé, thu hồi token cũ và tăng bộ đếm đúng một lần; bàn giao mã nhận vé 6 số.',
'P2_1':'Kiểm tra phiên trả phí còn hạn và ngôn ngữ đang hoạt động.',
'P2_2':'Đọc nội dung hiện hành, fallback có nhãn, cấp bundle chứa URL media và ghi lượt cấp thành công; không ghép byte audio.',
'P2_3':'Hiển thị từ bundle; tính khoảng cách và nhận diện vùng kích hoạt bằng GPS/giả lập tại trình duyệt; không gửi GPS định kỳ.',
'P2_4':'Tải tệp qua URL, phát/dừng/tua; tự phát cần tương tác mở khóa, chọn điểm hợp lệ và chống lặp sau khi phát thành công.',
'P2_5':'Giữ thứ tự tour mẫu; với tour tùy chỉnh dùng nearest-neighbor/Haversine tại client. Không ghi tour riêng vào database.',
'P3_1':'Kiểm tra phiên, đầu vào và hạn mức Redis theo phiên/IP; từ chối sai quyền/phạm vi trước khi xử lý phù hợp.',
'P3_2':'Gọi dịch vụ embedding cho câu hỏi và kiểm tra vector tương thích; chưa gọi LLM ở bước này.',
'P3_3':'So sánh vector với các đoạn của tài liệu ACTIVE, đúng content_version/source_version và mô hình tương thích.',
'P3_4':'Ghép câu hỏi với ngữ cảnh, gọi LLM, kiểm tra nguồn và ghi SUCCESS/NO_CONTEXT/FAILED trước khi trả kết quả.',
'P4_1':'Kiểm tra quyền; đọc/sửa/ngừng POI, xem lỗi hoặc thử lại FAILED hiện hành. Lưu nguồn/audit và tạo tác vụ khi đầu vào liên quan đổi.',
'P4_2':'Nhận tác vụ từ CONTENT_JOBS, kiểm tra phiên bản; tái sử dụng hoặc dịch, TTS, kiểm tra/lưu WAV và công bố kết quả hiện hành.',
'P4_3':'Đọc tour hiện có và POI ACTIVE, kiểm tra thứ tự/điểm trùng; lưu TOURS/TOUR_POIS cùng audit. Không thêm xóa/duyệt tour.',
'P4_4':'Lưu nguồn/phiên bản và audit ở pha 1; chia đoạn, tạo embedding ngoài transaction; kiểm tra lại phiên bản và lưu chỉ mục ở pha 2.',
'P5_1':'Kiểm tra mật khẩu/trạng thái, cập nhật khóa tạm; lưu phiên mới hoặc xoay refresh của phiên hiện tại cho STAFF/ADMIN.',
'P5_2':'Thu hồi đúng session_id hiện tại, sau thành công xóa dữ liệu trình duyệt; không thu hồi toàn bộ phiên cùng tài khoản.',
'P5_3':'Chỉ ADMIN: kiểm tra email trùng, băm mật khẩu, gán STAFF/ACTIVE và lưu tài khoản cùng audit; giữ nguyên phiên ADMIN.',
'P5_4':'Chỉ ADMIN: đọc, lọc và phân trang audit, liên kết người thực hiện nếu còn; không sửa/xóa nhật ký.',
'P5_5':'Chỉ ADMIN: tổng hợp các bảng nghiệp vụ, kiểm tra readiness và độ mới. Lỗi nguồn không được suy ra 0; không theo dõi GPS.',
'P4_2_1':'Đọc tác vụ/ngôn ngữ/phiên bản, nhận quyền xử lý nguyên tử hoặc từ chối nguồn cũ; ghi trạng thái nhận việc.',
'P4_2_2':'Dùng nguồn Việt hoặc tái sử dụng bản dịch hợp lệ; khi cần gọi dịch, kiểm tra và lưu bản dịch đúng phiên bản.',
'P4_2_3':'Tái sử dụng audio còn hợp lệ hoặc gửi kịch bản đã chuẩn bị đến TTS; kiểm tra WAV và lưu byte tệp vào M1.',
'P4_2_4':'Kiểm tra lại phiên bản/quyền xử lý; lưu metadata audio và kết quả COMPLETED/FAILED, không ghi đè nguồn mới.',
'P3_4_1':'Ghép câu hỏi/ngôn ngữ từ 3.2 và tập đoạn từ 3.3 thành prompt có mã nguồn.',
'P3_4_2':'Gửi prompt đến LLM và nhận phản hồi hoặc dữ liệu lỗi có thời hạn.',
'P3_4_3':'Kiểm tra căn cứ, mã trích dẫn và liên kết; xác định SUCCESS/NO_CONTEXT/FAILED.',
'P3_4_4':'Ghi CHAT_LOGS không chứa secret/raw token; trả câu trả lời có nguồn hoặc thông báo phù hợp.'}

def table(rows):return '\n'.join('| '+' | '.join(row)+' |' for row in [rows[0],[':---']*len(rows[0]),*rows[1:]])
def replace_table(text,n,rows):
 text,count=re.subn(rf'(\*Bảng 3\.{n}:.*?\*\n\n)(?:\|[^\n]*\n?)+',lambda m:m[1]+table(rows)+'\n',text)
 assert count==1,(n,count)
 return text

def name(pid):return ACTORS.get(pid,pid if pid in STORES else number(pid))
def process_rows(index):
 nodes,flows,_,_=definitions(index);l1=index==1
 rows=[['Số hiệu','Tên tiến trình và UC','Luồng dữ liệu đầu vào','Kho dữ liệu đọc/ghi' if l1 else 'Xử lý nghiệp vụ','Luồng dữ liệu đầu ra']]
 for pid,label in nodes.items():
  ins=[];outs=[];storage=[];ucs=set()
  for e in flows:
   src,dst=e['source'],e['target']
   if pid not in (src,dst):continue
   ucs.update(e['ucs'])
   if dst==pid:
    if l1 and src in STORES:storage.append('Đọc '+src)
    else:ins.append(name(src)+' → '+e['label'])
   else:
    if l1 and dst in STORES:storage.append('Ghi '+dst)
    else:outs.append(e['label']+' → '+name(dst))
  rows.append([number(pid),label+' ('+', '.join(sorted(ucs))+')','; '.join(ins),'; '.join(storage) if l1 else OPS[pid],'; '.join(outs)])
 return rows

def main():
 validate_business_sources();text=REPORT.read_text(encoding='utf-8')
 _,flows,_,_=definitions(0)
 rows=[['Mã họ luồng','Hướng truyền dữ liệu','Tên luồng dữ liệu','Thành phần nghiệp vụ']]
 lookup={e['id']:e for e in EDGES}
 for e in flows:
  rows.append([e['family'],name(e['source'])+' → '+('Hệ thống (0)' if e['target']=='P0' else name(e['target'])),e['label'],'; '.join(dict.fromkeys(lookup[k]['label'] for k in e['components']))])
 for row in rows[1:]:row[1]=row[1].replace('0 →','Hệ thống (0) →')
 text=replace_table(text,19,rows)
 rows=[['Mã kho','Tên kho logic','Lưu trữ vật lý','Phạm vi sử dụng']]
 for sid,(label,tables) in STORES.items():rows.append([sid,label,', '.join(tables) if tables else 'Redis có TTL' if sid=='R1' else 'Kho tệp media','Dữ liệu nghiệp vụ Chương 4' if tables else 'Mã tạm và hạn mức; tách khỏi MySQL' if sid=='R1' else 'Byte tệp; metadata nằm ở AUDIOS/POI'])
 text=replace_table(text,20,rows)
 text=replace_table(text,21,process_rows(1))
 for n,index in zip(range(22,29),range(2,9)):text=replace_table(text,n,process_rows(index))
 paragraphs={
 'Phần này mô tả':'Phần này phân tích các luồng theo UC-01–UC-18 và QT-01–QT-14 của báo cáo Thảo Cầm Viên Sài Gòn. Ranh giới gồm web khách, giao diện nội bộ, backend, MySQL, Redis và media; GPS, phát audio và tour tùy chỉnh nằm trong xử lý tại client. Sáu tác nhân ngoài trao đổi với năm nhóm chức năng; 13 kho logic ánh xạ đúng 16 bảng, tách riêng Redis và tệp media.',
 'Sơ đồ mức 0 biểu diễn':'Sơ đồ mức 0 biểu diễn một tiến trình hệ thống và sáu tác nhân ngoài. Các họ F01–F28 bao gồm dữ liệu xác thực/đăng xuất của STAFF và ADMIN, quyền ADMIN kế thừa STAFF, thanh toán, nội dung, embedding câu hỏi/tài liệu và phản hồi LLM. Bảng thành phần cho phép gộp/tách luồng khi phân rã mà không mất dữ liệu.',
 'Sơ đồ mức 1 phân rã':'Sơ đồ mức 1 gồm 1.0 thanh toán/quyền khách, 2.0 khai thác nội dung, 3.0 RAG, 4.0 quản trị nội dung và 5.0 tài khoản/giám sát. Từng nhóm truy vết use case tương ứng; yêu cầu tour, tài liệu, audit và monitoring đi vào đúng chức năng, không đi qua tiến trình đăng nhập hay cập nhật POI để điều phối.',
 'Ở mức phân tích logic':'Các kho D1–D13 có ánh xạ vật lý trong Bảng 3.20; R1 là dữ liệu tạm Redis và M1 là tệp media. AUDIT_LOGS, CHAT_LOGS và BUNDLE_ACCESS_LOGS được phân biệt; monitoring đọc các bảng nghiệp vụ phù hợp. Không đưa ANALYTICS_* hoặc thu thập GPS định kỳ vào mô hình báo cáo. UC-12 vẫn là phần Could Have, bàn giao bằng mã nhận vé 6 số; các giá trị triển khai được ghi theo cấu hình.',
 'Tiến trình 1.0 được':'Tiến trình 1.0 phân rã thành năm tiến trình 1.1–1.5 theo UC-01, UC-02, UC-11 và UC-12 (Could Have). Thông tin khởi tạo trả trước khi đổi token; webhook hợp lệ và xác nhận tiền mặt kích hoạt đúng phiên chờ. Cấp lại giữ hạn vé và bàn giao mã 6 số để khách tự đổi token.',
 'Tiến trình 2.0 được':'Tiến trình 2.0 phân rã thành năm tiến trình 2.1–2.5 theo UC-03–UC-07. Bundle chứa dữ liệu và URL media; tải/phát WAV là luồng riêng. GPS, chống lặp audio và sắp tour tùy chỉnh dùng dữ liệu tại client; không có luồng ghi vị trí hay tour cá nhân vào database.',
 'Tiến trình 3.0 được':'Tiến trình 3.0 phân rã thành bốn tiến trình 3.1–3.4 theo UC-08: kiểm tra phiên/câu hỏi/hạn mức, tạo embedding câu hỏi, truy hồi nguồn ACTIVE đúng phiên bản, rồi gọi LLM và ghi CHAT_LOGS. Cặp trao đổi embedding trước truy hồi tách khỏi cặp trao đổi sinh câu trả lời sau truy hồi.',
 'Tiến trình 4.0 được':'Tiến trình 4.0 gồm 4.1 POI/nguồn/trạng thái, 4.2 pipeline, 4.3 tour mẫu và 4.4 kho kiến thức theo UC-13–UC-15. STAFF và ADMIN thao tác trực tiếp với đúng chức năng. Tác vụ nền đọc CONTENT_JOBS; bản dịch, metadata audio, tệp và trạng thái tác vụ có kho/luồng riêng.',
 'Tiến trình 5.0 được':'Tiến trình 5.0 gồm năm tiến trình 5.1–5.5 theo UC-09, UC-10 và UC-16–UC-18. STAFF/ADMIN đăng nhập và đăng xuất; chỉ ADMIN tạo STAFF, đọc audit và monitoring. Phiên nội bộ được lưu/thu hồi tại REFRESH_TOKENS; monitoring tổng hợp từ các bảng nghiệp vụ thay vì kho thống kê giả định.',
 'Tiến trình 4.2 phân rã':'Tiến trình 4.2 phân rã thành bốn bước: nhận tác vụ và kiểm tra phiên bản, chuẩn bị/dịch văn bản, tái sử dụng hoặc tổng hợp WAV, công bố metadata/kết quả. Kết quả dịch phải có trước yêu cầu TTS; tiếng Việt dùng nguồn gốc. Claim, bản dịch, byte tệp, metadata và trạng thái hoàn tất/lỗi được lưu đúng kho; kết quả cũ không ghi đè phiên bản mới.',
 'Tiến trình 3.4 phân rã':'Tiến trình 3.4 nhận câu hỏi/ngôn ngữ từ 3.2 và ngữ cảnh từ 3.3, phân rã thành đóng gói prompt, gọi LLM, kiểm tra căn cứ/trích dẫn, ghi nhật ký và trả kết quả. Embedding câu hỏi đã được tạo ở 3.2 trước truy hồi; nhật ký lưu SUCCESS/NO_CONTEXT/FAILED tại D12.'}
 lines=text.splitlines()
 for i,line in enumerate(lines):
  for prefix,value in paragraphs.items():
   if line.startswith(prefix):lines[i]=value;break
 REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
 print('Updated 10 report tables and business narratives from the UC-traced dictionary.')
if __name__=='__main__':main()
