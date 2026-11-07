import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getPois, deactivatePoi } from '../api/poi.ts';
import type { PoiDto, PoiCategory, PoiStatus } from '../api/poi.ts';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, Field, EmptyState, LoadingState, Pagination, ConfirmDialog } from '../components/admin/AdminUI';

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
    return <AdminPage><LoadingState label="Đang kiểm tra quyền hạn tài khoản nội bộ..." /></AdminPage>;
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const categoryLabels: Record<string, string> = { ANIMAL: 'Động vật', PLANT: 'Thực vật', HERITAGE: 'Di tích', AMENITY: 'Tiện ích' };

  return (
    <AdminPage>
      <PageHeader eyebrow="Nội dung thuyết minh" title="Quản lý điểm tham quan (POI)"
        description="Danh sách các điểm tham quan, quản lý phiên bản nội dung tiếng Việt và tác vụ đa ngôn ngữ."
        actions={<>
          <Link to="/internal/jobs" className="adm-btn adm-btn--secondary"><Icon name="headphones" />Xem tác vụ nội dung</Link>
          <Link to="/internal/pois/new" className="adm-btn adm-btn--primary"><Icon name="plus" />Thêm điểm tham quan mới</Link>
        </>} />

      {actionNotice && <Alert tone="success" onDismiss={() => setActionNotice(null)}>{actionNotice}</Alert>}
      {errorMessage && <Alert tone="danger" onDismiss={() => setErrorMessage(null)}>{errorMessage}</Alert>}

      <Card flush>
        <div className="adm-toolbar">
          <Field label="Phân loại" htmlFor="filter-category">
            <select id="filter-category" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value as PoiCategory | ''); setPage(1); }}>
              <option value="">Tất cả phân loại</option>
              <option value="ANIMAL">Động vật (ANIMAL)</option>
              <option value="PLANT">Thực vật (PLANT)</option>
              <option value="HERITAGE">Di tích lịch sử (HERITAGE)</option>
              <option value="AMENITY">Tiện ích (AMENITY)</option>
            </select>
          </Field>
          <Field label="Trạng thái" htmlFor="filter-status">
            <select id="filter-status" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value as PoiStatus | ''); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
            </select>
          </Field>
          {(selectedCategory || selectedStatus) && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setSelectedCategory(''); setSelectedStatus(''); setPage(1); }}>Xóa bộ lọc</button>}
          <span className="adm-toolbar__spacer" />
          <button type="button" onClick={fetchPoiList} disabled={isLoading} className="adm-btn adm-btn--secondary"><Icon name="refresh" />{isLoading ? 'Đang làm mới...' : 'Làm mới'}</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="sr-only">Danh sách điểm tham quan</caption>
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Tên điểm tham quan</th>
                <th>Phân loại</th>
                <th className="adm-center">Trạng thái</th>
                <th className="adm-center">Phiên bản</th>
                <th className="adm-center">Thứ tự</th>
                <th className="adm-actions-cell">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="adm-state-row"><td colSpan={7}><LoadingState label="Đang tải danh sách điểm tham quan..." /></td></tr>
              ) : pois.length === 0 ? (
                <tr className="adm-state-row"><td colSpan={7}><EmptyState icon="pin" title="Không tìm thấy điểm tham quan nào phù hợp với bộ lọc hiện tại."
                  action={<Link to="/internal/pois/new" className="adm-btn adm-btn--secondary adm-btn--sm"><Icon name="plus" />Thêm điểm tham quan</Link>} /></td></tr>
              ) : (
                pois.map((poi) => (
                  <tr key={poi.poiId}>
                    <td className="adm-mono adm-muted">#{poi.poiId}</td>
                    <td>
                      <Link to={`/internal/pois/${poi.poiId}`} className="adm-cell-title" style={{ textDecoration: 'none', color: 'inherit' }}>{poi.name}</Link>
                      {poi.conservationStatus && <small>Bảo tồn: {poi.conservationStatus}</small>}
                    </td>
                    <td><Badge tone="brand">{categoryLabels[poi.category] ?? poi.category}</Badge></td>
                    <td className="adm-center"><StatusBadge status={poi.status} /></td>
                    <td className="adm-center adm-mono">v{poi.contentVersion}</td>
                    <td className="adm-center adm-mono">{poi.displayOrder}</td>
                    <td className="adm-actions-cell">
                      <div className="adm-row-actions">
                        <Link to={`/internal/pois/${poi.poiId}`} className="adm-btn adm-btn--ghost adm-btn--sm">Chi tiết</Link>
                        <Link to={`/internal/pois/${poi.poiId}/edit`} className="adm-btn adm-btn--secondary adm-btn--sm"><Icon name="edit" />Sửa</Link>
                        <Link to={`/internal/jobs?poiId=${poi.poiId}`} className="adm-btn adm-btn--ghost adm-btn--sm">Tác vụ</Link>
                        {poi.status === 'ACTIVE' && <button type="button" onClick={() => setDeactivatingPoi(poi)} className="adm-btn adm-btn--danger-soft adm-btn--sm">Ngừng</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} disabled={isLoading}
          summary={<>Tổng cộng: <strong>{total}</strong> điểm tham quan</>}
          onChange={next => setPage(Math.min(Math.max(1, next), totalPages))} />
      </Card>

      <ConfirmDialog open={!!deactivatingPoi} tone="danger" title="Xác nhận ngừng sử dụng điểm tham quan"
        confirmLabel="Xác nhận ngừng sử dụng" busy={isDeactivating} busyLabel="Đang xử lý..."
        onCancel={() => setDeactivatingPoi(null)} onConfirm={handleConfirmDeactivate}>
        {deactivatingPoi && <>
          <p>Bạn có chắc chắn muốn chuyển điểm tham quan <strong>#{deactivatingPoi.poiId} - {deactivatingPoi.name}</strong> sang trạng thái <strong>INACTIVE</strong>?</p>
          <Alert tone="warning">Thao tác này chỉ chuyển trạng thái điểm tham quan sang INACTIVE để không hiển thị trong các gói dữ liệu mới của khách; không xóa vĩnh viễn dữ liệu trong hệ thống.</Alert>
        </>}
      </ConfirmDialog>
    </AdminPage>
  );
};
