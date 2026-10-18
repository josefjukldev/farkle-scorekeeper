import { describe, expect, it } from 'vitest';
import { addStep, bankStatus, forceHotDice, initTurn, turnTotal, undoTurn, requiredMin } from '../../src/engine/turn';
import type { TurnState } from '../../src/engine/turn';
import { HOUSE_RULES } from '../../src/engine/presets';
import type { RuleSet, Step } from '../../src/engine/types';

let n = 0;
const step = (points: number, diceUsed?: number): Step => ({ id: `s${n++}`, points, source: diceUsed === undefined ? 'manual' : 'quick', diceUsed, at: 0 });
const run = (steps: [number, number?][], r: RuleSet = HOUSE_RULES): TurnState => {
  let s = initTurn();
  for (const [p, d] of steps) {
    const res = addStep(s, step(p, d), r);
    if (!res.ok) throw new Error(res.reason);
    s = res.value;
  }
  return s;
};

describe('turn machine', () => {
  it('tracks dice and total', () => {
    const s = run([[400, 3], [100, 1]]);
    expect(turnTotal(s)).toBe(500);
    expect(s.diceRemaining).toBe(2);
  });
  it('rejects more dice than remaining', () => {
    const s = run([[400, 3]]);
    expect(addStep(s, step(1000, 4), HOUSE_RULES).ok).toBe(false);
  });
  it('bank window: blocked with 3 dice left, allowed with 2 and 1', () => {
    expect(bankStatus(run([[400, 3]]), HOUSE_RULES, 100).canBank).toBe(false);
    expect(bankStatus(run([[400, 3]]), HOUSE_RULES, 100).diceOk).toBe(false);
    expect(bankStatus(run([[400, 3], [100, 1]]), HOUSE_RULES, 100).canBank).toBe(true);
    expect(bankStatus(run([[100, 1], [50, 1], [200, 3]]), HOUSE_RULES, 100).canBank).toBe(true);
  });
  it('exactlyTwoOrHot blocks banking with 1 die left', () => {
    const r: RuleSet = { ...HOUSE_RULES, bankRestriction: 'exactlyTwoOrHot' };
    expect(bankStatus(run([[100, 1], [50, 1], [200, 3]], r), r, 100).canBank).toBe(false);
    expect(bankStatus(run([[400, 3], [100, 1]], r), r, 100).canBank).toBe(true);
  });
  it('anytime ignores dice', () => {
    const r: RuleSet = { ...HOUSE_RULES, bankRestriction: 'anytime' };
    expect(bankStatus(run([[400, 3]], r), r, 100).canBank).toBe(true);
  });
  it('minimum: allowed at exactly the minimum, blocked below it', () => {
    expect(bankStatus(run([[300, 3], [50, 1]]), HOUSE_RULES, 100).canBank).toBe(true);
    expect(bankStatus(run([[300, 3], [50, 1]]), { ...HOUSE_RULES, minBank: 400 }, 100).canBank).toBe(false);
    const low = run([[200, 3], [100, 1]]);
    const st = bankStatus(low, HOUSE_RULES, 100);
    expect(st.canBank).toBe(false);
    expect(st.missing).toBe(50);
    expect(st.minOk).toBe(false);
  });
  it('hot dice resets dice and opens the bank window', () => {
    const s = run([[1000, 3], [500, 3]]);
    expect(s.hotDicePending).toBe(true);
    expect(s.diceRemaining).toBe(6);
    expect(s.hotDiceCount).toBe(1);
    expect(bankStatus(s, HOUSE_RULES, 100).canBank).toBe(true);
    const next = addStep(s, step(100, 1), HOUSE_RULES);
    expect(next.ok && next.value.hotDicePending).toBe(false);
  });
  it('hot dice off keeps diceRemaining at 0', () => {
    const r: RuleSet = { ...HOUSE_RULES, hotDice: false };
    const s = run([[1000, 3], [500, 3]], r);
    expect(s.diceRemaining).toBe(0);
    expect(s.hotDicePending).toBe(false);
  });
  it('manual step with unknown dice opens the window and can be forced to hot dice', () => {
    const s = run([[400]]);
    expect(s.diceKnown).toBe(false);
    expect(bankStatus(s, HOUSE_RULES, 100).canBank).toBe(true);
    const h = forceHotDice(s, HOUSE_RULES);
    expect(h.diceKnown).toBe(true);
    expect(h.hotDicePending).toBe(true);
    expect(turnTotal(h)).toBe(400);
    expect(turnTotal(undoTurn(h))).toBe(400);
    expect(undoTurn(h).diceKnown).toBe(false);
  });
  it('first-entry minimum applies only at score 0', () => {
    const r: RuleSet = { ...HOUSE_RULES, firstEntryMin: 500 };
    expect(requiredMin(r, 0)).toBe(500);
    expect(requiredMin(r, 50)).toBe(350);
    expect(requiredMin(HOUSE_RULES, 0)).toBe(350);
  });
  it('undo restores dice across steps and hot dice', () => {
    const s = run([[1000, 3], [500, 3]]);
    const u = undoTurn(s);
    expect(u.diceRemaining).toBe(3);
    expect(u.hotDicePending).toBe(false);
    expect(turnTotal(u)).toBe(1000);
    expect(undoTurn(undoTurn(u)).steps).toHaveLength(0);
    expect(undoTurn(initTurn())).toEqual(initTurn());
  });
  it('cannot bank an empty turn', () => {
    expect(bankStatus(initTurn(), HOUSE_RULES, 0).canBank).toBe(false);
  });
});
