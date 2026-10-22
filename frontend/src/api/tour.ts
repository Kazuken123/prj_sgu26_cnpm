import { requestApi } from './client.ts';

interface BackendEnvelope<T> {
  message?: string;
  data: T;
}

export interface TourItemDto {
  poiId: number;
  sequenceNo: number;
  poiName?: string;
  latitude?: number;
  longitude?: number;
}

export interface TourDto {
  tourId: number;
  name: string;
  description: string | null;
  items: TourItemDto[];
  createdAt: string;
  updatedAt: string;
  expectedRevision?: string;
}

export interface CreateTourPayload {
  name: string;
  description?: string | null;
  items: { poiId: number; sequenceNo: number }[];
}

export interface UpdateTourPayload {
  name: string;
  description?: string | null;
  items: { poiId: number; sequenceNo: number }[];
  expectedRevision: string;
}

export interface TourListResult {
  items: TourDto[];
  total: number;
  page: number;
  limit: number;
}

export async function getTours(
  query: { page?: number; limit?: number; q?: string } = {},
  token?: string,
  overrideBaseUrl?: string
): Promise<TourListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.q) params.set('q', query.q);

  const qs = params.toString();
  const path = `/api/admin/tours${qs ? `?${qs}` : ''}`;

  const res = await requestApi<BackendEnvelope<TourListResult>>({
    path,
    method: 'GET',
    token,
    overrideBaseUrl
  });
  return res.data.data;
}

export async function getTourDetail(
  tourId: number,
  token?: string,
  overrideBaseUrl?: string
): Promise<TourDto> {
  const res = await requestApi<BackendEnvelope<TourDto>>({
    path: `/api/admin/tours/${tourId}`,
    method: 'GET',
    token,
    overrideBaseUrl
  });
  return res.data.data;
}

export async function createTour(
  payload: CreateTourPayload,
  token?: string,
  overrideBaseUrl?: string
): Promise<TourDto> {
  const res = await requestApi<BackendEnvelope<TourDto>>({
    path: '/api/admin/tours',
    method: 'POST',
    body: payload,
    token,
    overrideBaseUrl
  });
  return res.data.data;
}

export async function updateTour(
  tourId: number,
  payload: UpdateTourPayload,
  token?: string,
  overrideBaseUrl?: string
): Promise<TourDto> {
  const res = await requestApi<BackendEnvelope<TourDto>>({
    path: `/api/admin/tours/${tourId}`,
    method: 'PUT',
    body: payload,
    token,
    overrideBaseUrl
  });
  return res.data.data;
}
