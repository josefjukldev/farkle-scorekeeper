import { countsOf, emptyCounts } from './types';
import type { Counts, Face, RuleSet } from './types';
import { scoreSelection } from './score';

export interface QuickPick {
  key: string;
  label: string;
  counts: Counts;
  points: number;
  diceUsed: number;
}

const DEFS: { key: string; label: string; counts: Partial<Counts> }[] = [
  { key: '1', label: '1', counts: { 1: 1 } },
  { key: '5', label: '5', counts: { 5: 1 } },
  { key: '1+5', label: '1+5', counts: { 1: 1, 5: 1 } },
  { key: '2x1', label: '2×1', counts: { 1: 2 } },
  { key: '2x5', label: '2×5', counts: { 5: 2 } },
  { key: '3x2', label: '3×2', counts: { 2: 3 } },
  { key: '3x3', label: '3×3', counts: { 3: 3 } },
  { key: '3x4', label: '3×4', counts: { 4: 3 } },
  { key: '3x5', label: '3×5', counts: { 5: 3 } },
  { key: '3x6', label: '3×6', counts: { 6: 3 } },
  { key: '3x1', label: '3×1', counts: { 1: 3 } },
  { key: '4x1', label: '4×1', counts: { 1: 4 } }
];

/** Quick picks derived from the active rule set, so values always match the scoring function. */
export function quickPicks(r: RuleSet): QuickPick[] {
  const out: QuickPick[] = [];
  for (const d of DEFS) {
    const counts = countsOf(d.counts);
    const s = scoreSelection(counts, r);
    if (s.valid) out.push({ key: d.key, label: d.label, counts, points: s.points, diceUsed: s.diceUsed });
  }
  if (r.straight != null) {
    const counts = emptyCounts();
    ([1, 2, 3, 4, 5, 6] as Face[]).forEach((f) => (counts[f] = 1));
    out.push({ key: 'straight', label: 'Straight', counts, points: r.straight, diceUsed: 6 });
  }
  return out;
}
