import { getApiBaseUrl, ApiError } from './client.ts';

export interface FetchAudioOptions {
  audioUrl: string;
  token: string;
  signal?: AbortSignal;
  overrideBaseUrl?: string;
}

export async function fetchAudioBlob({
  audioUrl,
  token,
  signal,
  overrideBaseUrl
}: FetchAudioOptions): Promise<Blob> {
  const baseUrl = (overrideBaseUrl ? overrideBaseUrl.trim().replace(/\/+$/, '') : getApiBaseUrl());

  // Xu ly URL tuong doi va tuyet doi
  let fullUrl: string;
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    // Neu la URL tuyet doi, kiem tra co thuoc origin backend cho phep khong
    const parsedTarget = new URL(audioUrl);
    const parsedBase = new URL(baseUrl);
    if (parsedTarget.origin !== parsedBase.origin) {
      throw new ApiError({
        status: 400,
        code: 'UNTRUSTED_MEDIA_HOST',
        message: 'Không được gửi token xác thực tới máy chủ media không xác định.'
      });
    }
    fullUrl = audioUrl;
  } else {
    const cleanPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
    fullUrl = `${baseUrl}${cleanPath}`;
  }

  // Khong truyen token qua query string, chi qua header Authorization
  const headers: Record<string, string> = {};
  if (token && typeof token === 'string' && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  } else {
    throw new ApiError({
      status: 401,
      code: 'VISITOR_TOKEN_REQUIRED',
      message: 'Cần token khách tham quan để tải tệp âm thanh.'
    });
  }

  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers,
      signal
    });

    if (!res.ok) {
      // Xu ly loi HTTP: doc json loi neu co
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errJson = await res.json().catch(() => ({}));
        throw new ApiError({
          status: res.status,
          code: typeof errJson.code === 'string' ? errJson.code : 'MEDIA_HTTP_ERROR',
          message: typeof errJson.error === 'string' ? errJson.error : `Lỗi tải tệp âm thanh mã HTTP ${res.status}`,
          data: errJson
        });
      }

      const errText = await res.text().catch(() => '');
      throw new ApiError({
        status: res.status,
        code: 'MEDIA_HTTP_ERROR',
        message: errText.trim().length > 0 ? errText : `Máy chủ từ chối yêu cầu tệp âm thanh với mã HTTP ${res.status}`
      });
    }

    const contentType = res.headers.get('content-type') || '';
    // Kiem tra dung kieu noi dung audio/wav, khong bien JSON thanh Blob audio
    if (!contentType.includes('audio')) {
      throw new ApiError({
        status: 200,
        code: 'INVALID_MEDIA_CONTENT_TYPE',
        message: `Định dạng phản hồi không phải âm thanh hợp lệ (${contentType || 'không rõ'}).`
      });
    }

    return await res.blob();
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    if (signal?.aborted) {
      throw new ApiError({
        status: 0,
        code: 'ABORT_ERROR',
        message: 'Yêu cầu tải tệp âm thanh đã bị hủy.'
      });
    }

    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không thể tải tệp âm thanh từ máy chủ. Vui lòng kiểm tra kết nối mạng.'
    });
  }
}
