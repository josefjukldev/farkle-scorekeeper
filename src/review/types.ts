import type { Id } from '../engine/types';

export interface PlayerStats {
  turns: number;
  bankedTurns: number;
  busts: number;
  bustRate: number;
  avgBank: number;
  avgTurnAll: number;
  bestTurn: number;
  avgStepsPerTurn: number;
  avgBankedAfterSteps: number;
  hotDice: number;
  bigTurns: number;
  bankAtMinRate: number;
  longestBustStreak: number;
  longestBankStreak: number;
  lostToBusts: number;
  comeback: number;
  leadChanges: number;
  stdDev: number | null;
  finalScore: number;
  rank: number;
}

export type StyleKey = 'banker' | 'gambler' | 'streaker' | 'comeback' | 'tortoise' | 'unlucky' | 'balanced' | 'newcomer';
export type TagKey = 'bigHitter' | 'ironNerves';
export type AwardKey = 'winner' | 'biggestTurn' | 'mostHotDice' | 'bustedMost' | 'mostConsistent' | 'bestComeback' | 'closestFinish';

export interface PlayerAssessment {
  style: StyleKey;
  tag?: TagKey;
  /** Which template variant to show (0-2), chosen by a seeded random. */
  variant: number;
  params: Record<string, string | number>;
}

export interface Award {
  key: AwardKey;
  playerId: Id;
  value: number;
}

export interface GameReview {
  generatedAt: number;
  headline: { key: 'wins' | 'photo' | 'comebackShort' | 'tie'; params: Record<string, string | number> };
  summary: Record<string, string | number>;
  awards: Award[];
  players: Record<Id, PlayerAssessment>;
  stats: Record<Id, PlayerStats>;
}
