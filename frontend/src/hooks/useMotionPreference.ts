import { useEffect, useLayoutEffect, useState } from 'react';

export function useMotionPreference() {
  const [deviceReduced, setDeviceReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [override, setOverride] = useState<boolean | null>(null);
  const reducedMotion = override ?? deviceReduced;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setDeviceReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduce' : 'full';
    return () => { delete document.documentElement.dataset.motion; };
  }, [reducedMotion]);

  // The override applies to this visit only; a reload follows the device again.
  return { reducedMotion, toggleMotion: () => setOverride(!reducedMotion) };
}
