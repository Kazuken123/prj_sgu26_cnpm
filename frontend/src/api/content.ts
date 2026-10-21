import { requestApi } from './client.ts';

export interface LanguageDto {
  code: string;
  name: string;
}

export interface PoiTextDto {
  status: 'READY' | 'UNAVAILABLE';
  languageCode: string | null;
  isFallback: boolean;
  name: string | null;
  description: string | null;
  audioScript: string | null;
}

export interface PoiAudioDto {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  languageCode: string | null;
  isFallback: boolean;
  url: string | null;
  mimeType: string | null;
  duration: number | null;
}

export interface PoiDto {
  poiId: number;
  originalName: string;
  category: 'ANIMAL' | 'PLANT' | 'HERITAGE' | 'AMENITY' | string;
  conservationStatus: string | null;
  activityHours: string | null;
  latitude: number;
  longitude: number;
  triggerRadius: number;
  avatarUrl: string | null;
  displayOrder: number;
  text: PoiTextDto;
  audio: PoiAudioDto;
}

export interface TourItemDto {
  poiId: number;
  sequenceNo: number;
}

export interface TourDto {
  tourId: number;
  name: string;
  description: string;
  localization: 'SHARED' | string;
  items: TourItemDto[];
}

export interface BundleDto {
  requestedLanguageCode: string;
  generatedAt: string;
  expiresAt: string;
  languages: LanguageDto[];
  pois: PoiDto[];
  tours: TourDto[];
}

interface BackendEnvelope<T> {
  data: T;
}

export async function getContentBundle(
  languageCode: string,
  token: string,
  signal?: AbortSignal,
  overrideBaseUrl?: string
): Promise<BundleDto> {
  const cleanLang = (languageCode || 'vi').trim();
  const res = await requestApi<BackendEnvelope<BundleDto>>({
    method: 'GET',
    path: `/api/content/bundle?languageCode=${encodeURIComponent(cleanLang)}`,
    token,
    signal,
    overrideBaseUrl
  });

  return res.data.data;
}
