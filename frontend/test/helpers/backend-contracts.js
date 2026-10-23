import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { MonitoringService } = require('../../../backend/services/monitoring.service.js');
const { TourService } = require('../../../backend/services/tour.service.js');
export const actor = { userId: 1, role: 'ADMIN', status: 'ACTIVE' };

// Fake only persistence/health IO; production services own validation and response shapes.
export function monitoringService(overrides = {}, checks = {}) {
  const reader = {
    now: new Date('2026-10-23T12:00:00Z'),
    activePaidVisits: async () => [{ total: 12 }],
    paidPayments: async () => [{ currency: 'VND', total: 12, amount: '600000.00' }],
    bundleTotals: async () => [{ total: 45, uniqueSessions: 12 }],
    bundleLanguages: async () => [],
    jobs: async () => [{ status: 'COMPLETED', total: 30 }],
    audios: async () => [{ status: 'AVAILABLE', total: 27 }],
    ...overrides
  };
  return new MonitoringService({ snapshot: work => work(reader) }, {
    ping: async () => {}, pingRedis: async () => {}, ...checks
  });
}

export function tourService() {
  const state = { writes: 0, current: {
    tourId: 1, name: 'Tour thử', description: null,
    items: [{ poiId: 1, sequenceNo: 1 }],
    createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z'
  } };
  const service = new TourService({
    get: async () => state.current,
    withUpdate: async (userId, id, ids, work) => work({
      actor, current: state.current, pois: [{ poiId: 1, status: 'ACTIVE' }],
      persist: async data => { state.writes++; state.current = { ...state.current, ...data }; return state.current; }
    })
  });
  return { service, state };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
export async function serviceResponse(work) {
  try { return jsonResponse({ data: await work() }); }
  catch (error) { return jsonResponse({ code: error.code, error: error.message }, error.status || 500); }
}
