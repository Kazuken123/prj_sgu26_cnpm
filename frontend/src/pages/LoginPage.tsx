import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { loginInternal } from '../api/auth.ts';
import { loadInternalSession, saveInternalSession } from '../api/authStorage.ts';
import { Icon } from '../components/Icon';
import { Alert, Field } from '../components/admin/AdminUI';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Five wrong passwords lock the account for 15 minutes, so warn about Caps Lock.
  const [capsLock, setCapsLock] = useState<boolean>(false);
  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(Boolean(e.getModifierState?.('CapsLock')));

  // Neu da co phien noi bo hop le thi chuyen huong sang /internal/account
  useEffect(() => {
    const { session } = loadInternalSession(currentBaseUrl);
    if (session.accessToken) {
      navigate('/internal/cash', { replace: true });
    }
  }, [currentBaseUrl, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập email.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    // Kiem tra do dai byte UTF-8 khong qua 72 bytes
    const encoder = new TextEncoder();
    if (encoder.encode(password).length > 72) {
      setErrorMessage('Mật khẩu vượt quá giới hạn 72 bytes UTF-8.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await loginInternal({ email: cleanEmail, password }, currentBaseUrl);

      // Luu phien noi bo
      saveInternalSession({
        version: 1,
        apiBaseUrl: currentBaseUrl,
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });

      setIsSubmitting(false);
      navigate('/internal/cash', { replace: true });
    } catch (err: unknown) {
      setIsSubmitting(false);

      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrorMessage('Email hoặc mật khẩu không đúng.');
        } else if (err.code === 'LOGIN_TEMPORARILY_LOCKED') {
          setErrorMessage('Tài khoản đang bị khóa tạm thời trong 15 phút do nhập sai 5 lần.');
        } else if (err.code === 'ACCOUNT_LOCKED') {
          setErrorMessage('Tài khoản đã bị quản trị viên khóa.');
        } else if (err.code === 'ACCOUNT_INACTIVE') {
          setErrorMessage('Tài khoản chưa được kích hoạt.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc trạng thái backend.');
      }
    }
  };

  return (
    <div className="adm-auth">
      <aside className="adm-auth__intro" aria-hidden="true">
        <span className="adm-sidebar__brand-mark"><Icon name="leaf" /></span>
        <h2>Không gian làm việc nội bộ</h2>
        <p>Thu ngân, nội dung thuyết minh đa ngôn ngữ, kho tri thức và giám sát hệ thống — trong một nơi.</p>
        <ul>
          <li><Icon name="ticket" />Thu tiền mặt, cấp mã và cấp lại vé cho khách</li>
          <li><Icon name="headphones" />Quản lý điểm tham quan, bản dịch và audio</li>
          <li><Icon name="shield" />Phân quyền STAFF / ADMIN, mọi thao tác có nhật ký</li>
        </ul>
      </aside>
      <section className="adm-auth__panel">
        <p className="adm-eyebrow">Không gian làm việc nội bộ</p>
        <h1>Bắt đầu ngày làm việc</h1>
        <p className="adm-muted" style={{ margin: '6px 0 24px', fontSize: 14, lineHeight: 1.6 }}>Nhân viên phục vụ khách tại quầy. Chủ quản theo dõi công việc và tiền thu trong ngày.</p>

        {errorMessage && <Alert tone="danger" title={`Đăng nhập thất bại ${errorCode ? `[${errorCode}]` : ''}`}>{errorMessage}</Alert>}

        <form onSubmit={handleSubmit} className="adm-form" style={{ marginTop: errorMessage ? 16 : 0 }} noValidate>
          <Field label="Email công vụ" htmlFor="email-input" required>
            <input id="email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nhanvien@thaocamvien.vn" required disabled={isSubmitting} autoComplete="username" autoFocus />
          </Field>
          <Field label="Mật khẩu" htmlFor="password-input" required hint={capsLock ? <strong style={{ color: 'var(--adm-warning)' }} role="status">Caps Lock đang bật — mật khẩu phân biệt chữ hoa/thường.</strong> : 'Tối thiểu 8 ký tự, tối đa 72 bytes.'}>
            <div className="adm-input-group">
              <input id="password-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required disabled={isSubmitting} autoComplete="current-password" onKeyUp={detectCapsLock} onKeyDown={detectCapsLock} onBlur={() => setCapsLock(false)} />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="adm-btn adm-btn--secondary" disabled={isSubmitting} aria-pressed={showPassword} aria-controls="password-input">{showPassword ? 'Ẩn' : 'Hiện'}</button>
            </div>
          </Field>
          <button type="submit" disabled={isSubmitting} className="adm-btn adm-btn--primary adm-btn--lg adm-btn--block">{isSubmitting ? 'Đang xác thực trên máy chủ...' : 'Đăng nhập vào hệ thống'}</button>
        </form>

        <div className="adm-small adm-muted" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--adm-border)', textAlign: 'center', lineHeight: 1.7 }}>
          <div>Cổng thông tin nội bộ bảo mật, không hỗ trợ đăng ký công khai.</div>
          <div>Cần tài khoản mới hoặc hỗ trợ đăng nhập? Liên hệ người quản lý.</div>
        </div>
      </section>
    </div>
  );
};
