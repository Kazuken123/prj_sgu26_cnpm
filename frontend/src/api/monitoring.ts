import { requestApi } from './client.ts';

interface BackendEnvelope<T> {
  message?: string;
  data: T;
}

export interface MetricEnvelope<T> {
  value: T;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_IMPLEMENTED';
  unit: string;
  scope: string;
  updatedAt: string | null;
}

export interface MonitoringDto {
  asOf: string;
  generatedAt: string;
  window: {
    from: string;
    to: string;
    timezone: string;
    interval: string;
  };
  metrics: {
    activePaidVisits: MetricEnvelope<number | null>;
    paidPayments: MetricEnvelope<{
      count: number;
      totals: { currency: string; amount: string }[];
    } | null>;
    bundleAccess: MetricEnvelope<{
      total: number;
      uniqueSessions: number;
      byLanguage: { languageCode: string; total: number; uniqueSessions: number }[];
    } | null>;
    contentJobs: MetricEnvelope<{
      total: number;
      byStatus: Record<string, number>;
    } | null>;
    audioRecords: MetricEnvelope<{
      total: number;
      byStatus: Record<string, number>;
    } | null>;
    chatbot: MetricEnvelope<{ total: number; byStatus: Record<string, number> } | null>;
  };
  health: {
    liveness: { status: 'UP'; checkedAt: string };
    readiness: { status: 'READY' | 'NOT_READY'; checkedAt: string };
    database: { status: 'READY' | 'UNAVAILABLE'; checkedAt: string };
    redis: { status: 'READY' | 'UNAVAILABLE'; checkedAt: string };
  };
}

export interface MonitoringQuery {
  from?: string;
  to?: string;
}

export type MonitoringWindow = '1h' | '24h' | '7d' | '30d';

export function monitoringRange(window: MonitoringWindow, now = new Date()): MonitoringQuery {
  const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[window];
  return { from: new Date(now.getTime() - hours * 3600000).toISOString(), to: now.toISOString() };
}

export async function getMonitoringData(
  query: MonitoringQuery = {},
  token?: string,
  overrideBaseUrl?: string
): Promise<MonitoringDto> {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);

  const qs = params.toString();
  const path = `/api/admin/monitoring${qs ? `?${qs}` : ''}`;

  const res = await requestApi<BackendEnvelope<MonitoringDto>>({
    path,
    method: 'GET',
    token,
    overrideBaseUrl
  });
  return res.data.data;
}
