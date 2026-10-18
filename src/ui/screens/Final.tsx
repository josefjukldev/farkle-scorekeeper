import { useEffect, useState } from 'react';
import { ConfirmDialog, PlayerBadge } from '../components';
import { useGame } from '../../state/gameStore';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { playerOf } from './shared';

export function Final() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const archive = useGame((s) => s.archive);
  const forget = useGame((s) => s.forget);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!game) navigate('', true);
    else if (game.status !== 'finishedPending') navigate(game.activeTurn?.started ? 'turn' : 'handover', true);
  }, [game]);
  if (!game?.result) return null;

  const ranking = game.result.ranking;
  const name = (id: string) => playerOf(game, id);
  const podium = [ranking[1], ranking[0], ranking[2]].filter(Boolean);
  const rankLabel = (r: number, tie: boolean) => (tie ? t('final.tie', { n: r }) : `${r}`);
  const tieOf = (rank: number) => ranking.filter((x) => x.rank === rank).length > 1;

  return (
    <div className="screen">
      <header className="app-head col">
        <span className="eyebrow">{t('final.over')}</span>
        <h1>{game.name}</h1>
        <small className="muted">{t('final.rounds', { n: game.round })}</small>
      </header>
      <main className="content final">
        <div className="podium" role="list">
          {podium.map((r) => (
            <div key={r.playerId} role="listitem" className="podium-col">
              <PlayerBadge name={name(r.playerId).name} seat={name(r.playerId).seat} size={36} />
              <strong>{name(r.playerId).name}</strong>
              <span className="muted small">{f.n(r.score)}</span>
              <div className={'podium-bar r' + Math.min(r.rank, 3)} style={{ height: r.rank === 1 ? 64 : r.rank === 2 ? 48 : 36 }}>
                {rankLabel(r.rank, tieOf(r.rank))}
              </div>
            </div>
          ))}
        </div>
        <div className="card flush ranking">
          {ranking.map((r) => (
            <div key={r.playerId} className="row gap rank-row">
              <strong className="rank">{rankLabel(r.rank, tieOf(r.rank))}</strong>
              <PlayerBadge name={name(r.playerId).name} seat={name(r.playerId).seat} size={30} />
              <span className="grow col">
                <strong>{name(r.playerId).name}</strong>
                <small className="muted">{t('final.line', { t: r.turns, b: r.busts, best: f.n(r.bestTurn) })}</small>
              </span>
              <strong className="score-sm">{f.n(r.score)}</strong>
            </div>
          ))}
        </div>
      </main>
      <div className="action-bar single col">
        <button
          type="button"
          className="btn btn-primary big-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const id = await archive();
            setBusy(false);
            if (id) navigate(`game/${id}/new`);
          }}
        >
          {t('final.archive')}
        </button>
        <div className="grid2">
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            {t('final.forget')}
          </button>
          <a href="#/board" className="btn btn-outline">
            {t('final.logShort')}
          </a>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={t('final.forgetTitle')}
          body={t('final.forgetBody')}
          confirmLabel={t('final.forgetConfirm')}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await forget();
            setConfirm(false);
            navigate('', true);
          }}
        />
      )}
    </div>
  );
}
