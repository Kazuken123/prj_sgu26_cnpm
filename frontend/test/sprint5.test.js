import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCashPayment,
  lookupCashSession,
  confirmCashPayment,
  issueCashCode,
  exchangeCashCode
} from '../src/api/cash.ts';
import {
  loadInternalSession,
  saveInternalSession,
  clearInternalSession
} from '../src/api/authStorage.ts';
import {
  loadGuestSession,
  saveGuestSession,
  clearGuestSession,
  generateUUIDv4
} from '../src/api/guestStorage.ts';
import { getContentBundle } from '../src/api/content.ts';
import { exchangeOnlineCode } from '../src/api/payment.ts';
import { ApiError } from '../src/api/client.ts';

describe('Kiểm thử Quy trình Thanh toán Tiền mặt CASH (Sprint 5)', () => {
  const originalFetch = globalThis.fetch;
  const baseUrl = 'http://127.0.0.1:18080';
  const staffToken = 'jwt_staff_token_valid';
  const dummySessionId = 'e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';

  test('1. Nhân viên STAFF tạo phiên CASH thành công qua POST /api/admin/payments', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedHeaders = {};
    let capturedBody = '';

    const idempotencyKey = generateUUIDv4();

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || 'GET';
      capturedHeaders = options?.headers || {};
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          sessionId: dummySessionId,
          paymentRef: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d',
          paymentMethod: 'CASH',
          amount: '50000.00',
          currency: 'VND',
          sessionStatus: 'PENDING',
          paymentStatus: 'PENDING'
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await createCashPayment(staffToken, idempotencyKey, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/payments`);
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedHeaders['Authorization'], `Bearer ${staffToken}`);
    assert.equal(capturedHeaders['Idempotency-Key'], idempotencyKey);
    assert.deepEqual(JSON.parse(capturedBody), { paymentMethod: 'CASH' });

    assert.equal(result.sessionId, dummySessionId);
    assert.equal(result.paymentMethod, 'CASH');
    assert.equal(result.amount, '50000.00');
    assert.equal(result.currency, 'VND');
    assert.equal(result.sessionStatus, 'PENDING');
    assert.equal(result.paymentStatus, 'PENDING');

    globalThis.fetch = originalFetch;
  });

  test('2. Nhân viên STAFF tra cứu phiên CASH qua GET /api/admin/payments/sessions/:sessionId', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedHeaders = options?.headers || {};

      return new Response(JSON.stringify({
        data: {
          sessionId: dummySessionId,
          paymentRef: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d',
          paymentMethod: 'CASH',
          amount: '50000.00',
          currency: 'VND',
          sessionStatus: 'PENDING',
          paymentStatus: 'PENDING'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await lookupCashSession(staffToken, dummySessionId, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/payments/sessions/${dummySessionId}`);
    assert.equal(capturedHeaders['Authorization'], `Bearer ${staffToken}`);
    assert.equal(result.sessionId, dummySessionId);
    assert.equal(result.paymentMethod, 'CASH');
    assert.equal(result.amount, '50000.00');

    globalThis.fetch = originalFetch;
  });

  test('3. Nhân viên STAFF xác nhận đã nhận tiền mặt qua POST /api/admin/payments/sessions/:sessionId/confirm-cash', async () => {
    let capturedUrl = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          sessionId: dummySessionId,
          paymentRef: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d',
          paymentMethod: 'CASH',
          amount: '50000.00',
          currency: 'VND',
          sessionStatus: 'ACTIVE',
          paymentStatus: 'PAID',
          paidAt: '2026-10-21T03:00:00.000Z',
          activatedAt: '2026-10-21T03:00:00.000Z',
          expiresAt: '2026-10-22T03:00:00.000Z',
          alreadyConfirmed: false
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await confirmCashPayment(staffToken, dummySessionId, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/payments/sessions/${dummySessionId}/confirm-cash`);
    assert.deepEqual(JSON.parse(capturedBody), {});
    assert.equal(result.paymentStatus, 'PAID');
    assert.equal(result.sessionStatus, 'ACTIVE');
    assert.equal(result.alreadyConfirmed, false);
    assert.ok(result.paidAt);
    assert.ok(result.expiresAt);

    globalThis.fetch = originalFetch;
  });

  test('4. Nhân viên STAFF cấp mã ngắn qua POST /api/admin/payments/sessions/:sessionId/cash-code', async () => {
    let capturedUrl = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          sessionId: dummySessionId,
          shortedCode: '012345',
          codeExpiresAt: '2026-10-21T03:10:00.000Z',
          visitExpiresAt: '2026-10-22T03:00:00.000Z',
          reused: false
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await issueCashCode(staffToken, dummySessionId, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/payments/sessions/${dummySessionId}/cash-code`);
    assert.deepEqual(JSON.parse(capturedBody), {});
    assert.equal(result.shortedCode, '012345');
    assert.equal(typeof result.shortedCode, 'string');
    assert.equal(result.shortedCode.length, 6);
    assert.equal(result.reused, false);
    assert.ok(result.codeExpiresAt);

    globalThis.fetch = originalFetch;
  });

  test('5. Khách đổi mã ngắn lấy token qua POST /api/payments/sessions/:sessionId/exchange-cash-code (không gửi token nội bộ)', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};
    let capturedBody = '';

    const issuedVisitorToken = 'tcv_visit_' + 'a'.repeat(64);

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedHeaders = options?.headers || {};
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          sessionId: dummySessionId,
          token: issuedVisitorToken,
          tokenType: 'Bearer',
          expiresAt: '2026-10-22T03:00:00.000Z'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await exchangeCashCode(dummySessionId, '012345', baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/payments/sessions/${dummySessionId}/exchange-cash-code`);
    assert.equal(capturedHeaders['Authorization'], undefined);
    assert.deepEqual(JSON.parse(capturedBody), { shortedCode: '012345' });
    assert.equal(result.token, issuedVisitorToken);
    assert.equal(result.tokenType, 'Bearer');

    globalThis.fetch = originalFetch;
  });

  test('6. Tích hợp: Dùng token khách từ đổi mã tiền mặt để gọi Bundle API thành công', async () => {
    const visitorToken = 'tcv_visit_' + 'b'.repeat(64);
    let capturedAuth = '';

    globalThis.fetch = async (url, options) => {
      const headers = options?.headers || {};
      capturedAuth = headers['Authorization'] || '';

      return new Response(JSON.stringify({
        data: {
          requestedLanguage: 'vi',
          pois: [
            {
              id: 'poi-giraffe',
              code: 'GIRAFFE',
              title: 'Hươu cao cổ',
              content: 'Nội dung thuyết minh hươu cao cổ'
            }
          ]
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const bundle = await getContentBundle('vi', visitorToken, undefined, baseUrl);
    assert.equal(capturedAuth, `Bearer ${visitorToken}`);
    assert.equal(bundle.requestedLanguage, 'vi');
    assert.equal(bundle.pois.length, 1);
    assert.equal(bundle.pois[0].code, 'GIRAFFE');

    globalThis.fetch = originalFetch;
  });

  test('7. Ca âm tính 1: Đổi mã ngắn sai hoặc hết hạn nhận lỗi 401 CASH_CODE_INVALID_OR_EXPIRED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'CASH_CODE_INVALID_OR_EXPIRED',
        error: 'Mã không hợp lệ hoặc đã hết hạn.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await exchangeCashCode(dummySessionId, '999999', baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'CASH_CODE_INVALID_OR_EXPIRED');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('8. Ca âm tính 2: Đổi mã lần thứ hai trên cùng phiên nhận lỗi 409 VISIT_TOKEN_ALREADY_ISSUED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'VISIT_TOKEN_ALREADY_ISSUED',
        error: 'Phiên đã được cấp token. Không thanh toán lại.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await exchangeCashCode(dummySessionId, '012345', baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'VISIT_TOKEN_ALREADY_ISSUED');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('9. Ca âm tính 3: Gửi mã ngắn 6 số vào endpoint đổi mã Online exchange-online-code bị từ chối 400', async () => {
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(String(options?.body || '{}'));
      if (typeof body.authCode !== 'string' || body.authCode.length !== 64) {
        return new Response(JSON.stringify({
          code: 'INVALID_EXCHANGE_INPUT',
          error: 'Chỉ gửi authCode dạng chuỗi 64 ký tự hex.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response('{}', { status: 200 });
    };

    await assert.rejects(
      async () => {
        // Gửi mã ngắn 6 số vào API đổi mã online thay vì 64 hex
        await exchangeOnlineCode(dummySessionId, '012345', baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_EXCHANGE_INPUT');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('10. Ca âm tính 4: Tra cứu phiên ONLINE bằng API tiền mặt trả 409 CASH_PAYMENT_REQUIRED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'CASH_PAYMENT_REQUIRED',
        error: 'Phiên này không sử dụng thanh toán tiền mặt.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await lookupCashSession(staffToken, dummySessionId, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'CASH_PAYMENT_REQUIRED');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('11. Kiểm tra tính độc lập giữa phiên khách và phiên nội bộ trong storage', () => {
    const storageMap = new Map();
    globalThis.window = {
      sessionStorage: {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k)
      }
    };

    // 1. Luu phien noi bo
    saveInternalSession({
      version: 1,
      apiBaseUrl: baseUrl,
      user: {
        id: 1,
        email: 'staff@thaocamvien.vn',
        fullName: 'Nhân viên soát vé',
        role: 'STAFF',
        status: 'ACTIVE'
      },
      accessToken: 'staff_jwt_token',
      refreshToken: 'staff_refresh_token',
      tokenType: 'Bearer',
      expiresAt: '2026-10-21T04:00:00.000Z'
    });

    // 2. Luu phien khach
    const guestVisitorToken = 'tcv_visit_' + 'c'.repeat(64);
    saveGuestSession({
      version: 1,
      apiBaseUrl: baseUrl,
      idempotencyKey: null,
      sessionId: dummySessionId,
      paymentRef: null,
      amount: '50000.00',
      currency: 'VND',
      paymentUrl: null,
      authCode: null,
      codeExpiresAt: null,
      paymentStatus: 'PAID',
      sessionStatus: 'ACTIVE',
      token: guestVisitorToken,
      tokenType: 'Bearer',
      expiresAt: '2026-10-22T03:00:00.000Z',
      verifiedVisit: null
    });

    // Kiem tra ca hai phien deu ton tai song song
    const guestBefore = loadGuestSession(baseUrl).session;
    const internalBefore = loadInternalSession(baseUrl).session;
    assert.equal(guestBefore.sessionId, dummySessionId);
    assert.equal(guestBefore.token, guestVisitorToken);
    assert.equal(internalBefore.accessToken, 'staff_jwt_token');

    // 3. Xoa phien noi bo (STAFF logout)
    clearInternalSession();

    // 4. Kiem tra phien noi bo da bi xoa
    const internalAfterLogout = loadInternalSession(baseUrl).session;
    assert.equal(internalAfterLogout.accessToken, null);
    assert.equal(internalAfterLogout.user, null);

    // 5. Kiem tra phien khach van con nguyen ven, khong bi anh huong
    const guestAfterLogout = loadGuestSession(baseUrl).session;
    assert.equal(guestAfterLogout.sessionId, dummySessionId);
    assert.equal(guestAfterLogout.token, guestVisitorToken);
    assert.equal(guestAfterLogout.sessionStatus, 'ACTIVE');

    // 6. Xoa phien khach
    clearGuestSession();
    const guestAfterClear = loadGuestSession(baseUrl).session;
    assert.equal(guestAfterClear.token, null);
    assert.equal(guestAfterClear.sessionId, null);
  });
});
