import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

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
        return data.pois.length > 0 ? data.pois[0].poiId : null;
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
  }, [currentBaseUrl]);

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
    if (selectedCategory === 'ALL') return true;
    return (poi.category || '').toUpperCase() === selectedCategory;
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
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#132a13', margin: '16px 0 10px' }}>
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
          <h2 style={{ color: '#132a13', fontSize: '1.4rem', margin: '0 0 8px' }}>
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
    <div className="explore-container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px' }}>
      
      {/* THANH ĐIỀU KHIỂN & CHỌN NGÔN NGỮ */}
      <div className="tcv-card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Thảo Cầm Viên Sài Gòn
              </span>
              <span className="status-pill ready" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                Đã kết nối máy chủ
              </span>
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', margin: '4px 0 0', color: '#132a13' }}>
              Bản Đồ Số & Thuyết Minh Tự Động
            </h1>
          </div>

          {/* Chọn ngôn ngữ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151' }}>
              Ngôn ngữ thuyết minh:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {bundle?.languages && bundle.languages.length > 0 ? (
                bundle.languages.map((lang) => {
                  const isCurrent = lang.code === selectedLanguageCode;
                  return (
                    <button
                      key={lang.code}
                      type="button"
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
                background: isAutoTourActive ? '#15803d' : '#ffffff',
                color: isAutoTourActive ? '#ffffff' : '#15803d',
                borderColor: '#15803d'
              }}
            >
              <span>{isAutoTourActive ? '🔊' : '▶️'}</span>
              <span>{isAutoTourActive ? 'Đang bật Thuyết minh Tự động' : 'Bắt đầu tham quan (Tự động)'}</span>
            </button>

          </div>

          {!userLocation && <div role="status">Đang chờ vị trí GPS thực tế để tự động phát.</div>}

          {/* Thong tin han ve */}
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Hạn vé: <strong style={{ color: '#14532d' }}>{bundle?.expiresAt ? new Date(bundle.expiresAt).toLocaleString('vi-VN') : '24 giờ'}</strong>
          </div>
        </div>
      </div>

      {bundleError && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{bundleError.message}</div>
        </div>
      )}

      {/* BO CUC CHINH: BAN DO LEAFLET + THONG TIN CHI TIET */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* COT TRAI: BAN DO LEAFLET VA DANH SACH TOUR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* BAN DO LEAFLET TUONG TAC */}
          <div className="tcv-card" style={{ padding: '12px' }}>
            {/* Bo loc phan khu */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'ANIMAL', label: '🦁 Động vật' },
                { id: 'PLANT', label: '🌿 Cây di sản' },
                { id: 'HERITAGE', label: '🏛️ Di tích' },
                { id: 'AMENITY', label: '🚻 Tiện ích' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="btn-sm"
                  style={{
                    background: selectedCategory === cat.id ? '#15803d' : '#f3f4f6',
                    color: selectedCategory === cat.id ? '#ffffff' : '#374151',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: selectedCategory === cat.id ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <MapView
              pois={bundle?.pois || []}
              selectedPoiId={selectedPoiId}
              onSelectPoi={(id) => setSelectedPoiId(id)}
              userLocation={userLocation}
              activeTour={activeTour}
              filteredCategory={selectedCategory}
            />
          </div>

          {/* LỘ TRÌNH TOUR MẪU */}
          {bundle?.tours && bundle.tours.length > 0 && (
            <div className="tcv-card" style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: '1.05rem', color: '#132a13', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🗺️</span>
                <span>Lộ trình tham quan gợi ý ({bundle.tours.length})</span>
              </h2>

              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {bundle.tours.map((t) => {
                  const isActive = t.tourId === activeTourId;
                  return (
                    <button
                      key={t.tourId}
                      type="button"
                      onClick={() => setActiveTourId(isActive ? null : t.tourId)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isActive ? '2px solid #15803d' : '1px solid #d1d5db',
                        background: isActive ? '#f0fdf4' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        minWidth: '220px'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#14532d' : '#1f2937' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                        {t.items.length} trạm dừng • {isActive ? 'Đang hiển thị trên bản đồ' : 'Nhấn để xem đường đi'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DANH SÁCH POI RÚT GỌN KÈM KHOẢNG CÁCH */}
          <div className="tcv-card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#132a13', margin: '0 0 12px' }}>
              Danh sách điểm tham quan ({filteredPois.length} điểm)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredPois.map((poi) => {
                const isSelected = poi.poiId === selectedPoiId;
                const dist = userLocation
                  ? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, poi.latitude, poi.longitude)
                  : null;

                return (
                  <div
                    key={poi.poiId}
                    onClick={() => setSelectedPoiId(poi.poiId)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '2px solid #15803d' : '1px solid #e5e7eb',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? '#14532d' : '#1f2937' }}>
                        {poi.text.name || poi.originalName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                        {formatCategory(poi.category)}
                      </div>
                    </div>

                    {dist !== null && (
                      <span style={{ fontSize: '0.76rem', color: dist <= 30 ? '#15803d' : '#6b7280', fontWeight: dist <= 30 ? 700 : 500 }}>
                        {dist} m
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT POI ĐƯỢC CHỌN VÀ TRÌNH PHÁT AUDIO */}
        <div style={{ position: 'sticky', top: '90px' }}>
          <div className="tcv-card" style={{ padding: '24px', borderTop: '4px solid #15803d' }}>
            {selectedPoi ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                      {formatCategory(selectedPoi.category)}
                    </span>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#132a13', margin: '4px 0 2px' }}>
                      {selectedPoi.text.name || selectedPoi.originalName}
                    </h2>
                    {selectedPoi.text.name && selectedPoi.text.name !== selectedPoi.originalName && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Tên gốc: {selectedPoi.originalName}
                      </div>
                    )}
                  </div>

                  <span className={`status-pill ${selectedPoi.audio.status === 'AVAILABLE' ? 'ready' : 'idle'}`}>
                    {selectedPoi.audio.status === 'AVAILABLE' ? 'Sẵn sàng thuyết minh' : 'Chưa có âm thanh'}
                  </span>
                </div>

                {/* Thông tin bổ sung: Tình trạng bảo tồn & Giờ cho ăn */}
                {(selectedPoi.conservationStatus || selectedPoi.activityHours) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '14px 0', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.84rem' }}>
                    {selectedPoi.conservationStatus && (
                      <div>
                        <span style={{ color: '#64748b' }}>Bảo tồn: </span>
                        <strong style={{ color: '#0f172a' }}>{selectedPoi.conservationStatus}</strong>
                      </div>
                    )}
                    {selectedPoi.activityHours && (
                      <div>
                        <span style={{ color: '#64748b' }}>Khung giờ: </span>
                        <strong style={{ color: '#0f172a' }}>{selectedPoi.activityHours}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Trình phát âm thanh thuyết minh có bản quyền */}
                <div style={{ margin: '18px 0' }}>
                  <AudioPlayer
                    key={[selectedPoi.poiId, selectedLanguageCode, selectedPoi.audio.url, token].join(':')}
                    autoPlayRequestId={isAutoTourActive && autoPlayRequest?.poiId === selectedPoi.poiId ? autoPlayRequest.id : null}
                    onPlaybackStarted={handlePlaybackStarted}
                    poi={selectedPoi}
                    requestedLanguageCode={selectedLanguageCode}
                    token={token}
                    onSessionExpired={() => {
                      setSessionError('Phiên tham quan đã hết hạn.');
                      setBundle(null);
                    }}
                  />
                </div>

                {/* Nội dung giới thiệu */}
                <div style={{ margin: '18px 0' }}>
                  <h4 style={{ fontSize: '0.92rem', color: '#374151', fontWeight: 700, marginBottom: '6px' }}>
                    Bài đọc giới thiệu ({selectedLanguageCode.toUpperCase()}):
                  </h4>
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#1f2937', margin: 0 }}>
                    {selectedPoi.text.description || (
                      <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>
                        Nội dung đang được cập nhật cho ngôn ngữ {selectedLanguageCode.toUpperCase()}.
                      </span>
                    )}
                  </p>
                </div>

                {/* Kịch bản thuyết minh */}
                {selectedPoi.text.audioScript && (
                  <div style={{ margin: '16px 0', padding: '12px 14px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                      Kịch bản thuyết minh:
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{selectedPoi.text.audioScript}"
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#6b7280' }}>
                Vui lòng chọn một điểm tham quan trên bản đồ hoặc danh sách để xem chi tiết.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TRA CỨU NỘI DUNG ĐANG TẢI */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        {!isChatOpen ? (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            style={{
              background: '#15803d',
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
              background: '#15803d',
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
                    background: msg.sender === 'user' ? '#15803d' : '#f3f4f6',
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
