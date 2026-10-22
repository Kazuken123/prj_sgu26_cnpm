import { useEffect, useRef } from 'react';

/** Content stays visible when motion or IntersectionObserver is unavailable. */
export function useScrollReveal(route: string, reducedMotion: boolean) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    let observer: IntersectionObserver | undefined;
    const reveal = (element: HTMLElement) => {
      element.classList.remove('reveal-pending');
      element.classList.add('reveal-visible');
      observer?.unobserve(element);
    };
    const configure = () => {
      observer?.disconnect();
      if (reducedMotion) {
        elements.forEach(reveal);
        return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      }, { threshold: 0.08 });
      elements.forEach(element => {
        if (element.classList.contains('reveal-visible')) return;
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight && bounds.bottom > 0) reveal(element);
        else {
          element.classList.add('reveal-pending');
          observer?.observe(element);
        }
      });
    };
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      elements.forEach(element => {
        if (element.contains(event.target as Node)) reveal(element);
      });
    };
    configure();
    root.addEventListener('focusin', revealFocused);
    return () => {
      observer?.disconnect();
      root.removeEventListener('focusin', revealFocused);
      elements.forEach(element => element.classList.remove('reveal-pending', 'reveal-visible'));
    };
  }, [route, reducedMotion]);

  return rootRef;
}
