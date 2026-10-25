import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getPublicMap, LanguageDto } from '../api/content';
import { normalizeVisitorLanguage, translateText, translateVisitorMessage, Translator, VISITOR_LANGUAGES, VISITOR_LANGUAGE_KEY } from './translate';

const defaults = {
  language: 'vi', languages: VISITOR_LANGUAGES as LanguageDto[],
  setLanguage: (_code: string) => {},
  t: ((source, values) => translateText(source, 'vi', values)) as Translator,
  message: (source: string | null | undefined) => translateVisitorMessage(source, 'vi')
};
const VisitorLanguageContext = createContext(defaults);
function savedLanguage() {
  try { return normalizeVisitorLanguage(window.localStorage.getItem(VISITOR_LANGUAGE_KEY)); }
  catch { return 'vi'; }
}

export function VisitorLanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname !== '/login' && !pathname.startsWith('/internal');
  const [selected, setSelected] = useState(savedLanguage);
  const [languages, setLanguages] = useState<LanguageDto[]>(VISITOR_LANGUAGES);
  const language = active ? selected : 'vi';
  const setLanguage = useCallback((code: string) => {
    const next = normalizeVisitorLanguage(code);
    setSelected(next);
    try { window.localStorage.setItem(VISITOR_LANGUAGE_KEY, next); } catch { /* Selection still works when storage is blocked. */ }
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void getPublicMap('vi', controller.signal).then(bundle => {
      if (controller.signal.aborted) return;
      const available = VISITOR_LANGUAGES.filter(item => bundle.languages.some(language => language.code.toLowerCase() === item.code.toLowerCase()));
      if (available.length) setLanguages(available);
    }).catch(() => { /* Packaged UI languages remain usable offline. */ });
    const synchronize = (event: StorageEvent) => {
      if (event.key === VISITOR_LANGUAGE_KEY || event.key === null) setSelected(savedLanguage());
    };
    window.addEventListener('storage', synchronize);
    return () => { controller.abort(); window.removeEventListener('storage', synchronize); };
  }, [active]);
  const t = useCallback<Translator>((source, values) => translateText(source, language, values), [language]);
  const message = useCallback((source: string | null | undefined) => translateVisitorMessage(source, language), [language]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.title = t('Thảo Cầm Viên Sài Gòn — Hệ Thống Thuyết Minh Đa Ngôn Ngữ');
  }, [language, t]);
  const value = useMemo(() => ({ language, languages, setLanguage, t, message }), [language, languages, setLanguage, t, message]);
  return <VisitorLanguageContext.Provider value={value}>{children}</VisitorLanguageContext.Provider>;
}
export const useVisitorLanguage = () => useContext(VisitorLanguageContext);

/** Keep emphasis and links while allowing each language to order placeholders naturally. */
export function VisitorText({ source, values }: { source: string; values: Record<string, ReactNode> }) {
  const { t } = useVisitorLanguage();
  return <>{t(source).split(/(\{\w+\})/g).map((part, index) =>
    <Fragment key={index}>{/^\{\w+\}$/.test(part) ? values[part.slice(1, -1)] ?? part : part}</Fragment>
  )}</>;
}
