# 03 — Game Rules and Scoring Engine

Authoritative description of the rules the engine implements. The engine is a pure TypeScript module (`src/engine`).

## 1. Equipment and objective
Six six-sided dice, thrown physically. The app records outcomes. Players take turns in a fixed order, collecting points by setting aside scoring dice. The winner is the player with the highest banked score when the game ends (target reached and final round played, or time over).

## 2. Scoring (default preset "House rules (note)")
Source: handwritten note. Cells marked (*) were not legible or not on the note and follow a documented assumption.

| Combination | Points |
|-------------|--------|
| Single 1 | 100 |
| Single 5 | 50 |
| Three 2s | 200 |
| Three 3s | 300 |
| Three 4s | 400 (*) |
| Three 5s | 500 (*) |
| Three 6s | 600 |
| Three 1s | 1000 |
| Four 1s | 2000 |
| Five 1s | 4000 (*) |
| Six 1s | 8000 (*) |
| Four / five / six of a kind, faces 2–6 | Triple value x 2 / x 4 / x 8 (*) |
| Straight 1-2-3-4-5-6 (all six dice) | 1000 |
| Minimum to bank | 350 |

### Preset "Classic Farkle" (alternative)
Single 1 = 100, single 5 = 50, triples = face x 100 (triple 1 = 1000), four/five/six of a kind = x2/x4/x8 of the triple, straight = 1500, minimum to bank = 500 on first entry, 350 afterwards... **No**: for simplicity ship "Classic" with minimum to bank = 300 on every turn, straight = 1500, hot dice on. Users can edit any value.

### Preset "Custom"
Copy of the last used preset, fully editable.

## 3. RuleSet schema
```ts
export interface RuleSet {
  id: string;
  name: string;
  single1: number;                // 100
  single5: number;                // 50
  tripleBase: Record<1|2|3|4|5|6, number>; // {1:1000,2:200,3:300,4:400,5:500,6:600}
  nOfKindMode: 'double' | 'table' | 'off'; // for 4,5,6 of a kind
  nOfKindTable?: Record<1|2|3|4|5|6, { four: number; five: number; six: number }>; // used if 'table'
  straight: number | null;        // 1000, null = disabled
  minBank: number;                // 350
  firstEntryMin: number | null;   // null = same as minBank
  hotDice: boolean;               // true
  twoDiceRule: 'off' | 'forceBankAtTwo'; // 'off'
  bustPenalty: { afterConsecutive: number; points: number } | null; // null
  endMode: 'target' | 'time';
  targetScore: number;            // used if target
  finalRound: 'equalTurns' | 'oneMoreTurnEach' | 'none'; // default 'oneMoreTurnEach'
  timeFinish: 'finishTurn' | 'immediate'; // default 'finishTurn'
  allowManualMultiplesOf: number; // 50
}
```
`endMode`, `targetScore` and time limit are set per game at creation but stored in the game's snapshot.

## 4. Scoring function
Input: a multiset of kept dice, as face counts `counts[1..6]`, and a RuleSet. Output: `{ points, diceUsed, valid, reason? }`.

A selection is **valid** only if every die in it contributes to points (no dead dice). Rules:
1. If `counts` is exactly one each of 1–6 and `straight != null`: points = `straight`, diceUsed = 6.
2. For each face f with count c:
   - c >= 3: triple value `tripleBase[f]`; for c = 4, 5, 6 apply `nOfKindMode`:
     - `double`: value = triple x 2^(c-3)
     - `table`: value from `nOfKindTable`
     - `off`: only the triple counts and extra dice are treated as singles (valid only for faces 1 and 5, otherwise invalid)
   - c < 3: only faces 1 and 5 score: `c x single1` or `c x single5`; other faces with c < 3 are invalid (dead dice).
3. points = sum over faces; diceUsed = total dice in the selection.
4. Selections of four or more of a kind for face 1/5 follow rule 2 (not mixed with singles).

### Pseudocode
```ts
export function scoreSelection(counts: Counts, r: RuleSet): ScoreResult {
  const total = sum(counts);
  if (total === 0 || total > 6) return invalid('empty-or-too-many');
  if (r.straight != null && counts.every(c => c === 1)) return ok(r.straight, 6);
  let points = 0;
  for (const f of [1,2,3,4,5,6]) {
    const c = counts[f];
    if (c === 0) continue;
    if (c >= 3) {
      points += nOfKind(f, c, r);   // returns null if mode 'off' and f not 1/5
      continue;
    }
    if (f === 1) points += c * r.single1;
    else if (f === 5) points += c * r.single5;
    else return invalid(`dead-die-${f}`);
  }
  return ok(points, total);
}
```

## 5. Turn state machine
```
          start
            │
        [AwaitingStep]  (diceRemaining = 6 initially)
          │        │
   add step      bust
          │        │
      [HasPoints]  └──► [TurnEnded: bust, total=0, penalty?]
        │   │   │
 rollAgain  bank  (auto) hotDice
        │     │      │
   [AwaitingStep]  [TurnEnded: banked]   diceRemaining := 6
```
State: `{ steps: Step[], turnTotal, diceRemaining, canBank, requiredMin, hotDicePending }`.

Events: `ADD_STEP(step)`, `ROLL_AGAIN`, `BANK`, `BUST`, `UNDO`, `FORCE_HOT_DICE`.

Rules:
- `ADD_STEP` with known dice: `diceRemaining -= diceUsed`. If it becomes 0 and `hotDice` is true → `diceRemaining = 6`, set `hotDicePending = true` (banner).
- Step with unknown dice (manual): diceRemaining unchanged and `diceKnown = false`; hot-dice tracking becomes manual for the rest of the turn.
- `canBank = turnTotal >= requiredMin`.
- `requiredMin = firstEntryMin ?? minBank` if the player's banked score is 0 and `firstEntryMin` set, else `minBank`.
- `BANK` is rejected by the engine if `!canBank`.
- `BUST`: turn total = 0. Increment `consecutiveBusts`. If `bustPenalty` is set and `consecutiveBusts` equals `afterConsecutive`, subtract `points` from the banked score (not below 0) and reset the counter. A successful bank resets the counter.
- `twoDiceRule = forceBankAtTwo`: after a step, if `diceRemaining === 2` and `canBank`, the UI must offer only Bank (Roll again hidden); if `!canBank` Roll again remains allowed. (Assumption A4; off by default.)
- `UNDO`: pops the last step and restores diceRemaining; engine stores the previous state in a stack.

## 6. Game state machine
```
[Setup] → [InProgress] → [FinalRound] (target mode, optional) → [Finished] → [Archived | Forgotten]
                  └───────────── time over / manual end ──────────────┘
```
Game state: `{ status, currentPlayerIndex, roundNumber, scores[playerId], turns[], finalRoundTriggeredBy?, finalRoundRemaining: playerId[] }`.

### Target mode
- When a BANK causes `score >= targetScore`:
  - `finalRound = 'none'` → game finishes immediately.
  - `'oneMoreTurnEach'` → every other player takes exactly one more turn after the triggering player, in order; then the game finishes.
  - `'equalTurns'` → players who have fewer turns than the triggering player take turns until everyone has equal turns (important when the trigger is not the last seat in the round).
- During the final round, any player may exceed the leader; ranking uses final banked scores.
- Busting during the final round simply scores 0 for that turn.

### Time mode
- Timer is stored as `{ limitMs, elapsedMs, running, lastResumeAt }`; the remaining time is derived from timestamps so it is accurate after app reload.
- At zero: `timeFinish = 'finishTurn'` → the active turn completes (bank or bust) and then the game ends; the app shows "Time is up – finish this turn". `'immediate'` → the unbanked turn is discarded.
- Rounds need not be equal in time mode; ranking is by banked score.

### Ranking
Sort by score descending. Equal scores share a rank (1, 1, 3). Secondary info shown, not used for rank: fewer turns, fewer busts, best turn.

## 7. Validation
- Manual step: integer, multiple of `allowManualMultiplesOf`, between 50 and 20 000.
- Quick-pick step values are always derived from the active RuleSet and must pass `scoreSelection`.
- RuleSet validation: all values non-negative integers (multiples of 50), `minBank` between 0 and 2 000, `targetScore` ≥ 1 000 and ≥ `minBank`, time limit 1–240 min.

## 8. Quick-pick catalogue (generated from RuleSet)
Order on screen (primary row first): `1`, `5`, `1+5`, `2×1`, `2×5`, `3×2`, `3×3`, `3×4`, `3×5`, `3×6`, `3×1`, `4×1`, `Straight`, `Other…` (opens picker or manual). Each quick pick carries its `counts` so diceUsed is known. A counter modifier "x2/x3" lets the user add the same quick pick repeatedly (for example two separate singles of 5 is handled by tapping `5` twice).

## 9. Worked examples (use as unit tests)
| # | Selection (face:count) | Expected points | Dice used | Valid |
|---|------------------------|-----------------|-----------|-------|
| 1 | 1:1 | 100 | 1 | yes |
| 2 | 5:2 | 100 | 2 | yes |
| 3 | 1:1, 5:1 | 150 | 2 | yes |
| 4 | 2:3 | 200 | 3 | yes |
| 5 | 6:3 | 600 | 3 | yes |
| 6 | 1:3 | 1000 | 3 | yes |
| 7 | 1:4 | 2000 | 4 | yes |
| 8 | 4:4 (mode double) | 800 | 4 | yes |
| 9 | 3:3, 5:3 | 800 | 6 | yes |
| 10 | 1:1,2:1,3:1,4:1,5:1,6:1 | 1000 | 6 | yes |
| 11 | 2:2 | — | — | no (dead dice) |
| 12 | 1:1, 2:1 | — | — | no (dead die 2) |
| 13 | 5:3 (mode off, 3 fives) | 500 | 3 | yes |
| 14 | 1:6 (mode double) | 8000 | 6 | yes |
| 15 | 0 dice | — | — | no |

Turn examples:
- Steps 100 → 50 → 200 = 350 → Bank allowed (min 350) → score += 350.
- Steps 100 → 100 = 200 → Bank disabled ("150 missing").
- Steps 1:3 (1000, 3 dice), 5:3 (500, 3 dice) → hot dice banner, dice remaining = 6, turn total 1500.
- Bust after steps totalling 600 → turn total 0, score unchanged.
