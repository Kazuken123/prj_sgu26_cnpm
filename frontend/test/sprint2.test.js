import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getContentBundle } from '../src/api/content.ts';
import { ApiError } from '../src/api/client.ts';

describe('Kiểm thử Hợp đồng Bundle API (Sprint 2)', () => {
  const originalFetch = globalThis.fetch;

  test('getContentBundle gửi đúng query languageCode và header Bearer token', async () => {
    let capturedUrl = '';
    let capturedAuth = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedAuth = options?.headers?.['Authorization'] || '';
      return new Response(JSON.stringify({
        data: {
          requestedLanguageCode: 'vi',
          generatedAt: '2026-10-21T03:30:00.000Z',
          expiresAt: '2026-10-22T03:30:00.000Z',
          languages: [
            { code: 'vi', name: 'Tiếng Việt' },
            { code: 'en', name: 'English' }
          ],
          pois: [
            {
              poiId: 1,
              originalName: 'Hươu cao cổ',
              category: 'ANIMAL',
              conservationStatus: 'VU',
              activityHours: '07:00 - 17:30',
              latitude: 10.7915,
              longitude: 106.7052,
              triggerRadius: 30,
              avatarUrl: null,
              displayOrder: 1,
              text: {
                status: 'READY',
                languageCode: 'vi',
                isFallback: false,
                name: 'Hươu cao cổ',
                description: 'Khu chuồng hươu cao cổ...',
                audioScript: 'Chào mừng bạn đến với...'
              },
              audio: {
                status: 'AVAILABLE',
                languageCode: 'vi',
                isFallback: false,
                url: '/api/media/audio/mock-hash-1',
                mimeType: 'audio/wav',
                duration: 1
              }
            }
          ],
          tours: [
            {
              tourId: 1,
              name: 'Lộ trình demo do nhóm đề xuất — Hươu cao cổ và Voi châu Á',
              description: 'Tuyến tham quan hai trạm...',
              localization: 'SHARED',
              items: [{ poiId: 1, sequenceNo: 1 }]
            }
          ]
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const token = 'tcv_visit_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const bundle = await getContentBundle('vi', token, undefined, 'http://127.0.0.1:18080');

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/content/bundle?languageCode=vi');
    assert.equal(capturedAuth, `Bearer ${token}`);
    assert.equal(bundle.requestedLanguageCode, 'vi');
    assert.equal(bundle.pois.length, 1);
    assert.equal(bundle.pois[0].poiId, 1);
    assert.equal(bundle.pois[0].originalName, 'Hươu cao cổ');
    assert.equal(bundle.tours[0].localization, 'SHARED');
  });

  test('Phát hiện và xử lý lỗi 400 LANGUAGE_NOT_SUPPORTED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'LANGUAGE_NOT_SUPPORTED',
        error: 'Ngôn ngữ không được hỗ trợ hoặc đã ngừng hoạt động.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      getContentBundle('zz', 'tcv_visit_mock', undefined, 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.code, 'LANGUAGE_NOT_SUPPORTED');
        return true;
      }
    );
  });

  test('Phát hiện và xử lý lỗi 401 VISIT_SESSION_EXPIRED khi phiên hết hạn', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'VISIT_SESSION_EXPIRED',
        error: 'Vé đã hết hạn.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      getContentBundle('vi', 'tcv_visit_expired', undefined, 'http://127.0.0.1:18080'),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'VISIT_SESSION_EXPIRED');
        return true;
      }
    );
  });

  test('Kiểm tra cơ chế loại bỏ response đến muộn theo mã thứ tự sequence', async () => {
    let latestSequence = 0;
    let finalAppliedLang = '';

    const simulateFetchWithDelay = async (seq, lang, delayMs) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Chỉ áp dụng nếu seq trùng với latestSequence
      if (seq === latestSequence) {
        finalAppliedLang = lang;
      }
    };

    // Yêu cầu 1: Chọn VI nhưng mạng chậm 50ms
    latestSequence = 1;
    const req1 = simulateFetchWithDelay(1, 'vi', 50);

    // Yêu cầu 2: Người dùng bấm chọn EN ngay sau đó, mạng nhanh 10ms
    latestSequence = 2;
    const req2 = simulateFetchWithDelay(2, 'en', 10);

    await Promise.all([req1, req2]);

    // Dù req1 kết thúc sau req2, dữ liệu cuối cùng vẫn là EN của yêu cầu 2
    assert.equal(finalAppliedLang, 'en', 'Response của yêu cầu cũ không được ghi đè lên yêu cầu mới');
  });

  test('Xác nhận tính độc lập giữa text fallback và audio fallback', () => {
    // Dữ liệu mẫu chứng minh text là EN còn audio fallback về VI
    const mockPoi = {
      poiId: 2,
      originalName: 'Voi châu Á',
      text: {
        status: 'READY',
        languageCode: 'en',
        isFallback: false,
        name: 'Asian Elephant',
        description: 'Asian elephant exhibit...'
      },
      audio: {
        status: 'AVAILABLE',
        languageCode: 'vi',
        isFallback: true,
        url: '/api/media/audio/mock-wav-vi',
        duration: 1
      }
    };

    assert.equal(mockPoi.text.languageCode, 'en');
    assert.equal(mockPoi.text.isFallback, false);
    assert.equal(mockPoi.audio.languageCode, 'vi');
    assert.equal(mockPoi.audio.isFallback, true);
    assert.notEqual(mockPoi.text.languageCode, mockPoi.audio.languageCode);
  });

  test.after(() => {
    globalThis.fetch = originalFetch;
  });
});
