export interface InternalUser {
  id: number;
  email: string;
  fullName: string | null;
  role: 'STAFF' | 'ADMIN';
  status: string;
}

export interface StoredInternalSession {
  version: 1;
  apiBaseUrl: string;
  user: InternalUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const INTERNAL_STORAGE_KEY = 'tcv_internal_session_v1';

export function getEmptyInternalSession(apiBaseUrl: string): StoredInternalSession {
  return {
    version: 1,
    apiBaseUrl,
    user: null,
    accessToken: null,
    refreshToken: null
  };
}

export function loadInternalSession(currentBaseUrl: string): {
  session: StoredInternalSession;
  mismatchedBaseUrl: boolean;
  storageError: string | null;
} {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return {
        session: getEmptyInternalSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: 'sessionStorage không khả dụng'
      };
    }

    const raw = window.sessionStorage.getItem(INTERNAL_STORAGE_KEY);
    if (!raw) {
      return {
        session: getEmptyInternalSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: null
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredInternalSession>;
    if (!parsed || parsed.version !== 1) {
      return {
        session: getEmptyInternalSession(currentBaseUrl),
        mismatchedBaseUrl: false,
        storageError: null
      };
    }

    const sessionBaseUrl = (parsed.apiBaseUrl || '').trim().replace(/\/+$/, '');
    const activeBaseUrl = currentBaseUrl.trim().replace(/\/+$/, '');

    if (sessionBaseUrl && sessionBaseUrl !== activeBaseUrl) {
      return {
        session: { ...getEmptyInternalSession(activeBaseUrl), ...parsed, apiBaseUrl: sessionBaseUrl },
        mismatchedBaseUrl: true,
        storageError: null
      };
    }

    return {
      session: { ...getEmptyInternalSession(activeBaseUrl), ...parsed, apiBaseUrl: activeBaseUrl },
      mismatchedBaseUrl: false,
      storageError: null
    };
  } catch (err: unknown) {
    return {
      session: getEmptyInternalSession(currentBaseUrl),
      mismatchedBaseUrl: false,
      storageError: err instanceof Error ? err.message : 'Lỗi đọc sessionStorage'
    };
  }
}

export function saveInternalSession(session: StoredInternalSession): { success: boolean; error: string | null } {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { success: false, error: 'sessionStorage không khả dụng' };
    }
    window.sessionStorage.setItem(INTERNAL_STORAGE_KEY, JSON.stringify(session));
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Không thể lưu phiên nội bộ'
    };
  }
}

export function clearInternalSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(INTERNAL_STORAGE_KEY);
    }
  } catch {
    // Bo qua loi xoa
  }
}
