import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPois,
  getPoiDetail,
  createPoi,
  updatePoi,
  deactivatePoi
} from '../src/api/poi.ts';
import {
  getContentJobs,
  getContentJobDetail,
  retryContentJob
} from '../src/api/contentJob.ts';
import { ApiError } from '../src/api/client.ts';

describe('Kiểm thử Quản lý POI và Theo dõi Tác vụ Nội dung (Sprint 6)', () => {
  const originalFetch = globalThis.fetch;
  const baseUrl = 'http://127.0.0.1:18080';
  const staffToken = 'jwt_mock_staff_token_valid';
  const adminToken = 'jwt_mock_admin_token_valid';
  const guestToken = 'tcv_visit_mock_guest_token';

  test('1. Nhân viên xem danh sách POI có phân trang và bộ lọc qua GET /api/admin/pois', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedHeaders = options?.headers || {};

      return new Response(JSON.stringify({
        data: {
          items: [
            {
              poiId: 1,
              name: 'Hươu cao cổ',
              category: 'ANIMAL',
              conservationStatus: 'Ít quan tâm',
              activityHours: '07:00 - 17:30',
              latitude: 10.7915,
              longitude: 106.7052,
              triggerRadius: 30,
              avatarUrl: '/assets/images/tcv_huou_thao_em.jpg',
              displayOrder: 1,
              status: 'ACTIVE',
              contentVersion: 1,
              description: 'Mô tả hươu cao cổ',
              audioScript: 'Kịch bản hươu cao cổ'
            }
          ],
          total: 1,
          page: 1,
          limit: 10
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await getPois(
      staffToken,
      { page: 1, limit: 10, category: 'ANIMAL', status: 'ACTIVE' },
      baseUrl
    );

    assert.ok(capturedUrl.includes('/api/admin/pois'));
    assert.ok(capturedUrl.includes('page=1'));
    assert.ok(capturedUrl.includes('limit=10'));
    assert.ok(capturedUrl.includes('category=ANIMAL'));
    assert.ok(capturedUrl.includes('status=ACTIVE'));
    assert.equal(capturedHeaders['Authorization'], `Bearer ${staffToken}`);

    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].name, 'Hươu cao cổ');
    assert.equal(result.items[0].category, 'ANIMAL');

    globalThis.fetch = originalFetch;
  });

  test('2. Xem chi tiết POI qua GET /api/admin/pois/:id', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          poiId: 1,
          name: 'Hươu cao cổ',
          category: 'ANIMAL',
          conservationStatus: 'Ít quan tâm',
          activityHours: '07:00 - 17:30',
          latitude: 10.7915,
          longitude: 106.7052,
          triggerRadius: 30,
          avatarUrl: '/assets/images/tcv_huou_thao_em.jpg',
          displayOrder: 1,
          status: 'ACTIVE',
          contentVersion: 1,
          description: 'Mô tả chi tiết',
          audioScript: 'Kịch bản đọc thuyết minh'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const poi = await getPoiDetail(staffToken, 1, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/pois/1`);
    assert.equal(poi.poiId, 1);
    assert.equal(poi.name, 'Hươu cao cổ');
    assert.equal(poi.triggerRadius, 30);
    assert.equal(typeof poi.latitude, 'number');
    assert.equal(typeof poi.longitude, 'number');

    globalThis.fetch = originalFetch;
  });

  test('3. Tạo POI mới ở trạng thái đề xuất INACTIVE qua POST /api/admin/pois', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || 'GET';
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          poiId: 99,
          name: 'TEST - Vườn thực vật mẫu',
          category: 'PLANT',
          conservationStatus: null,
          activityHours: null,
          latitude: 10.789,
          longitude: 106.704,
          triggerRadius: 30,
          avatarUrl: null,
          displayOrder: 0,
          status: 'INACTIVE',
          contentVersion: 1,
          description: 'Mô tả thử nghiệm',
          audioScript: 'Kịch bản đọc thử nghiệm',
          processing: 'PENDING'
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const input = {
      name: 'TEST - Vườn thực vật mẫu',
      category: 'PLANT',
      latitude: 10.789,
      longitude: 106.704,
      triggerRadius: 30,
      displayOrder: 0,
      status: 'INACTIVE',
      description: 'Mô tả thử nghiệm',
      audioScript: 'Kịch bản đọc thử nghiệm'
    };

    const created = await createPoi(staffToken, input, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/pois`);
    assert.equal(capturedMethod, 'POST');
    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.name, 'TEST - Vườn thực vật mẫu');
    assert.equal(parsedBody.category, 'PLANT');
    assert.equal(parsedBody.status, 'INACTIVE');
    assert.equal(created.poiId, 99);
    assert.equal(created.contentVersion, 1);
    assert.equal(created.processing, 'PENDING');

    globalThis.fetch = originalFetch;
  });

  test('4. Cập nhật nội dung nguồn làm tăng phiên bản v1 -> v2 và trả processing PENDING', async () => {
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedMethod = options?.method || 'GET';
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          poiId: 99,
          name: 'TEST - Vườn thực vật mẫu cập nhật',
          category: 'PLANT',
          conservationStatus: null,
          activityHours: null,
          latitude: 10.789,
          longitude: 106.704,
          triggerRadius: 30,
          avatarUrl: null,
          displayOrder: 0,
          status: 'INACTIVE',
          contentVersion: 2,
          description: 'Mô tả mới đã thay đổi',
          audioScript: 'Kịch bản đọc mới đã thay đổi',
          processing: 'PENDING'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const updateInput = {
      name: 'TEST - Vườn thực vật mẫu cập nhật',
      category: 'PLANT',
      latitude: 10.789,
      longitude: 106.704,
      triggerRadius: 30,
      displayOrder: 0,
      status: 'INACTIVE',
      description: 'Mô tả mới đã thay đổi',
      audioScript: 'Kịch bản đọc mới đã thay đổi',
      expectedVersion: 1
    };

    const updated = await updatePoi(staffToken, 99, updateInput, baseUrl);

    assert.equal(capturedMethod, 'PUT');
    assert.equal(JSON.parse(capturedBody).expectedVersion, 1);
    assert.equal(updated.contentVersion, 2);
    assert.equal(updated.processing, 'PENDING');

    globalThis.fetch = originalFetch;
  });

  test('5. Cập nhật thông tin không thuộc nguồn giữ nguyên phiên bản v2 và trả processing UNCHANGED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        data: {
          poiId: 99,
          name: 'TEST - Vườn thực vật mẫu cập nhật',
          category: 'PLANT',
          conservationStatus: 'Ít quan tâm',
          activityHours: '08:00 - 17:00',
          latitude: 10.789,
          longitude: 106.704,
          triggerRadius: 40,
          avatarUrl: null,
          displayOrder: 2,
          status: 'INACTIVE',
          contentVersion: 2,
          description: 'Mô tả mới đã thay đổi',
          audioScript: 'Kịch bản đọc mới đã thay đổi',
          processing: 'UNCHANGED'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const updateMetaInput = {
      name: 'TEST - Vườn thực vật mẫu cập nhật',
      category: 'PLANT',
      conservationStatus: 'Ít quan tâm',
      activityHours: '08:00 - 17:00',
      latitude: 10.789,
      longitude: 106.704,
      triggerRadius: 40,
      displayOrder: 2,
      status: 'INACTIVE',
      description: 'Mô tả mới đã thay đổi',
      audioScript: 'Kịch bản đọc mới đã thay đổi',
      expectedVersion: 2
    };

    const updatedMeta = await updatePoi(staffToken, 99, updateMetaInput, baseUrl);

    assert.equal(updatedMeta.contentVersion, 2);
    assert.equal(updatedMeta.processing, 'UNCHANGED');
    assert.equal(updatedMeta.triggerRadius, 40);

    globalThis.fetch = originalFetch;
  });

  test('6. Xử lý xung đột phiên bản 409 POI_VERSION_CONFLICT khi expectedVersion không khớp', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'POI_VERSION_CONFLICT',
        error: 'POI đã thay đổi; tải lại trước khi lưu.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await updatePoi(staffToken, 99, {
          name: 'TEST xung đột',
          category: 'PLANT',
          latitude: 10.789,
          longitude: 106.704,
          description: 'Mô tả',
          audioScript: 'Kịch bản',
          expectedVersion: 1 // phien ban cu da loi thoi
        }, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'POI_VERSION_CONFLICT');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('7. Ngừng sử dụng POI qua POST /api/admin/pois/:id/deactivate', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || 'GET';
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          poiId: 99,
          name: 'TEST - Vườn thực vật mẫu',
          category: 'PLANT',
          status: 'INACTIVE',
          contentVersion: 2
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const deactivated = await deactivatePoi(staffToken, 99, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/pois/99/deactivate`);
    assert.equal(capturedMethod, 'POST');
    assert.deepEqual(JSON.parse(capturedBody), {});
    assert.equal(deactivated.status, 'INACTIVE');

    globalThis.fetch = originalFetch;
  });

  test('8. Xem danh sách Content Jobs qua GET /api/admin/content-jobs', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          items: [
            {
              jobId: 10,
              poiId: 99,
              languageCode: 'en',
              sourceVersion: 2,
              currentVersion: 2,
              isCurrent: true,
              status: 'FAILED',
              canRetry: true,
              createdAt: '2026-10-21T04:00:00.000Z',
              updatedAt: '2026-10-21T04:01:00.000Z',
              translation: { status: 'FAILED', sourceVersion: 2, isCurrent: true },
              audio: { status: null, sourceVersion: null, isCurrent: false },
              error: { code: 'TRANSLATION_TIMEOUT', message: 'Dịch vụ dịch vượt thời gian chờ.' }
            }
          ],
          total: 1,
          page: 1,
          limit: 10
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const jobs = await getContentJobs(
      staffToken,
      { poiId: 99, status: 'FAILED', currentOnly: true },
      baseUrl
    );

    assert.ok(capturedUrl.includes('/api/admin/content-jobs'));
    assert.ok(capturedUrl.includes('poiId=99'));
    assert.ok(capturedUrl.includes('status=FAILED'));
    assert.ok(capturedUrl.includes('currentOnly=true'));

    assert.equal(jobs.items.length, 1);
    assert.equal(jobs.items[0].canRetry, true);
    assert.equal(jobs.items[0].error?.code, 'TRANSLATION_TIMEOUT');

    globalThis.fetch = originalFetch;
  });

  test('9. Thử lại job FAILED qua POST /api/admin/content-jobs/:id/retry nhận HTTP 202', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || 'GET';
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        message: 'Đã tiếp nhận yêu cầu thử lại; nội dung chưa được xác nhận hoàn tất.',
        data: {
          jobId: 10,
          poiId: 99,
          languageCode: 'en',
          sourceVersion: 2,
          currentVersion: 2,
          status: 'PENDING',
          accepted: true
        }
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const retryResult = await retryContentJob(staffToken, 10, baseUrl);

    assert.equal(capturedUrl, `${baseUrl}/api/admin/content-jobs/10/retry`);
    assert.equal(capturedMethod, 'POST');
    assert.deepEqual(JSON.parse(capturedBody), {});
    assert.equal(retryResult.data.status, 'PENDING');
    assert.equal(retryResult.data.accepted, true);

    globalThis.fetch = originalFetch;
  });

  test('10. Thử lại job khi không ở trạng thái FAILED bị từ chối 409 CONTENT_JOB_NOT_FAILED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'CONTENT_JOB_NOT_FAILED',
        error: 'Chỉ tác vụ FAILED mới được thử lại; tải lại trạng thái hiện tại.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await retryContentJob(staffToken, 10, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'CONTENT_JOB_NOT_FAILED');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('11. Thử lại job phiên bản lỗi thời bị từ chối 409 CONTENT_JOB_OUTDATED', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'CONTENT_JOB_OUTDATED',
        error: 'Tác vụ thuộc phiên bản cũ; tải lại trạng thái nội dung.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await retryContentJob(staffToken, 10, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'CONTENT_JOB_OUTDATED');
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  test('12. Phân quyền: Token khách không có quyền gọi API quản lý POI và Job', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        code: 'MISSING_ACCESS_TOKEN',
        error: 'Chưa xác thực tài khoản nội bộ.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    await assert.rejects(
      async () => {
        await getPois(guestToken, {}, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await getContentJobs(guestToken, {}, baseUrl);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });
});
