import { requestApi } from './client.ts';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ContentJobDto {
  jobId: number;
  poiId: number;
  languageCode: string;
  sourceVersion: number;
  currentVersion: number;
  isCurrent: boolean;
  status: JobStatus;
  canRetry: boolean;
  createdAt: string;
  updatedAt: string;
  translation: {
    status: string | null;
    sourceVersion: number | null;
    isCurrent: boolean;
  };
  audio: {
    status: string | null;
    sourceVersion: number | null;
    isCurrent: boolean;
  };
  error: {
    code: string;
    message: string;
  } | null;
}

export interface ContentJobListQuery {
  page?: number;
  limit?: number;
  poiId?: number;
  languageCode?: string;
  status?: JobStatus;
  currentOnly?: boolean;
}

export interface ContentJobListResult {
  items: ContentJobDto[];
  total: number;
  page: number;
  limit: number;
}

export interface RetryJobResult {
  message: string;
  data: {
    jobId: number;
    poiId: number;
    languageCode: string;
    sourceVersion: number;
    currentVersion: number;
    status: 'PENDING';
    accepted: boolean;
  };
}

interface BackendEnvelope<T> {
  data: T;
  message?: string;
}

/**
 * Lấy danh sách tác vụ nội dung có lọc và phân trang
 * Endpoint: GET /api/admin/content-jobs
 */
export async function getContentJobs(
  token: string,
  query?: ContentJobListQuery,
  overrideBaseUrl?: string,
  signal?: AbortSignal
): Promise<ContentJobListResult> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.poiId) params.set('poiId', String(query.poiId));
  if (query?.languageCode) params.set('languageCode', query.languageCode);
  if (query?.status) params.set('status', query.status);
  if (query?.currentOnly !== undefined) params.set('currentOnly', String(query.currentOnly));

  const queryString = params.toString();
  const path = queryString ? `/api/admin/content-jobs?${queryString}` : '/api/admin/content-jobs';

  const res = await requestApi<BackendEnvelope<ContentJobListResult>>({
    method: 'GET',
    path,
    token,
    signal,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Lấy chi tiết một tác vụ nội dung
 * Endpoint: GET /api/admin/content-jobs/:id
 */
export async function getContentJobDetail(
  token: string,
  id: number | string,
  overrideBaseUrl?: string,
  signal?: AbortSignal
): Promise<ContentJobDto> {
  const res = await requestApi<BackendEnvelope<ContentJobDto>>({
    method: 'GET',
    path: `/api/admin/content-jobs/${encodeURIComponent(String(id))}`,
    token,
    signal,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Yêu cầu thử lại một tác vụ bị FAILED
 * Endpoint: POST /api/admin/content-jobs/:id/retry
 * Body: {}
 */
export async function retryContentJob(
  token: string,
  id: number | string,
  overrideBaseUrl?: string
): Promise<RetryJobResult> {
  const res = await requestApi<RetryJobResult>({
    method: 'POST',
    path: `/api/admin/content-jobs/${encodeURIComponent(String(id))}/retry`,
    token,
    body: {},
    overrideBaseUrl
  });

  return res.data;
}
