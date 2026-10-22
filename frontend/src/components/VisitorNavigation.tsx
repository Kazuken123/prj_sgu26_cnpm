import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { loadGuestSession } from '../api/guestStorage';
import { getApiBaseUrl } from '../api/client';

export const VisitorNavigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 40);
  const [hasValidTicket, setHasValidTicket] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', updateScrollState, { passive: true });

    // Kiểm tra vé khách
    try {
      const baseUrl = getApiBaseUrl();
      const { session, mismatchedBaseUrl } = loadGuestSession(baseUrl);
      if (!mismatchedBaseUrl && session?.token) {
        setHasValidTicket(true);
      } else {
        setHasValidTicket(false);
      }
    } catch {
      setHasValidTicket(false);
    }

    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  return (
    <header className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand-section" aria-label="Thảo Cầm Viên Sài Gòn — Trang chủ">
          <span className="brand-badge-icon"><Icon name="leaf" /></span>
          <span className="brand-titles">
            <span className="brand-title">Thảo Cầm Viên</span>
            <span className="brand-sub">Sài Gòn • Thuyết Minh Đa Ngôn Ngữ</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng khách tham quan">
          <ul className="nav-menu">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Trang chủ
              </NavLink>
            </li>
            <li>
              <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Bản đồ & Thuyết minh
              </NavLink>
            </li>
            <li>
              <NavLink to="/payment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Vé tham quan
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasValidTicket ? (
            <Link
              to="/explore"
              className="status-pill ready"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                borderRadius: '999px'
              }}
              title="Bạn đang có vé tham quan hoạt động — Nhấn để vào bản đồ"
            >
              <span>🎟️</span>
              <span>Đang có vé</span>
            </Link>
          ) : (
            <Link
              to="/payment"
              className="btn-primary"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                borderRadius: '999px'
              }}
              title="Mua vé trực tuyến hoặc đổi mã tiền mặt"
            >
              <span>🎟️</span>
              <span>Kích hoạt vé</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
