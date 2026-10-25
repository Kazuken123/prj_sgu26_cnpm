import { LanguagePicker } from './LanguagePicker';
import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { loadGuestSession } from '../api/guestStorage';
import { getApiBaseUrl } from '../api/client';
import { getVisitMe } from '../api/payment';
import { GUEST_SESSION_CHANGED } from '../api/sessionEvents';
import { useVisitExpiry } from '../hooks/useVisitExpiry';

export const VisitorNavigation: React.FC = () => {
  const { t, language: locale, languages, setLanguage } = useVisitorLanguage();
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 40);
  const [hasValidTicket, setHasValidTicket] = useState(false);
  const [ticketExpiry, setTicketExpiry] = useState<string | null>(null);
  useVisitExpiry(ticketExpiry, () => setHasValidTicket(false));

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', updateScrollState, { passive: true });

    let active = true, sequence = 0;
    const checkTicket = async () => {
      const request = ++sequence;
      setHasValidTicket(false);
      setTicketExpiry(null);
      try {
      const baseUrl = getApiBaseUrl();
      const { session, mismatchedBaseUrl } = loadGuestSession(baseUrl);
      if (!mismatchedBaseUrl && session?.token) {
        const visit = await getVisitMe(session.token, baseUrl);
        if (!active || request !== sequence) return;
        const valid = visit.status === 'ACTIVE' && Date.parse(visit.expiresAt || '') > Date.now();
        setHasValidTicket(valid);
        setTicketExpiry(valid ? visit.expiresAt! : null);
      }
      } catch { if (active && request === sequence) setHasValidTicket(false); }
    };
    void checkTicket();
    window.addEventListener(GUEST_SESSION_CHANGED, checkTicket);
    window.addEventListener('storage', checkTicket);
    window.addEventListener('focus', checkTicket);

    return () => {
      active = false; sequence++;
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener(GUEST_SESSION_CHANGED, checkTicket);
      window.removeEventListener('storage', checkTicket);
      window.removeEventListener('focus', checkTicket);
    };
  }, []);

  return (
    <header className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand-section" aria-label={t("Thảo Cầm Viên Sài Gòn — Trang chủ")}>
          <span className="brand-badge-icon"><Icon name="leaf" /></span>
          <span className="brand-titles">
            <span className="brand-title" lang="vi">Thảo Cầm Viên</span>
            <span className="brand-sub">{t("Sài Gòn • Thuyết Minh Đa Ngôn Ngữ")}</span>
          </span>
        </Link>

        <nav aria-label={t("Điều hướng khách tham quan")}>
          <ul className="nav-menu">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{t(" Trang chủ ")}</NavLink>
            </li>
            <li>
              <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{t(" Khám phá ")}</NavLink>
            </li>
            <li>
              <NavLink to="/payment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{t(" Vé thuyết minh ")}</NavLink>
            </li>
          </ul>
        </nav>

        <div className="visitor-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pathname !== '/explore' && <LanguagePicker languages={languages} value={locale} disabled={false} onChange={setLanguage} />}
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
              title={t("Bạn đang có vé tham quan hoạt động — Nhấn để vào bản đồ")}
            >
              <Icon name="ticket" />
              <span>{t("Đã kích hoạt nghe")}</span>
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
              title={t("Mua vé trực tuyến hoặc đổi mã tiền mặt")}
            >
              <Icon name="ticket" />
              <span>{t("Kích hoạt vé")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
