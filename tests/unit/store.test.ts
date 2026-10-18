// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FarkleDb, useDatabase } from '../../src/storage/db';
import { getActiveGame, getTurns } from '../../src/storage/repo';
import { useGame } from '../../src/state/gameStore';
import { HOUSE_RULES } from '../../src/engine/presets';

let n = 0;
beforeEach(async () => {
  useDatabase(new FarkleDb('store-' + n++));
  useGame.setState({ game: undefined, turns: [], error: undefined });
  await useGame.getState().createGame({
    name: 'T',
    players: [
      { name: 'Ann', colour: '#000' },
      { name: 'Bob', colour: '#111' }
    ],
    rules: HOUSE_RULES,
    end: { type: 'target', targetScore: 10000 }
  });
  await useGame.getState().startTurn();
});

describe('game store', () => {
  it('fast taps do not lose steps (actions are serialised)', async () => {
    const s = useGame.getState();
    await Promise.all([
      s.addStep({ points: 400, source: 'quick', diceUsed: 3, label: '3×4' }),
      s.addStep({ points: 100, source: 'quick', diceUsed: 1, label: '1' }),
      s.addStep({ points: 50, source: 'manual' })
    ]);
    const steps = useGame.getState().game!.activeTurn!.turn.steps;
    expect(steps.map((x) => x.points)).toEqual([400, 100, 50]);
    expect((await getActiveGame())!.activeTurn!.turn.steps).toHaveLength(3);
  });

  it('records a banked turn, passes to the next player and persists', async () => {
    const s = useGame.getState();
    await s.addStep({ points: 500, source: 'manual' });
    expect(await useGame.getState().recordTurn('banked')).toBe('next');
    const g = useGame.getState().game!;
    expect(g.scores[g.players[0].playerId]).toBe(500);
    expect(g.currentPlayerIndex).toBe(1);
    expect(g.activeTurn!.started).toBe(false);
    expect(await getTurns(g.id)).toHaveLength(1);
  });

  it('undo of a finished turn restores the steps', async () => {
    await useGame.getState().addStep({ points: 500, source: 'manual' });
    await useGame.getState().recordTurn('banked');
    await useGame.getState().undoLastTurn();
    const g = useGame.getState().game!;
    expect(g.scores[g.players[0].playerId]).toBe(0);
    expect(g.activeTurn!.turn.steps.map((x) => x.points)).toEqual([500]);
    expect(await getTurns(g.id)).toHaveLength(0);
  });

  it('manual steps without a dice count leave the dice unknown', async () => {
    await useGame.getState().addStep({ points: 350, source: 'manual' });
    const t = useGame.getState().game!.activeTurn!.turn;
    expect(t.diceKnown).toBe(false);
    await useGame.getState().undoStep();
    await useGame.getState().addStep({ points: 400, source: 'manual', diceUsed: 3 });
    expect(useGame.getState().game!.activeTurn!.turn.diceRemaining).toBe(3);
  });
});
