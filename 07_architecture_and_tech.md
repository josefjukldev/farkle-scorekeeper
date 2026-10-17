# 07 — Architecture and Technology

## 1. Stack
| Concern | Choice |
|---------|--------|
| Language | TypeScript (strict) |
| UI | React 18 + Vite |
| Styling | Tailwind CSS (mobile first), CSS variables for themes |
| State | Zustand (UI + active game); engine is pure |
| Storage | Dexie (IndexedDB) |
| PWA | vite-plugin-pwa (Workbox, `generateSW`, precache all) |
| Routing | React Router (hash router for static hosting) |
| i18n | i18next + react-i18next (`cs`, `en`) |
| Validation | Zod (rule sets, import files) |
| Share image | html-to-image |
| Charts | recharts or custom SVG |
| Tests | Vitest + Testing Library, fake-indexeddb, Playwright (mobile viewport) |
| Lint/format | ESLint, Prettier, TypeScript strict |

## 2. Folder structure
```
src/
  engine/               pure logic (no imports from react/dexie)
    types.ts  presets.ts  score.ts  turn.ts  game.ts  ranking.ts  quickPicks.ts  validate.ts
  review/               stats.ts  style.ts  awards.ts  texts.ts  thresholds.ts
  storage/              db.ts  repo.ts  migrations.ts  backup.ts
  state/                gameStore.ts  settingsStore.ts
  ui/
    components/         Button, Sheet, Stepper, Keypad, PlayerBadge, ScoreBar, Timer ...
    screens/            Home, NewGame, RulesEditor, HandOver, TurnEntry, TurnConfirm,
                        Scoreboard, FinalResults, ArchiveList, GameDetail, ShareDialog, Settings
    share/              ShareCard.tsx  renderImage.ts
  i18n/                 cs.json  en.json  index.ts
  platform/             geolocation.ts  wakeLock.ts  haptics.ts  share.ts
  app/                  App.tsx  routes.tsx  ErrorBoundary.tsx
tests/                  unit/  component/  e2e/  fixtures/
docs/                   progress.md
public/                 icons, manifest assets
```

## 3. Key architectural rules
- **Engine is a reducer:** `reduceTurn(state, event, rules)` and `reduceGame(state, event, rules)` return new state or an error result; no throwing for expected rule violations.
- **Store ↔ storage:** the Zustand store calls the engine, then persists via repo (`await save`) before updating the visible state; on failure the previous state is restored and an error toast appears (FR-800).
- **Derived data** (ranking, stats, review) is computed by pure functions from turns.
- **Time:** inject a `clock` interface (`now(): number`) so timer logic is testable.
- **No global singletons** in the engine; everything passed as parameters.

## 4. Platform features and fallbacks
| Feature | API | Fallback |
|---------|-----|----------|
| Location | `navigator.geolocation` (user-gesture, once) | Manual place label; silently skip on denial |
| Share | Web Share API level 2 (files) | Download PNG + copy |
| Keep awake | Screen Wake Lock | Ignore if unsupported |
| Haptics | `navigator.vibrate` | Ignore |
| Persistent storage | `navigator.storage.persist` | Notice + backup reminder |
| Install | `beforeinstallprompt` + iOS instructions | In-app hint |

## 5. PWA requirements
- Manifest: name, short_name "Farkle", `display: standalone`, theme/background colours, icons 192/512 + maskable, `lang`.
- Service worker precaches the app shell; the app has no runtime network dependency.
- Update strategy: prompt "New version available – reload" (`registerType: 'prompt'`); never reload during an active turn.
- iOS: `apple-touch-icon`, `viewport-fit=cover`, status-bar meta.

## 6. Performance and quality targets
- First load under 200 KB gzipped JS (excluding charts, lazy-loaded).
- Interaction latency under 100 ms for any tap on S5.
- Lighthouse (mobile): Performance ≥ 90, Accessibility ≥ 90, PWA installable.

## 7. Security and privacy
No backend, no third-party scripts, no tracking. CSP `default-src 'self'`; `img-src 'self' data: blob:`. Sanitise all user text (React escapes by default). Location and data never leave the device except through an explicit share/export action by the user.

## 8. Build, run, deploy
```
npm create vite@latest farkle-scorekeeper -- --template react-ts
npm i dexie dexie-react-hooks zustand react-router-dom i18next react-i18next zod html-to-image recharts
npm i -D tailwindcss postcss autoprefixer vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom fake-indexeddb @playwright/test eslint prettier
```
Scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`.
Deploy as static files (GitHub Pages, Netlify, Cloudflare Pages, or any web server) over HTTPS (required for PWA, geolocation, share).
