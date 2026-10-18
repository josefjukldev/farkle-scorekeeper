import { db } from './db';
import type { Game, Player, Preset, Turn } from './types';

export const SCHEMA_VERSION = 1;

interface Backup {
  app: 'farkle-scorekeeper';
  schemaVersion: number;
  exportedAt: number;
  games: unknown[];
  turns: unknown[];
  players: unknown[];
  presets: unknown[];
}

/** Structural check of a backup file (kept dependency-free to keep the app small). */
function parseBackup(json: unknown): Backup | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const b = json as Record<string, unknown>;
  const v = b.schemaVersion;
  const ok =
    b.app === 'farkle-scorekeeper' &&
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= SCHEMA_VERSION &&
    typeof b.exportedAt === 'number' &&
    [b.games, b.turns, b.players, b.presets].every(Array.isArray);
  return ok ? (b as unknown as Backup) : undefined;
}

export interface ImportReport {
  ok: boolean;
  error?: string;
  newGames: number;
  existingGames: number;
  invalidGames: number;
  newPlayers: number;
  newPresets: number;
}

export async function exportAll(opts: { excludeLocation?: boolean } = {}): Promise<Blob> {
  const [games, turns, players, presets] = await Promise.all([
    db.games.where('status').equals('archived').toArray(),
    db.turns.toArray(),
    db.players.toArray(),
    db.presets.toArray()
  ]);
  const ids = new Set(games.map((g) => g.id));
  const outGames = opts.excludeLocation
    ? games.map((g) => ({ ...g, location: undefined, placeLabel: undefined }))
    : games;
  const data = {
    app: 'farkle-scorekeeper',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    games: outGames,
    turns: turns.filter((t) => ids.has(t.gameId)),
    players,
    presets: presets.filter((p) => !p.builtIn)
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

const emptyReport = (error?: string): ImportReport => ({
  ok: !error, error, newGames: 0, existingGames: 0, invalidGames: 0, newPlayers: 0, newPresets: 0
});

/** Validates a backup and merges it by id. With commit=false nothing is written (preview). Never deletes data. */
export async function importAll(text: string, commit: boolean): Promise<ImportReport> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return emptyReport('not-json');
  }
  const b = parseBackup(json);
  if (!b) return emptyReport('bad-format');
  const report = emptyReport();
  const existingGames = new Set((await db.games.toCollection().primaryKeys()) as string[]);
  const existingPlayers = new Set((await db.players.toCollection().primaryKeys()) as string[]);
  const existingPresets = new Set((await db.presets.toCollection().primaryKeys()) as string[]);

  const goodGames: Game[] = [];
  for (const g of b.games) {
    const game = g as Game;
    if (typeof game?.id !== 'string' || !Array.isArray(game.players) || !game.rules || !game.endCondition || game.status !== 'archived') {
      report.invalidGames++;
    } else if (existingGames.has(game.id)) {
      report.existingGames++;
    } else {
      report.newGames++;
      goodGames.push(game);
    }
  }
  const newIds = new Set(goodGames.map((g) => g.id));
  const newTurns = (b.turns as Turn[]).filter((t) => newIds.has(t.gameId));
  const newPlayers = (b.players as Player[]).filter((p) => p?.id && !existingPlayers.has(p.id));
  const newPresets = (b.presets as Preset[]).filter((p) => p?.id && !existingPresets.has(p.id));
  report.newPlayers = newPlayers.length;
  report.newPresets = newPresets.length;

  if (commit) {
    await db.transaction('rw', [db.games, db.turns, db.players, db.presets], async () => {
      await db.games.bulkAdd(goodGames);
      await db.turns.bulkPut(newTurns);
      await db.players.bulkAdd(newPlayers);
      await db.presets.bulkAdd(newPresets);
    });
  }
  return report;
}
