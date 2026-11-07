// Admin-only design system primitives. Used exclusively inside the internal
// workspace (/internal/*); visitor pages never import this module.
import React, { useEffect, useId, useRef } from 'react';
import { Icon } from '../Icon';

type IconName = React.ComponentProps<typeof Icon>['name'];
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const AdminPage: React.FC<{ children: React.ReactNode; width?: 'default' | 'narrow' | 'wide'; className?: string }> = ({ children, width = 'default', className }) => (
  <div className={cx('adm-page', width !== 'default' && `adm-page--${width}`, className)}>{children}</div>
);

export const PageHeader: React.FC<{ title: React.ReactNode; description?: React.ReactNode; eyebrow?: React.ReactNode; actions?: React.ReactNode }> = ({ title, description, eyebrow, actions }) => (
  <header className="adm-page-header">
    <div className="adm-page-header__text">
      {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="adm-page-header__desc">{description}</p>}
    </div>
    {actions && <div className="adm-page-header__actions">{actions}</div>}
  </header>
);

export const Card: React.FC<{ title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string; flush?: boolean; as?: 'section' | 'div' | 'aside' }> = ({ title, description, actions, children, className, flush, as = 'section' }) => {
  const Tag = as;
  return <Tag className={cx('adm-card', flush && 'adm-card--flush', className)}>
    {(title || actions) && <div className="adm-card__head">
      <div>{title && <h2 className="adm-card__title">{title}</h2>}{description && <p className="adm-card__desc">{description}</p>}</div>
      {actions && <div className="adm-card__actions">{actions}</div>}
    </div>}
    {children}
  </Tag>;
};

const alertIcon: Record<Tone, IconName> = { neutral: 'info', info: 'info', brand: 'info', success: 'check', warning: 'clock', danger: 'info' };
export const Alert: React.FC<{ tone?: Tone; title?: React.ReactNode; children?: React.ReactNode; onDismiss?: () => void; action?: React.ReactNode }> = ({ tone = 'info', title, children, onDismiss, action }) => (
  <div className={cx('adm-alert', `adm-alert--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
    <Icon name={alertIcon[tone]} className="adm-alert__icon" />
    <div className="adm-alert__body">{title && <strong>{title}</strong>}{children && <div>{children}</div>}</div>
    {action}
    {onDismiss && <button type="button" className="adm-icon-btn adm-alert__close" onClick={onDismiss} aria-label="Đóng thông báo"><Icon name="close" /></button>}
  </div>
);

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: boolean; title?: string }> = ({ tone = 'neutral', children, dot, title }) => (
  <span className={cx('adm-badge', `adm-badge--${tone}`)} title={title}>{dot && <i aria-hidden="true" />}{children}</span>
);

const statusTones: Record<string, Tone> = {
  ACTIVE: 'success', PAID: 'success', COMPLETED: 'success', READY: 'success', AVAILABLE: 'success', SUCCESS: 'success', UP: 'success', OK: 'success',
  PENDING: 'warning', PROCESSING: 'info', QUEUED: 'warning', NO_CONTEXT: 'warning',
  INACTIVE: 'neutral', REVOKED: 'danger', FAILED: 'danger', ERROR: 'danger', EXPIRED: 'neutral', DOWN: 'danger',
};
export const toneForStatus = (status?: string | null): Tone => (status && statusTones[status]) || 'neutral';
export const StatusBadge: React.FC<{ status?: string | null; label?: React.ReactNode }> = ({ status, label }) => (
  <Badge tone={toneForStatus(status)} dot>{label ?? status ?? '—'}</Badge>
);

export const StatCard: React.FC<{ label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: IconName; tone?: Tone; className?: string }> = ({ label, value, hint, icon, tone = 'neutral', className }) => (
  <div className={cx('adm-stat', `adm-stat--${tone}`, className)}>
    <div className="adm-stat__top"><span className="adm-stat__label">{label}</span>{icon && <span className="adm-stat__icon"><Icon name={icon} /></span>}</div>
    <strong className="adm-stat__value">{value}</strong>
    {hint && <span className="adm-stat__hint">{hint}</span>}
  </div>
);

export const EmptyState: React.FC<{ icon?: IconName; title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }> = ({ icon = 'search', title, children, action }) => (
  <div className="adm-empty"><span className="adm-empty__icon"><Icon name={icon} /></span><strong>{title}</strong>{children && <p>{children}</p>}{action}</div>
);

export const LoadingState: React.FC<{ label?: React.ReactNode }> = ({ label = 'Đang tải dữ liệu…' }) => (
  <div className="adm-loading" role="status" aria-live="polite"><span className="adm-spinner" aria-hidden="true" />{label}</div>
);

export const Pagination: React.FC<{ page: number; totalPages: number; summary?: React.ReactNode; disabled?: boolean; onChange: (page: number) => void; prevLabel?: string; nextLabel?: string }> = ({ page, totalPages, summary, disabled, onChange, prevLabel = '← Trang trước', nextLabel = 'Trang sau →' }) => (
  <nav className="adm-pagination" aria-label="Phân trang">
    <span className="adm-pagination__summary">{summary}</span>
    <span className="adm-pagination__page">Trang <strong>{page}</strong> / <strong>{Math.max(1, totalPages)}</strong></span>
    <div className="adm-pagination__buttons">
      <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1}>{prevLabel}</button>
      <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages}>{nextLabel}</button>
    </div>
  </nav>
);

export const Field: React.FC<{ label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean; children: React.ReactNode; className?: string }> = ({ label, htmlFor, hint, error, required, children, className }) => (
  <div className={cx('adm-field', !!error && 'adm-field--invalid', className)}>
    <label htmlFor={htmlFor}>{label}{required && <span className="adm-required" aria-hidden="true"> *</span>}</label>
    {children}
    {error ? <p className="adm-field__error" role="alert">{error}</p> : hint ? <p className="adm-field__hint">{hint}</p> : null}
  </div>
);

export const DescriptionList: React.FC<{ items: Array<{ label: React.ReactNode; value: React.ReactNode; mono?: boolean }>; columns?: 1 | 2 }> = ({ items, columns = 2 }) => (
  <dl className={cx('adm-dl', columns === 1 && 'adm-dl--single')}>
    {items.map((item, index) => <div key={index}><dt>{item.label}</dt><dd className={item.mono ? 'adm-mono' : undefined}>{item.value}</dd></div>)}
  </dl>
);

// Accessible confirmation dialog: focus moves into the dialog, Escape cancels
// (unless busy), focus returns to the opener when it closes.
export const ConfirmDialog: React.FC<{ open: boolean; title: React.ReactNode; children?: React.ReactNode; confirmLabel: React.ReactNode; cancelLabel?: React.ReactNode;
  tone?: 'danger' | 'primary'; busy?: boolean; busyLabel?: React.ReactNode; onConfirm: () => void; onCancel: () => void; confirmDisabled?: boolean }> =
({ open, title, children, confirmLabel, cancelLabel = 'Hủy bỏ', tone = 'primary', busy, busyLabel = 'Đang xử lý…', onConfirm, onCancel, confirmDisabled }) => {
  const titleId = useId(), panelRef = useRef<HTMLDivElement | null>(null), openerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    openerRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus?.();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onCancel(); };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('keydown', onKey);
    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('keydown', onKey);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, busy, onCancel]);
  if (!open) return null;
  return <div className="adm-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div className={cx('adm-dialog', tone === 'danger' && 'adm-dialog--danger')} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}
      onKeyDown={event => {
        // Keep keyboard focus inside the modal: Tab / Shift+Tab wrap around.
        if (event.key !== 'Tab' || !panelRef.current) return;
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
        if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="adm-dialog__head">
        <span className="adm-dialog__icon"><Icon name={tone === 'danger' ? 'info' : 'check'} /></span>
        <h2 id={titleId}>{title}</h2>
      </div>
      <div className="adm-dialog__body">{children}</div>
      <div className="adm-dialog__foot">
        <button type="button" className="adm-btn adm-btn--secondary" onClick={onCancel} disabled={busy} data-autofocus>{cancelLabel}</button>
        <button type="button" className={cx('adm-btn', tone === 'danger' ? 'adm-btn--danger' : 'adm-btn--primary')} onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? busyLabel : confirmLabel}</button>
      </div>
    </div>
  </div>;
};
