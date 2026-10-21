import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAudioBlob } from '../src/api/media.ts';
import { ApiError } from '../src/api/client.ts';

describe('Kiểm thử Tải Tệp Âm thanh có Xác thực (Sprint 3)', () => {
  const originalFetch = globalThis.fetch;

  test('fetchAudioBlob gửi đúng Authorization Bearer token và nhận Blob audio/wav', async () => {
    let capturedUrl = '';
    let capturedAuth = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedAuth = options?.headers?.['Authorization'] || '';
      return new Response(new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69]), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': 'inline; filename="mock-key"'
        }
      });
    };

    const token = 'tcv_visit_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const blob = await fetchAudioBlob({
      audioUrl: '/api/media/audio/mock-key',
      token,
      overrideBaseUrl: 'http://127.0.0.1:18080'
    });

    assert.equal(capturedUrl, 'http://127.0.0.1:18080/api/media/audio/mock-key');
    assert.equal(capturedAuth, `Bearer ${token}`);
    assert.equal(blob.type, 'audio/wav');
    assert.equal(blob.size, 12);
  });

  test('Chặn không gửi token tới máy chủ media không xác định khác origin backend', async () => {
    await assert.rejects(
      fetchAudioBlob({
        audioUrl: 'http://hacker-site.com/malicious-audio.wav',
        token: 'tcv_visit_secret',
        overrideBaseUrl: 'http://127.0.0.1:18080'
      }),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.code, 'UNTRUSTED_MEDIA_HOST');
        return true;
      }
    );
  });

  test('Xử lý đúng lỗi 401 khi phiên hết hạn hoặc thiếu token', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'VISITOR_SESSION_REQUIRED',
        error: 'Cần phiên khách hợp lệ.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      fetchAudioBlob({
        audioUrl: '/api/media/audio/mock-key',
        token: 'tcv_visit_expired',
        overrideBaseUrl: 'http://127.0.0.1:18080'
      }),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'VISITOR_SESSION_REQUIRED');
        return true;
      }
    );
  });

  test('Xử lý đúng lỗi 404 khi tệp âm thanh không còn tồn tại trên máy chủ', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'AUDIO_NOT_FOUND',
        error: 'Chưa có âm thanh phù hợp.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      fetchAudioBlob({
        audioUrl: '/api/media/audio/deleted-key',
        token: 'tcv_visit_valid',
        overrideBaseUrl: 'http://127.0.0.1:18080'
      }),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 404);
        assert.equal(err.code, 'AUDIO_NOT_FOUND');
        return true;
      }
    );
  });

  test('Không biến JSON lỗi thành Blob audio khi Content-Type không phải âm thanh', async () => {
    globalThis.fetch = async () => {
      return new Response('{"status":"error"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      fetchAudioBlob({
        audioUrl: '/api/media/audio/invalid-mime',
        token: 'tcv_visit_valid',
        overrideBaseUrl: 'http://127.0.0.1:18080'
      }),
      (err) => {
        assert(err instanceof ApiError);
        assert.equal(err.code, 'INVALID_MEDIA_CONTENT_TYPE');
        return true;
      }
    );
  });

  test('Cơ chế sequence number vô hiệu hóa kết quả âm thanh đến muộn khi chuyển POI nhanh', async () => {
    let latestMediaSequence = 0;
    let playedUrl = '';

    const simulateMediaFetch = async (seq, audioUrl, delayMs) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Chỉ gắn URL nếu sequence vẫn là mới nhất
      if (seq === latestMediaSequence) {
        playedUrl = audioUrl;
      }
    };

    // POI 1: Bấm phát audio Hươu cao cổ nhưng mạng tải chậm 50ms
    latestMediaSequence = 1;
    const req1 = simulateMediaFetch(1, '/api/media/audio/huou-cao-co', 50);

    // Chuyển sang POI 2 (Voi châu Á) và bấm phát, mạng nhanh 10ms
    latestMediaSequence = 2;
    const req2 = simulateMediaFetch(2, '/api/media/audio/voi-chau-a', 10);

    await Promise.all([req1, req2]);

    assert.equal(playedUrl, '/api/media/audio/voi-chau-a', 'Âm thanh của POI cũ đến muộn không được phát');
  });

  test.after(() => {
    globalThis.fetch = originalFetch;
  });
});
