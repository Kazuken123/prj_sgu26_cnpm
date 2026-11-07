import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminPage, Card, EmptyState } from '../components/admin/AdminUI';

// Unknown /internal/* paths stay inside the workspace instead of falling back to
// the public home page rendered within the admin shell.
export const InternalNotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  return <AdminPage width="narrow">
    <Card>
      <EmptyState icon="search" title="Không tìm thấy trang nội bộ"
        action={<div className="adm-row" style={{ justifyContent: 'center' }}>
          <Link to="/internal/cash" className="adm-btn adm-btn--primary">Về quầy thu ngân</Link>
          <Link to="/internal/today" className="adm-btn adm-btn--secondary">Mở bảng điều khiển</Link>
        </div>}>
        Đường dẫn <code>{pathname}</code> không tồn tại hoặc đã được đổi. Kiểm tra lại liên kết hoặc chọn chức năng ở thanh bên.
      </EmptyState>
    </Card>
  </AdminPage>;
};
