import { PlayerBadge } from '../components';
import { useGame } from '../../state/gameStore';
import { useT } from '../../i18n';
import { useFmt } from '../format';

/** Read-only standings shown beside the turn screens on wide displays (tablet, desktop). */
export function LiveBoard() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  if (!game) return null;
  const target = game.endCondition.type === 'target' ? game.endCondition.targetScore : 0;
  const current = game.activeTurn?.playerId;
  const rows = game.players.map((p) => ({ p, score: game.scores[p.playerId] ?? 0 })).sort((a, b) => b.score - a.score);
  return (
    <aside className="side-board" aria-label={t('board.title')}>
      <h2 className="eyebrow">{t('board.title')}</h2>
      <div className="list">
        {rows.map((r) => (
          <div key={r.p.playerId} className={'card col' + (r.p.playerId === current ? ' current' : '')}>
            <div className="row gap">
              <PlayerBadge name={r.p.name} seat={r.p.seat} size={36} />
              <strong className="grow">{r.p.name}</strong>
              <strong className="score-sm">{f.n(r.score)}</strong>
            </div>
            {target > 0 && (
              <div className="progress" role="img" aria-label={t('board.progress', { name: r.p.name, n: f.n(r.score), t: f.n(target) })}>
                <div style={{ width: `${Math.min(100, (r.score / target) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
