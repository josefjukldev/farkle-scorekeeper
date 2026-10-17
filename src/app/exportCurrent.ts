import { downloadBlob } from '../platform/share';
import type { Game } from '../storage/types';
import { useGame } from '../state/gameStore';

/** Last-resort export of the game in memory when storage writes fail (FR-800). */
export function exportCurrentGame(game: Game): void {
  const data = { app: 'farkle-scorekeeper', schemaVersion: 1, exportedAt: Date.now(), games: [game], turns: useGame.getState().turns, players: [], presets: [] };
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `current-game-${game.id}.json`);
}
