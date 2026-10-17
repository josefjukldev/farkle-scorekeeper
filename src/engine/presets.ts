import type { RuleSet } from './types';

export const HOUSE_RULES: RuleSet = {
  id: 'house',
  name: 'House rules (note)',
  single1: 100,
  single5: 50,
  tripleBase: { 1: 1000, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600 },
  nOfKindMode: 'multiplier',
  straight: 1000,
  minBank: 350,
  firstEntryMin: null,
  hotDice: true,
  bankRestriction: 'atMostTwoOrHot',
  bustPenalty: null,
  finalRound: 'oneMoreTurnEach',
  timeFinish: 'finishTurn',
  allowManualMultiplesOf: 50,
  manualMax: 20000
};

export const CLASSIC_RULES: RuleSet = {
  ...HOUSE_RULES,
  id: 'classic',
  name: 'Classic Farkle',
  nOfKindMode: 'doubling',
  straight: 1500,
  minBank: 300,
  bankRestriction: 'anytime'
};

export const BUILT_IN_PRESETS: RuleSet[] = [HOUSE_RULES, CLASSIC_RULES];

export const DEFAULT_TARGET = 10000;
export const TARGET_PRESETS = [5000, 10000, 20000];
export const TIME_PRESETS_MIN = [15, 30, 45, 60];
