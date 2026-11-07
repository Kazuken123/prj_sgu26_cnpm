import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { loadInternalSession } from '../api/authStorage';
import { getApiBaseUrl } from '../api/client';
import { AdminPage, Card, EmptyState } from './admin/AdminUI';

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
      <AdminPage width="narrow">
        <Card>
          <EmptyState icon="lock" title="Không có quyền truy cập"
            action={<Link to="/internal/cash" className="adm-btn adm-btn--primary">Quay lại trang Thu ngân</Link>}>
            Chức năng này yêu cầu quyền <strong>Quản trị viên (ADMIN)</strong>.
            Tài khoản hiện tại của bạn có vai trò <strong>{session.user.role}</strong>.
          </EmptyState>
        </Card>
      </AdminPage>
    );
  }

  return <>{children}</>;
};
