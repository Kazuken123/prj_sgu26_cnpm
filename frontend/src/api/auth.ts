import { requestApi, ApiError } from './client.ts';
import type { InternalUser } from './authStorage.ts';
import { loadInternalSession, saveInternalSession, clearInternalSession } from './authStorage.ts';

export interface LoginResponseData {
  user: InternalUser;
  accessToken: string;
  refreshToken: string;
}

export interface CreateStaffInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface CreatedStaffData {
  userId: number;
  email: string;
  fullName: string;
  role: 'STAFF';
  status: 'ACTIVE';
}

interface BackendEnvelope<T> {
  message?: string;
  data: T;
}

// 1. Dang nhap noi bo
export async function loginInternal(
  input: { email: string; password: string },
  overrideBaseUrl?: string
): Promise<LoginResponseData> {
  const res = await requestApi<BackendEnvelope<LoginResponseData>>({
    method: 'POST',
    path: '/api/auth/login',
    body: input,
    overrideBaseUrl
  });

  return res.data.data;
}

// 2. Lay thong tin tai khoan hien tai
export async function getAuthMe(
  accessToken: string,
  overrideBaseUrl?: string
): Promise<InternalUser> {
  const res = await requestApi<BackendEnvelope<InternalUser>>({
    method: 'GET',
    path: '/api/auth/me',
    token: accessToken,
    overrideBaseUrl
  });

  return res.data.data;
}

// 3. Lam moi phien noi bo bang refresh token
export async function refreshInternal(
  refreshToken: string,
  overrideBaseUrl?: string
): Promise<LoginResponseData> {
  const res = await requestApi<BackendEnvelope<LoginResponseData>>({
    method: 'POST',
    path: '/api/auth/refresh',
    body: { refreshToken },
    overrideBaseUrl
  });

  return res.data.data;
}

// 4. Dang xuat noi bo (POST /api/auth/logout, tra ve 204 No Content)
export async function logoutInternal(
  { accessToken, refreshToken }: { accessToken?: string | null; refreshToken?: string | null },
  overrideBaseUrl?: string
): Promise<void> {
  await requestApi<null>({
    method: 'POST',
    path: '/api/auth/logout',
    token: accessToken || undefined,
    body: refreshToken ? { refreshToken } : {},
    overrideBaseUrl
  });
}

// Keep credentials available for retry until the server acknowledges logout.
export async function logoutStoredInternalSession(apiBaseUrl: string): Promise<void> {
  const { session } = loadInternalSession(apiBaseUrl);
  await logoutInternal(session, apiBaseUrl);
  clearInternalSession();
}

// 5. Quan tri vien tao tai khoan nhan vien moi (POST /api/admin/staff)
export async function createStaffAccount(
  accessToken: string,
  input: CreateStaffInput,
  overrideBaseUrl?: string
): Promise<CreatedStaffData> {
  const res = await requestApi<BackendEnvelope<CreatedStaffData>>({
    method: 'POST',
    path: '/api/admin/staff',
    token: accessToken,
    body: input,
    overrideBaseUrl
  });

  return res.data.data;
}

// 6. Goi request noi bo co co che refresh token xoay vong tu dong dung 1 lan
let activeRefreshPromise: Promise<LoginResponseData> | null = null;

export async function executeAuthenticatedInternalRequest<T>(
  apiBaseUrl: string,
  requestFn: (currentAccessToken: string) => Promise<T>,
  onUnrecoverableAuthError?: () => void
): Promise<T> {
  const { session, mismatchedBaseUrl } = loadInternalSession(apiBaseUrl);
  if (mismatchedBaseUrl) {
    throw new ApiError({ status: 401, code: 'SESSION_BACKEND_MISMATCH',
      message: 'Phiên nội bộ thuộc máy chủ khác. Hãy đăng nhập lại trên máy chủ hiện tại.' });
  }
  if (!session.accessToken) {
    if (onUnrecoverableAuthError) onUnrecoverableAuthError();
    throw new ApiError({
      status: 401,
      code: 'MISSING_ACCESS_TOKEN',
      message: 'Chưa có phiên làm việc nội bộ.'
    });
  }

  try {
    return await requestFn(session.accessToken);
  } catch (err: unknown) {
    // Chi thu refresh neu loi la token het han hoac khong hop le
    if (
      err instanceof ApiError &&
      (err.code === 'INVALID_ACCESS_TOKEN' || err.code === 'SESSION_REVOKED') &&
      session.refreshToken
    ) {
      // Another request may already have rotated the credentials while this
      // request's old-token response was still in flight.
      const latest = loadInternalSession(apiBaseUrl).session;
      if (latest.accessToken && latest.accessToken !== session.accessToken) {
        return requestFn(latest.accessToken);
      }
      let refreshed: LoginResponseData;
      try {
        // Neu da co mot tien trinh refresh dang chay, dung chung Promise
        if (!activeRefreshPromise) {
          activeRefreshPromise = refreshInternal(session.refreshToken, apiBaseUrl)
            .finally(() => {
              activeRefreshPromise = null;
            });
        }

        refreshed = await activeRefreshPromise;
      } catch (refreshErr: unknown) {
        // A network/503 error does not prove the refresh credentials invalid.
        if (refreshErr instanceof ApiError && [401, 403].includes(refreshErr.status)) {
          clearInternalSession();
          if (onUnrecoverableAuthError) onUnrecoverableAuthError();
        }
        throw refreshErr;
      }
      saveInternalSession({ version: 1, apiBaseUrl, user: refreshed.user,
        accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken });
      // A business error on the retried request must not erase a valid login.
      return requestFn(refreshed.accessToken);
    }

    throw err;
  }
}
