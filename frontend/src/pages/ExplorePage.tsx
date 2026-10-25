import type { Translator } from '../i18n/translate';
import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client';
import { loadGuestSession, clearGuestSession } from '../api/guestStorage';
import { useVisitExpiry } from '../hooks/useVisitExpiry';
import { getVisitMe } from '../api/payment';
import { getContentBundle, getPublicMap, BundleDto, PoiDto, TourDto } from '../api/content';
import { AudioPlayer } from '../components/AudioPlayer';
import { MapView, calculateHaversineDistance } from '../components/MapView';
import { Icon } from '../components/Icon';
import { VisitorPoiPhoto } from '../components/VisitorPoiPhoto';
import { TourPlanner } from '../components/TourPlanner';
import { VisitSummary } from '../components/VisitSummary';
import { LanguagePicker } from '../components/LanguagePicker';
import { ListeningDeadline } from '../components/ListeningDeadline';
import { VisitorChatWidget } from '../components/VisitorChatWidget';

function formatCategory(category: string | null, t: Translator): string {
  if (!category) return t("Chưa phân loại");
  switch (category.toUpperCase()) {
    case 'ANIMAL':
      return t("Động vật");
    case 'PLANT':
      return t("Thực vật");
    case 'HERITAGE':
      return t("Di tích");
    case 'AMENITY':
      return t("Tiện ích");
    default:
      return category;
  }
}

export const ExplorePage: React.FC = () => {
  const { t, language: locale, message, setLanguage, languages: uiLanguages } = useVisitorLanguage();
  const currentBaseUrl = getApiBaseUrl();
  const { session, mismatchedBaseUrl } = loadGuestSession(currentBaseUrl);
  const token = mismatchedBaseUrl ? null : session.token;
  const [canListen, setCanListen] = useState(false);
  const [publicReload, setPublicReload] = useState(0);

  const [bundle, setBundle] = useState<BundleDto | null>(null);
  const selectedLanguageCode = locale;
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
  const [panel, setPanel] = useState<'map' | 'places' | 'tours' | 'options'>('map');
  const [expanded, setExpanded] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const selectPoi = useCallback((id: number) => {
    setSelectedPoiId(id);
    setPanel('map');
    setExpanded(false);
  }, []);

  // Tour dang chon
  const [activeTourId, setActiveTourId] = useState<number | null>(null);
  const [customTour, setCustomTour] = useState<TourDto | null>(null);
  const [simulatedPoiId, setSimulatedPoiId] = useState<number | null>(null);

  // Vị trí người dùng GPS thực tế (US-B01, US-B02)
  const [gpsLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const simulatedPoi = bundle?.pois.find(p => p.poiId === simulatedPoiId);
  const userLocation = useMemo(() => simulatedPoi ? { latitude: simulatedPoi.latitude, longitude: simulatedPoi.longitude } : gpsLocation, [simulatedPoi, gpsLocation]);
  const [isAutoTourActive, setIsAutoTourActive] = useState<boolean>(false);
  const [playedPoisInPass, setPlayedPoisInPass] = useState<{ [poiId: number]: boolean }>({});

  const [autoPlayRequest, setAutoPlayRequest] = useState<{ id: number; poiId: number } | null>(null);
  const autoPlaySequence = useRef(0);
  const attemptedPois = useRef(new Set<number>());
  const activeAutoPoi = useRef<number | null>(null);
  const handlePlaybackStarted = useCallback((poiId: number) => {
    setPlayedPoisInPass(prev => prev[poiId] ? prev : { ...prev, [poiId]: true });
  }, []);

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
    setCustomTour(null); setActiveTourId(null); setSimulatedPoiId(null);
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
          message: t("Không thể kết nối máy chủ để tải gói dữ liệu tham quan.")
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
          await fetchBundle(locale, token);
          return;
        } catch (err) {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 401) { stopExpiredVisit(); return; }
          setSessionError('Chưa xác minh được quyền nghe. Bản đồ vẫn mở; thử lại sau hoặc liên hệ nhân viên.');
        }
      }
      if (cancelled) return;
      setIsVerifying(false);
      await fetchBundle(locale, null);
    };
    void initialize();
    return () => { cancelled = true; requestSeqRef.current++; abortControllerRef.current?.abort(); };
  }, [token, currentBaseUrl, fetchBundle, publicReload, stopExpiredVisit, locale]);

  // GPS theo dõi vị trí thực tế liên tục
  useEffect(() => {
    if (!gpsEnabled) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { setGpsError('Thiết bị chưa hỗ trợ định vị. Bạn vẫn chọn điểm thủ công được.'); return; }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        setGpsError(err.code === 1 ? 'Bạn chưa cho phép định vị. Bản đồ và chọn điểm thủ công vẫn sử dụng được.' : 'Chưa lấy được vị trí. Bạn có thể thử lại hoặc chọn điểm thủ công.');
        setUserLocation(null);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsEnabled]);

  // LOGIC TỰ ĐỘNG KÍCH HOẠT THUYẾT MINH THEO VỊ TRÍ (US-B02)
  useEffect(() => {
    if (!canListen || !isAutoTourActive || !userLocation || !bundle || bundle.requestedLanguageCode !== locale || bundle.pois.length === 0) return;

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
  }, [canListen, userLocation, isAutoTourActive, bundle, playedPoisInPass, locale]);

  const handleSelectLanguage = (langCode: string) => {
    if (langCode === selectedLanguageCode || loadingLanguageCode === langCode) return;
    setLanguage(langCode);
  };

  const selectedPoi: PoiDto | undefined = bundle?.pois.find((p) => p.poiId === selectedPoiId);
  const activeTour: TourDto | null = canListen ? customTour || bundle?.tours.find((t) => t.tourId === activeTourId) || null : null;

  // Lọc POI theo phân khu
  const filteredPois = (bundle?.pois || []).filter((poi) => {
    const categoryMatches = selectedCategory === 'ALL' || (poi.category || '').toUpperCase() === selectedCategory;
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    return categoryMatches && normalize(`${poi.text.name || ''} ${poi.originalName}`).includes(normalize(poiQuery.trim()));
  });

  const languageName = (code: string | null) => {
    try { return code ? new Intl.DisplayNames([locale], { type: 'language' }).of(code) || code : t('Chưa có'); }
    catch { return code || t('Chưa có'); }
  };
  const categories = [{ id: 'ALL', label: t("Tất cả") }, { id: 'ANIMAL', label: t("Động vật") }, { id: 'PLANT', label: t("Thực vật") }, { id: 'HERITAGE', label: t("Di tích") }, { id: 'AMENITY', label: t("Tiện ích") }];
  const durationLabel = (seconds: number | null) => seconds ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '';
  const resetAuto = () => { setIsAutoTourActive(false); setAutoPlayRequest(null); attemptedPois.current.clear(); activeAutoPoi.current = null; setPlayedPoisInPass({}); };
  useEffect(() => {
    if (!['options', 'tours'].includes(panel) || typeof document === 'undefined') return;
    const dialog = document.querySelector<HTMLElement>('.garden-dialog');
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary') || []).filter(el => el.getClientRects().length > 0 && (!el.closest('details:not([open])') || el.tagName === 'SUMMARY'));
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setPanel('map'); }
      if (e.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [panel]);

  return <div className="garden-experience">
    <header className="garden-toolbar">
      <div><span className="garden-eyebrow">{t("THẢO CẦM VIÊN SÀI GÒN")}</span><h1>{t("Chọn một điểm, nghe một câu chuyện.")}</h1></div>
      <div className="garden-toolbar-controls">
        <ListeningDeadline expiresAt={canListen ? bundle?.expiresAt : null} />
        <LanguagePicker languages={uiLanguages}
          value={selectedLanguageCode} disabled={Boolean(loadingLanguageCode)} onChange={handleSelectLanguage} />
      </div>
    </header>
    <VisitSummary baseUrl={currentBaseUrl} />
    <div className="garden-status" aria-live="polite">
      {loadingLanguageCode && <p>{t("Đang tải nội dung ")}{languageName(loadingLanguageCode)}…</p>}
      {isVerifying && <p>{t("Đang kiểm tra vé của bạn. Bạn vẫn xem được bản đồ.")}</p>}
      {sessionError && <p>{message(sessionError)} <button type="button" className="garden-text-button" onClick={() => setPublicReload(n => n + 1)}>{t("Kiểm tra lại")}</button></p>}
      {bundleError && <p role="alert">{t("Chưa tải được nội dung. Kiểm tra kết nối rồi ")}<button type="button" className="garden-text-button" onClick={() => fetchBundle(selectedLanguageCode, canListen ? token : null)}>{t("thử lại")}</button>.</p>}
    </div>

    <div className={`garden-workspace${expanded ? ' is-expanded' : ''}`}>
      <section className={`garden-directory${panel === 'places' ? ' is-open' : ''}`} aria-label={t("Danh sách điểm tham quan")} aria-busy={Boolean(loadingLanguageCode)}>
        <div className="garden-directory-heading"><h2>{t("Khám phá khu vườn")}</h2><button type="button" className="garden-icon-button garden-mobile-only" aria-label={t("Đóng danh sách")} onClick={() => setPanel('map')}><Icon name="close" /></button></div>
        <label className="garden-search"><Icon name="search" /><input type="search" aria-label={t("Tìm điểm tham quan")} placeholder={t("Tìm điểm bạn muốn ghé…")} value={poiQuery} onChange={e => setPoiQuery(e.target.value)} /></label>
        <div className="garden-filters" role="group" aria-label={t("Lọc điểm tham quan")}>{categories.map(c => <button type="button" key={c.id} aria-pressed={selectedCategory === c.id} onClick={() => setSelectedCategory(c.id)}>{c.label}</button>)}</div>
        <div className="garden-result-count"><span aria-live="polite">{filteredPois.length}{t(" điểm tham quan")}</span><label className="garden-desktop-category"><span className="sr-only">{t("Phân loại điểm")}</span><select aria-label={t("Phân loại điểm")} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div>
        <div className="garden-poi-list">
          {filteredPois.map(poi => <button type="button" key={poi.poiId} data-poi-id={poi.poiId} className="garden-poi-row" aria-pressed={poi.poiId === selectedPoiId} onClick={() => selectPoi(poi.poiId)}>
            <VisitorPoiPhoto originalName={poi.originalName} name={poi.text.name || poi.originalName} avatarUrl={poi.avatarUrl} category={poi.category} />
            <span><strong>{poi.text.name || poi.originalName}</strong><small>{formatCategory(poi.category, t)}{poi.audio.duration ? ` · ${durationLabel(poi.audio.duration)}` : ''}</small></span><Icon name="chevron" />
          </button>)}
          {!filteredPois.length && <div className="garden-empty" role="status"><Icon name="search" /><p>{loadingLanguageCode ? t("Đang mở khu vườn…") : bundleError ? t("Chưa có dữ liệu để hiển thị.") : t("Không tìm thấy điểm phù hợp.")}</p>{(poiQuery || selectedCategory !== 'ALL') && <button className="garden-text-button" onClick={() => { setPoiQuery(''); setSelectedCategory('ALL'); }}>{t("Xóa bộ lọc")}</button>}</div>}
        </div>
      </section>

      <section className="garden-map" aria-label={t("Bản đồ khu vườn")}>
        <MapView pois={filteredPois} tourPois={bundle?.pois} selectedPoiId={selectedPoiId} onSelectPoi={selectPoi} userLocation={userLocation} activeTour={activeTour} filteredCategory="ALL" />
        <button className="garden-map-options garden-icon-button" type="button" aria-label={t("Tùy chọn tham quan")} onClick={() => setPanel('options')}><Icon name="settings" /></button>
        <button className="garden-mobile-search" type="button" onClick={() => setPanel('places')}><Icon name="search" /><span>{t("Tìm điểm bạn muốn ghé…")}</span></button>
        <button className="garden-map-note" type="button" onClick={() => setPanel('options')}><Icon name="info" />{t(" Vị trí tham khảo & minh họa")}</button>
        {simulatedPoi && <span className="garden-simulated-label">{t("Đang giả lập tại ")}{simulatedPoi.text.name || simulatedPoi.originalName}</span>}
      </section>

      <section id="selected-poi-detail" className="garden-selected" aria-label={t("Điểm đang chọn")}>
        {selectedPoi ? <>
          <button className="garden-sheet-handle garden-mobile-only" type="button" aria-label={expanded ? t("Thu gọn thông tin điểm") : t("Mở rộng thông tin điểm")} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}><span /></button>
          <div className="garden-selected-body" key={selectedPoi.poiId}>
            <span className="garden-eyebrow">{formatCategory(selectedPoi.category, t)}</span>
            <div className="garden-selected-heading"><h2>{selectedPoi.text.name || selectedPoi.originalName}</h2><button type="button" className="garden-icon-button" aria-label={t("Xem giới thiệu")} onClick={() => setExpanded(v => !v)} aria-expanded={expanded}><Icon name="info" /></button></div>
            {locale === 'vi' && selectedPoi.text.name && selectedPoi.text.name !== selectedPoi.originalName && <p className="garden-original-name">{selectedPoi.originalName}</p>}
            {selectedPoi.text.isFallback && <p className="garden-fallback" role="status">{t("Giới thiệu hiện dùng {0}, thay cho {1}.", { 0: languageName(selectedPoi.text.languageCode), 1: languageName(selectedLanguageCode) })}</p>}
            {expanded && <VisitorPoiPhoto key={selectedPoi.poiId} originalName={selectedPoi.originalName} name={selectedPoi.text.name || selectedPoi.originalName} avatarUrl={selectedPoi.avatarUrl} category={selectedPoi.category} variant="detail" />}
            {expanded && <p className="garden-description is-expanded">{selectedPoi.text.description || t("Giới thiệu cho điểm này đang được cập nhật.")}</p>}
            {expanded && <div className="garden-expanded-content">
              {selectedPoi.conservationStatus && <p>{t("Tình trạng bảo tồn: ")}{selectedPoi.conservationStatus}</p>}
              {selectedPoi.activityHours && <p>{t("Hoạt động: ")}{selectedPoi.activityHours}</p>}
              {selectedPoi.locationNote && <p className="garden-location-note">{t(selectedPoi.locationNote.label)}</p>}
              {userLocation && <p>{t("Khoảng cách đường thẳng ")}{simulatedPoi ? t("từ vị trí giả lập") : t("ước tính từ thiết bị")}: {calculateHaversineDistance(userLocation.latitude, userLocation.longitude, selectedPoi.latitude, selectedPoi.longitude)}{t(" m. Không phải khoảng cách đi bộ.")}</p>}
              {canListen && selectedPoi.text.audioScript && <details><summary>{t("Đọc lời thuyết minh")}</summary><p>{selectedPoi.text.audioScript}</p></details>}
            </div>}
            <div className="garden-detail-meta"><span><Icon name="headphones" /> {languageName(selectedLanguageCode)}</span><button type="button" className="garden-text-button" onClick={() => setExpanded(v => !v)}>{expanded ? t("Thu gọn") : t("Xem giới thiệu")}</button></div>
          </div>
        </> : <div className="garden-empty"><Icon name="pin" /><p>{t("Chọn một điểm trên bản đồ để khám phá.")}</p></div>}
      </section>

      <div className="garden-audio-dock" aria-label={t("Điều khiển nghe thuyết minh")}>
        <div className="garden-now-playing"><span className="garden-category-icon"><Icon name="headphones" /></span><div><strong>{selectedPoi?.text.name || selectedPoi?.originalName || t("Khám phá Thảo Cầm Viên")}</strong><small>{languageName(selectedLanguageCode)} · {canListen ? t("Vé đã kích hoạt") : t("Bản đồ mở miễn phí")}</small></div></div>
        {selectedPoi && canListen && token && bundle?.requestedLanguageCode === locale ? <AudioPlayer key={[selectedPoi.poiId, selectedLanguageCode, selectedPoi.audio.url, token].join(':')} autoPlayRequestId={isAutoTourActive && autoPlayRequest?.poiId === selectedPoi.poiId ? autoPlayRequest.id : null} onPlaybackStarted={handlePlaybackStarted} poi={selectedPoi} requestedLanguageCode={selectedLanguageCode} token={token} onSessionExpired={stopExpiredVisit} />
          : <div className="garden-listen-gate"><span>{t("Nghe câu chuyện về điểm bạn chọn.")}</span><Link className="btn-primary" to="/payment"><Icon name="headphones" />{t(" Nghe thuyết minh")}</Link></div>}
        <button className="garden-tour-shortcut garden-text-button" type="button" onClick={() => setPanel('tours')}><Icon name="compass" />{t(" Lộ trình gợi ý")}</button>
      </div>
      <nav className="garden-bottom-nav" aria-label={t("Điều hướng khám phá")}>
        {([{ id: 'map', icon: 'map', text: t("Bản đồ") }, { id: 'places', icon: 'list', text: t("Địa điểm") }, { id: 'tours', icon: 'compass', text: t("Lộ trình") }, { id: 'options', icon: 'settings', text: t("Tùy chọn") }] as const).map(item => <button key={item.id} type="button" aria-pressed={panel === item.id} onClick={() => setPanel(item.id)}><Icon name={item.icon} /><span>{item.text}</span></button>)}
      </nav>
    </div>

    <VisitorChatWidget token={canListen ? token : null} baseUrl={currentBaseUrl} onSessionExpired={stopExpiredVisit} />
    {(panel === 'options' || panel === 'tours') && <div className="garden-dialog-backdrop" onClick={() => setPanel('map')}>
      <section className="garden-dialog" role="dialog" aria-modal="true" aria-labelledby="garden-dialog-heading" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setPanel('map'); }}>
        <div className="garden-dialog-heading"><h2 id="garden-dialog-heading">{panel === 'options' ? t("Tùy chọn tham quan") : t("Lộ trình của bạn")}</h2><button type="button" className="garden-icon-button" aria-label={t("Đóng")} onClick={() => setPanel('map')}><Icon name="close" /></button></div>
        {panel === 'options' ? <>
          <p>{t("Chọn điểm và bấm nghe để khám phá theo cách của bạn.")}</p>
          <button type="button" className="btn-secondary" onClick={() => { if (gpsEnabled) { setGpsEnabled(false); setUserLocation(null); resetAuto(); } else { setGpsError(null); setGpsEnabled(true); } }}>{gpsEnabled ? t("Tắt định vị thiết bị") : t("Dùng vị trí của tôi")}</button>
          {gpsError && <p role="status">{message(gpsError)}</p>}
          {!userLocation && <p>{t("Chưa có vị trí của bạn. Bạn vẫn chọn và nghe từng điểm thủ công.")}</p>}
          {canListen && <>
            <label className="garden-option-row"><input type="checkbox" checked={isAutoTourActive} onChange={() => { const next = !isAutoTourActive; resetAuto(); setIsAutoTourActive(next); }} /><span>{t("Tự phát khi đến gần điểm trình diễn")}</span></label>
            <label className="garden-field">{t("Vị trí trình diễn")}<select aria-label={t("Vị trí trình diễn")} value={simulatedPoiId ?? ''} onChange={e => { setSimulatedPoiId(e.target.value ? Number(e.target.value) : null); resetAuto(); }}><option value="">{t("Dùng vị trí thiết bị nếu được phép")}</option>{bundle?.pois.map(p => <option key={p.poiId} value={p.poiId}>{p.text.name || p.originalName}</option>)}</select></label>
            {simulatedPoi && <p role="status">{t("Đang giả lập tại ")}{simulatedPoi.text.name || simulatedPoi.originalName}{t("; không phải GPS thực tế.")}</p>}
            {bundle?.expiresAt && <p>{t("Quyền nghe đến ")}{new Date(bundle.expiresAt).toLocaleString(locale)}.</p>}
          </>}
          <details><summary>{t("Về bản đồ và giọng đọc demo")}</summary><p>{t("Vị trí tham khảo và minh họa, chưa khảo sát thực địa; không xác nhận lối vào hay khả năng tiếp cận. Đường nối các điểm không phải tuyến đi bộ.")}</p><p>{t("Âm thanh là giọng đọc tổng hợp. Bản dịch và phát âm chưa được người bản ngữ nghiệm thu độc lập.")}</p><a href="https://saigonzoo.vn/p/ban-do-duong-di-hp13.html" target="_blank" rel="noreferrer">{t("Xem sơ đồ chính thức ↗")}</a></details>
        </> : <>
          <p>{t("Lộ trình demo do nhóm đề xuất. Đường nối chỉ thể hiện thứ tự điểm ghé, không phải chỉ đường đi bộ.")}</p>
          {!canListen && <p>{t("Kích hoạt vé để xem và tùy chỉnh lộ trình. ")}<Link to="/payment">{t("Mở vé thuyết minh")}</Link></p>}
          {canListen && bundle?.tours.map(tour => <button className="garden-tour-card" type="button" key={tour.tourId} aria-pressed={activeTourId === tour.tourId} onClick={() => { setCustomTour(null); setActiveTourId(activeTourId === tour.tourId ? null : tour.tourId); }}><strong>{t(tour.name)}</strong><span>{tour.items.length}{t(" điểm · ")}{activeTourId === tour.tourId ? t("Đang chọn") : t("Chọn lộ trình")}</span></button>)}
          {canListen && bundle && <TourPlanner pois={bundle.pois} location={userLocation} activeTour={activeTour} onApply={tour => { setCustomTour(tour); setActiveTourId(null); }} />}
          <button type="button" className="btn-primary" onClick={() => setPanel('map')}>{t("Trở về bản đồ")}</button>
        </>}
      </section>
    </div>}
  </div>;
};
