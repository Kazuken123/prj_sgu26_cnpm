"""Refresh report flow tables directly from the canonical Draw.io graphs."""
from pathlib import Path
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')
from verify_lvl1_lvl2_balance import NAMES, parse, edges, clean, logical

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'docs/DFD_Report_Section_3_4.md'

OPERATIONS = {
 '1.0':'Đối soát thanh toán, quản lý mã đổi phiên và token khách.',
 '2.0':'Kiểm tra phiên, ghép gói nội dung và ghi nhận hoạt động tham quan.',
 '3.0':'Chuẩn hóa truy vấn, truy hồi kiến thức rồi gọi LLM với ngữ cảnh trích dẫn.',
 '4.0':'Điều phối cập nhật nội dung, dịch/TTS, lộ trình và lập chỉ mục kiến thức.',
 '5.0':'Điều phối tài khoản nội bộ, nhật ký và báo cáo giám sát.',
 '1.1':'Tạo phiên chờ và yêu cầu giao dịch; chuyển thông tin thanh toán cho 1.4.',
 '1.2':'Xác minh chữ ký, đối soát giao dịch và kích hoạt mã một lần.',
 '1.3':'Xác nhận tiền mặt, cấp mã ngắn; điều phối tra cứu và nhận token cấp lại từ 1.5.',
 '1.4':'Đối chiếu mã và hạn sử dụng, thu hồi mã đã dùng, cấp token phiên.',
 '1.5':'Đối chiếu phiên và lịch sử thanh toán; cấp lại token qua 1.3.',
 '2.1':'Đối chiếu token phiên; chuyển yêu cầu nội dung và dữ liệu hiện diện cho các bước sau.',
 '2.2':'Ghép dữ liệu D3, D4 và luồng âm thanh từ 2.3 thành gói trả khách.',
 '2.3':'Đọc tệp WAV theo yêu cầu của 2.2 và chuyển luồng âm thanh về 2.2.',
 '2.4':'Cập nhật số liệu hiện diện và lượt ghé từ dữ liệu GPS do 2.1 chuyển tiếp.',
 '3.1':'Kiểm tra hiệu lực phiên và hạn mức hỏi đáp.',
 '3.2':'Kiểm tra phạm vi, độ dài và chuẩn hóa truy vấn; chuyển câu hỏi và ngôn ngữ cho 3.4.',
 '3.3':'Đối chiếu truy vấn với các đoạn kiến thức và vector lưu trong D5; chọn tập đoạn phù hợp.',
 '3.4':'Ghép câu hỏi với tập đoạn đã truy hồi, gọi LLM, kiểm duyệt trích dẫn và ghi nhật ký.',
 '4.1':'Lưu nội dung và tác vụ chờ; phân phối dữ liệu tour, tài liệu; tổng hợp kết quả trả nhân viên.',
 '4.2':'Đọc tác vụ và nguồn từ D3; gửi yêu cầu dịch/TTS, nhận bản dịch và WAV rồi lưu hoàn tất.',
 '4.3':'Lưu lộ trình và thứ tự điểm dừng; trả xác nhận về 4.1.',
 '4.4':'Phân đoạn tài liệu, yêu cầu vector nhúng, lưu vào D5 và trả xác nhận về 4.1.',
 '5.1':'Đối chiếu thông tin tài khoản và lưu phiên; phân phối yêu cầu và tổng hợp kết quả trả quản trị viên.',
 '5.2':'Tạo tài khoản, lưu D1 và ghi nhật ký D6; trả hồ sơ về 5.1.',
 '5.3':'Lọc và phân trang nhật ký D6; trả kết quả về 5.1.',
 '5.4':'Tổng hợp số liệu vận hành từ kho logic D6 và thông tin tài khoản/phiên nội bộ D1; trả báo cáo về 5.1.',
 '4.2.1':'Tiếp nhận thông báo 4.1, đọc tác vụ và nguồn D3; giữ quyền xử lý trong phạm vi pipeline.',
 '4.2.2':'Kiểm tra nguồn và điều phối yêu cầu dịch/TTS qua F15; chuyển dữ liệu kiểm tra WAV cho 4.2.3.',
 '4.2.3':'Nhận kết quả dịch/TTS qua F16, kiểm tra tính hợp lệ của bản dịch và tệp WAV.',
 '4.2.4':'Lưu bản dịch và WAV, công bố trạng thái hoàn tất vào D3 bằng một luồng ghi tổng hợp.',
 '3.4.1':'Ghép câu hỏi/ngôn ngữ từ 3.2 và tập đoạn từ 3.3 thành gói lời nhắc.',
 '3.4.2':'Gửi câu hỏi kèm ngữ cảnh qua F17, nhận kết quả mô hình qua F18.',
 '3.4.3':'Đối chiếu mã trích dẫn và lọc các liên kết ngoài nguồn.',
 '3.4.4':'Ghi lịch sử hỏi đáp vào D6 và trả câu trả lời có trích dẫn cho khách qua F06.',
}

def table(rows):
    return '\n'.join('| '+' | '.join(row)+' |' for row in [rows[0], [':---']*len(rows[0]), *rows[1:]])

def replace_table(text, number, rows):
    pattern = rf'(\*Bảng 3\.{number}:.*?\*\n\n)(?:\|[^\n]*\n?)+'
    result, count = re.subn(pattern, lambda m:m[1]+table(rows)+'\n', text)
    assert count==1, (number,count)
    return result

def describe(cells, identifier):
    if identifier.startswith('P'):
        return logical(identifier).removeprefix('P').replace('_','.')
    if identifier.startswith('D'):
        return logical(identifier)
    return clean(cells[identifier].get('value',''))

def process_rows(name, level_one=False):
    cells=parse(name)
    arrows=edges(cells)
    rows=[['Số hiệu','Tên tiến trình','Luồng dữ liệu đầu vào','Kho dữ liệu đọc/ghi' if level_one else 'Xử lý nghiệp vụ','Luồng dữ liệu đầu ra']]
    for pid,c in cells.items():
        if not pid.startswith('P') or pid.endswith('_In'): continue
        number=pid[1:].replace('_','.') + ('.0' if level_one else '')
        title=clean(c.get('value',''))
        title=re.sub(r'^'+re.escape(number)+r'\s*','',title)
        inc=[];out=[];store=[]
        for _,src,dst,label in arrows:
            if dst==pid:
                if level_one and src.startswith('D'): store.append('Đọc '+logical(src))
                else: inc.append(describe(cells,src)+' → '+label)
            if src==pid:
                if level_one and dst.startswith('D'): store.append('Ghi '+logical(dst))
                else: out.append(label+' → '+describe(cells,dst))
        rows.append([number,title,'; '.join(inc),'; '.join(store) if level_one else OPERATIONS[number],'; '.join(out)])
    return rows

def main():
    text=REPORT.read_text(encoding='utf-8')
    cells=parse(NAMES[0])
    rows=[['Số hiệu luồng','Hướng truyền dữ liệu','Tên luồng dữ liệu','Nội dung dữ liệu trao đổi']]
    for cid,src,dst,label in edges(cells):
        label=label.split(': ',1)[1]
        direction=lambda p:'Hệ thống (0)' if p=='P0' else describe(cells,p)
        details={
          'f01':'Thông tin tạo giao dịch hoặc mã một lần/mã ngắn dùng đổi token phiên.',
          'f02':'Thông tin giao dịch thanh toán và token phiên tham quan.',
          'f03':'Ngôn ngữ, yêu cầu nội dung, tọa độ GPS và tín hiệu hiện diện.',
          'f04':'Điểm tham quan, dữ liệu bản đồ, lộ trình và nội dung âm thanh.',
          'f05':'Nội dung câu hỏi của khách cần tra cứu.',
          'f06':'Văn bản trả lời cùng danh sách nguồn trích dẫn hợp lệ.',
          'f07':'Thông tin xác nhận thu tiền mặt hoặc tiêu chí tra cứu phiên khách.',
          'f08':'Mã ngắn sáu chữ số hoặc token cấp lại cho phiên cần hỗ trợ.',
          'f09':'Thông tin điểm tham quan, nội dung nguồn, tour và tài liệu kiến thức.',
          'f10':'Kết quả lưu dữ liệu và tiến độ xử lý tác vụ nội dung.',
          'f11':'Hồ sơ nhân viên cần tạo và tiêu chí lọc nhật ký, báo cáo.',
          'f12':'Hồ sơ nhân viên đã tạo, danh sách nhật ký và báo cáo giám sát.',
          'f13':'Thông tin đơn hàng, số tiền và dữ liệu yêu cầu giao dịch.',
          'f14':'Trạng thái, mã giao dịch và chữ ký số của webhook.',
          'f15':'Văn bản nguồn, ngôn ngữ đích và tham số tổng hợp giọng đọc.',
          'f16':'Văn bản đã dịch và dữ liệu tệp âm thanh định dạng WAV.',
          'f17':'Câu hỏi đã chuẩn hóa kèm các đoạn kiến thức và mã nguồn trích dẫn.',
          'f18':'Kết quả đối chiếu cùng văn bản trả lời của mô hình.',
          'f19':'Các đoạn văn bản kiến thức cần biểu diễn thành vector.',
          'f20':'Mảng số thực biểu diễn vector nhúng cho từng đoạn tài liệu.'}
        rows.append([cid.upper(),direction(src)+' → '+direction(dst),label,details[cid]])
    text=replace_table(text,19,rows)
    text=replace_table(text,21,process_rows(NAMES[1],True))
    for number,name in zip(range(22,29),NAMES[2:]):
        text=replace_table(text,number,process_rows(name))
    text=text.replace('kiểm tra phiên, tạo vector câu hỏi, tìm kiếm đoạn kiến thức tương đồng', 'kiểm tra phiên, chuẩn hóa truy vấn, tìm kiếm đoạn kiến thức tương đồng')
    text=text.replace('mô tả chính xác chu trình xử lý của worker nền trong mã nguồn, bao gồm cơ chế tranh chấp khóa tác vụ, dịch văn bản tự động, tổng hợp tệp âm thanh và lưu kho tệp truyền thông.', 'mô tả pipeline logic gồm tiếp nhận tác vụ, điều phối dịch và tạo giọng đọc, kiểm tra kết quả và lưu nội dung hoàn tất. Các tương tác dịch/TTS và ghi kho được gộp theo luồng dữ liệu ở tiến trình cha; sơ đồ không biểu diễn từng lần gọi dịch vụ hay từng lần cập nhật trạng thái kỹ thuật.')
    text=text.replace('![Hình', '![Hình').replace('(file:///docs/diagram/export/', '(diagram/export/')
    note='Ở mức phân tích logic, D6 bao gồm nhật ký và tập số liệu vận hành tổng hợp; các chỉ số nghiệp vụ được biểu diễn qua kho logic này, không khẳng định tồn tại thêm bảng vật lý hoặc thay đổi mã nguồn ứng dụng. Tiến trình 5.4 đọc D6 và số liệu tài khoản, phiên nội bộ từ D1. Các luồng điều phối nội bộ trong Bảng 3.22–3.28 ghi rõ tiến trình trung gian thay vì mô tả là trao đổi trực tiếp với tác nhân ngoài.\n\n'
    marker='*Bảng 3.21:'
    if note not in text: text=text.replace(marker,note+marker)
    REPORT.write_text(text,encoding='utf-8')
    print('Updated Tables 3.19 and 3.21–3.28 from all diagram arrows.')

if __name__=='__main__': main()
