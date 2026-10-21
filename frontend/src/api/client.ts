export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  overrideBaseUrl?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  data?: unknown;

  constructor({
    status,
    code,
    message,
    data
  }: {
    status: number;
    code: string;
    message: string;
    data?: unknown;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location?.protocol || '')) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:18080';
}

export async function requestApi<T>({
  method = 'GET',
  path,
  body,
  token,
  headers: customHeaders,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  overrideBaseUrl
}: ApiRequestOptions): Promise<ApiResponse<T>> {
  const baseUrl = (overrideBaseUrl ? overrideBaseUrl.trim().replace(/\/+$/, '') : getApiBaseUrl());
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;

  const headers: Record<string, string> = {};

  // Gắn các header bổ sung nếu có (ví dụ Idempotency-Key)
  if (customHeaders) {
    for (const [key, val] of Object.entries(customHeaders)) {
      if (val !== undefined && val !== null) {
        headers[key] = String(val);
      }
    }
  }

  // Gắn Authorization: Bearer chỉ khi bên gọi truyền token rõ ràng
  // Không tự ý lấy token từ kho chung
  if (token && typeof token === 'string' && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  // Chỉ gắn Content-Type: application/json khi thực sự gửi body JSON
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  let isTimedOut = false;

  const timer = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        controller.abort();
      }, { once: true });
    }
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timer);

    // Xử lý HTTP 204 No Content
    if (res.status === 204) {
      return { data: null as unknown as T, status: 204 };
    }

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (res.ok) {
      if (isJson) {
        const json = await res.json();
        return { data: json as T, status: res.status };
      }
      const text = await res.text();
      return { data: text as unknown as T, status: res.status };
    }

    // Xử lý lỗi HTTP
    if (isJson) {
      const errJson = await res.json().catch(() => ({}));
      const code = typeof errJson.code === 'string' ? errJson.code : 'HTTP_ERROR';
      const errorMessage = typeof errJson.error === 'string' ? errJson.error : `Lỗi HTTP ${res.status}`;
      throw new ApiError({
        status: res.status,
        code,
        message: errorMessage,
        data: errJson
      });
    }

    const errText = await res.text().catch(() => '');
    throw new ApiError({
      status: res.status,
      code: 'HTTP_ERROR',
      message: errText.trim().length > 0 ? errText : `Lỗi máy chủ trả về mã HTTP ${res.status}`
    });
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof ApiError) {
      throw err;
    }

    if (controller.signal.aborted) {
      if (isTimedOut) {
        throw new ApiError({
          status: 0,
          code: 'TIMEOUT_ERROR',
          message: `Hết thời gian chờ phản hồi (${Math.round(timeoutMs / 1000)} giây). Máy chủ không kịp phản hồi.`
        });
      }
      throw new ApiError({
        status: 0,
        code: 'ABORT_ERROR',
        message: 'Yêu cầu gọi máy chủ đã bị hủy.'
      });
    }

    // Lỗi mạng hoặc không thể kết nối
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: `Không thể kết nối đến máy chủ tại ${baseUrl}. Vui lòng kiểm tra trạng thái hoạt động của backend, cấu hình CORS hoặc kết nối mạng.`
    });
  }
}
