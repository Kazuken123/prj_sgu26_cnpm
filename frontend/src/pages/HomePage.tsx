import React from 'react';
import { Link } from 'react-router-dom';
import { BackendStatus } from '../components/BackendStatus';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page-container">
      <div className="tcv-card" style={{ borderLeft: '4px solid var(--tcv-green-700)' }}>
        <h1 className="hero-title">
          Thảo Cầm Viên Sài Gòn
        </h1>
        <p className="hero-subtitle">
          Hệ thống thuyết minh đa ngôn ngữ phục vụ khách tham quan bách thảo và vườn thú lịch sử thành lập năm 1864.
        </p>

        <div className="banner-notice warning">
          <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</div>
          <div>
            <div className="banner-title">Hệ thống đang ở chế độ thử nghiệm kỹ thuật</div>
            <div className="banner-desc">
              Thanh toán trực tuyến hiện tại là mô phỏng, chưa thu tiền thật. Toàn bộ tệp âm thanh thuyết minh là âm thanh thử nghiệm một giây, chưa phải kịch bản đọc hoàn chỉnh. Tọa độ các điểm tham quan là dữ liệu tham khảo từ nguồn lưu trữ, chưa nghiệm thu thực địa.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
          <Link to="/payment" className="btn-primary">
            Đi tới Cổng thanh toán
            <span aria-hidden="true">→</span>
          </Link>
          <Link to="/explore" className="btn-secondary">
            Xem bản đồ khám phá
          </Link>
        </div>
      </div>

      <BackendStatus />

      <div className="botanical-ornament">
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
            Không gian Di sản Thiên nhiên Thảo Cầm Viên Sài Gòn
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--tcv-slate-600)', maxWidth: '60ch' }}>
            Khuôn viên lưu giữ hàng trăm cá thể động vật quý hiếm cùng quần thể cổ thụ bách thảo nhiệt đới trăm năm giữa lòng thành phố.
          </div>
        </div>
      </div>
    </div>
  );
};
