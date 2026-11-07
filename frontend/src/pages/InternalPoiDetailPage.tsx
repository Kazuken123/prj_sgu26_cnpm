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
import { ReviewedTranslationPanel } from '../components/ReviewedTranslationPanel';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, DescriptionList, EmptyState, LoadingState, ConfirmDialog } from '../components/admin/AdminUI';

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
  const [confirmDeactivate, setConfirmDeactivate] = useState<boolean>(false);
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
  // The confirmation step is the ConfirmDialog below (replaces window.confirm).
  const handleDeactivate = async () => {
    if (!poi) return;
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
      setConfirmDeactivate(false);
      setActionNotice('Điểm tham quan đã được chuyển sang trạng thái INACTIVE thành công.');
    } catch (err: unknown) {
      setIsDeactivating(false);
      setConfirmDeactivate(false);
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
    return <AdminPage><LoadingState label="Đang tải thông tin điểm tham quan..." /></AdminPage>;
  }

  if (errorMessage && !poi) {
    return (
      <AdminPage width="narrow">
        <Card>
          <EmptyState icon="info" title="Không thể tải dữ liệu" action={<Link to="/internal/pois" className="adm-btn adm-btn--secondary">← Quay lại danh sách điểm tham quan</Link>}>{errorMessage}</EmptyState>
        </Card>
      </AdminPage>
    );
  }

  if (!poi) return null;

  // Kiem tra an toan url anh de phong XSS
  const isSafeImageUrl =
    poi.avatarUrl &&
    !/^javascript:/i.test(poi.avatarUrl) &&
    (/^https?:\/\//i.test(poi.avatarUrl) || /^\/(?!\/)/.test(poi.avatarUrl));
  const categoryLabels: Record<string, string> = { ANIMAL: 'Động vật', PLANT: 'Thực vật', HERITAGE: 'Di tích', AMENITY: 'Tiện ích' };

  return (
    <AdminPage>
      <Link to="/internal/pois" className="adm-link">← Quay lại danh sách điểm tham quan</Link>
      <PageHeader
        eyebrow={<span className="adm-row" style={{ gap: 8 }}><span className="adm-mono">#{poi.poiId}</span><Badge tone="brand">{categoryLabels[poi.category] ?? poi.category}</Badge><StatusBadge status={poi.status} /><Badge tone="info">v{poi.contentVersion}</Badge></span>}
        title={poi.name}
        actions={<>
          <Link to={`/internal/jobs?poiId=${poi.poiId}`} className="adm-btn adm-btn--secondary">Xem tác vụ ({jobs.length})</Link>
          {poi.status === 'ACTIVE' && <button type="button" onClick={() => setConfirmDeactivate(true)} disabled={isDeactivating} className="adm-btn adm-btn--danger-soft">{isDeactivating ? 'Đang xử lý...' : 'Ngừng sử dụng'}</button>}
          <Link to={`/internal/pois/${poi.poiId}/edit`} className="adm-btn adm-btn--primary"><Icon name="edit" />Chỉnh sửa điểm này</Link>
        </>} />

      {actionNotice && <Alert tone="success" onDismiss={() => setActionNotice(null)}>{actionNotice}</Alert>}
      {errorMessage && <Alert tone="danger" onDismiss={() => setErrorMessage(null)}>{errorMessage}</Alert>}

      <div className="adm-grid adm-grid--main-aside">
        <Card title="Thông số kỹ thuật và vị trí">
          <DescriptionList columns={1} items={[
            { label: 'Vĩ độ (Latitude)', value: poi.latitude, mono: true },
            { label: 'Kinh độ (Longitude)', value: poi.longitude, mono: true },
            { label: 'Bán kính kích hoạt (Radius)', value: `${poi.triggerRadius} mét` },
            { label: 'Thứ tự hiển thị', value: poi.displayOrder },
            { label: 'Khung giờ hoạt động', value: poi.activityHours || 'Không có thông tin' },
            { label: 'Tình trạng bảo tồn', value: poi.conservationStatus || 'Không có thông tin' },
            { label: 'Phiên bản nội dung', value: <strong>v{poi.contentVersion}</strong> },
          ]} />
        </Card>
        <Card title="Hình ảnh đại diện">
          {isSafeImageUrl && !imgError ? (
            <figure style={{ margin: 0 }}>
              <img src={poi.avatarUrl || ''} alt={poi.name} onError={() => setImgError(true)}
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 'var(--adm-r-md)', border: '1px solid var(--adm-border)' }} />
              <figcaption className="adm-small adm-muted" style={{ marginTop: 8, wordBreak: 'break-all' }}>Đường dẫn: <code>{poi.avatarUrl}</code></figcaption>
            </figure>
          ) : (
            <EmptyState icon="pin" title={poi.avatarUrl ? 'Không thể tải ảnh từ đường dẫn đã cung cấp' : 'Chưa có ảnh đại diện'}>
              {poi.avatarUrl && <span style={{ wordBreak: 'break-all' }}>{poi.avatarUrl}</span>}
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="adm-grid adm-grid--2" style={{ alignItems: 'start' }}>
        <Card title="Nội dung mô tả tiếng Việt" description="Nguồn văn bản">
          <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--adm-text)' }}>{poi.description}</div>
        </Card>
        <Card title="Kịch bản đọc thuyết minh tiếng Việt" description="Nguồn âm thanh">
          <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--adm-surface-2)', padding: 14, borderRadius: 'var(--adm-r-md)', border: '1px solid var(--adm-border)' }}>{poi.audioScript}</div>
        </Card>
      </div>

      <Card flush title="Tác vụ nội dung liên quan (Content Jobs)" actions={<Link to={`/internal/jobs?poiId=${poi.poiId}`} className="adm-link">Xem toàn bộ tác vụ <Icon name="arrow" /></Link>}>
        {jobs.length === 0 ? (
          <EmptyState icon="headphones" title="Chưa có tác vụ xử lý nội dung nào cho điểm tham quan này." />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Job ID</th><th>Ngôn ngữ</th><th>Phiên bản nguồn</th><th>Trạng thái chung</th><th>Dịch thuật</th><th>Âm thanh</th><th className="adm-actions-cell">Thao tác</th></tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.jobId}>
                    <td className="adm-mono adm-muted">#{job.jobId}</td>
                    <td><strong>{job.languageCode}</strong></td>
                    <td className="adm-mono">v{job.sourceVersion} <Badge tone={job.isCurrent ? 'success' : 'neutral'}>{job.isCurrent ? 'Hiện hành' : 'Cũ'}</Badge></td>
                    <td><StatusBadge status={job.status} /></td>
                    <td><StatusBadge status={job.translation.status} label={job.translation.status || 'Chưa có'} /></td>
                    <td><StatusBadge status={job.audio.status} label={job.audio.status || 'Chưa có'} /></td>
                    <td className="adm-actions-cell">
                      {job.canRetry ? (
                        <button type="button" onClick={() => handleRetryJob(job.jobId)} disabled={retryingJobId === job.jobId} className="adm-btn adm-btn--secondary adm-btn--sm">
                          <Icon name="refresh" />{retryingJobId === job.jobId ? 'Đang gửi...' : 'Thử lại'}
                        </button>
                      ) : <span className="adm-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ReviewedTranslationPanel key={poi.poiId} poiId={poi.poiId} />

      <ConfirmDialog open={confirmDeactivate} tone="danger" title="Ngừng sử dụng điểm tham quan?" confirmLabel="Xác nhận ngừng sử dụng"
        busy={isDeactivating} busyLabel="Đang xử lý..." onCancel={() => setConfirmDeactivate(false)} onConfirm={handleDeactivate}>
        <p>Xác nhận chuyển điểm tham quan <strong>#{poi.poiId} - {poi.name}</strong> sang <strong>INACTIVE</strong>?</p>
        <Alert tone="warning">Điểm sẽ không xuất hiện trong gói dữ liệu và lộ trình ở lần tải tiếp theo của khách; dữ liệu không bị xóa.</Alert>
      </ConfirmDialog>
    </AdminPage>
  );
};
