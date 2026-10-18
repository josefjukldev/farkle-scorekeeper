import { applyTurn, finalRanking, newGame, endNow } from '../../src/engine/game';
import type { TurnResult } from '../../src/engine/game';
import { HOUSE_RULES } from '../../src/engine/presets';
import type { EndCondition, RuleSet, Step } from '../../src/engine/types';
import { resultOf, turnFromOutcome, withCore } from '../../src/state/gameModel';
import type { Game, Turn } from '../../src/storage/types';

export interface TurnSpec {
  /** seat index */
  p: number;
  kind: 'bank' | 'bust';
  total: number;
  steps?: number;
  hot?: number;
}

export function buildGame(
  names: string[],
  specs: TurnSpec[],
  opts: { rules?: RuleSet; end?: EndCondition; id?: string; finish?: boolean } = {}
): { game: Game; turns: Turn[] } {
  const rules = opts.rules ?? HOUSE_RULES;
  const end = opts.end ?? { type: 'target', targetScore: 10000 };
  const players = names.map((name, seat) => ({ playerId: `p${seat}`, name, colour: '#000', seat }));
  let core = newGame(
    players.map((p) => ({ id: p.playerId, name: p.name })),
    rules,
    end
  );
  const turns: Turn[] = [];
  let t = 1000;
  for (const s of specs) {
    const kind: TurnResult = s.kind === 'bank' ? 'banked' : 'bust';
    // force the seat so fixtures can describe any sequence
    core = { ...core, currentIndex: s.p };
    const res = applyTurn(core, { playerId: `p${s.p}`, kind, total: s.total });
    core = res.core;
    const stepCount = s.steps ?? 2;
    const steps: Step[] = Array.from({ length: stepCount }, (_, i) => ({
      id: `s${turns.length}-${i}`,
      points: Math.max(50, Math.round(s.total / stepCount)),
      source: 'quick',
      diceUsed: 1,
      at: t
    }));
    turns.push(
      turnFromOutcome(
        { id: `t${turns.length}`, gameId: opts.id ?? 'g1', startedAt: t, endedAt: t + 30000, steps, hotDiceCount: s.hot ?? 0 },
        res.outcome
      )
    );
    t += 60000;
  }
  if (opts.finish !== false && core.status !== 'finishedPending') core = endNow(core);
  const base: Game = {
    id: opts.id ?? 'g1',
    name: 'Fixture game',
    createdAt: 1000,
    endedAt: t,
    lastActivityAt: t,
    timezoneOffsetMin: 0,
    players,
    rules,
    endCondition: end,
    status: 'finishedPending',
    currentPlayerIndex: 0,
    round: 1,
    scores: {},
    consecutiveBusts: {},
    turnsPlayed: {},
    turnCount: 0
  };
  const game = withCore(base, core);
  game.result = resultOf(core, turns);
  void finalRanking;
  return { game, turns };
}
