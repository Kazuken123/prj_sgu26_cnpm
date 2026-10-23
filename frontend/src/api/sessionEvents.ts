// Notify this tab without putting credentials into event payloads.
export const INTERNAL_SESSION_CHANGED = 'tcv:internal-session-changed';
export const GUEST_SESSION_CHANGED = 'tcv:guest-session-changed';
export function notifySessionChanged(name: string): void {
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event(name));
}
