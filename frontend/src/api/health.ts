import { requestApi, ApiError } from './client.ts';

export interface HealthReadySuccessResponse {
  status: string;
  service: string;
  database?: string;
  redis?: string;
  [key: string]: unknown;
}

export type ReadinessState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      httpStatus: 200;
      data: HealthReadySuccessResponse;
      checkedAt: string;
    }
  | {
      status: 'unready';
      httpStatus: 503;
      code: string;
      message: string;
      checkedAt: string;
      details?: Record<string, unknown>;
    }
  | {
      status: 'error';
      httpStatus: number;
      code: string;
      message: string;
      checkedAt: string;
    };

export async function checkBackendReadiness(overrideBaseUrl?: string, signal?: AbortSignal): Promise<ReadinessState> {
  const checkedAt = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  try {
    const res = await requestApi<HealthReadySuccessResponse>({
      method: 'GET',
      path: '/health/ready',
      signal,
      timeoutMs: 10000,
      overrideBaseUrl
    });

    return {
      status: 'ready',
      httpStatus: 200,
      data: res.data,
      checkedAt
    };
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 503) {
        return {
          status: 'unready',
          httpStatus: 503,
          code: err.code,
          message: err.message,
          checkedAt,
          details: typeof err.data === 'object' && err.data !== null ? (err.data as Record<string, unknown>) : undefined
        };
      }

      return {
        status: 'error',
        httpStatus: err.status,
        code: err.code,
        message: err.message,
        checkedAt
      };
    }

    return {
      status: 'error',
      httpStatus: 0,
      code: 'UNKNOWN_ERROR',
      message: err instanceof Error ? err.message : 'Lỗi không xác định khi kiểm tra kết nối.',
      checkedAt
    };
  }
}
