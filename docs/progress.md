# Progress

Status legend: [ ] todo, [x] done. Acceptance items mirror `08_test_plan_and_acceptance.md` section 6.

## Milestones
- [ ] M0 Scaffold, CI, lint, test runner
- [ ] M1 Rules engine + unit tests (>= 95 % coverage)
- [ ] M2 Storage layer
- [ ] M3 Game creation + turn entry + scoreboard
- [ ] M4 End of game, final dashboard, forget/archive
- [ ] M5 Archive, review, style analytics, share image
- [ ] M6 Settings, i18n, backup, PWA, accessibility

## Design phase
- [x] Spec review and consistency fixes (branch `docs/spec-fixes`)
- [x] Design brief (`09_design_brief.md`)
- [ ] Design direction approved (open questions in brief section 8)
- [ ] High-fidelity mockups: S4, S5, S6, S8
- [ ] Remaining screens and component sheet

## Acceptance checklist
### Game setup
- [ ] FR-200..203 game, players, order, shuffle
- [ ] FR-204 end condition
- [ ] FR-205, FR-210 presets and editor
- [ ] FR-206, FR-207 date and location
### Play
- [ ] FR-300, FR-301 header and turn total
- [ ] FR-302..305 quick picks, dice picker, manual
- [ ] FR-307..310 bank minimum, bust, hot dice, undo
- [ ] FR-311, FR-312 hand-over and confirm
- [ ] FR-400..402 scoreboard, history, timer
### End
- [ ] FR-500..502 end conditions
- [ ] FR-503 final dashboard, ties
- [ ] FR-504, FR-505 forget/archive, pending state
### Archive
- [ ] FR-600 review
- [ ] FR-601..603 list, detail, rename, delete
- [ ] FR-604, FR-707 share image
### Platform
- [ ] FR-700, FR-701 persistence
- [ ] FR-702 export/import
- [ ] FR-704 PWA offline
- [ ] FR-705 responsive
- [ ] FR-706 accessibility

## Decisions and assumptions log
- Classic preset: min bank 300 every turn, straight 1500 (spec cleanup).
- `nOfKindMode = off`: extra dice beyond three score as singles for faces 1 and 5 only.
- Added `manualMax` to RuleSet; added `Preset` type; defined review metrics precisely.
