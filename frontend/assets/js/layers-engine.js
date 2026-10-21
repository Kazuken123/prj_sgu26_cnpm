/**
 * THẢO CẦM VIÊN SÀI GÒN (EST. 1864) — IMMERSIVE BOTANICAL ENGINE
 * Features:
 *  1. Scroll-Driven 3D Historic Gate Opening (85deg Door Swing & Camera Fly-Through)
 *  2. Side Wildlife Rails & Canopy Parallax (Real Animals Pouring In from Edges on Scroll)
 *  3. Sequential Expedition Waypoints with Real MIA.vn Locations & Photography
 *  4. getlayers.ai/tools Interactive Micro-Widgets (Live VI ⇄ EN, 30m Radar, Isometric Layers)
 *  5. Web Audio Chime Synthesis & Canvas Waveform Visualizer
 *  6. OpenStreetMap Leaflet Geofence Simulation
 *  7. Botanical AI Field Assistant Drawer
 */

(function () {
  'use strict';

  // --- 1. AUTHENTIC TCV POIS FROM MIA.VN & DRAFT-03 ---
  const TCV_POIS = [
    {
      id: 'heritage-gate',
      key: 'heritage-gate',
      number: '01',
      category: 'Kiến trúc 1864 • Cổng Vòm Di Sản',
      coords: [10.787120, 106.705250],
      osmNode: '1864001',
      image: 'assets/images/tcv_cong_chinh.jpg',
      audioTime: '2.5 phút nghe',
      vi: {
        name: 'Cổng Vòm & Trục Di Sản 1864',
        desc: 'Được Đề đốc De La Grandière ký nghị định xây dựng ngày 23/03/1864, cổng vòm là chứng nhân lịch sử hơn 160 năm của vườn thú lâu đời thứ 8 trên thế giới.',
        script: 'Chào mừng quý khách đến với Thảo Cầm Viên Sài Gòn. Cổng vòm di sản mang kiến trúc cổ điển mở lối vào đại lộ rợp bóng cây cổ thụ hơn 160 năm tuổi, nơi lưu giữ ký ức tuổi thơ của bao thế hệ người dân thành phố.'
      },
      en: {
        name: 'Historic Gateway & 1864 Heritage Promenade',
        desc: 'Commissioned on March 23, 1864 by Admiral De La Grandière, this historic archway opens into the 8th oldest zoological garden in the world.',
        script: 'Welcome to Saigon Zoo and Botanical Gardens. Established in 1864, this monumental gateway leads you through century-old tree canopies into one of the most storied botanical sanctuaries in Southeast Asia.'
      }
    },
    {
      id: 'capybara-mai',
      key: 'capybara-mai',
      number: '02',
      category: 'Động vật thân thiện • Debut 2025',
      coords: [10.787600, 106.706100],
      osmNode: '1864002',
      image: 'assets/images/tcv_capybara.jpg',
      audioTime: '3 phút nghe',
      vi: {
        name: 'Quần Thể Capybara "Phú, Quý, Cát, Tường" & Ngựa Lùn Mai',
        desc: 'Bốn chú chuột lang nước Capybara hiền lành, hòa đồng cùng em ngựa lùn Mai "đầu moi" nổi tiếng là điểm dừng giao lưu ấm áp được hàng ngàn gia đình yêu thích.',
        script: 'Đầu năm 2025, bốn chú Capybara mang tên Phú, Quý, Cát, Tường chính thức ra mắt và nhanh chóng được phong danh hiệu "bộ trưởng ngoại giao" nhờ tính cách thân thiện, hiền lành tuyệt đối bên cạnh em ngựa lùn Mai.'
      },
      en: {
        name: 'Capybara Sanctuary & Mai the Miniature Pony',
        desc: 'Debuting in 2025, the friendly Capybaras named Phu, Quy, Cat, and Tuong along with pony Mai have become beloved ambassador animals.',
        script: 'Welcome to the friendly herbivore zone. The quartet of Capybaras and pony Mai represent modern community engagement, allowing visitors of all ages to observe peaceful animal coexistence.'
      }
    },
    {
      id: 'giraffe',
      key: 'giraffe',
      number: '03',
      category: 'Động vật quý hiếm • OSM 6045633938',
      coords: [10.7880953, 106.7078014],
      osmNode: '6045633938',
      image: 'assets/images/tcv_huou_thao_em.jpg',
      audioTime: '3 phút nghe',
      vi: {
        name: 'Chuồng Hươu Cao Cổ — Chú Hươu "Thảo Em"',
        desc: 'Khu chuồng hươu cao cổ rợp bóng mát nơi du khách có thể quan sát chú hươu Thảo Em vươn chiếc cổ cao đón lá non và tự tay cho hươu ăn qua hàng rào.',
        script: 'Hươu cao cổ nổi bật với chiều cao vượt trội và bộ lông có hoa văn độc bản. Chiếc cổ dài giúp chúng dễ dàng vươn tới nguồn lá non tươi mát trên tầng tán cao của khu vườn nhiệt đới.'
      },
      en: {
        name: 'Giraffe Savanna — Thao Em the Heritage Giraffe',
        desc: 'Home to giraffe Thao Em, offering an intimate observation point where guests can witness high-canopy browsing in a lush tropical paddock.',
        script: 'Giraffes are recognizable by their extraordinary height and unique spotted patterns. Their long necks enable them to forage on the highest tree foliage throughout the day.'
      }
    },
    {
      id: 'asian-elephant',
      key: 'asian-elephant',
      number: '04',
      category: 'Động vật quý hiếm • OSM 6045634869',
      coords: [10.7886498, 106.7071674],
      osmNode: '6045634869',
      image: 'assets/images/tcv_voi_chau_a.jpg',
      audioTime: '3.5 phút nghe',
      vi: {
        name: 'Chuồng Voi Châu Á — Tắm Mát Bờ Rạch Thị Nghè',
        desc: 'Đàn voi châu Á vui sướng tắm mát dưới làn nước trưa hè, sở hữu chiếc vòi linh hoạt với hơn 40.000 bó cơ dùng để cầm nắm và hút nước.',
        script: 'Chiếc vòi là nét đặc trưng kỳ diệu của voi châu Á với hơn 40.000 bó cơ linh hoạt. Voi dùng vòi để lấy thức ăn, hút nước tắm mát và giao tiếp thân ái với đồng loại trong khuôn viên thoáng đãng.'
      },
      en: {
        name: 'Asian Elephant Paddock by Thi Nghe Canal',
        desc: 'Asian elephants cooling down in refreshing waters, demonstrating their agile trunks powered by over 40,000 intricate muscle fascicles.',
        script: 'The agile trunk of the Asian elephant functions as both a delicate hand and powerful water hose. Here by the canal breeze, elephants enjoy daily baths and seasonal fruits.'
      }
    },
    {
      id: 'tiger-island',
      key: 'tiger-island',
      number: '05',
      category: 'Thú ăn thịt quý hiếm • Giờ ăn 15h00',
      coords: [10.789100, 106.706400],
      osmNode: '1864005',
      image: 'assets/images/tcv_ho_bengal.jpg',
      audioTime: '3.5 phút nghe',
      vi: {
        name: 'Đảo Săn Mồi: Cặp Hổ Bengal Bình & Dương & Bạch Hổ',
        desc: 'Cứ mỗi 15h00 chiều, du khách được chứng kiến màn huấn luyện bản năng hoang dã khi thức ăn được buộc lên cao cho sư tử, hổ Bengal và hổ trắng Bengal.',
        script: 'Chào mừng bạn đến với khu bảo tồn thú ăn thịt quý hiếm. Cặp hổ Bengal song sinh Bình và Dương cùng loài hổ trắng Bengal được chăm sóc nghiêm ngặt theo tiêu chuẩn bảo tồn gen động vật thế giới.'
      },
      en: {
        name: 'Predator Enclave: Bengal Tigers Binh & Duong & White Tigers',
        desc: 'At 3:00 PM daily, witness instinctual enrichment feeding sessions for Bengal tigers, rare white tigers, and lions high above the ground.',
        script: 'Saigon Zoo houses rare twin Bengal tigers Binh and Duong along with majestic White Bengal tigers. Daily feeding sessions maintain their primal predatory athleticism.'
      }
    },
    {
      id: 'flamingos-primates',
      key: 'flamingos-primates',
      number: '06',
      category: 'Đầm lầy chim muông & Linh trưởng',
      coords: [10.787400, 106.707200],
      osmNode: '1864006',
      image: 'assets/images/tcv_hong_hac.jpg',
      audioTime: '3 phút nghe',
      vi: {
        name: 'Hồ Chim Hồng Hạc, Chú Kangaroo Bún Cá & Đười Ươi Tèo',
        desc: 'Hồ nước trong lành rực sắc hồng hạc soi bóng nước, bên cạnh chú đười ươi Tèo nổi tiếng hay nhặt rác bảo vệ môi trường và chú kangaroo Bún Cá ngộ nghĩnh.',
        script: 'Đàn chim hồng hạc diễm lệ khoe sắc bên mặt hồ phản chiếu bóng mây. Liền kề là ngôi nhà của chú đười ươi Tèo thông minh và chú kangaroo Bún Cá, biểu tượng thân thiện của vườn bách thú.'
      },
      en: {
        name: 'Flamingo Lagoon, Teo the Orangutan & Bun Ca the Kangaroo',
        desc: 'A vibrant wetland haven with graceful flamingos, intelligent orangutan Teo known for eco-awareness, and playful kangaroo Bun Ca.',
        script: 'The Flamingo Lagoon offers picturesque tranquility. Nearby enclosures introduce orangutan Teo and kangaroo Bun Ca, delightful residents that captivate visitors.'
      }
    },
    {
      id: 'heritage-tree',
      key: 'heritage-tree',
      number: '07',
      category: 'Di sản thực vật cổ thụ • Louis Pierre 1865',
      coords: [10.787880, 106.706520],
      osmNode: '1864007',
      image: 'assets/images/tcv_cay_co_thu.jpg',
      audioTime: '4 phút nghe',
      vi: {
        name: 'Vườn Thực Vật Cổ Thụ, Cây Sọ Khỉ & Nhà Phong Lan 160 Năm',
        desc: 'Sở hữu 23 loài phong lan nội địa, 1.899 cây gỗ thuộc 26 loài quý hiếm cùng gốc cây Sọ Khỉ chu vi hơn 4m do nhà thực vật Louis Pierre gieo trồng.',
        script: 'Bạn đang đứng dưới tán lá của cây Sọ Khỉ hơn 160 năm tuổi. Vườn bách thảo hiện lưu giữ hàng ngàn cây gỗ cổ thụ, 23 loài lan rừng Việt Nam, tạo nên lá phổi xanh quý giá giữa lòng Sài Gòn.'
      },
      en: {
        name: 'Heritage Botanical Arboretum & 160-Year Mahogany Grove',
        desc: 'Home to 23 indigenous orchid species, 1,899 ancient timber trees, and monumental African mahogany planted by botanist Louis Pierre in 1865.',
        script: 'Stand beneath the majestic canopy of the 160-year-old African mahogany. Established by legendary botanist Louis Pierre, this arboretum breathes life into modern Ho Chi Minh City.'
      }
    },
    {
      id: 'night-safari',
      key: 'night-safari',
      number: '08',
      category: 'Tour đêm độc bản • Thứ 7 hàng tuần',
      coords: [10.788400, 106.705800],
      osmNode: '1864008',
      image: 'assets/images/tcv_tour_dem.jpg',
      audioTime: '3 phút nghe',
      vi: {
        name: 'Tour Đêm Sinh Thái "Khi Màn Đêm Buông Xuống"',
        desc: 'Chuyến xe điện chuyên dụng tối thứ Bảy đưa du khách khám phá cuộc sống và tập tính kỳ thú của linh cẩu, báo hoa mai và thú đêm dưới trăng.',
        script: 'Tour tham quan đêm mở ra một góc nhìn hoàn toàn mới về Thảo Cầm Viên. Khi bóng tối buông xuống, các loài động vật ăn đêm như linh cẩu, báo đốm thức giấc và hoạt động tích cực.'
      },
      en: {
        name: 'Night Safari "When Darkness Falls"',
        desc: 'An exclusive Saturday evening tram excursion unveiling the nocturnal habits of hyenas, leopards, and twilight wildlife under starlight.',
        script: 'Experience the mystical nocturnal atmosphere of Saigon Zoo. Guided electric shuttles bring visitors into the twilight realm of active night predators.'
      }
    }
  ];

  // Wildlife Peeker Avatars data for side rails
  const WILDLIFE_PEEKERS = [
    {
      id: 'peeker-capybara',
      side: 'left',
      name: 'Capybara "Phú Quý"',
      tag: 'Khu thân thiện',
      image: 'assets/images/tcv_capybara.jpg',
      targetId: 'capybara-mai',
      scrollTrigger: 400
    },
    {
      id: 'peeker-giraffe',
      side: 'right',
      name: 'Hươu "Thảo Em"',
      tag: 'Bán kính 30m',
      image: 'assets/images/tcv_huou_thao_em.jpg',
      targetId: 'giraffe',
      scrollTrigger: 750
    },
    {
      id: 'peeker-elephant',
      side: 'left',
      name: 'Voi Châu Á',
      tag: 'Tắm rạch Thị Nghè',
      image: 'assets/images/tcv_voi_chau_a.jpg',
      targetId: 'asian-elephant',
      scrollTrigger: 1100
    },
    {
      id: 'peeker-tiger',
      side: 'right',
      name: 'Bạch Hổ Bengal',
      tag: 'Giờ săn mồi 15:00',
      image: 'assets/images/tcv_ho_trang.jpg',
      targetId: 'tiger-island',
      scrollTrigger: 1450
    },
    {
      id: 'peeker-primate',
      side: 'left',
      name: 'Đười Ươi Tèo',
      tag: 'Nhặt rác bảo vệ vườn',
      image: 'assets/images/tcv_duoi_uoi_teo.jpg',
      targetId: 'flamingos-primates',
      scrollTrigger: 1800
    },
    {
      id: 'peeker-flamingo',
      side: 'right',
      name: 'Đàn Hồng Hạc',
      tag: 'Đầm lầy chim nước',
      image: 'assets/images/tcv_hong_hac.jpg',
      targetId: 'flamingos-primates',
      scrollTrigger: 2150
    }
  ];

  // Botanical Knowledge Base
  const BOTANICAL_KNOWLEDGE = [
    {
      keyword: 'cổ nhất',
      answer: 'Cây Sọ Khỉ (Khaya senegalensis) hơn 160 năm tuổi tại trục dạo bộ chính, với chu vi gốc hơn 4 mét do nhà thực vật học Louis Pierre ươm trồng từ năm 1865.'
    },
    {
      keyword: 'capybara',
      answer: 'Đầu năm 2025, bốn chú Capybara Phú, Quý, Cát, Tường ra mắt tại Thảo Cầm Viên, trở thành đại sứ thân thiện được du khách đặc biệt yêu mến.'
    },
    {
      keyword: 'hổ',
      answer: 'Thảo Cầm Viên chăm sóc cặp hổ Bengal song sinh Bình và Dương cùng loài bạch hổ Bengal quý hiếm. Cứ mỗi 15h00 chiều có màn huấn luyện bản năng săn mồi.'
    },
    {
      keyword: 'voi',
      answer: 'Voi châu Á sở hữu chiếc vòi linh hoạt hợp nhất từ mũi và môi trên với hơn 40.000 bó cơ, dùng để cầm nắm thức ăn và hút 8-10 lít nước mỗi lần.'
    },
    {
      keyword: 'hươu',
      answer: 'Chú hươu cao cổ Thảo Em là thành viên nổi tiếng tại chuồng hươu. Hươu cao cổ chỉ ngủ 10-30 phút mỗi ngày và thường ngủ đứng.'
    },
    {
      keyword: 'giá vé',
      answer: 'Vé cổng người lớn (>1.3m): 60.000đ; trẻ em (1m-1.3m): 40.000đ; trẻ dưới 1m miễn phí. Vé thuyết minh số GPS 24h: 50.000đ. Vé tour đêm thứ Bảy: 200.000đ.'
    },
    {
      keyword: '1864',
      answer: 'Thảo Cầm Viên Sài Gòn được thành lập tháng 3/1864 bởi Đô đốc De La Grandière và bác sĩ Louis Germain, là vườn bách thảo lâu đời thứ 8 trên thế giới.'
    }
  ];

  let currentLang = 'vi';
  let activePoiId = 'heritage-gate';
  let isAudioPlaying = false;
  let audioContext = null;
  let leafletMap = null;
  let userMarker = null;

  // --- 2. SCROLL-DRIVEN 3D GATE OPENING ANIMATION ---
  function initScrollDrivenGate() {
    const doorLeft = document.getElementById('gate-door-left');
    const doorRight = document.getElementById('gate-door-right');
    const gateRig = document.getElementById('gate-3d-rig');
    const gateVista = document.getElementById('gate-vista-interior');
    const promptChip = document.getElementById('scroll-prompt-indicator');

    if (!doorLeft || !doorRight) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset;
          // Gate animation spans from 0 to 450px scroll
          const progress = Math.min(Math.max(scrollY / 450, 0), 1);

          // Easing
          const eased = progress * progress * (3 - 2 * progress);

          // Rotate doors open
          const angle = eased * 85; // 0 to 85 degrees
          doorLeft.style.transform = `perspective(1000px) rotateY(${-angle}deg)`;
          doorRight.style.transform = `perspective(1000px) rotateY(${angle}deg)`;

          // Scale & fly camera forward into the gate
          if (gateRig) {
            const scale = 1 + eased * 0.32;
            const transZ = eased * 140;
            gateRig.style.transform = `perspective(1200px) scale(${scale}) translateZ(${transZ}px)`;
          }

          if (gateVista) {
            gateVista.style.transform = `scale(${1.05 + eased * 0.28})`;
            gateVista.style.filter = `brightness(${0.85 + eased * 0.3}) contrast(1.15)`;
          }

          // Fade prompt chip
          if (promptChip) {
            promptChip.style.opacity = Math.max(0, 1 - progress * 2.2).toString();
          }

          // Update Wildlife Rails
          updateWildlifePeekers(scrollY);

          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
  }

  // --- 3. DYNAMIC SIDE WILDLIFE RAILS ---
  function initWildlifeRails() {
    let leftRail = document.getElementById('wildlife-rail-left');
    let rightRail = document.getElementById('wildlife-rail-right');

    if (!leftRail) {
      leftRail = document.createElement('div');
      leftRail.id = 'wildlife-rail-left';
      leftRail.className = 'wildlife-rail-left';
      document.body.appendChild(leftRail);
    }

    if (!rightRail) {
      rightRail = document.createElement('div');
      rightRail.id = 'wildlife-rail-right';
      rightRail.className = 'wildlife-rail-right';
      document.body.appendChild(rightRail);
    }

    // Build badges
    WILDLIFE_PEEKERS.forEach(peeker => {
      const badge = document.createElement('div');
      badge.className = 'wildlife-peeker-badge';
      badge.id = peeker.id;
      badge.innerHTML = `
        <div class="wildlife-peeker-avatar">
          <img src="${peeker.image}" alt="${peeker.name}">
        </div>
        <div class="wildlife-peeker-meta">
          <div class="wildlife-peeker-name">${peeker.name}</div>
          <div class="wildlife-peeker-tag">${peeker.tag}</div>
        </div>
      `;

      badge.addEventListener('click', () => {
        playPoiAudio(peeker.targetId);
        const targetEl = document.getElementById(peeker.targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      if (peeker.side === 'left') {
        leftRail.appendChild(badge);
      } else {
        rightRail.appendChild(badge);
      }
    });
  }

  function updateWildlifePeekers(scrollY) {
    WILDLIFE_PEEKERS.forEach(peeker => {
      const badge = document.getElementById(peeker.id);
      if (!badge) return;

      // Reveal if scrolled past trigger threshold
      if (scrollY > peeker.scrollTrigger) {
        badge.classList.add('active-visible');
      } else {
        badge.classList.remove('active-visible');
      }
    });
  }

  // --- 4. CANOPY PARALLAX ---
  function initCanopyParallax() {
    const leftCanopy = document.getElementById('foliage-left');
    const rightCanopy = document.getElementById('foliage-right');
    if (!leftCanopy || !rightCanopy) return;

    window.addEventListener('mousemove', e => {
      const offsetX = (e.clientX / window.innerWidth - 0.5) * 16;
      const offsetY = (e.clientY / window.innerHeight - 0.5) * 12;
      leftCanopy.style.transform = `translate(${offsetX * 0.4}px, ${offsetY * 0.4}px)`;
      rightCanopy.style.transform = `translate(${-offsetX * 0.4}px, ${-offsetY * 0.4}px)`;
    });
  }

  // --- 5. IN-APP TOAST SYSTEM (NO WINDOW.ALERT) ---
  function showToast(text) {
    let toast = document.getElementById('botanical-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'botanical-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(30px);
        background: rgba(7, 28, 18, 0.95);
        border: 1px solid rgba(44, 229, 155, 0.4);
        box-shadow: 0 16px 36px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18);
        color: #F5F9F6;
        padding: 10px 24px;
        border-radius: 9999px;
        font-family: var(--font-mono);
        font-size: 0.82rem;
        z-index: 2000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="hardware-led-pulse"></span> ${text}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(30px)';
    }, 3400);
  }

  // --- 6. WEB AUDIO SYNTHESIS & CANVAS WAVEFORM ---
  function initWaveformVisualizer() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let waveOffset = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const count = 22;
      const barW = canvas.width / count;

      for (let i = 0; i < count; i++) {
        const h = isAudioPlaying 
          ? (Math.sin(waveOffset + i * 0.45) * 0.45 + 0.5) * (canvas.height - 8)
          : 4;
        const y = (canvas.height - h) / 2;
        ctx.fillStyle = isAudioPlaying ? '#2CE59B' : 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(i * barW + 2, y, barW - 4, h);
      }

      if (isAudioPlaying) waveOffset += 0.18;
      requestAnimationFrame(draw);
    }
    draw();
  }

  function playHarmonicChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();

      const now = audioContext.currentTime;
      // Synthesize natural warm harmonic frequencies (E4, G#4, B4, E5)
      const notes = [329.63, 415.30, 493.88, 659.25];
      notes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
    } catch (e) {
      console.warn('Audio synthesis not supported or permitted:', e);
    }
  }

  function playPoiAudio(poiId) {
    const poi = TCV_POIS.find(p => p.id === poiId) || TCV_POIS[0];
    activePoiId = poi.id;
    isAudioPlaying = true;
    playHarmonicChime();

    // Update Console Bar
    const titleEl = document.getElementById('player-poi-title');
    const descEl = document.getElementById('player-poi-desc');
    const artEl = document.getElementById('player-artwork');
    const playCircle = document.getElementById('btn-play-pause-circle');

    if (titleEl) titleEl.textContent = poi[currentLang].name;
    if (descEl) descEl.textContent = `${poi.category} • Bán kính 30m • ${poi.audioTime}`;
    if (artEl) artEl.src = poi.image;
    if (playCircle) {
      playCircle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      `;
    }

    showToast(`Đang phát: ${poi[currentLang].name}`);
  }

  function toggleAudio() {
    isAudioPlaying = !isAudioPlaying;
    const playCircle = document.getElementById('btn-play-pause-circle');
    if (isAudioPlaying) {
      playPoiAudio(activePoiId);
    } else {
      if (playCircle) {
        playCircle.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        `;
      }
      showToast('Đã tạm dừng bài thuyết minh');
    }
  }

  // --- 7. LEAFLET OSM MAP & 30M GEOFENCING ---
  function initLeafletMap() {
    const mapContainer = document.getElementById('tcv-leaflet-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Center on Thảo Cầm Viên Sài Gòn
    leafletMap = L.map('tcv-leaflet-map', {
      center: [10.787880, 106.706520],
      zoom: 17,
      zoomControl: true
    });

    // Dark-green botanical tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors • Thảo Cầm Viên Sài Gòn'
    }).addTo(leafletMap);

    // Plot POIs with 30m Geofence Circles
    TCV_POIS.forEach(poi => {
      // 30m Radius Circle
      L.circle(poi.coords, {
        radius: 30,
        color: '#2CE59B',
        fillColor: '#2CE59B',
        fillOpacity: 0.16,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(leafletMap);

      // Marker
      const customIcon = L.divIcon({
        className: 'tcv-leaflet-poi-icon',
        html: `
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: #071C12; border: 2px solid #2CE59B;
            box-shadow: 0 0 12px rgba(44, 229, 155, 0.6);
            display: grid; place-items: center; color: #F5F9F6;
            font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
          ">
            ${poi.number}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(poi.coords, { icon: customIcon }).addTo(leafletMap);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 0.88rem; color: #030D08; padding: 4px;">
          <strong style="display: block; font-size: 0.95rem; margin-bottom: 4px;">${poi.vi.name}</strong>
          <div style="font-size: 0.76rem; color: #166534; font-family: monospace; margin-bottom: 6px;">BÁN KÍNH 30M • ${poi.audioTime}</div>
          <p style="margin: 0; line-height: 1.4;">${poi.vi.desc}</p>
        </div>
      `);

      marker.on('click', () => {
        playPoiAudio(poi.id);
      });
    });

    // Simulated User Position
    const userIcon = L.divIcon({
      className: 'tcv-user-marker',
      html: `
        <div style="
          width: 18px; height: 18px; border-radius: 50%;
          background: #D9653B; border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 16px #D9653B;
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarker = L.marker([10.787120, 106.705250], { icon: userIcon }).addTo(leafletMap);
  }

  function simulateWalkTo(poiId) {
    const poi = TCV_POIS.find(p => p.id === poiId) || TCV_POIS[0];
    if (!leafletMap || !userMarker) return;

    userMarker.setLatLng(poi.coords);
    leafletMap.flyTo(poi.coords, 18, { duration: 1.4 });
    playPoiAudio(poi.id);
    showToast(`Đã bước vào vùng kích hoạt 30m: ${poi[currentLang].name}`);
  }

  // --- 8. BOTANICAL AI FIELD ASSISTANT ---
  function initBotanicalAiDrawer() {
    let drawer = document.getElementById('botanical-ai-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'botanical-ai-drawer';
      drawer.className = 'botanical-ai-drawer';
      drawer.innerHTML = `
        <div class="ai-drawer-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="brand-leaf-icon" style="width: 28px; height: 28px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style="font-family: var(--font-serif); font-size: 1.05rem; font-weight: 700; color: #F5F9F6;">Trợ Lý Bách Thảo AI</div>
              <div style="font-family: var(--font-mono); font-size: 0.68rem; color: var(--tcv-leaf-vibrant);">HỎI ĐÁP DI SẢN & ĐỘNG THỰC VẬT</div>
            </div>
          </div>
          <button id="btn-close-ai-drawer" style="background: transparent; border: none; color: var(--tcv-stone-muted); cursor: pointer; padding: 6px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="ai-messages-pane" id="ai-messages-pane">
          <div class="ai-chat-bubble ai-bubble-bot">
            Xin chào quý khách! Tôi là Trợ lý bách thảo Thảo Cầm Viên Sài Gòn (thành lập 1864). Quý khách có thể hỏi tôi về cây Sọ Khỉ cổ thụ, gia đình Capybara, chú voi châu Á, hay giờ cho thú ăn lúc 15h00 chiều.
          </div>
        </div>

        <div class="ai-input-dock">
          <input type="text" id="ai-user-input" class="ai-text-field" placeholder="Hỏi về động vật, cây cổ thụ, giá vé..." />
          <button id="btn-send-ai-msg" class="btn-ai-send" title="Gửi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    // Bind triggers
    document.querySelectorAll('.btn-open-botanical-ai').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        drawer.classList.add('open');
      });
    });

    const closeBtn = document.getElementById('btn-close-ai-drawer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }

    const sendBtn = document.getElementById('btn-send-ai-msg');
    const inputEl = document.getElementById('ai-user-input');
    const msgPane = document.getElementById('ai-messages-pane');

    function sendUserQuery() {
      const q = inputEl.value.trim();
      if (!q) return;

      // Append user bubble
      const uBubble = document.createElement('div');
      uBubble.className = 'ai-chat-bubble ai-bubble-user';
      uBubble.textContent = q;
      msgPane.appendChild(uBubble);
      inputEl.value = '';
      msgPane.scrollTop = msgPane.scrollHeight;

      // Find answer
      const lower = q.toLowerCase();
      let matched = BOTANICAL_KNOWLEDGE.find(item => lower.includes(item.keyword));
      let replyText = matched 
        ? matched.answer 
        : 'Thảo Cầm Viên Sài Gòn là vườn bách thú hơn 160 năm tuổi với 590 đầu thú thuộc 125 loài và 1.899 cây cổ thụ quý hiếm. Quý khách có thể xem thêm ở các trạm thuyết minh trên bản đồ số!';

      setTimeout(() => {
        const bBubble = document.createElement('div');
        bBubble.className = 'ai-chat-bubble ai-bubble-bot';
        bBubble.textContent = replyText;
        msgPane.appendChild(bBubble);
        msgPane.scrollTop = msgPane.scrollHeight;
      }, 350);
    }

    if (sendBtn) sendBtn.addEventListener('click', sendUserQuery);
    if (inputEl) {
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendUserQuery();
      });
    }
  }

  // --- 9. LANGUAGE TOGGLER ---
  function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang-vi]').forEach(el => {
      el.textContent = lang === 'vi' ? el.getAttribute('data-lang-vi') : el.getAttribute('data-lang-en');
    });
    showToast(`Đã chuyển ngôn ngữ: ${lang === 'vi' ? 'Tiếng Việt' : 'English'}`);
  }

  // --- EXPOSE GLOBAL ENGINE ---
  window.TCV = {
    pois: TCV_POIS,
    play: playPoiAudio,
    toggle: toggleAudio,
    walkTo: simulateWalkTo,
    setLang: setLanguage,
    showToast: showToast
  };

  // --- INITIALIZE ON DOM READY ---
  document.addEventListener('DOMContentLoaded', () => {
    initScrollDrivenGate();
    initWildlifeRails();
    initCanopyParallax();
    initWaveformVisualizer();
    initLeafletMap();
    initBotanicalAiDrawer();

    const playPauseBtn = document.getElementById('btn-play-pause-circle');
    if (playPauseBtn) playPauseBtn.addEventListener('click', toggleAudio);

    const simWalkBtn = document.getElementById('btn-simulate-walk');
    if (simWalkBtn) {
      let simIdx = 0;
      simWalkBtn.addEventListener('click', () => {
        simIdx = (simIdx + 1) % TCV_POIS.length;
        simulateWalkTo(TCV_POIS[simIdx].id);
      });
    }
  });

})();
