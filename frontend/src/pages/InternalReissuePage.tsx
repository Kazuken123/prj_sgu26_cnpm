// UC-12 — Cấp lại token khách (Could Have, US-A04 AC4–AC5).
// Step 1–3: staff reconciles session_id + payment_ref + payment time (server).
// Step 4: staff confirms in a dialog. Step 5–7: server revokes the lost token
// and returns a one-time 6-digit pickup code the visitor enters on /payment.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { verifyTokenReissue, reissueVisitorToken, vietnamLocalToIso } from '../api/reissue.ts';
import type { TokenReissueSummary, TokenReissueResult, TokenReissueInput } from '../api/reissue.ts';
import { localTime, money } from '../api/operations';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, DescriptionList, Field, LoadingState, ConfirmDialog, EmptyState } from '../components/admin/AdminUI';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
type Errors = Partial<Record<'sessionId' | 'paymentRef' | 'paidAt' | 'reason', string>>;

// Human guidance for server rejection codes (the server message is still shown).
const guidance: Record<string, string> = {
  REISSUE_VERIFICATION_FAILED: 'Kiểm tra lại mã phiên, mã giao dịch và giờ thanh toán (cho phép lệch tối đa 10 phút).',
  REISSUE_LIMIT_REACHED: 'Vé đã dùng hết số lần cấp lại. Không tạo vé hoặc thu tiền mới; báo quản trị viên nếu cần xử lý ngoại lệ.',
  REISSUE_NOT_NEEDED: 'Khách chưa từng kích hoạt vé. Dùng Thu ngân để cấp mã ngắn (tiền mặt) hoặc hướng dẫn khách đổi mã online.',
  VISIT_SESSION_EXPIRED: 'Vé đã hết hạn nên không cấp lại.',
  VISIT_SESSION_NOT_ACTIVE: 'Phiên đã bị thu hồi hoặc chưa kích hoạt.',
  REISSUE_PERSISTENCE_UNAVAILABLE: 'Kết quả chưa xác định. Đối chiếu lại phiên trước khi thử; hệ thống sẽ không tính thêm lần cấp lại cho cùng yêu cầu.',
  CASH_CODE_UNAVAILABLE: 'Chưa tạo được mã. Token cũ của khách vẫn hoạt động và chưa tính lần cấp lại.',
};

function validate(form: { sessionId: string; paymentRef: string; paidAtLocal: string; reason: string }, requireReason: boolean): Errors {
  const errors: Errors = {};
  if (!uuid.test(form.sessionId.trim())) errors.sessionId = 'Mã phiên phải là UUID (36 ký tự) khách cung cấp.';
  if (!uuid.test(form.paymentRef.trim())) errors.paymentRef = 'Mã giao dịch phải là UUID (36 ký tự).';
  if (!vietnamLocalToIso(form.paidAtLocal)) errors.paidAt = 'Chọn ngày giờ thanh toán (giờ Việt Nam).';
  const reason = form.reason.trim();
  if (requireReason && (reason.length < 5 || reason.length > 255)) errors.reason = 'Nhập lý do cấp lại từ 5 đến 255 ký tự.';
  else if (/[<>]/.test(reason)) errors.reason = 'Lý do không được chứa ký tự < hoặc >.';
  return errors;
}

export const InternalReissuePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const baseUrl = getApiBaseUrl();
  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [form, setForm] = useState({ sessionId: searchParams.get('session') || '', paymentRef: '', paidAtLocal: '', reason: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<TokenReissueSummary | null>(null);
  const [result, setResult] = useState<TokenReissueResult | null>(null);
  const [requestError, setRequestError] = useState<{ title: string; message: string; code?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const lock = useRef(false);

  const verifyAccess = useCallback(async () => {
    setIsVerifyingAccess(true); setAuthError(null);
    try {
      const profile = await executeAuthenticatedInternalRequest(baseUrl, token => getAuthMe(token, baseUrl), () => navigate('/internal/login', { replace: true }));
      if (profile.role !== 'STAFF' && profile.role !== 'ADMIN') { setAuthError('Chỉ nhân viên STAFF hoặc quản trị viên ADMIN được cấp lại vé.'); return; }
      setUser(profile);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) { clearInternalSession(); navigate('/internal/login', { replace: true }); }
      else setAuthError('Chưa kiểm tra được quyền truy cập. Thử lại khi kết nối ổn định.');
    } finally { setIsVerifyingAccess(false); }
  }, [baseUrl, navigate]);
  useEffect(() => { void verifyAccess(); }, [verifyAccess]);
  useEffect(() => {
    if (!result) return;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [result]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm(previous => ({ ...previous, [key]: value }));
    // Any change to reconciliation data invalidates a previous verification.
    if (key !== 'reason') setSummary(null);
    setErrors(previous => ({ ...previous, [key === 'paidAtLocal' ? 'paidAt' : key]: undefined }));
  };
  const input = (withReason: boolean): TokenReissueInput => ({ sessionId: form.sessionId, paymentRef: form.paymentRef,
    paidAt: vietnamLocalToIso(form.paidAtLocal) as string, ...(withReason ? { reason: form.reason } : {}) });
  const fail = (title: string, err: unknown) => {
    if (err instanceof ApiError) setRequestError({ title, code: err.code, message: err.message });
    else setRequestError({ title, message: 'Lỗi kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.' });
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const found = validate(form, true);
    setErrors(found); setRequestError(null); setResult(null);
    if (Object.keys(found).length) return;
    lock.current = true; setChecking(true);
    try {
      setSummary(await executeAuthenticatedInternalRequest(baseUrl, token => verifyTokenReissue(token, input(false), baseUrl), () => navigate('/internal/login', { replace: true })));
    } catch (err) { setSummary(null); fail('Đối chiếu giao dịch', err); }
    finally { lock.current = false; setChecking(false); }
  };

  const handleReissue = async () => {
    if (lock.current || !summary) return;
    const found = validate(form, true);
    setErrors(found);
    if (Object.keys(found).length) { setConfirmOpen(false); return; }
    lock.current = true; setIssuing(true); setRequestError(null);
    try {
      const data = await executeAuthenticatedInternalRequest(baseUrl, token => reissueVisitorToken(token, input(true), baseUrl), () => navigate('/internal/login', { replace: true }));
      setResult(data); setSummary(null); setConfirmOpen(false);
    } catch (err) { setConfirmOpen(false); fail('Cấp lại vé', err); }
    finally { lock.current = false; setIssuing(false); }
  };

  const reset = () => {
    setForm({ sessionId: '', paymentRef: '', paidAtLocal: '', reason: '' });
    setErrors({}); setSummary(null); setResult(null); setRequestError(null); setCopied(null);
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied('Đã sao chép mã nhận vé.'); }
    catch { setCopied('Không sao chép tự động được. Hãy đọc mã cho khách.'); }
  };

  if (isVerifyingAccess) return <AdminPage><LoadingState label="Đang kiểm tra quyền hạn nhân viên..." /></AdminPage>;
  if (authError || !user) return <AdminPage width="narrow"><Card title="Từ chối quyền truy cập">
    <Alert tone="danger">{authError || 'Vui lòng đăng nhập với tài khoản nhân viên.'}</Alert>
    <div className="adm-row" style={{ marginTop: 16 }}><button type="button" className="adm-btn adm-btn--secondary" onClick={verifyAccess}>Thử lại kết nối</button><Link to="/internal/login" className="adm-btn adm-btn--primary">Đi tới trang đăng nhập</Link></div>
  </Card></AdminPage>;

  const busy = checking || issuing;
  const codeLive = Boolean(result && Date.parse(result.codeExpiresAt) > clock);
  const secondsLeft = result ? Math.max(0, Math.floor((Date.parse(result.codeExpiresAt) - clock) / 1000)) : 0;
  const step = result ? 3 : summary ? 2 : 1;

  return <AdminPage>
    <PageHeader eyebrow="Quầy vé · UC-12" title="Cấp lại vé cho khách"
      description="Dành cho khách đã kích hoạt vé nhưng mất quyền nghe trên thiết bị (xóa dữ liệu, đổi máy). Hệ thống thu hồi vé cũ và cấp mã nhận vé 6 số; hạn vé giữ nguyên, không thu tiền lại."
      actions={<Link className="adm-btn adm-btn--secondary" to="/internal/cash"><Icon name="ticket" />Về quầy thu ngân</Link>} />
    {requestError && <Alert tone="danger" title={requestError.title} onDismiss={() => setRequestError(null)}>
      {requestError.message}
      {requestError.code && guidance[requestError.code] && <div style={{ marginTop: 4 }}>{guidance[requestError.code]}</div>}
      {requestError.code && <div className="adm-small">Mã hỗ trợ: <code>{requestError.code}</code></div>}
    </Alert>}
    {copied && <Alert tone="success" onDismiss={() => setCopied(null)}>{copied}</Alert>}

    <div className="adm-grid adm-grid--main-aside">
      <Card>
        <ol className="adm-steps" aria-label="Tiến trình cấp lại vé">{['Đối chiếu giao dịch', 'Xác nhận cấp lại', 'Giao mã nhận vé'].map((label, i) =>
          <li key={label} className={step > i + 1 ? 'is-done' : undefined} aria-current={step === i + 1 ? 'step' : undefined}><span>{step > i + 1 ? '✓' : i + 1}</span>{label}</li>)}</ol>

        {result ? <div aria-live="polite">
          <div className="ops-code-receipt">
            <span>{codeLive ? 'Mã nhận vé dành cho khách' : 'Mã nhận vé đã hết hạn'}</span>
            <strong aria-label="Mã nhận vé">{codeLive ? result.shortedCode : '— — —'}</strong>
            <p>{codeLive ? <>Khách mở trang <strong>Quyền nghe</strong>, nhập mã này một lần để nhận lại vé. Còn <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong>.</>
              : 'Nếu khách chưa kịp nhập, đối chiếu lại để tạo mã mới — không tính thêm lần cấp lại.'}</p>
            <p>Hạn đổi mã: {localTime(result.codeExpiresAt)} · Hạn vé (không đổi): {localTime(result.expiresAt)}</p>
            <div className="adm-row">
              <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={!codeLive} onClick={() => void copy(result.shortedCode)}>Sao chép mã</button>
              <Link className="adm-btn adm-btn--ghost adm-btn--sm" to="/payment" target="_blank" rel="noreferrer">Mở trang nhập mã <Icon name="external" /></Link>
            </div>
          </div>
          <DescriptionList items={[
            { label: 'Lần cấp lại', value: <>{result.reissueNumber} / {result.maxReissues}{result.renewedCode && <> <Badge tone="info">Tạo lại mã, không tính thêm</Badge></>}</> },
            { label: 'Còn được cấp lại', value: `${result.remainingAfter} lần` },
            { label: 'Mã phiên', value: result.sessionId, mono: true },
            { label: 'Token cũ', value: <Badge tone="danger" dot>Đã thu hồi</Badge> },
          ]} />
          <div className="adm-row adm-row--end" style={{ marginTop: 20 }}>
            {!codeLive && <button type="button" className="adm-btn adm-btn--secondary" onClick={() => { setResult(null); }}>Đối chiếu lại</button>}
            <button type="button" className="adm-btn adm-btn--primary" onClick={reset}>Hỗ trợ khách khác <Icon name="arrow" /></button>
          </div>
        </div> : <form className="adm-form" onSubmit={handleVerify} noValidate>
          <div className="adm-form-grid">
            <Field label="Mã phiên (session_id)" htmlFor="reissue-session" required error={errors.sessionId} hint="Khách xem trên trang Quyền nghe hoặc biên nhận.">
              <input id="reissue-session" value={form.sessionId} onChange={update('sessionId')} disabled={busy} placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} aria-invalid={!!errors.sessionId} />
            </Field>
            <Field label="Mã giao dịch (payment_ref)" htmlFor="reissue-ref" required error={errors.paymentRef} hint="In trên biên nhận thanh toán.">
              <input id="reissue-ref" value={form.paymentRef} onChange={update('paymentRef')} disabled={busy} placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} aria-invalid={!!errors.paymentRef} />
            </Field>
            <Field label="Thời điểm thanh toán (giờ Việt Nam)" htmlFor="reissue-paid" required error={errors.paidAt} hint="Cho phép lệch tối đa ±10 phút so với máy chủ.">
              <input id="reissue-paid" type="datetime-local" value={form.paidAtLocal} onChange={update('paidAtLocal')} disabled={busy} aria-invalid={!!errors.paidAt} />
            </Field>
            <Field label="Lý do cấp lại" htmlFor="reissue-reason" required error={errors.reason} hint={`${form.reason.trim().length}/255 ký tự · ghi vào nhật ký thao tác.`} className="adm-field--full">
              <textarea id="reissue-reason" value={form.reason} onChange={update('reason')} disabled={busy} maxLength={255} rows={3} placeholder="Ví dụ: Khách đổi điện thoại, trình duyệt bị xóa dữ liệu" aria-invalid={!!errors.reason} />
            </Field>
          </div>

          {summary && <div className="adm-card" style={{ background: 'var(--adm-surface-2)', boxShadow: 'none' }}>
            <div className="adm-card__head" style={{ marginBottom: 12 }}>
              <div><h2 className="adm-card__title">Đã khớp giao dịch</h2><p className="adm-card__desc">Kiểm tra thông tin với khách trước khi cấp lại.</p></div>
              <Badge tone="success" dot>Hợp lệ</Badge>
            </div>
            {summary.pendingPickup && <Alert tone="warning" title="Lần cấp lại trước chưa được nhận">Khách chưa nhập mã nhận vé lần trước (hoặc mã đã hết hạn). Tạo lại mã sẽ <strong>không</strong> tính thêm lần cấp lại.</Alert>}
            <DescriptionList items={[
              { label: 'Hình thức', value: summary.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Trực tuyến' },
              { label: 'Số tiền', value: money(summary.amount, summary.currency) },
              { label: 'Thanh toán lúc', value: localTime(summary.paidAt) },
              { label: 'Hạn vé (giữ nguyên)', value: localTime(summary.expiresAt) },
              { label: 'Đã cấp lại', value: `${summary.reissueCount} / ${summary.maxReissues} lần` },
              { label: 'Còn lại sau lần này', value: `${summary.remainingAfter} lần` },
            ]} />
          </div>}

          <div className="adm-form-actions">
            {summary
              ? <><button type="button" className="adm-btn adm-btn--secondary" onClick={() => setSummary(null)} disabled={busy}>Sửa thông tin</button>
                <button type="button" className="adm-btn adm-btn--primary" onClick={() => { const found = validate(form, true); setErrors(found); if (!Object.keys(found).length) setConfirmOpen(true); }} disabled={busy}><Icon name="key" />{summary.pendingPickup ? 'Tạo lại mã nhận vé' : 'Cấp lại vé'}</button></>
              : <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}><Icon name="search" />{checking ? 'Đang đối chiếu…' : 'Đối chiếu giao dịch'}</button>}
          </div>
        </form>}
      </Card>

      <div className="adm-stack">
        <Card title="Quy tắc cấp lại" as="aside">
          <ul className="adm-help-list">
            <li><span>1</span><div><strong>Đối chiếu đủ 3 thông tin</strong>Mã phiên, mã giao dịch và giờ thanh toán phải khớp máy chủ. Đây là đối chiếu giao dịch, không phải xác minh danh tính.</div></li>
            <li><span>2</span><div><strong>Tối đa 2 lần mỗi vé</strong>Vé phải đã thanh toán, đang hoạt động và còn hạn. Hạn vé không được kéo dài.</div></li>
            <li><span>3</span><div><strong>Vé cũ bị thu hồi ngay</strong>Thiết bị cũ bị từ chối ở yêu cầu tiếp theo. Nội dung đã tải không bị thu hồi.</div></li>
            <li><span>4</span><div><strong>Không thu tiền, không tạo vé mới</strong>Mọi lần cấp lại được ghi vào lịch sử thao tác cùng lý do.</div></li>
          </ul>
        </Card>
        {!summary && !result && <Card as="aside"><EmptyState icon="info" title="Khách chưa kích hoạt vé?">Dùng <Link to="/internal/cash">Thu ngân</Link> để cấp mã ngắn cho phiên tiền mặt đã thanh toán.</EmptyState></Card>}
      </div>
    </div>

    <ConfirmDialog open={confirmOpen && !!summary} title={summary?.pendingPickup ? 'Tạo lại mã nhận vé?' : 'Xác nhận cấp lại vé?'} tone="danger"
      confirmLabel={summary?.pendingPickup ? 'Tạo lại mã' : 'Thu hồi vé cũ và cấp lại'} busy={issuing} busyLabel="Đang cấp lại…"
      onCancel={() => { if (!issuing) setConfirmOpen(false); }} onConfirm={() => void handleReissue()}>
      {summary && <>
        <p>{summary.pendingPickup
          ? 'Mã nhận vé mới thay thế mã trước đó. Số lần cấp lại giữ nguyên.'
          : <>Vé hiện tại trên thiết bị cũ của khách sẽ <strong>bị thu hồi ngay</strong>. Đây là lần cấp lại thứ <strong>{summary.reissueCount + 1}/{summary.maxReissues}</strong>.</>}</p>
        <p className="adm-small">Lý do ghi nhật ký: “{form.reason.trim()}”</p>
      </>}
    </ConfirmDialog>
  </AdminPage>;
};
