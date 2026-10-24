import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PoiImage } from '../components/PoiImage';
import { getApiBaseUrl, ApiError } from '../api/client';
import { loadGuestSession, clearGuestSession } from '../api/guestStorage';
import { useVisitExpiry } from '../hooks/useVisitExpiry';
import { getVisitMe } from '../api/payment';
import { getContentBundle, getPublicMap, BundleDto, PoiDto, TourDto } from '../api/content';
import { AudioPlayer } from '../components/AudioPlayer';
import { MapView, calculateHaversineDistance } from '../components/MapView';
import { Icon } from '../components/Icon';
import { searchBundleText } from '../api/bundleSearch';
import { useVisitorPresence } from '../hooks/useVisitorPresence';

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
  const [canListen, setCanListen] = useState(false);
  const [publicReload, setPublicReload] = useState(0);

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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number; observedAt: number } | null>(null);
  const presence = useVisitorPresence(currentBaseUrl, userLocation);
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

  const stopExpiredVisit = useCallback(() => {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    clearGuestSession();
    setSessionError('Vé đã hết hạn hoặc quyền tham quan không còn hợp lệ. Nếu mất token, vui lòng liên hệ nhân viên; không thanh toán lại chỉ để khôi phục token.');
    setCanListen(false);
    setBundle(prev => prev ? { ...prev, expiresAt: null, pois: prev.pois.map(p => ({ ...p, text: { ...p.text, audioScript: null }, audio: { status: 'UNAVAILABLE', languageCode: null, isFallback: false, url: null, mimeType: null, duration: null } })) } : null);
    setPublicReload(value => value + 1);
    setIsVerifying(false);
    setIsAutoTourActive(false);
    setAutoPlayRequest(null);
  }, []);
  useVisitExpiry(token ? bundle?.expiresAt || session.expiresAt : null, stopExpiredVisit);

  // Tải bundle theo ngôn ngữ
  const fetchBundle = useCallback(async (targetLang: string, authToken: string | null) => {
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
      const data = authToken ? await getContentBundle(targetLang, authToken, controller.signal, currentBaseUrl)
        : await getPublicMap(targetLang, controller.signal, currentBaseUrl);

      if (currentSeq !== requestSeqRef.current) return;

      setBundle(data);
      setSelectedLanguageCode(data.requestedLanguageCode);
      setLoadingLanguageCode(null);

      setSelectedPoiId((prevId) => {
        if (prevId !== null && data.pois.some((p) => p.poiId === prevId)) {
          return prevId;
        }
        const first = data.pois.find(p => requestedCategory === 'ALL' || p.category?.toUpperCase() === requestedCategory) || data.pois[0];
        return first?.poiId ?? null;
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'ABORT_ERROR') return;
      if (currentSeq !== requestSeqRef.current) return;

      setLoadingLanguageCode(null);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          stopExpiredVisit();
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
  }, [currentBaseUrl, requestedCategory, stopExpiredVisit]);

  // Browsing remains available while entitlement is checked or unavailable.
  useEffect(() => {
    let cancelled = false;
    setCanListen(false);
    setIsVerifying(Boolean(token));
    const initialize = async () => {
      if (token) {
        try {
          const visit = await getVisitMe(token, currentBaseUrl);
          if (cancelled) return;
          if (visit.status !== 'ACTIVE' || !visit.expiresAt || !Number.isFinite(Date.parse(visit.expiresAt)) || Date.parse(visit.expiresAt) <= Date.now()) { stopExpiredVisit(); return; }
          setCanListen(true); setSessionError(null); setIsVerifying(false);
          await fetchBundle('vi', token);
          return;
        } catch (err) {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 401) { stopExpiredVisit(); return; }
          setSessionError('Chưa xác minh được quyền nghe. Bản đồ vẫn mở; thử lại sau hoặc liên hệ nhân viên.');
        }
      }
      if (cancelled) return;
      setIsVerifying(false);
      await fetchBundle('vi', null);
    };
    void initialize();
    return () => { cancelled = true; requestSeqRef.current++; abortControllerRef.current?.abort(); };
  }, [token, currentBaseUrl, fetchBundle, publicReload, stopExpiredVisit]);

  // GPS theo dõi vị trí thực tế liên tục
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          observedAt: pos.timestamp
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
    if (!canListen || !isAutoTourActive || !userLocation || !bundle || bundle.pois.length === 0) return;

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
  }, [canListen, userLocation, isAutoTourActive, bundle, playedPoisInPass]);

  const handleSelectLanguage = (langCode: string) => {
    if (langCode === selectedLanguageCode || loadingLanguageCode === langCode) return;
    fetchBundle(langCode, canListen ? token : null);
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
                {canListen ? 'Quyền nghe đang hiệu lực' : isVerifying ? 'Đang xác minh quyền nghe' : 'Bản đồ miễn phí'}
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

        <div className="visitor-presence-choice">
          <label><input type="checkbox" checked={presence.enabled} onChange={e=>presence.toggle(e.target.checked)}/> Đóng góp thống kê lượt tham quan bằng GPS</label>
          <p>Khi bật, ứng dụng gửi vị trí để đếm lượt trong vườn và điểm đã ghé. Máy chủ chỉ lưu khoảng hiện diện và điểm tham quan, không lưu tọa độ GPS hoặc tên của bạn. Có thể tắt bất cứ lúc nào.</p>
          {presence.status&&<small role="status">{presence.status}</small>}
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
              disabled={!canListen}
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

          {!userLocation && <div role="status">Cho phép vị trí để xem khoảng cách đến điểm tham quan.</div>}

          {/* Thong tin han ve */}
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            {canListen && bundle?.expiresAt ? <>Hạn nghe: <strong>{new Date(bundle.expiresAt).toLocaleString('vi-VN')}</strong></> : <Link to="/payment">Kích hoạt quyền nghe tại quầy</Link>}
          </div>
        </div>
      </div>

      {sessionError && <p role="status">{sessionError} <button className="btn-secondary" onClick={() => setPublicReload(value => value + 1)}>Xác minh lại quyền nghe</button></p>}
      {bundleError && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{bundleError.message}</div><button type="button" className="btn-secondary btn-sm" onClick={() => fetchBundle(selectedLanguageCode, canListen ? token : null)}>Thử lại</button>
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
          <p className="map-help"><Icon name="info" /> Vị trí tham chiếu từ OpenStreetMap; tâm khu vực không phải lối vào. Đi theo biển chỉ dẫn tại vườn. Đường nối các điểm không phải tuyến đi bộ.</p>
          <a className="text-link" href="https://saigonzoo.vn/p/ban-do-duong-di-hp13.html" target="_blank" rel="noreferrer">Xem sơ đồ chính thức của Thảo Cầm Viên ↗</a>
          {bundle?.tours && bundle.tours.length > 0 && <div className="explore-tours"><h3><Icon name="compass" /> Lộ trình gợi ý</h3><div>{bundle.tours.map(tour => <button key={tour.tourId} type="button" aria-pressed={activeTourId === tour.tourId} onClick={() => setActiveTourId(activeTourId === tour.tourId ? null : tour.tourId)}><strong>{tour.name}</strong><span>{tour.items.length} điểm dừng · {activeTourId === tour.tourId ? 'Đang xem' : 'Xem lộ trình'}</span></button>)}</div></div>}
        </section>
        <aside ref={detailRef} id="selected-poi-detail" className="poi-detail-panel" aria-label="Chi tiết điểm tham quan">
          {selectedPoi ? <>
            <PoiImage key={selectedPoi.poiId} src={selectedPoi.avatarUrl} name={selectedPoi.text.name || selectedPoi.originalName} category={selectedPoi.category} className="poi-detail-photo" />
            <div className="poi-detail-copy">
              <span className="category-label"><Icon name={selectedPoi.category?.toUpperCase() === 'ANIMAL' ? 'paw' : selectedPoi.category?.toUpperCase() === 'PLANT' ? 'leaf' : 'pin'} />{formatCategory(selectedPoi.category)}</span>
              <h2>{selectedPoi.text.name || selectedPoi.originalName}</h2>
              {selectedPoi.text.name && selectedPoi.text.name !== selectedPoi.originalName && <p className="poi-original-name">{selectedPoi.originalName}</p>}
              <span className={`status-pill ${selectedPoi.audio.status === 'AVAILABLE' ? 'ready' : 'idle'}`}>{!canListen ? 'Cần kích hoạt quyền nghe' : selectedPoi.audio.status === 'AVAILABLE' ? 'Sẵn sàng thuyết minh' : 'Chưa có âm thanh'}</span>
              <div className="poi-detail-audio">{canListen && token ? <AudioPlayer key={[selectedPoi.poiId, selectedLanguageCode, selectedPoi.audio.url, token].join(':')} autoPlayRequestId={isAutoTourActive && autoPlayRequest?.poiId === selectedPoi.poiId ? autoPlayRequest.id : null} onPlaybackStarted={handlePlaybackStarted} poi={selectedPoi} requestedLanguageCode={selectedLanguageCode} token={token} onSessionExpired={stopExpiredVisit} /> : <><p>Thanh toán tại quầy và nhập mã nhân viên cấp để nghe thuyết minh.</p><Link className="btn-primary" to="/payment">Kích hoạt quyền nghe</Link></>}</div>
              <div className="poi-facts">
                {selectedPoi.conservationStatus && <div><span>Bảo tồn</span><strong>{selectedPoi.conservationStatus}</strong></div>}
                {selectedPoi.activityHours && <div><span>Khung giờ</span><strong>{selectedPoi.activityHours}</strong></div>}
                {userLocation && <div><span>Khoảng cách từ bạn</span><strong>{calculateHaversineDistance(userLocation.latitude, userLocation.longitude, selectedPoi.latitude, selectedPoi.longitude)} m</strong></div>}
              </div>
              <section className="poi-introduction"><h3>Giới thiệu</h3>{selectedPoi.text.isFallback && <p role="status">Văn bản thay thế bằng {selectedPoi.text.languageCode?.toUpperCase()}, khác ngôn ngữ đã chọn {selectedLanguageCode.toUpperCase()}.</p>}<p>{selectedPoi.text.description || `Nội dung đang được cập nhật cho ngôn ngữ ${selectedLanguageCode.toUpperCase()}.`}</p></section>
              {canListen && selectedPoi.text.audioScript && <details className="poi-transcript"><summary>Đọc lời thuyết minh</summary><p>{selectedPoi.text.audioScript}</p></details>}
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
