import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginInternal,
  getAuthMe,
  refreshInternal,
  logoutInternal,
  createStaffAccount
} from '../src/api/auth.ts';
import {
  loadInternalSession,
  saveInternalSession,
  clearInternalSession
} from '../src/api/authStorage.ts';
import {
  loadGuestSession,
  saveGuestSession
} from '../src/api/guestStorage.ts';
import { ApiError } from '../src/api/client.ts';

describe('Kiểm thử Xác thực Nội bộ STAFF / ADMIN (Sprint 4)', () => {
  const originalFetch = globalThis.fetch;

  test('loginInternal gửi đúng định dạng và nhận user, accessToken, refreshToken', async () => {
    let capturedUrl = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = options?.body || '';
      return new Response(JSON.stringify({
        message: 'Đăng nhập thành công!',
        data: {
          user: {
            id: 1,
            email: 'admin@thaocamvien.vn',
            fullName: 'Quản trị viên Thảo Cầm Viên',
            role: 'ADMIN',
            status: 'ACTIVE'
          },
          accessToken: 'jwt_mock_access_token_admin',
          refreshToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await loginInternal(
      { email: 'admin@thaocamvien.vn', password: 'Password123@' },
      'http://127.0.0.1:18080'
    );

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/auth/login');
    assert.equal(JSON.parse(capturedBody).email, 'admin@thaocamvien.vn');
    assert.equal(result.user.role, 'ADMIN');
    assert.equal(result.accessToken, 'jwt_mock_access_token_admin');
    assert.equal(result.refreshToken.length, 64);
  });

  test('Xử lý đúng lỗi 401 INVALID_CREDENTIALS khi sai thông tin đăng nhập', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không đúng.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      loginInternal({ email: 'admin@thaocamvien.vn', password: 'WrongPassword' }, 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'INVALID_CREDENTIALS');
        return true;
      }
    );
  });

  test('Xử lý đúng lỗi 423 LOGIN_TEMPORARILY_LOCKED khi nhập sai quá 5 lần', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'LOGIN_TEMPORARILY_LOCKED',
        error: 'Nhập sai 5 lần. Tài khoản đã bị khóa 15 phút!'
      }), {
        status: 423,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      loginInternal({ email: 'locked@thaocamvien.vn', password: 'WrongPassword' }, 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 423);
        assert.equal(err.code, 'LOGIN_TEMPORARILY_LOCKED');
        return true;
      }
    );
  });

  test('getAuthMe gửi Bearer token và nhận dữ liệu danh tính người dùng', async () => {
    let capturedAuth = '';

    globalThis.fetch = async (url, options) => {
      capturedAuth = options?.headers?.['Authorization'] || '';
      return new Response(JSON.stringify({
        data: {
          id: 2,
          email: 'staff@thaocamvien.vn',
          fullName: 'Nhân viên Soát vé 01',
          role: 'STAFF',
          status: 'ACTIVE'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const user = await getAuthMe('jwt_mock_staff_token', 'http://127.0.0.1:18080');
    assert.equal(capturedAuth, 'Bearer jwt_mock_staff_token');
    assert.equal(user.role, 'STAFF');
    assert.equal(user.id, 2);
  });

  test('refreshInternal gửi refreshToken và nhận bộ token mới xoay vòng', async () => {
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedBody = options?.body || '';
      return new Response(JSON.stringify({
        message: 'Làm mới phiên thành công!',
        data: {
          user: {
            id: 1,
            email: 'admin@thaocamvien.vn',
            fullName: 'Quản trị viên',
            role: 'ADMIN',
            status: 'ACTIVE'
          },
          accessToken: 'jwt_mock_new_access_token',
          refreshToken: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const refreshed = await refreshInternal('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'http://127.0.0.1:18080');
    assert.equal(JSON.parse(capturedBody).refreshToken, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    assert.equal(refreshed.accessToken, 'jwt_mock_new_access_token');
    assert.notEqual(refreshed.refreshToken, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
  });

  test('logoutInternal nhận HTTP 204 No Content và hoàn tất thành công', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(null, {
        status: 204
      });
    };

    await logoutInternal(
      { accessToken: 'jwt_token', refreshToken: '64_hex_refresh' },
      'http://127.0.0.1:18080'
    );

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/auth/logout');
  });

  test('ADMIN tạo STAFF thành công qua POST /api/admin/staff', async () => {
    let capturedUrl = '';
    let capturedAuth = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedAuth = options?.headers?.['Authorization'] || '';
      capturedBody = options?.body || '';
      return new Response(JSON.stringify({
        message: 'Đã tạo tài khoản nhân viên.',
        data: {
          userId: 10,
          email: 'nhanvien.moi@thaocamvien.vn',
          fullName: 'Lê Văn B',
          role: 'STAFF',
          status: 'ACTIVE'
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const newStaff = await createStaffAccount(
      'jwt_admin_token',
      {
        email: 'nhanvien.moi@thaocamvien.vn',
        password: 'Password123@',
        fullName: 'Lê Văn B',
        phoneNumber: '0987654321'
      },
      'http://127.0.0.1:18080'
    );

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/admin/staff');
    assert.equal(capturedAuth, 'Bearer jwt_admin_token');
    assert.equal(newStaff.role, 'STAFF');
    assert.equal(newStaff.userId, 10);
    assert.equal(JSON.parse(capturedBody).email, 'nhanvien.moi@thaocamvien.vn');
  });

  test('Từ chối khi token STAFF gọi API tạo STAFF với mã 403 FORBIDDEN', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'FORBIDDEN',
        error: 'Bạn không có quyền thực hiện hành động này.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      createStaffAccount('jwt_staff_token', {
        email: 'test@thaocamvien.vn',
        password: 'Password123@',
        fullName: 'Test'
      }, 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );
  });

  test('Tách biệt hoàn toàn phiên khách và phiên nội bộ trong storage', () => {
    const storageMap = new Map();
    globalThis.window = {
      sessionStorage: {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k)
      }
    };

    // 1. Luu phien khach
    saveGuestSession({
      version: 1,
      apiBaseUrl: 'http://127.0.0.1:18080',
      sessionId: 'guest-session-1',
      token: 'tcv_visit_guest_token_123'
    });

    // 2. Luu phien noi bo
    saveInternalSession({
      version: 1,
      apiBaseUrl: 'http://127.0.0.1:18080',
      user: { id: 1, email: 'admin@thaocamvien.vn', fullName: 'Admin', role: 'ADMIN', status: 'ACTIVE' },
      accessToken: 'jwt_admin_token_456',
      refreshToken: 'refresh_token_789'
    });

    // Kiem tra ca hai phien deu ton tai song song
    const guest = loadGuestSession('http://127.0.0.1:18080').session;
    const internal = loadInternalSession('http://127.0.0.1:18080').session;

    assert.equal(guest.token, 'tcv_visit_guest_token_123');
    assert.equal(internal.accessToken, 'jwt_admin_token_456');

    // 3. Dang xuat noi bo (clearInternalSession)
    clearInternalSession();

    // Phien noi bo da xoa, phien khach van nguyen ven
    const internalAfterLogout = loadInternalSession('http://127.0.0.1:18080').session;
    const guestAfterLogout = loadGuestSession('http://127.0.0.1:18080').session;

    assert.equal(internalAfterLogout.accessToken, null);
    assert.equal(guestAfterLogout.token, 'tcv_visit_guest_token_123');
  });

  test.after(() => {
    globalThis.fetch = originalFetch;
  });
});
