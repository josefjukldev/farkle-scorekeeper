import { describe, expect, it } from 'vitest';
import { buildGame } from '../fixtures/makeGame';
import type { TurnSpec } from '../fixtures/makeGame';
import { generateReview } from '../../src/review';
import { classify, seeded } from '../../src/review/style';
import { computeStats } from '../../src/review/stats';

const rounds = (n: number, f: (round: number) => TurnSpec[]): TurnSpec[] => Array.from({ length: n }, (_, i) => f(i)).flat();

describe('style classification', () => {
  it('Newcomer with fewer than 4 turns', () => {
    const { game, turns } = buildGame(['A', 'B'], [{ p: 0, kind: 'bank', total: 500 }, { p: 1, kind: 'bank', total: 400 }]);
    expect(generateReview(game, turns).players.p0.style).toBe('newcomer');
  });

  it('Banker: one step per turn, almost no busts', () => {
    const specs = rounds(6, () => [{ p: 0, kind: 'bank', total: 400, steps: 1 }, { p: 1, kind: 'bank', total: 500, steps: 3 }]);
    const { game, turns } = buildGame(['Banky', 'Other'], specs);
    expect(generateReview(game, turns).players.p0.style).toBe('banker');
  });

  it('Gambler: many steps per turn', () => {
    const specs = rounds(6, () => [{ p: 0, kind: 'bank', total: 900, steps: 4 }, { p: 1, kind: 'bank', total: 500, steps: 2 }]);
    const { game, turns } = buildGame(['Gam', 'Other'], specs);
    expect(generateReview(game, turns).players.p0.style).toBe('gambler');
  });

  it('Gambler: large share of points lost to busts', () => {
    const specs = rounds(6, (i) => [i < 3 ? { p: 0, kind: 'bust' as const, total: 900, steps: 2 } : { p: 0, kind: 'bank' as const, total: 500, steps: 2 }, { p: 1, kind: 'bank', total: 400, steps: 2 }]);
    const { game, turns } = buildGame(['A', 'B'], specs);
    expect(generateReview(game, turns).players.p0.style).toBe('gambler');
  });

  it('Streaker: hot dice', () => {
    const specs = rounds(6, (i) => [{ p: 0, kind: 'bank', total: 500, steps: 2, hot: i < 2 ? 1 : 0 }, { p: 1, kind: 'bank', total: 500, steps: 2 }]);
    const { game, turns } = buildGame(['Hot', 'Other'], specs);
    expect(generateReview(game, turns).players.p0.style).toBe('streaker');
  });

  it('Tortoise: steady totals', () => {
    const specs = rounds(6, () => [{ p: 0, kind: 'bank', total: 500, steps: 2 }, { p: 1, kind: 'bank', total: 500, steps: 2 }]);
    const { game, turns } = buildGame(['Steady', 'Other'], specs);
    expect(generateReview(game, turns).players.p0.style).toBe('tortoise');
  });

  it('Unlucky: many busts', () => {
    const specs = rounds(6, (i) => [i % 2 ? { p: 0, kind: 'bank' as const, total: 400, steps: 2 } : { p: 0, kind: 'bust' as const, total: 100, steps: 2 }, { p: 1, kind: 'bank', total: 400, steps: 2 }]);
    const { game, turns } = buildGame(['Unl', 'Other'], specs);
    const r = generateReview(game, turns);
    expect(r.stats.p0.bustRate).toBe(0.5);
    expect(['unlucky', 'gambler']).toContain(r.players.p0.style);
  });

  it('Comeback Kid: overcomes a 3000 deficit and ranks in the top half', () => {
    const specs: TurnSpec[] = [];
    for (let i = 0; i < 4; i++) specs.push({ p: 1, kind: 'bank', total: 1000, steps: 2 }, { p: 0, kind: 'bust', total: 100, steps: 2 });
    for (let i = 0; i < 4; i++) specs.push({ p: 0, kind: 'bank', total: 1500, steps: 2 }, { p: 1, kind: 'bank', total: 100, steps: 2 });
    const { game, turns } = buildGame(['Kid', 'Lead'], specs);
    const r = generateReview(game, turns);
    expect(r.stats.p0.comeback).toBeGreaterThanOrEqual(3000);
    expect(r.stats.p0.rank).toBe(1);
  });

  it('Balanced: nothing stands out', () => {
    const specs = rounds(5, (i) => [{ p: 0, kind: i % 4 === 3 ? 'bust' : 'bank', total: [400, 700, 550, 300, 800][i], steps: 2 }, { p: 1, kind: 'bank', total: 450, steps: 2 }]);
    const { game, turns } = buildGame(['Bal', 'Other'], specs);
    const s = computeStats(game, turns).stats.p0;
    expect(classify({ ...s, avgStepsPerTurn: 2, hotDice: 0, bigTurns: 0, stdDev: 900, bustRate: 0.2, lostToBusts: 0, comeback: 0 }, 2)).toBe('balanced');
  });
});

describe('stats, awards, headline', () => {
  const specs: TurnSpec[] = [
    ...rounds(5, (i) => [
      { p: 0, kind: 'bank', total: 1200, steps: 2, hot: i === 0 ? 1 : 0 },
      { p: 1, kind: i === 2 ? 'bust' : 'bank', total: i === 2 ? 600 : 1100, steps: 3 }
    ] as TurnSpec[])
  ];
  const { game, turns } = buildGame(['Jana', 'Pavel'], specs);
  const review = generateReview(game, turns, 1);

  it('computes core stats', () => {
    const s = review.stats.p1;
    expect(s.turns).toBe(5);
    expect(s.busts).toBe(1);
    expect(s.bustRate).toBeCloseTo(0.2);
    expect(s.lostToBusts).toBe(600);
    expect(s.bestTurn).toBe(1100);
    expect(review.stats.p0.hotDice).toBe(1);
    expect(review.stats.p0.longestBankStreak).toBe(5);
  });
  it('always awards the winner and gives at most five awards', () => {
    expect(review.awards[0]).toMatchObject({ key: 'winner', playerId: 'p0' });
    expect(review.awards.length).toBeLessThanOrEqual(5);
    expect(review.awards.some((a) => a.key === 'bustedMost' && a.playerId === 'p1')).toBe(true);
    expect(review.awards.some((a) => a.key === 'biggestTurn' && a.playerId === 'p0')).toBe(true);
  });
  it('headline', () => {
    expect(review.headline.key).toBe('wins');
    expect(review.headline.params.winner).toBe('Jana');
  });
  it('photo finish headline when the gap is 250 or less', () => {
    const g = buildGame(['A', 'B'], [{ p: 0, kind: 'bank', total: 1000 }, { p: 1, kind: 'bank', total: 900 }]);
    expect(generateReview(g.game, g.turns).headline.key).toBe('photo');
  });
  it('tie headline', () => {
    const g = buildGame(['A', 'B'], [{ p: 0, kind: 'bank', total: 1000 }, { p: 1, kind: 'bank', total: 1000 }]);
    expect(generateReview(g.game, g.turns).headline.key).toBe('tie');
  });
  it('is deterministic for the same game id', () => {
    expect(generateReview(game, turns, 5).players).toEqual(generateReview(game, turns, 9).players);
    expect(seeded('abc', 'x', 3)).toBe(seeded('abc', 'x', 3));
    const variants = new Set(Array.from({ length: 40 }, (_, i) => seeded('game' + i, 'p', 3)));
    expect(variants.size).toBe(3);
  });
});
