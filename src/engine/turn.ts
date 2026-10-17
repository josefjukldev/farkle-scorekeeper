import type { Result, RuleSet, Step } from './types';

interface Snap {
  diceRemaining: number;
  diceKnown: boolean;
  hotDicePending: boolean;
  hotDiceCount: number;
}

export interface TurnState extends Snap {
  steps: Step[];
  history: { snap: Snap; kind: 'step' | 'force' }[];
}

export interface BankStatus {
  canBank: boolean;
  minOk: boolean;
  diceOk: boolean;
  required: number;
  missing: number;
}

export const initTurn = (): TurnState => ({
  steps: [],
  history: [],
  diceRemaining: 6,
  diceKnown: true,
  hotDicePending: false,
  hotDiceCount: 0
});

const snap = (s: TurnState): Snap => ({
  diceRemaining: s.diceRemaining,
  diceKnown: s.diceKnown,
  hotDicePending: s.hotDicePending,
  hotDiceCount: s.hotDiceCount
});

export const turnTotal = (s: TurnState): number => s.steps.reduce((a, st) => a + st.points, 0);

export function requiredMin(r: RuleSet, playerScore: number): number {
  return playerScore === 0 && r.firstEntryMin != null ? r.firstEntryMin : r.minBank;
}

/** ADD_STEP. `diceUsed` undefined means unknown (manual entry). */
export function addStep(s: TurnState, step: Step, r: RuleSet): Result<TurnState> {
  if (step.points <= 0) return { ok: false, reason: 'no-points' };
  const used = step.diceUsed;
  if (used !== undefined && s.diceKnown && used > s.diceRemaining) return { ok: false, reason: 'too-many-dice' };
  let { diceRemaining, diceKnown, hotDiceCount } = s;
  let hotDicePending = false;
  if (used === undefined) {
    diceKnown = false;
  } else if (diceKnown) {
    diceRemaining -= used;
    if (diceRemaining === 0 && r.hotDice) {
      diceRemaining = 6;
      hotDicePending = true;
      hotDiceCount += 1;
    }
  }
  return {
    ok: true,
    value: { steps: [...s.steps, step], history: [...s.history, { snap: snap(s), kind: 'step' }], diceRemaining, diceKnown, hotDicePending, hotDiceCount }
  };
}

/** FORCE_HOT_DICE: the user declares that all six dice scored (manual steps). */
export function forceHotDice(s: TurnState, r: RuleSet): TurnState {
  if (!r.hotDice) return s;
  return {
    ...s,
    history: [...s.history, { snap: snap(s), kind: 'force' }],
    diceRemaining: 6,
    diceKnown: true,
    hotDicePending: true,
    hotDiceCount: s.hotDiceCount + 1
  };
}

/** UNDO: pops the last step (or forced hot dice) and restores the previous snapshot. */
export function undoTurn(s: TurnState): TurnState {
  if (s.history.length === 0) return s;
  const last = s.history[s.history.length - 1];
  return { ...last.snap, steps: last.kind === 'force' ? s.steps : s.steps.slice(0, -1), history: s.history.slice(0, -1) };
}

export function bankWindowOpen(s: TurnState, r: RuleSet): boolean {
  if (r.bankRestriction === 'anytime') return true;
  if (s.hotDicePending || !s.diceKnown) return true;
  return r.bankRestriction === 'exactlyTwoOrHot' ? s.diceRemaining === 2 : s.diceRemaining <= 2;
}

export function bankStatus(s: TurnState, r: RuleSet, playerScore: number): BankStatus {
  const required = requiredMin(r, playerScore);
  const total = turnTotal(s);
  const minOk = total >= required;
  const diceOk = bankWindowOpen(s, r);
  return { canBank: s.steps.length > 0 && minOk && diceOk, minOk, diceOk, required, missing: Math.max(0, required - total) };
}
