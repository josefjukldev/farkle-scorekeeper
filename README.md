# Dices with Friends

A mobile-first, offline-capable web app (PWA) that replaces the paper scoresheet for the six-dice game Farkle (Czech: *Kostky*). The dice stay physical; the app records turns, enforces the rules, ranks the players, and keeps a reviewable archive with a shareable image. Everything is stored on the device. No accounts, no server, no tracking.

The repository started as a design package (the numbered Markdown files). It now also contains a **working prototype** of the app.

## Run it
```
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests: engine, review, storage, backup, i18n
npm run test:e2e     # Playwright on a Pixel 5 profile (builds and previews the app)
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/
```
In a restricted environment point Playwright at an installed Chromium with `CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## What works in the prototype
- New game: 2 to 8 players (reorder, shuffle, recent players, duplicate and length validation), target score or time limit, rule presets and a full rules editor, optional location.
- Turn entry: quick picks generated from the rules, dice picker, manual entry, hot dice, undo, bank window (2 or fewer dice left, or hot dice), minimum to bank, bust, confirm and hand-over screens, undo of the last finished turn.
- Live scoreboard and history with editing of past turns (recomputed and flagged "edited"), timer with pause, final round, end game now.
- Final results with ties, then Archive (review, awards, player styles, chart, share image) or Forget.
- Archive search, player and date filters, rename, delete; PNG share image (1080x1350) via Web Share, download or copy.
- Settings: Czech / English, theme, sound, vibration, backup export and import with preview, reset.
- Installable PWA that works offline; the game is saved after every action and restored after a reload.

## Layout
```
src/engine    pure rules engine (scoring, turn and game machines, ranking, validation)
src/review    stats, player style classification, awards (locale-free data)
src/storage   Dexie database, repository, JSON backup
src/state     Zustand stores wiring engine and storage
src/ui        screens, components, share image renderer
src/i18n      cs and en strings
tests/unit    Vitest; tests/e2e Playwright (including axe accessibility scans)
```

## Design package
| # | File | Content |
|---|------|---------|
| 0 | `CLAUDE.md` | Working instructions and guardrails for Claude Code |
| 1 | `01_product_overview.md` | Purpose, users, scope, glossary, assumptions |
| 2 | `02_functional_requirements.md` | Numbered functional requirements |
| 3 | `03_game_rules_engine.md` | Rules, scoring tables, presets, state machines |
| 4 | `04_data_model_and_storage.md` | Entities, IndexedDB schema, backup format |
| 5 | `05_ux_screens_and_flows.md` | Screens, wireframes, flows, accessibility |
| 6 | `06_review_and_style_analytics.md` | Review, style algorithm, share image |
| 7 | `07_architecture_and_tech.md` | Stack, structure, PWA, deploy |
| 8 | `08_test_plan_and_acceptance.md` | Tests, acceptance checklist, milestones |
| 9 | `09_design_brief.md` | Visual language and design tokens |
| – | `docs/progress.md` | Milestones, acceptance status, decisions and deviations |

## Decisions already made
- Local-first PWA, no backend, no accounts. Data lives in IndexedDB.
- Default preset "House rules (from the paper note)"; every rule value is configurable.
- Czech (default) and English.
- Single-device "pass the phone" play; no networked multiplayer in v1.
- Name: Dices with Friends. Brand: blue primary, gray secondary, light gray and white backgrounds.
