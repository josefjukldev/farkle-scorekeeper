import { useEffect, useState } from 'react';
import { BackButton, ConfirmDialog, PlayerBadge, Segmented, Sheet } from '../components';
import { useGame } from '../../state/gameStore';
import type { Turn } from '../../storage/types';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { Timer, playerOf, toTarget } from './shared';

export function Board() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const turns = useGame((s) => s.turns);
  const endGameNow = useGame((s) => s.endGameNow);
  const [tab, setTab] = useState<'board' | 'history'>('board');
  const [editing, setEditing] = useState<Turn | undefined>();
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => { if (!game) navigate('', true); }, [game]);
  if (!game) return null;

  const target = game.endCondition.type === 'target' ? game.endCondition.targetScore : 0;
  const rows = game.players
    .map((p) => {
      const mine = turns.filter((x) => x.playerId === p.playerId && x.result !== 'discarded');
      return { p, score: game.scores[p.playerId] ?? 0, turns: mine.length, busts: mine.filter((x) => x.result === 'bust').length };
    })
    .sort((a, b) => b.score - a.score);
  const current = game.activeTurn?.playerId;
  const back = game.status === 'finishedPending' ? '#/final' : game.activeTurn?.started ? '#/turn' : '#/handover';

  return (
    <div className="screen">
      <header className="app-head">
        <BackButton href={back} label={t('common.back')} />
        <span className="grow col"><h1>{game.name}</h1><small className="muted">{t('turn.round', { n: game.round })}{target ? ` · ${t('board.first', { n: f.n(target) })}` : ''}</small></span>
        <Timer game={game} />
      </header>
      <div className="pad-x"><Segmented value={tab} label={t('board.title')} options={[{ value: 'board', label: t('board.title') }, { value: 'history', label: t('board.history') }]} onChange={setTab} /></div>
      <main className="content">
        {tab === 'board' && (
          <div className="list">
            {rows.map((r, i) => {
              const rank = rows.findIndex((x) => x.score === r.score) + 1;
              const left = toTarget(game, r.score);
              return (
                <div key={r.p.playerId} className={'card col' + (r.p.playerId === current ? ' current' : '')}>
                  <div className="row gap">
                    <strong className="rank">{rank}</strong>
                    <PlayerBadge name={r.p.name} seat={r.p.seat} size={40} />
                    <span className="grow col"><strong>{r.p.name}</strong><small className="muted">{t('board.stats', { t: r.turns, b: r.busts })}{r.p.playerId === current ? ` · ${t('board.now')}` : ''}</small></span>
                    <strong className="score">{f.n(r.score)}</strong>
                  </div>
                  {target > 0 && <div className="progress" role="img" aria-label={t('board.progress', { name: r.p.name, n: f.n(r.score), t: f.n(target) })}><div style={{ width: `${Math.min(100, (r.score / target) * 100)}%` }} /></div>}
                  {left === 0 && i >= 0 && <small className="muted">{t('board.reached')}</small>}
                </div>
              );
            })}
            <p className="muted small">{t('board.ties')}</p>
          </div>
        )}
        {tab === 'history' && (
          <div className="list tight">
            {turns.length === 0 && <p className="muted">{t('board.noTurns')}</p>}
            {[...turns].reverse().map((x) => {
              const p = playerOf(game, x.playerId);
              return (
                <div key={x.id} className="card row gap">
                  <PlayerBadge name={p.name} seat={p.seat} size={36} />
                  <span className="grow col">
                    <strong>{p.name} <small className="muted">· R{x.round}</small></strong>
                    <small className="muted">{t('board.stepsCount', { n: x.steps.length })} · {f.n(x.scoreBefore)} → {f.n(x.scoreAfter)}{x.inFinalRound ? ` · ${t('board.final')}` : ''}</small>
                  </span>
                  <span className="col right">
                    <strong className={x.result === 'banked' ? '' : 'danger'}>{x.result === 'banked' ? `+${f.n(x.turnTotal)}` : x.result === 'bust' ? t('board.bust') : t('board.discarded')}</strong>
                    {x.edited && <small className="muted">{t('board.edited', { n: f.n(x.edited[0].previousTotal) })}</small>}
                  </span>
                  {game.status !== 'archived' && x.result !== 'discarded' && <button type="button" className="icon-btn" aria-label={t('board.edit', { name: p.name, r: x.round })} onClick={() => setEditing(x)}>✎</button>}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <div className="action-bar two">
        <a className="btn btn-primary" href={back}>{game.status === 'finishedPending' ? t('board.results') : t('board.backToTurn')}</a>
        {game.status !== 'finishedPending' && <button type="button" className="btn btn-danger" onClick={() => setConfirmEnd(true)}>{t('turn.endNow')}</button>}
      </div>
      {editing && <EditTurn turn={editing} onClose={() => setEditing(undefined)} />}
      {confirmEnd && <ConfirmDialog title={t('turn.endTitle')} body={t('turn.endBody')} confirmLabel={t('turn.endNow')} danger onCancel={() => setConfirmEnd(false)} onConfirm={async () => { setConfirmEnd(false); await endGameNow(); navigate('final'); }} />}
    </div>
  );
}

function EditTurn({ turn, onClose }: { turn: Turn; onClose: () => void }) {
  const t = useT();
  const editTurn = useGame((s) => s.editTurn);
  const [result, setResult] = useState<'banked' | 'bust'>(turn.result === 'bust' ? 'bust' : 'banked');
  const [text, setText] = useState(String(turn.result === 'banked' ? turn.turnTotal : turn.lostTotal));
  const value = Number(text || 0);
  const valid = value >= 0 && value % 50 === 0 && (result === 'bust' || value > 0);
  return (
    <Sheet title={t('edit.title')} onClose={onClose}>
      <Segmented value={result} label={t('edit.result')} options={[{ value: 'banked', label: t('edit.banked') }, { value: 'bust', label: t('edit.bust') }]} onChange={setResult} />
      <label className="field"><span className="eyebrow">{result === 'banked' ? t('edit.total') : t('edit.lost')}</span>
        <input inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, ''))} aria-invalid={!valid} /></label>
      {!valid && <p className="err" role="alert">{t('edit.invalid')}</p>}
      <p className="muted small">{t('edit.note')}</p>
      <button type="button" className="btn btn-primary" disabled={!valid} onClick={async () => { await editTurn(turn.id, result, value); onClose(); }}>{t('edit.save')}</button>
    </Sheet>
  );
}
