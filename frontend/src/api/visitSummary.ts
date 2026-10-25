import { requestApi } from './client';

export interface VisitSummary { activePaidVisits: number; generatedAt: string }
export async function getVisitSummary(baseUrl: string, signal: AbortSignal): Promise<VisitSummary> {
  const response = await requestApi<{ data: VisitSummary }>({ path: '/api/visits/summary', overrideBaseUrl: baseUrl, signal });
  const data = response.data.data;
  if (!data || !Number.isSafeInteger(data.activePaidVisits) || data.activePaidVisits < 0 ||
    typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt))) {
    throw new Error('Số vé chưa được xác minh.');
  }
  return data;
}
