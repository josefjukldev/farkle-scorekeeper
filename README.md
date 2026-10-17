# Farkle Scorekeeper — Design Package

Handover package for building the **Farkle Scorekeeper** app with Claude Code.

## Reading order
| # | File | Content |
|---|------|---------|
| 0 | `CLAUDE.md` | Working instructions and guardrails for Claude Code (read first) |
| 1 | `01_product_overview.md` | Purpose, users, scope, glossary, success criteria |
| 2 | `02_functional_requirements.md` | Numbered functional requirements (FR-xxx) with acceptance hooks |
| 3 | `03_game_rules_engine.md` | Farkle rules, scoring tables, presets, turn state machine, pseudocode |
| 4 | `04_data_model_and_storage.md` | Entities, TypeScript types, IndexedDB schema, migrations, backup |
| 5 | `05_ux_screens_and_flows.md` | Screen inventory, wireframes, flows, responsive and accessibility rules |
| 6 | `06_review_and_style_analytics.md` | Game review, player style assessment algorithm, share image |
| 7 | `07_architecture_and_tech.md` | Stack, folder structure, PWA, i18n, build and deploy |
| 8 | `08_test_plan_and_acceptance.md` | Unit, component, E2E tests, acceptance checklist, delivery milestones |

## One-paragraph summary
A mobile-first, offline-capable web app (PWA) that replaces the paper scoresheet for the six-dice game Farkle (Czech: *Kostky*). Dice are physical; the app only records and calculates. The host creates a game (name, players, end condition: target points or countdown timer), players take turns entering the result of their throws through quick-pick buttons, a dice-face picker or manual entry, the app enforces Farkle logic (minimum to bank, bust, hot dice), ranks players when the game ends, and offers to **forget** the game or **archive** it. Archived games get an auto-generated review, a playing-style label per player, and a shareable image dashboard. Everything is stored locally on the device and survives restarts.

## Decisions already made (change only by editing these files)
- Local-first PWA, no backend, no accounts. Data lives in IndexedDB.
- Default rule preset = "House rules (from the paper note)". Every rule value is configurable.
- Languages: Czech (default) and English.
- Single-device "pass the phone" usage; no networked multiplayer in v1.
