import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, logoutStoredInternalSession, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, DescriptionList, LoadingState } from '../components/admin/AdminUI';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getAuthMe(token, currentBaseUrl),
        () => {
          navigate('/internal/login', { replace: true });
        }
      );

      setUser(data);
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code === 'MISSING_ACCESS_TOKEN' || err.code === 'SESSION_REVOKED') {
          clearInternalSession();
          navigate('/internal/login', { replace: true });
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể xác minh phiên làm việc với máy chủ. Vui lòng kiểm tra mạng.');
      }
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      // Goi POST /api/auth/logout len backend (tra ve 204 No Content)
      await logoutStoredInternalSession(currentBaseUrl);
      setIsLoggingOut(false);
      navigate('/internal/login', { replace: true });
    } catch (err: unknown) {
      setIsLoggingOut(false);
      // Neu loi mang hoac 503, khong bao da logout thanh cong, giu thong tin de thu lai
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code === 'SESSION_REVOKED') {
          // May chu xac nhan phien da khong con hop le
          clearInternalSession();
          navigate('/internal/login', { replace: true });
          return;
        }
        setErrorMessage(`Chưa xác nhận đăng xuất trên máy chủ: ${err.message}. Bạn có thể bấm Đăng xuất để thử lại.`);
      } else {
        setErrorMessage('Mất kết nối mạng khi đăng xuất. Chưa xác nhận thu hồi phiên trên máy chủ. Vui lòng bấm thử lại.');
      }
    }
  };

  if (isLoading) {
    return <AdminPage width="narrow"><LoadingState label="Đang xác minh thông tin tài khoản nội bộ từ máy chủ..." /></AdminPage>;
  }

  const isAdmin = user?.role === 'ADMIN';
  const initials = (user?.fullName || user?.email || '?').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  return (
    <AdminPage width="narrow">
      <PageHeader eyebrow="Không gian quản trị nội bộ" title="Hồ sơ tài khoản công vụ" />

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

      {user && <Card>
        <div className="adm-row" style={{ gap: 16, marginBottom: 20 }}>
          <span className="adm-avatar" style={{ width: 56, height: 56, fontSize: 20 }} aria-hidden="true">{initials}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="adm-card__title" style={{ fontSize: 18 }}>{user.fullName || 'Chưa cập nhật họ tên'}</h2>
            <p className="adm-card__desc">{user.email}</p>
          </div>
          <div className="adm-row" style={{ gap: 6 }}>
            <Badge tone={isAdmin ? 'brand' : 'info'}>Vai trò: {user.role || 'N/A'}</Badge>
            <StatusBadge status={user.status || 'ACTIVE'} label={`Trạng thái: ${user.status || 'ACTIVE'}`} />
          </div>
        </div>
        <DescriptionList columns={1} items={[
          { label: 'Mã định danh (User ID)', value: `#${user.id}`, mono: true },
          { label: 'Họ và tên', value: user.fullName || 'Chưa cập nhật họ tên' },
          { label: 'Email công vụ', value: user.email },
          { label: 'Vai trò phân quyền', value: isAdmin ? 'Quản trị viên (ADMIN)' : 'Nhân viên soát vé (STAFF)' },
          { label: 'Trạng thái tài khoản', value: user.status },
        ]} />
      </Card>}

      <Card title="Lối tắt công việc">
        <div className="adm-grid adm-grid--2" style={{ gap: 8 }}>
          <Link to="/internal/cash" className="ops-task"><Icon name="ticket" /><span><strong>Quầy tiền mặt</strong><small>Tạo phiên, xác nhận thu tiền, cấp mã</small></span><Icon name="arrow" /></Link>
          <Link to="/internal/reissue" className="ops-task" style={{ marginTop: 0 }}><Icon name="key" /><span><strong>Cấp lại vé</strong><small>Hỗ trợ khách mất vé trên thiết bị</small></span><Icon name="arrow" /></Link>
          <Link to="/internal/pois" className="ops-task" style={{ marginTop: 0 }}><Icon name="pin" /><span><strong>Quản lý POI</strong><small>Điểm tham quan và nội dung nguồn</small></span><Icon name="arrow" /></Link>
          <Link to="/internal/jobs" className="ops-task" style={{ marginTop: 0 }}><Icon name="headphones" /><span><strong>Tác vụ nội dung</strong><small>Bản dịch và âm thanh</small></span><Icon name="arrow" /></Link>
          {isAdmin && <Link to="/internal/staff/new" className="ops-task" style={{ marginTop: 0 }}><Icon name="users" /><span><strong>+ Tạo Nhân viên</strong><small>Cấp tài khoản STAFF mới</small></span><Icon name="arrow" /></Link>}
        </div>
      </Card>

      <Card title="Phiên đăng nhập" description="Thao tác đăng xuất nội bộ thu hồi token tại máy chủ và chỉ xóa phiên nội bộ trên trình duyệt, không ảnh hưởng đến phiên tham quan của khách (nếu có).">
        <div className="adm-row adm-row--end">
          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="adm-btn adm-btn--danger-soft"><Icon name="logout" />{isLoggingOut ? 'Đang thu hồi phiên...' : 'Đăng xuất khỏi hệ thống'}</button>
        </div>
      </Card>
    </AdminPage>
  );
};
