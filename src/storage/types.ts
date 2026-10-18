import type { EndCondition, Id, RuleSet, Step } from '../engine/types';
import type { GameStatus, TurnResult } from '../engine/game';
import type { TurnState } from '../engine/turn';
import type { RankRow } from '../engine/ranking';
import type { GameReview } from '../review/types';

export type { Id };

export interface Player {
  id: Id;
  name: string;
  colour: string;
  lastUsedAt: number;
}

export interface GamePlayer {
  playerId: Id;
  name: string;
  colour: string;
  seat: number;
}

export interface Turn {
  id: Id;
  gameId: Id;
  playerId: Id;
  round: number;
  index: number;
  steps: Step[];
  result: TurnResult;
  turnTotal: number;
  /** Unbanked points lost to a bust or discard. */
  lostTotal: number;
  penalty: number;
  hotDiceCount: number;
  rollsCount: number;
  startedAt: number;
  endedAt: number;
  scoreBefore: number;
  scoreAfter: number;
  edited?: { at: number; previousTotal: number; previousResult: string }[];
  inFinalRound: boolean;
  /** The turn that ended a time-limited game. */
  timeUp?: boolean;
}

export interface GameTimer {
  elapsedMs: number;
  running: boolean;
  lastResumeAt?: number;
}

export interface GameResult {
  ranking: RankRow[];
  winnerIds: Id[];
}

export interface Game {
  id: Id;
  name: string;
  createdAt: number;
  endedAt?: number;
  lastActivityAt: number;
  timezoneOffsetMin: number;
  location?: { lat: number; lon: number; accuracyM?: number; label?: string };
  placeLabel?: string;
  players: GamePlayer[];
  rules: RuleSet;
  endCondition: EndCondition;
  timer?: GameTimer;
  status: GameStatus;
  currentPlayerIndex: number;
  round: number;
  finalRound?: { triggeredBy: Id; remaining: Id[] };
  scores: Record<Id, number>;
  consecutiveBusts: Record<Id, number>;
  turnsPlayed: Record<Id, number>;
  turnCount: number;
  activeTurn?: ActiveTurnState;
  result?: GameResult;
  review?: GameReview;
  /** Set when the game was imported from another device ("shared by a friend"). */
  origin?: { deviceId: string; importedAt: number };
}

export interface ActiveTurnState {
  playerId: Id;
  turn: TurnState;
  startedAt: number;
  /** false until the player pressed "Start turn" on the hand-over screen. */
  started: boolean;
}

export interface Preset {
  id: Id;
  name: string;
  builtIn: boolean;
  rules: RuleSet;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  id: 'singleton';
  language: 'cs' | 'en';
  theme: 'system' | 'light' | 'dark';
  saveLocationByDefault: boolean;
  sound: boolean;
  vibration: boolean;
  defaultPresetId: string;
  lastEndCondition?: EndCondition;
  lastPlayerIds: Id[];
  /** Random id of this install; sent along with shared games, never personal data. */
  deviceId?: string;
  /** Alias (lower case) -> display name it should be counted as in statistics. */
  nameAliases?: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  language: 'cs',
  theme: 'system',
  saveLocationByDefault: false,
  sound: false,
  vibration: true,
  defaultPresetId: 'house',
  lastPlayerIds: [],
  nameAliases: {}
};
