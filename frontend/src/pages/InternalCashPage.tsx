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
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, DescriptionList, Field, LoadingState } from '../components/admin/AdminUI';

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
    return <AdminPage><LoadingState label="Đang kiểm tra quyền hạn nhân viên trực quầy..." /></AdminPage>;
  }

  if (authError || !user) {
    return (
      <AdminPage width="narrow">
        <Card title="Từ chối quyền truy cập">
          <Alert tone="danger">{authError || 'Vui lòng đăng nhập với tài khoản nhân viên.'}</Alert>
          <div className="adm-row" style={{ marginTop: 16 }}>
            <button type="button" className="adm-btn adm-btn--secondary" onClick={verifyAccess}>Thử lại kết nối</button>
            <Link to="/internal/login" className="adm-btn adm-btn--primary">Đi tới trang đăng nhập</Link>
          </div>
        </Card>
      </AdminPage>
    );
  }

  const codeLive = Boolean(codeData && Number.isFinite(Date.parse(codeData.codeExpiresAt)) && Date.parse(codeData.codeExpiresAt) > clock);
  const pending = activePayment?.paymentStatus === 'PENDING' && activePayment.sessionStatus === 'PENDING';
  const step = codeData ? 3 : canIssueCode ? 3 : activePayment ? 2 : 1;
  const paymentLabel = activePayment?.paymentStatus === 'PAID' ? 'Đã thu tiền' : activePayment?.paymentStatus === 'PENDING' ? 'Chưa thu tiền' : 'Thanh toán lỗi';
  return <AdminPage className="ops-cash-page">
    <PageHeader eyebrow="Quầy vé" title="Quầy thu ngân" description="Một khách, ba bước. Số tiền được xác nhận bởi máy chủ."
      actions={<><Link className="adm-btn adm-btn--secondary" to="/internal/reissue"><Icon name="key" />Cấp lại vé</Link><Link className="adm-btn adm-btn--secondary" to="/internal/today">Mở sổ giao dịch <Icon name="arrow" /></Link></>} />
    {stepError && <Alert tone="danger" title={stepError.step} onDismiss={() => setStepError(null)}
      action={stepError.code === 'VISIT_TOKEN_ALREADY_ISSUED' && activeSessionId ? <Link className="adm-btn adm-btn--secondary adm-btn--sm" to={`/internal/reissue?session=${encodeURIComponent(activeSessionId)}`}><Icon name="key" />Cấp lại vé cho phiên này</Link> : undefined}>{stepError.message}{stepError.code && <div className="adm-small">Mã hỗ trợ: <code>{stepError.code}</code></div>}</Alert>}
    {copiedNotice && <Alert tone="success" onDismiss={() => setCopiedNotice(null)}>{copiedNotice}</Alert>}
    <div className="adm-grid adm-grid--main-aside">
      <Card>
        <ol className="adm-steps" aria-label="Tiến trình thu ngân">{['Tạo yêu cầu', 'Nhận tiền', 'Giao mã nghe'].map((label, i) => <li key={label} className={step > i + 1 ? 'is-done' : undefined} aria-current={step === i + 1 ? 'step' : undefined}><span>{step > i + 1 ? '✓' : i + 1}</span>{label}</li>)}</ol>
        {!activePayment ? <div className="adm-hero-action">
          <span className="adm-empty__icon"><Icon name="ticket" /></span>
          <h2>Đón khách tiếp theo</h2>
          <p>Tạo yêu cầu để xem giá quyền nghe. Chỉ xác nhận sau khi thực nhận đủ tiền.</p>
          <button type="button" className="adm-btn adm-btn--primary adm-btn--lg" disabled={busy} onClick={handleCreateCashSession}><Icon name="plus" />{isCreating ? 'Đang tạo yêu cầu…' : pendingCreateKey.current ? 'Tạo phiên tiền mặt mới — thử lại yêu cầu trước' : 'Tạo phiên tiền mặt mới'}</button>
        </div> : <>
          <div className="adm-amount"><span>{activePayment.paymentStatus === 'PAID' ? 'Đã xác nhận thu' : 'Số tiền cần thu'}</span><strong>{money(activePayment.amount || '', activePayment.currency || 'VND')}</strong><p>Quyền nghe thuyết minh; không phải vé vào cổng.</p></div>
          <DescriptionList columns={1} items={[
            { label: 'Mã giao dịch', value: activePayment.paymentRef, mono: true },
            { label: 'Mã phiên', value: <span className="adm-row" style={{ gap: 8 }}><span className="ops-reference">{activeSessionId}</span><button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => void copyToClipboard(activeSessionId, 'mã phiên')}>Sao chép</button></span> },
            { label: 'Trạng thái', value: <span className="adm-row" style={{ gap: 6 }}><StatusBadge status={activePayment.paymentStatus} label={paymentLabel} />{['EXPIRED', 'REVOKED'].includes(activePayment.sessionStatus) && <Badge tone="danger">Quyền nghe không còn hiệu lực</Badge>}</span> },
          ]} />
          <div className="adm-stack" style={{ marginTop: 20 }}>
            {pending && <><p className="adm-muted adm-small" style={{ margin: 0, textAlign: 'center' }}>Đối chiếu số tiền khách đưa trước khi xác nhận.</p><button type="button" className="adm-btn adm-btn--primary adm-btn--lg adm-btn--block" disabled={busy} onClick={handleConfirmCash}><Icon name="check" />{isConfirming ? 'Đang xác nhận…' : 'Xác nhận đã nhận tiền mặt'}</button></>}
            {!codeData && <button type="button" className={`adm-btn adm-btn--lg adm-btn--block ${canIssueCode ? 'adm-btn--primary' : 'adm-btn--secondary'}`} disabled={busy || !canIssueCode} onClick={handleIssueCashCode}>{isIssuingCode ? 'Đang cấp mã…' : 'Cấp mã ngắn 6 số'}</button>}
          </div>
          {codeData && <div className="ops-code-receipt" aria-live="polite"><span>{codeLive ? 'Mã nghe dành cho khách' : 'Mã hiển thị đã hết hạn'}</span><strong aria-label="Mã nghe">{codeLive ? codeData.shortedCode : '— — —'}</strong><p>{codeLive ? 'Khách mở trang Quyền nghe và nhập mã này một lần.' : 'Kiểm tra khách đã đổi mã trước khi yêu cầu cấp lại. Không thu tiền lần nữa.'}</p><p>Hạn đổi mã: {localTime(codeData.codeExpiresAt)}. Hạn quyền nghe: {localTime(codeData.visitExpiresAt)}.</p><div className="adm-row"><button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={!codeLive} onClick={() => void copyToClipboard(codeData.shortedCode, 'mã nghe')}>Sao chép mã</button>{!codeLive && <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy || !canIssueCode} onClick={handleIssueCashCode}>Kiểm tra / cấp lại mã</button>}<Link className="adm-btn adm-btn--ghost adm-btn--sm" to="/payment" target="_blank" rel="noreferrer">Mở trang nhập mã <Icon name="external" /></Link></div></div>}
          {codeData && <div className="adm-row adm-row--end" style={{ marginTop: 16 }}><button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={handleCreateCashSession}>Khách tiếp theo <Icon name="arrow" /></button></div>}
        </>}
      </Card>
      <div className="adm-stack">
        <Card title="Tiếp tục giao dịch" description="Chọn từ sổ giao dịch hoặc nhập mã phiên khách đang cần hỗ trợ." as="aside">
          <form onSubmit={handleLookupSession} className="adm-form" style={{ gap: 12 }}>
            <Field label="Mã phiên" htmlFor="cash-session"><input id="cash-session" value={sessionIdInput} onChange={e => setSessionIdInput(e.target.value)} disabled={busy} placeholder="Dán mã phiên cần tra cứu" autoComplete="off" spellCheck={false} /></Field>
            <button type="submit" className="adm-btn adm-btn--secondary adm-btn--block" disabled={busy || !sessionIdInput.trim()}><Icon name="search" />{isLookingUp ? 'Đang tìm…' : 'Tra cứu giao dịch'}</button>
          </form>
          <hr className="adm-divider" />
          <Link className="ops-task" to="/internal/today?status=PENDING"><Icon name="clock" /><span><strong>Yêu cầu chờ thu tiền</strong></span><Icon name="arrow" /></Link>
          <Link className="ops-task" to="/internal/today?status=UNCLAIMED"><Icon name="ticket" /><span><strong>Đã thu nhưng chưa đổi mã</strong></span><Icon name="arrow" /></Link>
        </Card>
        <Card title="Khi khách cần hỗ trợ" as="aside">
          <ul className="adm-help-list">
            <li><span>1</span><div><strong>Đã trả tiền nhưng chưa nghe được?</strong>Tra cứu giao dịch trước. Không tạo yêu cầu thu tiền mới để xử lý lỗi mã.</div></li>
            <li><span>2</span><div><strong>Không thấy mã vừa cấp?</strong>Tra cứu lại phiên đã thanh toán, sau đó cấp mã. Máy chủ kiểm tra hạn dùng và tình trạng đổi mã.</div></li>
            <li><span>3</span><div><strong>Khách đã kích hoạt nhưng mất vé trên máy?</strong>Dùng <Link to="/internal/reissue">Cấp lại vé</Link> sau khi đối chiếu giao dịch.</div></li>
          </ul>
          <hr className="adm-divider" />
          <Link className="adm-link" to="/internal/pois">Kiểm tra điểm có audio <Icon name="arrow" /></Link>
        </Card>
      </div>
    </div>
  </AdminPage>;
};
