import { useEffect } from 'react';

/**
 * Warns before closing or reloading the tab while an admin form has unsaved
 * input. Same browser-native prompt as the POI editor; no-op when clean.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
