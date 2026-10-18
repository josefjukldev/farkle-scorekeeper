import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog, PlayerBadge, Segmented, Sheet } from '../components';
import { quickPicks } from '../../engine/quickPicks';
import { bankStatus, turnTotal } from '../../engine/turn';
import { validateManualStep } from '../../engine/validate';
import { useGame } from '../../state/gameStore';
import { haptic } from '../../platform/haptics';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { useRemaining } from '../hooks';
import { Timer, currentOf, toTarget } from './shared';

type Mode = 'manual' | 'quick';
/** Manual entry is the default; a choice of Quick picks is remembered until the app is closed. */
let lastMode: Mode = 'manual';

export function TurnEntry() {
  const t = useT();
  const f = useFmt();
  const game = useGame((s) => s.game);
  const addStep = useGame((s) => s.addStep);
  const undoStep = useGame((s) => s.undoStep);
  const hotDice = useGame((s) => s.hotDice);
  const endGameNow = useGame((s) => s.endGameNow);
  const rem = useRemaining(game);
  const [mode, setModeState] = useState<Mode>(lastMode);
  const [sheet, setSheet] = useState<'menu' | 'end' | 'rules' | null>(null);
  const [text, setText] = useState('');
  const [dice, setDice] = useState<number | undefined>(undefined);
  const picks = useMemo(() => (game ? quickPicks(game.rules) : []), [game?.rules]); // eslint-disable-line react-hooks/exhaustive-deps
  const setMode = (m: Mode) => {
    lastMode = m;
    setModeState(m);
  };

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
  const inFinal = game.status === 'finalRound';
  const leader = Math.max(...Object.values(game.scores));
  const timeUp = rem !== null && rem <= 0;

  const add = async (s: Parameters<typeof addStep>[0]) => {
    const ok = await addStep(s);
    if (ok) haptic('tick');
    return ok;
  };

  const value = Number(text || 0);
  const manualOk = validateManualStep(value, game.rules);
  const manualBad = text !== '' && !manualOk;
  const key = (k: string) => setText((x) => (k === '⌫' ? x.slice(0, -1) : (x + k).replace(/^0+(?=\d)/, '').slice(0, 5)));
  const addManual = async () => {
    if (!manualOk) return;
    if (await add({ points: value, source: 'manual', diceUsed: dice })) {
      setText('');
      setDice(undefined);
    }
  };

  const reason = !bank.canBank
    ? turn.steps.length === 0
      ? t('turn.bankEmpty')
      : !bank.minOk
        ? t('turn.bankMissing', { n: bank.missing })
        : t('turn.bankNeeds', { rule: t('turn.chipDice.' + game.rules.bankRestriction) })
    : turn.hotDicePending
      ? t('turn.bankHot')
      : '';
  const shown = turn.steps.slice(-3);
  const hidden = turn.steps.length - shown.length;

  return (
    <div className="screen turn">
      <header className="turn-bar">
        <PlayerBadge name={p.name} seat={p.seat} size={40} />
        <span className="who">
          <strong>{p.name}</strong>
          <small>
            {t('turn.round', { n: game.round })}
            {left !== null ? ` · ${t('turn.toTarget', { n: f.n(left) })}` : ''}
          </small>
        </span>
        {left === null && <Timer game={game} controls={false} />}
        <span className="score-box">
          <small>{t('turn.score')}</small>
          <strong>{f.n(score)}</strong>
        </span>
        <button type="button" className="icon-btn" aria-label={t('turn.menu')} onClick={() => setSheet('menu')}>
          ≡
        </button>
      </header>

      {(inFinal || timeUp) && (
        <div className="banner banner-warn" role="status">
          {timeUp ? t('turn.timeUp') : t('turn.finalBanner', { n: f.n(leader) })}
        </div>
      )}

      <section className="turn-mid" aria-label={t('turn.total')}>
        <div className="col">
          <span className="eyebrow">{t('turn.total')}</span>
          <strong
            className="turn-total"
            aria-live="polite"
            aria-label={t('turn.aria', { name: p.name, total: f.n(total), dice: turn.diceKnown ? turn.diceRemaining : '?' })}
          >
            {f.n(total)}
          </strong>
        </div>
        <div className="dice-box">
          {turn.hotDicePending ? (
            <span className="hot-pill" role="status">
              🔥 {t('turn.hot')}
            </span>
          ) : (
            <strong>{t('turn.diceLeft', { n: turn.diceKnown ? turn.diceRemaining : '?' })}</strong>
          )}
          <span className="dice-dots" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} className={turn.diceKnown && i < turn.diceRemaining ? 'on' : ''} />
            ))}
          </span>
          {!turn.diceKnown && game.rules.hotDice && (
            <button type="button" className="chip hot-btn" onClick={hotDice}>
              🔥 {t('turn.forceHot')}
            </button>
          )}
        </div>
      </section>

      <div className="steps-row">
        <div className="chips" aria-label={t('turn.steps')}>
          {turn.steps.length === 0 && <span className="muted small">{t('turn.noSteps')}</span>}
          {hidden > 0 && <span className="step-chip muted">+{hidden}</span>}
          {shown.map((s) => (
            <span key={s.id} className="step-chip">
              {s.label ? (
                <>
                  {s.label} <small className="muted">+{f.n(s.points)}</small>
                </>
              ) : (
                <>+{f.n(s.points)}</>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="mode-row">
        <Segmented
          value={mode}
          label={t('turn.modeLabel')}
          options={[
            { value: 'manual', label: t('turn.modeManual') },
            { value: 'quick', label: t('turn.modeQuick') }
          ]}
          onChange={setMode}
        />
        <button type="button" className="btn btn-outline undo-btn" disabled={turn.history.length === 0} onClick={undoStep}>
          ↶ {t('turn.undo')}
        </button>
      </div>

      <main className="input-area">
        {mode === 'manual' ? (
          <>
            <div className="manual-top">
              <div className={'manual-display' + (manualBad ? ' bad' : '')}>
                <output aria-live="polite" aria-label={t('manual.value')}>
                  {value ? f.n(value) : '0'}
                </output>
                <small role={manualBad ? 'alert' : undefined}>{t('manual.multipleOf', { m: game.rules.allowManualMultiplesOf })}</small>
              </div>
              <button type="button" className="btn btn-primary" disabled={!manualOk} onClick={addManual}>
                {t('manual.add')}
              </button>
            </div>
            <div className="dice-used" role="group" aria-label={t('manual.dice')}>
              <span>{t('manual.diceShort')}</span>
              <button
                type="button"
                className={'chip' + (dice === undefined ? ' on' : '')}
                aria-pressed={dice === undefined}
                aria-label={t('manual.unknown')}
                onClick={() => setDice(undefined)}
              >
                ?
              </button>
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const off = turn.diceKnown && n > turn.diceRemaining;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={off}
                    className={'chip' + (dice === n ? ' on' : '')}
                    aria-pressed={dice === n}
                    onClick={() => setDice(n)}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="keypad4">
              {['1', '2', '3', '⌫', '4', '5', '6', '00', '7', '8', '9', '0'].map((k) => (
                <button
                  key={k}
                  type="button"
                  className={'key' + (k === '⌫' || k === '00' ? ' fn' : '')}
                  aria-label={k === '⌫' ? t('manual.delete') : k}
                  onClick={() => key(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="picks4">
            {picks.map((q) => {
              const off = turn.diceKnown && q.diceUsed > turn.diceRemaining;
              const label = q.key === 'straight' ? t('turn.straight') : q.label;
              return (
                <button
                  key={q.key}
                  type="button"
                  className="pick"
                  disabled={off}
                  onClick={() => add({ points: q.points, source: 'quick', counts: q.counts, diceUsed: q.diceUsed, label })}
                >
                  <strong>{label}</strong>
                  <small>+{f.n(q.points)}</small>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <div className="action-bar two">
        <button type="button" className="btn btn-danger" onClick={() => navigate('confirm/bust')}>
          {t('turn.bust')}
        </button>
        <button type="button" className="btn btn-primary bank-btn" disabled={!bank.canBank} onClick={() => navigate('confirm/bank')}>
          <span>{t('turn.bank', { n: f.n(total) })}</span>
          {reason && <small>{reason}</small>}
        </button>
      </div>

      {sheet === 'menu' && (
        <Sheet title={t('turn.menu')} onClose={() => setSheet(null)}>
          <div className="stack">
            <a className="btn btn-outline" href="#/board">
              {t('board.title')}
            </a>
            <button type="button" className="btn btn-outline" onClick={() => setSheet('rules')}>
              {t('turn.rules')}
            </button>
            <a className="btn btn-outline" href="#/">
              {t('turn.exit')}
            </a>
            <button type="button" className="btn btn-danger" onClick={() => setSheet('end')}>
              {t('turn.endNow')}
            </button>
          </div>
        </Sheet>
      )}
      {sheet === 'rules' && (
        <Sheet title={t('turn.rules')} onClose={() => setSheet(null)}>
          <p className="body-text">
            {t('new.rulesSummary', { min: game.rules.minBank, dice: t('new.dice.' + game.rules.bankRestriction) })}
          </p>
          <p className="muted">{game.rules.name}</p>
        </Sheet>
      )}
      {sheet === 'end' && (
        <ConfirmDialog
          title={t('turn.endTitle')}
          body={t('turn.endBody')}
          confirmLabel={t('turn.endNow')}
          danger
          onCancel={() => setSheet(null)}
          onConfirm={async () => {
            setSheet(null);
            await endGameNow();
            navigate('final');
          }}
        />
      )}
    </div>
  );
}
