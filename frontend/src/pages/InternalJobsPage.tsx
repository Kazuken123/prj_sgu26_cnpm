import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getContentJobs, retryContentJob } from '../api/contentJob.ts';
import type { ContentJobDto, JobStatus } from '../api/contentJob.ts';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, Field, EmptyState, LoadingState, Pagination } from '../components/admin/AdminUI';

export const InternalJobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  // Danh sach va phan trang
  const [jobs, setJobs] = useState<ContentJobDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Bo loc
  const initialPoiId = searchParams.get('poiId') || '';
  const [poiIdFilter, setPoiIdFilter] = useState<string>(initialPoiId);
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [currentOnlyFilter, setCurrentOnlyFilter] = useState<boolean>(false);

  // Trang thai tai va retry
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<number | null>(null);

  // Xu ly chuoi request
  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Tai danh sach tac vu
  const fetchJobs = useCallback(async () => {
    if (!user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    const cleanPoiId = poiIdFilter.trim() ? Number(poiIdFilter.trim()) : undefined;

    try {
      const result = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) =>
          getContentJobs(
            token,
            {
              page,
              limit,
              poiId: cleanPoiId && Number.isSafeInteger(cleanPoiId) && cleanPoiId > 0 ? cleanPoiId : undefined,
              status: statusFilter || undefined,
              languageCode: languageFilter.trim() || undefined,
              currentOnly: currentOnlyFilter ? true : undefined
            },
            currentBaseUrl,
            controller.signal
          ),
        () => navigate('/internal/login', { replace: true })
      );

      if (seq === requestSeqRef.current) {
        setJobs(result.items);
        setTotal(result.total);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (seq === requestSeqRef.current) {
        setIsLoading(false);
        if (err instanceof ApiError) {
          setErrorMessage(`Lỗi [${err.code}]: ${err.message}`);
        } else if ((err as Error)?.name !== 'AbortError') {
          setErrorMessage('Không thể tải danh sách tác vụ nội dung. Vui lòng kiểm tra kết nối mạng.');
        }
      }
    }
  }, [user, page, limit, poiIdFilter, statusFilter, languageFilter, currentOnlyFilter, currentBaseUrl, navigate]);

  useEffect(() => {
    if (!isVerifying && user) {
      fetchJobs();
    }
  }, [isVerifying, user, fetchJobs]);

  // Thuc hien thu lai job FAILED
  const handleRetry = async (jobId: number) => {
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
      // Tai lai danh sach ngay lap tuc de doc trang thai thuc te tu backend
      fetchJobs();
    } catch (err: unknown) {
      setRetryingJobId(null);
      if (err instanceof ApiError) {
        setErrorMessage(`Lỗi thử lại tác vụ #${jobId} [${err.code}]: ${err.message}`);
      } else {
        setErrorMessage(`Lỗi kết nối khi thử lại tác vụ #${jobId}.`);
      }
      // Lam moi lai du lieu de cap nhat trang thai
      fetchJobs();
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const newParams = new URLSearchParams();
    if (poiIdFilter.trim()) newParams.set('poiId', poiIdFilter.trim());
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setPoiIdFilter('');
    setStatusFilter('');
    setLanguageFilter('');
    setCurrentOnlyFilter(false);
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  if (isVerifying) {
    return <AdminPage><LoadingState label="Đang kiểm tra quyền hạn tài khoản nội bộ..." /></AdminPage>;
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const hasFilters = Boolean(poiIdFilter || statusFilter || languageFilter || currentOnlyFilter);

  return (
    <AdminPage>
      <PageHeader eyebrow="Nội dung thuyết minh" title="Theo dõi tác vụ nội dung (Content Jobs)"
        description="Kiểm tra tiến trình dịch thuật và tổng hợp âm thanh đa ngôn ngữ, yêu cầu thử lại các tác vụ thất bại."
        actions={<Link to="/internal/pois" className="adm-btn adm-btn--secondary"><Icon name="pin" />Quản lý POI</Link>} />

      {actionNotice && <Alert tone="success" onDismiss={() => setActionNotice(null)}>{actionNotice}</Alert>}
      {errorMessage && <Alert tone="danger" onDismiss={() => setErrorMessage(null)}>{errorMessage}</Alert>}

      <Card flush>
        {/* BO LOC VA TIM KIEM TAC VU */}
        <form onSubmit={handleApplyFilter} className="adm-toolbar">
          <Field label="Mã POI" htmlFor="filter-poi">
            <input id="filter-poi" type="number" min="1" value={poiIdFilter} onChange={(e) => setPoiIdFilter(e.target.value)} placeholder="VD: 1, 2..." className="adm-mono" style={{ width: 120 }} />
          </Field>
          <Field label="Trạng thái" htmlFor="filter-status">
            <select id="filter-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as JobStatus | ''); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">PENDING (Đang chờ)</option>
              <option value="PROCESSING">PROCESSING (Đang xử lý)</option>
              <option value="COMPLETED">COMPLETED (Hoàn tất)</option>
              <option value="FAILED">FAILED (Thất bại)</option>
            </select>
          </Field>
          <Field label="Ngôn ngữ" htmlFor="filter-lang">
            <input id="filter-lang" type="text" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} placeholder="VD: en, vi..." style={{ width: 120 }} />
          </Field>
          <label className="adm-check" htmlFor="filter-current" style={{ minHeight: 40 }}>
            <input id="filter-current" type="checkbox" checked={currentOnlyFilter} onChange={(e) => { setCurrentOnlyFilter(e.target.checked); setPage(1); }} />
            Chỉ phiên bản hiện hành
          </label>
          <span className="adm-toolbar__spacer" />
          <button type="submit" className="adm-btn adm-btn--primary">Lọc</button>
          {hasFilters && <button type="button" onClick={handleClearFilters} className="adm-btn adm-btn--ghost">Xóa bộ lọc</button>}
          <button type="button" onClick={fetchJobs} disabled={isLoading} className="adm-btn adm-btn--secondary"><Icon name="refresh" />{isLoading ? 'Đang tải...' : 'Làm mới'}</button>
        </form>

        {/* BANG DANH SACH JOB */}
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="sr-only">Danh sách tác vụ nội dung</caption>
            <thead>
              <tr>
                <th>Job ID</th><th>POI</th><th className="adm-center">Ngôn ngữ</th><th className="adm-center">Phiên bản</th>
                <th>Trạng thái</th><th>Dịch thuật</th><th>Âm thanh</th><th className="adm-actions-cell">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="adm-state-row"><td colSpan={8}><LoadingState label="Đang tải danh sách tác vụ nội dung..." /></td></tr>
              ) : jobs.length === 0 ? (
                <tr className="adm-state-row"><td colSpan={8}><EmptyState icon="headphones" title="Không tìm thấy tác vụ nào phù hợp với bộ lọc."
                  action={hasFilters ? <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={handleClearFilters}>Xóa bộ lọc</button> : undefined} /></td></tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.jobId}>
                    <td className="adm-mono adm-muted">#{job.jobId}</td>
                    <td><Link to={`/internal/pois/${job.poiId}`} className="adm-link adm-mono">POI #{job.poiId}</Link></td>
                    <td className="adm-center"><Badge>{job.languageCode.toUpperCase()}</Badge></td>
                    <td className="adm-center">
                      <span className="adm-mono">v{job.sourceVersion} / v{job.currentVersion}</span>
                      <small style={{ color: job.isCurrent ? 'var(--adm-success)' : undefined, fontWeight: job.isCurrent ? 600 : 400 }}>{job.isCurrent ? 'Hiện hành' : 'Lỗi thời'}</small>
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                      {job.error && <small style={{ color: 'var(--adm-danger)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.error.message}>{job.error.code}</small>}
                    </td>
                    <td>
                      <StatusBadge status={job.translation.status} label={job.translation.status || 'Chưa có'} />
                      {job.translation.sourceVersion && <small>Nguồn: v{job.translation.sourceVersion} {job.translation.isCurrent ? '(Khớp)' : '(Lệch)'}</small>}
                    </td>
                    <td>
                      <StatusBadge status={job.audio.status} label={job.audio.status || 'Chưa có'} />
                      {job.audio.sourceVersion && <small>Nguồn: v{job.audio.sourceVersion} {job.audio.isCurrent ? '(Khớp)' : '(Lệch)'}</small>}
                    </td>
                    <td className="adm-actions-cell">
                      {job.canRetry ? (
                        <button type="button" onClick={() => handleRetry(job.jobId)} disabled={retryingJobId === job.jobId} className="adm-btn adm-btn--secondary adm-btn--sm">
                          <Icon name="refresh" />{retryingJobId === job.jobId ? 'Đang gửi...' : 'Thử lại'}
                        </button>
                      ) : <span className="adm-muted">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} disabled={isLoading}
          summary={<>Tổng cộng: <strong>{total}</strong> tác vụ</>}
          onChange={next => setPage(Math.min(Math.max(1, next), totalPages))} />
      </Card>
    </AdminPage>
  );
};
