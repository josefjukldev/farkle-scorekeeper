import { describe, expect, it } from 'vitest';
import { applyTurn, endNow, finalRanking, newGame, replay } from '../../src/engine/game';
import type { GameCore, TurnInput } from '../../src/engine/game';
import { HOUSE_RULES } from '../../src/engine/presets';
import { rankPlayers } from '../../src/engine/ranking';
import { validateEnd, validateManualStep, validatePlayerNames, validateRuleSet } from '../../src/engine/validate';
import { quickPicks } from '../../src/engine/quickPicks';
import { scoreSelection } from '../../src/engine/score';
import type { RuleSet } from '../../src/engine/types';

const players = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() }));
const target = (t: number, r: RuleSet = HOUSE_RULES) => newGame(players, r, { type: 'target', targetScore: t });
const bank = (g: GameCore, total: number) => applyTurn(g, { playerId: players[g.currentIndex].id, kind: 'banked', total }).core;
const bust = (g: GameCore, lost = 0) => applyTurn(g, { playerId: players[g.currentIndex].id, kind: 'bust', total: lost }).core;

describe('turn order and rounds', () => {
  it('rotates and increments the round on wrap', () => {
    let g = target(10000);
    g = bank(g, 400);
    expect(g.currentIndex).toBe(1);
    expect(g.round).toBe(1);
    g = bust(bank(g, 500));
    expect(g.currentIndex).toBe(0);
    expect(g.round).toBe(2);
    expect(g.scores).toEqual({ a: 400, b: 500, c: 0 });
  });
  it('bust keeps the score and counts consecutive busts', () => {
    let g = target(10000);
    g = bust(g, 300);
    expect(g.scores.a).toBe(0);
    expect(g.consecutiveBusts.a).toBe(1);
  });
  it('bust penalty after N consecutive busts, not below zero', () => {
    const r: RuleSet = { ...HOUSE_RULES, bustPenalty: { afterConsecutive: 3, points: 500 } };
    let g = target(10000, r);
    const play = (kind: 'banked' | 'bust', total: number) => {
      const res = applyTurn(g, { playerId: 'a', kind, total });
      g = { ...res.core, currentIndex: 0 };
      return res.outcome;
    };
    play('banked', 400);
    play('bust', 0);
    play('bust', 0);
    const third = play('bust', 0);
    expect(third.penalty).toBe(400);
    expect(g.scores.a).toBe(0);
    expect(g.consecutiveBusts.a).toBe(0);
  });
  it('a bank resets the bust counter', () => {
    const r: RuleSet = { ...HOUSE_RULES, bustPenalty: { afterConsecutive: 2, points: 100 } };
    let g = target(10000, r);
    g = { ...bust(g), currentIndex: 0 };
    g = { ...bank(g, 400), currentIndex: 0 };
    expect(g.consecutiveBusts.a).toBe(0);
  });
});

describe('final round', () => {
  const setup = (mode: RuleSet['finalRound'], triggerIdx: number) => {
    const r: RuleSet = { ...HOUSE_RULES, finalRound: mode };
    let g = target(1000, r);
    // everyone plays one round of 400 up to the trigger seat, trigger seat banks 1000
    for (let i = 0; i < triggerIdx; i++) g = bank(g, 400);
    g = bank(g, 1000);
    return g;
  };
  it("'none' finishes immediately", () => {
    const g = setup('none', 1);
    expect(g.status).toBe('finishedPending');
  });
  it("'oneMoreTurnEach' (middle seat): every other player plays once more", () => {
    let g = setup('oneMoreTurnEach', 1);
    expect(g.status).toBe('finalRound');
    expect(g.finalRound?.remaining).toEqual(['c', 'a']);
    expect(g.currentIndex).toBe(2);
    g = bank(g, 100);
    expect(g.currentIndex).toBe(0);
    expect(g.status).toBe('finalRound');
    g = bank(g, 100);
    expect(g.status).toBe('finishedPending');
    expect(g.scores).toEqual({ a: 500, b: 1000, c: 100 });
  });
  it("'oneMoreTurnEach' (last seat): the other two play", () => {
    const g = setup('oneMoreTurnEach', 2);
    expect(g.finalRound?.remaining).toEqual(['a', 'b']);
    expect(g.currentIndex).toBe(0);
  });
  it("'equalTurns' (last seat) finishes at once", () => {
    expect(setup('equalTurns', 2).status).toBe('finishedPending');
  });
  it("'equalTurns' (first seat): seats after play to equalize", () => {
    let g = setup('equalTurns', 0);
    expect(g.status).toBe('finalRound');
    expect(g.finalRound?.remaining).toEqual(['b', 'c']);
    g = bank(bank(g, 10), 10);
    expect(g.status).toBe('finishedPending');
  });
  it('double trigger during the final round changes nothing', () => {
    let g = setup('oneMoreTurnEach', 1);
    const triggeredBy = g.finalRound?.triggeredBy;
    g = bank(g, 2000);
    expect(g.finalRound?.triggeredBy).toBe(triggeredBy);
    expect(g.status).toBe('finalRound');
    expect(g.finalRound?.remaining).toEqual(['a']);
  });
  it('bust in the final round scores 0 for the turn', () => {
    let g = setup('oneMoreTurnEach', 1);
    g = bust(g, 200);
    expect(g.scores.c).toBe(0);
  });
  it('flags the outcome as final round', () => {
    const g = setup('oneMoreTurnEach', 1);
    const out = applyTurn(g, { playerId: 'c', kind: 'banked', total: 100 }).outcome;
    expect(out.inFinalRound).toBe(true);
  });
});

describe('time mode and manual end', () => {
  const timeGame = () => newGame(players, HOUSE_RULES, { type: 'time', limitMs: 60000 });
  it('never triggers a final round on score', () => {
    let g = timeGame();
    g = bank(g, 50000);
    expect(g.status).toBe('inProgress');
  });
  it('timeUp after the current turn ends the game (finishTurn)', () => {
    const res = applyTurn(timeGame(), { playerId: 'a', kind: 'banked', total: 400 }, { timeUp: true });
    expect(res.core.status).toBe('finishedPending');
    expect(res.core.scores.a).toBe(400);
  });
  it('immediate discards the unbanked turn', () => {
    const res = applyTurn(timeGame(), { playerId: 'a', kind: 'discarded', total: 900 }, { timeUp: true });
    expect(res.core.status).toBe('finishedPending');
    expect(res.core.scores.a).toBe(0);
    expect(res.outcome.result).toBe('discarded');
  });
  it('endNow keeps scores', () => {
    const g = endNow(bank(timeGame(), 400));
    expect(g.status).toBe('finishedPending');
    expect(g.scores.a).toBe(400);
  });
});

describe('ranking', () => {
  const row = (playerId: string, score: number) => ({ playerId, score, turns: 1, busts: 0, bestTurn: 0 });
  it('distinct scores', () => expect(rankPlayers([row('a', 1), row('b', 3), row('c', 2)]).map((r) => r.rank)).toEqual([1, 2, 3]));
  it('ties share a rank (1, 1, 3)', () =>
    expect(rankPlayers([row('a', 5), row('b', 5), row('c', 1)]).map((r) => r.rank)).toEqual([1, 1, 3]));
  it('all zero is a full tie', () => expect(rankPlayers([row('a', 0), row('b', 0)]).map((r) => r.rank)).toEqual([1, 1]));
  it('finalRanking counts turns, busts and best', () => {
    let g = target(10000);
    g = bust(bank(g, 400), 100);
    const turns = [
      { playerId: 'a', result: 'banked' as const, turnTotal: 400 },
      { playerId: 'b', result: 'bust' as const, turnTotal: 0 }
    ];
    const rk = finalRanking(g, turns);
    expect(rk[0]).toMatchObject({ playerId: 'a', rank: 1, turns: 1, busts: 0, bestTurn: 400 });
    expect(rk.find((r) => r.playerId === 'b')).toMatchObject({ busts: 1, turns: 1 });
  });
});

describe('replay (editing past turns)', () => {
  it('recomputes totals after an edit', () => {
    const base = target(10000);
    const inputs: TurnInput[] = [
      { playerId: 'a', kind: 'banked', total: 500 },
      { playerId: 'b', kind: 'bust', total: 100 },
      { playerId: 'c', kind: 'banked', total: 350 }
    ];
    const first = replay(
      base,
      inputs.map((input) => ({ input }))
    );
    expect(first.core.scores).toEqual({ a: 500, b: 0, c: 350 });
    const edited = [...inputs];
    edited[1] = { playerId: 'b', kind: 'banked', total: 600 };
    const second = replay(
      base,
      edited.map((input) => ({ input }))
    );
    expect(second.core.scores.b).toBe(600);
    expect(second.outcomes[1].scoreAfter).toBe(600);
  });
});

describe('validation and quick picks', () => {
  it('house rules are valid', () => expect(validateRuleSet(HOUSE_RULES)).toEqual([]));
  it('rejects odd values', () => expect(validateRuleSet({ ...HOUSE_RULES, minBank: 355 })).toContain('minBank'));
  it('target bounds', () => {
    expect(validateEnd({ type: 'target', targetScore: 10000 }, HOUSE_RULES)).toEqual([]);
    expect(validateEnd({ type: 'target', targetScore: 500 }, HOUSE_RULES)).toEqual(['targetScore']);
    expect(validateEnd({ type: 'time', limitMs: 241 * 60000 }, HOUSE_RULES)).toEqual(['limitMs']);
    expect(validateEnd({ type: 'time', limitMs: 60000 }, HOUSE_RULES)).toEqual([]);
  });
  it('manual steps', () => {
    expect(validateManualStep(350, HOUSE_RULES)).toBe(true);
    expect(validateManualStep(355, HOUSE_RULES)).toBe(false);
    expect(validateManualStep(20050, HOUSE_RULES)).toBe(false);
    expect(validateManualStep(0, HOUSE_RULES)).toBe(false);
  });
  it('player names', () => {
    expect(validatePlayerNames(['Ann', 'Bob'])).toEqual([]);
    expect(validatePlayerNames(['Ann', 'ann'])).toContain('name-1-duplicate');
    expect(validatePlayerNames(['Ann', ''])).toContain('name-1-length');
    expect(validatePlayerNames(['Ann'])).toContain('player-count');
  });
  it('quick picks equal scoreSelection for every preset', () => {
    for (const r of [
      HOUSE_RULES,
      { ...HOUSE_RULES, nOfKindMode: 'doubling' as const, straight: 1500 },
      { ...HOUSE_RULES, straight: null }
    ]) {
      for (const q of quickPicks(r)) {
        const s = scoreSelection(q.counts, r);
        expect(s).toEqual({ valid: true, points: q.points, diceUsed: q.diceUsed });
      }
    }
    expect(quickPicks({ ...HOUSE_RULES, straight: null }).some((q) => q.key === 'straight')).toBe(false);
    expect(quickPicks(HOUSE_RULES).find((q) => q.key === '4x1')?.points).toBe(2000);
  });
});
