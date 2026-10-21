import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { generateUUIDv4 } from '../api/guestStorage.ts';

export const InternalCashPage: React.FC = () => {
  const navigate = useNavigate();
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
      setIsVerifying(false);
    } catch (err: unknown) {
      setIsVerifying(false);
      clearInternalSession();
      navigate('/internal/login', { replace: true });
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotice(`Đã sao chép ${label}.`);
      setTimeout(() => setCopiedNotice(null), 3000);
    }
  };

  // Buoc 1: Tao phien tien mat moi
  const handleCreateCashSession = async () => {
    setIsCreating(true);
    setStepError(null);
    setInitData(null);
    setLookupData(null);
    setConfirmData(null);
    setCodeData(null);

    const idempotencyKey = generateUUIDv4();

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => createCashPayment(token, idempotencyKey, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setInitData(data);
      setActiveSessionId(data.sessionId);
      setSessionIdInput(data.sessionId);
      setIsCreating(false);
    } catch (err: unknown) {
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
  const handleLookupSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetId = sessionIdInput.trim().toLowerCase();

    if (!targetId) {
      setStepError({
        step: 'Tra cứu phiên',
        message: 'Vui lòng nhập mã phiên hợp lệ.'
      });
      return;
    }

    setIsLookingUp(true);
    setStepError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => lookupCashSession(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setLookupData(data);
      setActiveSessionId(data.sessionId);
      setIsLookingUp(false);
    } catch (err: unknown) {
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
    const targetId = activeSessionId || sessionIdInput.trim().toLowerCase();
    if (!targetId) {
      setStepError({
        step: 'Xác nhận tiền mặt',
        message: 'Chưa có mã phiên để xác nhận.'
      });
      return;
    }

    setIsConfirming(true);
    setStepError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => confirmCashPayment(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setConfirmData(data);
      // Cap nhat lai lookupData neu dang hien thi
      if (lookupData && lookupData.sessionId === targetId) {
        setLookupData({
          ...lookupData,
          paymentStatus: data.paymentStatus,
          sessionStatus: data.sessionStatus
        });
      }
      setIsConfirming(false);
    } catch (err: unknown) {
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
    const targetId = activeSessionId || sessionIdInput.trim().toLowerCase();
    if (!targetId) {
      setStepError({
        step: 'Cấp mã ngắn',
        message: 'Chưa có mã phiên để cấp mã.'
      });
      return;
    }

    setIsIssuingCode(true);
    setStepError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => issueCashCode(token, targetId, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setCodeData(data);
      setIsIssuingCode(false);
    } catch (err: unknown) {
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
          <Link to="/internal/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
            Đi tới trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '900px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Quầy thu tiền mặt và Cấp mã tham quan</h1>
            <p className="page-subtitle" style={{ margin: '6px 0 0 0' }}>
              Quy trình nhân viên hỗ trợ khách mua vé trực tiếp tại quầy theo thiết kế UC-11
            </p>
          </div>
          <div>
            <Link to="/internal/account" className="btn-secondary">
              Xem tài khoản nhân viên
            </Link>
          </div>
        </div>
      </div>

      {/* Thong tin nhan vien dang truc */}
      <div className="panel" style={{ marginBottom: '20px', padding: '14px 20px', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            Nhân viên trực: <strong>{user.fullName || user.email}</strong> • Vai trò: <strong>{user.role}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Máy chủ: <code>{currentBaseUrl}</code>
          </div>
        </div>
      </div>

      {/* Thong bao loi chung */}
      {stepError && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid var(--tcv-brick-600)', backgroundColor: '#fff5f5' }}>
          <div style={{ fontWeight: 600, color: 'var(--tcv-brick-600)', marginBottom: '4px' }}>
            Lỗi tại bước: {stepError.step}
          </div>
          <div style={{ color: '#1f2937' }}>{stepError.message}</div>
          {stepError.code && (
            <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#6b7280' }}>
              Mã lỗi kỹ thuật: <code>{stepError.code}</code>
            </div>
          )}
        </div>
      )}

      {copiedNotice && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid var(--tcv-green-600)', backgroundColor: '#f0fdf4', padding: '10px 16px' }}>
          {copiedNotice}
        </div>
      )}

      {/* Buoc 1: Tao phien tien mat moi */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Bước 1: Khởi tạo phiên tiền mặt cho khách</h2>
            <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
              Gửi yêu cầu khởi tạo thanh toán tiền mặt với Idempotency-Key ngẫu nhiên.
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateCashSession}
            disabled={isCreating}
            className="btn-primary"
          >
            {isCreating ? 'Đang tạo phiên...' : '+ Tạo phiên tiền mặt mới'}
          </button>
        </div>

        {initData && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <strong>Đã khởi tạo phiên thành công</strong>
            </div>
            <table className="status-detail-table">
              <tbody>
                <tr>
                  <th>Mã phiên</th>
                  <td>
                    <code style={{ fontSize: '0.9rem' }}>{initData.sessionId}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(initData.sessionId, 'Mã phiên')}
                      style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Sao chép
                    </button>
                  </td>
                </tr>
                <tr>
                  <th>Mã tham chiếu thanh toán</th>
                  <td><code>{initData.paymentRef}</code></td>
                </tr>
                <tr>
                  <th>Phương thức</th>
                  <td><strong>{initData.paymentMethod}</strong></td>
                </tr>
                <tr>
                  <th>Số tiền vé</th>
                  <td><strong>{initData.amount} {initData.currency}</strong></td>
                </tr>
                <tr>
                  <th>Trạng thái thanh toán</th>
                  <td><span style={{ color: '#d97706', fontWeight: 600 }}>{initData.paymentStatus}</span></td>
                </tr>
                <tr>
                  <th>Trạng thái phiên</th>
                  <td><span>{initData.sessionStatus}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buoc 2: Tra cuu doi soat phien */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>Bước 2: Tra cứu đối soát phiên tham quan</h2>
        <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
          Tra cứu thông tin phiên bằng mã phiên đã được cấp để đối soát số tiền trước khi thu.
        </div>

        <form onSubmit={handleLookupSession} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            value={sessionIdInput}
            onChange={(e) => setSessionIdInput(e.target.value)}
            placeholder="Nhập mã phiên (ví dụ: e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c)"
            style={{ flex: 1, minWidth: '320px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
          <button
            type="submit"
            disabled={isLookingUp}
            className="btn-secondary"
          >
            {isLookingUp ? 'Đang tra cứu...' : 'Tra cứu phiên'}
          </button>
        </form>

        {lookupData && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <table className="status-detail-table">
              <tbody>
                <tr>
                  <th>Mã phiên</th>
                  <td><code>{lookupData.sessionId}</code></td>
                </tr>
                <tr>
                  <th>Mã tham chiếu thanh toán</th>
                  <td><code>{lookupData.paymentRef}</code></td>
                </tr>
                <tr>
                  <th>Phương thức</th>
                  <td><strong>{lookupData.paymentMethod}</strong></td>
                </tr>
                <tr>
                  <th>Số tiền cần thu</th>
                  <td style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--tcv-green-800)' }}>
                    {lookupData.amount} {lookupData.currency}
                  </td>
                </tr>
                <tr>
                  <th>Trạng thái thanh toán</th>
                  <td>
                    <strong style={{ color: lookupData.paymentStatus === 'PAID' ? '#059669' : '#d97706' }}>
                      {lookupData.paymentStatus}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <th>Trạng thái phiên tham quan</th>
                  <td><strong>{lookupData.sessionStatus}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buoc 3: Xac nhan da nhan tien mat */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>Bước 3: Xác nhận đã thu đủ tiền mặt</h2>
        <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '14px' }}>
          Nhân viên chỉ thực hiện sau khi đã nhận đủ số tiền mặt từ khách. Máy chủ sẽ kích hoạt phiên sang ACTIVE và đặt hạn vé.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleConfirmCash}
            disabled={isConfirming || !activeSessionId}
            className="btn-primary"
            style={{ backgroundColor: '#059669' }}
          >
            {isConfirming ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền mặt'}
          </button>
          {!activeSessionId && (
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              (Cần tạo phiên hoặc tra cứu phiên trước khi xác nhận)
            </span>
          )}
        </div>

        {confirmData && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <strong style={{ color: '#059669' }}>
                {confirmData.alreadyConfirmed ? 'Giao dịch đã được xác nhận trước đó.' : 'Xác nhận thanh toán thành công và kích hoạt phiên.'}
              </strong>
            </div>

            <table className="status-detail-table">
              <tbody>
                <tr>
                  <th>Mã phiên</th>
                  <td><code>{confirmData.sessionId}</code></td>
                </tr>
                <tr>
                  <th>Trạng thái thanh toán</th>
                  <td><strong style={{ color: '#059669' }}>{confirmData.paymentStatus}</strong></td>
                </tr>
                <tr>
                  <th>Trạng thái phiên</th>
                  <td><strong style={{ color: '#059669' }}>{confirmData.sessionStatus}</strong></td>
                </tr>
                <tr>
                  <th>Thời điểm xác nhận</th>
                  <td><code>{confirmData.paidAt}</code></td>
                </tr>
                <tr>
                  <th>Thời hạn vé tham quan</th>
                  <td><code>{confirmData.expiresAt}</code></td>
                </tr>
                <tr>
                  <th>Đã xác nhận từ trước</th>
                  <td>{confirmData.alreadyConfirmed ? 'Có' : 'Không'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buoc 4: Cap ma ngan cho khach */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>Bước 4: Cấp mã ngắn 6 số cho khách</h2>
        <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '14px' }}>
          Tạo mã ngắn sáu chữ số có thời hạn để khách đổi lấy token quyền tham quan.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleIssueCashCode}
            disabled={isIssuingCode || !activeSessionId}
            className="btn-primary"
          >
            {isIssuingCode ? 'Đang cấp mã...' : 'Cấp mã ngắn 6 số'}
          </button>
          {!activeSessionId && (
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              (Cần có phiên đã thanh toán để cấp mã)
            </span>
          )}
        </div>

        {codeData && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Mã ngắn bàn giao cho khách
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '3rem', fontWeight: 800, color: '#15803d', letterSpacing: '6px', margin: '8px 0' }}>
                {codeData.shortedCode}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '6px' }}>
                Thời hạn hiệu lực của mã: <code>{codeData.codeExpiresAt}</code>
              </div>
              {codeData.reused && (
                <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#0284c7' }}>
                  * Mã cũ đang còn hiệu lực được cấp lại.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => copyToClipboard(codeData.shortedCode, 'Mã ngắn')}
                className="btn-secondary"
              >
                Sao chép mã ngắn
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(`Mã phiên: ${codeData.sessionId} | Mã ngắn: ${codeData.shortedCode}`, 'Thông tin bàn giao')}
                className="btn-secondary"
              >
                Sao chép thông tin bàn giao
              </button>
            </div>

            {/* Huong dan khach thao tac */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.98rem' }}>Hướng dẫn khách nhận quyền tại quầy:</h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', lineHeight: '1.6', color: '#334155' }}>
                <li>Khách truy cập vào trang <strong>Thanh toán</strong> trên trình duyệt điện thoại.</li>
                <li>Chọn tab <strong>Đổi mã tiền mặt</strong>.</li>
                <li>Nhập <strong>Mã phiên</strong>: <code>{codeData.sessionId}</code></li>
                <li>Nhập <strong>Mã ngắn 6 số</strong>: <code>{codeData.shortedCode}</code></li>
                <li>Bấm xác nhận đổi mã để nhận token phiên khách và bắt đầu nghe thuyết minh tại trang <strong>Khám phá</strong>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
