import { useEffect, useState } from 'react';
import { Sheet } from '../components';
import { listArchive, listRecentPlayers } from '../../storage/repo';
import { useSettings } from '../../state/settingsStore';
import { useT } from '../../i18n';

/** "Count Tomas as Tom": merges two spellings in the statistics without touching any game. */
export function AliasSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { settings, update } = useSettings();
  const aliases = settings.nameAliases ?? {};
  const [names, setNames] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([listArchive(), listRecentPlayers(50)]).then(([games, recent]) => {
      if (!alive) return;
      const all = new Map<string, string>();
      for (const n of [...games.flatMap((g) => g.players.map((p) => p.name)), ...recent.map((p) => p.name)]) {
        if (!all.has(n.toLowerCase())) all.set(n.toLowerCase(), n);
      }
      setNames([...all.values()].sort((a, b) => a.localeCompare(b)));
    });
    return () => {
      alive = false;
    };
  }, []);

  const merge = async () => {
    if (!from || !to || from.toLowerCase() === to.toLowerCase()) return;
    const target = aliases[to.toLowerCase()] ?? to; // never chain aliases
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(aliases)) next[k] = v.toLowerCase() === from.toLowerCase() ? target : v;
    next[from.toLowerCase()] = target;
    await update({ nameAliases: next });
    setFrom('');
    setTo('');
  };
  const remove = async (key: string) => {
    const next = { ...aliases };
    delete next[key];
    await update({ nameAliases: next });
  };

  const entries = Object.entries(aliases);
  return (
    <Sheet title={t('alias.title')} onClose={onClose}>
      <p className="muted body-text">{t('alias.intro')}</p>
      <label className="field">
        <span className="eyebrow">{t('alias.count')}</span>
        <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">{t('alias.choose')}</option>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="eyebrow">{t('alias.as')}</span>
        <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">{t('alias.choose')}</option>
          {names
            .filter((n) => n.toLowerCase() !== from.toLowerCase())
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
      </label>
      <button type="button" className="btn btn-primary" disabled={!from || !to} onClick={merge}>
        {t('alias.merge')}
      </button>
      {entries.length > 0 && <h3 className="eyebrow">{t('alias.current')}</h3>}
      <div className="card flush">
        {entries.map(([k, v]) => (
          <div key={k} className="row gap stepper-row">
            <span className="grow">
              <strong>{names.find((n) => n.toLowerCase() === k) ?? k}</strong> → <strong>{v}</strong>
            </span>
            <button type="button" className="btn btn-quiet small-btn" onClick={() => remove(k)} aria-label={t('alias.remove', { name: k })}>
              {t('alias.removeShort')}
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
