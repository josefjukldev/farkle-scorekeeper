import type { EndCondition, RuleSet } from './types';
import { FACES } from './types';

const isMultiple = (n: number, m: number) => Number.isInteger(n) && n >= 0 && n % m === 0;

export function validateRuleSet(r: RuleSet): string[] {
  const errors: string[] = [];
  const m = r.allowManualMultiplesOf || 50;
  if (!isMultiple(r.single1, m)) errors.push('single1');
  if (!isMultiple(r.single5, m)) errors.push('single5');
  for (const f of FACES) if (!isMultiple(r.tripleBase[f], m)) errors.push(`triple${f}`);
  if (r.straight != null && !isMultiple(r.straight, m)) errors.push('straight');
  if (!isMultiple(r.minBank, m) || r.minBank > 2000) errors.push('minBank');
  if (r.firstEntryMin != null && (!isMultiple(r.firstEntryMin, m) || r.firstEntryMin > 2000)) errors.push('firstEntryMin');
  if (r.bustPenalty && (r.bustPenalty.afterConsecutive < 2 || !isMultiple(r.bustPenalty.points, m))) errors.push('bustPenalty');
  if (r.manualMax < m) errors.push('manualMax');
  return errors;
}

export function validateEnd(end: EndCondition, r: RuleSet): string[] {
  if (end.type === 'target') {
    const t = end.targetScore;
    return t >= 1000 && t >= r.minBank && t % 50 === 0 ? [] : ['targetScore'];
  }
  const min = end.limitMs / 60000;
  return min >= 1 && min <= 240 ? [] : ['limitMs'];
}

export function validateManualStep(points: number, r: RuleSet): boolean {
  return Number.isInteger(points) && points >= r.allowManualMultiplesOf && points <= r.manualMax && points % r.allowManualMultiplesOf === 0;
}

export function validatePlayerNames(names: string[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  names.forEach((raw, i) => {
    const n = raw.trim();
    if (n.length < 1 || n.length > 24) errors.push(`name-${i}-length`);
    else if (seen.has(n.toLowerCase())) errors.push(`name-${i}-duplicate`);
    seen.add(n.toLowerCase());
  });
  if (names.length < 2 || names.length > 8) errors.push('player-count');
  return errors;
}
