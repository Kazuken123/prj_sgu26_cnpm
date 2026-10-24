import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { loginInternal } from '../api/auth.ts';
import { loadInternalSession, saveInternalSession } from '../api/authStorage.ts';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
    <div className="login-page-container">
      <div className="tcv-card" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tcv-green-700)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Không gian làm việc nội bộ
          </span>
          <h1 className="hero-title" style={{ fontSize: '1.8rem', marginTop: '6px' }}>
            Bắt đầu ngày làm việc
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-600)', marginTop: '4px' }}>
            Nhân viên phục vụ khách tại quầy. Chủ quản theo dõi công việc và tiền thu trong ngày.
          </p>
        </div>

        {errorMessage && (
          <div className="banner-notice" style={{ background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px' }}>
            <div style={{ fontSize: '1.2rem' }}></div>
            <div>
              <div className="banner-title">
                Đăng nhập thất bại {errorCode ? `[${errorCode}]` : ''}
              </div>
              <div className="banner-desc">{errorMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Email công vụ:
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhanvien@thaocamvien.vn"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--tcv-slate-200)'
              }}
            />
          </div>

          <div>
            <label htmlFor="password-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Mật khẩu:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, tối đa 72 bytes"
                required
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--tcv-slate-200)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="btn-secondary"
                style={{ padding: '0 14px', fontSize: '0.82rem' }}
                disabled={isSubmitting}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            {isSubmitting ? 'Đang xác thực trên máy chủ...' : 'Đăng nhập vào hệ thống'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--tcv-slate-200)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--tcv-slate-500)' }}>
          <div>* Cổng thông tin nội bộ bảo mật, không hỗ trợ đăng ký công khai.</div>
          <div style={{ marginTop: '6px', fontSize: '0.76rem', color: 'var(--tcv-slate-400)' }}>
            Cần tài khoản mới hoặc hỗ trợ đăng nhập? Liên hệ người quản lý.
          </div>
        </div>
      </div>
    </div>
  );
};
