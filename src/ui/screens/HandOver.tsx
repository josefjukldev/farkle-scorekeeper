import { useEffect } from 'react';
import { PlayerBadge } from '../components';
import { requiredMin } from '../../engine/turn';
import { useGame } from '../../state/gameStore';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { Timer, currentOf, playerOf, toTarget } from './shared';

export function HandOver() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const turns = useGame((s) => s.turns);
  const startTurn = useGame((s) => s.startTurn);
  const undoLast = useGame((s) => s.undoLastTurn);

  useEffect(() => {
    if (!game) navigate('', true);
    else if (game.status === 'finishedPending') navigate('final', true);
  }, [game]);
  if (!game || game.status === 'finishedPending') return null;

  const p = currentOf(game);
  const score = game.scores[p.playerId] ?? 0;
  const last = turns[turns.length - 1];
  const lastP = last ? playerOf(game, last.playerId) : undefined;
  const left = toTarget(game, score);
  const req = requiredMin(game.rules, score);
  const inFinal = game.status === 'finalRound';

  return (
    <div className="screen">
      <header className="app-head between">
        <span className="eyebrow">
          {t('turn.round', { n: game.round })} · {game.name}
        </span>
        <a className="icon-btn" href="#/board" aria-label={t('board.title')}>
          ≡
        </a>
      </header>
      <main className="content center">
        {last && lastP && (
          <div className="card row gap last-turn">
            <PlayerBadge name={lastP.name} seat={lastP.seat} size={36} />
            <span className="col">
              <strong>
                {last.result === 'banked'
                  ? t('hand.banked', { name: lastP.name, n: f.n(last.turnTotal) })
                  : last.result === 'bust'
                    ? t('hand.busted', { name: lastP.name })
                    : t('hand.discarded', { name: lastP.name })}
              </strong>
              <small className="muted">
                {f.n(last.scoreBefore)} → {f.n(last.scoreAfter)}
              </small>
            </span>
          </div>
        )}
        {inFinal && (
          <div className="banner banner-warn" role="status">
            {t('turn.finalBanner', { n: f.n(Math.max(...Object.values(game.scores))) })}
          </div>
        )}
        <div className="handover">
          <span className="eyebrow">{t('hand.next')}</span>
          <PlayerBadge name={p.name} seat={p.seat} size={112} />
          <h1 className="huge">{p.name}</h1>
          <strong className="big">{f.n(score)}</strong>
          {left !== null && <span className="muted">{t('hand.toGo', { n: f.n(left) })}</span>}
          <Timer game={game} />
          <span className="pill">{t('hand.needs', { n: req })}</span>
        </div>
      </main>
      <div className="action-bar single col">
        <button
          type="button"
          className="btn btn-primary huge-btn"
          onClick={async () => {
            await startTurn();
            navigate('turn');
          }}
        >
          {t('hand.start')}
        </button>
        <small className="muted center-text">{t('hand.pass', { name: p.name })}</small>
        {last && (
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              await undoLast();
              navigate('turn');
            }}
          >
            {t('hand.undoLast')}
          </button>
        )}
      </div>
    </div>
  );
}
