import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOnlineCheckout,
  getSessionStatus,
  exchangeOnlineCode,
  getVisitMe
} from '../src/api/payment.ts';
import {
  createCashPayment,
  lookupCashSession,
  confirmCashPayment,
  issueCashCode,
  exchangeCashCode
} from '../src/api/cash.ts';
import {
  loginInternal,
  getAuthMe,
  refreshInternal,
  logoutInternal,
  createStaffAccount
} from '../src/api/auth.ts';
import {
  getPois,
  getPoiDetail,
  createPoi,
  updatePoi,
  deactivatePoi
} from '../src/api/poi.ts';
import {
  getContentJobs,
  retryContentJob
} from '../src/api/contentJob.ts';
import { getContentBundle } from '../src/api/content.ts';
import { fetchAudioBlob } from '../src/api/media.ts';
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
import { ApiError } from '../src/api/client.ts';

describe('Nghiệm thu Tích hợp Frontend Xuyên suốt (Sprint 7)', () => {
  const originalFetch = globalThis.fetch;
  const baseUrl = 'http://127.0.0.1:18080';

  test('Vòng 1: Luồng khách ONLINE xuyên suốt từ checkout đến phát âm thanh', async () => {
    const idempotencyKey = generateUUIDv4();
    const sessionId = '11111111-2222-4333-8444-555555555555';
    const authCode = 'c'.repeat(64);
    const visitorToken = 'tcv_visit_' + 'd'.repeat(64);

    let stage = 1;

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/payments/online-checkout')) {
        return new Response(JSON.stringify({
          data: {
            sessionId,
            paymentRef: 'ref-online-1',
            paymentMethod: 'ONLINE',
            amount: '50000.00',
            currency: 'VND',
            sessionStatus: 'PENDING',
            paymentStatus: 'PENDING',
            provider: 'MOCK',
            paymentUrl: 'http://127.0.0.1:18080/api/payments/mock-checkout/ref-online-1',
            authCode,
            codeExpiresAt: '2026-10-21T18:00:00.000Z'
          }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes(`/api/payments/sessions/${sessionId}`) && !urlStr.includes('exchange')) {
        return new Response(JSON.stringify({
          data: {
            sessionId,
            sessionStatus: stage >= 2 ? 'ACTIVE' : 'PENDING',
            paymentStatus: stage >= 2 ? 'PAID' : 'PENDING'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('exchange-online-code')) {
        return new Response(JSON.stringify({
          data: {
            sessionId,
            token: visitorToken,
            tokenType: 'Bearer',
            expiresAt: '2026-10-22T17:00:00.000Z'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/visits/me')) {
        return new Response(JSON.stringify({
          data: {
            sessionId,
            status: 'ACTIVE',
            expiresAt: '2026-10-22T17:00:00.000Z'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/content/bundle')) {
        return new Response(JSON.stringify({
          data: {
            requestedLanguageCode: 'vi',
            pois: [
              {
                poiId: 1,
                code: 'GIRAFFE',
                originalName: 'Hươu cao cổ',
                category: 'ANIMAL',
                displayOrder: 1,
                text: { status: 'READY', name: 'Hươu cao cổ', description: 'Mô tả', audioScript: 'Kịch bản' },
                audio: { status: 'AVAILABLE', url: '/api/media/audio/mock-giraffe.wav', duration: 1 }
              }
            ],
            tours: []
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/media/audio/')) {
        return new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          status: 200,
          headers: { 'Content-Type': 'audio/wav' }
        });
      }

      return new Response('{}', { status: 200 });
    };

    // 1. Tao checkout
    const checkout = await createOnlineCheckout(idempotencyKey, baseUrl);
    assert.equal(checkout.sessionId, sessionId);
    assert.equal(checkout.paymentStatus, 'PENDING');

    // 2. Kiem tra trang thai PENDING truoc khi thanh toan
    const pendingStatus = await getSessionStatus(sessionId, baseUrl);
    assert.equal(pendingStatus.paymentStatus, 'PENDING');

    // 3. Gia lap operator gui thanh toan thanh cong
    stage = 2;
    const paidStatus = await getSessionStatus(sessionId, baseUrl);
    assert.equal(paidStatus.paymentStatus, 'PAID');
    assert.equal(paidStatus.sessionStatus, 'ACTIVE');

    // 4. Doi ma lay token khach
    const exchanged = await exchangeOnlineCode(sessionId, authCode, baseUrl);
    assert.equal(exchanged.token, visitorToken);

    // 5. Xac minh phien
    const visitMe = await getVisitMe(visitorToken, baseUrl);
    assert.equal(visitMe.status, 'ACTIVE');

    // 6. Tai bundle
    const bundle = await getContentBundle('vi', visitorToken, undefined, baseUrl);
    assert.equal(bundle.pois.length, 1);
    assert.equal(bundle.pois[0].audio.status, 'AVAILABLE');

    // 7. Tai audio co xac thuc
    const blob = await fetchAudioBlob({
      audioUrl: bundle.pois[0].audio.url,
      token: visitorToken,
      overrideBaseUrl: baseUrl
    });
    assert.ok(blob);
    assert.equal(blob.type, 'audio/wav');

    globalThis.fetch = originalFetch;
  });

  test('Vòng 2: Luồng CASH và quản trị nội bộ nhân viên', async () => {
    const cashSessionId = '22222222-3333-4444-8555-666666666666';
    const staffToken = 'jwt_staff_token';
    const adminToken = 'jwt_admin_token';
    const guestCashToken = 'tcv_visit_' + 'e'.repeat(64);

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      const headers = options?.headers || {};

      if (urlStr.includes('/api/auth/login')) {
        const body = JSON.parse(String(options?.body || '{}'));
        return new Response(JSON.stringify({
          data: {
            user: { id: 1, email: body.email, role: body.email.includes('admin') ? 'ADMIN' : 'STAFF', status: 'ACTIVE' },
            accessToken: body.email.includes('admin') ? adminToken : staffToken,
            refreshToken: 'r'.repeat(64)
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/admin/payments') && !urlStr.includes('confirm') && !urlStr.includes('cash-code') && !urlStr.includes('sessions/')) {
        return new Response(JSON.stringify({
          data: {
            sessionId: cashSessionId,
            paymentRef: 'ref-cash-1',
            paymentMethod: 'CASH',
            amount: '50000.00',
            currency: 'VND',
            sessionStatus: 'PENDING',
            paymentStatus: 'PENDING'
          }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes(`/api/admin/payments/sessions/${cashSessionId}/confirm-cash`)) {
        return new Response(JSON.stringify({
          data: {
            sessionId: cashSessionId,
            paymentStatus: 'PAID',
            sessionStatus: 'ACTIVE',
            paidAt: '2026-10-21T09:00:00.000Z',
            expiresAt: '2026-10-22T09:00:00.000Z',
            alreadyConfirmed: false
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes(`/api/admin/payments/sessions/${cashSessionId}/cash-code`)) {
        return new Response(JSON.stringify({
          data: {
            sessionId: cashSessionId,
            shortedCode: '048291',
            codeExpiresAt: '2026-10-21T09:10:00.000Z',
            visitExpiresAt: '2026-10-22T09:00:00.000Z',
            reused: false
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('exchange-cash-code')) {
        return new Response(JSON.stringify({
          data: {
            sessionId: cashSessionId,
            token: guestCashToken,
            tokenType: 'Bearer',
            expiresAt: '2026-10-22T09:00:00.000Z'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/admin/staff')) {
        if (headers['Authorization'] !== `Bearer ${adminToken}`) {
          return new Response(JSON.stringify({ code: 'FORBIDDEN', error: 'Không có quyền' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          data: { userId: 5, email: 'newstaff@thaocamvien.vn', role: 'STAFF', status: 'ACTIVE' }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('{}', { status: 200 });
    };

    // 1. STAFF login
    const staffLogin = await loginInternal({ email: 'staff@thaocamvien.vn', password: 'Password123@' }, baseUrl);
    assert.equal(staffLogin.user.role, 'STAFF');

    // 2. Tao phien CASH
    const cash = await createCashPayment(staffToken, generateUUIDv4(), baseUrl);
    assert.equal(cash.paymentMethod, 'CASH');

    // 3. Xac nhan nhan tien
    const confirmed = await confirmCashPayment(staffToken, cashSessionId, baseUrl);
    assert.equal(confirmed.paymentStatus, 'PAID');

    // 4. Cap ma ngan (bao toan so 0 o dau)
    const code = await issueCashCode(staffToken, cashSessionId, baseUrl);
    assert.equal(code.shortedCode, '048291');
    assert.equal(typeof code.shortedCode, 'string');

    // 5. Khach doi ma lay token (khong gui token STAFF)
    const guestExchanged = await exchangeCashCode(cashSessionId, '048291', baseUrl);
    assert.equal(guestExchanged.token, guestCashToken);

    // 6. ADMIN login va tao STAFF moi
    const adminLogin = await loginInternal({ email: 'admin@thaocamvien.vn', password: 'Password123@' }, baseUrl);
    assert.equal(adminLogin.user.role, 'ADMIN');

    const createdStaff = await createStaffAccount(adminToken, {
      email: 'newstaff@thaocamvien.vn',
      fullName: 'Nhân viên mới',
      password: 'Password123@'
    }, baseUrl);
    assert.equal(createdStaff.role, 'STAFF');

    // 7. STAFF khong duoc phep tao STAFF
    await assert.rejects(
      async () => {
        await createStaffAccount(staffToken, {
          email: 'hack@thaocamvien.vn',
          fullName: 'Hack',
          password: 'Password123@'
        }, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('Vòng 3: Quản lý POI thử nghiệm và xử lý tác vụ nội dung', async () => {
    const staffToken = 'jwt_staff_token';
    let currentPoiVersion = 1;

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      const method = options?.method || 'GET';

      if (urlStr.includes('/api/admin/pois') && method === 'POST') {
        const body = JSON.parse(String(options?.body || '{}'));
        currentPoiVersion = 1;
        return new Response(JSON.stringify({
          data: {
            poiId: 101,
            name: body.name,
            category: body.category,
            status: 'INACTIVE',
            contentVersion: 1,
            processing: 'PENDING'
          }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/admin/pois/101') && method === 'PUT') {
        const body = JSON.parse(String(options?.body || '{}'));
        if (body.expectedVersion !== currentPoiVersion) {
          return new Response(JSON.stringify({
            code: 'POI_VERSION_CONFLICT',
            error: 'POI đã thay đổi; tải lại trước khi lưu.'
          }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }
        currentPoiVersion = 2;
        return new Response(JSON.stringify({
          data: {
            poiId: 101,
            name: body.name,
            contentVersion: 2,
            processing: 'PENDING'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/api/admin/content-jobs/55/retry')) {
        return new Response(JSON.stringify({
          message: 'Đã tiếp nhận yêu cầu thử lại; nội dung chưa được xác nhận hoàn tất.',
          data: { jobId: 55, status: 'PENDING', accepted: true }
        }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('{}', { status: 200 });
    };

    // 1. Tao POI thu nghiem INACTIVE
    const created = await createPoi(staffToken, {
      name: 'TEST - Cây Baobab',
      category: 'PLANT',
      latitude: 10.79,
      longitude: 106.70,
      description: 'Cây baobab quý hiếm',
      audioScript: 'Lời đọc baobab'
    }, baseUrl);
    assert.equal(created.status, 'INACTIVE');
    assert.equal(created.contentVersion, 1);

    // 2. Cap nhat voi expectedVersion dung
    const updated = await updatePoi(staffToken, 101, {
      name: 'TEST - Cây Baobab mới',
      category: 'PLANT',
      latitude: 10.79,
      longitude: 106.70,
      description: 'Mô tả mới',
      audioScript: 'Lời đọc mới',
      expectedVersion: 1
    }, baseUrl);
    assert.equal(updated.contentVersion, 2);

    // 3. Cap nhat voi expectedVersion sai bi 409
    await assert.rejects(
      async () => {
        await updatePoi(staffToken, 101, {
          name: 'TEST - Ghi đè cũ',
          category: 'PLANT',
          latitude: 10.79,
          longitude: 106.70,
          description: 'Mô tả cũ',
          audioScript: 'Lời đọc cũ',
          expectedVersion: 1 // Loi thoi
        }, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'POI_VERSION_CONFLICT');
        return true;
      }
    );

    // 4. Retry job FAILED nhan 202
    const retryRes = await retryContentJob(staffToken, 55, baseUrl);
    assert.equal(retryRes.data.status, 'PENDING');
    assert.equal(retryRes.data.accepted, true);

    globalThis.fetch = originalFetch;
  });

  test('Vòng 4: Khả năng chống phản hồi đến muộn và hủy request khi chuyển trang', async () => {
    let callCount = 0;
    const controller = new AbortController();

    globalThis.fetch = async (url, options) => {
      callCount += 1;
      const signal = options?.signal;
      if (signal?.aborted) {
        throw new DOMException('This operation was aborted', 'AbortError');
      }
      return new Response(JSON.stringify({ data: { items: [], total: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    controller.abort();

    await assert.rejects(
      async () => {
        await getPois('token', {}, baseUrl, controller.signal);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, 'ABORT_ERROR');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });
});
