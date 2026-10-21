import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getPoiDetail, deactivatePoi } from '../api/poi.ts';
import type { PoiDto } from '../api/poi.ts';
import { getContentJobs, retryContentJob } from '../api/contentJob.ts';
import type { ContentJobDto } from '../api/contentJob.ts';

export const InternalPoiDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  const [poi, setPoi] = useState<PoiDto | null>(null);
  const [jobs, setJobs] = useState<ContentJobDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [imgError, setImgError] = useState<boolean>(false);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);
  const [retryingJobId, setRetryingJobId] = useState<number | null>(null);

  // Kiem tra quyen STAFF hoac ADMIN
  const verifyAccess = useCallback(async () => {
    setIsVerifying(true);
    try {
      const profile = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getAuthMe(token, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      if (profile.role !== 'STAFF' && profile.role !== 'ADMIN') {
        clearInternalSession();
        navigate('/internal/login', { replace: true });
        return;
      }

      setUser(profile);
      setIsVerifying(false);
    } catch {
      setIsVerifying(false);
      clearInternalSession();
      navigate('/internal/login', { replace: true });
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  // Tai chi tiet POI va danh sach job
  const fetchPoiData = useCallback(async () => {
    if (!id || !user) return;

    setIsLoading(true);
    setErrorMessage(null);
    setImgError(false);

    try {
      const poiData = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getPoiDetail(token, id, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );
      setPoi(poiData);

      // Tai danh sach job cua POI nay
      try {
        const jobResult = await executeAuthenticatedInternalRequest(
          currentBaseUrl,
          (token) => getContentJobs(token, { poiId: Number(id) }, currentBaseUrl),
          () => navigate('/internal/login', { replace: true })
        );
        setJobs(jobResult.items);
      } catch {
        // Khong chan xem chi tiet POI neu job loi
      }

      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setErrorMessage('Không tìm thấy điểm tham quan này trong hệ thống.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Lỗi mạng khi tải chi tiết điểm tham quan.');
      }
    }
  }, [id, user, currentBaseUrl, navigate]);

  useEffect(() => {
    if (!isVerifying && user) {
      fetchPoiData();
    }
  }, [isVerifying, user, fetchPoiData]);

  // Ngung su dung POI
  const handleDeactivate = async () => {
    if (!poi) return;
    if (!window.confirm(`Xác nhận chuyển điểm tham quan #${poi.poiId} - ${poi.name} sang INACTIVE?`)) {
      return;
    }

    setIsDeactivating(true);
    setActionNotice(null);
    setErrorMessage(null);

    try {
      const updated = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => deactivatePoi(token, poi.poiId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );
      setPoi(updated);
      setIsDeactivating(false);
      setActionNotice('Điểm tham quan đã được chuyển sang trạng thái INACTIVE thành công.');
    } catch (err: unknown) {
      setIsDeactivating(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Lỗi mạng khi ngừng sử dụng POI.');
      }
    }
  };

  // Thử lại job
  const handleRetryJob = async (jobId: number) => {
    setRetryingJobId(jobId);
    setActionNotice(null);
    setErrorMessage(null);

    try {
      const res = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => retryContentJob(token, jobId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setActionNotice(`Tác vụ #${res.data.jobId}: ${res.message}`);
      setRetryingJobId(null);
      // Tai lai danh sach job
      if (poi) {
        const jobResult = await executeAuthenticatedInternalRequest(
          currentBaseUrl,
          (token) => getContentJobs(token, { poiId: poi.poiId }, currentBaseUrl),
          () => navigate('/internal/login', { replace: true })
        );
        setJobs(jobResult.items);
      }
    } catch (err: unknown) {
      setRetryingJobId(null);
      if (err instanceof ApiError) {
        setErrorMessage(`Lỗi thử lại tác vụ [${err.code}]: ${err.message}`);
      } else {
        setErrorMessage('Lỗi kết nối khi gửi yêu cầu thử lại tác vụ.');
      }
    }
  };

  if (isVerifying || isLoading) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p>Đang tải thông tin điểm tham quan...</p>
      </div>
    );
  }

  if (errorMessage && !poi) {
    return (
      <div className="container" style={{ padding: '40px 16px', maxWidth: '700px' }}>
        <div className="panel" style={{ borderLeft: '4px solid #dc2626' }}>
          <h2 style={{ color: '#991b1b', marginTop: 0 }}>Không thể tải dữ liệu</h2>
          <p>{errorMessage}</p>
          <Link to="/internal/pois" className="btn-secondary" style={{ display: 'inline-block', marginTop: '12px' }}>
            ← Quay lại danh sách điểm tham quan
          </Link>
        </div>
      </div>
    );
  }

  if (!poi) return null;

  // Kiem tra an toan url anh de phong XSS
  const isSafeImageUrl =
    poi.avatarUrl &&
    !/^javascript:/i.test(poi.avatarUrl) &&
    (/^https?:\/\//i.test(poi.avatarUrl) || /^\/(?!\/)/.test(poi.avatarUrl));

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/internal/pois" style={{ fontSize: '0.88rem', textDecoration: 'none', color: '#0369a1' }}>
          ← Quay lại danh sách điểm tham quan
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}>#{poi.poiId}</span>
              <span style={{ fontSize: '0.82rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 600 }}>
                {poi.category}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: poi.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                  color: poi.status === 'ACTIVE' ? '#166534' : '#991b1b'
                }}
              >
                {poi.status}
              </span>
              <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#0369a1' }}>
                v{poi.contentVersion}
              </span>
            </div>

            <h1 className="page-title" style={{ margin: 0 }}>{poi.name}</h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={`/internal/pois/${poi.poiId}/edit`} className="btn-primary" style={{ backgroundColor: '#0284c7' }}>
              Chỉnh sửa điểm này
            </Link>
            {poi.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="btn-secondary"
                style={{ color: '#b91c1c', borderColor: '#fecaca' }}
              >
                {isDeactivating ? 'Đang xử lý...' : 'Ngừng sử dụng'}
              </button>
            )}
            <Link to={`/internal/jobs?poiId=${poi.poiId}`} className="btn-secondary">
              Xem tác vụ ({jobs.length})
            </Link>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', padding: '12px 16px' }}>
          <div style={{ color: '#166534', fontWeight: 600 }}>{actionNotice}</div>
        </div>
      )}

      {errorMessage && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', padding: '12px 16px' }}>
          <div style={{ color: '#991b1b', fontWeight: 600 }}>{errorMessage}</div>
        </div>
      )}

      {/* Thong so ky thuat va anh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="panel">
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            Thông số kỹ thuật và vị trí
          </h2>

          <table className="status-detail-table">
            <tbody>
              <tr>
                <th>Vĩ độ (Latitude)</th>
                <td><code>{poi.latitude}</code></td>
              </tr>
              <tr>
                <th>Kinh độ (Longitude)</th>
                <td><code>{poi.longitude}</code></td>
              </tr>
              <tr>
                <th>Bán kính kích hoạt (Radius)</th>
                <td>{poi.triggerRadius} mét</td>
              </tr>
              <tr>
                <th>Thứ tự hiển thị</th>
                <td>{poi.displayOrder}</td>
              </tr>
              <tr>
                <th>Khung giờ hoạt động</th>
                <td>{poi.activityHours || 'Không có thông tin'}</td>
              </tr>
              <tr>
                <th>Tình trạng bảo tồn</th>
                <td>{poi.conservationStatus || 'Không có thông tin'}</td>
              </tr>
              <tr>
                <th>Phiên bản nội dung</th>
                <td><strong>v{poi.contentVersion}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            Hình ảnh đại diện
          </h2>

          {isSafeImageUrl && !imgError ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={poi.avatarUrl || ''}
                alt={poi.name}
                onError={() => setImgError(true)}
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', wordBreak: 'break-all' }}>
                Đường dẫn: <code>{poi.avatarUrl}</code>
              </div>
            </div>
          ) : (
            <div style={{ height: '180px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🖼️</div>
              <div style={{ fontSize: '0.88rem' }}>
                {poi.avatarUrl ? 'Không thể tải ảnh từ đường dẫn đã cung cấp' : 'Chưa có ảnh đại diện'}
              </div>
              {poi.avatarUrl && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', wordBreak: 'break-all', padding: '0 12px' }}>
                  {poi.avatarUrl}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Noi dung tieng Viet */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 12px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Nội dung mô tả tiếng Việt (Nguồn văn bản)
        </h2>
        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
          {poi.description}
        </div>
      </div>

      {/* Kich ban doc tieng Viet */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 12px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Kịch bản đọc thuyết minh tiếng Việt (Nguồn âm thanh)
        </h2>
        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#1e293b', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          {poi.audioScript}
        </div>
      </div>

      {/* Danh sach tac vu noi dung lien quan */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
            Tác vụ nội dung liên quan (Content Jobs)
          </h2>
          <Link to={`/internal/jobs?poiId=${poi.poiId}`} style={{ fontSize: '0.85rem', textDecoration: 'none', color: '#0369a1' }}>
            Xem toàn bộ tác vụ →
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            Chưa có tác vụ xử lý nội dung nào cho điểm tham quan này.
          </div>
        ) : (
          <table className="status-detail-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th>Job ID</th>
                <th>Ngôn ngữ</th>
                <th>Phiên bản nguồn</th>
                <th>Trạng thái chung</th>
                <th>Dịch thuật</th>
                <th>Âm thanh</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.jobId}>
                  <td style={{ fontFamily: 'monospace' }}>#{job.jobId}</td>
                  <td><strong>{job.languageCode}</strong></td>
                  <td style={{ fontFamily: 'monospace' }}>
                    v{job.sourceVersion} {job.isCurrent ? '(Hiện hành)' : '(Cũ)'}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor:
                          job.status === 'COMPLETED' ? '#dcfce7' : job.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                        color:
                          job.status === 'COMPLETED' ? '#166534' : job.status === 'FAILED' ? '#991b1b' : '#92400e'
                      }}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>
                      {job.translation.status || 'Chưa có'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>
                      {job.audio.status || 'Chưa có'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {job.canRetry ? (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job.jobId)}
                        disabled={retryingJobId === job.jobId}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', color: '#92400e' }}
                      >
                        {retryingJobId === job.jobId ? 'Đang gửi...' : 'Thử lại'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
