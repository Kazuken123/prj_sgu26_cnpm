import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client';
import {
  createOnlineCheckout,
  getSessionStatus,
  exchangeOnlineCode,
  getVisitMe
} from '../api/payment';
import { exchangeCashCode } from '../api/cash';
import {
  StoredGuestSession,
  loadGuestSession,
  saveGuestSession,
  clearGuestSession,
  generateUUIDv4
} from '../api/guestStorage';

type UiStep =
  | 'IDLE'
  | 'CREATING_CHECKOUT'
  | 'CHECKOUT_READY'
  | 'CHECKING_STATUS'
  | 'EXCHANGING_TOKEN'
  | 'VERIFYING_VISIT'
  | 'VISIT_ACTIVE';

type PaymentTab = 'ONLINE' | 'CASH';

export const PaymentPage: React.FC = () => {
  const currentBaseUrl = getApiBaseUrl();

  const [session, setSession] = useState<StoredGuestSession>(() => {
    return loadGuestSession(currentBaseUrl).session;
  });

  const [paymentTab, setPaymentTab] = useState<PaymentTab>('ONLINE');
  const [cashSessionIdInput, setCashSessionIdInput] = useState<string>('');
  const [cashShortedCodeInput, setCashShortedCodeInput] = useState<string>('');
  const [isExchangingCash, setIsExchangingCash] = useState<boolean>(false);

  const [uiStep, setUiStep] = useState<UiStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [mismatchedEnv, setMismatchedEnv] = useState<boolean>(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const cooldownTimerRef = useRef<number | null>(null);

  const startCooldown = (seconds = 3) => {
    setCooldownSeconds(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const updateAndPersistSession = useCallback(
    (updater: (prev: StoredGuestSession) => StoredGuestSession) => {
      setSession((prev) => {
        const next = updater(prev);
        const { success, error } = saveGuestSession(next);
        if (!success && error) {
          setStorageWarning(`Cảnh báo bộ nhớ tạm: ${error}. Dữ liệu có thể không giữ được khi tải lại trang.`);
        } else {
          setStorageWarning(null);
        }
        return next;
      });
    },
    []
  );

  // Khoi phuc phien khi mount hoac reload
  useEffect(() => {
    const loaded = loadGuestSession(currentBaseUrl);
    if (loaded.storageError) {
      setStorageWarning(loaded.storageError);
    }
    if (loaded.mismatchedBaseUrl) {
      setMismatchedEnv(true);
      return;
    }

    const s = loaded.session;
    setSession(s);

    if (s.token) {
      // Co token khach, xac minh voi /api/visits/me
      setUiStep('VERIFYING_VISIT');
      getVisitMe(s.token, currentBaseUrl)
        .then((visit) => {
          updateAndPersistSession((prev) => ({
            ...prev,
            verifiedVisit: visit,
            sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || prev.sessionStatus
          }));
          setUiStep('VISIT_ACTIVE');
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 401) {
            setErrorCode(err.code);
            setErrorMessage('Phiên tham quan hoặc token không còn hợp lệ. Quyền truy cập bị chặn.');
            setUiStep('CHECKOUT_READY');
          } else {
            setErrorCode(err instanceof ApiError ? err.code : 'VERIFY_ERROR');
            setErrorMessage(err instanceof Error ? err.message : 'Chưa thể xác minh phiên qua máy chủ.');
            setUiStep('CHECKOUT_READY');
          }
        });
    } else if (s.sessionId) {
      setUiStep('CHECKOUT_READY');
    } else if (s.idempotencyKey) {
      setUiStep('IDLE');
      setStatusNotice('Phát hiện yêu cầu trước đó chưa hoàn tất. Bạn có thể bấm Thử lại để tiếp tục với cùng khóa yêu cầu.');
    } else {
      setUiStep('IDLE');
    }
  }, [currentBaseUrl, updateAndPersistSession]);

  // 1. Tao checkout online moi hoac gui lai voi cung Idempotency-Key
  const handleStartCheckout = async () => {
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);

    const key = session.idempotencyKey || generateUUIDv4();

    updateAndPersistSession((prev) => ({
      ...prev,
      idempotencyKey: key
    }));

    setUiStep('CREATING_CHECKOUT');

    try {
      const data = await createOnlineCheckout(key, currentBaseUrl);

      updateAndPersistSession((prev) => ({
        ...prev,
        sessionId: data.sessionId,
        paymentRef: data.paymentRef,
        amount: data.amount,
        currency: data.currency,
        paymentUrl: data.paymentUrl,
        authCode: data.authCode,
        codeExpiresAt: data.codeExpiresAt,
        sessionStatus: data.sessionStatus,
        paymentStatus: data.paymentStatus
      }));

      setUiStep('CHECKOUT_READY');
      setStatusNotice('Yêu cầu thanh toán mô phỏng đã được tạo thành công trên máy chủ.');
    } catch (err: unknown) {
      setUiStep('IDLE');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Mất kết nối hoặc máy chủ tạm ngừng khi tạo thanh toán. Khóa yêu cầu đã được lưu để thử lại an toàn.');
      }
    }
  };

  // 2. Kiem tra trang thai thanh toan (GET /api/payments/sessions/:sessionId)
  const handleCheckStatus = async () => {
    if (!session.sessionId || cooldownSeconds > 0) return;

    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);
    setUiStep('CHECKING_STATUS');
    startCooldown(3);

    try {
      const statusData = await getSessionStatus(session.sessionId, currentBaseUrl);

      updateAndPersistSession((prev) => ({
        ...prev,
        sessionStatus: statusData.sessionStatus,
        paymentStatus: statusData.paymentStatus
      }));

      setUiStep('CHECKOUT_READY');

      if (statusData.paymentStatus === 'PAID') {
        setStatusNotice('Giao dịch đã được xác nhận thanh toán mô phỏng thành công. Bạn có thể bấm Nhận quyền truy cập.');
      } else if (statusData.paymentStatus === 'PENDING') {
        setStatusNotice('Thanh toán vẫn đang ở trạng thái PENDING. Vui lòng chờ người vận hành xác nhận.');
      } else if (statusData.paymentStatus === 'FAILED') {
        setStatusNotice('Máy chủ ghi nhận giao dịch ở trạng thái FAILED. Bạn có thể kiểm tra lại sau nếu người vận hành gửi bổ sung.');
      }
    } catch (err: unknown) {
      setUiStep('CHECKOUT_READY');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.status === 429) {
          setErrorMessage('Bạn đang tra cứu quá nhanh. Vui lòng đợi ít phút trước khi kiểm tra lại.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Không thể kiểm tra trạng thái phiên lúc này. Vui lòng kiểm tra kết nối mạng.');
      }
    }
  };

  // 3. Doi ma online lay token khach (POST /api/payments/sessions/:sessionId/exchange-online-code)
  const handleExchangeCode = async () => {
    if (!session.sessionId || !session.authCode) {
      setErrorMessage('Không tìm thấy mã xác thực hoặc thông tin phiên để đổi quyền.');
      return;
    }

    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);
    setUiStep('EXCHANGING_TOKEN');

    try {
      const exchangeData = await exchangeOnlineCode(session.sessionId, session.authCode, currentBaseUrl);

      updateAndPersistSession((prev) => ({
        ...prev,
        token: exchangeData.token,
        tokenType: 'Bearer',
        expiresAt: exchangeData.expiresAt,
        authCode: null
      }));

      setUiStep('VERIFYING_VISIT');
      try {
        const visit = await getVisitMe(exchangeData.token, currentBaseUrl);
        updateAndPersistSession((prev) => ({
          ...prev,
          verifiedVisit: visit,
          sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || prev.sessionStatus
        }));
        setUiStep('VISIT_ACTIVE');
        setStatusNotice('Đã đổi mã và xác minh phiên khách thành công. Bạn có thể bắt đầu sử dụng thuyết minh.');
      } catch (visitErr: unknown) {
        setUiStep('VISIT_ACTIVE');
        setStatusNotice('Đã nhận token thành công. Hãy chuyển sang trang Khám phá để truy cập dữ liệu thuyết minh.');
      }
    } catch (err: unknown) {
      setUiStep('CHECKOUT_READY');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'VISIT_TOKEN_ALREADY_ISSUED') {
          setErrorMessage('Phiên này đã được cấp token trước đó. Hệ thống không cấp token lại lần hai.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Không thể kết nối tới máy chủ khi đổi quyền truy cập.');
      }
    }
  };

  // 4. Doi ma ngan tien mat lay token khach (POST /api/payments/sessions/:sessionId/exchange-cash-code)
  const handleExchangeCashCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);

    const cleanSessionId = cashSessionIdInput.trim().toLowerCase();
    const cleanCode = cashShortedCodeInput.trim();

    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    if (!cleanSessionId || !uuidRegex.test(cleanSessionId)) {
      setErrorMessage('Mã phiên không đúng định dạng UUID v4.');
      return;
    }

    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('Mã ngắn phải là chuỗi đúng sáu chữ số.');
      return;
    }

    setIsExchangingCash(true);
    setUiStep('EXCHANGING_TOKEN');

    try {
      const exchangeData = await exchangeCashCode(cleanSessionId, cleanCode, currentBaseUrl);

      updateAndPersistSession((prev) => ({
        ...prev,
        sessionId: exchangeData.sessionId,
        token: exchangeData.token,
        tokenType: 'Bearer',
        expiresAt: exchangeData.expiresAt,
        paymentStatus: 'PAID',
        sessionStatus: 'ACTIVE',
        authCode: null
      }));

      setUiStep('VERIFYING_VISIT');
      try {
        const visit = await getVisitMe(exchangeData.token, currentBaseUrl);
        updateAndPersistSession((prev) => ({
          ...prev,
          verifiedVisit: visit,
          sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || 'ACTIVE'
        }));
        setUiStep('VISIT_ACTIVE');
        setStatusNotice('Đã đổi mã tiền mặt thành công. Phiên khách tham quan đã sẵn sàng.');
      } catch {
        setUiStep('VISIT_ACTIVE');
        setStatusNotice('Đã nhận token từ mã tiền mặt. Bạn có thể sang trang Khám phá để bắt đầu.');
      }
      setIsExchangingCash(false);
    } catch (err: unknown) {
      setIsExchangingCash(false);
      setUiStep('IDLE');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Lỗi mạng khi gửi yêu cầu đổi mã tiền mặt.');
      }
    }
  };

  // 5. Xoa phien va reset storage
  const handleClearSession = () => {
    clearGuestSession();
    const cleared = loadGuestSession(currentBaseUrl).session;
    setSession(cleared);
    setUiStep('IDLE');
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice('Đã xóa toàn bộ phiên khách trên trình duyệt này.');
    setMismatchedEnv(false);
  };

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '860px' }}>
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--tcv-green-700)', fontWeight: 700 }}>
              Cổng thanh toán vé tham quan
            </span>
            <h1 style={{ fontSize: '1.6rem', color: 'var(--tcv-green-950)', marginTop: '4px', fontWeight: 800 }}>
              Nhận quyền thuyết minh Thảo Cầm Viên
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`status-pill ${uiStep === 'VISIT_ACTIVE' ? 'ready' : uiStep === 'IDLE' ? 'idle' : 'unready'}`}>
              Trạng thái UI: {uiStep}
            </span>
          </div>
        </div>

        <p style={{ color: 'var(--tcv-slate-600)', fontSize: '0.92rem', maxWidth: '72ch', marginTop: '6px' }}>
          Hỗ trợ nhận quyền truy cập qua hai hình thức: thanh toán trực tuyến mô phỏng hoặc đổi mã tiền mặt do nhân viên quầy vé cung cấp.
        </p>

        {storageWarning && (
          <div className="banner-notice warning" style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div className="banner-desc">{storageWarning}</div>
          </div>
        )}

        {mismatchedEnv && (
          <div className="banner-notice warning" style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div>
              <div className="banner-title">Địa chỉ máy chủ không khớp phiên cũ</div>
              <div className="banner-desc">
                Phiên tham quan được lưu trước đó thuộc về máy chủ khác: {session.apiBaseUrl}. Không tự động gửi token sang máy chủ hiện tại: {currentBaseUrl}. Vui lòng xóa phiên cũ để bắt đầu lại.
              </div>
              <button type="button" onClick={handleClearSession} className="btn-secondary btn-sm" style={{ marginTop: '10px' }}>
                Xóa phiên cũ và bắt đầu lại
              </button>
            </div>
          </div>
        )}

        {statusNotice && (
          <div className="banner-notice info" style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '1.2rem' }}>ℹ️</div>
            <div className="banner-desc">{statusNotice}</div>
          </div>
        )}

        {errorMessage && (
          <div className="banner-notice" style={{ marginTop: '16px', background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b' }}>
            <div style={{ fontSize: '1.2rem' }}>⛔</div>
            <div>
              <div className="banner-title">
                Lỗi {errorCode ? `[${errorCode}]` : ''}
              </div>
              <div className="banner-desc">{errorMessage}</div>
            </div>
          </div>
        )}
      </div>

      {/* KHI DA CO TOKEN VA PHIEN HOAT DONG */}
      {uiStep === 'VISIT_ACTIVE' && (
        <div style={{ background: 'var(--tcv-green-50)', border: '1px solid var(--tcv-green-500)', borderRadius: 'var(--radius-sm)', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--tcv-green-900)', fontWeight: 700, margin: 0 }}>
              Phiên khách tham quan hợp lệ
            </h3>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--tcv-slate-700)', marginBottom: '14px' }}>
            Token khách tham quan đã sẵn sàng. Bạn có toàn quyền truy cập dữ liệu các điểm tham quan và thuyết minh âm thanh.
          </p>

          <table className="status-detail-table" style={{ background: '#ffffff', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <th>Mã phiên tham quan</th>
                <td><code>{session.sessionId}</code></td>
              </tr>
              <tr>
                <th>Trạng thái phiên</th>
                <td>
                  <span className="status-pill ready">
                    {session.sessionStatus || 'ACTIVE'}
                  </span>
                </td>
              </tr>
              <tr>
                <th>Thời hạn sử dụng</th>
                <td>{session.expiresAt ? new Date(session.expiresAt).toLocaleString('vi-VN') : '24 giờ kể từ kích hoạt'}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/explore" className="btn-primary">
              Đi tới trang Khám phá →
            </Link>

            <button
              type="button"
              onClick={handleClearSession}
              className="btn-secondary"
            >
              Xóa phiên trên máy này
            </button>
          </div>
        </div>
      )}

      {/* KHI CHUA CO TOKEN: CHON TAB PHUONG THUC */}
      {uiStep !== 'VISIT_ACTIVE' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--tcv-slate-200)', paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={() => {
                setPaymentTab('ONLINE');
                setErrorMessage(null);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: paymentTab === 'ONLINE' ? '3px solid var(--tcv-green-700)' : '3px solid transparent',
                fontWeight: paymentTab === 'ONLINE' ? 700 : 500,
                color: paymentTab === 'ONLINE' ? 'var(--tcv-green-800)' : 'var(--tcv-slate-600)',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Thanh toán trực tuyến Mock
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentTab('CASH');
                setErrorMessage(null);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: paymentTab === 'CASH' ? '3px solid var(--tcv-green-700)' : '3px solid transparent',
                fontWeight: paymentTab === 'CASH' ? 700 : 500,
                color: paymentTab === 'CASH' ? 'var(--tcv-green-800)' : 'var(--tcv-slate-600)',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Đổi mã tiền mặt tại quầy
            </button>
          </div>

          {/* TAB 1: THANH TOAN TRUC TUYEN ONLINE */}
          {paymentTab === 'ONLINE' && (
            <div>
              {uiStep === 'IDLE' || uiStep === 'CREATING_CHECKOUT' ? (
                <div className="tcv-card">
                  <h2 style={{ fontSize: '1.15rem', color: 'var(--tcv-green-900)', marginBottom: '12px' }}>
                    Bắt đầu yêu cầu thanh toán
                  </h2>
                  <p style={{ color: 'var(--tcv-slate-600)', fontSize: '0.88rem', marginBottom: '20px' }}>
                    Khởi tạo một phiên thanh toán trực tuyến mô phỏng. Máy chủ sẽ tự quyết định số tiền vé và sinh liên kết thanh toán mô phỏng.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleStartCheckout}
                      disabled={uiStep === 'CREATING_CHECKOUT'}
                      className="btn-primary"
                    >
                      {uiStep === 'CREATING_CHECKOUT' ? 'Đang tạo phiên thanh toán...' : 'Tạo yêu cầu thanh toán mô phỏng'}
                    </button>
                  </div>
                </div>
              ) : null}

              {session.sessionId && (uiStep === 'CHECKOUT_READY' || uiStep === 'CHECKING_STATUS' || uiStep === 'EXCHANGING_TOKEN' || uiStep === 'VERIFYING_VISIT') && (
                <div className="tcv-card" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.15rem', color: 'var(--tcv-green-900)' }}>
                      Chi tiết phiên thanh toán trực tuyến
                    </h2>
                    <span className={`status-pill ${session.paymentStatus === 'PAID' ? 'ready' : session.paymentStatus === 'FAILED' ? 'unready' : 'idle'}`}>
                      Thanh toán: {session.paymentStatus || 'CHƯA RÕ'}
                    </span>
                  </div>

                  <table className="status-detail-table">
                    <tbody>
                      <tr>
                        <th>Mã phiên</th>
                        <td><code>{session.sessionId}</code></td>
                      </tr>
                      <tr>
                        <th>Mã tham chiếu thanh toán</th>
                        <td><code>{session.paymentRef}</code></td>
                      </tr>
                      <tr>
                        <th>Số tiền vé</th>
                        <td><strong>{session.amount} {session.currency}</strong></td>
                      </tr>
                      <tr>
                        <th>Trạng thái phiên</th>
                        <td><span>{session.sessionStatus}</span></td>
                      </tr>
                      <tr>
                        <th>Trạng thái thanh toán</th>
                        <td><strong>{session.paymentStatus}</strong></td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      disabled={uiStep === 'CHECKING_STATUS' || cooldownSeconds > 0}
                      className="btn-secondary"
                    >
                      {cooldownSeconds > 0 ? `Đợi ${cooldownSeconds}s để kiểm tra lại` : uiStep === 'CHECKING_STATUS' ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}
                    </button>

                    {session.paymentStatus === 'PAID' && session.sessionStatus === 'ACTIVE' && session.authCode && (
                      <button
                        type="button"
                        onClick={handleExchangeCode}
                        disabled={uiStep === 'EXCHANGING_TOKEN' || uiStep === 'VERIFYING_VISIT'}
                        className="btn-primary"
                        style={{ backgroundColor: 'var(--tcv-green-600)', borderColor: 'var(--tcv-green-500)' }}
                      >
                        {uiStep === 'EXCHANGING_TOKEN'
                          ? 'Đang đổi quyền...'
                          : uiStep === 'VERIFYING_VISIT'
                          ? 'Đang xác minh phiên...'
                          : 'Nhận quyền truy cập'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOI MA TIEN MAT TAI QUAY */}
          {paymentTab === 'CASH' && (
            <div className="tcv-card">
              <h2 style={{ fontSize: '1.15rem', color: 'var(--tcv-green-900)', marginBottom: '8px' }}>
                Đổi mã tiền mặt từ nhân viên quầy vé
              </h2>
              <p style={{ color: 'var(--tcv-slate-600)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Dành cho khách đã thanh toán tiền mặt trực tiếp tại quầy của Thảo Cầm Viên. Vui lòng nhập mã phiên và mã ngắn sáu chữ số do nhân viên cung cấp.
              </p>

              <form onSubmit={handleExchangeCashCode}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Mã phiên tham quan (Session ID)
                  </label>
                  <input
                    type="text"
                    value={cashSessionIdInput}
                    onChange={(e) => setCashSessionIdInput(e.target.value)}
                    placeholder="Ví dụ: 360f0817-21a4-4f81-a75d-355811776ce9"
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--tcv-slate-300)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--tcv-slate-500)', marginTop: '4px' }}>
                    Chuỗi định dạng UUID v4 gồm 36 ký tự do nhân viên soát vé cung cấp.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Mã ngắn sáu chữ số (Cash Code)
                  </label>
                  <input
                    type="text"
                    value={cashShortedCodeInput}
                    onChange={(e) => setCashShortedCodeInput(e.target.value)}
                    placeholder="Ví dụ: 012345"
                    maxLength={6}
                    required
                    style={{ width: '100%', maxWidth: '240px', padding: '10px 12px', border: '1px solid var(--tcv-slate-300)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: '4px', textAlign: 'center' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--tcv-slate-500)', marginTop: '4px' }}>
                    Mã sáu chữ số có thời hạn do nhân viên cấp; giữ nguyên số 0 ở đầu nếu có.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={isExchangingCash || uiStep === 'EXCHANGING_TOKEN' || uiStep === 'VERIFYING_VISIT'}
                    className="btn-primary"
                  >
                    {isExchangingCash || uiStep === 'EXCHANGING_TOKEN' ? 'Đang đổi mã...' : 'Xác nhận đổi mã lấy quyền'}
                  </button>

                  {session.sessionId && (
                    <button
                      type="button"
                      onClick={() => setCashSessionIdInput(session.sessionId || '')}
                      className="btn-secondary btn-sm"
                    >
                      Điền mã phiên hiện tại ({session.sessionId.slice(0, 8)}...)
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Nut reset khi can bat dau giao dich khac */}
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleClearSession}
              className="btn-secondary btn-sm"
            >
              Hủy và làm mới giao diện
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
