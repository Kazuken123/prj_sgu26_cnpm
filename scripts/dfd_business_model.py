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
 'P1': 'Thanh toán và quyền tham quan', 'P2': 'Khai thác nội dung tham quan',
 'P3': 'Hỏi đáp thông minh RAG', 'P4': 'Quản trị nội dung tham quan',
 'P5': 'Tài khoản nội bộ và giám sát',
}
PROCESSES = {
 'P1_1': ('Khởi tạo yêu cầu và phiên chờ', [1, 2, 11]),
 'P1_2': ('Xác minh webhook và kích hoạt phiên', [1]),
 'P1_3': ('Đối chiếu, xác nhận tiền mặt và cấp mã', [11]),
 'P1_4': ('Đổi mã một lần thành token khách', [1, 2, 12]),
 'P1_5': ('Hỗ trợ cấp lại bằng mã 6 số (Could Have)', [12]),
 'P2_1': ('Kiểm tra phiên và ngôn ngữ', [3, 4]),
 'P2_2': ('Cấp bundle và ghi lượt cấp', [3, 4]),
 'P2_3': ('Hiển thị bản đồ, POI và GPS tại client', [3, 6]),
 'P2_4': ('Tải và phát audio tại client', [4, 5, 6]),
 'P2_5': ('Chọn và tùy chỉnh lộ trình tại client', [7]),
 'P3_1': ('Kiểm tra phiên, câu hỏi và hạn mức', [8]),
 'P3_2': ('Tạo embedding câu hỏi', [8]),
 'P3_3': ('Truy hồi đoạn ACTIVE đúng phiên bản', [8]),
 'P3_4': ('Tạo, kiểm tra câu trả lời và ghi log', [8]),
 'P4_1': ('Quản lý POI, nguồn và trạng thái tác vụ', [13]),
 'P4_2': ('Xử lý nền dịch văn bản và TTS', [13]),
 'P4_3': ('Tạo và cập nhật lộ trình mẫu', [14]),
 'P4_4': ('Quản lý tài liệu và chỉ mục kiến thức', [15]),
 'P5_1': ('Đăng nhập và duy trì phiên nội bộ', [9]),
 'P5_2': ('Đăng xuất phiên hiện tại', [10]),
 'P5_3': ('Tạo tài khoản STAFF', [16]),
 'P5_4': ('Đọc và lọc nhật ký thao tác', [17]),
 'P5_5': ('Giám sát sức khỏe và sử dụng', [18]),
}
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

def uc_codes(numbers):
    return [f'UC-{n:02}' for n in numbers]

def parent(identifier):
    return identifier.split('_')[0] if identifier.startswith('P') else identifier

def build_model():
    edges = []
    counts = defaultdict(int)
    def add(src, dst, label, ucs, family=None):
        prefix = family or ('I' if src.startswith('P') and dst.startswith('P') else 'S')
        counts[prefix] += 1
        edges.append({'id': f'{prefix}_{counts[prefix]:02}', 'source': src, 'target': dst,
                      'label': label, 'ucs': uc_codes(ucs), 'family': family,
                      'source_section': '3.3 / ' + ', '.join(uc_codes(ucs))})
    def read(pid, sid, label, ucs): add(sid, pid, label, ucs)
    def write(pid, sid, label, ucs): add(pid, sid, label, ucs)
    def permission(pid, ucs):
        read(pid, 'D1', 'Tài khoản và quyền STAFF/ADMIN', ucs)
        read(pid, 'D2', 'Phiên nội bộ còn hiệu lực', ucs)
    def visitor(pid, ucs):
        read(pid, 'D3', 'Phiên khách và hạn vé', ucs)
        read(pid, 'D4', 'Thanh toán PAID của phiên', ucs)
    # Context families are split into business data components at lower levels.
    add('E1','P1_1','Hình thức thanh toán và yêu cầu khởi tạo',[1,2],'F01')
    add('P1_1','E1','Giá, phiên chờ, mã và URL online',[1,2],'F02')
    add('E1','P1_4','Phiên và mã đổi quyền một lần',[1,2,12],'F01')
    add('P1_4','E1','Token khách, hạn vé hoặc trạng thái đổi mã',[1,2,12],'F02')
    for actor, fin, fout in [('E2','F07','F08'),('E3','F13','F14')]:
        for pid, inp, out, ucs in [
          ('P1_1','Yêu cầu tạo phiên tiền mặt','Thông tin phiên chờ',[11]),
          ('P1_3','Phiên cần tra cứu và xác nhận tiền mặt','Kết quả đối chiếu, xác nhận và mã ngắn',[11]),
          ('P1_5','Thông tin đối chiếu, lý do và xác nhận cấp lại*','Mã nhận vé 6 số, hạn vé và số lần còn lại*',[12])]:
            add(actor,pid,inp,ucs,fin); add(pid,actor,out,ucs,fout)
    add('P1_1','E4','Thông tin đơn và yêu cầu giao dịch',[1],'F21')
    add('E4','P1_1','Mã giao dịch và URL thanh toán',[1],'F22')
    add('E4','P1_2','Webhook: chữ ký, mã, số tiền và kết quả',[1],'F22')
    for pid, inp, outpid, out, ucs in [
      ('P2_1','Token và mã ngôn ngữ cần tải','P2_2','Bundle tham quan và ngôn ngữ thực tế',[3,4]),
      ('P2_3','GPS/giả lập và POI được chọn','P2_3','Bản đồ, vị trí và chi tiết POI',[3,6]),
      ('P2_4','Yêu cầu phát, dừng hoặc tua audio','P2_4','Âm thanh WAV và trạng thái phát',[5,6]),
      ('P2_5','Tour, điểm ghé và điểm xuất phát','P2_5','Lộ trình và khoảng cách ước tính',[7])]:
        add('E1',pid,inp,ucs,'F03'); add(outpid,'E1',out,ucs,'F04')
    add('E1','P3_1','Câu hỏi và token phiên khách',[8],'F05')
    add('P3_1','E1','Thông báo phiên, đầu vào hoặc hạn mức không hợp lệ',[8],'F06')
    add('P3_4','E1','Câu trả lời, nguồn hoặc thông báo NO_CONTEXT/lỗi',[8],'F06')
    add('P3_2','E6','Câu hỏi cần tạo vector',[8],'F25')
    add('E6','P3_2','Vector câu hỏi và thông tin mô hình',[8],'F26')
    add('P3_4','E6','Câu hỏi, ngữ cảnh và mã trích dẫn',[8],'F27')
    add('E6','P3_4','Câu trả lời thô và mã nguồn được viện dẫn',[8],'F28')
    for actor, fin, fout in [('E2','F09','F10'),('E3','F15','F16')]:
        for pid, inp, out, ucs in [
          ('P4_1','Dữ liệu POI/nguồn, yêu cầu trạng thái hoặc thử lại','Kết quả lưu, trạng thái nội dung và lỗi',[13]),
          ('P4_3','Yêu cầu xem, tạo hoặc cập nhật tour mẫu','Tour và kết quả lưu thứ tự POI',[14]),
          ('P4_4','Tài liệu, nguồn và yêu cầu quản lý chỉ mục','Tài liệu, phiên bản và kết quả chỉ mục',[15])]:
            add(actor,pid,inp,ucs,fin); add(pid,actor,out,ucs,fout)
    add('P4_2','E5','Nguồn tiếng Việt và ngôn ngữ cần dịch',[13],'F23')
    add('E5','P4_2','Tên, văn bản và kịch bản đã dịch',[13],'F24')
    add('P4_2','E5','Kịch bản đã chuẩn bị và yêu cầu TTS',[13],'F23')
    add('E5','P4_2','Dữ liệu âm thanh WAV',[13],'F24')
    add('P4_4','E6','Các đoạn tài liệu cần tạo vector',[15],'F25')
    add('E6','P4_4','Vector các đoạn và thông tin mô hình',[15],'F26')
    for actor, fin, fout in [('E2','F11','F12'),('E3','F17','F18')]:
        add(actor,'P5_1','Email/mật khẩu hoặc dữ liệu refresh',[9],fin)
        add('P5_1',actor,'Tài khoản, vai trò và token nội bộ',[9],fout)
        add(actor,'P5_2','Thông tin phiên cần đăng xuất',[10],fin)
        add('P5_2',actor,'Kết quả kết thúc phiên hiện tại',[10],fout)
    for pid, inp, out, ucs in [
      ('P5_3','Hồ sơ nhân viên cần tạo','Hồ sơ STAFF đã tạo',[16]),
      ('P5_4','Bộ lọc và trang nhật ký','Nhật ký thao tác và phân trang',[17]),
      ('P5_5','Khoảng thời gian và yêu cầu giám sát','Chỉ số, trạng thái nguồn và thời điểm cập nhật',[18])]:
        add('E3',pid,inp,ucs,'F19'); add(pid,'E3',out,ucs,'F20')
    # Payment/session persistence. CASH confirmation and online webhook activate
    # the existing visit; the code-exchange process never invents a paid visit.
    permission('P1_1',[11])
    for sid, label in [('D3','Phiên chờ và trạng thái hiện có'),('D4','Yêu cầu giao dịch và giá đã ghi nhận'),('R1','Mã online hiện có và TTL')]: read('P1_1',sid,label,[1,2,11])
    for sid, label in [('D3','Phiên tham quan PENDING'),('D4','Payment PENDING và payment_ref'),('R1','Mã đổi quyền online có TTL')]: write('P1_1',sid,label,[1,2,11])
    visitor('P1_2',[1]); write('P1_2','D4','Trạng thái giao dịch sau xác minh hợp lệ',[1]); write('P1_2','D3','ACTIVE, thời điểm kích hoạt và hạn vé',[1])
    permission('P1_3',[11]); visitor('P1_3',[11])
    read('P1_3','R1','Mã ngắn hiện có và TTL',[11])
    for sid,label in [('D4','CASH/PAID và người xác nhận'),('D3','ACTIVE và hạn vé từ thời điểm xác nhận'),('R1','Mã ngắn gắn phiên có TTL'),('D11','Audit xác nhận tiền mặt/cấp mã')]: write('P1_3',sid,label,[11])
    visitor('P1_4',[1,2,12]); read('P1_4','R1','Mã gắn phiên, TTL và hạn mức thử',[1,2,12])
    write('P1_4','D3','Hash token khách của phiên',[1,2,12]); write('P1_4','R1','Hạn mức thử và thu hồi mã đã đổi',[1,2,12]); write('P1_4','D11','Audit cấp token không chứa token thô',[1,2,12])
    permission('P1_5',[12]); visitor('P1_5',[12]); read('P1_5','R1','Mã nhận vé cấp lại còn hiệu lực',[12])
    for sid,label in [('D3','Thu hồi token, tăng bộ đếm; giữ hạn vé*'),('R1','Mã nhận vé REISSUE có TTL*'),('D11','Audit cấp lại quyền và lý do*')]: write('P1_5',sid,label,[12])
    # Visitor content: local GPS/playback/tour state is not an SQL data store.
    visitor('P2_1',[3,4]); read('P2_1','D5','Ngôn ngữ đang hoạt động',[3,4])
    add('P2_1','E1','Thông báo phiên hoặc ngôn ngữ không hợp lệ',[3,4],'F04')
    add('P2_1','P2_2','Phiên hợp lệ, hạn vé và ngôn ngữ',[3,4])
    for sid,label in [('D5','Danh mục ngôn ngữ'),('D6','POI ACTIVE và văn bản đúng phiên bản'),('D7','Metadata và URL audio AVAILABLE'),('D9','Tour mẫu và thứ tự POI hợp lệ')]: read('P2_2',sid,label,[3,4])
    write('P2_2','D13','Lượt cấp bundle thành công theo phiên/ngôn ngữ',[3,4])
    add('P2_2','P2_3','Bundle POI, tọa độ và bán kính',[3,6])
    add('P2_2','P2_4','URL audio, ngôn ngữ thực tế và hạn vé',[4,5,6])
    add('P2_2','P2_5','Tour mẫu và POI trong bundle',[7])
    add('P2_3','P2_4','POI gần nhất hợp lệ hoặc POI được chọn',[5,6])
    add('P2_5','P2_3','Thứ tự điểm và đường nối ước tính',[7])
    read('P2_4','D7','URL và trạng thái audio hiện hành',[5,6]); read('P2_4','D6','Phiên bản nội dung và POI ACTIVE',[5,6]); read('P2_4','M1','Byte tệp âm thanh WAV',[5,6])
    # RAG must embed the question before retrieval.
    visitor('P3_1',[8]); read('P3_1','R1','Bộ đếm hỏi đáp theo phiên/IP',[8]); write('P3_1','R1','Bộ đếm hạn mức và thời hạn cửa sổ',[8])
    add('P3_1','P3_2','Câu hỏi đúng phạm vi và trong hạn mức',[8])
    add('P3_1','P3_4','Từ chối phạm vi: NO_CONTEXT, không gọi AI',[8])
    add('P3_2','P3_3','Vector câu hỏi tương thích mô hình',[8])
    add('P3_2','P3_4','Câu hỏi và ngôn ngữ người hỏi',[8])
    read('P3_3','D10','Đoạn ACTIVE, vector và phiên bản hiện hành',[8])
    add('P3_3','P3_4','Tập đoạn liên quan và mã nguồn',[8])
    write('P3_4','D12','Question, answer, sources và trạng thái',[8])
    # Staff content functions receive their own requests, not via POI editing.
    for pid,ucs in [('P4_1',[13]),('P4_3',[14]),('P4_4',[15])]: permission(pid,ucs)
    for sid,label in [('D5','Ngôn ngữ được hỗ trợ'),('D6','POI và nguồn/bản dịch hiện có'),('D7','Trạng thái audio theo ngôn ngữ'),('D8','Tác vụ, trạng thái, lỗi và phiên bản')]: read('P4_1',sid,label,[13])
    write('P4_1','D6','POI, nguồn Việt, phiên bản và trạng thái',[13]); write('P4_1','D8','Tác vụ PENDING mới hoặc FAILED được thử lại',[13]); write('P4_1','D11','Audit lưu/ngừng POI và thử lại',[13])
    read('P4_2','D8','Tác vụ chờ, claim và phiên bản',[13]); read('P4_2','D5','Ngôn ngữ đích của tác vụ',[13])
    read('P4_2','D6','Phiên bản nguồn hiện tại',[13]); read('P4_2','D6','Nguồn Việt và bản dịch có thể tái sử dụng',[13])
    read('P4_2','D7','Metadata audio có thể tái sử dụng',[13]); read('P4_2','M1','Tệp audio hiện có cần kiểm tra',[13])
    write('P4_2','D8','Claim, PROCESSING hoặc từ chối nguồn cũ',[13]); write('P4_2','D6','Bản dịch READY đúng phiên bản',[13])
    write('P4_2','M1','Tệp WAV đã kiểm tra',[13]); write('P4_2','D7','URL, thông số và trạng thái audio',[13]); write('P4_2','D8','COMPLETED hoặc FAILED và dữ liệu lỗi',[13])
    read('P4_3','D6','POI tồn tại và ACTIVE',[14]); read('P4_3','D9','Tour mẫu và thứ tự hiện có',[14]); write('P4_3','D9','Tour và thứ tự POI đã kiểm tra',[14]); write('P4_3','D11','Audit tạo/cập nhật tour mẫu',[14])
    read('P4_4','D10','Tài liệu, trạng thái và phiên bản hiện tại',[15]); write('P4_4','D10','Nguồn/phiên bản; chunks và vector đúng phiên bản',[15]); write('P4_4','D11','Audit thêm/sửa/ngừng tài liệu',[15])
    # Account/session functions and admin queries are distinct.
    read('P5_1','D1','Tài khoản, mật khẩu băm và trạng thái khóa',[9]); write('P5_1','D1','Bộ đếm đăng nhập sai và khóa tạm',[9])
    read('P5_1','D2','Phiên và refresh token hiện tại',[9]); write('P5_1','D2','Phiên mới hoặc refresh đã xoay vòng',[9])
    read('P5_2','D2','Phiên hiện tại cần thu hồi',[10]); write('P5_2','D2','Thu hồi đúng session_id',[10])
    for pid,ucs in [('P5_3',[16]),('P5_4',[17]),('P5_5',[18])]: permission(pid,ucs)
    write('P5_3','D1','Tài khoản STAFF, mật khẩu băm và ACTIVE',[16]); write('P5_3','D11','Audit CREATE_STAFF',[16])
    read('P5_4','D11','Audit theo bộ lọc và trang',[17])
    for sid,label in [('D3','Phiên trả phí ACTIVE còn hạn'),('D4','Giao dịch PAID, tiền và khoảng thời gian'),('D7','Audio theo trạng thái'),('D8','Tác vụ theo trạng thái'),('D12','Hỏi đáp theo trạng thái/thời gian'),('D13','Lượt cấp bundle và ngôn ngữ')]: read('P5_5',sid,label,[18])
    read('P5_5','R1','Kết quả kiểm tra sẵn sàng Redis',[18])
    return edges

EDGES = build_model()

def level_three(pid):
    """Map each parent boundary component to its owning child function."""
    if pid == 'P3_4':
        children = {'P3_4_1': 'Ghép câu hỏi và ngữ cảnh', 'P3_4_2': 'Gọi LLM sinh phản hồi',
                    'P3_4_3': 'Kiểm tra căn cứ và trích dẫn', 'P3_4_4': 'Ghi log và trả kết quả'}
        def owner(e):
            if e['source'] in ('P3_2','P3_3'): return 'P3_4_1'
            if 'E6' in (e['source'],e['target']): return 'P3_4_2'
            return 'P3_4_4'
        chain = [('P3_4_1','P3_4_2','Prompt và mã đoạn nguồn'),('P3_4_2','P3_4_3','Phản hồi thô hoặc lỗi LLM'),('P3_4_3','P3_4_4','Câu trả lời có nguồn, NO_CONTEXT hoặc lỗi')]
    else:
        children = {'P4_2_1': 'Nhận tác vụ và kiểm tra phiên bản', 'P4_2_2': 'Chuẩn bị hoặc dịch văn bản',
                    'P4_2_3': 'Tái sử dụng hoặc tổng hợp WAV', 'P4_2_4': 'Công bố audio và kết quả tác vụ'}
        def owner(e):
            label=e['label']; other=e['target'] if e['source']==pid else e['source']
            if other=='E5': return 'P4_2_3' if ('TTS' in label or 'âm thanh WAV' in label) else 'P4_2_2'
            if other=='M1': return 'P4_2_3'
            if other=='D7': return 'P4_2_4' if e['source']==pid else 'P4_2_3'
            if other=='D6': return 'P4_2_1' if label=='Phiên bản nguồn hiện tại' else 'P4_2_2'
            if other=='D5': return 'P4_2_1'
            return 'P4_2_4' if label.startswith('COMPLETED') else 'P4_2_1'
        chain=[('P4_2_1','P4_2_2','Tác vụ được nhận và phiên bản nguồn'),('P4_2_2','P4_2_3','Kịch bản đúng phiên bản sẵn sàng đọc'),('P4_2_3','P4_2_4','Metadata/tệp hợp lệ hoặc dữ liệu lỗi'),('P4_2_2','P4_2_4','Dữ liệu lỗi dịch hoặc nguồn đã thay đổi')]
    result=[]
    for edge in EDGES:
        if (edge['source']==pid) != (edge['target']==pid):
            e=dict(edge); key='source' if e['source']==pid else 'target'; e[key]=owner(e); result.append(e)
    for i,(src,dst,label) in enumerate(chain,1):
        result.append({'id':f'L3_{pid}_{i}', 'source':src,'target':dst,'label':label,
                       'ucs':uc_codes([8 if pid=='P3_4' else 13]),'family':None,'source_section':'3.3 / '+('UC-08' if pid=='P3_4' else 'UC-13')})
    return children,result
