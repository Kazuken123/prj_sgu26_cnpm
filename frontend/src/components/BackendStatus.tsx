import React, { useState, useEffect, useCallback } from 'react';
import { checkBackendReadiness, ReadinessState } from '../api/health';
import { getApiBaseUrl } from '../api/client';

export const BackendStatus: React.FC = () => {
  const defaultUrl = getApiBaseUrl();
  const [targetUrl, setTargetUrl] = useState<string>(defaultUrl);
  const [readiness, setReadiness] = useState<ReadinessState>({ status: 'idle' });

  const handleCheck = useCallback(async (urlToTest: string) => {
    setReadiness({ status: 'loading' });
    const result = await checkBackendReadiness(urlToTest);
    setReadiness(result);
  }, []);

  // Chi kiem tra mot lan khi component mount, khong polling lien tuc
  useEffect(() => {
    handleCheck(defaultUrl);
  }, [handleCheck, defaultUrl]);

  return (
    <section className="inspector-box" aria-labelledby="inspector-heading">
      <div className="inspector-header">
        <div>
          <h2 id="inspector-heading" className="inspector-title">
            Kiểm tra kết nối Backend (Kỹ thuật Sprint 0)
          </h2>
          <div className="inspector-caption">
            Khu vực kỹ thuật dành cho nhóm phát triển xác nhận kết nối và hợp đồng API readiness. Thông tin này phân biệt với giao diện dành cho khách tham quan.
          </div>
        </div>

        <div>
          {readiness.status === 'idle' && (
            <span className="status-pill idle">Chưa kiểm tra</span>
          )}
          {readiness.status === 'loading' && (
            <span className="status-pill loading">Đang kiểm tra kết nối...</span>
          )}
          {readiness.status === 'ready' && (
            <span className="status-pill ready">Backend sẵn sàng (HTTP 200)</span>
          )}
          {readiness.status === 'unready' && (
            <span className="status-pill unready">Backend chưa sẵn sàng (HTTP 503)</span>
          )}
          {readiness.status === 'error' && (
            <span className="status-pill error">Lỗi kết nối</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <label htmlFor="backend-url-input" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--tcv-slate-700)' }}>
          Địa chỉ Backend API:
        </label>
        <input
          id="backend-url-input"
          type="text"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="http://127.0.0.1:18080"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--tcv-slate-200)',
            flex: '1',
            minWidth: '240px'
          }}
        />
        <button
          type="button"
          onClick={() => handleCheck(targetUrl)}
          disabled={readiness.status === 'loading'}
          className="btn-primary btn-sm"
        >
          {readiness.status === 'loading' ? 'Đang gọi...' : 'Kiểm tra kết nối'}
        </button>
        {targetUrl !== defaultUrl && (
          <button
            type="button"
            onClick={() => {
              setTargetUrl(defaultUrl);
              handleCheck(defaultUrl);
            }}
            className="btn-secondary btn-sm"
          >
            Về mặc định
          </button>
        )}
      </div>

      {/* Chi tiet ket qua kiem tra */}
      {readiness.status === 'ready' && (
        <div style={{ background: 'var(--tcv-green-50)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--tcv-green-100)' }}>
          <div style={{ fontWeight: 600, color: 'var(--tcv-green-800)', fontSize: '0.9rem', marginBottom: '8px' }}>
            Kết nối thành công tới GET /health/ready
          </div>
          <table className="status-detail-table">
            <tbody>
              <tr>
                <th>Địa chỉ kiểm tra</th>
                <td>{targetUrl}/health/ready</td>
              </tr>
              <tr>
                <th>Mã trạng thái HTTP</th>
                <td>{readiness.httpStatus} OK</td>
              </tr>
              <tr>
                <th>Thời điểm kiểm tra</th>
                <td>{readiness.checkedAt}</td>
              </tr>
              {readiness.data.service && (
                <tr>
                  <th>Tên dịch vụ (service)</th>
                  <td>{String(readiness.data.service)}</td>
                </tr>
              )}
              {readiness.data.database && (
                <tr>
                  <th>Cơ sở dữ liệu (database)</th>
                  <td>{String(readiness.data.database)}</td>
                </tr>
              )}
              {readiness.data.redis && (
                <tr>
                  <th>Bộ nhớ đệm (redis)</th>
                  <td>{String(readiness.data.redis)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {readiness.status === 'unready' && (
        <div style={{ background: 'var(--tcv-status-warn-bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
          <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.9rem', marginBottom: '6px' }}>
            Máy chủ phản hồi nhưng các thành phần phụ thuộc chưa sẵn sàng
          </div>
          <table className="status-detail-table">
            <tbody>
              <tr>
                <th>Địa chỉ kiểm tra</th>
                <td>{targetUrl}/health/ready</td>
              </tr>
              <tr>
                <th>Mã trạng thái HTTP</th>
                <td>{readiness.httpStatus} Service Unavailable</td>
              </tr>
              <tr>
                <th>Mã lỗi (code)</th>
                <td>{readiness.code}</td>
              </tr>
              <tr>
                <th>Thông báo từ máy chủ (error)</th>
                <td>{readiness.message}</td>
              </tr>
              <tr>
                <th>Thời điểm kiểm tra</th>
                <td>{readiness.checkedAt}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#92400e' }}>
            * Lưu ý trung thực: Hệ thống chỉ ghi nhận thành phần cụ thể được thông báo trong phản hồi của server.
          </div>
        </div>
      )}

      {readiness.status === 'error' && (
        <div style={{ background: 'var(--tcv-status-err-bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
          <div style={{ fontWeight: 600, color: '#b91c1c', fontSize: '0.9rem', marginBottom: '6px' }}>
            Không thể hoàn tất kết nối tới máy chủ
          </div>
          <table className="status-detail-table">
            <tbody>
              <tr>
                <th>Địa chỉ kiểm tra</th>
                <td>{targetUrl}/health/ready</td>
              </tr>
              <tr>
                <th>Mã lỗi</th>
                <td>{readiness.code}</td>
              </tr>
              <tr>
                <th>Chi tiết</th>
                <td style={{ fontFamily: 'var(--font-sans)' }}>{readiness.message}</td>
              </tr>
              <tr>
                <th>Thời điểm kiểm tra</th>
                <td>{readiness.checkedAt}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleCheck(targetUrl)}
              className="btn-primary btn-sm"
            >
              Thử lại kết nối
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--tcv-slate-600)' }}>
              Hãy kiểm tra backend đã chạy chưa (ví dụ: http://127.0.0.1:18080) và origin của frontend được phép qua CORS.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
