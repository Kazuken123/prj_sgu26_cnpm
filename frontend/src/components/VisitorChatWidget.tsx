import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import { PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { VisitorChat } from './VisitorChat';

type Point = { x: number; y: number };
const viewport = () => typeof window === 'undefined' ? { width: 1024, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

export function VisitorChatWidget(props: {
  token: string | null; baseUrl: string; onSessionExpired: () => void;
}) {
  const { t } = useVisitorLanguage();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const [size, setSize] = useState(viewport);
  const [dragging, setDragging] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number }>();
  const launcher = useRef<HTMLButtonElement>(null), minimize = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; start: Point; origin: Point; width: number; height: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const resize = () => {
      const next = viewport(); setSize(next);
      setPosition(previous => previous && ({ x: clamp(previous.x, 8, next.width - (launcher.current?.offsetWidth || 140) - 8),
        y: clamp(previous.y, 8, next.height - (launcher.current?.offsetHeight || 54) - 8) }));
    };
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useLayoutEffect(() => {
    if (!open || !launcher.current) return;
    const rect = launcher.current.getBoundingClientRect();
    const width = Math.min(390, size.width - 24);
    const above = rect.top - 24, below = size.height - rect.bottom - 24;
    const height = Math.min(580, Math.max(above, below) >= 300 ? Math.max(above, below) : size.height - 24);
    const top = above >= below ? rect.top - height - 12 : rect.bottom + 12;
    setBox({ width, height, left: clamp(rect.right - width, 12, size.width - width - 12), top: clamp(top, 12, size.height - height - 12) });
  }, [open, position, size]);
  useEffect(() => { if (open) minimize.current?.focus(); }, [open]);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x: rect.left, y: rect.top }, width: rect.width, height: rect.height, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.start.x, dy = event.clientY - active.start.y;
    if (!active.moved && Math.hypot(dx, dy) < 6) return;
    active.moved = true; setDragging(true);
    setPosition({ x: clamp(active.origin.x + dx, 8, size.width - active.width - 8), y: clamp(active.origin.y + dy, 8, size.height - active.height - 8) });
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = !cancelled && gesture.current.moved;
    gesture.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <aside className="garden-chat-widget" aria-label={t("Trợ lý tham quan")}
    style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}>
    <section id="visitor-chat-window" className="garden-chat-window" role="dialog" aria-labelledby="visitor-chat-title" hidden={!open} style={box}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className="garden-chat-header">
        <span className="garden-chat-avatar" aria-hidden="true"><Icon name="chat" /></span>
        <div><h2 id="visitor-chat-title">{t("Hỏi đáp khu vườn")}</h2><p>{t("Trợ lý tham quan · Có nguồn tham khảo")}</p></div>
        <button ref={minimize} type="button" className="garden-chat-minimize" aria-label={t("Thu gọn trò chuyện")} onClick={close}><Icon name="close" /></button>
      </header>
      <VisitorChat {...props} open={open} />
    </section>
    <button ref={launcher} className={`garden-chat-launcher${dragging ? ' is-dragging' : ''}`} type="button"
      aria-label={open ? t("Thu gọn trò chuyện") : t("Mở chat hỏi đáp")} aria-expanded={open} aria-controls="visitor-chat-window"
      title={t("Kéo để di chuyển · Bấm để trò chuyện · Alt + phím mũi tên để di chuyển")}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)}
      onKeyDown={event => {
        if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ x: clamp(rect.left + (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0), 8, size.width - rect.width - 8),
          y: clamp(rect.top + (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0), 8, size.height - rect.height - 8) });
      }}
      onClick={event => { if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; } open ? close() : setOpen(true); }}>
      <Icon name={open ? 'close' : 'chat'} />
    </button>
  </aside>;
}
