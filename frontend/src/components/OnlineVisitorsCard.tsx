import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../api/client';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getOnlineVisitors, OnlineVisitorsSummary } from '../api/onlineVisitors';
import { Icon } from './Icon';
export function OnlineVisitorsCard() {
  const baseUrl = getApiBaseUrl();
  const [data, setData] = useState<OnlineVisitorsSummary | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let stopped = false, busy = false;
    const load = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const result = await executeAuthenticatedInternalRequest(baseUrl, token => getOnlineVisitors(token, baseUrl));
        if (!stopped) { setData(result); setError(false); }
      } catch { if (!stopped) setError(true); }
      finally { busy = false; }
    };
    void load();
    const interval = setInterval(() => { void load(); }, 15000);
    return () => { stopped = true; clearInterval(interval); };
  }, [baseUrl, refresh]);
  return <section className="adm-stat adm-stat--info" aria-label="Khách đang online">
    <div className="adm-stat__top">
      <span className="adm-stat__label"><span className="adm-live-dot" aria-hidden="true" />Khách đang online · ước tính</span>
      <button type="button" className="adm-icon-btn" onClick={() => setRefresh(value => value + 1)} aria-label="Làm mới số online" title="Làm mới số online"><Icon name="refresh" /></button>
    </div>
    <strong className="adm-stat__value">{data ? data.count : '—'}</strong>
    <span className="adm-stat__hint">Phiên trình duyệt khách hoạt động trong 2 phút gần nhất, không phải số người duy nhất hay số vé.</span>
    {data && <span className="adm-stat__hint">Cập nhật: {new Date(data.generatedAt).toLocaleTimeString('vi-VN')} · Tự làm mới mỗi 15 giây.</span>}
    {error && <span role="status" className="adm-stat__hint" style={{ color: 'var(--adm-warning)', fontWeight: 600 }}>Chưa cập nhật được số online.{data ? ' Đang hiển thị số liệu của lần lấy thành công trước.' : ''}</span>}
  </section>;
}
