import { useLayoutEffect } from 'react';

export function useMotionPreference() {
  // Product preference: keep motion enabled, including after reload.
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = 'full';
    return () => { delete document.documentElement.dataset.motion; };
  }, []);

  return { reducedMotion: false };
}
