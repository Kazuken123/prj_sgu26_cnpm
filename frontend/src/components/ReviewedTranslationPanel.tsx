import { useRef, useState } from 'react';
import { getApiBaseUrl, requestApi } from '../api/client';
import { executeAuthenticatedInternalRequest } from '../api/auth';
type Text = { name: string; description: string; audioScript: string };
type TranslationView = { sourceVersion: number; source: Text | null; translation: (Text & { status: string; sourceVersion: number }) | null;
  job: { status: string } | null; outcome?: string };
const languages = [['en','English'],['zh-Hans','中文（简体）'],['ko','한국어'],['ja','日本語'],['ru','Русский'],['fr','Français'],
  ['de','Deutsch'],['es','Español'],['it','Italiano'],['pt-BR','Português (Brasil)'],['nl','Nederlands'],['pl','Polski'],['cs','Čeština'],['tr','Türkçe']];
export function ReviewedTranslationPanel({ poiId }: { poiId: number }) {
  const base = getApiBaseUrl(), epoch = useRef(0);
  const [language, setLanguage] = useState('en'), [view, setView] = useState<TranslationView | null>(null);
  const [text, setText] = useState<Text>({ name: '', description: '', audioScript: '' });
  const [busy, setBusy] = useState(false), [approved, setApproved] = useState(false), [message, setMessage] = useState('');
  const request = async (save: boolean) => {
    if (busy || (save && (!view || !approved))) return;
    const current = ++epoch.current; setBusy(true); setMessage('');
    try {
      const data = await executeAuthenticatedInternalRequest(base, async token => {
        const response = await requestApi<{ data: TranslationView }>({ method: save ? 'PUT' : 'GET',
          path: `/api/admin/pois/${poiId}/translations/${language}`, token, overrideBaseUrl: base,
          ...(save ? { body: { sourceVersion: view!.sourceVersion, ...text } } : {}) });
        return response.data.data;
      });
      if (current !== epoch.current) return;
      setView(data); setText(data.translation ? { name: data.translation.name, description: data.translation.description, audioScript: data.translation.audioScript } : { name: '', description: '', audioScript: '' }); setApproved(false);
      setMessage(save ? data.outcome === 'UNCHANGED' ? 'Nội dung không đổi; bản hiện hành được giữ nguyên.' : 'Đã lưu bản dịch được duyệt. Kiểm tra tác vụ âm thanh ở danh sách bên dưới.' : 'Đã tải nội dung để đối chiếu.');
    } catch (err) { if (current === epoch.current) setMessage(err instanceof Error ? err.message : 'Chưa xử lý được bản dịch. Nội dung đang nhập vẫn được giữ.'); }
    finally { if (current === epoch.current) setBusy(false); }
  };
  const published = view?.translation?.status === 'READY' && view.translation.sourceVersion === view.sourceVersion;
  return <section aria-label="Bản dịch đã duyệt" className="adm-card">
    <div className="adm-card__head">
      <div><h2 className="adm-card__title">Bản dịch đã duyệt</h2><p className="adm-card__desc">Nhập bản dịch đã được rà soát bên ngoài hệ thống. Tiếng Việt sửa ở nội dung nguồn. Bản đã xuất bản được giữ nguyên; không tự dịch hoặc tạo giọng đọc tại đây.</p></div>
    </div>
    <div className="adm-toolbar" style={{ padding: 0, border: 0 }}>
      <div className="adm-field"><label htmlFor={`reviewed-language-${poiId}`}>Ngôn ngữ</label>
        <select id={`reviewed-language-${poiId}`} aria-label="Ngôn ngữ bản dịch" value={language} disabled={busy} onChange={e => { epoch.current++; setLanguage(e.target.value); setView(null); setApproved(false); setMessage(''); setText({ name: '', description: '', audioScript: '' }); }}>{languages.map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></div>
      <button type="button" className="adm-btn adm-btn--secondary" disabled={busy} onClick={() => void request(false)}>Tải bản dịch để đối chiếu</button>
    </div>
    {message && <p role="status" className="adm-alert adm-alert--info" style={{ marginTop: 16 }}>{message}</p>}
    {view && <div className="adm-stack" style={{ marginTop: 16 }}>
      <p className="adm-small adm-muted" style={{ margin: 0 }}>Phiên bản nguồn: {view.sourceVersion}. {published ? 'Bản hiện hành được bảo vệ, không ghi đè.' : 'Có thể nhập bản đã duyệt nếu tác vụ và phiên bản còn phù hợp.'}</p>
      {view.source && <details style={{ border: '1px solid var(--adm-border)', borderRadius: 'var(--adm-r-md)', padding: '10px 14px', background: 'var(--adm-surface-2)' }}><summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Đối chiếu nguồn tiếng Việt</summary><h3 style={{ fontSize: 15 }}>{view.source.name}</h3><p style={{ fontSize: 13 }}>{view.source.description}</p><p style={{ fontSize: 13 }}>{view.source.audioScript}</p></details>}
      {(['name','description','audioScript'] as const).map((key,index) => <div className="adm-field" key={key}><label htmlFor={`reviewed-${key}-${poiId}`}>{['Tên đã dịch','Giới thiệu đã dịch','Kịch bản đọc đã dịch'][index]}</label>
        <textarea id={`reviewed-${key}-${poiId}`} aria-label={['Tên đã dịch','Giới thiệu đã dịch','Kịch bản đọc đã dịch'][index]} value={text[key]} maxLength={key === 'name' ? 255 : 6000} rows={key === 'name' ? 2 : 5} disabled={busy || published || view.job?.status === 'PROCESSING'}
          onChange={e => { setText(prev => ({ ...prev, [key]: e.target.value })); setApproved(false); }} /></div>)}
      {!published && <label className="adm-check"><input type="checkbox" checked={approved} disabled={busy} onChange={e => setApproved(e.target.checked)} /> Tôi xác nhận bản dịch đã được duyệt và khớp nguồn đang đối chiếu.</label>}
      <div className="adm-form-actions">
        <button type="button" className="adm-btn adm-btn--primary" disabled={busy || published || !approved || view.job?.status === 'PROCESSING' || Object.values(text).some(t => !t.trim())}
          onClick={() => void request(true)}>Lưu bản dịch đã duyệt</button>
      </div>
      <p className="adm-small adm-muted" style={{ margin: 0 }}>Staging hiện dùng bộ audio cố định; lưu văn bản không có nghĩa đã có audio mới. Tác vụ lỗi dùng chức năng thử lại sau khi đã có bản dịch phù hợp.</p>
    </div>}
  </section>;
}
