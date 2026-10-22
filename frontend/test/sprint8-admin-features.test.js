import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getTours, getTourDetail, createTour, updateTour } from '../src/api/tour.ts';
import { getAuditLogs } from '../src/api/audit.ts';
import { getMonitoringData } from '../src/api/monitoring.ts';

describe('Kiểm thử Mở rộng Phân hệ Quản trị (Tours, Audit Logs, Monitoring)', () => {
  const originalFetch = globalThis.fetch;
  const baseUrl = 'http://127.0.0.1:18080';
  const adminToken = 'jwt_mock_admin_token_valid';

  test('1. getTours gửi đúng query phân trang và Bearer token', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedHeaders = options?.headers || {};

      return new Response(JSON.stringify({
        data: {
          items: [
            {
              tourId: 1,
              name: 'Tour Động vật hoang dã',
              description: 'Khám phá các loài thú quý hiếm',
              items: [{ poiId: 1, sequenceNo: 1 }, { poiId: 2, sequenceNo: 2 }],
              createdAt: '2026-10-22T00:00:00.000Z',
              updatedAt: '2026-10-22T00:00:00.000Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 10
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const res = await getTours({ page: 1, limit: 10 }, adminToken, baseUrl);
      assert.equal(capturedUrl, `${baseUrl}/api/admin/tours?page=1&limit=10`);
      assert.equal(capturedHeaders['Authorization'], `Bearer ${adminToken}`);
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0].name, 'Tour Động vật hoang dã');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('2. createTour gửi payload POST với danh sách items chuẩn xác', async () => {
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (url, options) => {
      capturedMethod = options?.method || 'GET';
      capturedBody = String(options?.body || '');

      return new Response(JSON.stringify({
        data: {
          tourId: 2,
          name: 'Tour Cây di sản',
          description: null,
          items: [{ poiId: 3, sequenceNo: 1 }],
          createdAt: '2026-10-22T00:00:00.000Z',
          updatedAt: '2026-10-22T00:00:00.000Z'
        }
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const payload = {
        name: 'Tour Cây di sản',
        items: [{ poiId: 3, sequenceNo: 1 }]
      };
      const res = await createTour(payload, adminToken, baseUrl);
      assert.equal(capturedMethod, 'POST');
      const parsed = JSON.parse(capturedBody);
      assert.equal(parsed.name, 'Tour Cây di sản');
      assert.equal(res.tourId, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('3. getAuditLogs gọi đúng GET /api/admin/audit-logs với filters', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          items: [
            {
              logId: 100,
              userId: 1,
              action: 'CONFIRM_CASH_PAYMENT',
              resourceType: 'PAYMENT',
              resourceId: '99',
              ipAddress: '127.0.0.1',
              createdAt: '2026-10-22T00:00:00.000Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 15,
          filters: { from: null, to: null, action: 'CONFIRM_CASH_PAYMENT' },
          actions: ['CONFIRM_CASH_PAYMENT', 'CREATE_STAFF']
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const res = await getAuditLogs({ action: 'CONFIRM_CASH_PAYMENT' }, adminToken, baseUrl);
      assert.ok(capturedUrl.includes('/api/admin/audit-logs?action=CONFIRM_CASH_PAYMENT'));
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0].action, 'CONFIRM_CASH_PAYMENT');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('4. getMonitoringData gọi đúng GET /api/admin/monitoring với window', async () => {
    let capturedUrl = '';

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          asOf: '2026-10-22T00:00:00.000Z',
          window: { from: '2026-10-21T00:00:00.000Z', to: '2026-10-22T00:00:00.000Z', timezone: 'UTC', interval: '24h' },
          metrics: {
            activePaidVisits: { value: 12, source: 'sessions', scope: 'CURRENT', asOf: '2026-10-22T00:00:00.000Z' },
            paidPayments: { value: { count: 12, totals: [{ currency: 'VND', amount: '600000.00' }] }, source: 'payments', scope: 'WINDOW', asOf: '2026-10-22T00:00:00.000Z' },
            bundleAccess: { value: { total: 45, uniqueSessions: 12, byLanguage: [] }, source: 'logs', scope: 'WINDOW', asOf: '2026-10-22T00:00:00.000Z' },
            contentJobs: { value: { total: 30, byStatus: { COMPLETED: 30 } }, source: 'jobs', scope: 'CURRENT', asOf: '2026-10-22T00:00:00.000Z' },
            audios: { value: { total: 30, byStatus: { AVAILABLE: 30 } }, source: 'audios', scope: 'CURRENT', asOf: '2026-10-22T00:00:00.000Z' }
          },
          health: { status: 'healthy', database: true, redis: true, checkedAt: '2026-10-22T00:00:00.000Z' }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const res = await getMonitoringData({ window: '24h' }, adminToken, baseUrl);
      assert.ok(capturedUrl.includes('/api/admin/monitoring?window=24h'));
      assert.equal(res.health.status, 'healthy');
      assert.equal(res.metrics.activePaidVisits.value, 12);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
