import React from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { VisitorNavigation } from './components/VisitorNavigation';
import { InternalNavigation } from './components/InternalNavigation';
import { InternalProtectedRoute } from './components/InternalProtectedRoute';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useMotionPreference } from './hooks/useMotionPreference';

// Trang danh cho khach tham quan
import { HomePage } from './pages/HomePage';
import { PaymentPage } from './pages/PaymentPage';
import { ExplorePage } from './pages/ExplorePage';

// Trang danh cho nhan vien / quan tri vien
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { NewStaffPage } from './pages/NewStaffPage';
import { InternalCashPage } from './pages/InternalCashPage';
import { InternalPoisPage } from './pages/InternalPoisPage';
import { InternalPoiDetailPage } from './pages/InternalPoiDetailPage';
import { InternalPoiEditPage } from './pages/InternalPoiEditPage';
import { InternalJobsPage } from './pages/InternalJobsPage';
import { InternalToursPage } from './pages/InternalToursPage';
import { InternalTourEditPage } from './pages/InternalTourEditPage';
import { InternalAuditLogsPage } from './pages/InternalAuditLogsPage';
import { InternalMonitoringPage } from './pages/InternalMonitoringPage';

export const App: React.FC = () => {
  const { pathname, hash, key: locationKey } = useLocation();
  const { reducedMotion } = useMotionPreference();
  const mainRef = useScrollReveal(pathname, reducedMotion);
  const previousLocation = React.useRef(locationKey);

  React.useEffect(() => {
    if (previousLocation.current === locationKey) return;
    previousLocation.current = locationKey;
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [locationKey, hash, mainRef]);

  // Kiem tra phan he: Khach hang (Visitor) hay Nhan vien (Internal)
  const isInternal = pathname === '/login' || pathname.startsWith('/internal');

  return (
    <>
      <a href="#main-content" className="skip-link">Chuyển đến nội dung chính</a>

      {/* Tách biệt Header điều hướng giữa Khách và Nhân viên */}
      {isInternal ? <InternalNavigation /> : <VisitorNavigation />}

      <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>
        <Routes>
          {/* PHÂN HỆ KHÁCH HÀNG (VISITOR PORTAL) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/explore" element={<ExplorePage />} />

          {/* PHÂN HỆ NỘI BỘ (INTERNAL / STAFF / ADMIN PORTAL) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/internal/login" element={<LoginPage />} />

          <Route
            path="/internal/cash"
            element={
              <InternalProtectedRoute>
                <InternalCashPage />
              </InternalProtectedRoute>
            }
          />

          <Route
            path="/internal/pois"
            element={
              <InternalProtectedRoute>
                <InternalPoisPage />
              </InternalProtectedRoute>
            }
          />
          <Route
            path="/internal/pois/new"
            element={
              <InternalProtectedRoute>
                <InternalPoiEditPage />
              </InternalProtectedRoute>
            }
          />
          <Route
            path="/internal/pois/:id"
            element={
              <InternalProtectedRoute>
                <InternalPoiDetailPage />
              </InternalProtectedRoute>
            }
          />
          <Route
            path="/internal/pois/:id/edit"
            element={
              <InternalProtectedRoute>
                <InternalPoiEditPage />
              </InternalProtectedRoute>
            }
          />

          {/* Quan ly Tour mau */}
          <Route
            path="/internal/tours"
            element={
              <InternalProtectedRoute>
                <InternalToursPage />
              </InternalProtectedRoute>
            }
          />
          <Route
            path="/internal/tours/new"
            element={
              <InternalProtectedRoute>
                <InternalTourEditPage />
              </InternalProtectedRoute>
            }
          />
          <Route
            path="/internal/tours/:id/edit"
            element={
              <InternalProtectedRoute>
                <InternalTourEditPage />
              </InternalProtectedRoute>
            }
          />

          {/* Quan ly tien trinh xu ly audio/dich */}
          <Route
            path="/internal/jobs"
            element={
              <InternalProtectedRoute>
                <InternalJobsPage />
              </InternalProtectedRoute>
            }
          />

          {/* Nhat ky Audit Logs (Chi danh cho ADMIN) */}
          <Route
            path="/internal/audit-logs"
            element={
              <InternalProtectedRoute requireAdmin={true}>
                <InternalAuditLogsPage />
              </InternalProtectedRoute>
            }
          />

          {/* Giam sat he thong Monitoring (Chi danh cho ADMIN) */}
          <Route
            path="/internal/monitoring"
            element={
              <InternalProtectedRoute requireAdmin={true}>
                <InternalMonitoringPage />
              </InternalProtectedRoute>
            }
          />

          {/* Them tai khoan STAFF moi (Chi danh cho ADMIN) */}
          <Route
            path="/internal/staff/new"
            element={
              <InternalProtectedRoute requireAdmin={true}>
                <NewStaffPage />
              </InternalProtectedRoute>
            }
          />

          {/* Tai khoan ca nhan */}
          <Route
            path="/internal/account"
            element={
              <InternalProtectedRoute>
                <AccountPage />
              </InternalProtectedRoute>
            }
          />

          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Tách biệt Footer giữa Khách và Nhân viên */}
      {isInternal ? (
        <footer style={{
          background: '#0d1f0d',
          color: '#9ca3af',
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '0.8rem',
          borderTop: '1px solid #2d6a4f'
        }}>
          <div>Ban Quản Trị Thảo Cầm Viên Sài Gòn — Cổng Thông Tin Vận Hành Nội Bộ</div>
          <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#6b7280' }}>
            Hệ thống tuân thủ kiến trúc 3 lớp Router–Service–Store & bảo mật phân quyền RBAC
          </div>
        </footer>
      ) : (
        <footer className="site-footer">
          <div className="footer-inner">
            <div>
              <strong>Thảo Cầm Viên Sài Gòn</strong>
              <span className="footer-caption">Lắng nghe thiên nhiên. Kết nối di sản. Mở cửa 7:00 – 18:30 hàng ngày.</span>
            </div>
            <div className="footer-links">
              <span>Số 2 Nguyễn Bỉnh Khiêm, Quận 1, TP.HCM</span>
              <Link to="/internal/login">Cổng Nhân viên & Quản trị</Link>
            </div>
          </div>
        </footer>
      )}
    </>
  );
};

export default App;
