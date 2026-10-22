import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

export const Navigation: React.FC = () => {
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 64);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 64);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  const isInternal = pathname === '/login' || pathname.startsWith('/internal');
  return (
    <header className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand-section" aria-label="Thảo Cầm Viên Sài Gòn — Trang chủ">
          <span className="brand-badge-icon"><Icon name="leaf" /></span>
          <span className="brand-titles"><span className="brand-title">Thảo Cầm Viên</span><span className="brand-sub">Sài Gòn · Audio Guide</span></span>
        </Link>
        <nav aria-label="Điều hướng chính"><ul className="nav-menu">
          <li><NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Trang chủ</NavLink></li>
          <li><NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Khám phá</NavLink></li>
          <li><NavLink to="/payment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Vé thuyết minh</NavLink></li>
        </ul></nav>
        <NavLink to="/login" className={`staff-link ${isInternal ? 'active' : ''}`}><Icon name="lock" /><span>Nội bộ</span></NavLink>
      </div>
    </header>
  );
};
