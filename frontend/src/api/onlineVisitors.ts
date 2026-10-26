import { requestApi } from './client';
export interface OnlineVisitorsSummary {
  count: number;
  generatedAt: string;
  windowSeconds: number;
  measurement: 'BROWSER_SESSIONS';
}
export async function getOnlineVisitors(token: string, baseUrl: string): Promise<OnlineVisitorsSummary> {
  const response = await requestApi<{ data: OnlineVisitorsSummary }>({ path: '/api/admin/online-visitors', token, overrideBaseUrl: baseUrl });
  const data = response.data.data;
  if (!data || !Number.isSafeInteger(data.count) || data.count < 0 || !Number.isFinite(Date.parse(data.generatedAt)) || data.windowSeconds !== 120 || data.measurement !== 'BROWSER_SESSIONS') {
    throw new Error('Chưa xác minh được số khách online.');
  }
  return data;
}
