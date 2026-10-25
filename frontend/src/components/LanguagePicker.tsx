import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import { useEffect, useId, useRef, useState, KeyboardEvent } from 'react';
import type { LanguageDto } from '../api/content';
import { Icon } from './Icon';

const vietnameseNames: Record<string, string> = {
  vi: 'Tiếng Việt', en: 'Tiếng Anh', 'zh-cn': 'Tiếng Trung (giản thể)', 'zh-hans': 'Tiếng Trung (giản thể)', zh: 'Tiếng Trung',
  ko: 'Tiếng Hàn', ja: 'Tiếng Nhật', ru: 'Tiếng Nga', fr: 'Tiếng Pháp', de: 'Tiếng Đức',
  es: 'Tiếng Tây Ban Nha', it: 'Tiếng Ý', nl: 'Tiếng Hà Lan', pl: 'Tiếng Ba Lan',
  pt: 'Tiếng Bồ Đào Nha', 'pt-br': 'Tiếng Bồ Đào Nha (Brazil)', tr: 'Tiếng Thổ Nhĩ Kỳ', cs: 'Tiếng Séc'
};

export function LanguagePicker({ languages, value, disabled, onChange }: {
  languages: LanguageDto[]; value: string; disabled: boolean; onChange: (code: string) => void;
}) {
  const { t, language: locale } = useVisitorLanguage();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = languages.findIndex(language => language.code === value);
  const current = languages[selected];
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };
  const show = (index = Math.max(0, selected)) => {
    if (disabled || !languages.length) return;
    setActive(index); setOpen(true);
  };
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!open) return;
    options.current[active]?.focus({ preventScroll: true });
    options.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (code: string) => { close(true); if (code !== value) onChange(code); };
  const onListKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') close(true);
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? languages.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + languages.length) % languages.length);
    }
  };
  return <div className="garden-language-picker" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close();
  }}>
    <button ref={trigger} className="garden-language-trigger" type="button" role="combobox" aria-label={t('Ngôn ngữ giao diện')}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={id} disabled={disabled || !languages.length}
      onClick={() => open ? close() : show()} onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); show(event.key === 'End' ? languages.length - 1 : event.key === 'Home' ? 0 : Math.max(0, selected));
        }
      }}><Icon name="globe" /><span>{current?.name || value}</span><Icon name="chevron" className="garden-language-chevron" /></button>
    {open && <div id={id} role="listbox" aria-label={t('Ngôn ngữ giao diện')} className="garden-language-menu" onKeyDown={onListKey}>
      {languages.map((language, index) => {
        let translated = vietnameseNames[language.code.toLowerCase()];
        if (locale !== 'vi') {
          try { translated = new Intl.DisplayNames([locale], { type: 'language' }).of(language.code) || language.name; }
          catch { translated = language.name; }
        }
        return <button ref={node => { options.current[index] = node; }} key={language.code} type="button" role="option"
          aria-selected={language.code === value} tabIndex={active === index ? 0 : -1} lang={language.code}
          className="garden-language-option" onClick={() => choose(language.code)}>
          <span><strong>{language.name}</strong>{translated && translated !== language.name && <small lang={locale}>{translated}</small>}</span>
          {language.code === value && <Icon name="check" />}
        </button>;
      })}
    </div>}
  </div>;
}
