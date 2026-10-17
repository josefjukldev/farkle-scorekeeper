# 06 — Game Review, Player Style and Sharing

Everything here is generated **locally and deterministically** (no AI service, no network). Text comes from templates in the i18n files, with variants chosen by a seeded random from the game id so reruns give the same text.

## 1. Per-player statistics (`PlayerStats`)
Computed from turns:
| Metric | Definition |
|--------|------------|
| turns | Number of turns |
| bankedTurns / busts | Count by result |
| bustRate | busts / turns |
| avgBank | Average turn total of banked turns |
| avgTurnAll | Total banked points / turns (busts count as 0) |
| bestTurn | Highest banked turn total |
| avgStepsPerTurn | Average steps per turn (proxy for risk-taking) |
| avgBankedAfterSteps | Average number of steps in banked turns |
| hotDice | Number of hot-dice events |
| bigTurns | Turns with total ≥ 1 000 |
| bankAtMinRate | Share of banked turns where total < minBank + 150 (cautious banking) |
| longestBustStreak / longestBankStreak | Consecutive results |
| lostToBusts | Sum of turn totals lost in busts (potential points lost) |
| comeback | Largest deficit to the leader that the player overcame (rounds-based) |
| leadChanges | Times the player took the lead |
| finalScore, rank | From result |

`lostToBusts` is the sum of the unbanked totals at the time of the bust (known because steps are recorded before the bust).

## 2. Style classification
Each player receives **one primary style** (and optionally a secondary tag). Evaluate in the order below; first match wins. Thresholds are constants in `src/review/thresholds.ts`. Minimum 4 turns required, otherwise "Newcomer" (not enough data).

| Style (en / cs) | Rule | Feedback template idea |
|-----------------|------|------------------------|
| The Banker / Opatrný bankéř | avgStepsPerTurn ≤ 1.6 and bustRate ≤ 0.15 | "You rarely lose points and bank early. To win more, take one extra roll when you hold 4+ dice." |
| The Gambler / Hazardér | avgStepsPerTurn ≥ 2.8 or lostToBusts ≥ 35 % of (banked + lost) | "High risk, high drama. You lost X points to busts; banking at Y would have kept Z." |
| The Streaker / Série | hotDice ≥ 2 or bigTurns ≥ 25 % of turns | "Hot dice kept falling for you. Big turns decided the game." |
| The Comeback Kid / Obrat | comeback ≥ 3000 and finished in top half | "You were X points behind and fought back." |
| The Tortoise / Želva (steady) | stdDev(banked totals) ≤ 0.35 x avgBank and bustRate ≤ 0.25 | "Consistent, reliable scoring." |
| The Unlucky / Smolař | bustRate ≥ 0.40 | "Dice were not on your side: N busts, M in a row." |
| Balanced / Vyrovnaný | otherwise | "A well-balanced style." |

Secondary tag (max one): "Big hitter" (bestTurn is the highest in the game), "Iron nerves" (longestBankStreak ≥ 4), "Streak breaker" (ended opponent leads — optional).

## 3. Awards (game level)
Pick at most 5, each to a different player where possible:
- **Winner** — rank 1 (always).
- **Biggest turn** — highest `bestTurn`.
- **Most hot dice** (≥ 1).
- **Busted most** — highest bust count ("Kostka smůly").
- **Most consistent** — lowest relative std-dev with ≥ 4 turns.
- **Best comeback** — largest comeback value.
- **Closest finish** — if the gap between ranks 1 and 2 ≤ 250.

## 4. Game headline and summary
Headline examples: "Jana wins by 350 points", "Photo finish!", "Pavel's comeback falls short". Summary (2–4 sentences) built from: number of rounds, duration (from timestamps), lead changes, biggest turn, total busts in the game. Include the end condition ("first to 10 000" or "30-minute limit").

## 5. Feedback tone
Friendly, light, never insulting. Max 2 sentences per player. Czech and English variants for every template (minimum 3 variants per style for variety).

## 6. Share image
- Generated client-side from an off-screen DOM node (`html-to-image`) or `<canvas>`; PNG, 1080 x 1350 px (4:5) plus optional 1080 x 1920 story format.
- Contents: app name/logo, game name, date (and place label if the user switches it on), podium of top 3 with names and scores, full ranking list (up to 8 players), up to 3 awards, each player's style label with icon, small footer "Made with Farkle Scorekeeper".
- Theme: follows the app theme, with a "colourful" fixed theme option for social media.
- Share flow: `navigator.canShare({ files })` → `navigator.share({ files, title, text })`; fallback "Download PNG" and "Copy image" (Clipboard API).
- Images are generated on demand and not stored (only the review data is stored), so layout upgrades apply to old games.
- Never embed coordinates or exact location; place label only if explicitly toggled on.

## 7. Charts in Game Detail
Line chart of cumulative banked score per player per round (lightweight lib such as `recharts`, or hand-written SVG). Optional bar chart of busts and average turn.

## 8. Testing the analytics
Provide fixture games (JSON) in `tests/fixtures/` that trigger each style and award; snapshot the generated review text for `en` and `cs`.
