import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { cs } from '../../src/i18n/cs';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : /\.(ts|tsx)$/.test(f) ? [join(dir, f)] : []));
const src = files('src').filter((f) => !f.includes('i18n')).map((f) => readFileSync(f, 'utf8')).join('\n');
const used = [...new Set([...src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]))].filter((k) => !k.endsWith('.'));
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('has every used key in both languages', () => {
    expect(used.filter((k) => !(k in en))).toEqual([]);
    expect(used.filter((k) => !(k in cs))).toEqual([]);
  });
  it('has the same keys in cs and en', () => {
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
  });
  it('uses the same placeholders in both languages', () => {
    const bad = Object.keys(en).filter((k) => JSON.stringify(params(en[k])) !== JSON.stringify(params(cs[k] ?? '')));
    expect(bad).toEqual([]);
  });
  it('has dynamic keys: dice rules, styles with three variants, tags, awards, headlines', () => {
    for (const m of ['anytime', 'atMostTwoOrHot', 'exactlyTwoOrHot']) expect(en['new.dice.' + m]).toBeTruthy();
    for (const s of ['newcomer', 'banker', 'gambler', 'streaker', 'comeback', 'tortoise', 'unlucky', 'balanced']) {
      expect(en[`style.${s}.name`]).toBeTruthy();
      for (const v of [0, 1, 2]) { expect(en[`style.${s}.fb.${v}`]).toBeTruthy(); expect(cs[`style.${s}.fb.${v}`]).toBeTruthy(); }
    }
    for (const a of ['winner', 'biggestTurn', 'mostHotDice', 'bustedMost', 'mostConsistent', 'bestComeback', 'closestFinish']) expect(en[`award.${a}.title`]).toBeTruthy();
    for (const h of ['wins', 'photo', 'comebackShort', 'tie']) expect(cs[`headline.${h}`]).toBeTruthy();
  });
});

import { translate } from '../../src/i18n';
describe('plural forms', () => {
  it('english', () => {
    expect(translate('en', 'final.rounds', { n: 1 })).toBe('1 round');
    expect(translate('en', 'final.rounds', { n: 3 })).toBe('3 rounds');
  });
  it('czech uses one / few / many', () => {
    expect(translate('cs', 'final.rounds', { n: 1 })).toBe('1 kolo');
    expect(translate('cs', 'final.rounds', { n: 3 })).toBe('3 kola');
    expect(translate('cs', 'final.rounds', { n: 11 })).toBe('11 kol');
  });
});
