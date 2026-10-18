export type Id = string;
export type Face = 1 | 2 | 3 | 4 | 5 | 6;
export type Counts = Record<Face, number>;
export const FACES: Face[] = [1, 2, 3, 4, 5, 6];

export type NOfKindMode = 'multiplier' | 'doubling' | 'table' | 'off';
export type BankRestriction = 'anytime' | 'exactlyTwoOrHot' | 'atMostTwoOrHot';
export type FinalRoundMode = 'equalTurns' | 'oneMoreTurnEach' | 'none';
export type TimeFinish = 'finishTurn' | 'immediate';

export interface RuleSet {
  id: string;
  name: string;
  single1: number;
  single5: number;
  tripleBase: Record<Face, number>;
  nOfKindMode: NOfKindMode;
  nOfKindTable?: Record<Face, { four: number; five: number; six: number }>;
  straight: number | null;
  minBank: number;
  firstEntryMin: number | null;
  hotDice: boolean;
  bankRestriction: BankRestriction;
  bustPenalty: { afterConsecutive: number; points: number } | null;
  finalRound: FinalRoundMode;
  timeFinish: TimeFinish;
  allowManualMultiplesOf: number;
  manualMax: number;
}

export type EndCondition = { type: 'target'; targetScore: number } | { type: 'time'; limitMs: number };

export type ScoreResult = { valid: true; points: number; diceUsed: number } | { valid: false; reason: string };

export type StepSource = 'quick' | 'dice' | 'manual';

export interface Step {
  id: Id;
  points: number;
  source: StepSource;
  counts?: Counts;
  diceUsed?: number;
  label?: string;
  at: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export const emptyCounts = (): Counts => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
export const countsOf = (partial: Partial<Counts>): Counts => ({ ...emptyCounts(), ...partial });
export const sumCounts = (c: Counts): number => FACES.reduce((a, f) => a + c[f], 0);
