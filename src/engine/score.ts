import { FACES, sumCounts } from './types';
import type { Counts, Face, RuleSet, ScoreResult } from './types';

const invalid = (reason: string): ScoreResult => ({ valid: false, reason });

/** Value of c (>= 3) dice of face f, or null when that combination does not score alone. */
function nOfKind(f: Face, c: number, r: RuleSet): number | null {
  const triple = r.tripleBase[f];
  if (c === 3) return triple;
  switch (r.nOfKindMode) {
    case 'multiplier':
      return triple * (c - 2);
    case 'doubling':
      return triple * 2 ** (c - 3);
    case 'table': {
      const row = r.nOfKindTable?.[f];
      if (!row) return null;
      return c === 4 ? row.four : c === 5 ? row.five : row.six;
    }
    case 'off': {
      if (f === 1) return triple + (c - 3) * r.single1;
      if (f === 5) return triple + (c - 3) * r.single5;
      return null;
    }
  }
}

/** Scores one set-aside. Every die in the selection must contribute points. */
export function scoreSelection(counts: Counts, r: RuleSet): ScoreResult {
  const total = sumCounts(counts);
  if (total === 0) return invalid('empty');
  if (total > 6) return invalid('too-many');
  if (r.straight != null && FACES.every((f) => counts[f] === 1)) {
    return { valid: true, points: r.straight, diceUsed: 6 };
  }
  let points = 0;
  for (const f of FACES) {
    const c = counts[f];
    if (c === 0) continue;
    if (c >= 3) {
      const v = nOfKind(f, c, r);
      if (v === null) return invalid(`dead-die-${f}`);
      points += v;
    } else if (f === 1) points += c * r.single1;
    else if (f === 5) points += c * r.single5;
    else return invalid(`dead-die-${f}`);
  }
  return { valid: true, points, diceUsed: total };
}
