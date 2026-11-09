"""Synchronize report tables from the UC-traced data dictionary, not from layout."""
from pathlib import Path
import re,sys
from dfd_business_model import ACTORS,STORES,PARENTS,PROCESSES,EDGES,FAMILIES,parent,level_three
from generate_balanced_dfd_drawio import definitions,number,NAMES
from verify_lvl1_lvl2_balance import validate_business_sources
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'docs/DFD_Report_Section_3_4.md'
sys.stdout.reconfigure(encoding='utf-8')
OPS={'P1_1': 'Giá do server xác định; tạo hoặc dùng lại phiên ONLINE/PENDING, payment_ref và mã đổi quyền có '
         'TTL. Trả URL hợp lệ.',
 'P1_2': 'Xác minh chữ ký, mã và số tiền; cập nhật PAID/ACTIVE cùng giao dịch, chống webhook lặp; redirect '
         'không cấp quyền.',
 'P1_3': 'Chỉ đổi mã một lần khi payment PAID và vé còn hạn; kiểm soát TTL, hạn mức và đồng thời; giữ mã khi '
         'còn PENDING.',
 'P3_1': 'Kiểm tra phiên trả phí còn hạn và ngôn ngữ đang hoạt động; từ chối lỗi trước khi tải bundle.',
 'P3_2': 'Đọc POI/văn bản/audio/tour hiện hành, cấp bundle chứa URL và ghi BUNDLE_ACCESS_LOGS khi thành '
         'công.',
 'P3_3': 'Hiển thị bản đồ, lọc phân khu, xử lý GPS/giả lập và khoảng cách tại client; không gửi GPS định kỳ.',
 'P3_4': 'Hiển thị đúng POI được chọn; fallback văn bản Anh rồi Việt có nhãn; cung cấp URL audio cho UC-05.',
 'P8_1': 'Kiểm tra phiên, câu hỏi và hạn mức Redis theo phiên/IP; từ chối phạm vi với NO_CONTEXT trước khi '
         'gọi AI.',
 'P8_2': 'Tạo embedding câu hỏi và kiểm tra mô hình/vector tương thích; chưa gọi LLM ở bước này.',
 'P8_3': 'Truy hồi các đoạn của tài liệu ACTIVE, đúng source_version/content_version và mô hình embedding.',
 'P8_4': 'Ghép ngữ cảnh, gọi LLM, kiểm tra nguồn; ghi SUCCESS/NO_CONTEXT/FAILED và trả kết quả.',
 'P13_1': 'Kiểm tra quyền; lưu/ngừng POI, nguồn và audit; ghi tác vụ khi nội dung liên quan đổi; chỉ thử lại '
          'FAILED hiện hành.',
 'P13_2': 'Nhận tác vụ từ CONTENT_JOBS; kiểm tra phiên bản; tái sử dụng/dịch, TTS, lưu WAV và metadata đúng '
          'phiên bản.',
 'P18_1': 'Kiểm tra phiên, quyền ADMIN và khoảng thời gian ở mỗi request; không trả thống kê nếu mất quyền.',
 'P18_2': 'Đọc liveness/readiness và các bảng nghiệp vụ; tổng hợp đúng khoảng thời gian, giữ riêng lỗi từng '
          'nguồn.',
 'P18_3': 'Hiển thị chỉ số, đơn vị, khoảng thời gian và độ mới; polling khi trang còn mở, dừng khi rời '
          'trang; không suy lỗi thành 0.',
 'P13_2_1': 'Đọc tác vụ/ngôn ngữ/phiên bản; claim nguyên tử hoặc từ chối nguồn cũ.',
 'P13_2_2': 'Dùng nguồn Việt hoặc tái sử dụng bản dịch hợp lệ; nếu cần gọi dịch, kiểm tra và lưu bản dịch '
            'đúng phiên bản.',
 'P13_2_3': 'Tái sử dụng audio hợp lệ hoặc gửi kịch bản đến TTS; kiểm tra WAV, lưu byte tệp vào M1.',
 'P13_2_4': 'Kiểm tra lại phiên bản/quyền xử lý; công bố metadata và COMPLETED/FAILED, không ghi đè nguồn '
            'mới.',
 'P8_4_1': 'Ghép câu hỏi/ngôn ngữ từ 8.2 với đoạn kiến thức từ 8.3 thành prompt có mã nguồn.',
 'P8_4_2': 'Gửi prompt đến LLM và nhận phản hồi hoặc dữ liệu lỗi có thời hạn.',
 'P8_4_3': 'Kiểm tra căn cứ, mã trích dẫn và liên kết; xác định SUCCESS/NO_CONTEXT/FAILED.',
 'P8_4_4': 'Ghi CHAT_LOGS không chứa secret/raw token và trả câu trả lời có nguồn hoặc thông báo phù hợp.'}

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
  uc_label=[f'UC-{int(pid[1:]):02}'] if l1 else [f'UC-{n:02}' for n in PROCESSES.get(pid,('',[13 if index==7 else 8]))[1]]
  rows.append([number(pid),label+' ('+', '.join(uc_label)+')','; '.join(ins),'; '.join(storage) if l1 else OPS[pid],'; '.join(outs)])
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
 paragraphs={'Phần này phân tích': 'Phần này phân tích các luồng theo UC-01–UC-18 và QT-01–QT-14 của báo cáo Thảo Cầm '
                        'Viên Sài Gòn. Ranh giới gồm web khách, giao diện nội bộ, backend, MySQL, Redis và '
                        'media; GPS, phát audio và tour tùy chỉnh nằm tại client. Mức 1 có đúng 18 chức năng '
                        'tương ứng 18 Use Case. Có 13 kho SQL logic ánh xạ 16 bảng, tách Redis và tệp media.',
  'Sơ đồ mức 1 gồm': 'Sơ đồ mức 1 có 18 tiến trình đánh số 1.0–18.0, tương ứng lần lượt UC-01–UC-18 và giữ '
                     'nguyên tên chức năng trong đặc tả. Thanh toán online, tiền mặt, lựa chọn ngôn ngữ, nghe '
                     'thủ công, nghe tự động và từng chức năng nội bộ đều là các tiến trình riêng. Các tiến '
                     'trình trao đổi dữ liệu trực tiếp theo nghiệp vụ, không dùng đăng nhập hoặc quản lý POI '
                     'để điều phối yêu cầu khác.',
  'DFD mức 2 phân rã': 'Mức 2 trình bày chi tiết năm chức năng có xử lý nhiều bước: 1.0 (UC-01), 3.0 (UC-03), '
                       '8.0 (UC-08), 13.0 (UC-13) và 18.0 (UC-18). Mỗi sơ đồ chỉ phân rã đúng một tiến trình '
                       'cha; 13 chức năng còn lại giữ ở mức 1. Các đầu nối đánh số biểu diễn dữ liệu đến hoặc '
                       'từ tiến trình cùng mã.',
  'Tiến trình 1.0 phân rã': 'Tiến trình 1.0 tương ứng UC-01, phân rã thành 1.1 khởi tạo online, 1.2 xác minh '
                            'webhook/kích hoạt phiên và 1.3 đổi mã một lần. Thanh toán tiền mặt, xác nhận '
                            'tiền mặt và cấp lại token là các chức năng riêng 2.0, 11.0 và 12.0 ở mức 1.',
  'Tiến trình 2.0 phân rã': 'Tiến trình 3.0 tương ứng UC-03, phân rã thành 3.1 kiểm tra phiên/ngôn ngữ, 3.2 '
                            'cấp bundle, 3.3 hiển thị bản đồ/vị trí và 3.4 hiển thị chi tiết POI. Chức năng '
                            '4.0 đổi ngôn ngữ cung cấp bundle mới; 5.0 nghe thủ công, 6.0 nghe tự động và 7.0 '
                            'chọn/tùy chỉnh lộ trình là các tiến trình riêng. GPS và lộ trình cá nhân không '
                            'ghi vào SQL.',
  'Tiến trình 3.0 phân rã thành bốn': 'Tiến trình 8.0 tương ứng UC-08, phân rã thành 8.1 kiểm tra phiên/câu '
                                      'hỏi/hạn mức, 8.2 tạo embedding, 8.3 truy hồi nguồn ACTIVE đúng phiên '
                                      'bản và 8.4 tổng hợp câu trả lời có nguồn, ghi CHAT_LOGS. Tạo vector '
                                      'câu hỏi diễn ra trước truy hồi; gọi LLM diễn ra sau khi có ngữ cảnh.',
  'Tiến trình 4.0 gồm': 'Tiến trình 13.0 tương ứng UC-13, phân rã thành 13.1 quản lý POI/nguồn/trạng thái và '
                        '13.2 pipeline dịch–TTS. Quản lý lộ trình mẫu và kho kiến thức là chức năng riêng '
                        '14.0 và 15.0 ở mức 1. Tác vụ nền đọc CONTENT_JOBS; bản dịch, byte WAV, metadata và '
                        'trạng thái có luồng lưu riêng.',
  'Tiến trình 5.0 gồm': 'Tiến trình 18.0 tương ứng UC-18, phân rã thành 18.1 kiểm tra quyền/khoảng thời gian, '
                        '18.2 đọc sức khỏe/tổng hợp dữ liệu và 18.3 hiển thị chỉ số/lỗi nguồn/độ mới. Đăng '
                        'nhập, đăng xuất, tạo STAFF và xem audit là chức năng riêng 9.0, 10.0, 16.0 và 17.0 ở '
                        'mức 1. Monitoring chỉ đọc nguồn nghiệp vụ, không sửa dữ liệu.',
  'DFD mức 3 thực hiện': 'Mức 3 phân rã sâu tiến trình 13.2 của UC-13 và 8.4 của UC-08; các luồng biên được '
                         'bảo toàn với tiến trình cha ở mức 2.',
  'Tiến trình 4.2 phân rã': 'Tiến trình 13.2 gồm bốn bước: 13.2.1 nhận tác vụ/kiểm tra phiên bản, 13.2.2 '
                            'chuẩn bị/dịch văn bản, 13.2.3 tái sử dụng/tổng hợp WAV và 13.2.4 công bố '
                            'audio/kết quả. Dịch xong mới gửi TTS; nguồn Việt được tái sử dụng. Kết quả cũ '
                            'không ghi đè phiên bản mới.',
  'Tiến trình 3.4 nhận': 'Tiến trình 8.4 nhận câu hỏi/ngôn ngữ từ 8.2 và các đoạn từ 8.3, phân rã thành 8.4.1 '
                         'ghép prompt, 8.4.2 gọi LLM, 8.4.3 kiểm tra căn cứ/trích dẫn và 8.4.4 ghi log/trả '
                         'kết quả. Nhánh từ chối phạm vi từ 8.1 đi thẳng đến ghi log/trả thông báo, không gọi '
                         'AI.'}
 lines=text.splitlines()
 for i,line in enumerate(lines):
  for prefix,value in paragraphs.items():
   if line.startswith(prefix):lines[i]=value;break
 text='\n'.join(lines)+'\n'
 captions={22:'1.0 Thanh toán trực tuyến',23:'3.0 Xem bản đồ và thông tin POI',24:'8.0 Hỏi đáp bằng chatbot RAG',25:'13.0 Quản lý POI và nội dung đa ngôn ngữ',26:'18.0 Giám sát sức khỏe và sử dụng'}
 for n,title in captions.items():
  text=re.sub(rf'\*Bảng 3\.{n}:.*?\*',f'*Bảng 3.{n}: Các tiến trình con của {title}*',text)
 text=re.sub(r'\*Bảng 3\.27:.*?\*','*Bảng 3.27: Các tiến trình con của 13.2 Xử lý nền dịch văn bản và TTS*',text)
 text=re.sub(r'\*Bảng 3\.28:.*?\*','*Bảng 3.28: Các tiến trình con của 8.4 Tổng hợp câu trả lời có nguồn và ghi nhật ký*',text)
 REPORT.write_text(text,encoding='utf-8')
 print('Updated 10 report tables and business narratives from the UC-traced dictionary.')
if __name__=='__main__':main()
