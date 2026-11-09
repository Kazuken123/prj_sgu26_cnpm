"""DFD data dictionary traced to the approved report UC-01 through UC-18.

Fxx are context flow families; their numbered components preserve provenance
when a family is split across processes. Stores describe report scope, not all
optional tables that happen to exist in implementation migrations.
"""
from collections import defaultdict

ACTORS = {'E1': 'Khách tham quan', 'E2': 'Nhân viên (STAFF)',
          'E3': 'Quản trị viên (ADMIN)', 'E4': 'Cổng thanh toán',
          'E5': 'Dịch vụ dịch và TTS', 'E6': 'Dịch vụ embedding và LLM'}
STORES = {
 'D1': ('Tài khoản nội bộ', ['USERS']),
 'D2': ('Phiên đăng nhập nội bộ', ['REFRESH_TOKENS']),
 'D3': ('Phiên tham quan', ['VISIT_SESSIONS']),
 'D4': ('Thanh toán', ['PAYMENTS']),
 'D5': ('Danh mục ngôn ngữ', ['LANGUAGES']),
 'D6': ('POI và văn bản đa ngữ', ['POIS', 'POI_TRANSLATIONS']),
 'D7': ('Thông tin audio', ['AUDIOS']),
 'D8': ('Tác vụ nội dung', ['CONTENT_JOBS']),
 'D9': ('Lộ trình mẫu', ['TOURS', 'TOUR_POIS']),
 'D10': ('Tài liệu và chỉ mục kiến thức', ['KNOWLEDGE_DOCUMENTS', 'KNOWLEDGE_CHUNKS']),
 'D11': ('Nhật ký thao tác', ['AUDIT_LOGS']),
 'D12': ('Nhật ký hỏi đáp', ['CHAT_LOGS']),
 'D13': ('Nhật ký cấp bundle', ['BUNDLE_ACCESS_LOGS']),
 'R1': ('Mã tạm và hạn mức (Redis)', []),
 'M1': ('Tệp media', []),
}
PARENTS = {
 'P1': 'Thanh toán trực tuyến', 'P2': 'Thanh toán tiền mặt',
 'P3': 'Xem bản đồ và thông tin POI', 'P4': 'Lựa chọn ngôn ngữ',
 'P5': 'Nghe thuyết minh thủ công', 'P6': 'Nghe thuyết minh tự động theo vị trí',
 'P7': 'Lựa chọn và tùy chỉnh lộ trình', 'P8': 'Hỏi đáp bằng chatbot RAG',
 'P9': 'Đăng nhập nội bộ', 'P10': 'Đăng xuất nội bộ',
 'P11': 'Xác nhận thanh toán tiền mặt', 'P12': 'Cấp lại token khách',
 'P13': 'Quản lý POI và nội dung đa ngôn ngữ', 'P14': 'Quản lý lộ trình mẫu',
 'P15': 'Quản lý kho kiến thức', 'P16': 'Tạo tài khoản STAFF',
 'P17': 'Xem nhật ký thao tác', 'P18': 'Giám sát sức khỏe và sử dụng',
}
# The other 13 functions remain atomic at level 1. Five complex functions
# are decomposed further; their children belong to that one UC only.
DECOMPOSED = ['P1','P3','P8','P13','P18']
PROCESSES = {k:(v,[int(k[1:])]) for k,v in PARENTS.items() if k not in DECOMPOSED}
PROCESSES.update({
 'P1_1':('Khởi tạo thanh toán trực tuyến',[1]),
 'P1_2':('Xác minh webhook và kích hoạt phiên',[1]),
 'P1_3':('Đổi mã online thành token khách',[1]),
 'P3_1':('Kiểm tra phiên và ngôn ngữ hiện tại',[3]),
 'P3_2':('Cấp bundle và ghi lượt cấp',[3]),
 'P3_3':('Hiển thị bản đồ, vị trí và điểm lân cận',[3]),
 'P3_4':('Hiển thị thông tin chi tiết POI',[3]),
 'P8_1':('Kiểm tra phiên, câu hỏi và hạn mức',[8]),
 'P8_2':('Tạo embedding câu hỏi',[8]),
 'P8_3':('Truy hồi đoạn ACTIVE đúng phiên bản',[8]),
 'P8_4':('Tạo, kiểm tra câu trả lời và ghi log',[8]),
 'P13_1':('Quản lý POI, nguồn và trạng thái tác vụ',[13]),
 'P13_2':('Xử lý nền dịch văn bản và TTS',[13]),
 'P18_1':('Kiểm tra quyền và khoảng thời gian',[18]),
 'P18_2':('Đọc sức khỏe và tổng hợp nguồn dữ liệu',[18]),
 'P18_3':('Hiển thị chỉ số, lỗi nguồn và độ mới',[18]),
})

FAMILIES = {
 'F01': 'Yêu cầu thanh toán và đổi mã', 'F02': 'Thông tin thanh toán và quyền tham quan',
 'F03': 'Yêu cầu nội dung, ngôn ngữ, GPS, audio và tour', 'F04': 'Nội dung, audio, lộ trình hoặc thông báo',
 'F05': 'Câu hỏi tra cứu', 'F06': 'Câu trả lời có nguồn hoặc thông báo',
 'F07': 'Dữ liệu thanh toán tiền mặt và cấp lại quyền', 'F08': 'Phiên, kết quả xác nhận và mã nhận vé',
 'F09': 'Dữ liệu POI, tour mẫu và tài liệu', 'F10': 'Kết quả quản lý nội dung',
 'F11': 'Thông tin đăng nhập, refresh và đăng xuất', 'F12': 'Kết quả xác thực và kết thúc phiên',
 'F13': 'Dữ liệu tiền mặt và cấp lại quyền của ADMIN', 'F14': 'Phiên, kết quả tiền mặt và mã nhận vé',
 'F15': 'Dữ liệu quản lý nội dung của ADMIN', 'F16': 'Kết quả quản lý nội dung cho ADMIN',
 'F17': 'Thông tin xác thực và đăng xuất ADMIN', 'F18': 'Kết quả xác thực và kết thúc phiên ADMIN',
 'F19': 'Hồ sơ STAFF và bộ lọc audit, monitoring', 'F20': 'Hồ sơ đã tạo, nhật ký và chỉ số',
 'F21': 'Yêu cầu khởi tạo giao dịch online', 'F22': 'Thông tin giao dịch và kết quả thanh toán',
 'F23': 'Văn bản nguồn hoặc kịch bản cần dịch/TTS', 'F24': 'Bản dịch hoặc dữ liệu âm thanh WAV',
 'F25': 'Câu hỏi hoặc đoạn tài liệu cần embedding', 'F26': 'Vector embedding tương ứng',
 'F27': 'Câu hỏi kèm ngữ cảnh và mã nguồn', 'F28': 'Phản hồi LLM theo ngữ cảnh',
}


def uc_codes(numbers): return [f'UC-{n:02}' for n in numbers]
def parent(identifier): return identifier.split('_')[0] if identifier.startswith('P') else identifier

def build_model():
    edges=[];counts=defaultdict(int)
    def add(src,dst,label,uc,family=None):
        prefix=family or ('I' if src.startswith('P') and dst.startswith('P') else 'S')
        counts[prefix]+=1
        edges.append({'id':f'{prefix}_{counts[prefix]:02}','source':src,'target':dst,
                      'label':label,'ucs':uc_codes([uc]),'family':family,
                      'source_section':f'3.3 / UC-{uc:02}'})
    def read(pid,sid,label,uc): add(sid,pid,label,uc)
    def write(pid,sid,label,uc): add(pid,sid,label,uc)
    def permission(pid,uc):
        read(pid,'D1','Tài khoản và quyền STAFF/ADMIN',uc)
        read(pid,'D2','Phiên nội bộ còn hiệu lực',uc)
    def visitor(pid,uc):
        read(pid,'D3','Phiên khách và hạn vé',uc)
        read(pid,'D4','Thanh toán PAID của phiên',uc)
    def request(pid,uc,inp,out,actor='E1',fin='F03',fout='F04',outpid=None):
        add(actor,pid,inp,uc,fin);add(outpid or pid,actor,out,uc,fout)
    def staff(pid,uc,inp,out):
        request(pid,uc,inp,out,'E2','F07' if uc in (11,12) else 'F09','F08' if uc in (11,12) else 'F10')
        request(pid,uc,inp,out,'E3','F13' if uc in (11,12) else 'F15','F14' if uc in (11,12) else 'F16')

    # UC-01: the redirect cannot activate a ticket; verified webhook does.
    request('P1_1',1,'Yêu cầu thanh toán online','Giá, phiên chờ, mã và URL online',fin='F01',fout='F02')
    request('P1_3',1,'Phiên và mã đổi quyền online','Token khách, hạn vé hoặc trạng thái đổi mã',fin='F01',fout='F02')
    add('P1_1','E4','Thông tin đơn và yêu cầu giao dịch online',1,'F21')
    add('E4','P1_1','Mã giao dịch và URL thanh toán',1,'F22')
    add('E4','P1_2','Webhook: chữ ký, mã, số tiền và kết quả',1,'F22')
    for sid,label in [('D3','Phiên chờ hiện có'),('D4','Yêu cầu giao dịch và giá đã ghi nhận'),('R1','Mã online hiện có và TTL')]:read('P1_1',sid,label,1)
    for sid,label in [('D3','Phiên tham quan PENDING'),('D4','Payment ONLINE/PENDING và payment_ref'),('R1','Mã đổi quyền online có TTL')]:write('P1_1',sid,label,1)
    read('P1_2','D3','Phiên chờ, trạng thái và hạn vé hiện có',1);read('P1_2','D4','Payment ONLINE, số tiền và trạng thái hiện có',1)
    write('P1_2','D4','Trạng thái giao dịch sau xác minh hợp lệ',1);write('P1_2','D3','ACTIVE và hạn vé từ paid_at',1)
    visitor('P1_3',1);read('P1_3','R1','Mã đúng phiên, TTL và hạn mức thử',1)
    write('P1_3','D3','Hash token khách',1);write('P1_3','R1','Hạn mức thử và mã đã tiêu thụ',1);write('P1_3','D11','Audit cấp token, không có token thô',1)

    # UC-02 and UC-11 coordinate through the same payment/visit and code.
    request('P2',2,'Yêu cầu tiền mặt, phiên và mã ngắn','Phiên chờ, trạng thái hoặc token và hạn vé',fin='F01',fout='F02')
    read('P2','D3','Phiên chờ hoặc ACTIVE và hạn vé',2);read('P2','D4','Yêu cầu CASH và trạng thái thanh toán',2)
    read('P2','R1','Mã đúng phiên, TTL và hạn mức thử',2)
    write('P2','D3','Phiên PENDING hoặc hash token sau xác nhận',2)
    write('P2','D4','Payment CASH/PENDING và giá server',2)
    write('P2','R1','Hạn mức thử và mã đã tiêu thụ',2);write('P2','D11','Audit cấp token khách',2)
    staff('P11',11,'Session_id, yêu cầu tạo phiên và xác nhận tiền mặt','Thông tin đối chiếu, xác nhận và mã nhận vé 6 số')
    permission('P11',11);read('P11','D3','Phiên chờ, trạng thái và hạn vé',11);read('P11','D4','Payment CASH và trạng thái hiện có',11)
    read('P11','R1','Mã ngắn hiện có và TTL',11)
    for sid,label in [('D3','Phiên PENDING hoặc ACTIVE và hạn vé đã xác nhận'),('D4','CASH/PENDING hoặc CASH/PAID và người xác nhận'),('R1','Mã nhận vé 6 số gắn phiên có TTL'),('D11','Audit xác nhận tiền mặt')]:write('P11',sid,label,11)
    staff('P12',12,'Thông tin đối chiếu, lý do và xác nhận cấp lại*','Kết quả đối chiếu, mã nhận vé, hạn vé và số lần còn lại*')
    request('P12',12,'Phiên và mã nhận vé REISSUE*','Token mới giữ nguyên hạn vé*',fin='F01',fout='F02')
    permission('P12',12);visitor('P12',12);read('P12','R1','Mã REISSUE đúng phiên, TTL và hạn mức thử*',12)
    for sid,label in [('D3','Thu hồi token, tăng bộ đếm; hash token mới, giữ expires_at*'),('R1','Mã nhận vé REISSUE có TTL hoặc mã đã tiêu thụ*'),('D11','Audit cấp lại quyền và lý do*')]:write('P12',sid,label,12)

    # UC-03: bundle is loaded once; GPS and POI selection stay on the client.
    request('P3_1',3,'Token và ngôn ngữ hiện tại','Thông báo phiên hoặc lỗi tải nội dung')
    visitor('P3_1',3);read('P3_1','D5','Ngôn ngữ đang hoạt động',3)
    add('P3_1','P3_2','Phiên hợp lệ, hạn vé và ngôn ngữ',3)
    for sid,label in [('D5','Danh mục ngôn ngữ'),('D6','POI ACTIVE và văn bản hiện hành'),('D7','URL audio và trạng thái AVAILABLE'),('D9','Tour mẫu và thứ tự POI hợp lệ')]:read('P3_2',sid,label,3)
    write('P3_2','D13','Lượt cấp bundle theo phiên và ngôn ngữ',3)
    add('P3_2','P3_3','POI, tọa độ, bán kính và hạn vé trong bundle',3)
    add('P3_2','P3_4','Thông tin, văn bản, ảnh và URL audio của POI',3)
    request('P3_3',3,'GPS/giả lập, phân khu và POI được chọn','Bản đồ, vị trí và danh sách điểm lân cận')
    add('P3_3','P3_4','POI được chọn',3)
    add('P3_4','E1','Chi tiết POI và ngôn ngữ thực tế',3,'F04')
    add('P3_2','P4','Danh mục ngôn ngữ và bundle hiện tại',3)
    add('P3_4','P5','POI được chọn và URL audio trong bundle',3)
    add('P3_2','P6','POI, bán kính, URL audio và hạn vé',3)
    add('P3_2','P7','POI, tour mẫu và hạn vé trong bundle',3)

    # UC-04 is a separate function; it neither edits POI nor generates audio.
    request('P4',4,'Token và mã ngôn ngữ được chọn','Bundle ngôn ngữ mới hoặc thông báo giữ ngôn ngữ cũ')
    visitor('P4',4)
    for sid,label in [('D5','Ngôn ngữ đang hoạt động'),('D6','Văn bản ACTIVE đúng phiên bản'),('D7','URL audio và ngôn ngữ thực tế'),('D9','Tour mẫu hợp lệ')]:read('P4',sid,label,4)
    write('P4','D13','Lượt cấp bundle ngôn ngữ thành công',4)
    add('P4','P3_3','Bundle ngôn ngữ mới nhất và hạn vé',4)
    add('P4','P3_4','Văn bản POI và ngôn ngữ thực tế mới',4)
    add('P4','P5','URL audio mới và trạng thái hủy audio cũ',4)
    add('P4','P6','POI, URL audio ngôn ngữ mới và hạn vé',4)
    add('P4','P7','POI và tour mẫu trong bundle ngôn ngữ mới',4)
    request('P5',5,'POI, yêu cầu phát, tạm dừng hoặc tua','Âm thanh WAV và trạng thái phát thực tế')
    read('P5','M1','Byte tệp âm thanh WAV theo URL',5)
    request('P6',6,'Bắt đầu tham quan và GPS/giả lập','Âm thanh tự phát và trạng thái hoặc lỗi')
    read('P6','M1','Byte tệp âm thanh WAV theo URL',6)
    request('P7',7,'Tour mẫu, các điểm chọn và điểm xuất phát','Thứ tự điểm, đường nối và khoảng cách ước tính')
    add('P7','P3_3','Thứ tự điểm và đường nối ước tính tại client',7)

    # UC-08: embedding precedes retrieval; LLM only sees the retrieved context.
    request('P8_1',8,'Câu hỏi và token phiên khách','Thông báo phiên, đầu vào hoặc hạn mức không hợp lệ',fin='F05',fout='F06')
    add('P8_4','E1','Câu trả lời có nguồn hoặc NO_CONTEXT/lỗi',8,'F06')
    visitor('P8_1',8);read('P8_1','R1','Bộ đếm hỏi đáp theo phiên/IP',8);write('P8_1','R1','Bộ đếm hạn mức và thời hạn cửa sổ',8)
    add('P8_1','P8_2','Câu hỏi đúng phạm vi và trong hạn mức',8)
    add('P8_1','P8_4','Từ chối phạm vi: NO_CONTEXT, không gọi AI',8)
    add('P8_2','E6','Câu hỏi cần tạo vector',8,'F25');add('E6','P8_2','Vector câu hỏi và thông tin mô hình',8,'F26')
    add('P8_2','P8_3','Vector câu hỏi tương thích mô hình',8);add('P8_2','P8_4','Câu hỏi và ngôn ngữ người hỏi',8)
    read('P8_3','D10','Đoạn ACTIVE, vector và phiên bản hiện hành',8);add('P8_3','P8_4','Tập đoạn liên quan và mã nguồn',8)
    add('P8_4','E6','Câu hỏi, ngữ cảnh và mã trích dẫn',8,'F27');add('E6','P8_4','Câu trả lời thô và mã nguồn được viện dẫn',8,'F28')
    write('P8_4','D12','Question, answer, sources và trạng thái',8)

    for actor,fin,fout in [('E2','F11','F12'),('E3','F17','F18')]:
        request('P9',9,'Email/mật khẩu hoặc dữ liệu refresh','Tài khoản, vai trò và token nội bộ',actor,fin,fout)
        request('P10',10,'Thông tin phiên cần đăng xuất','Kết quả kết thúc phiên hiện tại',actor,fin,fout)
    read('P9','D1','Tài khoản, hash mật khẩu và trạng thái khóa',9);write('P9','D1','Bộ đếm đăng nhập sai và khóa tạm',9)
    read('P9','D2','Phiên và refresh token hiện tại',9);write('P9','D2','Phiên mới hoặc refresh đã xoay vòng',9)
    read('P10','D2','Phiên hiện tại cần thu hồi',10);write('P10','D2','Thu hồi đúng session_id',10)

    staff('P13_1',13,'Dữ liệu POI/nguồn, trạng thái hoặc thử lại','Kết quả lưu, trạng thái nội dung và lỗi')
    permission('P13_1',13)
    for sid,label in [('D5','Ngôn ngữ được hỗ trợ'),('D6','POI và nguồn/bản dịch hiện có'),('D7','Trạng thái audio theo ngôn ngữ'),('D8','Tác vụ, lỗi và phiên bản')]:read('P13_1',sid,label,13)
    write('P13_1','D6','POI, nguồn Việt, phiên bản và trạng thái',13);write('P13_1','D8','Tác vụ PENDING mới hoặc FAILED được thử lại',13);write('P13_1','D11','Audit lưu/ngừng POI và thử lại',13)
    for sid,label in [('D8','Tác vụ chờ, claim và phiên bản'),('D5','Ngôn ngữ đích của tác vụ'),('D6','Phiên bản nguồn hiện tại'),('D6','Nguồn Việt và bản dịch có thể tái sử dụng'),('D7','Metadata audio có thể tái sử dụng'),('M1','Tệp audio hiện có cần kiểm tra')]:read('P13_2',sid,label,13)
    for sid,label in [('D8','Claim, PROCESSING hoặc từ chối nguồn cũ'),('D6','Bản dịch READY đúng phiên bản'),('M1','Tệp WAV đã kiểm tra'),('D7','URL, thông số và trạng thái audio'),('D8','COMPLETED hoặc FAILED và dữ liệu lỗi')]:write('P13_2',sid,label,13)
    add('P13_2','E5','Nguồn tiếng Việt và ngôn ngữ cần dịch',13,'F23');add('E5','P13_2','Tên, văn bản và kịch bản đã dịch',13,'F24')
    add('P13_2','E5','Kịch bản đã chuẩn bị và yêu cầu TTS',13,'F23');add('E5','P13_2','Dữ liệu âm thanh WAV',13,'F24')
    staff('P14',14,'Yêu cầu xem, tạo hoặc cập nhật tour mẫu','Tour và kết quả lưu thứ tự POI');permission('P14',14)
    for sid,label in [('D6','POI tồn tại và ACTIVE'),('D9','Tour mẫu và thứ tự hiện có')]:read('P14',sid,label,14)
    write('P14','D9','Tour và thứ tự POI đã kiểm tra',14);write('P14','D11','Audit tạo/cập nhật tour mẫu',14)
    staff('P15',15,'Tài liệu, nguồn và yêu cầu quản lý chỉ mục','Tài liệu, phiên bản và kết quả chỉ mục');permission('P15',15)
    read('P15','D10','Tài liệu, trạng thái và phiên bản hiện tại',15)
    add('P15','E6','Các đoạn tài liệu cần tạo vector',15,'F25');add('E6','P15','Vector các đoạn và thông tin mô hình',15,'F26')
    write('P15','D10','Nguồn/phiên bản; chunks và vector đúng phiên bản',15);write('P15','D11','Audit thêm/sửa/ngừng tài liệu',15)
    request('P16',16,'Hồ sơ nhân viên cần tạo','Hồ sơ STAFF đã tạo','E3','F19','F20');permission('P16',16)
    write('P16','D1','Tài khoản STAFF, hash mật khẩu và ACTIVE',16);write('P16','D11','Audit CREATE_STAFF',16)
    request('P17',17,'Bộ lọc và trang nhật ký','Nhật ký thao tác và phân trang','E3','F19','F20');permission('P17',17);read('P17','D11','Audit theo bộ lọc và trang',17)
    request('P18_1',18,'Khoảng thời gian và yêu cầu giám sát','Thông báo không đủ quyền hoặc bộ lọc sai','E3','F19','F20')
    permission('P18_1',18);add('P18_1','P18_2','Quyền ADMIN và khoảng thời gian hợp lệ',18)
    for sid,label in [('D3','Phiên trả phí ACTIVE còn hạn'),('D4','Giao dịch PAID, tiền và khoảng thời gian'),('D7','Audio theo trạng thái'),('D8','Tác vụ theo trạng thái'),('D12','Hỏi đáp theo trạng thái/thời gian'),('D13','Lượt cấp bundle và ngôn ngữ')]:read('P18_2',sid,label,18)
    read('P18_2','R1','Kết quả kiểm tra sẵn sàng Redis',18)
    add('P18_2','P18_3','Chỉ số, lỗi từng nguồn và thời điểm cập nhật',18)
    add('P18_3','E3','Dashboard, trạng thái nguồn và độ mới dữ liệu',18,'F20')
    return edges

EDGES=build_model()

def level_three(pid):
    if pid=='P8_4':
        children={pid+'_1':'Ghép câu hỏi và ngữ cảnh',pid+'_2':'Gọi LLM sinh phản hồi',pid+'_3':'Kiểm tra căn cứ và trích dẫn',pid+'_4':'Ghi log và trả kết quả'}
        def owner(e):
            if e['source'] in ('P8_2','P8_3'):return pid+'_1'
            if 'E6' in (e['source'],e['target']):return pid+'_2'
            return pid+'_4'
        chain=[(1,2,'Prompt và mã đoạn nguồn'),(2,3,'Phản hồi thô hoặc lỗi LLM'),(3,4,'Câu trả lời có nguồn, NO_CONTEXT hoặc lỗi')]
        uc=8
    else:
        assert pid=='P13_2'
        children={pid+'_1':'Nhận tác vụ và kiểm tra phiên bản',pid+'_2':'Chuẩn bị hoặc dịch văn bản',pid+'_3':'Tái sử dụng hoặc tổng hợp WAV',pid+'_4':'Công bố audio và kết quả tác vụ'}
        def owner(e):
            label=e['label'];other=e['target'] if e['source']==pid else e['source']
            if other=='E5':return pid+('_3' if ('TTS' in label or 'âm thanh WAV' in label) else '_2')
            if other=='M1':return pid+'_3'
            if other=='D7':return pid+('_4' if e['source']==pid else '_3')
            if other=='D6':return pid+('_1' if label=='Phiên bản nguồn hiện tại' else '_2')
            if other=='D5':return pid+'_1'
            return pid+('_4' if label.startswith('COMPLETED') else '_1')
        chain=[(1,2,'Tác vụ được nhận và phiên bản nguồn'),(2,3,'Kịch bản đúng phiên bản sẵn sàng đọc'),(3,4,'Metadata/tệp hợp lệ hoặc dữ liệu lỗi'),(2,4,'Dữ liệu lỗi dịch hoặc nguồn đã thay đổi')]
        uc=13
    result=[]
    for edge in EDGES:
        if (edge['source']==pid)!=(edge['target']==pid):
            e=dict(edge);key='source' if e['source']==pid else 'target';e[key]=owner(e);result.append(e)
    for i,(src,dst,label) in enumerate(chain,1):
        result.append({'id':f'L3_{pid}_{i}','source':f'{pid}_{src}','target':f'{pid}_{dst}','label':label,'ucs':uc_codes([uc]),'family':None,'source_section':f'3.3 / UC-{uc:02}'})
    return children,result
