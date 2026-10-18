import type { Id } from './types';

export interface RankRow {
  playerId: Id;
  rank: number;
  score: number;
  turns: number;
  busts: number;
  bestTurn: number;
}

export interface RankInput {
  playerId: Id;
  score: number;
  turns: number;
  busts: number;
  bestTurn: number;
}

/** Sort by score descending; equal scores share a rank (1, 1, 3). */
export function rankPlayers(rows: RankInput[]): RankRow[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return sorted.map((r) => {
    const firstEqual = sorted.findIndex((x) => x.score === r.score);
    return { ...r, rank: firstEqual + 1 };
  });
}
