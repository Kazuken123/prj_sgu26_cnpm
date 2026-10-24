import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import {
  createCashPayment,
  lookupCashSession,
  confirmCashPayment,
  issueCashCode
} from '../api/cash.ts';
import type {
  CashSessionInitData,
  CashLookupData,
  CashConfirmationData,
  CashCodeData
} from '../api/cash.ts';
import { Icon } from '../components/Icon';
import { localTime, money } from '../api/operations';
import { generateUUIDv4 } from '../api/guestStorage.ts';

export const InternalCashPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSession = searchParams.get('session') || '';
  const openedLink = useRef('');
  const mutationLock = useRef(false);
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Quan ly phien lam viec tai quay
  const [sessionIdInput, setSessionIdInput] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Du lieu tung buoc
  const [initData, setInitData] = useState<CashSessionInitData | null>(null);
  const [lookupData, setLookupData] = useState<CashLookupData | null>(null);
  const [confirmData, setConfirmData] = useState<CashConfirmationData | null>(null);
  const [codeData, setCodeData] = useState<CashCodeData | null>(null);

  // Trang thai loading va loi
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isIssuingCode, setIsIssuingCode] = useState<boolean>(false);

  const [stepError, setStepError] = useState<{ step: string; message: string; code?: string } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const pendingCreateKey = useRef<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { if (!codeData) return; setClock(Date.now()); const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, [codeData]);
  const busy = isCreating || isLookingUp || isConfirming || isIssuingCode;
  const activePayment = [confirmData, lookupData, initData].find(row => row?.sessionId === activeSessionId);
  const canIssueCode = activePayment?.paymentStatus === 'PAID' && activePayment.sessionStatus === 'ACTIVE';

  // Kiem tra phien STAFF hoac ADMIN
  const verifyAccess = useCallback(async () => {
    setIsVerifying(true);
    setAuthError(null);

    try {
      const profile = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getAuthMe(token, currentBaseUrl),
        () => {
          navigate('/internal/login', { replace: true });
        }
      );

      if (profile.role !== 'STAFF' && profile.role !== 'ADMIN') {
        setAuthError('Chỉ nhân viên soát vé STAFF hoặc quản trị viên ADMIN mới có quyền thực hiện.');
        setIsVerifying(false);
        return;
      }

      setUser(profile);
      try { pendingCreateKey.current = window.sessionStorage.getItem('tcv_cash_pending:' + currentBaseUrl + ':' + profile.id); } catch { /* In-memory idempotency remains available. */ }
      setIsVerifying(false);
    } catch (err: unknown) {
      setIsVerifying(false);
      if (err instanceof ApiError && err.status === 401) { clearInternalSession(); navigate('/internal/login', { replace: true }); }
      else setAuthError('Chưa kiểm tra được quyền truy cập. Thử lại khi kết nối ổn định.');
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedNotice('Đã sao chép ' + label + '.'); }
    catch { setCopiedNotice('Không sao chép tự động được. Hãy chọn và sao chép mã đang hiển thị.'); }
  };

  // Buoc 1: Tao phien tien mat moi
  const handleCreateCashSession = async () => {
    if (busy || mutationLock.current) return;
    mutationLock.current = true;
    setIsCreating(true);
    setStepError(null);
    setInitData(null);
    setLookupData(null);
    setConfirmData(null);
    setCodeData(null);
    setActiveSessionId('');

    const idempotencyKey = pendingCreateKey.current || generateUUIDv4();
    pendingCreateKey.current = idempotencyKey;
    try { window.sessionStorage.setItem('tcv_cash_pending:' + currentBaseUrl + ':' + user?.id, idempotencyKey); } catch { /* Retry retains the in-memory key. */ }

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => createCashPayment(token, idempotencyKey, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setInitData(data);
      pendingCreateKey.current = null;
      try { window.sessionStorage.removeItem('tcv_cash_pending:' + currentBaseUrl + ':' + user?.id); } catch { /* A retained key replays the existing session safely. */ }
      setActiveSessionId(data.sessionId);
      setSessionIdInput(data.sessionId);
      openedLink.current = data.sessionId;
      setSearchParams({ session: data.sessionId }, { replace: true });
      mutationLock.current = false;
      setIsCreating(false);
    } catch (err: unknown) {
      mutationLock.current = false;
      setIsCreating(false);
      if (err instanceof ApiError) {
        setStepError({
          step: 'Tạo phiên tiền mặt',
          code: err.code,
          message: err.message
        });
      } else {
        setStepError({
          step: 'Tạo phiên tiền mặt',
          message: 'Lỗi kết nối khi gửi yêu cầu khởi tạo phiên.'
        });
      }
    }
  };

  // Buoc 2: Tra cuu phien tien mat
  const handleLookupSession = async (e?: React.FormEvent, requestedId?: string) => {
    if (e) e.preventDefault();
    if (busy || mutationLock.current) return;
    const targetId = (requestedId || sessionIdInput).trim().toLowerCase();

    if (!targetId) {
      setStepError({
        step: 'Tra cứu phiên',
        message: 'Vui lòng nhập mã phiên hợp lệ.'
      });
      return;
    }

    mutationLock.current = true;
    setSessionIdInput(targetId);
    setIsLookingUp(true);
    setStepError(null);
    setActiveSessionId('');
    setInitData(null);
    setLookupData(null);
    setConfirmData(null);
    setCodeData(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => lookupCashSession(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setLookupData(data);
      setActiveSessionId(data.sessionId);
      openedLink.current = data.sessionId;
      setSearchParams({ session: data.sessionId }, { replace: true });
      mutationLock.current = false;
      setIsLookingUp(false);
    } catch (err: unknown) {
      mutationLock.current = false;
      setIsLookingUp(false);
      if (err instanceof ApiError) {
        setStepError({
          step: 'Tra cứu phiên',
          code: err.code,
          message: err.message
        });
      } else {
        setStepError({
          step: 'Tra cứu phiên',
          message: 'Lỗi mạng khi tra cứu phiên tham quan.'
        });
      }
    }
  };

  // Buoc 3: Xac nhan da nhan tien mat
  const handleConfirmCash = async () => {
    if (busy || mutationLock.current) return;
    const targetId = activeSessionId || sessionIdInput.trim().toLowerCase();
    if (!targetId) {
      setStepError({
        step: 'Xác nhận tiền mặt',
        message: 'Chưa có mã phiên để xác nhận.'
      });
      return;
    }

    mutationLock.current = true;
    setIsConfirming(true);
    setStepError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => confirmCashPayment(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setConfirmData(data);
      setCodeData(null);
      if (initData?.sessionId === targetId) setInitData({ ...initData, paymentStatus: data.paymentStatus, sessionStatus: data.sessionStatus });
      // Cap nhat lai lookupData neu dang hien thi
      if (lookupData && lookupData.sessionId === targetId) {
        setLookupData({
          ...lookupData,
          paymentStatus: data.paymentStatus,
          sessionStatus: data.sessionStatus
        });
      }
      mutationLock.current = false;
      setIsConfirming(false);
    } catch (err: unknown) {
      mutationLock.current = false;
      setIsConfirming(false);
      if (err instanceof ApiError) {
        setStepError({
          step: 'Xác nhận tiền mặt',
          code: err.code,
          message: err.message
        });
      } else {
        setStepError({
          step: 'Xác nhận tiền mặt',
          message: 'Lỗi kết nối khi gửi xác nhận đã nhận tiền mặt.'
        });
      }
    }
  };

  // Buoc 4: Cap ma ngan 6 so cho khach
  const handleIssueCashCode = async () => {
    if (busy || mutationLock.current) return;
    if (!canIssueCode) {
      setStepError({ step: 'Cấp mã ngắn', message: 'Cần xác nhận hoặc tra cứu đúng phiên đã thanh toán và còn ACTIVE trước khi cấp mã.' });
      return;
    }
    const targetId = activeSessionId || sessionIdInput.trim().toLowerCase();
    if (!targetId) {
      setStepError({
        step: 'Cấp mã ngắn',
        message: 'Chưa có mã phiên để cấp mã.'
      });
      return;
    }

    mutationLock.current = true;
    setIsIssuingCode(true);
    setStepError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => issueCashCode(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setCodeData(data);
      mutationLock.current = false;
      setIsIssuingCode(false);
    } catch (err: unknown) {
      mutationLock.current = false;
      setIsIssuingCode(false);
      if (err instanceof ApiError) {
        setStepError({
          step: 'Cấp mã ngắn',
          code: err.code,
          message: err.message
        });
      } else {
        setStepError({
          step: 'Cấp mã ngắn',
          message: 'Lỗi kết nối khi cấp mã ngắn cho phiên.'
        });
      }
    }
  };

  useEffect(() => {
    if (user && linkedSession && openedLink.current !== linkedSession && !mutationLock.current) {
      openedLink.current = linkedSession;
      void handleLookupSession(undefined, linkedSession);
    }
  }, [user, linkedSession, busy]);

  if (isVerifying) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p>Đang kiểm tra quyền hạn nhân viên trực quầy...</p>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="container" style={{ padding: '40px 16px', maxWidth: '600px' }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--tcv-brick-600)' }}>
          <h2 style={{ color: 'var(--tcv-brick-600)', marginTop: 0 }}>Từ chối quyền truy cập</h2>
          <p>{authError || 'Vui lòng đăng nhập với tài khoản nhân viên.'}</p>
          <button className="ops-secondary" onClick={verifyAccess}>Thử lại kết nối</button>
          <Link to="/internal/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
            Đi tới trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const codeLive = Boolean(codeData && Number.isFinite(Date.parse(codeData.codeExpiresAt)) && Date.parse(codeData.codeExpiresAt) > clock);
  const pending = activePayment?.paymentStatus === 'PENDING' && activePayment.sessionStatus === 'PENDING';
  const step = codeData ? 3 : canIssueCode ? 3 : activePayment ? 2 : 1;
  return <div className="ops-page ops-cash-page">
    <header className="ops-heading"><div><h1>Quầy thu ngân</h1><p>Một khách, ba bước. Số tiền được xác nhận bởi máy chủ.</p></div><Link className="ops-text-link" to="/internal/today">Mở sổ giao dịch <Icon name="arrow" /></Link></header>
    {stepError && <div role="alert" className="ops-alert"><strong>{stepError.step}</strong><p>{stepError.message}</p>{stepError.code && <small>Mã hỗ trợ: {stepError.code}</small>}</div>}
    {copiedNotice && <p role="status" className="ops-notice">{copiedNotice}</p>}
    <div className="ops-cash-grid">
      <section className="ops-panel"><div className="ops-panel-inner">
        <ol className="ops-steps" aria-label="Tiến trình thu ngân">{['Tạo yêu cầu', 'Nhận tiền', 'Giao mã nghe'].map((label,i) => <li key={label} aria-current={step === i+1 ? 'step' : undefined}><span>{i+1}</span>{label}</li>)}</ol>
        {!activePayment ? <div className="ops-start-sale"><Icon name="ticket" /><h2>Đón khách tiếp theo</h2><p>Tạo yêu cầu để xem giá quyền nghe. Chỉ xác nhận sau khi thực nhận đủ tiền.</p><button className="ops-primary" disabled={busy} onClick={handleCreateCashSession}>{isCreating ? 'Đang tạo yêu cầu…' : pendingCreateKey.current ? 'Tạo phiên tiền mặt mới — thử lại yêu cầu trước' : 'Tạo phiên tiền mặt mới'}<span><Icon name="arrow" /></span></button></div> : <>
          <div className="ops-sale-total"><span>{activePayment.paymentStatus === 'PAID' ? 'Đã xác nhận thu' : 'Số tiền cần thu'}</span><strong>{money(activePayment.amount || '', activePayment.currency || 'VND')}</strong><p>Quyền nghe thuyết minh; không phải vé vào cổng.</p></div>
          <dl className="ops-receipt"><div><dt>Mã giao dịch</dt><dd>{activePayment.paymentRef}</dd></div><div><dt>Mã phiên</dt><dd className="ops-reference">{activeSessionId}<button onClick={() => void copyToClipboard(activeSessionId,'mã phiên')}>Sao chép</button></dd></div><div><dt>Trạng thái</dt><dd>{activePayment.paymentStatus === 'PAID' ? 'Đã thu tiền' : activePayment.paymentStatus === 'PENDING' ? 'Chưa thu tiền' : 'Thanh toán lỗi'}{['EXPIRED','REVOKED'].includes(activePayment.sessionStatus) && ' — quyền nghe không còn hiệu lực'}</dd></div></dl>
          <div className="ops-sale-actions">
            {pending && <><p>Đối chiếu số tiền khách đưa trước khi xác nhận.</p><button className="ops-primary" disabled={busy} onClick={handleConfirmCash}><Icon name="check" />{isConfirming ? 'Đang xác nhận…' : 'Xác nhận đã nhận tiền mặt'}</button></>}
            {!codeData && <button className={canIssueCode ? 'ops-primary' : 'ops-secondary'} disabled={busy || !canIssueCode} onClick={handleIssueCashCode}>{isIssuingCode ? 'Đang cấp mã…' : 'Cấp mã ngắn 6 số'}</button>}
          </div>
          {codeData && <div className="ops-code-receipt"><span>{codeLive ? 'Mã nghe dành cho khách' : 'Mã hiển thị đã hết hạn'}</span><strong aria-label="Mã nghe">{codeLive ? codeData.shortedCode : '— — —'}</strong><p>{codeLive ? 'Khách mở trang Quyền nghe và nhập mã này một lần.' : 'Kiểm tra khách đã đổi mã trước khi yêu cầu cấp lại. Không thu tiền lần nữa.'}</p><p>Hạn đổi mã: {localTime(codeData.codeExpiresAt)}. Hạn quyền nghe: {localTime(codeData.visitExpiresAt)}.</p><div className="ops-actions"><button disabled={!codeLive} onClick={() => void copyToClipboard(codeData.shortedCode,'mã nghe')}>Sao chép mã</button>{!codeLive && <button disabled={busy || !canIssueCode} onClick={handleIssueCashCode}>Kiểm tra / cấp lại mã</button>}<Link to="/payment" target="_blank" rel="noreferrer">Mở trang nhập mã</Link></div></div>}
          {codeData && <button className="ops-next-customer" disabled={busy} onClick={handleCreateCashSession}>Khách tiếp theo <Icon name="arrow" /></button>}
        </>}
      </div></section>
      <aside>
        <section className="ops-panel"><div className="ops-panel-inner"><h2>Tiếp tục giao dịch</h2><p>Chọn từ sổ giao dịch hoặc nhập mã phiên khách đang cần hỗ trợ.</p><form onSubmit={handleLookupSession} className="ops-lookup"><label htmlFor="cash-session">Mã phiên</label><input id="cash-session" value={sessionIdInput} onChange={e => setSessionIdInput(e.target.value)} disabled={busy} placeholder="Dán mã phiên cần tra cứu" /><button type="submit" disabled={busy || !sessionIdInput.trim()}>{isLookingUp ? 'Đang tìm…' : 'Tra cứu giao dịch'}</button></form><Link className="ops-text-link" to="/internal/today?status=PENDING">Yêu cầu chờ thu tiền <Icon name="arrow" /></Link><Link className="ops-text-link" to="/internal/today?status=UNCLAIMED">Đã thu nhưng chưa đổi mã <Icon name="arrow" /></Link></div></section>
        <section className="ops-counter-help"><h2>Khi khách cần hỗ trợ</h2><p><strong>Đã trả tiền nhưng chưa nghe được?</strong> Tra cứu giao dịch trước. Không tạo yêu cầu thu tiền mới để xử lý lỗi mã.</p><p><strong>Không thấy mã vừa cấp?</strong> Tra cứu lại phiên đã thanh toán, sau đó cấp mã. Máy chủ kiểm tra hạn dùng và tình trạng đổi mã.</p><Link to="/internal/pois">Kiểm tra điểm có audio</Link></section>
      </aside>
    </div>
  </div>;
};
