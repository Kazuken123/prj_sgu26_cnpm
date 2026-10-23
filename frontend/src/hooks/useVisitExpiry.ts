import { useEffect, useRef } from 'react';

// A local deadline, not server polling. Recheck when a suspended tab resumes.
export function useVisitExpiry(expiresAt: string | null | undefined, onExpire: () => void) {
  const callback = useRef(onExpire);
  callback.current = onExpire;
  useEffect(() => {
    const deadline = Date.parse(expiresAt || '');
    if (!Number.isFinite(deadline)) return;
    let timer: ReturnType<typeof setTimeout>;
    let expired = false;
    const check = () => {
      clearTimeout(timer);
      if (expired) return;
      const remaining = deadline - Date.now();
      if (remaining <= 0) { expired = true; callback.current(); }
      else timer = setTimeout(check, Math.min(remaining, 2147483647));
    };
    check();
    window.addEventListener?.('focus', check);
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener?.('focus', check);
      if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', check);
    };
  }, [expiresAt]);
}
