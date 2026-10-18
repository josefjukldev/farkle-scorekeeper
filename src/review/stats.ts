import { T } from './thresholds';
import type { PlayerStats } from './types';
import type { Game, Turn } from '../storage/types';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function longest(results: boolean[]): number {
  let best = 0;
  let cur = 0;
  for (const r of results) {
    cur = r ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

/** Deficit/leader timeline. leaderAfter[i] is the top score after turn i. */
function timeline(game: Game, turns: Turn[]) {
  const scores: Record<string, number> = Object.fromEntries(game.players.map((p) => [p.playerId, 0]));
  const maxDeficit: Record<string, number> = { ...scores };
  const leadChanges: Record<string, number> = { ...scores };
  let leader: string | null = null;
  for (const t of turns) {
    scores[t.playerId] = t.scoreAfter;
    const top = Math.max(...Object.values(scores));
    for (const id of Object.keys(scores)) maxDeficit[id] = Math.max(maxDeficit[id], top - scores[id]);
    const leaders = Object.keys(scores).filter((id) => scores[id] === top);
    if (leaders.length === 1 && leaders[0] !== leader) {
      if (top > 0) leadChanges[leaders[0]] += 1;
      leader = leaders[0];
    }
  }
  return { maxDeficit, leadChanges, totalLeadChanges: Object.values(leadChanges).reduce((a, b) => a + b, 0) };
}

export function computeStats(game: Game, turns: Turn[]): { stats: Record<string, PlayerStats>; leadChanges: number } {
  const ordered = [...turns].sort((a, b) => a.index - b.index);
  const rankOf = Object.fromEntries((game.result?.ranking ?? []).map((r) => [r.playerId, r.rank]));
  const tl = timeline(game, ordered);
  const topScore = Math.max(...Object.values(game.scores));
  const stats: Record<string, PlayerStats> = {};

  for (const p of game.players) {
    const mine = ordered.filter((t) => t.playerId === p.playerId && t.result !== 'discarded');
    const banked = mine.filter((t) => t.result === 'banked');
    const bustTurns = mine.filter((t) => t.result === 'bust');
    const bankedTotals = banked.map((t) => t.turnTotal);
    const avgBank = banked.length ? sum(bankedTotals) / banked.length : 0;
    let stdDev: number | null = null;
    if (banked.length >= T.tortoise.minBanked) {
      stdDev = Math.sqrt(sum(bankedTotals.map((x) => (x - avgBank) ** 2)) / banked.length);
    }
    const lost = sum(bustTurns.map((t) => t.lostTotal));
    const finalScore = game.scores[p.playerId] ?? 0;
    const rank = rankOf[p.playerId] ?? 0;
    const deficit = tl.maxDeficit[p.playerId];
    const overcame = rank === 1 || topScore - finalScore <= T.comebackFinishWindow;
    stats[p.playerId] = {
      turns: mine.length,
      bankedTurns: banked.length,
      busts: bustTurns.length,
      bustRate: mine.length ? bustTurns.length / mine.length : 0,
      avgBank,
      avgTurnAll: mine.length ? sum(bankedTotals) / mine.length : 0,
      bestTurn: bankedTotals.length ? Math.max(...bankedTotals) : 0,
      avgStepsPerTurn: mine.length ? sum(mine.map((t) => t.steps.length)) / mine.length : 0,
      avgBankedAfterSteps: banked.length ? sum(banked.map((t) => t.steps.length)) / banked.length : 0,
      hotDice: sum(mine.map((t) => t.hotDiceCount)),
      bigTurns: banked.filter((t) => t.turnTotal >= T.streaker.bigTurn).length,
      bankAtMinRate: banked.length ? banked.filter((t) => t.turnTotal < game.rules.minBank + T.bankAtMinMargin).length / banked.length : 0,
      longestBustStreak: longest(mine.map((t) => t.result === 'bust')),
      longestBankStreak: longest(mine.map((t) => t.result === 'banked')),
      lostToBusts: lost,
      comeback: overcame ? deficit : 0,
      leadChanges: tl.leadChanges[p.playerId],
      stdDev,
      finalScore,
      rank
    };
  }
  return { stats, leadChanges: tl.totalLeadChanges };
}
