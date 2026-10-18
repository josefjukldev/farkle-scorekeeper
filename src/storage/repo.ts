import { db } from './db';
import { DEFAULT_SETTINGS } from './types';
import type { Game, Player, Preset, Settings, Turn } from './types';
import type { GameResult } from './types';
import type { GameReview } from '../review/types';

const ACTIVE = ['inProgress', 'finalRound', 'finishedPending'] as const;

export async function saveGame(game: Game): Promise<void> {
  await db.games.put(game);
}

export async function getGame(id: string): Promise<Game | undefined> {
  return db.games.get(id);
}

export async function getActiveGame(): Promise<Game | undefined> {
  return db.games.where('status').anyOf([...ACTIVE]).first();
}

/** Persists a finished turn together with the updated game in one transaction. */
export async function appendTurn(game: Game, turn: Turn): Promise<void> {
  await db.transaction('rw', db.games, db.turns, async () => {
    await db.turns.put(turn);
    await db.games.put(game);
  });
}

export async function getTurns(gameId: string): Promise<Turn[]> {
  const rows = await db.turns.where('gameId').equals(gameId).toArray();
  return rows.sort((a, b) => a.index - b.index);
}

/** Replaces all turns of a game (used after editing or undoing a past turn). */
export async function replaceTurns(game: Game, turns: Turn[]): Promise<void> {
  await db.transaction('rw', db.games, db.turns, async () => {
    await db.turns.where('gameId').equals(game.id).delete();
    await db.turns.bulkPut(turns);
    await db.games.put(game);
  });
}

export async function finishGame(game: Game, result: GameResult): Promise<void> {
  await db.games.put({ ...game, status: 'finishedPending', endedAt: game.endedAt ?? Date.now(), result });
}

export async function archiveGame(game: Game, review: GameReview): Promise<void> {
  await db.games.put({ ...game, status: 'archived', review, activeTurn: undefined });
}

/** Deletes the game and all its turns atomically. */
export async function forgetGame(gameId: string): Promise<void> {
  await db.transaction('rw', db.games, db.turns, async () => {
    await db.turns.where('gameId').equals(gameId).delete();
    await db.games.delete(gameId);
  });
}

export async function listArchive(filter?: { query?: string; playerName?: string }): Promise<Game[]> {
  const all = await db.games.where('status').equals('archived').toArray();
  const q = filter?.query?.trim().toLowerCase();
  return all
    .filter((g) => !filter?.playerName || g.players.some((p) => p.name === filter.playerName))
    .filter((g) => !q || g.name.toLowerCase().includes(q) || g.players.some((p) => p.name.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function renameGame(id: string, name: string): Promise<void> {
  await db.games.update(id, { name });
}

export async function deleteArchived(id: string): Promise<void> {
  await forgetGame(id);
}

export async function upsertPlayer(p: Player): Promise<void> {
  await db.players.put(p);
}

export async function listRecentPlayers(limit = 8): Promise<Player[]> {
  return (await db.players.orderBy('lastUsedAt').reverse().limit(limit).toArray());
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('singleton');
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(s: Settings): Promise<void> {
  await db.settings.put(s);
}

export async function listPresets(): Promise<Preset[]> {
  return db.presets.toArray();
}

export async function savePreset(p: Preset): Promise<void> {
  await db.presets.put(p);
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.games, db.turns, db.players, db.presets, db.settings], async () => {
    await Promise.all([db.games.clear(), db.turns.clear(), db.players.clear(), db.presets.clear(), db.settings.clear()]);
  });
}
