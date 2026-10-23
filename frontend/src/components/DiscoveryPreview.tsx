import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

const discoveries = [
  { category: 'ANIMAL', label: 'Thế giới động vật', name: 'Một cuộc gặp gỡ, nhiều điều kỳ diệu.', description: 'Dừng chân bên những chú chim trĩ. Quan sát sắc lông, lắng nghe âm thanh và khám phá câu chuyện của muôn loài.', image: '/images/thao-cam-vien-pheasants.webp', alt: 'Chim trĩ tại Thảo Cầm Viên', icon: 'paw' as const },
  { category: 'PLANT', label: 'Những khoảng xanh', name: 'Dưới tán cây, tìm một chút bình yên.', description: 'Theo bóng mát, ngước nhìn những tán lá. Mỗi điểm dừng mở ra một góc nhìn khác về khu vườn.', image: '/images/thao-cam-vien-canopy.webp', alt: 'Tán cây xanh trong khuôn viên', icon: 'leaf' as const },
  { category: 'HERITAGE', label: 'Dấu ấn di sản', name: 'Chạm vào ký ức của Sài Gòn.', description: 'Từ cánh cổng quen thuộc, bắt đầu hành trình tìm hiểu những câu chuyện gắn với Thảo Cầm Viên.', image: '/images/thao-cam-vien-gate.webp', alt: 'Cổng Thảo Cầm Viên Sài Gòn', icon: 'compass' as const },
];

export const DiscoveryPreview: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const item = discoveries[selected];
  return <>
    <section className="discovery-section" aria-labelledby="discovery-heading">
      <div className="section-heading" data-reveal>
        <div><span className="section-eyebrow">GẶP GỠ KHU VƯỜN</span><h2 id="discovery-heading">Điểm dừng nhỏ.<br /><em>Khám phá lớn.</em></h2></div>
        <Link className="text-link" to="/explore">Tất cả điểm tham quan <span className="link-icon"><Icon name="arrow" /></span></Link>
      </div>
      <div className="discovery-cards">
        {discoveries.map((discovery, index) => <article key={discovery.category} className="discovery-card" data-reveal>
          <Link className="discovery-photo" to={`/explore?category=${discovery.category}`} aria-label={`Khám phá ${discovery.label.toLowerCase()}`}>
            <img src={discovery.image} alt={discovery.alt} width="800" height="800" loading="lazy" decoding="async" />
            <span className="discovery-number">0{index + 1}</span>
          </Link>
          <div className="discovery-copy"><span className="category-label"><Icon name={discovery.icon} />{discovery.label}</span><h3>{discovery.name}</h3><p>{discovery.description}</p><Link className="text-link" to={`/explore?category=${discovery.category}`}>Khám phá điểm đến <Icon name="arrow" /></Link></div>
        </article>)}
      </div>
    </section>
    <section id="ban-do" className="map-introduction" aria-labelledby="map-intro-heading" data-reveal>
      <div className="map-intro-copy"><span className="section-eyebrow"><Icon name="map" /> BẢN ĐỒ KHÁM PHÁ</span><h2 id="map-intro-heading">Chọn một lối đi.<br /><em>Gặp một câu chuyện.</em></h2><p>Tìm điểm tham quan trên bản đồ, chọn nơi bạn tò mò rồi mở thuyết minh. Từ muôn loài đến những tán cây, hành trình luôn theo nhịp của bạn.</p><ul><li><Icon name="pin" /> Chọn điểm dừng để xem giới thiệu</li><li><Icon name="headphones" /> Nghe câu chuyện bằng ngôn ngữ của bạn</li><li><Icon name="compass" /> Khám phá theo lộ trình gợi ý</li></ul><Link to="/explore" className="btn-primary">Mở bản đồ tham quan <span className="button-icon"><Icon name="arrow" /></span></Link></div>
      <div className="garden-map-preview">
        <div className="preview-map-canvas">
          <svg className="garden-map-art" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="600" height="380" fill="#e4ead6" />
            <path d="M0 65Q110 30 210 95T420 55T620 95M-20 300Q100 210 220 285T450 250T630 310" fill="none" stroke="#cfdbbd" strokeWidth="80" />
            <path d="M365 145C400 105 495 95 510 145S475 240 415 225 335 180 365 145" fill="#b5cfc5" stroke="#d5e1cb" strokeWidth="12" />
            <path d="M-20 220C100 245 110 95 230 145S300 340 440 300 485 80 620 60M185-20C145 75 260 80 230 145S90 260 135 400" fill="none" stroke="#f9f6e9" strokeWidth="23" />
            <path d="M-20 220C100 245 110 95 230 145S300 340 440 300 485 80 620 60" fill="none" stroke="#b7b99b" strokeWidth="2" strokeDasharray="5 8" />
            {[[55,65],[95,105],[305,60],[340,90],[555,275],[520,330],[65,325],[260,320],[370,345]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="25" fill="#c1d0af" /><circle cx={x-5} cy={y-6} r="19" fill="#a8bf93" /><path d={`M${x} ${y-4}v32`} stroke="#779065" strokeWidth="3" /></g>)}
          </svg>
          <span className="preview-map-label"><Icon name="leaf" /> Một khu vườn, nhiều khám phá</span>
          {discoveries.map((discovery, index) => <button key={discovery.category} type="button" className={`preview-pin preview-pin-${index}`} aria-label={`Xem ${discovery.label.toLowerCase()}`} aria-pressed={selected === index} aria-controls="preview-stop" onClick={() => setSelected(index)}><Icon name={discovery.icon} /><span>{discovery.label}</span></button>)}
          <span className="preview-map-note">Sơ đồ minh họa · Không dùng để định vị</span>
        </div>
        <div id="preview-stop" className="preview-stop" aria-live="polite" aria-atomic="true"><img src={item.image} alt="" width="80" height="80" loading="lazy" /><div><span>{item.label}</span><strong>{item.name}</strong></div><Link to={`/explore?category=${item.category}`} aria-label={`Mở bản đồ ${item.label.toLowerCase()}`}><Icon name="arrow" /></Link></div>
      </div>
    </section>
  </>;
};
