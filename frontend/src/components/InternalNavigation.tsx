import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { loadInternalSession, clearInternalSession, InternalUser } from '../api/authStorage';
import { logoutStoredInternalSession } from '../api/auth';
import { getApiBaseUrl, ApiError } from '../api/client';
import { Icon } from './Icon';
import { INTERNAL_SESSION_CHANGED } from '../api/sessionEvents';

export const InternalNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
  const contentArea = ['/internal/pois', '/internal/tours', '/internal/jobs'].some(path => pathname.startsWith(path));
  const manageArea = ['/internal/audit-logs', '/internal/monitoring', '/internal/staff'].some(path => pathname.startsWith(path));
  const nav = (to: string, label: string, icon: React.ComponentProps<typeof Icon>['name']) => <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={icon} />{label}</NavLink>;
  return <header className="ops-header">
    <div className="ops-header-top"><Link className="ops-brand" to={currentUser ? (isAdmin ? '/internal/monitoring' : '/internal/cash') : '/internal/login'}><span className="ops-brand-mark"><Icon name="leaf" /></span><span>Thảo Cầm Viên<small>Không gian làm việc</small></span></Link>
      <div className="ops-user">{currentUser ? <><Link to="/internal/account"><strong>{currentUser.fullName || currentUser.email}</strong><small>{isAdmin ? 'Chủ quản / Quản trị viên' : 'Nhân viên'}</small></Link><button type="button" onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Đang thoát…' : 'Đăng xuất'}</button></> : <Link to="/">Trang dành cho khách <Icon name="arrow" /></Link>}</div>
    </div>
    {logoutError && <p className="ops-alert" role="alert">{logoutError}</p>}
    {currentUser && <><nav className="ops-navigation" aria-label="Công việc nội bộ">
      {nav(isAdmin ? '/internal/monitoring' : '/internal/cash', isAdmin ? 'Tổng quan hệ thống' : 'Công việc tại quầy', 'compass')}
      {nav('/internal/cash', 'Thu ngân', 'ticket')}
      <Link to="/internal/pois" className={contentArea ? 'active' : ''}><Icon name="headphones" />Nội dung thuyết minh</Link>
      {isAdmin && <Link to="/internal/audit-logs" className={manageArea ? 'active' : ''}><Icon name="lock" />Quản lý</Link>}
      <Link to="/explore" className="ops-visitor-link"><Icon name="map" />Xem trang khách</Link>
    </nav>
    {contentArea && <nav className="ops-subnav" aria-label="Quản lý nội dung">{nav('/internal/pois','Điểm tham quan','pin')}{nav('/internal/tours','Lộ trình tham quan','map')}{nav('/internal/jobs','Xử lý bản dịch & audio','headphones')}</nav>}
    {manageArea && isAdmin && <nav className="ops-subnav" aria-label="Quản lý vận hành">{nav('/internal/audit-logs','Lịch sử thao tác','search')}{nav('/internal/staff/new','Thêm nhân viên','lock')}{nav('/internal/monitoring','Tình trạng hệ thống','info')}</nav>}
    </>}
  </header>;
};
