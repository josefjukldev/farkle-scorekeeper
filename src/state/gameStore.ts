import { create } from 'zustand';
import { applyTurn, currentPlayer, endNow, isFinished, replay } from '../engine/game';
import type { TurnResult } from '../engine/game';
import { addStep, forceHotDice, initTurn, turnTotal, undoTurn } from '../engine/turn';
import type { Counts, EndCondition, RuleSet, Step, StepSource } from '../engine/types';
import { baseCoreOf, coreOf, rebuildTurn, remainingMs, resultOf, turnFromOutcome, withCore } from './gameModel';
import * as repo from '../storage/repo';
import type { Game, Turn } from '../storage/types';
import { generateReview } from '../review';
import { useSettings } from './settingsStore';
import { newGame as newCore } from '../engine/game';

export interface NewGameInput {
  name: string;
  players: { name: string; colour: string }[];
  rules: RuleSet;
  end: EndCondition;
  placeLabel?: string;
  location?: Game['location'];
}

export interface StepInput {
  points: number;
  source: StepSource;
  counts?: Counts;
  diceUsed?: number;
  label?: string;
}

interface StoreError {
  message: string;
  retry?: () => Promise<void>;
}

interface GameStore {
  ready: boolean;
  error?: StoreError;
  game?: Game;
  turns: Turn[];
  init: () => Promise<void>;
  clearError: () => void;
  createGame: (input: NewGameInput) => Promise<void>;
  startTurn: () => Promise<void>;
  addStep: (s: StepInput) => Promise<boolean>;
  undoStep: () => Promise<void>;
  hotDice: () => Promise<void>;
  recordTurn: (kind: TurnResult) => Promise<'next' | 'final'>;
  undoLastTurn: () => Promise<void>;
  editTurn: (turnId: string, result: 'banked' | 'bust', total: number) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  endGameNow: () => Promise<void>;
  checkTime: (now: number) => Promise<boolean>;
  archive: () => Promise<string | undefined>;
  forget: () => Promise<void>;
}

const uuid = () => crypto.randomUUID();

export const useGame = create<GameStore>((set, get) => {
  /** Writes through to storage before the UI sees the new state (FR-800). */
  async function commit(next: Game, turns?: Turn[], write?: () => Promise<void>): Promise<boolean> {
    const prev = get().game;
    try {
      const stamped = { ...next, lastActivityAt: Date.now() };
      if (write) await write();
      else await repo.saveGame(stamped);
      set({ game: stamped, ...(turns ? { turns } : {}), error: undefined });
      return true;
    } catch (e) {
      set({ game: prev, error: { message: e instanceof Error ? e.message : 'storage', retry: () => commit(next, turns, write).then(() => undefined) } });
      return false;
    }
  }

  const freshActive = (g: Game) => ({
    playerId: g.players[g.currentPlayerIndex].playerId,
    turn: initTurn(),
    startedAt: Date.now(),
    started: false
  });

  const stopTimer = (g: Game, now: number): Game =>
    g.timer && g.timer.running
      ? { ...g, timer: { elapsedMs: g.timer.elapsedMs + (now - (g.timer.lastResumeAt ?? now)), running: false } }
      : g;

  return {
    ready: false,
    turns: [],
    clearError: () => set({ error: undefined }),

    init: async () => {
      await useSettings.getState().load();
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.persist) void navigator.storage.persist();
        const game = await repo.getActiveGame();
        const turns = game ? await repo.getTurns(game.id) : [];
        set({ ready: true, game, turns });
      } catch (e) {
        set({ ready: true, error: { message: e instanceof Error ? e.message : 'storage' } });
      }
    },

    createGame: async (input) => {
      const now = Date.now();
      const recent = await repo.listRecentPlayers(50);
      const players = input.players.map((p, seat) => {
        const known = recent.find((r) => r.name.toLowerCase() === p.name.trim().toLowerCase());
        return { playerId: known?.id ?? uuid(), name: p.name.trim(), colour: p.colour, seat };
      });
      const core = newCore(players.map((p) => ({ id: p.playerId, name: p.name })), input.rules, input.end);
      const game: Game = {
        id: uuid(),
        name: input.name.trim(),
        createdAt: now,
        lastActivityAt: now,
        timezoneOffsetMin: -new Date().getTimezoneOffset(),
        location: input.location,
        placeLabel: input.placeLabel?.trim() || undefined,
        players,
        rules: input.rules,
        endCondition: input.end,
        timer: input.end.type === 'time' ? { elapsedMs: 0, running: true, lastResumeAt: now } : undefined,
        status: 'inProgress',
        currentPlayerIndex: 0,
        round: 1,
        scores: core.scores,
        consecutiveBusts: core.consecutiveBusts,
        turnsPlayed: core.turnsPlayed,
        turnCount: 0
      };
      game.activeTurn = freshActive(game);
      const old = get().game;
      if (old && old.status !== 'archived') await repo.forgetGame(old.id);
      await repo.saveGame(game);
      for (const p of players) await repo.upsertPlayer({ id: p.playerId, name: p.name, colour: p.colour, lastUsedAt: now });
      await useSettings.getState().update({ lastEndCondition: input.end, lastPlayerIds: players.map((p) => p.playerId), defaultPresetId: input.rules.id });
      set({ game, turns: [], error: undefined });
    },

    startTurn: async () => {
      const g = get().game;
      if (!g?.activeTurn || g.activeTurn.started) return;
      await commit({ ...g, activeTurn: { ...g.activeTurn, started: true, startedAt: Date.now() } });
    },

    addStep: async (s) => {
      const g = get().game;
      if (!g?.activeTurn) return false;
      const step: Step = { id: uuid(), at: Date.now(), ...s };
      const r = addStep(g.activeTurn.turn, step, g.rules);
      if (!r.ok) return false;
      return commit({ ...g, activeTurn: { ...g.activeTurn, turn: r.value } });
    },

    undoStep: async () => {
      const g = get().game;
      if (!g?.activeTurn) return;
      await commit({ ...g, activeTurn: { ...g.activeTurn, turn: undoTurn(g.activeTurn.turn) } });
    },

    hotDice: async () => {
      const g = get().game;
      if (!g?.activeTurn) return;
      await commit({ ...g, activeTurn: { ...g.activeTurn, turn: forceHotDice(g.activeTurn.turn, g.rules) } });
    },

    recordTurn: async (requested) => {
      const g = get().game;
      if (!g?.activeTurn) return 'next';
      const now = Date.now();
      const rem = remainingMs(g, now);
      const expired = rem !== null && rem <= 0;
      let kind = requested;
      if (expired && g.rules.timeFinish === 'immediate') kind = 'discarded';
      const at = g.activeTurn;
      const total = turnTotal(at.turn);
      const core = coreOf(g);
      const res = applyTurn(core, { playerId: at.playerId, kind, total }, { timeUp: expired });
      const turn = turnFromOutcome(
        { id: uuid(), gameId: g.id, startedAt: at.startedAt, endedAt: now, steps: at.turn.steps, hotDiceCount: at.turn.hotDiceCount, timeUp: expired || undefined },
        res.outcome
      );
      let next = withCore(g, res.core);
      const turns = [...get().turns, turn];
      if (isFinished(res.core)) {
        next = stopTimer({ ...next, endedAt: now, result: resultOf(res.core, turns), activeTurn: undefined }, now);
      } else {
        next = { ...next, activeTurn: freshActive(next) };
      }
      const ok = await commit(next, turns, () => repo.appendTurn({ ...next, lastActivityAt: now }, turn));
      return ok && isFinished(res.core) ? 'final' : 'next';
    },

    undoLastTurn: async () => {
      const g = get().game;
      const turns = get().turns;
      if (!g || turns.length === 0 || g.status === 'archived') return;
      const last = turns[turns.length - 1];
      const rest = turns.slice(0, -1);
      const { core } = replay(baseCoreOf(g), rest.map((t) => ({ input: { playerId: t.playerId, kind: t.result, total: t.result === 'banked' ? t.turnTotal : t.lostTotal }, timeUp: t.timeUp })));
      let next: Game = { ...withCore(g, core), endedAt: undefined, result: undefined };
      next = { ...next, timer: next.timer && !next.timer.running ? { ...next.timer, running: true, lastResumeAt: Date.now() } : next.timer };
      next.activeTurn = { playerId: last.playerId, turn: rebuildTurn(last.steps, next), startedAt: last.startedAt, started: true };
      await commit(next, rest, () => repo.replaceTurns(next, rest));
    },

    editTurn: async (turnId, result, total) => {
      const g = get().game;
      const turns = get().turns;
      if (!g || g.status === 'archived') return;
      const edited = turns.map((t) =>
        t.id === turnId
          ? {
              ...t,
              result,
              turnTotal: result === 'banked' ? total : 0,
              lostTotal: result === 'bust' ? total : 0,
              edited: [...(t.edited ?? []), { at: Date.now(), previousTotal: t.result === 'banked' ? t.turnTotal : t.lostTotal, previousResult: t.result }]
            }
          : t
      );
      const { core, outcomes } = replay(baseCoreOf(g), edited.map((t) => ({ input: { playerId: t.playerId, kind: t.result, total: t.result === 'banked' ? t.turnTotal : t.lostTotal }, timeUp: t.timeUp })));
      const fixed = edited.map((t, i) => ({ ...t, round: outcomes[i].round, index: outcomes[i].index, penalty: outcomes[i].penalty, scoreBefore: outcomes[i].scoreBefore, scoreAfter: outcomes[i].scoreAfter, inFinalRound: outcomes[i].inFinalRound }));
      let next = withCore(g, core);
      if (isFinished(core)) next = { ...next, result: resultOf(core, fixed), activeTurn: undefined };
      else next = { ...next, result: undefined, activeTurn: g.activeTurn && g.activeTurn.playerId === core.players[core.currentIndex].id ? g.activeTurn : freshActive(next) };
      await commit(next, fixed, () => repo.replaceTurns(next, fixed));
    },

    pauseTimer: async () => {
      const g = get().game;
      if (!g?.timer?.running) return;
      await commit(stopTimer(g, Date.now()));
    },

    resumeTimer: async () => {
      const g = get().game;
      if (!g?.timer || g.timer.running) return;
      await commit({ ...g, timer: { ...g.timer, running: true, lastResumeAt: Date.now() } });
    },

    endGameNow: async () => {
      const g = get().game;
      if (!g || isFinished(coreOf(g))) return;
      const now = Date.now();
      const core = endNow(coreOf(g));
      let next = withCore(g, core);
      next = stopTimer({ ...next, endedAt: now, result: resultOf(core, get().turns), activeTurn: undefined }, now);
      await commit(next);
    },

    /** Called once a second. Returns true when it ended the game. */
    checkTime: async (now) => {
      const g = get().game;
      if (!g || isFinished(coreOf(g))) return false;
      const rem = remainingMs(g, now);
      if (rem === null || rem > 0 || !g.timer?.running) return false;
      const hasSteps = (g.activeTurn?.turn.steps.length ?? 0) > 0 && g.activeTurn?.started;
      if (hasSteps && g.rules.timeFinish === 'immediate') {
        await get().recordTurn('discarded');
        return true;
      }
      if (!hasSteps) {
        await get().endGameNow();
        return true;
      }
      return false; // finishTurn: the player completes the turn, recordTurn ends the game
    },

    archive: async () => {
      const g = get().game;
      if (!g || g.status !== 'finishedPending') return undefined;
      const review = generateReview(g, get().turns);
      const next: Game = { ...g, status: 'archived', review, activeTurn: undefined };
      try {
        await repo.archiveGame(g, review);
        set({ game: undefined, turns: [], error: undefined });
        return next.id;
      } catch (e) {
        set({ error: { message: e instanceof Error ? e.message : 'storage' } });
        return undefined;
      }
    },

    forget: async () => {
      const g = get().game;
      if (!g) return;
      await repo.forgetGame(g.id);
      set({ game: undefined, turns: [] });
    }
  };
});

export { currentPlayer };
