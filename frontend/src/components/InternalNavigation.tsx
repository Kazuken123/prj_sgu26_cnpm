import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { loadInternalSession, clearInternalSession, InternalUser } from '../api/authStorage';
import { logoutStoredInternalSession } from '../api/auth';
import { getApiBaseUrl, ApiError } from '../api/client';
import { INTERNAL_SESSION_CHANGED } from '../api/sessionEvents';

export const InternalNavigation: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const synchronize = () => { try {
      const baseUrl = getApiBaseUrl();
      const { session, mismatchedBaseUrl } = loadInternalSession(baseUrl);
      if (!mismatchedBaseUrl && session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
    };
    synchronize();
    window.addEventListener(INTERNAL_SESSION_CHANGED, synchronize);
    window.addEventListener('storage', synchronize);
    window.addEventListener('focus', synchronize);
    return () => {
      window.removeEventListener(INTERNAL_SESSION_CHANGED, synchronize);
      window.removeEventListener('storage', synchronize);
      window.removeEventListener('focus', synchronize);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      const baseUrl = getApiBaseUrl();
      await logoutStoredInternalSession(baseUrl);
      setCurrentUser(null);
      navigate('/internal/login');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearInternalSession();
        setCurrentUser(null);
        navigate('/internal/login');
      } else {
        setLogoutError('Chưa đăng xuất được khỏi máy chủ. Phiên được giữ để bạn thử lại.');
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="internal-header" style={{
      background: '#132a13',
      color: '#f0fdf4',
      borderBottom: '2px solid #31572c',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      {logoutError && <p role="alert">{logoutError}</p>}
      {/* Thanh tren: Brand & User profile */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/internal/cash" style={{ textDecoration: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: '#4f772d',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              TCV
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                Ban Quản Trị Thảo Cầm Viên Sài Gòn
              </div>
              <div style={{ fontSize: '0.75rem', color: '#90a955' }}>
                Cổng Quản Trị & Vận Hành Nội Bộ
              </div>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <>
              <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 600 }}>{currentUser.fullName || currentUser.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: isAdmin ? '#b45309' : '#047857',
                    color: '#fff',
                    fontWeight: 700
                  }}>
                    {currentUser.role}
                  </span>
                  <span style={{ color: '#a7f3d0', fontSize: '0.75rem' }}>{currentUser.email}</span>
                </div>
              </div>

              <Link
                to="/internal/account"
                className="btn-secondary btn-sm"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '0.8rem',
                  padding: '6px 12px'
                }}
                title="Quản lý tài khoản cá nhân"
              >
                Tài khoản
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn-sm"
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
                title="Đăng xuất khỏi hệ thống quản trị"
              >
                {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
              </button>
            </>
          ) : (
            <Link
              to="/internal/login"
              className="btn-primary btn-sm"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Đăng nhập nội bộ
            </Link>
          )}
        </div>
      </div>

      {/* Thanh duoi: Navigation Menu cho cac nghiep vu */}
      {currentUser && (
        <nav style={{ padding: '6px 0', overflowX: 'auto' }}>
          <ul style={{
            display: 'flex',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            gap: '6px',
            alignItems: 'center'
          }}>
            <li>
              <NavLink
                to="/internal/cash"
                className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                style={navTabStyle}
              >
                💵 Thu ngân tiền mặt
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/internal/pois"
                className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                style={navTabStyle}
              >
                🦁 Điểm tham quan (POI)
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/internal/tours"
                className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                style={navTabStyle}
              >
                🗺️ Lộ trình Tour mẫu
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/internal/jobs"
                className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                style={navTabStyle}
              >
                ⚙️ Tác vụ âm thanh & Dịch
              </NavLink>
            </li>

            {isAdmin && (
              <>
                <li>
                  <NavLink
                    to="/internal/audit-logs"
                    className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                    style={navTabStyle}
                  >
                    📋 Nhật ký Audit
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/internal/monitoring"
                    className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                    style={navTabStyle}
                  >
                    📊 Giám sát hệ thống
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/internal/staff/new"
                    className={({ isActive }) => `internal-nav-tab ${isActive ? 'active' : ''}`}
                    style={navTabStyle}
                  >
                    👤 Thêm nhân viên
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
};

const navTabStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 14px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontSize: '0.84rem',
  fontWeight: isActive ? 700 : 500,
  color: isActive ? '#132a13' : '#ecfdf5',
  background: isActive ? '#90a955' : 'transparent',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap'
});
