import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getContentJobs, retryContentJob } from '../api/contentJob.ts';
import type { ContentJobDto, JobStatus } from '../api/contentJob.ts';

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
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p>Đang kiểm tra quyền hạn tài khoản nội bộ...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '1150px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Theo dõi tác vụ nội dung (Content Jobs)</h1>
            <p className="page-subtitle" style={{ margin: '6px 0 0 0' }}>
              Kiểm tra tiến trình dịch thuật và tổng hợp âm thanh đa ngôn ngữ, yêu cầu thử lại các tác vụ thất bại
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/internal/pois" className="btn-secondary">
              Quản lý POI
            </Link>
            <Link to="/internal/account" className="btn-secondary">
              Tài khoản
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

      {/* BO LOC VA TIM KIEM TAC VU */}
      <div className="panel" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#f8fafc' }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-poi" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Mã POI:
            </label>
            <input
              id="filter-poi"
              type="number"
              min="1"
              value={poiIdFilter}
              onChange={(e) => setPoiIdFilter(e.target.value)}
              placeholder="VD: 1, 2..."
              style={{ width: '90px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-status" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Trạng thái:
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as JobStatus | '');
                setPage(1);
              }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">PENDING (Đang chờ)</option>
              <option value="PROCESSING">PROCESSING (Đang xử lý)</option>
              <option value="COMPLETED">COMPLETED (Hoàn tất)</option>
              <option value="FAILED">FAILED (Thất bại)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-lang" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Ngôn ngữ:
            </label>
            <input
              id="filter-lang"
              type="text"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              placeholder="VD: en, vi..."
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              id="filter-current"
              type="checkbox"
              checked={currentOnlyFilter}
              onChange={(e) => {
                setCurrentOnlyFilter(e.target.checked);
                setPage(1);
              }}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="filter-current" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
              Chỉ phiên bản hiện hành
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.88rem' }}
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.88rem' }}
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={fetchJobs}
              disabled={isLoading}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.88rem' }}
            >
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </form>
      </div>

      {/* BANG DANH SACH JOB */}
      <div className="panel" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="status-detail-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '70px' }}>Job ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '90px' }}>POI ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '80px' }}>Ngôn ngữ</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '120px' }}>Phiên bản</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '120px' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '140px' }}>Dịch thuật</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '140px' }}>Âm thanh</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', width: '110px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải danh sách tác vụ nội dung...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Không tìm thấy tác vụ nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.jobId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>#{job.jobId}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link
                      to={`/internal/pois/${job.poiId}`}
                      style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace' }}
                    >
                      POI #{job.poiId}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <strong style={{ textTransform: 'uppercase' }}>{job.languageCode}</strong>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.82rem' }}>
                    <div style={{ fontFamily: 'monospace' }}>v{job.sourceVersion} / v{job.currentVersion}</div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: job.isCurrent ? '#166534' : '#64748b',
                        fontWeight: job.isCurrent ? 600 : 400
                      }}
                    >
                      {job.isCurrent ? 'Hiện hành' : 'Lỗi thời'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
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
                    {job.error && (
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.error.message}>
                        {job.error.code}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
                    <div>Trạng thái: <strong>{job.translation.status || 'Chưa có'}</strong></div>
                    {job.translation.sourceVersion && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Nguồn: v{job.translation.sourceVersion} {job.translation.isCurrent ? '(Khớp)' : '(Lệch)'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
                    <div>Trạng thái: <strong>{job.audio.status || 'Chưa có'}</strong></div>
                    {job.audio.sourceVersion && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Nguồn: v{job.audio.sourceVersion} {job.audio.isCurrent ? '(Khớp)' : '(Lệch)'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {job.canRetry ? (
                      <button
                        type="button"
                        onClick={() => handleRetry(job.jobId)}
                        disabled={retryingJobId === job.jobId}
                        style={{ padding: '4px 10px', fontSize: '0.82rem', cursor: 'pointer', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', color: '#92400e', fontWeight: 600 }}
                      >
                        {retryingJobId === job.jobId ? 'Đang gửi...' : 'Thử lại'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phan trang */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
          Tổng cộng: <strong>{total}</strong> tác vụ • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            ← Trang trước
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={page >= totalPages || isLoading}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            Trang sau →
          </button>
        </div>
      </div>
    </div>
  );
};
