import { useEffect } from 'react';
import { getApiBaseUrl, requestApi } from '../api/client';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function browserVisitorId(baseUrl: string): string | null {
  try {
    const key = 'tcv_online_browser_v1:' + baseUrl;
    const existing = window.localStorage.getItem(key);
    if (existing && uuid.test(existing)) return existing;
    const next = window.crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  } catch { return null; }
}
export function useVisitorOnline(enabled: boolean) {
  const baseUrl = getApiBaseUrl();
  useEffect(() => {
    if (!enabled || typeof document === 'undefined' || typeof window === 'undefined') return;
    const visitorId = browserVisitorId(baseUrl);
    if (!visitorId) return;
    let busy = false, stopped = false;
    const controller = new AbortController();
    const heartbeat = async () => {
      if (stopped || busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        await requestApi({ path: '/api/presence/heartbeat', method: 'POST', body: { visitorId }, overrideBaseUrl: baseUrl,
          signal: controller.signal, timeoutMs: 5000 });
      } catch { /* Optional estimate must never interrupt payment, maps or audio. */ }
      finally { busy = false; }
    };
    void heartbeat();
    const interval = window.setInterval(() => { void heartbeat(); }, 30000);
    const onVisibility = () => { void heartbeat(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stopped = true; controller.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [enabled, baseUrl]);
}
