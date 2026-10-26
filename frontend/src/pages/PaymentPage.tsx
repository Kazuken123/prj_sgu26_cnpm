import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVisitExpiry } from '../hooks/useVisitExpiry';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ActivationCode } from '../components/ActivationCode';
import { getApiBaseUrl, ApiError } from '../api/client';
import {
  createOnlineCheckout,
  getVisitPrice,
  VisitPrice,
  getSessionStatus,
  exchangeOnlineCode,
  getVisitMe,
  simulateMockPayment
} from '../api/payment';
import { exchangeCashCode } from '../api/cash';
import {
  StoredGuestSession,
  loadGuestSession,
  saveGuestSession,
  clearGuestSession,
  getEmptyGuestSession,
  generateUUIDv4
} from '../api/guestStorage';

type UiStep =
  | 'IDLE'
  | 'CREATING_CHECKOUT'
  | 'CHECKOUT_READY'
  | 'CHECKING_STATUS'
  | 'EXCHANGING_TOKEN'
  | 'VERIFYING_VISIT'
  | 'VERIFICATION_FAILED'
  | 'VISIT_ACTIVE';

type PaymentTab = 'ONLINE' | 'CASH';

export const PaymentPage: React.FC = () => {
  const { t, language: locale, message } = useVisitorLanguage();
  const currentBaseUrl = getApiBaseUrl();
  const [price, setPrice] = useState<VisitPrice | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [priceAttempt, setPriceAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPrice(null); setPriceError(false);
    getVisitPrice(currentBaseUrl).then(value => { if (active) setPrice(value); })
      .catch(() => { if (active) setPriceError(true); });
    return () => { active = false; };
  }, [currentBaseUrl, priceAttempt]);

  const [session, setSession] = useState<StoredGuestSession>(() => {
    return loadGuestSession(currentBaseUrl).session;
  });

  const [paymentTab, setPaymentTab] = useState<PaymentTab>('ONLINE');
  const [cashShortedCodeInput, setCashShortedCodeInput] = useState<string>('');
  const [isExchangingCash, setIsExchangingCash] = useState<boolean>(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);

  const [uiStep, setUiStep] = useState<UiStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  // UC-02: ket qua o "Du dieu kien doi token?" (Co -> "hello", Khong -> "hello hello").
  const [cashExchangeHello, setCashExchangeHello] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [mismatchedEnv, setMismatchedEnv] = useState<boolean>(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const cooldownTimerRef = useRef<number | null>(null);
  const visitEpoch = useRef(0);
  const expireVisit = useCallback(() => {
    visitEpoch.current++;
    clearGuestSession();
    setSession(getEmptyGuestSession(currentBaseUrl));
    setUiStep('IDLE');
    setErrorCode('VISIT_SESSION_EXPIRED');
    setErrorMessage('Quyền nghe đã hết hạn. Nếu vé của bạn vẫn còn hạn nhưng không mở được, hãy nhờ nhân viên kiểm tra.');
    setStatusNotice(null);
  }, [currentBaseUrl]);
  useVisitExpiry(session.token ? session.expiresAt : null, expireVisit);
  const acceptVisit = useCallback((visit: { expiresAt?: string }, epoch: number) => {
    if (epoch !== visitEpoch.current) return false;
    if (visit.expiresAt && Date.parse(visit.expiresAt) <= Date.now()) { expireVisit(); return false; }
    return true;
  }, [expireVisit]);

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
          setStorageWarning(`Cảnh báo bộ nhớ tạm: ${message(error)}. Dữ liệu có thể không giữ được khi tải lại trang.`);
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
      const epoch = visitEpoch.current;
      // Co token khach, xac minh voi /api/visits/me
      setUiStep('VERIFYING_VISIT');
      getVisitMe(s.token, currentBaseUrl)
        .then((visit) => {
          if (!acceptVisit(visit, epoch)) return;
          updateAndPersistSession((prev) => ({
            ...prev,
            verifiedVisit: visit,
            expiresAt: visit.expiresAt || prev.expiresAt,
            sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || prev.sessionStatus
          }));
          setUiStep('VISIT_ACTIVE');
        })
        .catch((err: unknown) => {
          if (epoch !== visitEpoch.current) return;
          if (err instanceof ApiError && err.status === 401) {
            setErrorCode(err.code);
            setErrorMessage('Chưa xác nhận được quyền nghe của vé. Vui lòng nhờ nhân viên kiểm tra trước khi thanh toán lại.');
            setUiStep('VERIFICATION_FAILED');
          } else {
            setErrorCode(err instanceof ApiError ? err.code : 'VERIFY_ERROR');
            setErrorMessage(err instanceof Error ? err.message : 'Chưa thể xác minh phiên qua máy chủ.');
            setUiStep('VERIFICATION_FAILED');
          }
        });
    } else if (s.sessionId) {
      setUiStep('CHECKOUT_READY');
    } else if (s.idempotencyKey) {
      setUiStep('IDLE');
      setStatusNotice('Lượt trước chưa hoàn tất. Bấm tiếp tục để dùng lại lượt đó, không tạo thanh toán trùng.');
    } else {
      setUiStep('IDLE');
    }
  }, [currentBaseUrl, updateAndPersistSession, acceptVisit]);

  // 1. Tao checkout online moi hoac gui lai voi cung Idempotency-Key
  const handleStartCheckout = async () => {
    if (!price) return;
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
      setStatusNotice('Đã tạo lượt nghe thử. Tiếp tục xác nhận thanh toán mô phỏng bên dưới.');
    } catch (err: unknown) {
      setUiStep('IDLE');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Kết nối bị gián đoạn. Bạn có thể thử lại để tiếp tục lượt đang có.');
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
        setStatusNotice('Đã xác nhận thanh toán mô phỏng. Bấm kích hoạt vé để bắt đầu nghe.');
      } else if (statusData.paymentStatus === 'PENDING') {
        setStatusNotice('Thanh toán chưa được xác nhận. Vui lòng chờ rồi kiểm tra lại.');
      } else if (statusData.paymentStatus === 'FAILED') {
        setStatusNotice('Thanh toán chưa thành công. Kiểm tra lại hoặc nhờ nhân viên hỗ trợ trước khi tạo lượt khác.');
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

  const handleSimulatePayment = async () => {
    if (!session.paymentRef) return;
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);
    setIsSimulatingPayment(true);

    try {
      const res = await simulateMockPayment(session.paymentRef, 'SUCCESS', currentBaseUrl);
      if (res.accepted && res.paymentStatus === 'PAID') {
        updateAndPersistSession((prev) => ({
          ...prev,
          paymentStatus: 'PAID',
          sessionStatus: 'ACTIVE'
        }));
        setStatusNotice('Đã xác nhận thanh toán mô phỏng. Bấm kích hoạt vé để bắt đầu nghe.');
      } else {
        setStatusNotice(`Kết quả mô phỏng: ${res.paymentStatus}`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else {
        setErrorCode('SIMULATION_ERROR');
        setErrorMessage(err instanceof Error ? err.message : 'Không thể thực hiện mô phỏng thanh toán.');
      }
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // 3. Doi ma online lay token khach (POST /api/payments/sessions/:sessionId/exchange-online-code)
  const handleExchangeCode = async () => {
    const epoch = visitEpoch.current;
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
      if (!acceptVisit(exchangeData, epoch)) return;

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
        if (!acceptVisit(visit, epoch)) return;
        updateAndPersistSession((prev) => ({
          ...prev,
          verifiedVisit: visit,
          sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || prev.sessionStatus
        }));
        setUiStep('VISIT_ACTIVE');
        setStatusNotice('Vé đã sẵn sàng. Mời bạn chọn điểm tham quan và bắt đầu nghe.');
      } catch (visitErr: unknown) {
        setUiStep('VERIFICATION_FAILED');
        setErrorMessage(visitErr instanceof Error ? visitErr.message : 'Chưa thể xác minh phiên.');
        setStatusNotice('Đã lưu quyền truy cập. Hãy xác minh lại, không đổi mã hoặc thanh toán lần nữa.');
      }
    } catch (err: unknown) {
      setUiStep('CHECKOUT_READY');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'VISIT_TOKEN_ALREADY_ISSUED') {
          setErrorMessage('Vé này đã được kích hoạt. Nếu không mở được quyền nghe, hãy nhờ nhân viên hỗ trợ; không cần trả tiền lại.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Không thể kết nối tới máy chủ khi đổi quyền truy cập.');
      }
    }
  };

  // 4. Khach chi nhap ma 6 so; server tu xac dinh phien.
  const handleExchangeCashCode = async (e: React.FormEvent) => {
    const epoch = visitEpoch.current;
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice(null);
    setCashExchangeHello(null);

    const cleanCode = cashShortedCodeInput.trim();

    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số nhân viên đã cấp.');
      setCashExchangeHello('hello hello');
      return;
    }

    setIsExchangingCash(true);
    setUiStep('EXCHANGING_TOKEN');

    try {
      const exchangeData = await exchangeCashCode(cleanCode, currentBaseUrl);
      if (!acceptVisit(exchangeData, epoch)) return;
      setCashExchangeHello('hello');

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
        if (!acceptVisit(visit, epoch)) return;
        updateAndPersistSession((prev) => ({
          ...prev,
          verifiedVisit: visit,
          sessionStatus: (visit.status as StoredGuestSession['sessionStatus']) || 'ACTIVE'
        }));
        setUiStep('VISIT_ACTIVE');
        setCashShortedCodeInput('');
        setStatusNotice('Vé đã được kích hoạt. Bạn có thể bắt đầu khám phá và nghe thuyết minh.');
      } catch (visitErr: unknown) {
        setUiStep('VERIFICATION_FAILED');
        setErrorMessage(visitErr instanceof Error ? visitErr.message : 'Chưa thể xác minh phiên.');
        setStatusNotice('Đã lưu quyền truy cập. Hãy xác minh lại, không đổi mã hoặc thanh toán lần nữa.');
      }
      setIsExchangingCash(false);
    } catch (err: unknown) {
      setIsExchangingCash(false);
      setUiStep('IDLE');
      setCashExchangeHello('hello hello');
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        const cashMessages: Record<string, string> = {
          CASH_CODE_INVALID_OR_EXPIRED: 'Mã không đúng, đã hết hạn hoặc đã được dùng. Bạn hãy kiểm tra lại với nhân viên.',
          CASH_EXCHANGE_RATE_LIMITED: 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.',
          VISIT_TOKEN_ALREADY_ISSUED: 'Vé này đã được kích hoạt. Nếu chưa nhận được vé, hãy nhờ nhân viên hỗ trợ; không cần trả tiền lại.',
          CASH_EXCHANGE_PERSISTENCE_UNAVAILABLE: 'Chưa xác nhận được kết quả kích hoạt. Hãy nhờ nhân viên kiểm tra trước khi thử lại; không cần trả tiền lại.'
        };
        setErrorMessage(cashMessages[err.code] || 'Chưa thể kích hoạt vé lúc này. Vui lòng thử lại hoặc nhờ nhân viên kiểm tra; không cần trả tiền lại.');
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Kết nối bị gián đoạn khi kích hoạt. Nhờ nhân viên kiểm tra kết quả trước khi nhập lại; không cần trả tiền lại.');
      }
    }
  };

  const handleVerifyAgain = async () => {
    const epoch = visitEpoch.current;
    if (!session.token || mismatchedEnv) return;
    setUiStep('VERIFYING_VISIT');
    setErrorMessage(null);
    setErrorCode(null);
    try {
      const visit = await getVisitMe(session.token, currentBaseUrl);
      if (!acceptVisit(visit, epoch)) return;
      updateAndPersistSession(prev => ({ ...prev, verifiedVisit: visit,
        sessionStatus: visit.status as StoredGuestSession['sessionStatus'],
        expiresAt: visit.expiresAt || prev.expiresAt }));
      setUiStep('VISIT_ACTIVE');
      setStatusNotice('Phiên đã được máy chủ xác minh. Bạn có thể bắt đầu tham quan.');
    } catch (err: unknown) {
      setUiStep('VERIFICATION_FAILED');
      setErrorCode(err instanceof ApiError ? err.code : 'VERIFY_ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Chưa thể xác minh phiên.');
    }
  };

  // 5. Xoa phien va reset storage
  const handleClearSession = () => {
    visitEpoch.current++;
    clearGuestSession();
    const cleared = loadGuestSession(currentBaseUrl).session;
    setSession(cleared);
    setUiStep('IDLE');
    setErrorMessage(null);
    setErrorCode(null);
    setStatusNotice('Đã xóa toàn bộ phiên khách trên trình duyệt này.');
    setMismatchedEnv(false);
  };

  const busy = isExchangingCash || isSimulatingPayment || ['CREATING_CHECKOUT', 'CHECKING_STATUS', 'EXCHANGING_TOKEN', 'VERIFYING_VISIT'].includes(uiStep);
  const amount = session.sessionId && session.amount ? session.amount : price?.amount;
  return <div className="garden-payment">
    <Link className="garden-back-link" to="/explore">{t("← Trở lại bản đồ")}</Link>
    <header className="garden-payment-heading"><span className="garden-eyebrow">{t("VÉ THUYẾT MINH")}</span><h1>{t("Thêm một cách để")}<br />{t("khám phá khu vườn.")}</h1><p>{t("Chọn điểm yêu thích và lắng nghe câu chuyện bằng ngôn ngữ của bạn. Không cần tạo tài khoản.")}</p></header>
    <div className="garden-payment-layout">
      <aside className="garden-pass-summary" aria-label={t("Thông tin quyền nghe")}>
        <span className="garden-pass-icon"><Icon name="headphones" /></span><span className="garden-eyebrow">{t("THẢO CẦM VIÊN SÀI GÒN")}</span><h2>{t("Một khu vườn.")}<br />{t("Nhiều câu chuyện.")}</h2>
        <p>{t("Thuyết minh đa ngôn ngữ cho các điểm tham quan trong bộ demo.")}</p>
        <ul><li><Icon name="globe" />{t(" Chọn ngôn ngữ bạn muốn nghe")}</li><li><Icon name="map" />{t(" Khám phá trên bản đồ")}</li><li><Icon name="play" />{t(" Nghe theo nhịp tham quan của bạn")}</li></ul>
        <div className="garden-pass-price" aria-live="polite"><span>{t("Quyền nghe thuyết minh")}</span>{amount ? <strong>{Number(amount).toLocaleString(locale)} <small>{session.currency || price?.currency || 'VND'}</small></strong> : priceError ? <><p role="alert">{t("Chưa tải được giá.")}</p><button type="button" className="garden-text-button" onClick={() => setPriceAttempt(n => n + 1)}>{t("Tải lại giá")}</button></> : <p>{t("Đang tải giá…")}</p>}<p>{t("Đây là quyền nghe trong đồ án demo, không phải vé vào cổng Thảo Cầm Viên.")}</p></div>
      </aside>

      <section className="garden-checkout" aria-label={t("Kích hoạt vé thuyết minh")}>
        <ol className="garden-checkout-steps" aria-label={t("Tiến trình kích hoạt")}><li aria-current={!session.sessionId && !session.token ? 'step' : undefined}><span>1</span>{t(" Chọn cách mở vé")}</li><li aria-current={session.sessionId && uiStep !== 'VISIT_ACTIVE' ? 'step' : undefined}><span>2</span>{t(" Xác nhận")}</li><li aria-current={uiStep === 'VISIT_ACTIVE' ? 'step' : undefined}><span>3</span>{t(" Bắt đầu nghe")}</li></ol>
        {storageWarning && <div className="garden-alert" role="alert">{t("Trình duyệt chưa lưu được vé. Giữ trang này mở và nhờ nhân viên hỗ trợ nếu cần.")}<details><summary>{t("Thông tin hỗ trợ")}</summary>{message(storageWarning)}</details></div>}
        {mismatchedEnv && <div className="garden-alert" role="alert"><h2>{t("Vé đang thuộc một địa chỉ khác")}</h2><p>{t("Để bảo vệ vé, hệ thống chưa gửi quyền truy cập sang địa chỉ hiện tại. Hãy mở lại trang đã dùng hoặc nhờ nhân viên kiểm tra.")}</p><details><summary>{t("Thông tin hỗ trợ")}</summary><p>{session.apiBaseUrl} → {currentBaseUrl}</p><button type="button" className="btn-secondary" onClick={() => { if (window.confirm(t("Bỏ thông tin vé đã lưu tại địa chỉ cũ? Việc này không hoàn tiền hoặc khôi phục vé."))) handleClearSession(); }}>{t("Bỏ thông tin vé cũ")}</button></details></div>}
        {errorMessage && <div className="garden-alert garden-alert-error" role="alert"><strong>{t("Chưa thể hoàn tất")}</strong><p>{message(errorMessage)}</p>{errorCode && <details><summary>{t("Thông tin hỗ trợ")}</summary><code>{errorCode}</code></details>}</div>}
        {statusNotice && <p className="garden-status-notice" role="status">{message(statusNotice)}</p>}
        {cashExchangeHello && <p className="garden-status-notice" role="status">{cashExchangeHello}</p>}

        {uiStep === 'VISIT_ACTIVE' ? <div className="garden-ticket-ready"><span className="garden-ready-icon"><Icon name="check" /></span><h2>{t("Vé của bạn đã sẵn sàng.")}</h2><p>{t("Mời bạn trở lại bản đồ, chọn một điểm dừng và bắt đầu nghe.")}</p><p>{t("Quyền nghe đến ")}<strong>{session.expiresAt ? new Date(session.expiresAt).toLocaleString(locale) : t("Đang kiểm tra")}</strong>.</p><Link className="btn-primary" to="/explore">{t("Bắt đầu khám phá ")}<Icon name="arrow" /></Link></div>
          : session.token && !mismatchedEnv ? <div className="garden-checkout-state"><Icon name="ticket" /><h2>{t("Vé đã được lưu trên thiết bị.")}</h2><p>{t("Cần kiểm tra với máy chủ trước khi mở quyền nghe. Bạn không cần nhập mã hoặc thanh toán lại.")}</p><button type="button" className="btn-primary" onClick={handleVerifyAgain} disabled={busy}>{uiStep === 'VERIFYING_VISIT' ? t("Đang xác minh…") : t("Xác minh lại phiên")}</button><Link className="garden-text-button" to="/explore">{t("Tiếp tục xem bản đồ")}</Link></div>
          : !mismatchedEnv && <>
            <div className="garden-payment-tabs" role="group" aria-label={t("Hình thức kích hoạt")}><button type="button" disabled={busy} aria-pressed={paymentTab === 'ONLINE'} onClick={() => { setPaymentTab('ONLINE'); setErrorMessage(null); }}><Icon name="globe" />{t(" Trực tuyến mô phỏng")}</button><button type="button" disabled={busy} aria-pressed={paymentTab === 'CASH'} onClick={() => { setPaymentTab('CASH'); setErrorMessage(null); }}><Icon name="ticket" />{t(" Nhập mã tại quầy")}</button></div>
            {paymentTab === 'CASH' ? <div className="garden-cash-form"><h2>{t("Bạn đã có mã từ quầy?")}</h2><p>{t("Nhập 6 chữ số nhân viên đã cấp sau khi nhận thanh toán.")}</p><form onSubmit={handleExchangeCashCode}><label htmlFor="cash-code">{t("Mã kích hoạt 6 số")}</label>
              <ActivationCode value={cashShortedCodeInput} onChange={setCashShortedCodeInput} disabled={busy} />
              <p className="garden-field-hint">{t("Giữ cả số 0 ở đầu. Mã chỉ sử dụng một lần và có thời hạn.")}</p><button type="submit" disabled={busy || cashShortedCodeInput.length !== 6} className="btn-primary garden-wide-button">{isExchangingCash || uiStep === 'EXCHANGING_TOKEN' ? t("Đang kích hoạt vé…") : uiStep === 'VERIFYING_VISIT' ? t("Đang kiểm tra vé…") : t("Kích hoạt vé")}<Icon name="arrow" /></button></form></div>
              : <div className="garden-online-form"><span className="garden-demo-tag">{t("DEMO · KHÔNG THU TIỀN THẬT")}</span>
                {uiStep === 'IDLE' || uiStep === 'CREATING_CHECKOUT' ? <><h2>{t("Mở vé trực tuyến.")}</h2><p>{t("Bạn sẽ thử quy trình thanh toán mô phỏng, sau đó kích hoạt quyền nghe trên thiết bị này.")}</p><button type="button" className="btn-primary garden-wide-button" disabled={!price || busy} onClick={handleStartCheckout}>{uiStep === 'CREATING_CHECKOUT' ? t("Đang chuẩn bị lượt nghe…") : session.idempotencyKey ? t("Tiếp tục yêu cầu đang có") : t("Tạo yêu cầu thanh toán mô phỏng")}<Icon name="arrow" /></button></>
                  : <div className="garden-checkout-state"><Icon name={session.paymentStatus === 'PAID' ? 'check' : 'ticket'} /><h2>{session.paymentStatus === 'PAID' ? t("Đã xác nhận thanh toán.") : session.paymentStatus === 'FAILED' ? t("Thanh toán chưa thành công.") : t("Lượt nghe đang chờ xác nhận.")}</h2><p>{session.paymentStatus === 'PAID' ? t("Chỉ còn một bước để mở câu chuyện đầu tiên.") : t("Ở bản demo, nút bên dưới giả lập kết quả từ cổng thanh toán. Không có giao dịch tiền thật.")}</p>
                    {session.paymentStatus === 'PENDING' && <button type="button" className="btn-primary garden-wide-button" disabled={busy} onClick={handleSimulatePayment}>{isSimulatingPayment ? t("Đang xác nhận…") : t("Mô phỏng thanh toán thành công (Demo)")}</button>}
                    {session.paymentStatus === 'PAID' && session.sessionStatus === 'ACTIVE' && session.authCode && <button type="button" className="btn-primary garden-wide-button" disabled={busy} onClick={handleExchangeCode}>{uiStep === 'EXCHANGING_TOKEN' ? t("Đang kích hoạt…") : uiStep === 'VERIFYING_VISIT' ? t("Đang kiểm tra vé…") : t("Kích hoạt vé và bắt đầu nghe")}</button>}
                    <button type="button" className="garden-text-button" disabled={busy || cooldownSeconds > 0} onClick={handleCheckStatus}>{cooldownSeconds > 0 ? t("Kiểm tra lại sau {0}s", { 0: cooldownSeconds }) : uiStep === 'CHECKING_STATUS' ? t("Đang kiểm tra…") : t("Kiểm tra trạng thái thanh toán")}</button>
                    {session.codeExpiresAt && <p className="garden-field-hint">{t("Hoàn tất kích hoạt trước ")}{new Date(session.codeExpiresAt).toLocaleTimeString(locale)}.</p>}
                  </div>}
              </div>}
          </>}

        <details className="garden-payment-help"><summary>{t("Cần trợ giúp với vé?")}</summary><p>{t("Nếu đã thanh toán mà chưa nghe được, hãy nhờ nhân viên kiểm tra trước khi thanh toán lại. Dùng cùng trình duyệt và giữ dữ liệu của trang để tiếp tục dùng vé.")}</p>
          <p>{t("Mã quầy hết hạn hoặc đã sử dụng? Nhờ nhân viên đối soát giao dịch. Xóa dữ liệu trình duyệt không cấp lại vé.")}</p>
          {session.sessionId && <p>{t("Mã hỗ trợ: ")}<code>{session.sessionId}</code></p>}{session.paymentRef && <p>{t("Tham chiếu: ")}<code>{session.paymentRef}</code></p>}
          {(session.sessionId || session.token || session.idempotencyKey) && <button type="button" className="garden-text-button" disabled={busy} onClick={() => { if (window.confirm(t("Bỏ thông tin vé trên trình duyệt này? Vé đã thanh toán không được hoàn tiền hay cấp lại tự động. Chỉ tiếp tục sau khi đã đối soát nếu có giao dịch đang chờ."))) handleClearSession(); }}>{t("Bỏ thông tin vé trên thiết bị này")}</button>}
        </details>
      </section>
    </div>
  </div>;
};
