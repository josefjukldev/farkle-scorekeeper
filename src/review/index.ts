import { computeStats } from './stats';
import { assess } from './style';
import { pickAwards } from './awards';
import { T } from './thresholds';
import type { GameReview } from './types';
import type { Game, Turn } from '../storage/types';

/** Builds the locale-free review data; wording comes from the i18n files at render time. */
export function generateReview(game: Game, turns: Turn[], now = Date.now()): GameReview {
  const { stats, leadChanges } = computeStats(game, turns);
  const ranking = game.result?.ranking ?? [];
  const biggest = Math.max(0, ...Object.values(stats).map((s) => s.bestTurn));
  const players = Object.fromEntries(
    game.players.map((p) => [
      p.playerId,
      assess(game.id, p.playerId, stats[p.playerId], game.players.length, stats[p.playerId].bestTurn === biggest)
    ])
  );
  const awards = pickAwards(game, stats);
  const nameOf = (id: string) => game.players.find((p) => p.playerId === id)?.name ?? '';
  const first = ranking[0];
  const second = ranking[1];
  const gap = first && second ? first.score - second.score : 0;
  const winnerId = first?.playerId ?? '';

  // a "comeback falls short": the runner-up overcame a big deficit but lost
  const shortOne = second && stats[second.playerId].comeback >= T.comeback.minDeficit;
  let key: GameReview['headline']['key'] = 'wins';
  if (first && second && first.score === second.score) key = 'tie';
  else if (gap > 0 && gap <= T.closestFinishGap) key = 'photo';
  else if (shortOne) key = 'comebackShort';

  const rounds = Math.max(1, ...turns.map((t) => t.round));
  const durationMin = Math.max(1, Math.round(((game.endedAt ?? now) - game.createdAt) / 60000));
  return {
    generatedAt: now,
    headline: {
      key,
      params: { winner: nameOf(winnerId), second: second ? nameOf(second.playerId) : '', gap }
    },
    summary: {
      rounds,
      minutes: durationMin,
      leadChanges,
      biggest,
      biggestName: nameOf(Object.keys(stats).find((id) => stats[id].bestTurn === biggest) ?? ''),
      busts: Object.values(stats).reduce((a, s) => a + s.busts, 0),
      end: game.endCondition.type === 'target' ? game.endCondition.targetScore : Math.round(game.endCondition.limitMs / 60000),
      endType: game.endCondition.type
    },
    awards,
    players,
    stats
  };
}
