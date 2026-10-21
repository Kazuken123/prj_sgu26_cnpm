import { requestApi } from './client.ts';

export interface CashSessionInitData {
  sessionId: string;
  paymentRef: string;
  paymentMethod: 'CASH';
  amount: string;
  currency: string;
  sessionStatus: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
}

export interface CashLookupData {
  sessionId: string;
  paymentRef: string;
  paymentMethod: 'CASH';
  amount: string;
  currency: string;
  sessionStatus: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
}

export interface CashConfirmationData {
  sessionId: string;
  paymentRef: string;
  paymentMethod: 'CASH';
  amount: string;
  currency: string;
  sessionStatus: 'ACTIVE';
  paymentStatus: 'PAID';
  paidAt: string;
  activatedAt: string;
  expiresAt: string;
  alreadyConfirmed: boolean;
}

export interface CashCodeData {
  sessionId: string;
  shortedCode: string;
  codeExpiresAt: string;
  visitExpiresAt: string;
  reused: boolean;
}

export interface CashExchangeData {
  sessionId: string;
  token: string;
  tokenType: string;
  expiresAt: string;
}

interface BackendEnvelope<T> {
  data: T;
  message?: string;
}

/**
 * 1. Nhân viên STAFF hoặc ADMIN tạo phiên CASH mới
 * Endpoint: POST /api/admin/payments
 */
export async function createCashPayment(
  token: string,
  idempotencyKey: string,
  overrideBaseUrl?: string
): Promise<CashSessionInitData> {
  const res = await requestApi<BackendEnvelope<CashSessionInitData>>({
    method: 'POST',
    path: '/api/admin/payments',
    headers: {
      'Idempotency-Key': idempotencyKey
    },
    token,
    body: {
      paymentMethod: 'CASH'
    },
    overrideBaseUrl
  });
  return res.data.data;
}

/**
 * 2. Nhân viên STAFF hoặc ADMIN tra cứu phiên CASH
 * Endpoint: GET /api/admin/payments/sessions/:sessionId
 */
export async function lookupCashSession(
  token: string,
  sessionId: string,
  overrideBaseUrl?: string
): Promise<CashLookupData> {
  const res = await requestApi<BackendEnvelope<CashLookupData>>({
    method: 'GET',
    path: `/api/admin/payments/sessions/${encodeURIComponent(sessionId.trim().toLowerCase())}`,
    token,
    overrideBaseUrl
  });
  return res.data.data;
}

/**
 * 3. Nhân viên STAFF hoặc ADMIN xác nhận đã thu đủ tiền mặt
 * Endpoint: POST /api/admin/payments/sessions/:sessionId/confirm-cash
 */
export async function confirmCashPayment(
  token: string,
  sessionId: string,
  overrideBaseUrl?: string
): Promise<CashConfirmationData> {
  const res = await requestApi<BackendEnvelope<CashConfirmationData>>({
    method: 'POST',
    path: `/api/admin/payments/sessions/${encodeURIComponent(sessionId.trim().toLowerCase())}/confirm-cash`,
    token,
    body: {},
    overrideBaseUrl
  });
  return res.data.data;
}

/**
 * 4. Nhân viên STAFF hoặc ADMIN cấp mã ngắn 6 số sau khi thanh toán
 * Endpoint: POST /api/admin/payments/sessions/:sessionId/cash-code
 */
export async function issueCashCode(
  token: string,
  sessionId: string,
  overrideBaseUrl?: string
): Promise<CashCodeData> {
  const res = await requestApi<BackendEnvelope<CashCodeData>>({
    method: 'POST',
    path: `/api/admin/payments/sessions/${encodeURIComponent(sessionId.trim().toLowerCase())}/cash-code`,
    token,
    body: {},
    overrideBaseUrl
  });
  return res.data.data;
}

/**
 * 5. Khách tham quan đổi mã ngắn lấy token phiên khách
 * Endpoint: POST /api/payments/sessions/:sessionId/exchange-cash-code
 * Không gửi token nội bộ.
 */
export async function exchangeCashCode(
  sessionId: string,
  shortedCode: string,
  overrideBaseUrl?: string
): Promise<CashExchangeData> {
  const res = await requestApi<BackendEnvelope<CashExchangeData>>({
    method: 'POST',
    path: `/api/payments/sessions/${encodeURIComponent(sessionId.trim().toLowerCase())}/exchange-cash-code`,
    body: {
      shortedCode: shortedCode.trim()
    },
    overrideBaseUrl
  });
  return res.data.data;
}
