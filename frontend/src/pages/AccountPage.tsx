import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, logoutInternal, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { loadInternalSession, clearInternalSession } from '../api/authStorage.ts';

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

    const { session } = loadInternalSession(currentBaseUrl);

    try {
      // Goi POST /api/auth/logout len backend (tra ve 204 No Content)
      await logoutInternal(
        {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        },
        currentBaseUrl
      );

      // Xoa phien noi bo, khong cham vao phien khach
      clearInternalSession();
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
    return (
      <div className="account-page-container">
        <div className="tcv-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '1rem', color: 'var(--tcv-green-800)', fontWeight: 600 }}>
            Đang xác minh thông tin tài khoản nội bộ từ máy chủ...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page-container">
      <div className="tcv-card" style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--tcv-slate-200)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tcv-green-700)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Không gian quản trị nội bộ
            </span>
            <h1 className="hero-title" style={{ fontSize: '1.7rem', margin: '4px 0 0' }}>
              Hồ sơ Tài khoản Công vụ
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`status-pill ${user?.role === 'ADMIN' ? 'ready' : 'idle'}`}>
              Vai trò: {user?.role || 'N/A'}
            </span>
            <span className="status-pill ready">
              Trạng thái: {user?.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="banner-notice" style={{ background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div className="banner-desc">{errorMessage}</div>
          </div>
        )}

        {user && (
          <table className="status-detail-table" style={{ marginBottom: '24px' }}>
            <tbody>
              <tr>
                <th>Mã định danh (User ID)</th>
                <td>#{user.id}</td>
              </tr>
              <tr>
                <th>Họ và tên</th>
                <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  {user.fullName || 'Chưa cập nhật họ tên'}
                </td>
              </tr>
              <tr>
                <th>Email công vụ</th>
                <td>{user.email}</td>
              </tr>
              <tr>
                <th>Vai trò phân quyền</th>
                <td>
                  <strong style={{ color: user.role === 'ADMIN' ? 'var(--tcv-green-800)' : 'var(--tcv-slate-700)' }}>
                    {user.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Nhân viên soát vé (STAFF)'}
                  </strong>
                </td>
              </tr>
              <tr>
                <th>Trạng thái tài khoản</th>
                <td>{user.status}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--tcv-slate-200)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/internal/pois" className="btn-primary" style={{ backgroundColor: '#0284c7' }}>
              Quản lý POI
            </Link>
            <Link to="/internal/jobs" className="btn-secondary">
              Tác vụ nội dung
            </Link>
            <Link to="/internal/cash" className="btn-secondary" style={{ color: '#059669', borderColor: '#a7f3d0' }}>
              Quầy tiền mặt
            </Link>
            {user?.role === 'ADMIN' && (
              <Link to="/internal/staff/new" className="btn-secondary">
                + Tạo Nhân viên
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="btn-secondary"
            >
              {isLoggingOut ? 'Đang thu hồi phiên...' : 'Đăng xuất khỏi hệ thống'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.78rem', color: 'var(--tcv-slate-500)' }}>
          * Lưu ý: Thao tác đăng xuất nội bộ thu hồi token tại máy chủ và chỉ xóa phiên nội bộ trên trình duyệt, không ảnh hưởng đến phiên tham quan của khách (nếu có).
        </div>
      </div>
    </div>
  );
};
