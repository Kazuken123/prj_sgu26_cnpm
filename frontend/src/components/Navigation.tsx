import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navigation: React.FC = () => {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-badge-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="brand-titles">
            <span className="brand-title">Thảo Cầm Viên Sài Gòn</span>
            <span className="brand-sub">Hệ thống thuyết minh đa ngôn ngữ</span>
          </div>
        </div>

        <nav aria-label="Điều hướng chính">
          <ul className="nav-menu">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Trang bắt đầu
              </NavLink>
            </li>
            <li>
              <NavLink to="/payment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Thanh toán
              </NavLink>
            </li>
            <li>
              <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Khám phá
              </NavLink>
            </li>
            <li>
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Đăng nhập nội bộ
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="demo-chip">
          <span className="demo-dot" aria-hidden="true"></span>
          <span>Sprint 6 • POI & Jobs</span>
        </div>
      </div>
    </header>
  );
};
