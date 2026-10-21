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
  const { session } = loadInternalSession(apiBaseUrl);
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
      try {
        // Neu da co mot tien trinh refresh dang chay, dung chung Promise
        if (!activeRefreshPromise) {
          activeRefreshPromise = refreshInternal(session.refreshToken, apiBaseUrl)
            .finally(() => {
              activeRefreshPromise = null;
            });
        }

        const refreshed = await activeRefreshPromise;

        // Luu bo token moi
        saveInternalSession({
          version: 1,
          apiBaseUrl,
          user: refreshed.user,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken
        });

        // Gui lai yeu cau ban dau voi token moi dung 1 lan
        return await requestFn(refreshed.accessToken);
      } catch (refreshErr: unknown) {
        // Refresh that bai: xoa phien noi bo
        clearInternalSession();
        if (onUnrecoverableAuthError) onUnrecoverableAuthError();
        throw refreshErr;
      }
    }

    throw err;
  }
}
