import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackendStatus } from '../components/BackendStatus';
import { Icon } from '../components/Icon';

export const HomePage: React.FC = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  return (
    <div className="home-page-container">
      <section className="welcome-hero" aria-labelledby="welcome-heading">
        <div className="welcome-copy">
          <span className="heritage-label"><Icon name="leaf" /> Thảo Cầm Viên Sài Gòn, từ 1864</span>
          <h1 id="welcome-heading">Chậm một bước.<br /><em>Nghe thiên nhiên.</em></h1>
          <p>Mỗi tán cây, mỗi loài vật đều có một câu chuyện. Cùng lắng nghe và khám phá Thảo Cầm Viên theo nhịp bước của bạn.</p>
          <Link to="/payment" className="btn-primary hero-cta">Bắt đầu tham quan <span className="button-icon"><Icon name="arrow" /></span></Link>
          <a href="#huong-dan" className="text-link">Lần đầu sử dụng? Xem hướng dẫn</a>
          <div className="hero-features"><span><Icon name="headphones" /> Thuyết minh âm thanh</span><span><Icon name="globe" /> Chọn ngôn ngữ của bạn</span></div>
        </div>
        <figure className="garden-shell">
          <div className="garden-gallery">
            <img className="garden-photo garden-photo-main" src="/images/thao-cam-vien-gate.webp" width="1200" height="852" decoding="async" alt="Cổng sắt xanh mang tên Thảo Cầm Viên Sài Gòn dưới những tán cây." />
            <img className="garden-photo garden-photo-canopy" src="/images/thao-cam-vien-canopy.webp" width="800" height="800" decoding="async" alt="Những tán cây xanh vươn lên nền trời trong khuôn viên." />
            <img className="garden-photo garden-photo-birds" src="/images/thao-cam-vien-pheasants.webp" width="800" height="1067" decoding="async" alt="Những chú chim trĩ lông trắng đen, mặt đỏ tại Thảo Cầm Viên." />
          </div>
          <figcaption className="garden-caption">
            <span><span className="garden-eyebrow">Một khoảng xanh giữa Sài Gòn</span><strong>Muôn điều để lắng nghe.</strong></span>
            <Icon name="leaf" />
          </figcaption>
          <p className="photo-credit">Ảnh: <a href="https://silverkris.singaporeair.com/guide/vietnam/sgn/do-ho-chi-minh-city/saigon-zoo-and-botanical-gardens/" target="_blank" rel="noreferrer">SilverKris</a> · <a href="https://saigonzoo.vn/" target="_blank" rel="noreferrer">Thảo Cầm Viên Sài Gòn</a></p>
        </figure>
      </section>
      <aside className="demo-notice"><Icon name="info" /><p><strong>Bản trải nghiệm thử.</strong> Thanh toán được mô phỏng, không thu tiền thật. Âm thanh hiện là đoạn thử 1 giây; tọa độ tham quan chưa được xác minh thực địa.</p></aside>
      <section id="huong-dan" className="visit-guide" aria-labelledby="guide-heading">
        <div className="guide-intro"><span className="section-index">01 / Chuẩn bị hành trình</span><h2 id="guide-heading">Bạn đi dạo.<br />Để câu chuyện dẫn đường.</h2><p>Mang theo tai nghe và bắt đầu với ba bước đơn giản.</p><Link to="/explore" className="text-link">Đã kích hoạt? Vào khám phá <Icon name="arrow" /></Link></div>
        <ol className="guide-steps">
          <li><span className="step-number">01</span><div><h3>Kích hoạt lượt tham quan</h3><p>Thử thanh toán trực tuyến hoặc nhập mã được cấp tại quầy vé.</p></div><Icon name="ticket" /></li>
          <li><span className="step-number">02</span><div><h3>Chọn ngôn ngữ, chọn điểm đến</h3><p>Xem danh sách điểm tham quan và lộ trình trong mục Khám phá.</p></div><Icon name="compass" /></li>
          <li><span className="step-number">03</span><div><h3>Đeo tai nghe và lắng nghe</h3><p>Mở thuyết minh tại điểm bạn thích, dừng và tiếp tục theo ý mình.</p></div><Icon name="headphones" /></li>
        </ol>
      </section>
      <details className="technical-details" onToggle={(event) => setShowDiagnostics(event.currentTarget.open)}>
        <summary>Thông tin kết nối dành cho nhóm phát triển</summary>
        {showDiagnostics && <BackendStatus />}
      </details>
    </div>
  );
};
