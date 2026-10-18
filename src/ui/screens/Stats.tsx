import { useEffect, useState } from 'react';
import { BackButton, PlayerBadge } from '../components';
import { aggregatePlayers } from '../../review/crossGame';
import type { PlayerTotals } from '../../review/crossGame';
import { listArchive } from '../../storage/repo';
import { useT } from '../../i18n';
import { useFmt } from '../format';

export function Stats() {
  const t = useT();
  const f = useFmt();
  const [rows, setRows] = useState<PlayerTotals[] | null>(null);

  useEffect(() => {
    let alive = true;
    listArchive().then((g) => alive && setRows(aggregatePlayers(g)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="screen">
      <header className="app-head">
        <BackButton href="#/archive" label={t('common.back')} />
        <h1>{t('stats.title')}</h1>
      </header>
      <main className="content">
        {rows && rows.length === 0 && <p className="muted center-text">{t('stats.empty')}</p>}
        <div className="list">
          {(rows ?? []).map((r, i) => (
            <div key={r.name} className="card col">
              <div className="row gap">
                <PlayerBadge name={r.name} seat={i} size={40} />
                <span className="grow col">
                  <strong>{r.name}</strong>
                  <small className="muted">{t('stats.line', { g: r.games, w: r.wins })}</small>
                </span>
                <strong className="score-sm">{Math.round(r.winRate * 100)}%</strong>
              </div>
              <div className="grid3 stats">
                <div>
                  <small className="muted">{t('stats.avgTurn')}</small>
                  <strong>{f.n(Math.round(r.avgTurn))}</strong>
                </div>
                <div>
                  <small className="muted">{t('detail.bustRate')}</small>
                  <strong>{Math.round(r.bustRate * 100)}%</strong>
                </div>
                <div>
                  <small className="muted">{t('detail.bestTurn')}</small>
                  <strong>{f.n(r.bestTurn)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
