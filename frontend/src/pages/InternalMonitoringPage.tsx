import React, { useState, useEffect, useRef } from 'react';
import { getMonitoringData, monitoringRange, MonitoringDto, MonitoringWindow } from '../api/monitoring';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';
import { OnlineVisitorsCard } from '../components/OnlineVisitorsCard';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, LoadingState, EmptyState } from '../components/admin/AdminUI';

const windows: Record<MonitoringWindow, string> = { '1h': '1 Giờ gần nhất', '24h': '24 Giờ gần nhất', '7d': '7 Ngày gần nhất', '30d': '30 Ngày gần nhất' };
const unavailable = 'Không khả dụng';

const HealthCard: React.FC<{ title: string; ready: boolean | null; readyLabel: string; downLabel: string; hint: React.ReactNode; icon: React.ComponentProps<typeof Icon>['name'] }> = ({ title, ready, readyLabel, downLabel, hint, icon }) => (
  <div className={`adm-stat adm-stat--${ready === null ? 'neutral' : ready ? 'success' : 'danger'}`}>
    <div className="adm-stat__top"><span className="adm-stat__label">{title}</span><span className="adm-stat__icon"><Icon name={icon} /></span></div>
    <strong className="adm-stat__value" style={{ fontSize: 18, color: ready === null ? 'var(--adm-text-3)' : ready ? 'var(--adm-success)' : 'var(--adm-danger)' }}>
      {ready === null ? 'CHƯA CÓ DỮ LIỆU' : ready ? readyLabel : downLabel}
    </strong>
    <span className="adm-stat__hint">{hint}</span>
  </div>
);
const Metric: React.FC<{ label: string; value: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = ({ label, value, tone = 'neutral' }) => (
  <div className="adm-row adm-row--between" style={{ padding: '10px 0', borderBottom: '1px solid var(--adm-border)', fontSize: 13 }}>
    <span className="adm-muted">{label}</span><Badge tone={value === unavailable ? 'neutral' : tone}>{value}</Badge>
  </div>
);

export const InternalMonitoringPage: React.FC = () => {
  const baseUrl = getApiBaseUrl();

  const [data, setData] = useState<MonitoringDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const [windowOption, setWindowOption] = useState<MonitoringWindow>('24h');
  const requestSeq = useRef(0);

  const fetchMonitoring = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await executeAuthenticatedInternalRequest(baseUrl, token => getMonitoringData(monitoringRange(windowOption), token, baseUrl));
      if (seq !== requestSeq.current) return;
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu giám sát hệ thống');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    // Polling moi 30 giay
    // Skip background polls while the tab is hidden (same rule as the dashboard).
    const interval = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') fetchMonitoring(); }, 30000);
    return () => { clearInterval(interval); requestSeq.current += 1; };
  }, [windowOption, baseUrl]);

  const health = data?.health;
  const payments = data?.metrics.paidPayments.value;
  const bundles = data?.metrics.bundleAccess.value;
  const chatbot = data?.metrics.chatbot.value;
  const jobs = data?.metrics.contentJobs.value;
  const audios = data?.metrics.audioRecords.value;
  const maxLanguage = Math.max(1, ...(bundles?.byLanguage?.map(item => item.total) ?? [1]));

  return (
    <AdminPage>
      <PageHeader eyebrow="Tổng quan · Quản trị" title="Giám sát sức khỏe & sử dụng hệ thống"
        description="Theo dõi tình trạng vận hành thời gian thực, phiên tham quan, doanh thu và tác vụ xử lý âm thanh."
        actions={<>
          <label className="sr-only" htmlFor="monitoring-window">Khoảng thời gian</label>
          <select id="monitoring-window" value={windowOption} style={{ width: 'auto' }}
            onChange={(e) => { setData(null); setLastRefreshed(''); setWindowOption(e.target.value as MonitoringWindow); }}>
            {Object.entries(windows).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={fetchMonitoring} disabled={loading} className="adm-btn adm-btn--secondary"><Icon name="refresh" />{loading ? 'Đang nạp...' : 'Làm mới'}</button>
        </>} />

      {lastRefreshed && <p className="adm-small adm-muted" style={{ margin: '12px 0 0' }}><span className="adm-live-dot" aria-hidden="true" />Cập nhật lần cuối lúc: <strong>{lastRefreshed}</strong> (Tự động làm mới mỗi 30s)</p>}
      {error && <Alert tone="danger">{error}{data && ' Đang hiển thị dữ liệu của lần tải thành công trước.'}</Alert>}

      <section aria-label="Sức khỏe hệ thống" className="adm-grid adm-grid--4">
        <HealthCard title="Trạng thái máy chủ" icon="activity" ready={health ? health.readiness.status === 'READY' : null}
          readyLabel="SẴN SÀNG (READY)" downLabel="CHƯA SẴN SÀNG (NOT_READY)" hint={<>Liveness: {health?.liveness.status ?? 'CHƯA XÁC ĐỊNH'}</>} />
        <HealthCard title="Cơ sở dữ liệu MySQL" icon="book" ready={health ? health.database.status === 'READY' : null}
          readyLabel="SẴN SÀNG (READY)" downLabel="KHÔNG KHẢ DỤNG" hint="Bộ lưu trữ dữ liệu 16 bảng nghiệp vụ" />
        <HealthCard title="Bộ nhớ tạm Redis" icon="clock" ready={health ? health.redis.status === 'READY' : null}
          readyLabel="SẴN SÀNG (READY)" downLabel="KHÔNG KHẢ DỤNG" hint="Quản lý mã truy cập có TTL & Rate limit" />
        <OnlineVisitorsCard />
      </section>

      {!data && !error && <LoadingState label="Đang tải số liệu giám sát…" />}
      {data && <div className="adm-grid adm-grid--2" style={{ alignItems: 'start' }}>
        <Card title="Phiên tham quan & doanh thu" description={`Khoảng: ${windows[windowOption]}`}>
          <div className="adm-grid adm-grid--2" style={{ gap: 12 }}>
            <div className="adm-stat adm-stat--success"><span className="adm-stat__label">Phiên Active hiện tại</span><strong className="adm-stat__value">{data.metrics.activePaidVisits.value ?? unavailable}</strong></div>
            <div className="adm-stat adm-stat--info"><span className="adm-stat__label">Giao dịch thành công ({windowOption})</span><strong className="adm-stat__value">{payments?.count ?? unavailable}</strong></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <p className="adm-label" style={{ margin: '0 0 6px' }}>Tổng doanh thu vé ghi nhận</p>
            {payments?.totals && payments.totals.length > 0
              ? payments.totals.map((t, idx) => <div key={idx} style={{ fontSize: 22, fontWeight: 750, color: 'var(--adm-brand)' }}>{Number(t.amount).toLocaleString('vi-VN')} {t.currency}</div>)
              : <p className="adm-muted" style={{ margin: 0 }}>{payments === null ? 'Doanh thu không khả dụng' : 'Không có giao dịch trong khoảng thời gian này'}</p>}
          </div>
        </Card>

        <Card title="Lượt tải gói nội dung đa ngôn ngữ" description="Số lượt cấp bundle không đồng nghĩa số khách duy nhất.">
          <div className="adm-grid adm-grid--2" style={{ gap: 12 }}>
            <div className="adm-stat"><span className="adm-stat__label">Tổng lượt cấp gói</span><strong className="adm-stat__value">{bundles?.total ?? unavailable}</strong></div>
            <div className="adm-stat"><span className="adm-stat__label">Khách duy nhất</span><strong className="adm-stat__value">{bundles?.uniqueSessions ?? unavailable}</strong></div>
          </div>
          <p className="adm-label" style={{ margin: '16px 0 6px' }}>Phân bổ theo ngôn ngữ yêu cầu</p>
          {bundles?.byLanguage && bundles.byLanguage.length > 0 ? <div className="adm-stack" style={{ gap: 10 }}>
            {bundles.byLanguage.map(item => <div key={item.languageCode}>
              <div className="adm-row adm-row--between" style={{ fontSize: 13 }}><strong>{item.languageCode.toUpperCase()}</strong><span className="adm-muted"><strong>{item.total}</strong> lượt ({item.uniqueSessions} khách)</span></div>
              <span className="adm-bar-track" style={{ maxWidth: 'none' }}><span style={{ width: `${item.total / maxLanguage * 100}%` }} /></span>
            </div>)}
          </div> : <EmptyState icon="globe" title={bundles === null ? 'Thống kê lượt tải không khả dụng' : 'Chưa có lượt tải bundle nào trong khoảng thời gian này.'} />}
        </Card>

        <Card title="Lượt hỏi chatbot được ghi nhận">
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>Trong khoảng UTC đã chọn: <strong>{chatbot?.total ?? unavailable}</strong></p>
          <Metric label="Có câu trả lời" value={chatbot?.byStatus.SUCCESS ?? unavailable} tone="success" />
          <Metric label="Không có ngữ cảnh" value={chatbot?.byStatus.NO_CONTEXT ?? unavailable} tone="warning" />
          <Metric label="Lỗi xử lý" value={chatbot?.byStatus.FAILED ?? unavailable} tone="danger" />
          <p className="adm-small adm-muted" style={{ marginBottom: 0 }}>Đây là số lượt đã ghi trong nhật ký, không phải đánh giá độ đúng của câu trả lời.</p>
        </Card>

        <Card title="Tác vụ xử lý nội dung & âm thanh">
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>Tổng tác vụ đa ngôn ngữ: <strong>{jobs?.total ?? unavailable}</strong></p>
          <Metric label="Hoàn tất" value={jobs?.byStatus?.COMPLETED ?? unavailable} tone="success" />
          <Metric label="Đang xử lý" value={jobs?.byStatus?.PROCESSING ?? unavailable} tone="info" />
          <Metric label="Chờ" value={jobs?.byStatus?.PENDING ?? unavailable} tone="warning" />
          <Metric label="Lỗi" value={jobs?.byStatus?.FAILED ?? unavailable} tone="danger" />
          <p style={{ margin: '16px 0 8px', fontSize: 14 }}>Bản ghi âm thanh: <strong>{audios?.total ?? unavailable}</strong></p>
          <Metric label="Trạng thái AVAILABLE" value={audios?.byStatus?.AVAILABLE ?? unavailable} tone="success" />
          <Metric label="Chờ tệp" value={audios?.byStatus?.PENDING ?? unavailable} tone="warning" />
        </Card>
      </div>}
    </AdminPage>
  );
};
