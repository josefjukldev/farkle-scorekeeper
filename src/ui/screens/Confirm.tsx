import { useEffect } from 'react';
import { PlayerBadge } from '../components';
import { turnTotal } from '../../engine/turn';
import { applyTurn, currentPlayer, isFinished } from '../../engine/game';
import { coreOf, remainingMs } from '../../state/gameModel';
import { useGame } from '../../state/gameStore';
import { haptic } from '../../platform/haptics';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { currentOf } from './shared';
import type { Route } from '../router';

export function Confirm({ route }: { route: Route }) {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const record = useGame((s) => s.recordTurn);
  const kind = route.arg === 'bust' ? 'bust' : 'bank';

  useEffect(() => {
    if (!game?.activeTurn?.started) navigate('', true);
  }, [game]);
  if (!game?.activeTurn?.started) return null;

  const p = currentOf(game);
  const total = turnTotal(game.activeTurn.turn);
  const score = game.scores[p.playerId] ?? 0;
  // who is next: the engine decides, so ask a dry run
  const rem = remainingMs(game, Date.now());
  const next = rem !== null && rem <= 0 ? undefined : nextPlayer(game, kind, total);
  const bp = game.rules.bustPenalty;
  const penalty = kind === 'bust' && bp && (game.consecutiveBusts[p.playerId] ?? 0) + 1 === bp.afterConsecutive ? Math.min(bp.points, score) : 0;
  const after = kind === 'bank' ? score + total : score - penalty;

  return (
    <div className="screen">
      <header className="app-head"><span className="eyebrow">{t('confirm.title')} · {t('turn.round', { n: game.round })}</span></header>
      <main className="content center-v">
        <div className="row gap"><PlayerBadge name={p.name} seat={p.seat} size={44} /><h1>{kind === 'bank' ? t('confirm.banks', { name: p.name }) : t('confirm.busts', { name: p.name })}</h1></div>
        <strong className={'huge-num ' + (kind === 'bank' ? 'primary' : 'danger')}>{kind === 'bank' ? `+${f.n(total)}` : '0'}</strong>
        {kind === 'bust' && total > 0 && <p className="muted lost">✗ {t('confirm.lost', { n: f.n(total) })}</p>}
        {kind === 'bust' && penalty > 0 && <p className="err">{t('confirm.penalty', { n: f.n(penalty) })}</p>}
        <p className="big"><span className="muted">{f.n(score)}</span> → <strong>{f.n(after)}</strong></p>
        {next && (
          <div className="card row gap">
            <span className="eyebrow">{t('confirm.next')}</span>
            <PlayerBadge name={next.name} seat={next.seat} size={28} />
            <strong className="grow">{next.name}</strong>
            <span className="muted">{f.n(game.scores[next.playerId] ?? 0)}</span>
          </div>
        )}
        {!next && <div className="banner banner-warn">{t('confirm.gameEnds')}</div>}
      </main>
      <div className="action-bar two">
        <a className="btn btn-outline" href="#/turn">{t('common.back')}</a>
        <button type="button" className="btn btn-primary" onClick={async () => {
          haptic(kind === 'bank' ? 'bank' : 'bust');
          const r = await record(kind === 'bank' ? 'banked' : 'bust');
          navigate(r === 'final' ? 'final' : 'handover');
        }}>{t('confirm.pass')}</button>
      </div>
    </div>
  );
}


function nextPlayer(game: NonNullable<ReturnType<typeof useGame.getState>['game']>, kind: 'bank' | 'bust', total: number) {
  const core = coreOf(game);
  const me = currentPlayer(core);
  const res = applyTurn(core, { playerId: me.id, kind: kind === 'bank' ? 'banked' : 'bust', total });
  if (isFinished(res.core)) return undefined;
  return game.players[res.core.currentIndex];
}
