import { catalogs } from './catalogs';

export const VISITOR_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'English' },
  { code: 'cs', name: 'Čeština' }, { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' }, { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }, { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' }, { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'ru', name: 'Русский' }, { code: 'tr', name: 'Türkçe' },
  { code: 'zh-Hans', name: '简体中文' }
];
export const VISITOR_LANGUAGE_KEY = 'tcv.visitor.language';
export type TranslationValues = Record<string, string | number | null | undefined>;
export type Translator = (source: string, values?: TranslationValues) => string;
export function normalizeVisitorLanguage(code: string | null | undefined) {
  const normalized = code?.toLowerCase();
  const alias = normalized === 'zh' || normalized === 'zh-cn' ? 'zh-hans' : normalized === 'pt' ? 'pt-br' : normalized;
  return VISITOR_LANGUAGES.find(language => language.code.toLowerCase() === alias)?.code || 'vi';
}
const canonical = new Map(Object.keys(catalogs.vi).map(key => [key.toLocaleLowerCase('vi'), key]));
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.keys(catalogs.vi).filter(key => /\{\w+\}/.test(key)).map(key => {
  const names: string[] = [];
  const parts = key.split(/(\{\w+\})/g).map(part => {
    if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
    return escape(part);
  });
  return { key, names, pattern: new RegExp('^' + parts.join('') + '$') };
});

export function translateText(source: string, language = 'vi', values: TranslationValues = {}): string {
  const catalog = catalogs[normalizeVisitorLanguage(language)] || catalogs.vi;
  const text = source.trim();
  let key = canonical.get(text.toLocaleLowerCase('vi')) || text;
  let parameters = values;
  if (!(key in catalogs.vi)) {
    for (const template of templates) {
      const match = template.pattern.exec(text);
      if (match) {
        key = template.key;
        parameters = { ...Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]])), ...values };
        break;
      }
    }
  }
  const translated = (catalog[key] || key).replace(/\{(\w+)\}/g, (placeholder: string, name: string) => {
    const value = parameters[name];
    if (value === undefined || value === null) return placeholder;
    const string = String(value), canonicalValue = canonical.get(string.toLocaleLowerCase('vi'));
    return canonicalValue ? catalog[canonicalValue] || string : string;
  });
  return source.slice(0, source.indexOf(text)) + translated + source.slice(source.indexOf(text) + text.length);
}

export function translateVisitorMessage(source: string | null | undefined, language: string) {
  if (!source) return '';
  const result = translateText(source, language);
  if (language === 'vi' || result !== source) return result;
  return translateText('Chưa thể hoàn tất. Vui lòng thử lại hoặc nhờ nhân viên hỗ trợ.', language);
}
