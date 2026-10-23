import React, { useState, useEffect, useRef } from 'react';
import { getMonitoringData, monitoringRange, MonitoringDto, MonitoringWindow } from '../api/monitoring';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';

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
    const interval = setInterval(fetchMonitoring, 30000);
    return () => { clearInterval(interval); requestSeq.current += 1; };
  }, [windowOption, baseUrl]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#132a13', margin: 0, fontWeight: 700 }}>
            Giám Sát Sức Khỏe & Sử Dụng Hệ Thống
          </h1>
          <p style={{ color: '#4b5563', fontSize: '0.86rem', margin: '4px 0 0' }}>
            Theo dõi tình trạng vận hành thời gian thực, phiên tham quan, doanh thu và tác vụ xử lý âm thanh
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={windowOption}
            onChange={(e) => { setData(null); setLastRefreshed(''); setWindowOption(e.target.value as MonitoringWindow); }}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.86rem' }}
          >
            <option value="1h">1 Giờ gần nhất</option>
            <option value="24h">24 Giờ gần nhất</option>
            <option value="7d">7 Ngày gần nhất</option>
            <option value="30d">30 Ngày gần nhất</option>
          </select>

          <button
            type="button"
            onClick={fetchMonitoring}
            disabled={loading}
            className="btn-secondary btn-sm"
            style={{ padding: '6px 12px' }}
          >
            🔄 {loading ? 'Đang nạp...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '16px' }}>
          Cập nhật lần cuối lúc: <strong>{lastRefreshed}</strong> (Tự động làm mới mỗi 30s)
        </div>
      )}

      {error && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{error}{data && ' Đang hiển thị dữ liệu của lần tải thành công trước.'}</div>
        </div>
      )}

      {/* SUC KHOE HE THONG (LIVENESS / READINESS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="tcv-card" style={{ padding: '18px', borderLeft: `5px solid ${data?.health.readiness.status === 'READY' ? '#16a34a' : '#dc2626'}` }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
            Trạng thái máy chủ
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: data?.health.readiness.status === 'READY' ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
            {data ? (data.health.readiness.status === 'READY' ? 'SẴN SÀNG (READY)' : 'CHƯA SẴN SÀNG (NOT_READY)') : 'CHƯA CÓ DỮ LIỆU'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
            Liveness: {data?.health.liveness.status ?? 'CHƯA XÁC ĐỊNH'}
          </div>
        </div>

        <div className="tcv-card" style={{ padding: '18px', borderLeft: `5px solid ${data?.health.database.status === 'READY' ? '#16a34a' : '#dc2626'}` }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
            Cơ sở dữ liệu MySQL
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: data?.health.database.status === 'READY' ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
            {data ? (data.health.database.status === 'READY' ? 'SẴN SÀNG (READY)' : 'KHÔNG KHẢ DỤNG') : 'CHƯA CÓ DỮ LIỆU'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
            Bộ lưu trữ dữ liệu 16 bảng nghiệp vụ
          </div>
        </div>

        <div className="tcv-card" style={{ padding: '18px', borderLeft: `5px solid ${data?.health.redis.status === 'READY' ? '#16a34a' : '#dc2626'}` }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
            Bộ nhớ tạm Redis
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: data?.health.redis.status === 'READY' ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
            {data ? (data.health.redis.status === 'READY' ? 'SẴN SÀNG (READY)' : 'KHÔNG KHẢ DỤNG') : 'CHƯA CÓ DỮ LIỆU'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
            Quản lý mã truy cập có TTL & Rate limit
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* PHIEN THAM QUAN & DOANH THU */}
          <div className="tcv-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#14532d', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎟️</span>
              <span>Phiên Tham Quan & Doanh Thu</span>
            </h3>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
              <div style={{ flex: 1, padding: '12px', background: '#f0fdf4', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', color: '#166534' }}>Phiên Active hiện tại</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                  {data.metrics.activePaidVisits.value ?? 'Không khả dụng'}
                </div>
              </div>

              <div style={{ flex: 1, padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>Giao dịch thành công ({windowOption})</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                  {data.metrics.paidPayments.value?.count ?? 'Không khả dụng'}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                Tổng doanh thu vé ghi nhận:
              </div>
              {data.metrics.paidPayments.value?.totals && data.metrics.paidPayments.value.totals.length > 0 ? (
                data.metrics.paidPayments.value.totals.map((t, idx) => (
                  <div key={idx} style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f766e' }}>
                    {Number(t.amount).toLocaleString('vi-VN')} {t.currency}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  {data.metrics.paidPayments.value === null ? 'Doanh thu không khả dụng' : 'Không có giao dịch trong khoảng thời gian này'}
                </div>
              )}
            </div>
          </div>

          {/* LUOT TAI BUNDLE THEO NGON NGU */}
          <div className="tcv-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#14532d', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌐</span>
              <span>Lượt Tải Gói Nội Dung Đa Ngôn Ngữ</span>
            </h3>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng lượt cấp gói: </span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {data.metrics.bundleAccess.value?.total ?? 'Không khả dụng'}
                </strong>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Khách duy nhất: </span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {data.metrics.bundleAccess.value?.uniqueSessions ?? 'Không khả dụng'}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Phân bổ theo ngôn ngữ yêu cầu:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.metrics.bundleAccess.value?.byLanguage && data.metrics.bundleAccess.value.byLanguage.length > 0 ? (
                data.metrics.bundleAccess.value.byLanguage.map((item) => (
                  <div
                    key={item.languageCode}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      fontSize: '0.84rem'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {item.languageCode.toUpperCase()}
                    </span>
                    <span style={{ color: '#475569' }}>
                      <strong>{item.total}</strong> lượt ({item.uniqueSessions} khách)
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>
                  {data.metrics.bundleAccess.value === null ? 'Thống kê lượt tải không khả dụng' : 'Chưa có lượt tải bundle nào trong khoảng thời gian này.'}
                </div>
              )}
            </div>
          </div>

          {/* TIEN TRINH AUDIO & CONTENT JOBS */}
          <div className="tcv-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#14532d', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span>
              <span>Tác Vụ Xử Lý Nội Dung & Âm Thanh</span>
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '4px' }}>
                Tổng tác vụ đa ngôn ngữ: <strong>{data.metrics.contentJobs.value?.total ?? 'Không khả dụng'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-pill ready" style={{ fontSize: '0.75rem' }}>
                  Hoàn tất: {data.metrics.contentJobs.value?.byStatus?.COMPLETED ?? 'Không khả dụng'}
                </span>
                <span className="status-pill idle" style={{ fontSize: '0.75rem' }}>
                  Đang xử lý: {data.metrics.contentJobs.value?.byStatus?.PROCESSING ?? 'Không khả dụng'}
                </span>
                <span className="status-pill unready" style={{ fontSize: '0.75rem' }}>
                  Chờ: {data.metrics.contentJobs.value?.byStatus?.PENDING ?? 'Không khả dụng'}
                </span>
                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  Lỗi: {data.metrics.contentJobs.value?.byStatus?.FAILED ?? 'Không khả dụng'}
                </span>
              </div>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '4px' }}>
                Tệp âm thanh MP3 thuyết minh: <strong>{data.metrics.audioRecords.value?.total ?? 'Không khả dụng'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-pill ready" style={{ fontSize: '0.75rem' }}>
                  Sẵn sàng phát: {data.metrics.audioRecords.value?.byStatus?.AVAILABLE ?? 'Không khả dụng'}
                </span>
                <span className="status-pill unready" style={{ fontSize: '0.75rem' }}>
                  Chờ tệp: {data.metrics.audioRecords.value?.byStatus?.PENDING ?? 'Không khả dụng'}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
