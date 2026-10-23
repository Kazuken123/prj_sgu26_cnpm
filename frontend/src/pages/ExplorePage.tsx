import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PoiImage } from '../components/PoiImage';
import { getApiBaseUrl, ApiError } from '../api/client';
import { loadGuestSession } from '../api/guestStorage';
import { getVisitMe } from '../api/payment';
import { getContentBundle, BundleDto, PoiDto, TourDto } from '../api/content';
import { AudioPlayer } from '../components/AudioPlayer';
import { MapView, calculateHaversineDistance } from '../components/MapView';
import { Icon } from '../components/Icon';
import { searchBundleText } from '../api/bundleSearch';

function formatCategory(category: string | null): string {
  if (!category) return 'Chưa phân loại';
  switch (category.toUpperCase()) {
    case 'ANIMAL':
      return 'Động vật';
    case 'PLANT':
      return 'Thực vật & Cây cổ thụ';
    case 'HERITAGE':
      return 'Di tích & Lịch sử';
    case 'AMENITY':
      return 'Dịch vụ & Tiện ích';
    default:
      return category;
  }
}

export const ExplorePage: React.FC = () => {
  const currentBaseUrl = getApiBaseUrl();
  const { session, mismatchedBaseUrl } = loadGuestSession(currentBaseUrl);
  const token = mismatchedBaseUrl ? null : session.token;

  const [bundle, setBundle] = useState<BundleDto | null>(null);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('vi');
  const [loadingLanguageCode, setLoadingLanguageCode] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(Boolean(token));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<{ code: string; message: string } | null>(null);

  // Bộ lọc phân khu
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category') || 'ALL';
  const [selectedCategory, setSelectedCategory] = useState<string>(['ANIMAL', 'PLANT', 'HERITAGE', 'AMENITY'].includes(requestedCategory) ? requestedCategory : 'ALL');
  const [poiQuery, setPoiQuery] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  const selectPoi = useCallback((id: number) => {
    setSelectedPoiId(id);
    if (window.matchMedia?.('(max-width: 700px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Tour dang chon
  const [activeTourId, setActiveTourId] = useState<number | null>(null);

  // Vị trí người dùng GPS thực tế (US-B01, US-B02)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isAutoTourActive, setIsAutoTourActive] = useState<boolean>(false);
  const [playedPoisInPass, setPlayedPoisInPass] = useState<{ [poiId: number]: boolean }>({});

  const [autoPlayRequest, setAutoPlayRequest] = useState<{ id: number; poiId: number } | null>(null);
  const autoPlaySequence = useRef(0);
  const attemptedPois = useRef(new Set<number>());
  const activeAutoPoi = useRef<number | null>(null);
  const handlePlaybackStarted = useCallback((poiId: number) => {
    setPlayedPoisInPass(prev => prev[poiId] ? prev : { ...prev, [poiId]: true });
  }, []);

  // Tra cứu từ khóa trong gói nội dung; chưa tích hợp chatbot RAG.
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Tra cứu theo tên điểm tham quan trong gói nội dung đang tải. Đây là tìm kiếm từ khóa, chưa tích hợp chatbot RAG; nội dung không xác nhận thông tin thực địa hiện hành.'
    }
  ]);

  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tải bundle theo ngôn ngữ
  const fetchBundle = useCallback(async (targetLang: string, authToken: string) => {
    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingLanguageCode(targetLang);
    setBundleError(null);

    try {
      const data = await getContentBundle(targetLang, authToken, controller.signal, currentBaseUrl);

      if (currentSeq !== requestSeqRef.current) return;

      setBundle(data);
      setSelectedLanguageCode(data.requestedLanguageCode);
      setLoadingLanguageCode(null);

      setSelectedPoiId((prevId) => {
        if (prevId !== null && data.pois.some((p) => p.poiId === prevId)) {
          return prevId;
        }
        const first = data.pois.find(p => requestedCategory === 'ALL' || p.category.toUpperCase() === requestedCategory) || data.pois[0];
        return first?.poiId ?? null;
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'ABORT_ERROR') return;
      if (currentSeq !== requestSeqRef.current) return;

      setLoadingLanguageCode(null);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setSessionError('Phiên tham quan của bạn đã hết hạn hoặc không hợp lệ. Vui lòng kích hoạt lại vé.');
          setBundle(null);
        } else {
          setBundleError({ code: err.code, message: err.message });
        }
      } else {
        setBundleError({
          code: 'NETWORK_ERROR',
          message: 'Không thể kết nối máy chủ để tải gói dữ liệu tham quan.'
        });
      }
    }
  }, [currentBaseUrl, requestedCategory]);

  // Khởi tạo và xác minh phiên
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    setSessionError(null);

    getVisitMe(token, currentBaseUrl)
      .then(() => {
        if (cancelled) return;
        setIsVerifying(false);
        fetchBundle('vi', token);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setIsVerifying(false);
        if (err instanceof ApiError && err.status === 401) {
          setSessionError('Phiên tham quan không hợp lệ hoặc đã hết thời gian sử dụng 24h.');
        } else {
          setSessionError(err instanceof Error ? err.message : 'Chưa thể xác minh phiên tham quan.');
        }
      });

    return () => {
      cancelled = true;
      requestSeqRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [token, currentBaseUrl, fetchBundle]);

  // GPS theo dõi vị trí thực tế liên tục
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        console.warn('Lỗi định vị GPS:', err.message);
        setUserLocation(null);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // LOGIC TỰ ĐỘNG KÍCH HOẠT THUYẾT MINH THEO VỊ TRÍ (US-B02)
  useEffect(() => {
    if (!isAutoTourActive || !userLocation || !bundle || bundle.pois.length === 0) return;

    let nearestPoi: PoiDto | null = null;
    let minDistance = Infinity;

    bundle.pois.forEach((poi) => {
      const dist = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        poi.latitude,
        poi.longitude
      );
      const radius = poi.triggerRadius || 30;

      if (dist > radius * 1.5) {
        attemptedPois.current.delete(poi.poiId);
        if (activeAutoPoi.current === poi.poiId) {
          activeAutoPoi.current = null;
          setAutoPlayRequest(null);
        }
      }

      // Đặt lại cờ chống lặp khi đi ra xa hơn 1.5 lần bán kính (45m)
      if (dist > radius * 1.5 && playedPoisInPass[poi.poiId]) {
        setPlayedPoisInPass((prev) => ({ ...prev, [poi.poiId]: false }));
      }

      // Kiểm tra POI nằm trong bán kính kích hoạt và chưa phát trong lượt này
      if (dist <= radius && !playedPoisInPass[poi.poiId] && !attemptedPois.current.has(poi.poiId) && poi.audio.status === 'AVAILABLE' && poi.audio.url) {
        if (dist < minDistance) {
          minDistance = dist;
          nearestPoi = poi;
        }
      }
    });

    if (nearestPoi && activeAutoPoi.current === null) {
      const poiToPlay = nearestPoi as PoiDto;
      setSelectedPoiId(poiToPlay.poiId);
      attemptedPois.current.add(poiToPlay.poiId);
      activeAutoPoi.current = poiToPlay.poiId;
      setAutoPlayRequest({ id: ++autoPlaySequence.current, poiId: poiToPlay.poiId });
    }
  }, [userLocation, isAutoTourActive, bundle, playedPoisInPass]);

  const handleSelectLanguage = (langCode: string) => {
    if (!token || langCode === selectedLanguageCode || loadingLanguageCode === langCode) return;
    fetchBundle(langCode, token);
  };

  const selectedPoi: PoiDto | undefined = bundle?.pois.find((p) => p.poiId === selectedPoiId);
  const activeTour: TourDto | null = bundle?.tours.find((t) => t.tourId === activeTourId) || null;

  // Lọc POI theo phân khu
  const filteredPois = (bundle?.pois || []).filter((poi) => {
    const categoryMatches = selectedCategory === 'ALL' || (poi.category || '').toUpperCase() === selectedCategory;
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    return categoryMatches && normalize(`${poi.text.name || ''} ${poi.originalName}`).includes(normalize(poiQuery.trim()));
  });

  // Xử lý gửi tin nhắn Chatbot
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const q = chatQuestion.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setChatQuestion('');

    const answer = searchBundleText(q, bundle?.pois || []);
    setChatMessages((prev) => [...prev, { sender: 'bot', text: answer }]);
  };

  // 1. TRƯỜNG HỢP CHƯA CÓ TOKEN
  if (!token) {
    return (
      <div className="explore-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 16px' }}>
        <div className="tcv-card access-gate" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <span className="gate-icon" style={{ fontSize: '3rem' }}>🎧</span>
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#244b38', margin: '16px 0 10px' }}>
            Bắt đầu hành trình khám phá
          </h1>
          <p style={{ color: '#4b5563', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Khuôn viên Thảo Cầm Viên Sài Gòn có hơn 130 loài động vật quý hiếm và 2.500 cây cổ thụ di sản.
            Kích hoạt vé tham quan để mở khóa bản đồ tương tác định vị GPS và tự động thuyết minh đa ngôn ngữ.
          </p>
          <div className="gate-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/payment" className="btn-primary" style={{ padding: '12px 28px', fontSize: '1rem', textDecoration: 'none' }}>
              Kích hoạt vé tham quan ngay →
            </Link>
            <Link to="/" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem', textDecoration: 'none' }}>
              Xem giới thiệu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. TRƯỜNG HỢP ĐANG XÁC MINH PHIÊN
  if (isVerifying && !bundle) {
    return (
      <div className="explore-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <div className="tcv-card" style={{ padding: '48px 24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌿</div>
          <h2 style={{ color: '#244b38', fontSize: '1.4rem', margin: '0 0 8px' }}>
            Đang xác minh vé tham quan...
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            Hệ thống đang tải gói dữ liệu thuyết minh và bản đồ Thảo Cầm Viên Sài Gòn.
          </p>
        </div>
      </div>
    );
  }

  // 3. TRƯỜNG HỢP PHIÊN HẾT HẠN
  if (sessionError) {
    return (
      <div className="explore-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
        <div className="tcv-card" style={{ padding: '36px 24px' }}>
          <h1 className="hero-title" style={{ fontSize: '1.8rem', color: '#991b1b', margin: '0 0 12px' }}>
            Quyền tham quan không khả dụng
          </h1>
          <div className="banner-notice" style={{ margin: '20px 0', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b' }}>
            <Icon name="info" />
            <div>
              <div className="banner-title" style={{ fontWeight: 700 }}>Thông báo phiên tham quan</div>
              <div className="banner-desc">{sessionError}</div>
            </div>
          </div>
          <div className="gate-actions" style={{ display: 'flex', gap: '12px' }}>
            <Link to="/payment" className="btn-primary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
              Mua hoặc gia hạn vé
            </Link>
            <Link to="/" className="btn-secondary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-container botanical-explore">
      
      {/* THANH ĐIỀU KHIỂN & CHỌN NGÔN NGỮ */}
      <div className="tcv-card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#315c43', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Thảo Cầm Viên Sài Gòn
              </span>
              <span className="status-pill ready" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                {bundle ? 'Vé đang hiệu lực' : 'Đang tải nội dung'}
              </span>
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', margin: '4px 0 0', color: '#244b38' }}>
              Bản Đồ Số & Thuyết Minh Tự Động
            </h1>
          </div>

          {/* Chọn ngôn ngữ */}
          <div className="explore-languages" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151' }}>
              Ngôn ngữ thuyết minh:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {bundle?.languages && bundle.languages.length > 0 ? (
                bundle.languages.map((lang) => {
                  const isCurrent = lang.code === selectedLanguageCode;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      aria-label={lang.name}
                      aria-pressed={isCurrent}
                      onClick={() => handleSelectLanguage(lang.code)}
                      disabled={Boolean(loadingLanguageCode)}
                      className={`btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontWeight: isCurrent ? 700 : 500 }}
                    >
                      {lang.code.toUpperCase()}
                      {loadingLanguageCode === lang.code ? '...' : ''}
                    </button>
                  );
                })
              ) : (
                <>
                  <button type="button" onClick={() => handleSelectLanguage('vi')} className="btn-sm btn-primary">VI</button>
                  <button type="button" onClick={() => handleSelectLanguage('en')} className="btn-sm btn-secondary">EN</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thanh công cụ Định vị GPS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Nut Bat dau tham quan tu dong */}
            <button
              type="button"
              onClick={() => {
                attemptedPois.current.clear();
                activeAutoPoi.current = null;
                setAutoPlayRequest(null);
                setIsAutoTourActive(!isAutoTourActive);
              }}
              className={isAutoTourActive ? 'btn-primary' : 'btn-secondary'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontWeight: 700,
                background: isAutoTourActive ? '#315c43' : '#ffffff',
                color: isAutoTourActive ? '#ffffff' : '#315c43',
                borderColor: '#315c43'
              }}
            >
              <span>{isAutoTourActive ? '🔊' : '▶️'}</span>
              <span>{isAutoTourActive ? 'Đang bật Thuyết minh Tự động' : 'Bắt đầu tham quan (Tự động)'}</span>
            </button>

          </div>

          {!userLocation && <div role="status">Đang chờ vị trí GPS thực tế để tự động phát.</div>}

          {/* Thong tin han ve */}
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Hạn vé: <strong style={{ color: '#244b38' }}>{bundle?.expiresAt ? new Date(bundle.expiresAt).toLocaleString('vi-VN') : '24 giờ'}</strong>
          </div>
        </div>
      </div>

      {bundleError && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{bundleError.message}</div><button type="button" className="btn-secondary btn-sm" onClick={() => fetchBundle(selectedLanguageCode, token)}>Thử lại</button>
        </div>
      )}

      <div className="explore-toolbar">
        <label className="poi-search"><Icon name="search" /><input type="search" value={poiQuery} onChange={event => setPoiQuery(event.target.value)} placeholder="Tìm điểm tham quan..." aria-label="Tìm điểm tham quan" /></label>
        <div className="category-filters" role="group" aria-label="Lọc điểm tham quan">
          {[{ id: 'ALL', label: 'Tất cả' }, { id: 'ANIMAL', label: 'Động vật' }, { id: 'PLANT', label: 'Thực vật' }, { id: 'HERITAGE', label: 'Di tích' }, { id: 'AMENITY', label: 'Tiện ích' }].map(category => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)}>{category.label}</button>)}
        </div>
      </div>
      <div className="explore-workspace">
        <section className="poi-directory" aria-labelledby="poi-directory-heading" aria-busy={Boolean(loadingLanguageCode)}>
          <div className="panel-heading"><h2 id="poi-directory-heading">Điểm tham quan</h2><span aria-live="polite">{filteredPois.length}</span></div>
          <p className="panel-hint">Chọn một điểm dừng để khám phá.</p>
          <div className="poi-directory-list">
            {filteredPois.map(poi => {
              const distance = userLocation ? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, poi.latitude, poi.longitude) : null;
              return <button type="button" className="poi-list-item" key={poi.poiId} aria-pressed={selectedPoiId === poi.poiId} aria-controls="selected-poi-detail" onClick={() => selectPoi(poi.poiId)}>
                <PoiImage src={poi.avatarUrl} name={poi.text.name || poi.originalName} category={poi.category} />
                <span className="poi-list-copy"><strong>{poi.text.name || poi.originalName}</strong><span>{formatCategory(poi.category)}</span>{distance !== null && <small>{distance} m từ bạn</small>}</span><Icon name="arrow" />
              </button>;
            })}
            {filteredPois.length === 0 && <div className="poi-empty" role="status"><Icon name="search" /><p>{loadingLanguageCode ? 'Đang tải điểm tham quan…' : poiQuery || selectedCategory !== 'ALL' ? 'Không tìm thấy điểm phù hợp.' : 'Chưa có điểm tham quan để hiển thị.'}</p>{(poiQuery || selectedCategory !== 'ALL') && <button type="button" className="text-link" onClick={() => { setPoiQuery(''); setSelectedCategory('ALL'); }}>Xóa bộ lọc</button>}</div>}
          </div>
        </section>
        <section className="explore-map-panel" aria-labelledby="explore-map-heading">
          <div className="panel-heading"><h2 id="explore-map-heading"><Icon name="map" /> Bản đồ khu vườn</h2><span className="map-live-label">{userLocation ? 'GPS đã bật' : 'Chưa có GPS'}</span></div>
          <MapView pois={filteredPois} tourPois={bundle?.pois} selectedPoiId={selectedPoiId} onSelectPoi={selectPoi} userLocation={userLocation} activeTour={activeTour} filteredCategory="ALL" />
          <p className="map-help"><Icon name="info" /> Chạm vào điểm trên bản đồ để xem giới thiệu. Tọa độ đang trong giai đoạn thử nghiệm.</p>
          {bundle?.tours && bundle.tours.length > 0 && <div className="explore-tours"><h3><Icon name="compass" /> Lộ trình gợi ý</h3><div>{bundle.tours.map(tour => <button key={tour.tourId} type="button" aria-pressed={activeTourId === tour.tourId} onClick={() => setActiveTourId(activeTourId === tour.tourId ? null : tour.tourId)}><strong>{tour.name}</strong><span>{tour.items.length} điểm dừng · {activeTourId === tour.tourId ? 'Đang xem' : 'Xem lộ trình'}</span></button>)}</div></div>}
        </section>
        <aside ref={detailRef} id="selected-poi-detail" className="poi-detail-panel" aria-label="Chi tiết điểm tham quan">
          {selectedPoi ? <>
            <PoiImage key={selectedPoi.poiId} src={selectedPoi.avatarUrl} name={selectedPoi.text.name || selectedPoi.originalName} category={selectedPoi.category} className="poi-detail-photo" />
            <div className="poi-detail-copy">
              <span className="category-label"><Icon name={selectedPoi.category.toUpperCase() === 'ANIMAL' ? 'paw' : selectedPoi.category.toUpperCase() === 'PLANT' ? 'leaf' : 'pin'} />{formatCategory(selectedPoi.category)}</span>
              <h2>{selectedPoi.text.name || selectedPoi.originalName}</h2>
              {selectedPoi.text.name && selectedPoi.text.name !== selectedPoi.originalName && <p className="poi-original-name">{selectedPoi.originalName}</p>}
              <span className={`status-pill ${selectedPoi.audio.status === 'AVAILABLE' ? 'ready' : 'idle'}`}>{selectedPoi.audio.status === 'AVAILABLE' ? 'Sẵn sàng thuyết minh' : 'Chưa có âm thanh'}</span>
              <div className="poi-detail-audio"><AudioPlayer key={[selectedPoi.poiId, selectedLanguageCode, selectedPoi.audio.url, token].join(':')} autoPlayRequestId={isAutoTourActive && autoPlayRequest?.poiId === selectedPoi.poiId ? autoPlayRequest.id : null} onPlaybackStarted={handlePlaybackStarted} poi={selectedPoi} requestedLanguageCode={selectedLanguageCode} token={token} onSessionExpired={() => { setSessionError('Phiên tham quan đã hết hạn.'); setBundle(null); }} /></div>
              <div className="poi-facts">
                {selectedPoi.conservationStatus && <div><span>Bảo tồn</span><strong>{selectedPoi.conservationStatus}</strong></div>}
                {selectedPoi.activityHours && <div><span>Khung giờ</span><strong>{selectedPoi.activityHours}</strong></div>}
                {userLocation && <div><span>Khoảng cách từ bạn</span><strong>{calculateHaversineDistance(userLocation.latitude, userLocation.longitude, selectedPoi.latitude, selectedPoi.longitude)} m</strong></div>}
              </div>
              <section className="poi-introduction"><h3>Giới thiệu</h3><p>{selectedPoi.text.description || `Nội dung đang được cập nhật cho ngôn ngữ ${selectedLanguageCode.toUpperCase()}.`}</p></section>
              {selectedPoi.text.audioScript && <details className="poi-transcript"><summary>Đọc lời thuyết minh</summary><p>{selectedPoi.text.audioScript}</p></details>}
            </div>
          </> : <div className="poi-empty"><Icon name="pin" /><h2>Điểm dừng tiếp theo?</h2><p>Chọn một điểm trên bản đồ hoặc danh sách để xem ảnh, giới thiệu và nghe thuyết minh.</p></div>}
        </aside>
      </div>

      {/* TRA CỨU NỘI DUNG ĐANG TẢI */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        {!isChatOpen ? (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            style={{
              background: '#315c43',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.92rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span>💬</span>
            <span>Tra cứu điểm tham quan</span>
          </button>
        ) : (
          <div style={{
            width: '360px',
            maxWidth: '90vw',
            height: '460px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #d1d5db'
          }}>
            {/* Header chat */}
            <div style={{
              background: '#315c43',
              color: '#ffffff',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tra cứu gói nội dung</div>
                <div style={{ fontSize: '0.72rem', color: '#bbf7d0' }}>Tìm theo từ khóa · Chưa tích hợp chatbot RAG</div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Noi dung tin nhan */}
            <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.sender === 'user' ? '#315c43' : '#f3f4f6',
                    color: msg.sender === 'user' ? '#ffffff' : '#1f2937',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    lineHeight: 1.45
                  }}
                >
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            {/* Input chat */}
            <form onSubmit={handleSendChat} style={{ display: 'flex', borderTop: '1px solid #e5e7eb', padding: '8px' }}>
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Nhập tên điểm tham quan..."
                style={{ flex: 1, border: 'none', padding: '8px', fontSize: '0.86rem', outline: 'none' }}
              />
              <button type="submit" className="btn-primary btn-sm" style={{ padding: '6px 14px' }}>
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
