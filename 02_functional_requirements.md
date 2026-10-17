# 02 — Functional Requirements

Priority: **M** = must (v1), **S** = should (v1 if time), **C** = could (later).
Each requirement has an ID used in tests (`08_test_plan_and_acceptance.md`).

## 1. Home and navigation
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-100 | Home screen shows: "New game", "Resume game" (only if an unfinished game exists), "Archive", "Settings". | M |
| FR-101 | If an unfinished game exists, show its name, players and last activity; actions: Resume / Discard. | M |
| FR-102 | Only one active game at a time in v1. Starting a new game while one is unfinished requires explicit confirmation to discard it. | M |
| FR-103 | App remembers the language, last-used players, last-used rule preset and last-used end condition. | S |

## 2. Game creation
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-200 | Game name is required (1–60 chars). Suggest a default such as "Farkle – 18 Oct 2026". | M |
| FR-201 | Number of players: 2 to 8. Player name required, 1–24 chars, unique within the game (case-insensitive). | M |
| FR-202 | Player names can be picked from "recent players" chips or typed. Optional colour per player (auto-assigned from palette). | M |
| FR-203 | Player order can be changed by drag-and-drop or up/down buttons; "Shuffle order" button. | M |
| FR-204 | End condition selector (exactly one): **Target score** (default 10 000; presets 5 000, 10 000, 20 000 or custom number, multiple of 50) or **Time limit** (countdown in minutes, presets 15, 30, 45, 60 or custom 1–240). | M |
| FR-205 | Rule preset selector: "House rules (note)" default, "Classic Farkle", "Custom". "Custom" opens the rules editor (see FR-210). Selected rules are snapshotted into the game. | M |
| FR-206 | Location: toggle "Save location" (default from Settings). If on and permission granted, capture coordinates once at game creation; user may also type a free-text place label. If permission denied or unavailable, game continues without location and no error blocks the flow. | M |
| FR-207 | Date and time of game start are stored automatically (device local time plus timezone offset). | M |
| FR-208 | Validation errors are inline and specific; the "Start game" button is disabled until the form is valid. | M |
| FR-210 | Rules editor: edit every value of the rule set (scoring table, minimum to bank, first-entry minimum, four/five/six of a kind mode, straight value, hot dice on/off, two-dice rule, three-bust penalty, final round mode, time-limit finish mode). Shows a validation summary. Can save as a named custom preset. | M |

## 3. Turn recording
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-300 | Turn screen header shows: player name and colour, **current banked score**, points still needed to the target (target mode) or time remaining (time mode), round number, and the minimum-to-bank status. | M |
| FR-301 | The screen shows the **turn total** (unbanked), updated live as steps are added. | M |
| FR-302 | Three input methods for one throw result, all producing a *step*: (a) **Quick picks** (b) **Dice-face picker** (c) **Manual number**. | M |
| FR-303 | Quick picks: buttons for the most common results: `1` (+100), `5` (+50), `1+5` (+150), `2×1` (+200), `2×5` (+100), triples 2–6 (+200…+600), triple 1 (+1000), four 1s (+2000), straight (+1000). Quick picks are generated from the active rule set so values always match. Long-press or "x" counter allows multiples. | M |
| FR-304 | Dice-face picker: user marks how many dice of each face (1–6) were set aside (stepper per face, total max = dice remaining). Engine computes the score and flags invalid selections (non-scoring dice present). Displays "dice used / dice remaining". | M |
| FR-305 | Manual entry: numeric keypad, accepts multiples of 50 only (configurable), range 50–20 000 per step. Manual steps do not consume a known number of dice (user may optionally specify dice used for hot-dice tracking; default "unknown"). | M |
| FR-306 | After adding a step, user chooses **Roll again** (stay in the turn, with the number of dice remaining shown) or **Bank**. | M |
| FR-307 | **Bank** is enabled only when turn total ≥ required minimum **and** the bank window is open (FR-314). When disabled, show the reason: points missing or dice rule. | M |
| FR-308 | **Bust (Farkle)** button is always available. It sets the turn result to 0, applies configured penalties, and passes to the next player after one confirmation tap. | M |
| FR-309 | **Hot dice**: when the dice used reach 6 (known via quick pick or dice-face picker), show a "Hot dice – take all 6 dice" banner and reset dice remaining to 6; the turn continues. For manual steps the user can press "Hot dice" manually. | M |
| FR-310 | **Undo** removes the last step of the current turn (or reverts the last bank/bust of the previous player if the current turn is empty, within the same session). Unlimited depth within the current game. | M |
| FR-311 | Before passing to the next player, show a confirmation summary: "Pavel banks 450 → 2 350. Next: Jana". One tap to confirm, one tap to go back. | M |
| FR-312 | Next-player screen starts with a clear hand-over state: large next player name, current score, "Start turn" button (prevents accidental taps). | M |
| FR-313 | Past turns of the current game can be edited from the Scoreboard / History tab (change turn total or result). Edits recompute all totals and are flagged "edited" in the log. | S |
| FR-314 | Bank window (`bankRestriction`): when active, Bank is enabled only with 2 or fewer dice left or in hot-dice state, and a hint says so ("Bank needs 2 or fewer dice left, or hot dice"). Roll again is always available. | M |

## 4. Live scoreboard
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-400 | A Scoreboard tab/drawer lists all players sorted by current score with rank, score, progress bar to target (target mode), turns played, busts. | M |
| FR-401 | History tab lists turns in reverse chronological order: round, player, steps, result (banked / bust), turn total, timestamp. | M |
| FR-402 | Countdown timer (time mode) is always visible, can be paused/resumed by the host (paused time is not counted), and turns amber under 5 min and red under 1 min. A beep/vibration at zero if device allows. | M |
| FR-403 | The screen stays awake during an active game (Screen Wake Lock API where supported). | S |

## 5. Game end
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-500 | **Target mode:** when a banked score reaches or exceeds the target, the final-round logic from the rules engine applies (default: all remaining players get exactly one more turn). A banner shows "Final round – beat 10 250!". | M |
| FR-501 | **Time mode:** when the countdown reaches zero, behaviour follows the rule setting: finish the current turn (default) or end immediately (current unbanked turn is discarded). | M |
| FR-502 | Host can end the game manually at any time ("End game now") with confirmation; it uses the current banked scores. | M |
| FR-503 | When the game ends, show the **Final Results dashboard**: podium (top 3), full ranking 1st…last with score, turns, busts, best turn; winner highlight; ties share a rank. | M |
| FR-504 | Final screen offers two primary actions: **Archive game** and **Forget game**. Forget requires a confirmation dialog and permanently deletes all data of that game. | M |
| FR-505 | Until the user chooses, the finished game is kept as "pending" so closing the app does not lose it. On next open the user is returned to this decision. | M |

## 6. Archive and review
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-600 | On archive, generate the game review (see `06_review_and_style_analytics.md`): summary text, key moments, awards, player style label and short feedback per player. | M |
| FR-601 | Archive list: cards sorted by date desc with game name, date/time, location label (if any), players, winner, end condition. Search by name/player, filter by player and date range. | M |
| FR-602 | Game detail: dashboard (ranking), review, per-player stats, full turn log, score-progress line chart over rounds. | M |
| FR-603 | Delete archived game (with confirmation). Rename archived game. | M |
| FR-604 | **Share**: generate a PNG dashboard image (1080x1350) with game name, date, winner, ranking, awards, style labels. Use the Web Share API with file when available; otherwise offer Download and "Copy image". | M |
| FR-605 | Cross-game player statistics page (games, wins, win rate, average turn score, bust rate) based on the archive. | C |

## 7. Persistence, settings, platform
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-700 | All data is stored in IndexedDB on the device and survives app restarts. The app requests persistent storage (`navigator.storage.persist()`). | M |
| FR-701 | The app opens straight to Home and shows the archive immediately (no loading from a network). | M |
| FR-702 | Backup: Export all data to a JSON file; Import JSON (merge by id, never overwrite silently — show a summary first). | M |
| FR-703 | Settings: language (cs/en), theme (system/light/dark), default location behaviour, sound/vibration, default preset, "Reset all data" (double confirmation). | M |
| FR-704 | Installable PWA (manifest, icons, service worker), works offline after first load. | M |
| FR-705 | Responsive layout: phone portrait is primary; tablet and desktop use a centred column (max 560 px) or two-pane layout where useful. | M |
| FR-706 | Accessibility: WCAG 2.1 AA contrast, screen-reader labels on all controls, dynamic type respected, no information conveyed by colour alone. | M |
| FR-707 | Privacy: location is stored only on the device; the share image never includes coordinates unless the user adds a place label to it (toggle in share dialog, default off). | M |

## 8. Error handling
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-800 | Storage write failure → blocking but clear error with "Retry" and "Export current game" options. | M |
| FR-801 | Invalid rules configuration is rejected in the editor with specific messages; engine never receives an invalid rule set. | M |
| FR-802 | Unexpected exceptions are caught by an error boundary that preserves the game in storage and offers "Reload". | M |
