import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getApiBaseUrl } from '../api/client';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { deactivateKnowledge, getKnowledge, KnowledgeDocument, KnowledgeList, KnowledgeResult, listKnowledge, reprocessKnowledge, saveKnowledge } from '../api/rag';

const stateLabels = { READY: 'Sẵn sàng sử dụng', PENDING: 'Chưa hoàn tất xử lý', FAILED: 'Xử lý chưa thành công', DEACTIVATED: 'Đã ngừng sử dụng' };
type Draft = { id: number | null; version?: number; title: string; content: string; source: string };
export function InternalKnowledgePage() {
  const baseUrl = getApiBaseUrl(), navigate = useNavigate();
  const [data, setData] = useState<KnowledgeList | null>(null);
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null), [dirty, setDirty] = useState(false), [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<KnowledgeDocument | null>(null);
  const mounted = useRef(true), sequence = useRef(0), mutation = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; }; }, []);
  const authenticated = <T,>(work: (token: string) => Promise<T>) => executeAuthenticatedInternalRequest(baseUrl, work, () => { if (mounted.current) navigate('/internal/login', { replace: true }); });
  useEffect(() => {
    const controller = new AbortController(), current = ++sequence.current;
    setLoading(true); setData(null);
    void authenticated(token => listKnowledge(token, baseUrl, page, status, controller.signal)).then(result => {
      if (mounted.current && current === sequence.current) setData(result);
    }).catch(e => {
      if (!controller.signal.aborted && mounted.current && current === sequence.current) setError(e instanceof ApiError ? e.message : 'Chưa tải được kho tri thức.');
    }).finally(() => { if (mounted.current && current === sequence.current) setLoading(false); });
    return () => controller.abort();
  }, [baseUrl, page, status, reload]);
  const setDocument = (document: KnowledgeDocument) => {
    setDraft({ id: document.documentId, version: document.contentVersion, title: document.title, content: document.content || '', source: document.source || '' });
    setDirty(false); setConflict(false);
  };
  const edit = async (id: number, discard = false) => {
    if (mutation.current) return;
    if (dirty && !discard) { setError('Bạn còn bản nháp chưa lưu. Lưu hoặc đóng bản nháp trước khi mở tài liệu khác.'); return; }
    mutation.current = true; setBusy(true); setError('');
    try { const document = await authenticated(token => getKnowledge(id, token, baseUrl)); if (mounted.current) setDocument(document); }
    catch (e) { if (mounted.current) setError(e instanceof ApiError ? e.message : 'Chưa mở được tài liệu.'); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const resultNotice = (result: KnowledgeResult) => {
    const mode = result.processing.mode === 'MOCK' ? ' Chỉ mục được tạo bằng mô phỏng; chưa phải embedding AI thật.' : '';
    return result.processing.result === 'PUBLISHED' ? 'Đã lưu và hoàn tất xử lý tài liệu.' + mode :
      result.processing.result === 'SUPERSEDED' ? 'Tài liệu đã thay đổi trong lúc xử lý. Kết quả cũ đã bị bỏ qua; hãy tải bản hiện tại.' :
      'Tài liệu đã được lưu nhưng lần xử lý này chưa thành công. Có thể xử lý lại; bộ nội dung đã công bố trước đó, nếu có, được giữ nguyên.';
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || mutation.current) return;
    const input = { title: draft.title.trim(), content: draft.content.trim(), source: draft.source.trim() || null,
      ...(draft.id !== null ? { expectedVersion: draft.version } : {}) };
    if (!input.title || !input.content) { setError('Nhập tiêu đề và nội dung tài liệu.'); return; }
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 32768) { setError('Nội dung gửi vượt 32 KB. Hãy chia thành các tài liệu nhỏ hơn; bản nháp vẫn được giữ.'); return; }
    mutation.current = true; setBusy(true); setError(''); setNotice(''); setConflict(false);
    try {
      const result = await authenticated(token => saveKnowledge(draft.id, input, token, baseUrl));
      if (!mounted.current) return;
      setDocument(result.document); setNotice(resultNotice(result)); setReload(n => n + 1);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof ApiError && e.status === 409) { setConflict(true); setError('Tài liệu đã được người khác thay đổi. Bản nháp của bạn vẫn được giữ; chưa ghi đè lên bản mới.'); }
      else if (e instanceof ApiError && e.status === 0) setError('Chưa xác nhận được kết quả lưu. Kiểm tra danh sách trước khi gửi lại để tránh tạo tài liệu trùng; bản nháp vẫn được giữ.');
      else setError(e instanceof ApiError ? e.message : 'Chưa lưu được tài liệu. Bản nháp vẫn được giữ.');
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const action = async (document: KnowledgeDocument, deactivate: boolean) => {
    if (mutation.current) return;
    if (dirty) { setError('Lưu hoặc đóng bản nháp trước khi thao tác với tài liệu.'); return; }
    mutation.current = true; setBusy(true); setError(''); setNotice(''); setConfirm(null);
    try {
      if (deactivate) {
        const result = await authenticated(token => deactivateKnowledge(document.documentId, token, baseUrl));
        if (!mounted.current) return;
        if (draft?.id === result.documentId) setDocument(result);
        setNotice('Đã ngừng sử dụng tài liệu. Các câu hỏi mới sẽ không truy hồi tài liệu này.');
      } else {
        const result = await authenticated(token => reprocessKnowledge(document.documentId, token, baseUrl));
        if (!mounted.current) return;
        if (draft?.id === result.document.documentId) setDocument(result.document);
        setNotice(resultNotice(result));
      }
      setReload(n => n + 1);
    } catch (e) { if (mounted.current) setError(e instanceof ApiError ? e.message : 'Chưa thực hiện được thao tác.'); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  return <div className="ops-page knowledge-page">
    <div className="ops-section-title"><div><h1>Kho tri thức</h1><p>Chuẩn bị tài liệu có nguồn để phần hỏi đáp có thông tin đối chiếu.</p></div>
      <button className="ops-primary" type="button" disabled={busy} onClick={() => {
        if (dirty) { setError('Lưu hoặc đóng bản nháp hiện tại trước khi thêm tài liệu.'); return; }
        setDraft({ id: null, title: '', content: '', source: '' }); setDirty(false); setConflict(false); setError(''); setNotice('');
      }}>Thêm tài liệu</button></div>
    {error && <p className="ops-alert" role="alert">{error}</p>}
    {notice && <p className="ops-alert" role="status">{notice}</p>}
    {confirm && <div className="ops-alert" role="alert"><p>Ngừng sử dụng “{confirm.title}”? Bạn có thể sửa và xử lý lại để sử dụng tài liệu về sau.</p><button className="ops-primary" type="button" onClick={() => void action(confirm, true)}>Xác nhận ngừng sử dụng</button><button className="ops-secondary" type="button" onClick={() => setConfirm(null)}>Hủy</button></div>}
    <div className="knowledge-workspace">
      <section className="ops-panel" aria-label="Danh sách tài liệu">
        <div className="knowledge-filters"><label>Trạng thái<select aria-label="Trạng thái tài liệu" disabled={busy} value={status} onChange={e => { setStatus(e.target.value); setPage(1); setError(''); }}><option value="">Tất cả</option><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Chưa sử dụng</option></select></label>
          <button className="ops-secondary" type="button" disabled={loading || busy} onClick={() => { setError(''); setReload(n => n + 1); }}>Tải lại danh sách</button></div>
        {loading ? <p role="status">Đang tải tài liệu…</p> : data && <>
          <p>{data.total} tài liệu</p><div className="knowledge-items">{data.items.map(document => <article key={document.documentId} className="knowledge-item">
            <h2>{document.title}</h2><p>{stateLabels[document.processingStatus]} · Phiên bản {document.contentVersion}</p>
            {document.source && <p className="knowledge-source">Nguồn: {document.source}</p>}
            <details><summary>Chi tiết xử lý</summary><p>{document.chunkCount} đoạn kiến thức · Mô hình: {document.embeddingModel || 'Chưa tạo chỉ mục'}</p>{document.lastError && <p>Mã lỗi: {document.lastError}</p>}</details>
            <div className="knowledge-actions"><button className="ops-secondary" type="button" disabled={busy} onClick={() => void edit(document.documentId)}>Mở tài liệu</button>
              <button className="ops-secondary" type="button" disabled={busy || document.processingStatus === 'DEACTIVATED'} onClick={() => void action(document, false)}>Xử lý lại</button>
              <button className="ops-secondary" type="button" disabled={busy || document.processingStatus === 'DEACTIVATED'} onClick={() => { if (dirty) setError('Lưu hoặc đóng bản nháp trước khi thao tác với tài liệu.'); else setConfirm(document); }}>Ngừng sử dụng</button></div>
          </article>)}</div>
          {!data.items.length && <p>Chưa có tài liệu trong danh sách này.</p>}
          <div className="knowledge-actions"><button className="ops-secondary" type="button" disabled={page <= 1 || busy} onClick={() => setPage(n => n - 1)}>Trang trước</button><span>Trang {page}</span><button className="ops-secondary" type="button" disabled={page * data.limit >= data.total || busy} onClick={() => setPage(n => n + 1)}>Trang sau</button></div>
        </>}
      </section>
      {draft && <section className="ops-panel" aria-label="Biên tập tài liệu"><h2>{draft.id === null ? 'Thêm tài liệu mới' : 'Chỉnh sửa tài liệu'}</h2>
        <p>Chỉ nhập nội dung đã được nhóm duyệt. Không đưa mật khẩu, token hoặc thông tin riêng của khách vào tài liệu.</p>
        <form onSubmit={save} className="knowledge-form">
          <label>Tiêu đề<input aria-label="Tiêu đề tài liệu" required maxLength={255} disabled={busy} value={draft.title} onChange={e => { setDraft({ ...draft, title: e.target.value }); setDirty(true); }} /></label>
          <label>Nguồn tham khảo<input aria-label="Nguồn tài liệu" maxLength={1000} disabled={busy} value={draft.source} onChange={e => { setDraft({ ...draft, source: e.target.value }); setDirty(true); }} placeholder="Đường dẫn hoặc tên tài liệu tham khảo" /></label>
          <label>Nội dung<textarea aria-label="Nội dung tài liệu" required rows={13} maxLength={20000} disabled={busy} value={draft.content} onChange={e => { setDraft({ ...draft, content: e.target.value }); setDirty(true); }} /></label>
          <small>{draft.content.length}/20000 ký tự · Toàn bộ yêu cầu tối đa 32 KB.</small>
          <div className="knowledge-actions"><button className="ops-primary" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Lưu và xử lý tài liệu'}</button><button className="ops-secondary" type="button" disabled={busy} onClick={() => { setDraft(null); setDirty(false); setConflict(false); }}>Đóng bản nháp</button></div>
        </form>
        {conflict && draft.id !== null && <button className="ops-secondary" type="button" disabled={busy} onClick={() => void edit(draft.id!, true)}>Tải bản mới — thay bản nháp đang mở</button>}
      </section>}
    </div>
  </div>;
}
