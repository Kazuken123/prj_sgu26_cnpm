import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getPois, deactivatePoi } from '../api/poi.ts';
import type { PoiDto, PoiCategory, PoiStatus } from '../api/poi.ts';

export const InternalPoisPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  // Danh sach va phan trang
  const [pois, setPois] = useState<PoiDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Bo loc
  const [selectedCategory, setSelectedCategory] = useState<PoiCategory | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<PoiStatus | ''>('');

  // Trang thai tai va loi
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Xac nhan ngung su dung
  const [deactivatingPoi, setDeactivatingPoi] = useState<PoiDto | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  // Chuyen request tranh ket qua cu den muon
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

  // Tai danh sach POI
  const fetchPoiList = useCallback(async () => {
    if (!user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) =>
          getPois(
            token,
            {
              page,
              limit,
              category: selectedCategory || undefined,
              status: selectedStatus || undefined
            },
            currentBaseUrl,
            controller.signal
          ),
        () => navigate('/internal/login', { replace: true })
      );

      if (seq === requestSeqRef.current) {
        setPois(result.items);
        setTotal(result.total);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (seq === requestSeqRef.current) {
        setIsLoading(false);
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if ((err as Error)?.name !== 'AbortError') {
          setErrorMessage('Không thể tải danh sách điểm tham quan. Vui lòng kiểm tra kết nối mạng.');
        }
      }
    }
  }, [user, page, limit, selectedCategory, selectedStatus, currentBaseUrl, navigate]);

  useEffect(() => {
    if (!isVerifying && user) {
      fetchPoiList();
    }
  }, [isVerifying, user, fetchPoiList]);

  // Xu ly ngung su dung POI
  const handleConfirmDeactivate = async () => {
    if (!deactivatingPoi) return;

    setIsDeactivating(true);
    setErrorMessage(null);

    try {
      const updated = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => deactivatePoi(token, deactivatingPoi.poiId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setActionNotice(`Điểm tham quan #${updated.poiId} - ${updated.name} đã được chuyển sang trạng thái INACTIVE.`);
      setDeactivatingPoi(null);
      setIsDeactivating(false);
      fetchPoiList();
    } catch (err: unknown) {
      setIsDeactivating(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Lỗi mạng khi gửi yêu cầu ngừng sử dụng POI.');
      }
    }
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
    <div className="container" style={{ padding: '32px 16px', maxWidth: '1100px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Quản lý điểm tham quan (POI)</h1>
            <p className="page-subtitle" style={{ margin: '6px 0 0 0' }}>
              Danh sách các điểm tham quan, quản lý phiên bản nội dung tiếng Việt và tác vụ đa ngôn ngữ
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/internal/pois/new" className="btn-primary" style={{ backgroundColor: '#059669' }}>
              + Thêm điểm tham quan mới
            </Link>
            <Link to="/internal/jobs" className="btn-secondary">
              Xem tác vụ nội dung
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

      {/* Bo loc du lieu */}
      <div className="panel" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-category" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Phân loại:
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as PoiCategory | '');
                setPage(1);
              }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
            >
              <option value="">Tất cả phân loại</option>
              <option value="ANIMAL">Động vật (ANIMAL)</option>
              <option value="PLANT">Thực vật (PLANT)</option>
              <option value="HERITAGE">Di tích lịch sử (HERITAGE)</option>
              <option value="AMENITY">Tiện ích (AMENITY)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-status" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Trạng thái:
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as PoiStatus | '');
                setPage(1);
              }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchPoiList}
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.88rem' }}
          >
            {isLoading ? 'Đang làm mới...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Bang danh sach POI */}
      <div className="panel" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="status-detail-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '60px' }}>ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tên điểm tham quan</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '130px' }}>Phân loại</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '90px' }}>Phiên bản</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: '80px' }}>Thứ tự</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', width: '250px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Đang tải danh sách điểm tham quan...
                </td>
              </tr>
            ) : pois.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Không tìm thấy điểm tham quan nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              pois.map((poi) => (
                <tr key={poi.poiId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>#{poi.poiId}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{poi.name}</div>
                    {poi.conservationStatus && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Bảo tồn: {poi.conservationStatus}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.82rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155' }}>
                      {poi.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
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
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace' }}>
                    v{poi.contentVersion}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace' }}>
                    {poi.displayOrder}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link
                        to={`/internal/pois/${poi.poiId}`}
                        style={{ padding: '4px 8px', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155' }}
                      >
                        Chi tiết
                      </Link>
                      <Link
                        to={`/internal/pois/${poi.poiId}/edit`}
                        style={{ padding: '4px 8px', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', color: '#0369a1' }}
                      >
                        Sửa
                      </Link>
                      <Link
                        to={`/internal/jobs?poiId=${poi.poiId}`}
                        style={{ padding: '4px 8px', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', color: '#92400e' }}
                      >
                        Tác vụ
                      </Link>
                      {poi.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => setDeactivatingPoi(poi)}
                          style={{ padding: '4px 8px', fontSize: '0.82rem', cursor: 'pointer', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', color: '#b91c1c' }}
                        >
                          Ngừng
                        </button>
                      )}
                    </div>
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
          Tổng cộng: <strong>{total}</strong> điểm tham quan • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
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

      {/* Modal xac nhan ngung su dung POI */}
      {deactivatingPoi && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '1.2rem' }}>
              Xác nhận ngừng sử dụng điểm tham quan
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', lineHeight: '1.5', color: '#334155' }}>
              Bạn có chắc chắn muốn chuyển điểm tham quan <strong>#{deactivatingPoi.poiId} - {deactivatingPoi.name}</strong> sang trạng thái <strong>INACTIVE</strong>?
            </p>
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '0.85rem', color: '#92400e' }}>
              * Lưu ý: Thao tác này chỉ chuyển trạng thái điểm tham quan sang INACTIVE để không hiển thị trong các gói dữ liệu mới của khách; không xóa vĩnh viễn dữ liệu trong hệ thống.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeactivatingPoi(null)}
                disabled={isDeactivating}
                className="btn-secondary"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                className="btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
              >
                {isDeactivating ? 'Đang xử lý...' : 'Xác nhận ngừng sử dụng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
