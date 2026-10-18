import { useEffect, useState } from 'react';
import { BottomNav, PlayerBadge } from '../components';
import { listArchive } from '../../storage/repo';
import type { Game } from '../../storage/types';
import { useT } from '../../i18n';
import { useFmt } from '../format';

export function Archive() {
  const t = useT();
  const f = useFmt();
  const [all, setAll] = useState<Game[]>([]);
  const [q, setQ] = useState('');
  const [who, setWho] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { listArchive().then((g) => { setAll(g); setLoaded(true); }); }, []);
  const names = [...new Set(all.flatMap((g) => g.players.map((p) => p.name)))].sort();
  const term = q.trim().toLowerCase();
  const fromMs = from ? new Date(from).getTime() : 0;
  const toMs = to ? new Date(to).getTime() + 86400000 : Infinity;
  const games = all
    .filter((g) => !who || g.players.some((p) => p.name === who))
    .filter((g) => !term || g.name.toLowerCase().includes(term) || g.players.some((p) => p.name.toLowerCase().includes(term)))
    .filter((g) => g.createdAt >= fromMs && g.createdAt < toMs);

  return (
    <div className="screen">
      <header className="app-head"><h1>{t('nav.archive')}</h1></header>
      <main className="content">
        <label className="field"><span className="sr-only">{t('archive.search')}</span>
          <input type="search" placeholder={t('archive.search')} value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="row gap wrap" role="group" aria-label={t('archive.filter')}>
          <button type="button" className={'chip' + (!who ? ' on' : '')} aria-pressed={!who} onClick={() => setWho('')}>{t('archive.all')}</button>
          {names.map((n) => <button key={n} type="button" className={'chip' + (who === n ? ' on' : '')} aria-pressed={who === n} onClick={() => setWho(n)}>{n}</button>)}
        </div>
        <div className="row gap">
          <label className="field grow"><span className="muted small">{t('archive.from')}</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field grow"><span className="muted small">{t('archive.to')}</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="list">
          {loaded && all.length === 0 && <p className="muted center-text">{t('archive.empty')}</p>}
          {loaded && all.length > 0 && games.length === 0 && <p className="muted center-text">{t('archive.noMatch')}</p>}
          {games.map((g) => {
            const w = g.players.find((p) => p.playerId === g.result?.winnerIds[0]);
            return (
              <a key={g.id} href={`#/game/${g.id}`} className="card row gap link-card">
                {w && <PlayerBadge name={w.name} seat={w.seat} size={44} />}
                <span className="grow col">
                  <strong>{g.name}</strong>
                  <small className="muted">{f.date(g.createdAt)}{g.placeLabel ? ` · ${g.placeLabel}` : ''}</small>
                  <small className="muted">{g.players.map((p) => p.name).join(', ')}</small>
                </span>
                <span className="col right">
                  {w && <><small className="muted">{t('home.winner')}</small><strong>{w.name}</strong></>}
                  <small className="chip-sm">{g.endCondition.type === 'target' ? f.n(g.endCondition.targetScore) : `${Math.round(g.endCondition.limitMs / 60000)} min`}</small>
                </span>
              </a>
            );
          })}
        </div>
      </main>
      <BottomNav active="archive" />
    </div>
  );
}
