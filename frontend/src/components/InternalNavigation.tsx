import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { loadInternalSession, clearInternalSession, InternalUser } from '../api/authStorage';
import { logoutStoredInternalSession } from '../api/auth';
import { getApiBaseUrl, ApiError } from '../api/client';
import { Icon } from './Icon';
import { INTERNAL_SESSION_CHANGED } from '../api/sessionEvents';

type IconName = React.ComponentProps<typeof Icon>['name'];
interface NavItem { to: string; label: string; icon: IconName; adminOnly?: boolean; match?: string[] }
interface NavGroup { label: string; adminOnly?: boolean; items: NavItem[] }

// Sidebar information architecture. Route paths are unchanged; groups only
// organize the existing pages. ADMIN-only items are hidden for STAFF and the
// routes stay protected by InternalProtectedRoute and the backend.
const groups: NavGroup[] = [
  { label: 'Tổng quan', items: [
    { to: '/internal/today', label: 'Bảng điều khiển', icon: 'chart' },
    { to: '/internal/monitoring', label: 'Tình trạng hệ thống', icon: 'activity', adminOnly: true },
  ] },
  { label: 'Quầy vé', items: [
    { to: '/internal/cash', label: 'Thu ngân', icon: 'ticket' },
    { to: '/internal/reissue', label: 'Cấp lại vé', icon: 'key' },
  ] },
  { label: 'Nội dung thuyết minh', items: [
    { to: '/internal/pois', label: 'Điểm tham quan', icon: 'pin' },
    { to: '/internal/tours', label: 'Lộ trình tham quan', icon: 'map' },
    { to: '/internal/jobs', label: 'Bản dịch & audio', icon: 'headphones' },
    { to: '/internal/knowledge', label: 'Kho tri thức', icon: 'book' },
  ] },
  { label: 'Quản lý hệ thống', adminOnly: true, items: [
    { to: '/internal/audit-logs', label: 'Lịch sử thao tác', icon: 'search' },
    { to: '/internal/staff/new', label: 'Thêm nhân viên', icon: 'users', match: ['/internal/staff'] },
  ] },
];

// Breadcrumb labels for every existing internal route.
const sections: Array<{ prefix: string; group: string; label: string; to: string }> = [
  { prefix: '/internal/today', group: 'Tổng quan', label: 'Bảng điều khiển', to: '/internal/today' },
  { prefix: '/internal/monitoring', group: 'Tổng quan', label: 'Tình trạng hệ thống', to: '/internal/monitoring' },
  { prefix: '/internal/cash', group: 'Quầy vé', label: 'Thu ngân', to: '/internal/cash' },
  { prefix: '/internal/reissue', group: 'Quầy vé', label: 'Cấp lại vé', to: '/internal/reissue' },
  { prefix: '/internal/pois', group: 'Nội dung', label: 'Điểm tham quan', to: '/internal/pois' },
  { prefix: '/internal/tours', group: 'Nội dung', label: 'Lộ trình tham quan', to: '/internal/tours' },
  { prefix: '/internal/jobs', group: 'Nội dung', label: 'Bản dịch & audio', to: '/internal/jobs' },
  { prefix: '/internal/knowledge', group: 'Nội dung', label: 'Kho tri thức', to: '/internal/knowledge' },
  { prefix: '/internal/audit-logs', group: 'Hệ thống', label: 'Lịch sử thao tác', to: '/internal/audit-logs' },
  { prefix: '/internal/staff', group: 'Hệ thống', label: 'Thêm nhân viên', to: '/internal/staff/new' },
  { prefix: '/internal/account', group: 'Cá nhân', label: 'Tài khoản', to: '/internal/account' },
];
export function breadcrumbFor(pathname: string): Array<{ label: string; to?: string }> {
  const section = sections.find(item => pathname === item.prefix || pathname.startsWith(item.prefix + '/'));
  if (!section) return [];
  const trail: Array<{ label: string; to?: string }> = [{ label: section.group }, { label: section.label, to: section.to }];
  const rest = pathname.slice(section.prefix.length);
  if (/^\/new$/.test(rest) && section.prefix !== '/internal/staff') trail.push({ label: 'Thêm mới' });
  else if (/^\/\d+\/edit$/.test(rest)) trail.push({ label: `#${rest.split('/')[1]}`, to: section.prefix === '/internal/pois' ? `${section.prefix}/${rest.split('/')[1]}` : undefined }, { label: 'Chỉnh sửa' });
  else if (/^\/\d+$/.test(rest)) trail.push({ label: `Chi tiết #${rest.slice(1)}` });
  return trail;
}
const initials = (user: InternalUser) => (user.fullName || user.email || '?').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();

export const InternalNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Tab title follows the current internal page; the original (visitor) title
  // is restored when the workspace header unmounts.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.title;
    return () => { document.title = original; };
  }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const trail = breadcrumbFor(pathname);
    const page = trail[trail.length - 1]?.label ?? (pathname.startsWith('/internal/login') ? 'Đăng nhập' : null);
    document.title = page ? `${page} · Thảo Cầm Viên nội bộ` : 'Thảo Cầm Viên nội bộ';
  }, [pathname]);

  // Close the mobile drawer on navigation and with Escape.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey as EventListener);
    return () => window.removeEventListener('keydown', onKey as EventListener);
  }, [menuOpen, closeMenu]);

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
  const home = currentUser ? (isAdmin ? '/internal/monitoring' : '/internal/cash') : '/internal/login';
  const brand = <Link className="adm-sidebar__brand" to={home}>
    <span className="adm-sidebar__brand-mark"><Icon name="leaf" /></span>
    <span><strong>Thảo Cầm Viên</strong><small>Không gian làm việc</small></span>
  </Link>;

  if (!currentUser) {
    return <header className="adm-guest-header">
      {brand}
      <Link className="adm-btn adm-btn--secondary adm-btn--sm" to="/">Trang dành cho khách <Icon name="arrow" /></Link>
    </header>;
  }

  const trail = breadcrumbFor(pathname);
  const isItemActive = (item: NavItem) => [item.to, ...(item.match ?? [])].some(path => pathname === path || pathname.startsWith(path + '/'));
  return <>
    <aside className={`adm-sidebar${menuOpen ? ' is-open' : ''}`} id="adm-sidebar" aria-label="Điều hướng nội bộ">
      <div className="adm-sidebar__top">{brand}<button type="button" className="adm-icon-btn adm-sidebar__close" onClick={closeMenu} aria-label="Đóng menu"><Icon name="close" /></button></div>
      <nav className="adm-sidebar__nav" aria-label="Công việc nội bộ">
        {groups.filter(group => !group.adminOnly || isAdmin).map(group => {
          const items = group.items.filter(item => !item.adminOnly || isAdmin);
          return <div className="adm-nav-group" key={group.label}>
            <span className="adm-nav-group__label">{group.label}</span>
            <ul>{items.map(item => <li key={item.to}>
              <NavLink to={item.to} className={() => `adm-nav-link${isItemActive(item) ? ' active' : ''}`} aria-current={isItemActive(item) ? 'page' : undefined}>
                <Icon name={item.icon} />{item.label}
              </NavLink>
            </li>)}</ul>
          </div>;
        })}
      </nav>
      <div className="adm-sidebar__footer">
        <Link to="/explore" className="adm-nav-link"><Icon name="external" />Xem trang khách</Link>
        <NavLink to="/internal/account" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}><Icon name="user" />Tài khoản của tôi</NavLink>
      </div>
    </aside>
    <button type="button" className={`adm-backdrop${menuOpen ? ' is-open' : ''}`} aria-hidden="true" tabIndex={-1} onClick={closeMenu} />
    <header className="adm-topbar">
      <button type="button" className="adm-icon-btn adm-topbar__menu" onClick={() => setMenuOpen(open => !open)} aria-label="Mở menu điều hướng" aria-expanded={menuOpen} aria-controls="adm-sidebar"><Icon name="menu" /></button>
      <nav className="adm-breadcrumb" aria-label="Breadcrumb">
        <ol>{trail.map((crumb, index) => <li key={index}>{index === trail.length - 1
          ? <span aria-current="page">{crumb.label}</span>
          : crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}</li>)}</ol>
      </nav>
      <div className="adm-topbar__actions">
        <Link className="adm-user" to="/internal/account" title="Tài khoản">
          <span className="adm-avatar" aria-hidden="true">{initials(currentUser)}</span>
          <span className="adm-user__text"><strong>{currentUser.fullName || currentUser.email}</strong><small>{isAdmin ? 'Chủ quản / Quản trị viên' : 'Nhân viên'}</small></span>
        </Link>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={handleLogout} disabled={isLoggingOut} aria-label="Đăng xuất">
          <Icon name="logout" /><span>{isLoggingOut ? 'Đang thoát…' : 'Đăng xuất'}</span>
        </button>
      </div>
      {logoutError && <p className="adm-alert adm-alert--danger" role="alert">{logoutError}</p>}
    </header>
  </>;
};
