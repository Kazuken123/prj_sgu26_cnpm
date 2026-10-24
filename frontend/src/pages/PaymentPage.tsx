import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client';
import { getVisitMe, getVisitPrice, VisitPrice } from '../api/payment';
import { exchangeCashCode } from '../api/cash';
import { clearGuestSession, getEmptyGuestSession, loadGuestSession, saveGuestSession, StoredGuestSession } from '../api/guestStorage';
import { useVisitExpiry } from '../hooks/useVisitExpiry';

export const PaymentPage: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const loaded = loadGuestSession(baseUrl);
  const [session, setSession] = useState(loaded.session);
  const [mismatch, setMismatch] = useState(loaded.mismatchedBaseUrl);
  const [price, setPrice] = useState<VisitPrice | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(loaded.storageError);
  const epoch = useRef(0);
  const inFlight = useRef(false);
  const persist = useCallback((next: StoredGuestSession) => {
    setSession(next);
    const saved = saveGuestSession(next);
    setStorageWarning(saved.success ? null : 'Không lưu được quyền nghe trên trình duyệt. Giữ trang này mở và liên hệ nhân viên trước khi tải lại.');
  }, []);
  const expire = useCallback(() => {
    epoch.current++;
    clearGuestSession();
    setSession(getEmptyGuestSession(baseUrl));
    setVerified(false); setBusy(false); inFlight.current = false;
    setNotice(null); setErrorCode(null);
    setError('Quyền nghe đã hết hạn hoặc chưa được nhân viên xác nhận. Bạn vẫn có thể xem bản đồ.');
  }, [baseUrl]);
  useVisitExpiry(!mismatch && session.token ? session.expiresAt : null, expire);
  useEffect(() => {
    let active = true;
    setPrice(null); setPriceError(false);
    getVisitPrice(baseUrl).then(value => { if (active) setPrice(value); })
      .catch(() => { if (active) setPriceError(true); });
    return () => { active = false; };
  }, [baseUrl, attempt]);
  useEffect(() => () => { epoch.current++; }, []);
  const verify = useCallback(async (saved: StoredGuestSession) => {
    if (!saved.token) return;
    const generation = epoch.current;
    setBusy(true); setVerified(false); setError(null); setErrorCode(null);
    try {
      const visit = await getVisitMe(saved.token, baseUrl);
      if (generation !== epoch.current) return;
      if (visit.status !== 'ACTIVE' || !visit.expiresAt || !Number.isFinite(Date.parse(visit.expiresAt)) || Date.parse(visit.expiresAt) <= Date.now()) { expire(); return; }
      persist({ ...saved, verifiedVisit: visit, expiresAt: visit.expiresAt, sessionStatus: 'ACTIVE' });
      setVerified(true); setNotice('Quyền nghe đã được xác nhận. Bạn có thể bắt đầu nghe thuyết minh.');
    } catch (err) {
      if (generation !== epoch.current) return;
      if (err instanceof ApiError && err.status === 401) { expire(); return; }
      setError(err instanceof Error ? err.message : 'Chưa xác minh được quyền nghe.');
      setNotice('Đã lưu quyền truy cập. Hãy xác minh lại, không đổi mã hoặc thanh toán lần nữa.');
    } finally { if (generation === epoch.current) setBusy(false); }
  }, [baseUrl, expire, persist]);
  useEffect(() => {
    const initial = loadGuestSession(baseUrl);
    if (!initial.mismatchedBaseUrl && initial.session.token) void verify(initial.session);
  }, [baseUrl, verify]);
  const exchange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || busy || session.token || mismatch) return;
    setError(null); setErrorCode(null); setNotice(null);
    if (!/^\d{6}$/.test(code.trim())) { setError('Vui lòng nhập đủ 6 chữ số nhân viên đã cấp.'); return; }
    const generation = epoch.current;
    inFlight.current = true; setBusy(true);
    try {
      const result = await exchangeCashCode(code.trim(), baseUrl);
      if (generation !== epoch.current) return;
      if (!Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) { expire(); return; }
      const next: StoredGuestSession = { ...getEmptyGuestSession(baseUrl), sessionId: result.sessionId,
        token: result.token, tokenType: 'Bearer', expiresAt: result.expiresAt, paymentStatus: 'PAID', sessionStatus: 'ACTIVE' };
      // Save the single-use exchange before verification; retries never exchange twice.
      persist(next); setCode('');
      await verify(next);
    } catch (err) {
      if (generation !== epoch.current) return;
      setErrorCode(err instanceof ApiError ? err.code : 'NETWORK_ERROR');
      setError(err instanceof ApiError && err.code === 'CASH_CODE_INVALID_OR_EXPIRED'
        ? 'Mã không đúng, đã hết hạn hoặc đã được dùng. Bạn hãy kiểm tra lại với nhân viên.'
        : 'Chưa xác nhận được kết quả kích hoạt. Hãy nhờ nhân viên kiểm tra; không cần trả tiền lại.');
    } finally {
      if (generation === epoch.current) { inFlight.current = false; setBusy(false); }
    }
  };
  return <div className="payment-container" style={{ maxWidth: 860, margin: '32px auto', padding: '0 20px' }}>
    <header className="page-header"><p className="eyebrow">QUYỀN NGHE THUYẾT MINH</p><h1>Kích hoạt tại quầy</h1>
      <p>Bản đồ và thông tin điểm tham quan được xem miễn phí. Để nghe thuyết minh, thanh toán tại quầy và nhận mã sau khi nhân viên xác nhận.</p></header>
    <div className="tcv-card" style={{ padding: 28, marginBottom: 20 }}>
      {price ? <p>Giá quyền sử dụng thuyết minh: <strong>{Number(price.amount).toLocaleString('vi-VN')} {price.currency}</strong>. Đây không phải vé vào cổng Thảo Cầm Viên.</p>
        : priceError ? <p role="status">Chưa tải được giá. Vui lòng hỏi nhân viên trước khi thanh toán. <button className="btn-secondary" onClick={() => setAttempt(value => value + 1)}>Tải lại giá</button></p>
          : <p>Đang tải giá…</p>}
      <ol><li>Thanh toán phí thuyết minh tại quầy.</li><li>Nhân viên xác nhận đã thu tiền và cấp mã kích hoạt.</li><li>Nhập mã 6 chữ số để mở quyền nghe trên thiết bị này.</li></ol>
    </div>
    {storageWarning && <p role="alert">{storageWarning}</p>}
    {error && <div className="banner-notice" role="alert"><div><strong>Chưa thể hoàn tất</strong><p>{error}</p>
      {errorCode && <details><summary>Thông tin hỗ trợ</summary><code>{errorCode}</code></details>}</div></div>}
    {notice && <p role="status">{notice}</p>}
    <section className="tcv-card" style={{ padding: 28 }}>
      {mismatch ? <><h2>Phiên thuộc máy chủ khác</h2><p>Không thể sử dụng mã đã lưu cho máy chủ hiện tại.</p>
        <button className="btn-secondary" onClick={() => { epoch.current++; clearGuestSession(); setSession(getEmptyGuestSession(baseUrl)); setMismatch(false); }}>Dùng máy chủ hiện tại</button></>
        : verified ? <><h2>Quyền nghe đang hiệu lực</h2><p>Hạn sử dụng: {session.expiresAt && new Date(session.expiresAt).toLocaleString('vi-VN')}</p><Link className="btn-primary" to="/explore">Bắt đầu nghe thuyết minh</Link></>
          : session.token ? <><h2>{busy ? 'Đang xác minh quyền nghe…' : 'Xác minh lại quyền nghe'}</h2><button className="btn-primary" disabled={busy} onClick={() => void verify(session)}>Xác minh lại</button></>
            : <form className="activation-form" onSubmit={exchange}><h2>Nhập mã tại quầy</h2><label htmlFor="activation-code">Mã kích hoạt 6 chữ số</label>
              <input id="activation-code" aria-label="Mã kích hoạt 6 chữ số" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={busy} />
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Đang kích hoạt…' : 'Kích hoạt vé thuyết minh'}</button>
              <p>Mã chỉ dùng một lần. Nếu gặp lỗi, liên hệ nhân viên trước khi thanh toán lại.</p></form>}
    </section>
    <p><Link className="text-link" to="/explore">Xem bản đồ miễn phí →</Link></p>
  </div>;
};
