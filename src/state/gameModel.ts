import { newGame, finalRanking } from '../engine/game';
import type { GameCore, TurnOutcome } from '../engine/game';
import { addStep, initTurn } from '../engine/turn';
import type { TurnState } from '../engine/turn';
import type { Step } from '../engine/types';
import type { Game, GameResult, Turn } from '../storage/types';

export const coreOf = (g: Game): GameCore => ({
  players: g.players.map((p) => ({ id: p.playerId, name: p.name })),
  rules: g.rules,
  end: g.endCondition,
  status: g.status,
  currentIndex: g.currentPlayerIndex,
  round: g.round,
  scores: g.scores,
  consecutiveBusts: g.consecutiveBusts,
  turnsPlayed: g.turnsPlayed,
  turnCount: g.turnCount,
  finalRound: g.finalRound
});

export const baseCoreOf = (g: Game): GameCore =>
  newGame(g.players.map((p) => ({ id: p.playerId, name: p.name })), g.rules, g.endCondition);

export const withCore = (g: Game, c: GameCore): Game => ({
  ...g,
  status: c.status,
  currentPlayerIndex: c.currentIndex,
  round: c.round,
  scores: c.scores,
  consecutiveBusts: c.consecutiveBusts,
  turnsPlayed: c.turnsPlayed,
  turnCount: c.turnCount,
  finalRound: c.finalRound
});

export function resultOf(core: GameCore, turns: Turn[]): GameResult {
  const ranking = finalRanking(core, turns);
  return { ranking, winnerIds: ranking.filter((r) => r.rank === 1).map((r) => r.playerId) };
}

export function remainingMs(g: Game, now: number): number | null {
  if (g.endCondition.type !== 'time' || !g.timer) return null;
  const run = g.timer.running && g.timer.lastResumeAt ? now - g.timer.lastResumeAt : 0;
  return g.endCondition.limitMs - (g.timer.elapsedMs + run);
}

export function turnFromOutcome(
  base: { id: string; gameId: string; startedAt: number; endedAt: number; steps: Step[]; hotDiceCount: number; timeUp?: boolean },
  o: TurnOutcome
): Turn {
  return {
    id: base.id,
    gameId: base.gameId,
    playerId: o.playerId,
    round: o.round,
    index: o.index,
    steps: base.steps,
    result: o.result,
    turnTotal: o.turnTotal,
    lostTotal: o.lostTotal,
    penalty: o.penalty,
    hotDiceCount: base.hotDiceCount,
    rollsCount: base.steps.length + (o.result === 'bust' ? 1 : 0),
    startedAt: base.startedAt,
    endedAt: base.endedAt,
    scoreBefore: o.scoreBefore,
    scoreAfter: o.scoreAfter,
    inFinalRound: o.inFinalRound,
    timeUp: base.timeUp
  };
}

/** Rebuilds an in-progress turn from recorded steps (used when undoing a finished turn). */
export function rebuildTurn(steps: Step[], g: Game): TurnState {
  let s = initTurn();
  for (const st of steps) {
    const r = addStep(s, st, g.rules);
    if (r.ok) s = r.value;
  }
  return s;
}
