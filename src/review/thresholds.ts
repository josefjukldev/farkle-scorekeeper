export const T = {
  minTurns: 4,
  banker: { maxSteps: 1.6, maxBustRate: 0.15 },
  gambler: { minSteps: 2.8, minLostShare: 0.35 },
  streaker: { minHotDice: 2, minBigShare: 0.25, bigTurn: 1000 },
  comeback: { minDeficit: 3000 },
  tortoise: { maxRelStdDev: 0.35, maxBustRate: 0.25, minBanked: 3 },
  unlucky: { minBustRate: 0.4 },
  bankAtMinMargin: 150,
  ironNervesStreak: 4,
  closestFinishGap: 250,
  comebackFinishWindow: 500
} as const;
