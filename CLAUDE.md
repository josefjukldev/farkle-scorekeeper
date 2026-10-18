# CLAUDE.md — Instructions for Claude Code

## Mission
Build the **Dices with Friends** PWA (a Farkle scorekeeper) exactly as specified in this package. When files conflict, precedence is: `03_game_rules_engine.md` (rules) > `02_functional_requirements.md` > `05_ux_screens_and_flows.md` > the rest.

## Non-negotiables
1. **Pure rules engine.** All scoring and turn logic lives in `src/engine/` as pure TypeScript functions with no React, no DOM, no storage imports. 100% unit-tested before any UI is built.
2. **Local-first.** No server, no analytics, no third-party network calls at runtime (Geolocation and Web Share APIs are the only browser features touching outside data, both user-triggered).
3. **Never lose a game.** Persist after every recorded action. Reopening the app resumes an unfinished game.
4. **Mobile first.** Design for 360x640 px upward; every primary action reachable by thumb; touch targets at least 48x48 px.
5. **Rules are data.** No hard-coded score numbers outside `src/engine/presets.ts`.
6. **Immutable history.** A game stores a snapshot of the rule set used; later preset edits never alter archived games.
7. **Undo everywhere** in the turn entry flow, and edit-with-audit for past turns in an active game.

## Build order (do not skip ahead)
1. Scaffold project (Vite + React + TS + Tailwind + Vitest + Playwright + vite-plugin-pwa).
2. `src/engine` + full unit tests (see `08_test_plan_and_acceptance.md`, section 2).
3. `src/storage` (Dexie) + repository tests with fake-indexeddb.
4. State layer (Zustand) wiring engine and storage.
5. Screens in this order: Home, New Game, Turn Entry, Scoreboard, Game Over, Archive List, Game Detail/Review, Share image, Settings.
6. i18n (cs, en), accessibility pass, PWA/offline pass.
7. E2E tests, Lighthouse check (PWA, performance and accessibility at least 90).

## Definition of done per milestone
Code compiles with `strict` TypeScript, lint is clean, tests for that milestone pass, and the matching acceptance items in `08_test_plan_and_acceptance.md` are ticked in `docs/progress.md` (create this file and keep it updated).

## When something is ambiguous
Check `01_product_overview.md` section 6 (Assumptions and open questions). Implement the stated default, expose it as a setting where cheap, and note it in `docs/progress.md`. Do not stop to ask unless a decision would change the data model.
