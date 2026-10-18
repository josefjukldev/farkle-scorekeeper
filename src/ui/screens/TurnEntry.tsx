import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog, PlayerBadge, Sheet } from '../components';
import { quickPicks } from '../../engine/quickPicks';
import { scoreSelection } from '../../engine/score';
import { bankStatus, turnTotal } from '../../engine/turn';
import { emptyCounts, FACES, sumCounts } from '../../engine/types';
import type { Counts, Face } from '../../engine/types';
import { validateManualStep } from '../../engine/validate';
import { useGame } from '../../state/gameStore';
import { haptic } from '../../platform/haptics';
import { useT } from '../../i18n';
import { countsLabel, useFmt } from '../format';
import { navigate } from '../router';
import { useRemaining } from '../hooks';
import { Timer, currentOf, toTarget } from './shared';

export function TurnEntry() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const addStep = useGame((s) => s.addStep);
  const undoStep = useGame((s) => s.undoStep);
  const hotDice = useGame((s) => s.hotDice);
  const endGameNow = useGame((s) => s.endGameNow);
  const [sheet, setSheet] = useState<'dice' | 'manual' | 'menu' | 'end' | 'rules' | null>(null);
  const [note, setNote] = useState('');
  const picks = useMemo(() => (game ? quickPicks(game.rules) : []), [game?.rules]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!game) navigate('', true);
    else if (game.status === 'finishedPending') navigate('final', true);
    else if (!game.activeTurn?.started) navigate('handover', true);
  }, [game]);
  if (!game?.activeTurn || game.status === 'finishedPending' || !game.activeTurn.started) return null;

  const p = currentOf(game);
  const turn = game.activeTurn.turn;
  const score = game.scores[p.playerId] ?? 0;
  const total = turnTotal(turn);
  const bank = bankStatus(turn, game.rules, score);
  const left = toTarget(game, score);
  const hasSteps = turn.steps.length > 0;
  const inFinal = game.status === 'finalRound';
  const leader = Math.max(...Object.values(game.scores));

  const add = async (s: Parameters<typeof addStep>[0]) => {
    const ok = await addStep(s);
    if (ok) { haptic('tick'); setNote(''); }
    return ok;
  };
  const why = !hasSteps ? t('turn.hintStart') : !bank.minOk ? t('turn.missing', { n: bank.missing }) : !bank.diceOk ? t('turn.diceRule') : turn.hotDicePending ? t('turn.hintHot') : t('turn.hintReady');

  return (
    <div className="screen">
      <header className="turn-head">
        <div className="row gap">
          <PlayerBadge name={p.name} seat={p.seat} size={40} />
          <span className="grow col">
            <h1 className="name">{p.name}</h1>
            <small className="muted">{t('turn.round', { n: game.round })} · {game.name}</small>
          </span>
          <button type="button" className="icon-btn" aria-label={t('turn.menu')} onClick={() => setSheet('menu')}>≡</button>
        </div>
        <div className="row between baseline">
          <span className="eyebrow">{t('turn.score')}</span>
          <strong className="score">{f.n(score)}</strong>
          {left !== null ? <span className="muted small">{t('turn.toTarget', { n: f.n(left) })}</span> : <Timer game={game} />}
        </div>
      </header>

      <main className="content">
        {inFinal && <div className="banner banner-warn" role="status">{t('turn.finalBanner', { n: f.n(leader) })}</div>}
        {game.endCondition.type === 'time' && left === null && <TimeBanner />}
        <div className="row between end">
          <div className="col">
            <span className="eyebrow">{t('turn.total')}</span>
            <strong className="turn-total" aria-live="polite" aria-label={t('turn.aria', { name: p.name, total: f.n(total), dice: turn.diceKnown ? turn.diceRemaining : '?' })}>{f.n(total)}</strong>
          </div>
          <div className="col right">
            <strong>{t('turn.diceLeft', { n: turn.diceKnown ? turn.diceRemaining : '?' })}</strong>
            <span className="dice-dots" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={turn.diceKnown && i < turn.diceRemaining ? 'on' : ''} />)}</span>
          </div>
        </div>
        {turn.hotDicePending && <div className="banner banner-hot" role="status">🔥 {t('turn.hot')}</div>}
        <div className="row gap wrap">
          <span className={'pill ' + (bank.minOk ? 'ok' : 'bad')}>{bank.minOk ? '✓' : '✗'} {t('turn.chipMin', { n: bank.required })}</span>
          {game.rules.bankRestriction !== 'anytime' && <span className={'pill ' + (bank.diceOk ? 'ok' : 'bad')}>{bank.diceOk ? '✓' : '✗'} {t('turn.chipDice.' + game.rules.bankRestriction)}</span>}
        </div>
        <p className="muted small hint" aria-live="polite">{note || why}</p>

        <div className="row gap steps">
          <div className="grow row gap wrap">
            {turn.steps.map((s) => <span key={s.id} className="step-chip">{s.label ?? s.points} <small className="muted">+{f.n(s.points)}</small></span>)}
            {!hasSteps && <span className="muted small">{t('turn.noSteps')}</span>}
          </div>
          <button type="button" className="btn btn-outline small-btn" disabled={turn.history.length === 0} onClick={undoStep}>↶ {t('turn.undo')}</button>
        </div>

        <h2 className="eyebrow">{t('turn.quick')}</h2>
        <div className="grid3">
          {picks.map((q) => {
            const off = turn.diceKnown && q.diceUsed > turn.diceRemaining;
            return (
              <button key={q.key} type="button" className="pick" disabled={off} onClick={() => add({ points: q.points, source: 'quick', counts: q.counts, diceUsed: q.diceUsed, label: q.key === 'straight' ? t('turn.straight') : q.label })}>
                <strong>{q.key === 'straight' ? t('turn.straight') : q.label}</strong><small>+{f.n(q.points)}</small>
              </button>
            );
          })}
        </div>
        <div className="grid2">
          <button type="button" className="btn btn-dashed" onClick={() => setSheet('dice')}>{t('turn.dicePicker')}</button>
          <button type="button" className="btn btn-dashed" onClick={() => setSheet('manual')}>{t('turn.manual')}</button>
        </div>
        {!turn.diceKnown && game.rules.hotDice && <button type="button" className="btn btn-quiet" onClick={hotDice}>{t('turn.forceHot')}</button>}
      </main>

      <div className="action-bar three">
        <button type="button" className="btn btn-danger" onClick={() => navigate('confirm/bust')}>{t('turn.bust')}</button>
        <button type="button" className="btn btn-outline" disabled={!hasSteps} onClick={() => setNote(turn.hotDicePending ? t('turn.throwAll') : t('turn.throwN', { n: turn.diceKnown ? turn.diceRemaining : '' }))}>{t('turn.rollAgain')}</button>
        <button type="button" className="btn btn-primary" disabled={!bank.canBank} onClick={() => navigate('confirm/bank')}>{t('turn.bank', { n: f.n(total) })}</button>
      </div>

      {sheet === 'dice' && <DicePicker remaining={turn.diceKnown ? turn.diceRemaining : 6} onClose={() => setSheet(null)} onAdd={async (c, s) => { if (await add({ points: s.points, source: 'dice', counts: c, diceUsed: s.diceUsed, label: countsLabel(c) })) setSheet(null); }} rules={game.rules} />}
      {sheet === 'manual' && <ManualEntry known={turn.diceKnown} remaining={turn.diceRemaining} rules={game.rules} onClose={() => setSheet(null)} onAdd={async (points, dice) => { if (await add({ points, source: 'manual', diceUsed: dice, label: String(points) })) setSheet(null); }} />}
      {sheet === 'menu' && (
        <Sheet title={t('turn.menu')} onClose={() => setSheet(null)}>
          <div className="stack">
            <a className="btn btn-outline" href="#/board">{t('board.title')}</a>
            <button type="button" className="btn btn-outline" onClick={() => setSheet('rules')}>{t('turn.rules')}</button>
            <a className="btn btn-outline" href="#/">{t('turn.exit')}</a>
            <button type="button" className="btn btn-danger" onClick={() => setSheet('end')}>{t('turn.endNow')}</button>
          </div>
        </Sheet>
      )}
      {sheet === 'rules' && (
        <Sheet title={t('turn.rules')} onClose={() => setSheet(null)}>
          <p className="body-text">{t('new.rulesSummary', { min: game.rules.minBank, dice: t('new.dice.' + game.rules.bankRestriction) })}</p>
          <p className="muted">{game.rules.name}</p>
        </Sheet>
      )}
      {sheet === 'end' && (
        <ConfirmDialog title={t('turn.endTitle')} body={t('turn.endBody')} confirmLabel={t('turn.endNow')} danger onCancel={() => setSheet(null)}
          onConfirm={async () => { setSheet(null); await endGameNow(); navigate('final'); }} />
      )}
    </div>
  );
}

function TimeBanner() {
  const t = useT();
  const game = useGame((s) => s.game);
  const rem = useRemaining(game);
  return rem !== null && rem <= 0 ? <div className="banner banner-warn" role="status">{t('turn.timeUp')}</div> : null;
}

function DicePicker({ remaining, rules, onClose, onAdd }: {
  remaining: number;
  rules: Parameters<typeof scoreSelection>[1];
  onClose: () => void;
  onAdd: (c: Counts, s: { points: number; diceUsed: number }) => void;
}) {
  const t = useT();
  const [c, setC] = useState<Counts>(emptyCounts());
  const used = sumCounts(c);
  const s = used > 0 ? scoreSelection(c, rules) : undefined;
  const set = (face: Face, d: number) => setC((x) => {
    const n = Math.max(0, x[face] + d);
    return sumCounts({ ...x, [face]: n }) > remaining ? x : { ...x, [face]: n };
  });
  const reason = s && !s.valid ? (s.reason.startsWith('dead-die') ? t('dice.dead', { f: s.reason.slice(-1) }) : t('dice.invalid')) : '';
  return (
    <Sheet title={t('dice.title')} onClose={onClose}>
      <div className="card flush">
        {FACES.map((face) => {
          const one = scoreSelection({ ...emptyCounts(), [face]: c[face] } as Counts, rules);
          return (
            <div key={face} className="stepper-row">
              <span className="die" aria-hidden="true">{face}</span>
              <span className="grow muted small">{c[face] > 0 && one.valid ? `+${one.points}` : ''}</span>
              <button type="button" className="icon-btn" aria-label={t('dice.less', { f: face })} onClick={() => set(face, -1)}>−</button>
              <output className="stepper-val" aria-label={t('dice.count', { f: face, n: c[face] })}>{c[face]}</output>
              <button type="button" className="icon-btn" aria-label={t('dice.more', { f: face })} onClick={() => set(face, 1)}>+</button>
            </div>
          );
        })}
      </div>
      <div className="row between"><strong>{t('dice.used', { u: used, r: remaining })}</strong><strong>{s?.valid ? `+${s.points}` : ''}</strong></div>
      {reason && <p className="err" role="alert">{reason}</p>}
      <button type="button" className="btn btn-primary" disabled={!s?.valid} onClick={() => s?.valid && onAdd(c, s)}>{t('dice.add')}</button>
    </Sheet>
  );
}

function ManualEntry({ rules, known, remaining, onClose, onAdd }: {
  rules: Parameters<typeof scoreSelection>[1]; known: boolean; remaining: number; onClose: () => void; onAdd: (points: number, dice?: number) => void;
}) {
  const t = useT();
  const [text, setText] = useState('');
  const [dice, setDice] = useState<number | undefined>(undefined);
  const value = Number(text || 0);
  const valid = validateManualStep(value, rules);
  const key = (k: string) => setText((x) => (k === '⌫' ? x.slice(0, -1) : (x + k).slice(0, 5)));
  return (
    <Sheet title={t('manual.title')} onClose={onClose}>
      <output className="manual-val" aria-live="polite">{value || '0'}</output>
      {text && !valid && <p className="err" role="alert">{t('manual.invalid', { m: rules.allowManualMultiplesOf, max: rules.manualMax })}</p>}
      <div className="row gap">
        <button type="button" className="chip" onClick={() => setText(String(value + 50))}>+50</button>
        <button type="button" className="chip" onClick={() => setText(String(value + 100))}>+100</button>
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '⌫'].map((k) => <button key={k} type="button" className="key" aria-label={k === '⌫' ? t('manual.delete') : k} onClick={() => key(k)}>{k}</button>)}
      </div>
      <p className="muted small">{t('manual.dice')}</p>
      <div className="row gap wrap">
        <button type="button" className={'chip' + (dice === undefined ? ' on' : '')} onClick={() => setDice(undefined)}>{t('manual.unknown')}</button>
        {[1, 2, 3, 4, 5, 6].filter((n) => !known || n <= remaining).map((n) => <button key={n} type="button" className={'chip' + (dice === n ? ' on' : '')} onClick={() => setDice(n)}>{n}</button>)}
      </div>
      <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => onAdd(value, dice)}>{t('manual.add')}</button>
    </Sheet>
  );
}
