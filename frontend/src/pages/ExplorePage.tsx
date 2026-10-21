import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { loadGuestSession } from '../api/guestStorage.ts';
import { getVisitMe } from '../api/payment.ts';
import {
  getContentBundle,
  BundleDto,
  PoiDto,
  TourDto
} from '../api/content.ts';
import { AudioPlayer } from '../components/AudioPlayer.tsx';

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
  const { session } = loadGuestSession(currentBaseUrl);
  const token = session.token;

  const [bundle, setBundle] = useState<BundleDto | null>(null);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('vi');
  const [loadingLanguageCode, setLoadingLanguageCode] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(Boolean(token));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<{ code: string; message: string } | null>(null);

  // Quan ly thu tu request de chong response den muon ghi de du lieu moi
  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ham thuc hien tai bundle
  const fetchBundle = useCallback(async (targetLang: string, authToken: string) => {
    // Tang ma thu tu request cho lan goi nay
    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;

    // Huy request truoc do neu dang chay
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingLanguageCode(targetLang);
    setBundleError(null);

    try {
      const data = await getContentBundle(targetLang, authToken, controller.signal, currentBaseUrl);

      // Kiem tra neu request nay khong con la request moi nhat thi bo qua
      if (currentSeq !== requestSeqRef.current) {
        return;
      }

      setBundle(data);
      setSelectedLanguageCode(data.requestedLanguageCode);
      setLoadingLanguageCode(null);

      // Giu POI dang chon neu van ton tai trong bundle moi
      setSelectedPoiId((prevId) => {
        if (prevId !== null && data.pois.some((p) => p.poiId === prevId)) {
          return prevId;
        }
        return data.pois.length > 0 ? data.pois[0].poiId : null;
      });
    } catch (err: unknown) {
      // Bo qua neu loi do chu dong huy request
      if (err instanceof ApiError && err.code === 'ABORT_ERROR') {
        return;
      }

      // Neu khong phai request moi nhat thi bo qua
      if (currentSeq !== requestSeqRef.current) {
        return;
      }

      setLoadingLanguageCode(null);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setSessionError('Phiên tham quan hoặc token khách đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra lại quyền truy cập.');
          setBundle(null);
        } else if (err.code === 'LANGUAGE_NOT_SUPPORTED') {
          setBundleError({
            code: err.code,
            message: `Ngôn ngữ '${targetLang}' không được hỗ trợ hoặc đã ngừng hoạt động trên máy chủ.`
          });
        } else {
          setBundleError({
            code: err.code,
            message: err.message
          });
        }
      } else {
        setBundleError({
          code: 'NETWORK_ERROR',
          message: 'Không thể tải gói dữ liệu tham quan. Vui lòng kiểm tra kết nối mạng.'
        });
      }
    }
  }, [currentBaseUrl]);

  // Khoi tao va xac minh phien khi mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    setSessionError(null);

    getVisitMe(token, currentBaseUrl)
      .then(() => {
        setIsVerifying(false);
        fetchBundle('vi', token);
      })
      .catch((err: unknown) => {
        setIsVerifying(false);
        if (err instanceof ApiError && err.status === 401) {
          setSessionError('Phiên tham quan của bạn không hợp lệ hoặc đã hết hạn (mã 401). Quyền xem nội dung bị khóa.');
        } else {
          setSessionError(err instanceof Error ? err.message : 'Chưa thể xác minh phiên khách với máy chủ.');
        }
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [token, currentBaseUrl, fetchBundle]);

  // Xu ly doi ngon ngu
  const handleSelectLanguage = (langCode: string) => {
    if (!token || langCode === selectedLanguageCode || loadingLanguageCode === langCode) {
      return;
    }
    fetchBundle(langCode, token);
  };

  // POI hien tai duoc chon
  const selectedPoi: PoiDto | undefined = bundle?.pois.find((p) => p.poiId === selectedPoiId);

  // 1. TRUONG HOP CHUA CO TOKEN
  if (!token) {
    return (
      <div className="explore-container">
        <div className="tcv-card">
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Khám phá Bản đồ & Thuyết minh bách thảo
          </h1>

          <div className="banner-notice warning" style={{ margin: '20px 0' }}>
            <div style={{ fontSize: '1.4rem' }}>🔒</div>
            <div>
              <div className="banner-title">Yêu cầu quyền truy cập khách tham quan</div>
              <div className="banner-desc">
                Tính năng xem nội dung thuyết minh và lộ trình yêu cầu token khách tham quan hợp lệ từ máy chủ. Hiện tại trình duyệt của bạn chưa có phiên kích hoạt.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/payment" className="btn-primary">
              Đi tới Cổng thanh toán để nhận quyền →
            </Link>
            <Link to="/" className="btn-secondary">
              Về Trang bắt đầu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. TRUONG HOP DANG XAC MINH HOAC PHIEN HET HAN
  if (sessionError) {
    return (
      <div className="explore-container">
        <div className="tcv-card">
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Quyền tham quan không khả dụng
          </h1>

          <div className="banner-notice" style={{ margin: '20px 0', background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b' }}>
            <div style={{ fontSize: '1.4rem' }}>⛔</div>
            <div>
              <div className="banner-title">Phiên không hợp lệ hoặc đã kết thúc</div>
              <div className="banner-desc">{sessionError}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/payment" className="btn-primary">
              Quay lại Cổng thanh toán
            </Link>
            <Link to="/" className="btn-secondary">
              Về Trang bắt đầu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-container">
      {/* KHU VUC TIEU DE VA DIEU KHIEN CHUNG */}
      <div className="tcv-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tcv-green-700)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Sprint 2 • Khám phá Thảo Cầm Viên
            </span>
            <h1 className="hero-title" style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', margin: '4px 0 8px' }}>
              Nội dung Thuyết minh Bách thảo & Lộ trình
            </h1>
            <div style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-600)' }}>
              Dữ liệu được cấp từ điểm cuối GET /api/content/bundle và lưu trong bộ nhớ tạm của trang.
            </div>
          </div>

          {/* CHON NGON NGU */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--tcv-slate-700)' }}>
                Ngôn ngữ:
              </span>
              {bundle?.languages && bundle.languages.length > 0 ? (
                bundle.languages.map((lang) => {
                  const isCurrent = lang.code === selectedLanguageCode;
                  const isLoadingThis = loadingLanguageCode === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      disabled={Boolean(loadingLanguageCode)}
                      className={`btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ minWidth: '40px', padding: '6px 12px', fontWeight: isCurrent ? 700 : 500 }}
                    >
                      {lang.code.toUpperCase()}
                      {isLoadingThis ? '...' : ''}
                    </button>
                  );
                })
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => handleSelectLanguage('vi')} className="btn-sm btn-primary">VI</button>
                  <button type="button" onClick={() => handleSelectLanguage('en')} className="btn-sm btn-secondary">EN</button>
                </div>
              )}
            </div>

            {loadingLanguageCode && (
              <span style={{ fontSize: '0.76rem', color: 'var(--tcv-green-700)', fontStyle: 'italic' }}>
                Đang tải dữ liệu {loadingLanguageCode.toUpperCase()} từ máy chủ...
              </span>
            )}
          </div>
        </div>

        {/* THONG TIN HAN PHIEN VA CANH BAO DEMO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--tcv-slate-200)', fontSize: '0.82rem' }}>
          <div>
            <span style={{ color: 'var(--tcv-slate-500)' }}>Hạn phiên tham quan: </span>
            <strong style={{ color: 'var(--tcv-green-800)', fontFamily: 'var(--font-mono)' }}>
              {bundle?.expiresAt ? new Date(bundle.expiresAt).toLocaleString('vi-VN') : 'Theo hệ thống'}
            </strong>
          </div>

          <div className="demo-chip">
            <span className="demo-dot" aria-hidden="true"></span>
            <span>Audio âm thử MOCK 1s • Tọa độ tham khảo</span>
          </div>
        </div>

        {/* THONG BAO LOI KHI TAI BUNDLE */}
        {bundleError && (
          <div className="banner-notice" style={{ marginTop: '14px', background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div className="banner-title">Lỗi tải dữ liệu [{bundleError.code}]</div>
              <div className="banner-desc">{bundleError.message}</div>
            </div>
            <button
              type="button"
              onClick={() => fetchBundle(selectedLanguageCode, token)}
              className="btn-primary btn-sm"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* TRANG THAI DANG XAC MINH BAN DAU */}
      {isVerifying && (
        <div className="tcv-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '1.1rem', color: 'var(--tcv-green-800)', fontWeight: 600 }}>
            Đang xác minh phiên khách tham quan và tải dữ liệu gói...
          </div>
        </div>
      )}

      {/* BO CUC CHINH: DANH SACH POI / CHI TIET POI / TOUR */}
      {!isVerifying && bundle && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
          
          {/* COT TRAI: DANH SACH DIEM THUYET MINH VA LO TRINH TOUR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* DANH SACH POI */}
            <div className="tcv-card">
              <h2 style={{ fontSize: '1.1rem', color: 'var(--tcv-green-900)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Điểm tham quan ({bundle.pois.length})</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tcv-slate-500)' }}>
                  Ngôn ngữ gói: {selectedLanguageCode.toUpperCase()}
                </span>
              </h2>

              {bundle.pois.length === 0 ? (
                <div style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-500)', fontStyle: 'italic', padding: '16px 0' }}>
                  Không có điểm tham quan nào trong gói dữ liệu hiện tại.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bundle.pois.map((poi) => {
                    const isSelected = poi.poiId === selectedPoiId;
                    const displayName = poi.text.status === 'READY' && poi.text.name ? poi.text.name : poi.originalName;
                    const isTextFallback = poi.text.isFallback;
                    const isAudioAvailable = poi.audio.status === 'AVAILABLE';

                    return (
                      <div
                        key={poi.poiId}
                        onClick={() => setSelectedPoiId(poi.poiId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPoiId(poi.poiId); }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '2px solid var(--tcv-green-600)' : '1px solid var(--tcv-slate-200)',
                          background: isSelected ? 'var(--tcv-green-50)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: isSelected ? 'var(--tcv-green-900)' : 'var(--tcv-slate-900)' }}>
                              {displayName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--tcv-slate-500)', marginTop: '2px' }}>
                              {formatCategory(poi.category)} • Vị trí: {poi.latitude}, {poi.longitude}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={`status-pill ${isAudioAvailable ? 'ready' : 'idle'}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                              {isAudioAvailable ? 'Audio MOCK' : 'Chưa có Audio'}
                            </span>
                          </div>
                        </div>

                        {/* Canh bao fallback neu co */}
                        {isTextFallback && (
                          <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#b45309' }}>
                            * Văn bản đang dùng bản dịch thay thế: {poi.text.languageCode?.toUpperCase()}
                          </div>
                        )}
                        {poi.text.status === 'UNAVAILABLE' && (
                          <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#b91c1c' }}>
                            * Chưa có văn bản cho ngôn ngữ yêu cầu (hiển thị tên gốc).
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LO TRINH TOUR MAU */}
            <div className="tcv-card">
              <h2 style={{ fontSize: '1.1rem', color: 'var(--tcv-green-900)', marginBottom: '8px' }}>
                Lộ trình tham quan ({bundle.tours.length})
              </h2>

              <div style={{ fontSize: '0.78rem', color: 'var(--tcv-slate-500)', marginBottom: '14px' }}>
                * Tên và mô tả lộ trình dùng chung nguyên văn (localization: SHARED), chưa có bản dịch riêng theo ngôn ngữ gói.
              </div>

              {bundle.tours.length === 0 ? (
                <div style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-500)', fontStyle: 'italic' }}>
                  Không có lộ trình tour nào được công bố trong gói.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {bundle.tours.map((tour: TourDto) => (
                    <div key={tour.tourId} style={{ background: 'var(--tcv-slate-100)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--tcv-slate-900)' }}>
                        {tour.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--tcv-slate-600)', margin: '4px 0 10px' }}>
                        {tour.description}
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tcv-green-800)', marginBottom: '6px' }}>
                        Các trạm theo thứ tự di chuyển:
                      </div>

                      <ol style={{ paddingLeft: '20px', fontSize: '0.84rem', color: 'var(--tcv-slate-700)' }}>
                        {tour.items
                          .sort((a, b) => a.sequenceNo - b.sequenceNo)
                          .map((item) => {
                            const linkedPoi = bundle.pois.find((p) => p.poiId === item.poiId);
                            const poiName = linkedPoi
                              ? (linkedPoi.text.status === 'READY' && linkedPoi.text.name ? linkedPoi.text.name : linkedPoi.originalName)
                              : `POI #${item.poiId}`;

                            return (
                              <li key={`${tour.tourId}-${item.poiId}`} style={{ marginBottom: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPoiId(item.poiId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: item.poiId === selectedPoiId ? 'var(--tcv-green-700)' : 'var(--tcv-slate-900)',
                                    fontWeight: item.poiId === selectedPoiId ? 700 : 500,
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: 'inherit'
                                  }}
                                >
                                  Trạm {item.sequenceNo}: {poiName}
                                </button>
                              </li>
                            );
                          })}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COT PHAI: CHI TIET POI DANG DUOC CHON */}
          <div className="tcv-card" style={{ borderTop: '4px solid var(--tcv-green-700)' }}>
            {selectedPoi ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tcv-green-700)', textTransform: 'uppercase' }}>
                      {formatCategory(selectedPoi.category)} • Thứ tự hiển thị #{selectedPoi.displayOrder}
                    </span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--tcv-green-950)', marginTop: '2px' }}>
                      {selectedPoi.text.status === 'READY' && selectedPoi.text.name ? selectedPoi.text.name : selectedPoi.originalName}
                    </h3>
                    {selectedPoi.text.name && selectedPoi.text.name !== selectedPoi.originalName && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--tcv-slate-500)' }}>
                        Tên gốc tiếng Việt: {selectedPoi.originalName}
                      </div>
                    )}
                  </div>

                  <span className={`status-pill ${selectedPoi.text.status === 'READY' ? 'ready' : 'unready'}`}>
                    Văn bản: {selectedPoi.text.status}
                  </span>
                </div>

                {/* KHUNG MINH HOA TRUNG TINH */}
                <div className="botanical-ornament" style={{ padding: '28px 16px', margin: '14px 0' }}>
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>🌿</div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Hình ảnh đại diện đang được bảo tồn
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--tcv-slate-500)', marginTop: '2px' }}>
                      Hệ thống không tự gán hình ảnh động vật chưa qua phê duyệt chính thức.
                    </div>
                  </div>
                </div>

                {/* THONG TIN BO XUNG: TINH TRANG BAO TON VA GIO HOAT DONG */}
                {(selectedPoi.conservationStatus || selectedPoi.activityHours) && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '14px 0', padding: '10px 14px', background: 'var(--tcv-slate-100)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                    {selectedPoi.conservationStatus && (
                      <div>
                        <span style={{ color: 'var(--tcv-slate-500)' }}>Tình trạng bảo tồn: </span>
                        <strong>{selectedPoi.conservationStatus}</strong>
                      </div>
                    )}
                    {selectedPoi.activityHours && (
                      <div>
                        <span style={{ color: 'var(--tcv-slate-500)' }}>Giờ hoạt động: </span>
                        <strong>{selectedPoi.activityHours}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* NOI DUNG MO TA */}
                <div style={{ margin: '18px 0' }}>
                  <h4 style={{ fontSize: '0.92rem', color: 'var(--tcv-slate-700)', fontWeight: 700, marginBottom: '6px' }}>
                    Mô tả thông tin:
                  </h4>
                  <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--tcv-slate-900)' }}>
                    {selectedPoi.text.description || (
                      <span style={{ fontStyle: 'italic', color: 'var(--tcv-slate-500)' }}>
                        Nội dung mô tả chưa sẵn sàng cho ngôn ngữ {selectedLanguageCode.toUpperCase()}.
                      </span>
                    )}
                  </div>
                </div>

                {/* KICH BAN DOC */}
                {selectedPoi.text.audioScript && (
                  <div style={{ margin: '18px 0', padding: '12px 14px', background: 'var(--tcv-green-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--tcv-green-100)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--tcv-green-900)', fontWeight: 700, marginBottom: '4px' }}>
                      Kịch bản thuyết minh (audioScript):
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-700)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{selectedPoi.text.audioScript}"
                    </p>
                  </div>
                )}

                {/* TRINH PHAT AM THANH THUYET MINH CO XAC THUC (SPRINT 3) */}
                <AudioPlayer
                  poi={selectedPoi}
                  requestedLanguageCode={selectedLanguageCode}
                  token={token}
                  onSessionExpired={() => {
                    setSessionError('Phiên tham quan của bạn đã hết hạn hoặc bị từ chối xác thực (mã 401). Quyền phát âm thanh và xem nội dung bị khóa.');
                    setBundle(null);
                  }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tcv-slate-500)' }}>
                Vui lòng chọn một điểm tham quan từ danh sách bên trái để xem chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
