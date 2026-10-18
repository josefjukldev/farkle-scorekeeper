import { T } from './thresholds';
import type { Award, PlayerStats } from './types';
import type { Game } from '../storage/types';

/** Up to five awards, preferring a different player for each. */
export function pickAwards(game: Game, stats: Record<string, PlayerStats>): Award[] {
  const ids = game.players.map((p) => p.playerId);
  const ranking = game.result?.ranking ?? [];
  const winner = ranking[0]?.playerId;
  const awards: Award[] = [];
  if (winner) awards.push({ key: 'winner', playerId: winner, value: ranking[0].score });

  const best = (get: (s: PlayerStats) => number, min: number, pickMax = true) => {
    const eligible = ids.filter((id) => stats[id].turns >= 1);
    if (!eligible.length) return undefined;
    const sorted = [...eligible].sort((a, b) => (pickMax ? get(stats[b]) - get(stats[a]) : get(stats[a]) - get(stats[b])));
    const id = sorted[0];
    const v = get(stats[id]);
    return (pickMax ? v >= min : true) ? { id, v } : undefined;
  };

  const candidates: Award[] = [];
  const bt = best((s) => s.bestTurn, 1);
  if (bt) candidates.push({ key: 'biggestTurn', playerId: bt.id, value: bt.v });
  const hd = best((s) => s.hotDice, 1);
  if (hd) candidates.push({ key: 'mostHotDice', playerId: hd.id, value: hd.v });
  const bm = best((s) => s.busts, 1);
  if (bm) candidates.push({ key: 'bustedMost', playerId: bm.id, value: bm.v });
  const steady = ids
    .filter((id) => stats[id].turns >= T.minTurns && stats[id].stdDev !== null && stats[id].avgBank > 0)
    .sort((a, b) => stats[a].stdDev! / stats[a].avgBank - stats[b].stdDev! / stats[b].avgBank)[0];
  if (steady) candidates.push({ key: 'mostConsistent', playerId: steady, value: Math.round(stats[steady].avgBank) });
  const cb = best((s) => s.comeback, 1);
  if (cb && stats[cb.id].comeback > 0) candidates.push({ key: 'bestComeback', playerId: cb.id, value: cb.v });
  if (ranking.length >= 2 && ranking[0].score - ranking[1].score <= T.closestFinishGap && ranking[0].score !== ranking[1].score) {
    candidates.push({ key: 'closestFinish', playerId: ranking[0].playerId, value: ranking[0].score - ranking[1].score });
  }

  // prefer players that have no award yet, then fill up to five
  const used = new Set(awards.map((a) => a.playerId));
  const fresh = candidates.filter((c) => !used.has(c.playerId));
  const rest = candidates.filter((c) => used.has(c.playerId));
  for (const c of [...fresh, ...rest]) {
    if (awards.length >= 5) break;
    awards.push(c);
    used.add(c.playerId);
  }
  return awards;
}
