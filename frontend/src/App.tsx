import React from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { PaymentPage } from './pages/PaymentPage';
import { ExplorePage } from './pages/ExplorePage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { NewStaffPage } from './pages/NewStaffPage';
import { InternalCashPage } from './pages/InternalCashPage';
import { InternalPoisPage } from './pages/InternalPoisPage';
import { InternalPoiDetailPage } from './pages/InternalPoiDetailPage';
import { InternalPoiEditPage } from './pages/InternalPoiEditPage';
import { InternalJobsPage } from './pages/InternalJobsPage';

export const App: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a href="#main-content" className="skip-link">Chuyển đến nội dung chính</a>
      <Navigation />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/internal/login" element={<LoginPage />} />
          <Route path="/internal/account" element={<AccountPage />} />
          <Route path="/internal/staff/new" element={<NewStaffPage />} />
          <Route path="/internal/cash" element={<InternalCashPage />} />
          <Route path="/internal/pois" element={<InternalPoisPage />} />
          <Route path="/internal/pois/new" element={<InternalPoiEditPage />} />
          <Route path="/internal/pois/:id" element={<InternalPoiDetailPage />} />
          <Route path="/internal/pois/:id/edit" element={<InternalPoiEditPage />} />
          <Route path="/internal/jobs" element={<InternalJobsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <strong>Thảo Cầm Viên Sài Gòn</strong><span className="footer-caption">Lắng nghe thiên nhiên. Kết nối di sản.</span>
          </div>
          <div className="footer-links"><span>Phiên bản thử nghiệm</span><Link to="/login">Dành cho nhân viên</Link></div>
        </div>
      </footer>
    </>
  );
};

export default App;
