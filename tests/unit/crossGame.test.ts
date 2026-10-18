import { describe, expect, it } from 'vitest';
import { buildGame } from '../fixtures/makeGame';
import { generateReview } from '../../src/review';
import { aggregatePlayers } from '../../src/review/crossGame';

const archived = (id: string, names: string[], specs: Parameters<typeof buildGame>[1]) => {
  const { game, turns } = buildGame(names, specs, { id });
  return { ...game, status: 'archived' as const, review: generateReview(game, turns) };
};

describe('cross-game player statistics', () => {
  const g1 = archived(
    'a',
    ['Ann', 'Bob'],
    [
      { p: 0, kind: 'bank', total: 1000 },
      { p: 1, kind: 'bust', total: 200 },
      { p: 0, kind: 'bank', total: 500 },
      { p: 1, kind: 'bank', total: 400 }
    ]
  );
  const g2 = archived(
    'b',
    ['bob', 'ANN'],
    [
      { p: 0, kind: 'bank', total: 900 },
      { p: 1, kind: 'bank', total: 300 }
    ]
  );
  const rows = aggregatePlayers([g1, g2]);

  it('matches players by name ignoring case and counts games and wins', () => {
    expect(rows.map((r) => r.name).sort()).toEqual(
      ['Ann', 'Bob'].sort().map((n) => rows.find((r) => r.name.toLowerCase() === n.toLowerCase())!.name)
    );
    const ann = rows.find((r) => r.name.toLowerCase() === 'ann')!;
    const bob = rows.find((r) => r.name.toLowerCase() === 'bob')!;
    expect(ann).toMatchObject({ games: 2, wins: 1, winRate: 0.5 });
    expect(bob).toMatchObject({ games: 2, wins: 1 });
  });
  it('aggregates turns, busts and the best turn', () => {
    const bob = rows.find((r) => r.name.toLowerCase() === 'bob')!;
    expect(bob.turns).toBe(3);
    expect(bob.busts).toBe(1);
    expect(bob.bustRate).toBeCloseTo(1 / 3);
    expect(bob.bestTurn).toBe(900);
  });
  it('ignores games that are not archived and handles an empty list', () => {
    expect(aggregatePlayers([{ ...g1, status: 'finishedPending' }])).toEqual([]);
    expect(aggregatePlayers([])).toEqual([]);
  });
});
