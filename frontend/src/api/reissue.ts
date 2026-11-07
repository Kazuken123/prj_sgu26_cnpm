import { requestApi } from './client.ts';

// UC-12 — Cấp lại token khách (Could Have). Staff/Admin only.
export interface TokenReissueInput {
  sessionId: string;
  paymentRef: string;
  /** Declared payment time as ISO UTC; server accepts ±10 minutes around paid_at. */
  paidAt: string;
  reason?: string;
}
export interface TokenReissueSummary {
  sessionId: string;
  paymentRef: string;
  paymentMethod: 'CASH' | 'ONLINE';
  amount: string;
  currency: string;
  paidAt: string;
  expiresAt: string;
  reissueCount: number;
  maxReissues: number;
  remainingAfter: number;
  pendingPickup: boolean;
}
export interface TokenReissueResult extends Omit<TokenReissueSummary, 'pendingPickup'> {
  shortedCode: string;
  codeExpiresAt: string;
  renewedCode: boolean;
  reissueNumber: number;
}
interface Envelope<T> { data: T }

const body = (input: TokenReissueInput) => ({
  sessionId: input.sessionId.trim().toLowerCase(),
  paymentRef: input.paymentRef.trim().toLowerCase(),
  paidAt: input.paidAt,
  ...(input.reason !== undefined ? { reason: input.reason.trim() } : {}),
});

/** Step 1–3: reconcile session_id + payment_ref + payment time; no mutation. */
export async function verifyTokenReissue(token: string, input: TokenReissueInput, overrideBaseUrl?: string): Promise<TokenReissueSummary> {
  const res = await requestApi<Envelope<TokenReissueSummary>>({ method: 'POST', path: '/api/admin/payments/reissue/verify', token, body: body(input), overrideBaseUrl });
  return res.data.data;
}

/** Step 5: revoke the lost token and issue a one-time pickup code. */
export async function reissueVisitorToken(token: string, input: TokenReissueInput, overrideBaseUrl?: string): Promise<TokenReissueResult> {
  const res = await requestApi<Envelope<TokenReissueResult>>({ method: 'POST', path: '/api/admin/payments/reissue', token, body: body(input), overrideBaseUrl });
  return res.data.data;
}

/** Convert a Vietnam-time `datetime-local` value (YYYY-MM-DDTHH:mm) to ISO UTC. */
export function vietnamLocalToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const ms = Date.UTC(y, mo - 1, d, h - 7, mi);
  const check = new Date(ms + 7 * 3600000);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return new Date(ms).toISOString();
}
