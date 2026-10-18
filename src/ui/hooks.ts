import { useEffect, useState } from 'react';
import { remainingMs } from '../state/gameModel';
import type { Game } from '../storage/types';

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Remaining time of a time-limited game, or null in target mode. */
export function useRemaining(game: Game | undefined): number | null {
  const now = useNow(500);
  return game ? remainingMs(game, now) : null;
}
