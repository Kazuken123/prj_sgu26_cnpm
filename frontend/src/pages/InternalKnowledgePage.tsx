import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getApiBaseUrl } from '../api/client';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { Icon } from '../components/Icon';
import { deactivateKnowledge, getKnowledge, KnowledgeDocument, KnowledgeList, KnowledgeResult, listKnowledge, reprocessKnowledge, saveKnowledge } from '../api/rag';
import { AdminPage, PageHeader, Alert, Badge, StatusBadge, Field, EmptyState, LoadingState, Pagination, ConfirmDialog } from '../components/admin/AdminUI';

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
  return <AdminPage>
    <PageHeader eyebrow="Nội dung thuyết minh" title="Kho tri thức" description="Chuẩn bị tài liệu có nguồn để phần hỏi đáp có thông tin đối chiếu."
      actions={<button className="adm-btn adm-btn--primary" type="button" disabled={busy} onClick={() => {
        if (dirty) { setError('Lưu hoặc đóng bản nháp hiện tại trước khi thêm tài liệu.'); return; }
        setDraft({ id: null, title: '', content: '', source: '' }); setDirty(false); setConflict(false); setError(''); setNotice('');
      }}><Icon name="plus" />Thêm tài liệu</button>} />
    {error && <Alert tone="danger" onDismiss={() => setError('')}>{error}</Alert>}
    {notice && <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>}
    <div className="knowledge-workspace">
      <section className="adm-card adm-card--flush" aria-label="Danh sách tài liệu">
        <div className="adm-toolbar">
          <div className="adm-field"><label htmlFor="knowledge-status">Trạng thái</label>
            <select id="knowledge-status" aria-label="Trạng thái tài liệu" disabled={busy} value={status} onChange={e => { setStatus(e.target.value); setPage(1); setError(''); }}><option value="">Tất cả</option><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Chưa sử dụng</option></select></div>
          <span className="adm-toolbar__spacer" />
          {data && <Badge>{data.total} tài liệu</Badge>}
          <button className="adm-btn adm-btn--secondary" type="button" disabled={loading || busy} onClick={() => { setError(''); setReload(n => n + 1); }}><Icon name="refresh" />Tải lại danh sách</button>
        </div>
        {loading ? <LoadingState label="Đang tải tài liệu…" /> : data && <>
          <div className="adm-card__body">{data.items.map(document => <article key={document.documentId} className="knowledge-item">
            <div className="adm-row adm-row--between" style={{ alignItems: 'flex-start' }}>
              <h3>{document.title}</h3>
              <StatusBadge status={document.processingStatus} label={stateLabels[document.processingStatus]} />
            </div>
            <p className="adm-small adm-muted" style={{ marginTop: 0 }}>Phiên bản {document.contentVersion} · {document.chunkCount} đoạn kiến thức</p>
            {document.source && <p className="knowledge-source">Nguồn: {document.source}</p>}
            <details><summary className="adm-link" style={{ cursor: 'pointer' }}>Chi tiết xử lý</summary><p>{document.chunkCount} đoạn kiến thức · Mô hình: {document.embeddingModel || 'Chưa tạo chỉ mục'}</p>{document.lastError && <p>Mã lỗi: <code>{document.lastError}</code></p>}</details>
            <div className="knowledge-actions">
              <button className="adm-btn adm-btn--secondary adm-btn--sm" type="button" disabled={busy} onClick={() => void edit(document.documentId)}><Icon name="edit" />Mở tài liệu</button>
              <button className="adm-btn adm-btn--ghost adm-btn--sm" type="button" disabled={busy || document.processingStatus === 'DEACTIVATED'} onClick={() => void action(document, false)}><Icon name="refresh" />Xử lý lại</button>
              <button className="adm-btn adm-btn--danger-soft adm-btn--sm" type="button" disabled={busy || document.processingStatus === 'DEACTIVATED'} onClick={() => { if (dirty) setError('Lưu hoặc đóng bản nháp trước khi thao tác với tài liệu.'); else setConfirm(document); }}>Ngừng sử dụng</button>
            </div>
          </article>)}
          {!data.items.length && <EmptyState icon="book" title="Chưa có tài liệu trong danh sách này." />}</div>
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(data.total / data.limit))} disabled={busy} summary={<>{data.total} tài liệu</>}
            prevLabel="Trang trước" nextLabel="Trang sau" onChange={next => setPage(next)} />
        </>}
      </section>
      {draft && <section className="adm-card" aria-label="Biên tập tài liệu">
        <div className="adm-card__head"><div><h2 className="adm-card__title">{draft.id === null ? 'Thêm tài liệu mới' : 'Chỉnh sửa tài liệu'}</h2>
          <p className="adm-card__desc">Chỉ nhập nội dung đã được nhóm duyệt. Không đưa mật khẩu, token hoặc thông tin riêng của khách vào tài liệu.</p></div>
          {dirty && <Badge tone="warning" dot>Chưa lưu</Badge>}</div>
        <form onSubmit={save} className="adm-form">
          <Field label="Tiêu đề" htmlFor="knowledge-title" required><input id="knowledge-title" aria-label="Tiêu đề tài liệu" required maxLength={255} disabled={busy} value={draft.title} onChange={e => { setDraft({ ...draft, title: e.target.value }); setDirty(true); }} /></Field>
          <Field label="Nguồn tham khảo" htmlFor="knowledge-source" hint="Khuyến nghị nhập để chatbot trích dẫn được nguồn."><input id="knowledge-source" aria-label="Nguồn tài liệu" maxLength={1000} disabled={busy} value={draft.source} onChange={e => { setDraft({ ...draft, source: e.target.value }); setDirty(true); }} placeholder="Đường dẫn hoặc tên tài liệu tham khảo" /></Field>
          <Field label="Nội dung" htmlFor="knowledge-content" required hint={`${draft.content.length}/20000 ký tự · Toàn bộ yêu cầu tối đa 32 KB.`}><textarea id="knowledge-content" aria-label="Nội dung tài liệu" required rows={13} maxLength={20000} disabled={busy} value={draft.content} onChange={e => { setDraft({ ...draft, content: e.target.value }); setDirty(true); }} /></Field>
          <div className="adm-form-actions">
            <button className="adm-btn adm-btn--secondary" type="button" disabled={busy} onClick={() => { setDraft(null); setDirty(false); setConflict(false); }}>Đóng bản nháp</button>
            <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Lưu và xử lý tài liệu'}</button>
          </div>
        </form>
        {conflict && draft.id !== null && <Alert tone="warning" action={<button className="adm-btn adm-btn--secondary adm-btn--sm" type="button" disabled={busy} onClick={() => void edit(draft.id!, true)}>Tải bản mới — thay bản nháp đang mở</button>}>Bản nháp của bạn chưa ghi đè lên bản mới.</Alert>}
      </section>}
    </div>
    <ConfirmDialog open={!!confirm} tone="danger" title="Ngừng sử dụng tài liệu?" confirmLabel="Xác nhận ngừng sử dụng" busy={busy}
      onCancel={() => setConfirm(null)} onConfirm={() => { if (confirm) void action(confirm, true); }}>
      {confirm && <p>Ngừng sử dụng “{confirm.title}”? Bạn có thể sửa và xử lý lại để sử dụng tài liệu về sau.</p>}
    </ConfirmDialog>
  </AdminPage>;
}
