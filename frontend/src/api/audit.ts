import { requestApi } from './client.ts';

interface BackendEnvelope<T> {
  message?: string;
  data: T;
}

export interface AuditLogDto {
  logId: number;
  userId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  userEmail?: string | null;
  actorName?: string | null;
  details?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface AuditLogListResult {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  filters: {
    from: string | null;
    to: string | null;
    action: string | null;
  };
  actions: string[];
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  action?: string;
}

export async function getAuditLogs(
  query: AuditLogQuery = {},
  token?: string,
  overrideBaseUrl?: string
): Promise<AuditLogListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);

  const qs = params.toString();
  const path = `/api/admin/audit-logs${qs ? `?${qs}` : ''}`;

  const res = await requestApi<BackendEnvelope<AuditLogListResult>>({
    path,
    method: 'GET',
    token,
    overrideBaseUrl
  });
  return res.data.data;
}
