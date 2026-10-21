export interface StoredGuestSession {
  version: 1;
  apiBaseUrl: string;
  idempotencyKey: string | null;
  sessionId: string | null;
  paymentRef: string | null;
  amount: string | null;
  currency: string | null;
  paymentUrl: string | null;
  authCode: string | null;
  codeExpiresAt: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | null;
  sessionStatus: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | null;
  token: string | null;
  tokenType: 'Bearer' | null;
  expiresAt: string | null;
  verifiedVisit: {
    sessionId: string;
    status: string;
    activatedAt?: string;
    expiresAt?: string;
    durationHours?: number;
  } | null;
}

const STORAGE_KEY = 'tcv_guest_session_v1';

export function getEmptyGuestSession(apiBaseUrl: string): StoredGuestSession {
  return {
    version: 1,
    apiBaseUrl,
    idempotencyKey: null,
    sessionId: null,
    paymentRef: null,
    amount: null,
    currency: null,
    paymentUrl: null,
    authCode: null,
    codeExpiresAt: null,
    paymentStatus: null,
    sessionStatus: null,
    token: null,
    tokenType: null,
    expiresAt: null,
    verifiedVisit: null
  };
}

export function generateUUIDv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function loadGuestSession(currentBaseUrl: string): {
  session: StoredGuestSession;
  mismatchedBaseUrl: boolean;
  storageError: string | null;
} {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return {
        session: getEmptyGuestSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: 'sessionStorage không khả dụng trên trình duyệt này'
      };
    }

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        session: getEmptyGuestSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: null
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredGuestSession>;
    if (!parsed || parsed.version !== 1) {
      return {
        session: getEmptyGuestSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: null
      };
    }

    const sessionBaseUrl = (parsed.apiBaseUrl || '').trim().replace(/\/+$/, '');
    const activeBaseUrl = currentBaseUrl.trim().replace(/\/+$/, '');

    if (sessionBaseUrl && sessionBaseUrl !== activeBaseUrl) {
      return {
        session: { ...getEmptyGuestSession(activeBaseUrl), ...parsed, apiBaseUrl: sessionBaseUrl },
        mismatchedBaseUrl: true,
        storageError: null
      };
    }

    return {
      session: { ...getEmptyGuestSession(activeBaseUrl), ...parsed, apiBaseUrl: activeBaseUrl },
      mismatchedBaseUrl: false,
      storageError: null
    };
  } catch (err: unknown) {
    return {
      session: getEmptyGuestSession(currentBaseUrl),
      mismatchedBaseUrl: false,
      storageError: err instanceof Error ? err.message : 'Lỗi đọc sessionStorage'
    };
  }
}

export function saveGuestSession(session: StoredGuestSession): { success: boolean; error: string | null } {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { success: false, error: 'sessionStorage không khả dụng' };
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Không thể lưu phiên vào sessionStorage'
    };
  }
}

export function clearGuestSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Bo qua loi don dep storage
  }
}
