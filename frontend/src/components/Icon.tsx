import React from 'react';

const paths = {
  play: 'M8 4l12 8-12 8V4Z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  repeat: 'M4 10a8 8 0 1 1 1 8M4 4v6h6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  close: 'M6 6l12 12M6 18 18 6',
  chevron: 'M8 4l8 8-8 8',

  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Zm-5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  paw: 'M8 14c2-4 6-4 8 0 5 7-1 7-4 5-3 2-9 2-4-5ZM7 7a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm6-3a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm5 1a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm5 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0Z',
  leaf: 'M20 4C10 2 3 7 5 14c2 7 12 7 15-10ZM4 21 15 10M9 16v-5M9 16h5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  headphones: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v.1',
  lock: 'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4m-3 5v2',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-6-3-2 4-4 2 2-4 4-2Z',
  check: 'M5 12l4 4L19 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  chat: 'M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0ZM7 10h10M7 14h6',
  book: 'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1m0-16c3-2 7-2 10-1v16c-3-1-7-1-10 1V5Z',
};

export const iconPaths = paths;

export const Icon: React.FC<{ name: keyof typeof paths; className?: string }> = ({ name, className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
);
