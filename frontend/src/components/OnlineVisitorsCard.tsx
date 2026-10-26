import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../api/client';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getOnlineVisitors, OnlineVisitorsSummary } from '../api/onlineVisitors';
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
  return <section className="tcv-card" aria-label="Khách đang online" style={{ padding: '20px', marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0, fontSize: '1rem' }}>Khách đang online · ước tính</h2>
        <p style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0' }}>{data ? data.count : '—'}</p></div>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setRefresh(value => value + 1)}>Làm mới số online</button>
    </div>
    <p style={{ margin: '4px 0', fontSize: '.85rem', color: '#4b5563' }}>Số phiên trình duyệt khách có hoạt động trong 2 phút gần nhất, không phải số người duy nhất hay số vé.</p>
    {data && <p style={{ margin: '4px 0', fontSize: '.8rem' }}>Cập nhật: {new Date(data.generatedAt).toLocaleTimeString('vi-VN')} · Tự làm mới mỗi 15 giây.</p>}
    {error && <p role="status" style={{ color: '#9a3412', margin: '6px 0' }}>Chưa cập nhật được số online.{data ? ' Đang hiển thị số liệu của lần lấy thành công trước.' : ''}</p>}
  </section>;
}
