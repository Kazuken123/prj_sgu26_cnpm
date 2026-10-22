import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { loadInternalSession } from '../api/authStorage';
import { getApiBaseUrl } from '../api/client';

interface InternalProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const InternalProtectedRoute: React.FC<InternalProtectedRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const location = useLocation();
  const baseUrl = getApiBaseUrl();
  const { session, mismatchedBaseUrl } = loadInternalSession(baseUrl);

  if (mismatchedBaseUrl || !session.accessToken || !session.user) {
    return <Navigate to="/internal/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && session.user.role !== 'ADMIN') {
    return (
      <div className="internal-container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="tcv-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <h2 style={{ color: '#991b1b', marginBottom: '8px' }}>Không có quyền truy cập</h2>
          <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '16px' }}>
            Chức năng này yêu cầu quyền <strong>Quản trị viên (ADMIN)</strong>.
            Tài khoản hiện tại của bạn có vai trò <strong>{session.user.role}</strong>.
          </p>
          <a href="/internal/cash" className="btn-primary btn-sm">
            Quay lại trang Thu ngân
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
