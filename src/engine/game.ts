import { rankPlayers } from './ranking';
import type { RankRow } from './ranking';
import type { EndCondition, Id, RuleSet } from './types';

export type GameStatus = 'inProgress' | 'finalRound' | 'finishedPending' | 'archived';
export type TurnResult = 'banked' | 'bust' | 'discarded';

export interface PlayerRef {
  id: Id;
  name: string;
}

export interface GameCore {
  players: PlayerRef[];
  rules: RuleSet;
  end: EndCondition;
  status: GameStatus;
  currentIndex: number;
  round: number;
  scores: Record<Id, number>;
  consecutiveBusts: Record<Id, number>;
  turnsPlayed: Record<Id, number>;
  turnCount: number;
  finalRound?: { triggeredBy: Id; remaining: Id[] };
}

/** What the turn screen hands to the game engine when a turn ends. */
export interface TurnInput {
  playerId: Id;
  kind: TurnResult;
  /** banked: points added. bust / discarded: the unbanked total that was lost. */
  total: number;
}

export interface TurnOutcome {
  playerId: Id;
  result: TurnResult;
  turnTotal: number;
  lostTotal: number;
  penalty: number;
  scoreBefore: number;
  scoreAfter: number;
  round: number;
  index: number;
  inFinalRound: boolean;
}

export const isFinished = (g: GameCore): boolean => g.status === 'finishedPending' || g.status === 'archived';

export function newGame(players: PlayerRef[], rules: RuleSet, end: EndCondition): GameCore {
  const zero = (): Record<Id, number> => Object.fromEntries(players.map((p) => [p.id, 0]));
  return {
    players,
    rules,
    end,
    status: 'inProgress',
    currentIndex: 0,
    round: 1,
    scores: zero(),
    consecutiveBusts: zero(),
    turnsPlayed: zero(),
    turnCount: 0
  };
}

export const currentPlayer = (g: GameCore): PlayerRef => g.players[g.currentIndex];

function advance(g: GameCore): GameCore {
  if (g.finalRound) {
    const remaining = g.finalRound.remaining.slice(1);
    if (remaining.length === 0) return { ...g, status: 'finishedPending', finalRound: { ...g.finalRound, remaining } };
    const idx = g.players.findIndex((p) => p.id === remaining[0]);
    const round = idx <= g.currentIndex ? g.round + 1 : g.round;
    return { ...g, currentIndex: idx, round, finalRound: { ...g.finalRound, remaining } };
  }
  const idx = (g.currentIndex + 1) % g.players.length;
  return { ...g, currentIndex: idx, round: idx === 0 ? g.round + 1 : g.round };
}

function startFinalRound(g: GameCore, triggerId: Id): GameCore {
  const mode = g.rules.finalRound;
  if (mode === 'none') return { ...g, status: 'finishedPending', finalRound: { triggeredBy: triggerId, remaining: [] } };
  const n = g.players.length;
  const t = g.players.findIndex((p) => p.id === triggerId);
  const order = Array.from({ length: n - 1 }, (_, k) => g.players[(t + 1 + k) % n].id);
  const remaining =
    mode === 'oneMoreTurnEach' ? order : order.filter((id) => g.turnsPlayed[id] < g.turnsPlayed[triggerId]);
  if (remaining.length === 0) return { ...g, status: 'finishedPending', finalRound: { triggeredBy: triggerId, remaining } };
  const first = g.players.findIndex((p) => p.id === remaining[0]);
  return {
    ...g,
    status: 'finalRound',
    finalRound: { triggeredBy: triggerId, remaining },
    currentIndex: first,
    round: first <= t ? g.round + 1 : g.round
  };
}

/** Applies one finished turn. Pure: returns the new core state and the outcome record. */
export function applyTurn(g: GameCore, input: TurnInput, opts: { timeUp?: boolean } = {}): { core: GameCore; outcome: TurnOutcome } {
  const id = input.playerId;
  const before = g.scores[id] ?? 0;
  let after = before;
  let penalty = 0;
  const consec = { ...g.consecutiveBusts };
  let turnTotal = 0;
  let lost = 0;

  if (input.kind === 'banked') {
    after = before + input.total;
    turnTotal = input.total;
    consec[id] = 0;
  } else if (input.kind === 'bust') {
    lost = input.total;
    consec[id] = (consec[id] ?? 0) + 1;
    const bp = g.rules.bustPenalty;
    if (bp && consec[id] === bp.afterConsecutive) {
      penalty = Math.min(bp.points, before);
      after = before - penalty;
      consec[id] = 0;
    }
  } else {
    lost = input.total;
  }

  const outcome: TurnOutcome = {
    playerId: id,
    result: input.kind,
    turnTotal,
    lostTotal: lost,
    penalty,
    scoreBefore: before,
    scoreAfter: after,
    round: g.round,
    index: g.turnCount,
    inFinalRound: g.status === 'finalRound'
  };

  let next: GameCore = {
    ...g,
    scores: { ...g.scores, [id]: after },
    consecutiveBusts: consec,
    turnsPlayed: { ...g.turnsPlayed, [id]: (g.turnsPlayed[id] ?? 0) + 1 },
    turnCount: g.turnCount + 1
  };

  const triggered =
    g.status === 'inProgress' && g.end.type === 'target' && input.kind === 'banked' && after >= g.end.targetScore;

  if (opts.timeUp) {
    next = { ...next, status: 'finishedPending' };
  } else if (triggered) {
    next = startFinalRound(next, id);
  } else if (!isFinished(next)) {
    next = advance(next);
  }
  return { core: next, outcome };
}

/** Manual "End game now": uses current banked scores. */
export function endNow(g: GameCore): GameCore {
  return isFinished(g) ? g : { ...g, status: 'finishedPending' };
}

export interface TurnLike {
  playerId: Id;
  result: TurnResult;
  turnTotal: number;
}

export function finalRanking(g: GameCore, turns: TurnLike[]): RankRow[] {
  return rankPlayers(
    g.players.map((p) => {
      const mine = turns.filter((t) => t.playerId === p.id && t.result !== 'discarded');
      return {
        playerId: p.id,
        score: g.scores[p.id] ?? 0,
        turns: mine.length,
        busts: mine.filter((t) => t.result === 'bust').length,
        bestTurn: mine.reduce((m, t) => Math.max(m, t.result === 'banked' ? t.turnTotal : 0), 0)
      };
    })
  );
}

export interface ReplayEntry {
  input: TurnInput;
  timeUp?: boolean;
}

/** Rebuilds a game from a fresh start by folding turn inputs; used after editing past turns. */
export function replay(base: GameCore, entries: ReplayEntry[]): { core: GameCore; outcomes: TurnOutcome[] } {
  let core = base;
  const outcomes: TurnOutcome[] = [];
  for (const e of entries) {
    const r = applyTurn(core, e.input, { timeUp: e.timeUp });
    core = r.core;
    outcomes.push(r.outcome);
  }
  return { core, outcomes };
}
