# 08 — Test Plan, Acceptance Criteria and Milestones

## 1. Strategy
Test pyramid: many fast unit tests of the engine, component tests of key screens, a small set of E2E flows on a mobile viewport (Pixel 5 and iPhone 12 profiles).

## 2. Unit tests — engine (must be complete before UI work)
| Area | Cases |
|------|-------|
| `scoreSelection` | All 15 examples in `03` section 9; every triple and every n-of-a-kind mode; straight on/off; invalid selections; edge counts (0 and more than 6 dice) |
| Quick picks | Generated values equal `scoreSelection` for every pick under each preset |
| Turn machine | Add steps; bank allowed/blocked at 349/350; first-entry minimum; bust; hot dice; manual step with unknown dice; `bankRestriction` all three modes (bank blocked at 3 dice left, allowed at 2, allowed after hot dice); undo across steps; consecutive-bust penalty |
| Game machine | Target reached by the last seat / middle seat; `none`, `oneMoreTurnEach`, `equalTurns`; double-trigger during final round; manual end; time mode with `finishTurn` / `immediate`; pause/resume timer |
| Ranking | Distinct scores; ties (1,1,3); all-zero scores |
| Validation | RuleSet bounds; manual value multiples of 50; name uniqueness |
| Review | Each style and award on fixture games; template selection determinism; cs and en snapshots |
Coverage target: engine and review ≥ 95 % lines.

## 3. Storage tests
Create / resume / forget / archive; transaction atomicity (forget deletes turns); reload restores `activeTurn`; migration fixture; export → import round-trip equals original; import with duplicates; timer accuracy after simulated reload.

## 4. Component tests
- Turn Entry: quick pick adds step and updates total; Bank disabled with hint below minimum; Bust flow; Undo.
- New Game: validation, duplicate names, order change, end-condition switching, location denied path.
- Final Results: ranking order, tie display, Forget requires confirmation.
- Share dialog: fallback when `navigator.share` missing.

## 5. E2E scenarios (Playwright)
1. **Happy path target:** create "Test" with 3 players, target 1 000; play turns until the target is reached; verify final-round banner, correct ranking; archive; open Archive; reload; game still listed with review.
2. **Time mode:** create 1-minute game (use fake clock), let time expire mid-turn; verify "finish this turn" then game end.
3. **Forget:** finish game → Forget → confirm → not in archive after reload.
4. **Crash recovery:** mid-turn with two steps, reload page, turn restored with the same totals and the same player.
5. **Offline:** after first load go offline, create and finish a game, archive it.
6. **Location:** permission granted (stored), permission denied (game still starts).
7. **Share:** mock `navigator.share`; verify a PNG blob is produced at 1080x1350.
8. **Language switch** cs ↔ en retains data and formats numbers.
9. **Backup:** export, reset, import; archive restored.

## 6. Acceptance checklist (tick in `docs/progress.md`)
### Game setup
- [ ] Create a game with name, 2–8 players, order and shuffle (FR-200…203)
- [ ] Choose target or time limit, defaults applied (FR-204)
- [ ] Rule preset selection and editor, snapshot saved (FR-205, FR-210)
- [ ] Date/time and optional location stored (FR-206, FR-207)
### Play
- [ ] Turn header shows current score and turn total (FR-300, FR-301)
- [ ] Quick picks, dice picker, manual entry all work (FR-302…305)
- [ ] Bank minimum, bust, hot dice, undo (FR-307…310)
- [ ] Hand-over and confirmation steps (FR-311, FR-312)
- [ ] Live scoreboard and history, timer with pause (FR-400…402)
### End
- [ ] Target and time end conditions plus manual end (FR-500…502)
- [ ] Final dashboard with ranking incl. ties (FR-503)
- [ ] Forget vs. archive, pending state survives restart (FR-504, FR-505)
### Archive
- [ ] Review with awards and style per player (FR-600)
- [ ] Archive list, search, filter, detail, rename, delete (FR-601…603)
- [ ] Share image generated and shared/downloaded (FR-604, FR-707)
### Platform
- [ ] Data persists across restarts (FR-700, FR-701)
- [ ] Export/import (FR-702)
- [ ] Installable, offline (FR-704)
- [ ] Responsive on 360 px phone to desktop (FR-705)
- [ ] Accessibility checks pass (FR-706)

## 7. Delivery milestones
| M | Deliverable | Exit criteria |
|---|-------------|---------------|
| M0 | Scaffold, CI, lint, test runner | `npm test` runs |
| M1 | Rules engine + unit tests | Section 2 green, coverage ≥ 95 % |
| M2 | Storage layer | Section 3 green |
| M3 | Game creation + turn entry + scoreboard | E2E 1, 3, 4 pass |
| M4 | End of game, final dashboard, forget/archive | E2E 1–3 pass |
| M5 | Archive, review, style analytics, share image | E2E 7 pass; review snapshots approved |
| M6 | Settings, i18n, backup, PWA, accessibility polish | All E2E green; Lighthouse targets met |

## 8. Sample data
Provide `tests/fixtures/games/*.json` (at least: 4-player target game with ties, 3-player time game, a Gambler-heavy game, a Banker-heavy game) and a "Load demo game" button visible only in development builds.
