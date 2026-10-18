import { currentPlayer } from '../../engine/game';
import { coreOf } from '../../state/gameModel';
import type { Game } from '../../storage/types';
import { useRemaining } from '../hooks';
import { mmss } from '../format';
import { useGame } from '../../state/gameStore';
import { useT } from '../../i18n';

export const playerOf = (g: Game, id: string) => g.players.find((p) => p.playerId === id)!;
export const currentOf = (g: Game) => {
  const c = currentPlayer(coreOf(g));
  return playerOf(g, c.id);
};

export function Timer({ game, controls = true }: { game: Game; controls?: boolean }) {
  const t = useT();
  const rem = useRemaining(game);
  const pause = useGame((s) => s.pauseTimer);
  const resume = useGame((s) => s.resumeTimer);
  if (rem === null || !game.timer) return null;
  const cls = rem <= 0 ? 'red' : rem < 60000 ? 'red' : rem < 300000 ? 'amber' : '';
  const label = rem <= 0 ? t('timer.up') : mmss(rem);
  return (
    <span className={'timer ' + cls} role="timer" aria-label={t('timer.label', { time: label })}>
      <span aria-hidden="true">⏱</span> {label}
      {!game.timer.running && rem > 0 ? ` · ${t('timer.paused')}` : ''}
      {controls && rem > 0 && (
        <button type="button" className="mini-btn" onClick={() => (game.timer?.running ? pause() : resume())}>
          {game.timer.running ? t('timer.pause') : t('timer.resume')}
        </button>
      )}
    </span>
  );
}

export function toTarget(game: Game, score: number): number | null {
  return game.endCondition.type === 'target' ? Math.max(0, game.endCondition.targetScore - score) : null;
}
