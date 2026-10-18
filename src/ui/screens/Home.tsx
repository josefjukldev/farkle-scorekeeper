import { useEffect, useState } from 'react';
import { BottomNav, ConfirmDialog, PlayerBadge } from '../components';
import { useGame } from '../../state/gameStore';
import { listArchive } from '../../storage/repo';
import type { Game } from '../../storage/types';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';

export function Home() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const forget = useGame((s) => s.forget);
  const [recent, setRecent] = useState<Game[]>([]);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    listArchive().then((g) => setRecent(g.slice(0, 3)));
  }, [game]);

  const finished = game?.status === 'finishedPending';
  const resume = () => navigate(finished ? 'final' : game?.activeTurn?.started ? 'turn' : 'handover');
  const startNew = () => (game ? setConfirmNew(true) : navigate('new'));

  return (
    <div className="screen">
      <header className="app-head">
        <svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true" className="logo"><rect x="4" y="4" width="40" height="40" rx="10" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="16" cy="16" r="3.5" fill="currentColor" /><circle cx="32" cy="16" r="3.5" fill="currentColor" /><circle cx="24" cy="24" r="3.5" fill="currentColor" /><circle cx="16" cy="32" r="3.5" fill="currentColor" /><circle cx="32" cy="32" r="3.5" fill="currentColor" /></svg>
        <h1>Dices with Friends</h1>
      </header>
      <main className="content">
        {game && (
          <section className="card resume" aria-label={t('home.inProgress')}>
            <div className="row between">
              <span className="eyebrow primary">{finished ? t('home.finishedPending') : t('home.inProgress')}</span>
              <span className="muted small">{f.time(game.lastActivityAt)}</span>
            </div>
            <strong className="big">{game.name}</strong>
            <div className="row gap">
              <span className="badge-stack">{game.players.map((p) => <PlayerBadge key={p.playerId} name={p.name} seat={p.seat} size={30} />)}</span>
              <span className="muted small">{t('home.playersRound', { n: game.players.length, r: game.round })}</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={resume}>{finished ? t('home.seeResults') : t('home.resume')}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDiscard(true)}>{t('home.discard')}</button>
          </section>
        )}
        <button type="button" className="btn btn-outline big-btn" onClick={startNew}>＋ {t('home.newGame')}</button>
        <section>
          <div className="row between">
            <h2 className="eyebrow">{t('home.recent')}</h2>
            {recent.length > 0 && <a href="#/archive" className="link">{t('home.seeAll')}</a>}
          </div>
          {recent.length === 0 && <p className="muted hide-mid">{t('archive.empty')}</p>}
          <div className="list recent">
            {recent.map((g) => {
              const w = g.players.find((p) => p.playerId === g.result?.winnerIds[0]);
              return (
                <a key={g.id} href={`#/game/${g.id}`} className="card row gap link-card">
                  {w && <PlayerBadge name={w.name} seat={w.seat} size={40} />}
                  <span className="grow col">
                    <strong>{g.name}</strong>
                    <small className="muted">{f.date(g.createdAt)} · {t('home.nPlayers', { n: g.players.length })}</small>
                  </span>
                  {w && <span className="col right"><small className="muted">{t('home.winner')}</small><strong>{w.name}</strong></span>}
                </a>
              );
            })}
          </div>
        </section>
      </main>
      <BottomNav active="home" />
      {confirmNew && (
        <ConfirmDialog title={t('home.replaceTitle')} body={t('home.replaceBody')} confirmLabel={t('home.replaceConfirm')} danger onCancel={() => setConfirmNew(false)}
          onConfirm={() => { setConfirmNew(false); navigate('new'); }} />
      )}
      {confirmDiscard && (
        <ConfirmDialog title={t('home.discardTitle')} body={t('home.discardBody')} confirmLabel={t('home.discardConfirm')} danger onCancel={() => setConfirmDiscard(false)}
          onConfirm={async () => { setConfirmDiscard(false); await forget(); }} />
      )}
    </div>
  );
}
