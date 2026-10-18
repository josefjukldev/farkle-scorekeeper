import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Game, Player, Preset, Settings, Turn } from './types';

export class FarkleDb extends Dexie {
  players!: Table<Player, string>;
  games!: Table<Game, string>;
  turns!: Table<Turn, string>;
  presets!: Table<Preset, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'dices-with-friends') {
    super(name);
    this.version(1).stores({
      players: 'id, name, lastUsedAt',
      games: 'id, status, createdAt, name',
      turns: 'id, gameId, [gameId+index], playerId',
      presets: 'id, name',
      settings: 'id'
    });
  }
}

export let db = new FarkleDb();

/** Tests swap the database for an isolated one. */
export function useDatabase(next: FarkleDb): void {
  db = next;
}
