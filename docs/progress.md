# Progress

Legend: [x] done and covered by an automated test or check, [~] done in the prototype with a known gap (see below), [ ] not done.

## Milestones
- [x] M0 Scaffold (Vite, React 18, strict TypeScript, Vitest, Playwright, vite-plugin-pwa), CI workflow
- [x] M1 Rules engine and unit tests (`tests/unit/score|turn|game.test.ts`; coverage target not measured yet)
- [x] M2 Storage layer (Dexie, repository, JSON backup) and tests with fake-indexeddb
- [x] M3 Game creation, turn entry, scoreboard, history, editing
- [x] M4 End of game, final results, forget or archive, pending state survives a reload
- [x] M5 Archive, review, style analytics, share image
- [~] M6 Settings, i18n, backup, PWA, accessibility (see gaps)

## Quality checks run on this prototype
- Unit tests: 103 passing (engine, review, storage, backup, store, i18n keys and plurals).
- E2E (Playwright, Pixel 5 profile): 22 passing, including no-scroll fit checks at four iPhone Chrome viewports, including crash recovery, offline, time mode, backup round trip, share (1080x1350 PNG, `navigator.share` mocked and fallback), location granted and denied.
- axe (WCAG 2.1 A/AA) scans of 14 screens and sheets in light and dark: no violations.
- Lighthouse (mobile, local preview): performance 98, accessibility 100, best practices 96. Installability is covered by the manifest and service worker, not by Lighthouse 12 (no PWA category).
- First load: 449 KB JS, 139 KB gzipped.

## Acceptance checklist
### Game setup
- [x] FR-200..203 game name, 2-8 players, order, shuffle (reorder uses up and down buttons)
- [x] FR-204 end condition and defaults
- [x] FR-205, FR-210 presets and rules editor, snapshot saved in the game
- [x] FR-206, FR-207 date, time and optional location (looked up in the background)
### Play
- [x] FR-300, FR-301 header and turn total
- [x] FR-302..305 quick picks, dice picker, manual entry
- [x] FR-307..310 bank window and minimum, bust, hot dice, undo
- [x] FR-311, FR-312 confirm and hand-over
- [x] FR-313 edit past turns (recomputed, flagged)
- [x] FR-314 bank window
- [x] FR-400..402 scoreboard, history, timer with pause (amber under 5 min, red under 1 min)
- [~] FR-402 beep or vibration at zero: beep only when Sound is on; no vibration at zero
- [~] FR-403 wake lock requested while a game is active (not testable in headless Chromium)
### End
- [x] FR-500..502 target, time and manual end
- [x] FR-503 final dashboard with ties
- [x] FR-504, FR-505 forget or archive, pending state survives a restart
### Archive
- [x] FR-600 review with awards and a style per player
- [x] FR-601..603 list, search, player and date filter, detail, rename, delete
- [x] FR-604, FR-707 share image, place label off by default
- [ ] FR-605 cross-game player statistics (could)
### Platform
- [x] FR-700, FR-701 persistence, persistent storage requested
- [x] FR-702 export and import with preview, never overwrites
- [x] FR-704 installable, offline after the first load
- [~] FR-705 responsive: single column up to 560 px, centred above; the two-pane desktop layout is not built
- [x] FR-706 accessibility (axe clean; touch targets 48 px)
- [x] FR-800..802 storage error banner with retry and export, error boundary

## Change round 2 (owner requests)
- Turn screen: Manual entry is the default view, Quick picks is the secondary view (toggle, remembered until the app closes).
- Dice picker removed completely (code, strings, tests). Manual entry keeps the calculator keypad without +50 / +100.
- No separate Roll again button; the Bank button shows why it is disabled.
- Fit to screen: all primary screens fit iPhone Chrome viewports without scrolling (375x540 up to 430x780), checked by `tests/e2e/fit.spec.ts`. New game is now two steps. On the smallest phones controls are 44 px (the spec's 48 px minimum applies from about 700 px height).
- Trade-off to know: in Manual entry the dice count is optional. When it is left as "?", the app cannot enforce the "2 or fewer dice left" bank rule for that step (it treats the bank window as open).

## Deviations from the design package (all deliberate)
- **Styling:** plain CSS with variables (`src/styles.css`) instead of Tailwind. No ESLint or Prettier yet.
- **RuleSet:** `endMode` and `targetScore` are not in `RuleSet`. The game's `endCondition` is the single source. Added `manualMax` and `bankRestriction` (replaces `twoDiceRule`).
- **Share image:** drawn on a canvas instead of `html-to-image` (one dependency fewer).
- **Review text:** the review stores locale-free data (style keys, variant numbers, parameters); wording is rendered from the i18n files, so switching language also changes old reviews. Template variants are chosen by a seeded hash of the game id.
- **Rules editor:** the per-face table for "Table" mode is not editable in the prototype. Custom presets can be saved and selected when creating a game; there is no separate preset manager.
- **Location:** captured in the background after the game starts so a pending permission prompt never blocks play. Coordinates are stored, never shown or shared.
- **Undo:** after a bank or bust the hand-over screen offers "Undo last turn", which restores the turn's steps. Forced hot-dice markers on manual steps are not restored.
- **Summary text:** the review summary avoids number agreement ("Rounds: 3, time: 54 min") instead of full plural templates. Other counts use `{n:one|few|other}` plural forms.

## Open items and ideas
- Coverage measurement for engine and review (target 95 %).
- Two-pane layouts for tablet and desktop (FR-705).
- Cross-game player statistics page (FR-605).
- Replace the mock icon with a designed logo.
- Run Lighthouse and the e2e suite in CI on every pull request (workflow added, not yet run on GitHub).

## Decisions log
- Classic preset: min bank 300 every turn, straight 1500, doubling for 4/5/6 of a kind, bank any time.
- `nOfKindMode`: `multiplier` (triple x (dice - 2), the house default), `doubling`, `table`, `off` (extras score as singles for 1s and 5s only).
- Bank window default `atMostTwoOrHot`: bank with 2 or fewer dice left (1 die allowed) or after hot dice.
- Brand: blue primary, gray secondary, light gray and white backgrounds, black or white text. No custom domain for now.
- GitHub Pages deploy is a manual workflow (`deploy.yml`) until the app goes public.

## Bug found and fixed in change round 2
- Fast double taps could lose a step: store actions read the game, then wrote it back asynchronously. Actions now run one after another (`serial` queue in `src/state/gameStore.ts`), covered by `tests/unit/store.test.ts`.
