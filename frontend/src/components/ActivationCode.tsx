import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import { useRef } from 'react';

// Six ordinary inputs support paste, password-manager autofill and keyboard editing.
// The request still submits exactly the same single six-digit value as before.
export function ActivationCode({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { t } = useVisitorLanguage();
  const fields = useRef<Array<HTMLInputElement | null>>([]);
  const insert = (input: string, index: number) => {
    if (!/^\d*$/.test(input)) return;
    if (input.length > 1) {
      const start = input.length >= 6 ? 0 : index;
      const next = (value.slice(0, start) + input + value.slice(start + input.length)).slice(0, 6);
      onChange(next); fields.current[Math.min(start + input.length, 5)]?.focus();
    } else if (input) {
      // Keep the state contiguous: an empty later cell cannot create invisible gaps.
      const position = Math.min(index, value.length);
      onChange((value.slice(0, position) + input + value.slice(position + 1)).slice(0, 6));
      fields.current[Math.min(position + 1, 5)]?.focus();
    } else onChange(value.slice(0, index) + value.slice(index + 1));
  };
  return <div className="garden-code-input" role="group" aria-label={t("Mã kích hoạt gồm 6 chữ số")}>{Array.from({ length: 6 }, (_, index) => <input key={index} id={index === 0 ? 'cash-code' : undefined} ref={el => { fields.current[index] = el; }} type="text" inputMode="numeric" pattern="[0-9]" autoComplete={index === 0 ? 'one-time-code' : 'off'} aria-label={t("Chữ số {0}", { 0: index + 1 })} value={value[index] || ''} disabled={disabled} required onFocus={e => e.currentTarget.select()} onChange={e => insert(e.target.value, index)} onPaste={e => { e.preventDefault(); insert(e.clipboardData.getData('text').trim(), index); }} onKeyDown={e => {
    if (e.key === 'Backspace' && !value[index] && index > 0) { e.preventDefault(); onChange(value.slice(0, index - 1) + value.slice(index)); fields.current[index - 1]?.focus(); }
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); fields.current[index - 1]?.focus(); }
    if (e.key === 'ArrowRight' && index < 5) { e.preventDefault(); fields.current[index + 1]?.focus(); }
  }} />)}</div>;
}
