import type { Game } from '../storage/types';

export interface PlayerTotals {
  name: string;
  games: number;
  wins: number;
  winRate: number;
  turns: number;
  busts: number;
  bustRate: number;
  /** Banked points per turn, busts counting as 0. */
  avgTurn: number;
  bestTurn: number;
}

/** Cross-game statistics from archived games. Players are matched by name, ignoring case. */
export function aggregatePlayers(games: Game[], aliases: Record<string, string> = {}): PlayerTotals[] {
  const map = new Map<string, { name: string; games: number; wins: number; turns: number; busts: number; points: number; best: number }>();
  for (const g of games) {
    if (g.status !== 'archived' || !g.review) continue;
    for (const p of g.players) {
      const shown = aliases[p.name.trim().toLowerCase()] ?? p.name.trim();
      const key = shown.toLowerCase();
      const st = g.review.stats[p.playerId];
      if (!st) continue;
      const row = map.get(key) ?? { name: shown, games: 0, wins: 0, turns: 0, busts: 0, points: 0, best: 0 };
      row.games += 1;
      row.wins += g.result?.winnerIds.includes(p.playerId) ? 1 : 0;
      row.turns += st.turns;
      row.busts += st.busts;
      row.points += st.avgTurnAll * st.turns;
      row.best = Math.max(row.best, st.bestTurn);
      map.set(key, row);
    }
  }
  return [...map.values()]
    .map((r) => ({
      name: r.name,
      games: r.games,
      wins: r.wins,
      winRate: r.games ? r.wins / r.games : 0,
      turns: r.turns,
      busts: r.busts,
      bustRate: r.turns ? r.busts / r.turns : 0,
      avgTurn: r.turns ? r.points / r.turns : 0,
      bestTurn: r.best
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.name.localeCompare(b.name));
}

const nameSet = (g: Game) =>
  g.players
    .map((p) => p.name.trim().toLowerCase())
    .sort()
    .join('|');

/**
 * Possible duplicates: the same players, started within a few hours of each other, with different ids
 * (two scorekeepers recorded the same evening). Maps the later game's id to the earlier game's id.
 */
export function findDuplicateHints(games: Game[], windowMs = 4 * 60 * 60 * 1000): Map<string, string> {
  const hints = new Map<string, string>();
  const sorted = [...games].sort((a, b) => a.createdAt - b.createdAt);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      if (
        sorted[i].id !== sorted[j].id &&
        sorted[i].createdAt - sorted[j].createdAt <= windowMs &&
        nameSet(sorted[i]) === nameSet(sorted[j])
      ) {
        hints.set(sorted[i].id, sorted[j].id);
        break;
      }
    }
  }
  return hints;
}
