import { useSettings } from '../state/settingsStore';

export const locale = (lang: string) => (lang === 'cs' ? 'cs-CZ' : 'en-GB');

export function useFmt() {
  const lang = useSettings((s) => s.settings.language);
  const nf = new Intl.NumberFormat(locale(lang), { useGrouping: true });
  const df = new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  const tf = new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' });
  return {
    n: (v: number) => nf.format(v).replace(/\u00a0/g, '\u2009'),
    date: (ms: number) => df.format(ms),
    time: (ms: number) => tf.format(ms)
  };
}

export const mmss = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const countsLabel = (counts: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, number>>): string =>
  ([1, 2, 3, 4, 5, 6] as const)
    .filter((f) => (counts[f] ?? 0) > 0)
    .map((f) => ((counts[f] ?? 0) === 1 ? `${f}` : `${counts[f]}×${f}`))
    .join('+');
