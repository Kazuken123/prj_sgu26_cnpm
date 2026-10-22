import { requestApi } from './client.ts';

interface BackendEnvelope<T> {
  message?: string;
  data: T;
}

export interface MetricEnvelope<T> {
  value: T;
  source: string;
  scope: string;
  asOf: string;
}

export interface MonitoringDto {
  asOf: string;
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
    audios: MetricEnvelope<{
      total: number;
      byStatus: Record<string, number>;
    } | null>;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: boolean;
    redis: boolean;
    checkedAt: string;
  };
}

export interface MonitoringQuery {
  window?: '1h' | '24h' | '7d' | '30d';
  from?: string;
  to?: string;
}

export async function getMonitoringData(
  query: MonitoringQuery = {},
  token?: string,
  overrideBaseUrl?: string
): Promise<MonitoringDto> {
  const params = new URLSearchParams();
  if (query.window) params.set('window', query.window);
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
