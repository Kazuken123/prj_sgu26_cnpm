import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateUUIDv4, getEmptyGuestSession, loadGuestSession, saveGuestSession, clearGuestSession } from '../src/api/guestStorage.ts';
import { ApiError, requestApi } from '../src/api/client.ts';
import { createOnlineCheckout, getSessionStatus, exchangeOnlineCode, getVisitMe } from '../src/api/payment.ts';

describe('Kiểm thử Quản lý Phiên và Storage (Sprint 1)', () => {
  test('Tạo UUID v4 hợp lệ theo chuẩn RFC 4122', () => {
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    const key1 = generateUUIDv4();
    const key2 = generateUUIDv4();

    assert.match(key1, uuidRegex, 'Khóa yêu cầu phải là UUID v4 hợp lệ');
    assert.match(key2, uuidRegex, 'Khóa yêu cầu phải là UUID v4 hợp lệ');
    assert.notEqual(key1, key2, 'Hai khóa tạo liên tiếp phải khác nhau');
  });

  test('Phiên rỗng ban đầu có phiên bản cấu trúc 1 và đầy đủ các trường rỗng', () => {
    const empty = getEmptyGuestSession('http://127.0.0.1:18080');
    assert.equal(empty.version, 1);
    assert.equal(empty.apiBaseUrl, 'http://127.0.0.1:18080');
    assert.equal(empty.sessionId, null);
    assert.equal(empty.token, null);
    assert.equal(empty.authCode, null);
    assert.equal(empty.paymentStatus, null);
    assert.equal(empty.sessionStatus, null);
  });

  test('Phát hiện không khớp API Base URL khi nạp phiên từ máy chủ khác', () => {
    const storageMap = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k)
      }
    };

    const sessionData = {
      version: 1,
      apiBaseUrl: 'http://127.0.0.1:3000',
      sessionId: 'test-session-123',
      token: 'tcv_visit_mock_token'
    };

    saveGuestSession(sessionData);

    const check = loadGuestSession('http://127.0.0.1:18080');
    assert.equal(check.mismatchedBaseUrl, true, 'Phải báo mismatchedBaseUrl khi base URL khác với cấu hình hiện tại');

    clearGuestSession();
    assert.equal(window.localStorage.getItem('tcv_guest_session_v1'), null);
  });
});

describe('Kiểm thử Phân loại Lỗi và Hợp đồng API (Sprint 1)', () => {
  test('ApiError giữ đúng mã trạng thái HTTP, mã code nghiệp vụ và thông báo lỗi', () => {
    const err = new ApiError({
      status: 409,
      code: 'ONLINE_PAYMENT_PENDING',
      message: 'Đang chờ xác nhận thanh toán; không tạo giao dịch mới.',
      data: { code: 'ONLINE_PAYMENT_PENDING' }
    });

    assert.equal(err.status, 409);
    assert.equal(err.code, 'ONLINE_PAYMENT_PENDING');
    assert.equal(err.message, 'Đang chờ xác nhận thanh toán; không tạo giao dịch mới.');
  });

  test('Phân biệt rõ lỗi mạng và timeout trong ApiError', () => {
    const netErr = new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối đến máy chủ.'
    });

    const timeoutErr = new ApiError({
      status: 0,
      code: 'TIMEOUT_ERROR',
      message: 'Hết thời gian chờ phản hồi (10 giây).'
    });

    assert.equal(netErr.code, 'NETWORK_ERROR');
    assert.equal(timeoutErr.code, 'TIMEOUT_ERROR');
    assert.notEqual(netErr.code, timeoutErr.code);
  });
});

describe('Kiểm thử Hợp đồng Gọi API Thanh toán (Sprint 1 Mock Fetch)', () => {
  const originalFetch = globalThis.fetch;

  test('Tạo checkout gửi đúng Idempotency-Key và body rỗng', async () => {
    let capturedUrl = '';
    let capturedOptions = {};

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedOptions = options;
      return new Response(JSON.stringify({
        data: {
          sessionId: 'session-uuid-1',
          paymentRef: 'TCV-ONLINE-001',
          paymentMethod: 'ONLINE',
          amount: '50000.00',
          currency: 'VND',
          sessionStatus: 'PENDING',
          paymentStatus: 'PENDING',
          provider: 'MOCK',
          paymentUrl: 'http://127.0.0.1:18080/api/payments/mock-checkout/TCV-ONLINE-001',
          authCode: 'mock_auth_code_hex_64_chars',
          codeExpiresAt: '2026-10-21T05:00:00.000Z'
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const idempotencyKey = generateUUIDv4();
    const result = await createOnlineCheckout(idempotencyKey, 'http://127.0.0.1:18080');

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/payments/online-checkout');
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['Idempotency-Key'], idempotencyKey);
    assert.equal(capturedOptions.body, '{}');
    assert.equal(result.sessionId, 'session-uuid-1');
    assert.equal(result.amount, '50000.00');
  });

  test('Tra cứu trạng thái phiên gọi đúng đường dẫn và trả về sessionStatus, paymentStatus', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          sessionId: 'session-uuid-1',
          sessionStatus: 'ACTIVE',
          paymentStatus: 'PAID'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await getSessionStatus('session-uuid-1', 'http://127.0.0.1:18080');
    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/payments/sessions/session-uuid-1');
    assert.equal(result.paymentStatus, 'PAID');
    assert.equal(result.sessionStatus, 'ACTIVE');
  });

  test('Đổi mã gửi authCode trong body và nhận token', async () => {
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedBody = options.body;
      return new Response(JSON.stringify({
        data: {
          sessionId: 'session-uuid-1',
          token: 'tcv_visit_mock_secret_token_12345',
          tokenType: 'Bearer',
          expiresAt: '2026-10-22T05:00:00.000Z'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await exchangeOnlineCode('session-uuid-1', 'auth_code_hex_64', 'http://127.0.0.1:18080');
    assert.equal(JSON.parse(capturedBody).authCode, 'auth_code_hex_64');
    assert.equal(result.token, 'tcv_visit_mock_secret_token_12345');
    assert.equal(result.tokenType, 'Bearer');
  });

  test('Xác minh phiên gửi Authorization Bearer token', async () => {
    let capturedAuth = '';

    globalThis.fetch = async (url, options) => {
      capturedAuth = options.headers['Authorization'];
      return new Response(JSON.stringify({
        data: {
          sessionId: 'session-uuid-1',
          status: 'ACTIVE',
          activatedAt: '2026-10-21T04:00:00.000Z',
          expiresAt: '2026-10-22T04:00:00.000Z',
          durationHours: 24
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await getVisitMe('tcv_visit_mock_secret_token_12345', 'http://127.0.0.1:18080');
    assert.equal(capturedAuth, 'Bearer tcv_visit_mock_secret_token_12345');
    assert.equal(result.status, 'ACTIVE');
    assert.equal(result.durationHours, 24);
  });

  test('Xử lý đúng lỗi 409 khi phiên đã cấp token trước đó', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'VISIT_TOKEN_ALREADY_ISSUED',
        error: 'Phiên đã cấp token. Nếu chưa nhận được token, hãy liên hệ nhân viên; không thanh toán lại.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      exchangeOnlineCode('session-uuid-1', 'auth_code_hex_64', 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'VISIT_TOKEN_ALREADY_ISSUED');
        return true;
      }
    );
  });

  test('Xử lý đúng lỗi 429 khi tra cứu vượt giới hạn', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'LOOKUP_RATE_LIMITED',
        error: 'Tra cứu quá nhiều lần; vui lòng thử lại sau.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      getSessionStatus('session-uuid-1', 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 429);
        assert.equal(err.code, 'LOOKUP_RATE_LIMITED');
        return true;
      }
    );
  });

  // Restore fetch
  test.after(() => {
    globalThis.fetch = originalFetch;
  });
});
