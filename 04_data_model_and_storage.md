# 04 — Data Model and Storage

## 1. Technology
IndexedDB via **Dexie** (`dexie` + `dexie-react-hooks`). All timestamps are ISO 8601 strings with offset or epoch ms (pick epoch ms; display with `Intl.DateTimeFormat`). Ids are UUID v4 (`crypto.randomUUID()`).

## 2. Entities (TypeScript)
```ts
export type Id = string;

export interface Player {            // reusable "recent players"
  id: Id;
  name: string;
  colour: string;                    // hex
  lastUsedAt: number;
}

export interface GamePlayer {        // player in a game (snapshot)
  playerId: Id;
  name: string;
  colour: string;
  seat: number;                      // 0-based order
}

export interface Step {
  id: Id;
  points: number;
  source: 'quick' | 'dice' | 'manual';
  counts?: Record<1|2|3|4|5|6, number>; // present for quick/dice
  diceUsed?: number;                    // undefined = unknown (manual)
  label?: string;                       // e.g. "3×2"
  at: number;
}

export interface Turn {
  id: Id;
  gameId: Id;
  playerId: Id;
  round: number;                     // 1-based
  index: number;                     // global sequence in game
  steps: Step[];
  result: 'banked' | 'bust' | 'discarded';
  turnTotal: number;                 // 0 for bust/discarded
  penalty: number;                   // >= 0, points deducted by rules
  hotDiceCount: number;
  rollsCount: number;                // number of steps + final bust throw if bust
  startedAt: number;
  endedAt: number;
  scoreBefore: number;
  scoreAfter: number;
  edited?: { at: number; previousTotal: number; previousResult: string }[];
  inFinalRound: boolean;
}

export type GameStatus = 'inProgress' | 'finalRound' | 'finishedPending' | 'archived';

export interface Game {
  id: Id;
  name: string;
  createdAt: number;                 // game start
  endedAt?: number;
  timezoneOffsetMin: number;
  location?: { lat: number; lon: number; accuracyM?: number; label?: string };
  players: GamePlayer[];
  rules: RuleSet;                    // snapshot (see 03)
  endCondition:
    | { type: 'target'; targetScore: number }
    | { type: 'time'; limitMs: number };
  timer?: { elapsedMs: number; running: boolean; lastResumeAt?: number };
  status: GameStatus;
  currentPlayerIndex: number;
  round: number;
  finalRound?: { triggeredBy: Id; remaining: Id[] };
  scores: Record<Id, number>;        // derived cache; recomputable from turns
  consecutiveBusts: Record<Id, number>;
  activeTurn?: ActiveTurnState;      // persisted draft of the turn in progress
  result?: GameResult;               // set at finish
  review?: GameReview;               // set at archive
}

export interface ActiveTurnState {
  playerId: Id;
  steps: Step[];
  diceRemaining: number;
  hotDiceCount: number;
  startedAt: number;
  undoStack: unknown[];              // serialisable engine snapshots
}

export interface GameResult {
  ranking: {
    playerId: Id; rank: number; score: number;
    turns: number; busts: number; bestTurn: number;
  }[];
  winnerIds: Id[];
}

export interface GameReview {        // see 06
  generatedAt: number;
  headline: string;
  summary: string;
  awards: { key: string; playerId: Id; title: string; detail: string }[];
  players: Record<Id, PlayerAssessment>;
  stats: Record<Id, PlayerStats>;
}

export interface Settings {
  id: 'singleton';
  language: 'cs' | 'en';
  theme: 'system' | 'light' | 'dark';
  saveLocationByDefault: boolean;
  sound: boolean;
  vibration: boolean;
  defaultPresetId: string;
  lastEndCondition?: Game['endCondition'];
  lastPlayerIds: Id[];
}
```

## 3. Dexie schema (version 1)
```ts
db.version(1).stores({
  players:  'id, name, lastUsedAt',
  games:    'id, status, createdAt, name',
  turns:    'id, gameId, [gameId+index], playerId',
  presets:  'id, name',
  settings: 'id'
});
```
- `games.status` index drives "unfinished game" and "pending" lookups.
- Archive list = `games.where('status').equals('archived').reverse().sortBy('createdAt')`.
- Search: client-side filter on name and player names (archive sizes are small).

## 4. Repository API (`src/storage/repo.ts`)
```
createGame(input): Promise<Game>
getActiveGame(): Promise<Game | undefined>     // status inProgress | finalRound | finishedPending
saveGame(game): Promise<void>                  // write-through after every action
appendTurn(turn): Promise<void>
getTurns(gameId): Promise<Turn[]>
finishGame(gameId, result): Promise<void>      // status finishedPending
archiveGame(gameId, review): Promise<void>     // status archived
forgetGame(gameId): Promise<void>              // deletes game + turns in one transaction
listArchive(filter?): Promise<Game[]>
renameGame(id, name), deleteArchived(id)
upsertPlayer(p), listRecentPlayers(limit)
exportAll(): Promise<Blob>, importAll(file): Promise<ImportReport>
getSettings(), saveSettings(s)
```
All multi-table writes use `db.transaction('rw', ...)`.

## 5. Persistence rules
1. Every state-changing action (add step, undo, bank, bust, pause timer, edit) writes `games` (and `turns` when a turn ends) before the UI confirms.
2. `activeTurn` is stored in the game so a half-entered turn is restored after a reload.
3. Timer uses timestamps, not intervals, so reload keeps the correct remaining time.
4. On app start call `navigator.storage.persist()` and show a one-time notice if it is denied.
5. `scores` is a cache; on load verify against `turns` and silently repair if they differ (log in console).

## 6. Migrations
Dexie versioned upgrades; each upgrade function is unit-tested with a fixture of the previous version. Never change the meaning of an existing field without a new version.

## 7. Backup format
```json
{
  "app": "farkle-scorekeeper",
  "schemaVersion": 1,
  "exportedAt": 1760745600000,
  "games": [ ... ],
  "turns": [ ... ],
  "players": [ ... ],
  "presets": [ ... ]
}
```
Import: validate with a Zod schema; show counts (new / already present / invalid); merge by id; never delete existing data.

## 8. Privacy
Location is stored only on the device. Exports contain location; the export dialog warns about this and offers "Exclude location".
