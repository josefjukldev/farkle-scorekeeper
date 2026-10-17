import { useSettings } from '../state/settingsStore';
import { en } from './en';
import { cs } from './cs';

export type Dict = Record<string, string>;
const dicts: Record<'en' | 'cs', Dict> = { en, cs };

export function translate(lang: 'en' | 'cs', key: string, params?: Record<string, string | number>): string {
  const raw = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (!params) return raw;
  // plural forms: {n:one|other} (en) or {n:one|few|other} (cs)
  const plural = raw.replace(/\{(\w+):([^}]+)\}/g, (_, k: string, forms: string) => {
    const f = forms.split('|');
    const n = Number(params[k] ?? 0);
    const i = n === 1 ? 0 : lang === 'cs' && n >= 2 && n <= 4 ? 1 : f.length - 1;
    return f[Math.min(i, f.length - 1)];
  });
  return plural.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
}

export function useT() {
  const lang = useSettings((s) => s.settings.language);
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}
