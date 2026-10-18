import { describe, expect, it } from 'vitest';
import { scoreSelection } from '../../src/engine/score';
import { CLASSIC_RULES, HOUSE_RULES } from '../../src/engine/presets';
import { countsOf } from '../../src/engine/types';
import type { Counts, RuleSet } from '../../src/engine/types';

const ok = (c: Partial<Counts>, r: RuleSet = HOUSE_RULES) => scoreSelection(countsOf(c), r);
const pts = (c: Partial<Counts>, r: RuleSet = HOUSE_RULES) => {
  const s = ok(c, r);
  return s.valid ? [s.points, s.diceUsed] : s.reason;
};

describe('scoreSelection worked examples (03 section 9)', () => {
  it('1 single 1', () => expect(pts({ 1: 1 })).toEqual([100, 1]));
  it('2 two 5s', () => expect(pts({ 5: 2 })).toEqual([100, 2]));
  it('3 one and five', () => expect(pts({ 1: 1, 5: 1 })).toEqual([150, 2]));
  it('4 three 2s', () => expect(pts({ 2: 3 })).toEqual([200, 3]));
  it('5 three 6s', () => expect(pts({ 6: 3 })).toEqual([600, 3]));
  it('6 three 1s', () => expect(pts({ 1: 3 })).toEqual([1000, 3]));
  it('7 four 1s', () => expect(pts({ 1: 4 })).toEqual([2000, 4]));
  it('8 four 4s multiplier', () => expect(pts({ 4: 4 })).toEqual([800, 4]));
  it('9 two triples', () => expect(pts({ 3: 3, 5: 3 })).toEqual([800, 6]));
  it('10 straight', () => expect(pts({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 })).toEqual([1000, 6]));
  it('11 dead dice 2:2', () => expect(pts({ 2: 2 })).toBe('dead-die-2'));
  it('12 dead die 2', () => expect(pts({ 1: 1, 2: 1 })).toBe('dead-die-2'));
  it('13 three 5s in off mode', () => expect(pts({ 5: 3 }, { ...HOUSE_RULES, nOfKindMode: 'off' })).toEqual([500, 3]));
  it('14 six 1s multiplier', () => expect(pts({ 1: 6 })).toEqual([4000, 6]));
  it('14b six 1s doubling', () => expect(pts({ 1: 6 }, CLASSIC_RULES)).toEqual([8000, 6]));
  it('14c five 2s multiplier', () => expect(pts({ 2: 5 })).toEqual([600, 5]));
  it('15 empty', () => expect(pts({})).toBe('empty'));
  it('16 four 1s off', () => expect(pts({ 1: 4 }, { ...HOUSE_RULES, nOfKindMode: 'off' })).toEqual([1100, 4]));
  it('16b four 5s off', () => expect(pts({ 5: 4 }, { ...HOUSE_RULES, nOfKindMode: 'off' })).toEqual([550, 4]));
  it('17 four 4s off is invalid', () => expect(pts({ 4: 4 }, { ...HOUSE_RULES, nOfKindMode: 'off' })).toBe('dead-die-4'));
  it('18 mixed', () => expect(pts({ 1: 4, 5: 2 })).toEqual([2100, 6]));
  it('19 six 2s', () => expect(pts({ 2: 6 })).toEqual([800, 6]));
  it('20 seven dice', () => expect(pts({ 1: 7 })).toBe('too-many'));
});

describe('rule variations', () => {
  it('straight disabled turns the straight into dead dice', () => {
    expect(pts({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, { ...HOUSE_RULES, straight: null })).toBe('dead-die-2');
  });
  it('classic straight is 1500', () => expect(pts({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, CLASSIC_RULES)).toEqual([1500, 6]));
  it('table mode uses the table', () => {
    const r: RuleSet = {
      ...HOUSE_RULES,
      nOfKindMode: 'table',
      nOfKindTable: { 1: { four: 2000, five: 3000, six: 5000 }, 2: { four: 300, five: 500, six: 700 }, 3: { four: 0, five: 0, six: 0 }, 4: { four: 0, five: 0, six: 0 }, 5: { four: 0, five: 0, six: 0 }, 6: { four: 0, five: 0, six: 0 } }
    };
    expect(pts({ 2: 5 }, r)).toEqual([500, 5]);
    expect(pts({ 1: 6 }, r)).toEqual([5000, 6]);
  });
  it('table mode without a table is invalid', () => {
    expect(pts({ 2: 4 }, { ...HOUSE_RULES, nOfKindMode: 'table' })).toBe('dead-die-2');
  });
});
