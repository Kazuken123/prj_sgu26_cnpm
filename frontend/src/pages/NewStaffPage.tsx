import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, createStaffAccount, CreatedStaffData, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';

export const NewStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isVerifyingRole, setIsVerifyingRole] = useState<boolean>(true);

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [createdStaff, setCreatedStaff] = useState<CreatedStaffData | null>(null);

  // Kiem tra quyen ADMIN
  const verifyAdminRole = useCallback(async () => {
    setIsVerifyingRole(true);

    try {
      const user = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getAuthMe(token, currentBaseUrl),
        () => {
          navigate('/internal/login', { replace: true });
        }
      );

      if (user.role === 'ADMIN') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsVerifyingRole(false);
    } catch {
      setIsAdmin(false);
      setIsVerifyingRole(false);
      clearInternalSession();
      navigate('/internal/login', { replace: true });
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    verifyAdminRole();
  }, [verifyAdminRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setCreatedStaff(null);

    const cleanEmail = email.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanFullName) {
      setErrorMessage('Họ tên không được để trống.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Email không được để trống.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu ban đầu phải có ít nhất 8 ký tự.');
      return;
    }

    const encoder = new TextEncoder();
    if (encoder.encode(password).length > 72) {
      setErrorMessage('Mật khẩu vượt quá 72 bytes UTF-8.');
      return;
    }

    if (cleanPhone) {
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        setErrorMessage('Số điện thoại phải có từ 8 đến 15 chữ số.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (accessToken) =>
          createStaffAccount(
            accessToken,
            {
              email: cleanEmail,
              password,
              fullName: cleanFullName,
              phoneNumber: cleanPhone || undefined
            },
            currentBaseUrl
          ),
        () => {
          navigate('/internal/login', { replace: true });
        }
      );

      setIsSubmitting(false);
      setCreatedStaff(result);
      // Xoa form sau khi tao thanh cong
      setFullName('');
      setEmail('');
      setPassword('');
      setPhoneNumber('');
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'EMAIL_EXISTS') {
          setErrorMessage('Email này đã được sử dụng cho một tài khoản khác trong hệ thống.');
        } else if (err.code === 'FORBIDDEN') {
          setErrorMessage('Bạn không có quyền thực hiện hành động này.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Mất kết nối mạng khi tạo nhân viên. Không thể xác nhận kết quả.');
      }
    }
  };

  if (isVerifyingRole) {
    return (
      <div className="new-staff-container">
        <div className="tcv-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '1rem', color: 'var(--tcv-green-800)', fontWeight: 600 }}>
            Đang xác minh quyền quản trị viên...
          </div>
        </div>
      </div>
    );
  }

  // Nguoi dung khong phai ADMIN
  if (!isAdmin) {
    return (
      <div className="new-staff-container">
        <div className="tcv-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="banner-notice" style={{ background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px' }}>
            <div style={{ fontSize: '1.4rem' }}>⛔</div>
            <div>
              <div className="banner-title">Truy cập bị từ chối (403 Forbidden)</div>
              <div className="banner-desc">
                Chức năng tạo tài khoản nhân viên chỉ dành riêng cho Quản trị viên (ADMIN). Tài khoản hiện tại của bạn không có quyền thực hiện hành động này.
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/internal/account" className="btn-primary">
              Quay về Trang tài khoản của bạn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-staff-container">
      <div className="tcv-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ borderBottom: '1px solid var(--tcv-slate-200)', paddingBottom: '16px', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tcv-green-700)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Phân hệ Quản trị viên
          </span>
          <h1 className="hero-title" style={{ fontSize: '1.7rem', margin: '4px 0 0' }}>
            Tạo Tài khoản Nhân viên Soát vé (STAFF)
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--tcv-slate-600)', marginTop: '4px' }}>
            Tài khoản mới sẽ có vai trò STAFF và trạng thái ACTIVE theo đúng quy định của máy chủ.
          </p>
        </div>

        {createdStaff && (
          <div style={{ background: 'var(--tcv-green-50)', border: '1px solid var(--tcv-green-500)', borderRadius: 'var(--radius-sm)', padding: '18px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <strong style={{ color: 'var(--tcv-green-900)', fontSize: '0.98rem' }}>
                Đã tạo thành công tài khoản nhân viên mới
              </strong>
            </div>

            <table className="status-detail-table" style={{ background: '#ffffff', borderRadius: 'var(--radius-sm)' }}>
              <tbody>
                <tr>
                  <th>Mã định danh User ID</th>
                  <td>#{createdStaff.userId}</td>
                </tr>
                <tr>
                  <th>Họ và tên</th>
                  <td>{createdStaff.fullName}</td>
                </tr>
                <tr>
                  <th>Email công vụ</th>
                  <td>{createdStaff.email}</td>
                </tr>
                <tr>
                  <th>Vai trò phân quyền</th>
                  <td>{createdStaff.role}</td>
                </tr>
                <tr>
                  <th>Trạng thái kích hoạt</th>
                  <td>{createdStaff.status}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--tcv-slate-600)' }}>
              * Mật khẩu ban đầu đã được băm an toàn và lưu trữ trên cơ sở dữ liệu. Hệ thống không hiển thị lại mật khẩu và không tự động đăng nhập sang tài khoản nhân viên này.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="banner-notice" style={{ background: 'var(--tcv-status-err-bg)', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px' }}>
            <div style={{ fontSize: '1.2rem' }}>⛔</div>
            <div>
              <div className="banner-title">
                Tạo tài khoản thất bại {errorCode ? `[${errorCode}]` : ''}
              </div>
              <div className="banner-desc">{errorMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="staff-name-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Họ và tên nhân viên:
            </label>
            <input
              id="staff-name-input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
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
            <label htmlFor="staff-email-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Email công vụ:
            </label>
            <input
              id="staff-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhanvien.moi@thaocamvien.vn"
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
            <label htmlFor="staff-password-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Mật khẩu ban đầu:
            </label>
            <input
              id="staff-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 8 ký tự, tối đa 72 bytes"
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
            <span style={{ fontSize: '0.76rem', color: 'var(--tcv-slate-500)', marginTop: '4px', display: 'block' }}>
              * Nhân viên sẽ dùng mật khẩu này để đăng nhập vào cổng nội bộ.
            </span>
          </div>

          <div>
            <label htmlFor="staff-phone-input" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'var(--tcv-slate-700)', marginBottom: '6px' }}>
              Số điện thoại (tùy chọn):
            </label>
            <input
              id="staff-phone-input"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912345678 (từ 8 đến 15 số)"
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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Đang tạo trên máy chủ...' : 'Xác nhận tạo tài khoản'}
            </button>

            <Link to="/internal/account" className="btn-secondary">
              Quay lại Hồ sơ quản trị
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
