import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, createStaffAccount, CreatedStaffData, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, DescriptionList, Field, EmptyState, LoadingState } from '../components/admin/AdminUI';

export const NewStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isVerifyingRole, setIsVerifyingRole] = useState<boolean>(true);

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  // Lets the admin verify the initial password before handing it over.
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [createdStaff, setCreatedStaff] = useState<CreatedStaffData | null>(null);
  // Field that failed client validation, so the error is shown next to it.
  const [invalidField, setInvalidField] = useState<'fullName' | 'email' | 'password' | 'phoneNumber' | null>(null);

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
    setInvalidField(null);

    const cleanEmail = email.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanFullName) {
      setErrorMessage('Họ tên không được để trống.'); setInvalidField('fullName');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Email không được để trống.'); setInvalidField('email');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu ban đầu phải có ít nhất 8 ký tự.'); setInvalidField('password');
      return;
    }

    const encoder = new TextEncoder();
    if (encoder.encode(password).length > 72) {
      setErrorMessage('Mật khẩu vượt quá 72 bytes UTF-8.'); setInvalidField('password');
      return;
    }

    if (cleanPhone) {
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        setErrorMessage('Số điện thoại phải có từ 8 đến 15 chữ số.'); setInvalidField('phoneNumber');
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
      setShowPassword(false);
      setPhoneNumber('');
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === 'EMAIL_EXISTS') {
          setErrorMessage('Email này đã được sử dụng cho một tài khoản khác trong hệ thống.'); setInvalidField('email');
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
    return <AdminPage width="narrow"><LoadingState label="Đang xác minh quyền quản trị viên..." /></AdminPage>;
  }

  // Nguoi dung khong phai ADMIN
  if (!isAdmin) {
    return (
      <AdminPage width="narrow">
        <Card>
          <EmptyState icon="lock" title="Truy cập bị từ chối (403 Forbidden)"
            action={<Link to="/internal/account" className="adm-btn adm-btn--primary">Quay về Trang tài khoản của bạn</Link>}>
            Chức năng tạo tài khoản nhân viên chỉ dành riêng cho Quản trị viên (ADMIN). Tài khoản hiện tại của bạn không có quyền thực hiện hành động này.
          </EmptyState>
        </Card>
      </AdminPage>
    );
  }

  const fieldError = (field: typeof invalidField) => invalidField === field ? errorMessage : undefined;
  return (
    <AdminPage width="narrow">
      <PageHeader eyebrow="Quản trị hệ thống" title="Tạo tài khoản nhân viên soát vé (STAFF)"
        description="Tài khoản mới sẽ có vai trò STAFF và trạng thái ACTIVE theo đúng quy định của máy chủ." />

      {createdStaff && (
        <Card title="Đã tạo thành công tài khoản nhân viên mới" actions={<Badge tone="success" dot>ACTIVE</Badge>}>
          <DescriptionList columns={1} items={[
            { label: 'Mã định danh User ID', value: `#${createdStaff.userId}`, mono: true },
            { label: 'Họ và tên', value: createdStaff.fullName },
            { label: 'Email công vụ', value: createdStaff.email },
            { label: 'Vai trò phân quyền', value: <Badge tone="brand">{createdStaff.role}</Badge> },
            { label: 'Trạng thái kích hoạt', value: <StatusBadge status={createdStaff.status} /> },
          ]} />
          <p className="adm-small adm-muted" style={{ marginBottom: 0 }}>Mật khẩu ban đầu đã được băm an toàn và lưu trữ trên cơ sở dữ liệu. Hệ thống không hiển thị lại mật khẩu và không tự động đăng nhập sang tài khoản nhân viên này.</p>
        </Card>
      )}

      {errorMessage && !invalidField && <Alert tone="danger" title={`Tạo tài khoản thất bại ${errorCode ? `[${errorCode}]` : ''}`}>{errorMessage}</Alert>}

      <Card>
        <form onSubmit={handleSubmit} className="adm-form" noValidate>
          <div className="adm-form-grid">
            <Field label="Họ và tên nhân viên" htmlFor="staff-name-input" required error={fieldError('fullName')} className="adm-field--full">
              <input id="staff-name-input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" required disabled={isSubmitting} autoComplete="name" aria-invalid={invalidField === 'fullName'} />
            </Field>
            <Field label="Email công vụ" htmlFor="staff-email-input" required error={fieldError('email')} className="adm-field--full">
              <input id="staff-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nhanvien.moi@thaocamvien.vn" required disabled={isSubmitting} autoComplete="off" aria-invalid={invalidField === 'email'} />
            </Field>
            <Field label="Mật khẩu ban đầu" htmlFor="staff-password-input" required error={fieldError('password')} hint="Ít nhất 8 ký tự, tối đa 72 bytes. Nhân viên dùng mật khẩu này để đăng nhập cổng nội bộ.">
              <div className="adm-input-group"><input id="staff-password-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 8 ký tự, tối đa 72 bytes" required disabled={isSubmitting} autoComplete="new-password" aria-invalid={invalidField === 'password'} /><button type="button" className="adm-btn adm-btn--secondary" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword} aria-controls="staff-password-input" disabled={isSubmitting}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
            </Field>
            <Field label="Số điện thoại" htmlFor="staff-phone-input" error={fieldError('phoneNumber')} hint="Tùy chọn · từ 8 đến 15 chữ số.">
              <input id="staff-phone-input" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0912345678" disabled={isSubmitting} autoComplete="off" aria-invalid={invalidField === 'phoneNumber'} />
            </Field>
          </div>
          <div className="adm-form-actions">
            <Link to="/internal/account" className="adm-btn adm-btn--secondary">Quay lại Hồ sơ quản trị</Link>
            <button type="submit" disabled={isSubmitting} className="adm-btn adm-btn--primary"><Icon name="users" />{isSubmitting ? 'Đang tạo trên máy chủ...' : 'Xác nhận tạo tài khoản'}</button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
};
