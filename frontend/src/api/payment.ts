import { requestApi } from './client.ts';

export interface CheckoutSuccessData {
  sessionId: string;
  paymentRef: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  sessionStatus: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  provider: string;
  paymentUrl: string;
  authCode: string;
  codeExpiresAt: string;
}

export interface SessionStatusData {
  sessionId: string;
  sessionStatus: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
}

export interface ExchangeCodeData {
  sessionId: string;
  token: string;
  tokenType: string;
  expiresAt: string;
}

export interface VisitMeData {
  sessionId: string;
  status: string;
  activatedAt?: string;
  expiresAt?: string;
  durationHours?: number;
  [key: string]: unknown;
}

interface BackendEnvelope<T> {
  data: T;
}

export async function createOnlineCheckout(
  idempotencyKey: string,
  overrideBaseUrl?: string
): Promise<CheckoutSuccessData> {
  const res = await requestApi<BackendEnvelope<CheckoutSuccessData>>({
    method: 'POST',
    path: '/api/payments/online-checkout',
    headers: {
      'Idempotency-Key': idempotencyKey
    },
    body: {},
    overrideBaseUrl
  });

  return res.data.data;
}

export async function getSessionStatus(
  sessionId: string,
  overrideBaseUrl?: string
): Promise<SessionStatusData> {
  const res = await requestApi<BackendEnvelope<SessionStatusData>>({
    method: 'GET',
    path: `/api/payments/sessions/${encodeURIComponent(sessionId)}`,
    overrideBaseUrl
  });

  return res.data.data;
}

export async function exchangeOnlineCode(
  sessionId: string,
  authCode: string,
  overrideBaseUrl?: string
): Promise<ExchangeCodeData> {
  const res = await requestApi<BackendEnvelope<ExchangeCodeData>>({
    method: 'POST',
    path: `/api/payments/sessions/${encodeURIComponent(sessionId)}/exchange-online-code`,
    body: { authCode },
    overrideBaseUrl
  });

  return res.data.data;
}

export async function getVisitMe(
  token: string,
  overrideBaseUrl?: string
): Promise<VisitMeData> {
  const res = await requestApi<BackendEnvelope<VisitMeData>>({
    method: 'GET',
    path: '/api/visits/me',
    token,
    overrideBaseUrl
  });

  return res.data.data;
}
