import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

const stories = [
  {
    label: 'Dấu ấn di sản', icon: 'compass' as const,
    title: 'Qua cánh cổng, chạm một miền ký ức.',
    description: 'Bắt đầu từ cánh cổng xanh quen thuộc. Đi chậm lại để cảm nhận một phần ký ức Sài Gòn, giữa lòng thành phố hôm nay.',
    image: '/images/thao-cam-vien-gate.webp',
    alt: 'Cổng sắt xanh mang tên Thảo Cầm Viên Sài Gòn dưới những tán cây.',
    caption: 'Cổng Thảo Cầm Viên Sài Gòn',
  },
  {
    label: 'Thế giới thực vật', icon: 'leaf' as const,
    title: 'Một khoảng trời, ngàn sắc lá.',
    description: 'Ngước nhìn những tán cây, tìm một khoảng râm mát và dành thời gian cho thế giới thực vật quanh mình. Mỗi bước đi là một góc nhìn mới.',
    image: '/images/thao-cam-vien-canopy.webp',
    alt: 'Những tán cây xanh vươn lên nền trời trong khuôn viên.',
    caption: 'Dưới những tán cây xanh',
  },
  {
    label: 'Những người bạn nhỏ', icon: 'headphones' as const,
    title: 'Dừng một chút. Khám phá nhiều hơn.',
    description: 'Quan sát sắc lông, dáng đi và những chuyển động nhỏ. Giữ khoảng cách, dành sự yên tĩnh cho các loài vật và để sự tò mò dẫn lối.',
    image: '/images/thao-cam-vien-pheasants.webp',
    alt: 'Những chú chim trĩ lông trắng đen, mặt đỏ tại Thảo Cầm Viên.',
    caption: 'Thế giới động vật tại Thảo Cầm Viên',
  },
];

export const HomePage: React.FC = () => {
  const [storyIndex, setStoryIndex] = useState(0);
  const story = stories[storyIndex];

  return (
    <div className="home-page-container">
      <section className="welcome-hero" aria-labelledby="welcome-heading">
        <div className="welcome-copy" data-reveal>
          <span className="heritage-label"><Icon name="leaf" /> Thảo Cầm Viên Sài Gòn, từ 1864</span>
          <h1 id="welcome-heading"><span className="heading-line">Chậm một bước.</span><span className="heading-line"><em>Nghe thiên nhiên.</em></span></h1>
          <p>Rời nhịp phố, bước vào khoảng xanh. Lắng nghe câu chuyện của những tán cây và muôn loài, theo nhịp bước của riêng bạn.</p>
          <div className="hero-actions">
            <Link to="/payment" className="btn-primary hero-cta">Bắt đầu tham quan <span className="button-icon"><Icon name="arrow" /></span></Link>
            <Link to="/explore" className="text-link">Đã có lượt tham quan?</Link>
          </div>
          <div className="hero-features"><span><Icon name="headphones" /> Nghe theo nhịp của bạn</span><span><Icon name="globe" /> Thuyết minh đa ngôn ngữ</span></div>
        </div>
        <div className="hero-garden" data-reveal>
          <figure className="hero-garden-inner">
            <img src="/images/thao-cam-vien-canopy.webp" width="800" height="800" decoding="async" fetchPriority="high" alt="Ánh sáng len qua những tán cây xanh ở Thảo Cầm Viên." />
            <span className="garden-stamp"><Icon name="leaf" /> Một khoảng xanh giữa Sài Gòn</span>
            <figcaption>
              <span>Đeo tai nghe. Mở một hành trình.</span>
              <strong>Thành phố ở lại.<br />Thiên nhiên gần hơn.</strong>
              <a href="#cau-chuyen" className="garden-discover" aria-label="Khám phá những câu chuyện"><Icon name="arrow" /></a>
            </figcaption>
          </figure>
          <div className="garden-note"><Icon name="headphones" /><span>Một chiếc tai nghe.<br /><strong>Muôn điều để lắng nghe.</strong></span><span className="sound-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
        </div>
      </section>

      <a className="journey-cue" href="#cau-chuyen"><span>Đi chậm lại, khám phá nhiều hơn</span><span className="cue-line" /><span className="cue-arrow"><Icon name="arrow" /></span></a>

      <section id="cau-chuyen" className="story-section" aria-labelledby="story-heading">
        <div className="section-heading" data-reveal><h2 id="story-heading">Mỗi lối rẽ,<br /><em>một câu chuyện.</em></h2><p>Một khu vườn, nhiều cách khám phá.<br />Hôm nay, điều gì khiến bạn tò mò?</p></div>
        <div className="story-layout" data-reveal>
          <figure className="story-image-shell">
            <div className="story-images">
              {stories.map((item, index) => <img key={item.image} src={item.image} alt={index === storyIndex ? item.alt : ''} aria-hidden={index !== storyIndex} className={index === storyIndex ? 'is-selected' : ''} width="800" height="800" loading="lazy" decoding="async" />)}
            </div>
            <figcaption><span>{story.caption}</span><span aria-hidden="true">0{storyIndex + 1} / 03</span></figcaption>
          </figure>
          <div className="story-content">
            <div className="story-choices" role="group" aria-label="Chọn chủ đề khám phá">
              {stories.map((item, index) => <button key={item.label} type="button" aria-pressed={index === storyIndex} aria-controls="story-description" onClick={() => setStoryIndex(index)}><Icon name={item.icon} /><span>{item.label}</span><span className="choice-mark" aria-hidden="true">{index === storyIndex ? <Icon name="arrow" /> : `0${index + 1}`}</span></button>)}
            </div>
            <div id="story-description" className="story-description" aria-live="polite" aria-atomic="true">
              <div key={storyIndex} className="story-copy"><h3>{story.title}</h3><p>{story.description}</p></div>
            </div>
            <Link to="/explore" className="text-link">Đến trang Khám phá <span className="link-icon"><Icon name="arrow" /></span></Link>
          </div>
        </div>
      </section>

      <section id="huong-dan" className="visit-guide" aria-labelledby="guide-heading">
        <div className="guide-intro" data-reveal><span className="guide-symbol"><Icon name="headphones" /></span><h2 id="guide-heading">Bạn đi dạo.<br /><em>Để câu chuyện dẫn đường.</em></h2><p>Mang theo tai nghe và bắt đầu với ba bước đơn giản. Bạn luôn có thể dừng, nghe lại và khám phá theo cách của mình.</p><Link to="/payment" className="btn-primary">Chuẩn bị lượt tham quan <span className="button-icon"><Icon name="arrow" /></span></Link></div>
        <ol className="guide-steps">
          <li data-reveal><span className="step-number">01</span><div><h3>Kích hoạt lượt tham quan</h3><p>Thử thanh toán trực tuyến hoặc nhập mã được cấp tại quầy vé.</p></div><Icon name="ticket" /></li>
          <li data-reveal><span className="step-number">02</span><div><h3>Chọn ngôn ngữ, chọn điểm đến</h3><p>Xem danh sách điểm tham quan và lộ trình trong mục Khám phá.</p></div><Icon name="compass" /></li>
          <li data-reveal><span className="step-number">03</span><div><h3>Đeo tai nghe và lắng nghe</h3><p>Mở thuyết minh tại điểm bạn thích, dừng và tiếp tục theo ý mình.</p></div><Icon name="headphones" /></li>
        </ol>
      </section>

      <section className="visit-questions" aria-labelledby="questions-heading" data-reveal>
        <h2 id="questions-heading">Trước khi bắt đầu</h2>
        <div>
          <details><summary>Tôi đã có mã tại quầy, dùng thế nào?<span aria-hidden="true">+</span></summary><p>Vào <Link to="/payment">Vé thuyết minh</Link>, chọn “Nhập mã tại quầy”, rồi nhập mã phiên và mã sáu chữ số do nhân viên cung cấp.</p></details>
          <details><summary>Tôi có thể dừng và nghe lại không?<span aria-hidden="true">+</span></summary><p>Có. Sau khi kích hoạt, vào Khám phá, chọn điểm tham quan rồi chủ động phát hoặc tạm dừng thuyết minh. Âm thanh không tự phát khi mở trang.</p></details>
          <details><summary>Bản trải nghiệm có thu tiền thật không?<span aria-hidden="true">+</span></summary><p>Không. Thanh toán trực tuyến ở phiên bản này là mô phỏng. Các tọa độ tham quan chưa được xác minh thực địa.</p></details>
        </div>
      </section>

      <aside className="demo-notice"><Icon name="info" /><p><strong>Bản trải nghiệm thử.</strong> Thanh toán được mô phỏng, không thu tiền thật. Nội dung và âm thanh phụ thuộc dữ liệu được triển khai trên máy chủ; tọa độ tham quan chưa được xác minh thực địa.</p></aside>
      <p className="photo-credit">Ảnh: <a href="https://silverkris.singaporeair.com/guide/vietnam/sgn/do-ho-chi-minh-city/saigon-zoo-and-botanical-gardens/" target="_blank" rel="noreferrer">SilverKris</a> / <a href="https://saigonzoo.vn/" target="_blank" rel="noreferrer">Thảo Cầm Viên Sài Gòn</a></p>
    </div>
  );
};
