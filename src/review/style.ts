import { T } from './thresholds';
import type { PlayerAssessment, PlayerStats, StyleKey, TagKey } from './types';

/** FNV-1a hash of the game id mixed with a salt: stable seeded "random" for template variants. */
export function seeded(seed: string, salt: string, mod: number): number {
  let h = 2166136261;
  for (const ch of seed + ':' + salt) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % mod;
}

export function classify(s: PlayerStats, playerCount: number): StyleKey {
  if (s.turns < T.minTurns) return 'newcomer';
  const lostShare = s.lostToBusts / Math.max(1, s.avgBank * s.bankedTurns + s.lostToBusts);
  const topHalf = s.rank > 0 && s.rank <= Math.ceil(playerCount / 2);
  if (s.avgStepsPerTurn <= T.banker.maxSteps && s.bustRate <= T.banker.maxBustRate) return 'banker';
  if (s.avgStepsPerTurn >= T.gambler.minSteps || lostShare >= T.gambler.minLostShare) return 'gambler';
  if (s.hotDice >= T.streaker.minHotDice || s.bigTurns / s.turns >= T.streaker.minBigShare) return 'streaker';
  if (s.comeback >= T.comeback.minDeficit && topHalf) return 'comeback';
  if (s.stdDev !== null && s.avgBank > 0 && s.stdDev <= T.tortoise.maxRelStdDev * s.avgBank && s.bustRate <= T.tortoise.maxBustRate) {
    return 'tortoise';
  }
  if (s.bustRate >= T.unlucky.minBustRate) return 'unlucky';
  return 'balanced';
}

export function assess(gameId: string, playerId: string, s: PlayerStats, playerCount: number, isBiggestHitter: boolean): PlayerAssessment {
  const style = classify(s, playerCount);
  let tag: TagKey | undefined;
  if (isBiggestHitter && s.bestTurn > 0) tag = 'bigHitter';
  else if (s.longestBankStreak >= T.ironNervesStreak) tag = 'ironNerves';
  return {
    style,
    tag,
    variant: seeded(gameId, playerId + style, 3),
    params: {
      busts: s.busts,
      lost: s.lostToBusts,
      streak: s.longestBustStreak,
      behind: s.comeback,
      hot: s.hotDice,
      big: s.bigTurns
    }
  };
}
