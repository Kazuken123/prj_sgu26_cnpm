import { requestApi } from './client.ts';

export type PoiCategory = 'ANIMAL' | 'PLANT' | 'HERITAGE' | 'AMENITY';
export type PoiStatus = 'ACTIVE' | 'INACTIVE';

export interface PoiDto {
  poiId: number;
  name: string;
  category: PoiCategory;
  conservationStatus: string | null;
  activityHours: string | null;
  latitude: number;
  longitude: number;
  triggerRadius: number;
  avatarUrl: string | null;
  displayOrder: number;
  status: PoiStatus;
  contentVersion: number;
  description: string;
  audioScript: string;
  processing?: 'PENDING' | 'UNCHANGED';
}

export interface PoiSaveInput {
  name: string;
  category: PoiCategory;
  conservationStatus?: string | null;
  activityHours?: string | null;
  latitude: number;
  longitude: number;
  triggerRadius?: number;
  avatarUrl?: string | null;
  displayOrder?: number;
  status?: PoiStatus;
  description: string;
  audioScript: string;
  expectedVersion?: number;
}

export interface PoiListQuery {
  page?: number;
  limit?: number;
  category?: PoiCategory;
  status?: PoiStatus;
}

export interface PoiListResult {
  items: PoiDto[];
  total: number;
  page: number;
  limit: number;
}

interface BackendEnvelope<T> {
  data: T;
  message?: string;
}

/**
 * Lấy danh sách POI có lọc và phân trang
 * Endpoint: GET /api/admin/pois
 */
export async function getPois(
  token: string,
  query?: PoiListQuery,
  overrideBaseUrl?: string,
  signal?: AbortSignal
): Promise<PoiListResult> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.category) params.set('category', query.category);
  if (query?.status) params.set('status', query.status);

  const queryString = params.toString();
  const path = queryString ? `/api/admin/pois?${queryString}` : '/api/admin/pois';

  const res = await requestApi<BackendEnvelope<PoiListResult>>({
    method: 'GET',
    path,
    token,
    signal,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Lấy chi tiết một POI
 * Endpoint: GET /api/admin/pois/:id
 */
export async function getPoiDetail(
  token: string,
  id: number | string,
  overrideBaseUrl?: string,
  signal?: AbortSignal
): Promise<PoiDto> {
  const res = await requestApi<BackendEnvelope<PoiDto>>({
    method: 'GET',
    path: `/api/admin/pois/${encodeURIComponent(String(id))}`,
    token,
    signal,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Tạo mới một POI
 * Endpoint: POST /api/admin/pois
 */
export async function createPoi(
  token: string,
  input: PoiSaveInput,
  overrideBaseUrl?: string
): Promise<PoiDto> {
  const payload: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    conservationStatus: input.conservationStatus ?? null,
    activityHours: input.activityHours ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    triggerRadius: input.triggerRadius ?? 30,
    avatarUrl: input.avatarUrl ?? null,
    displayOrder: input.displayOrder ?? 0,
    status: input.status ?? 'INACTIVE',
    description: input.description,
    audioScript: input.audioScript
  };

  const res = await requestApi<BackendEnvelope<PoiDto>>({
    method: 'POST',
    path: '/api/admin/pois',
    token,
    body: payload,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Cập nhật một POI với khóa lạc quan expectedVersion
 * Endpoint: PUT /api/admin/pois/:id
 */
export async function updatePoi(
  token: string,
  id: number | string,
  input: PoiSaveInput,
  overrideBaseUrl?: string
): Promise<PoiDto> {
  const payload: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    conservationStatus: input.conservationStatus ?? null,
    activityHours: input.activityHours ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    triggerRadius: input.triggerRadius ?? 30,
    avatarUrl: input.avatarUrl ?? null,
    displayOrder: input.displayOrder ?? 0,
    status: input.status ?? 'INACTIVE',
    description: input.description,
    audioScript: input.audioScript,
    expectedVersion: input.expectedVersion
  };

  const res = await requestApi<BackendEnvelope<PoiDto>>({
    method: 'PUT',
    path: `/api/admin/pois/${encodeURIComponent(String(id))}`,
    token,
    body: payload,
    overrideBaseUrl
  });

  return res.data.data;
}

/**
 * Ngừng sử dụng một POI (chuyển sang INACTIVE)
 * Endpoint: POST /api/admin/pois/:id/deactivate
 */
export async function deactivatePoi(
  token: string,
  id: number | string,
  overrideBaseUrl?: string
): Promise<PoiDto> {
  const res = await requestApi<BackendEnvelope<PoiDto>>({
    method: 'POST',
    path: `/api/admin/pois/${encodeURIComponent(String(id))}/deactivate`,
    token,
    body: {},
    overrideBaseUrl
  });

  return res.data.data;
}
