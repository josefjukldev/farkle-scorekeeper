# 05 — UX: Screens and Flows

## 1. Design principles
- **One-handed, glanceable.** Big score numbers, big buttons at the bottom third of the screen.
- **Table-friendly.** High contrast, dark mode, readable from 1 m (player name and score at least 32 px).
- **Few taps.** Common outcomes are one tap; mistakes are one tap to undo.
- **Hand-over clarity.** A dedicated "pass the phone" state prevents mis-attributed scores.
- Visual style: friendly, tabletop feel; each player has a colour used consistently in all screens.

## 2. Screen inventory
| ID | Screen | Purpose |
|----|--------|---------|
| S1 | Home | Start / resume / archive / settings |
| S2 | New Game | Name, players, end condition, rules, location |
| S3 | Rules Editor | Edit/save a rule set |
| S4 | Hand-over | "Next: <player>" with score and Start turn |
| S5 | Turn Entry | Record throw results; bank / bust |
| S6 | Turn Confirm | Summary before passing the phone |
| S7 | Scoreboard / History (tabs, bottom sheet on S5) | Live standings, log, edit |
| S8 | Final Results | Ranking dashboard, forget / archive |
| S9 | Archive List | Past games with search/filter |
| S10 | Game Detail | Dashboard, review, stats, log, chart, share |
| S11 | Share Dialog | Preview and share the image |
| S12 | Settings | Language, theme, backup, reset |
| S13 | Player Stats (could) | Cross-game stats |

## 3. Navigation
Bottom bar on Home/Archive/Settings (3 items). During a game, the bottom bar is replaced by the game controls; a top-left menu offers "Pause", "End game now", "Rules", "Exit to Home (game keeps running)".

## 4. Main flow
```
Home ──New game──► S2 New Game ──Start──► S4 Hand-over ──Start turn──► S5 Turn Entry
                                                    ▲                     │ add steps / roll again
                                                    │                     ├─Bank─► S6 Confirm ─► next player S4
                                                    │                     └─Bust─► S6 Confirm ─► next player S4
                                                    └──────────────────────────────────────────────┘
End condition met / manual end ──► S8 Final Results ──► Archive ──► S10 (review + share)
                                                  └──► Forget ──► confirm ──► Home
```

## 5. Wireframes (text)

### S1 Home
```
┌───────────────────────────┐
│ Dices with Friends   ⚙    │
│                           │
│ ▶ Resume: "Friday night"  │  ← only if unfinished
│   4 players · Round 3     │
│                           │
│ [   + New game          ] │
│                           │
│ Recent games              │
│ ┌ Friday night  ★ Jana ┐  │
│ └ 12 Oct · Altea ──────┘  │
│  ...                      │
│ [Home] [Archive] [Settings]│
└───────────────────────────┘
```

### S2 New Game
```
Game name        [ Farkle – 18 Oct 2026 ]
Players (4)      ⠿ [Pavel   ] ●  ✕
                 ⠿ [Jana    ] ●  ✕
                 [+ Add player]  recent: (Tom)(Eva)
                 [Shuffle order]
End condition    (•) Target score  [10 000 ▾]
                 ( ) Time limit    [30 min ▾]
Rules            [House rules (note) ▾]  [Edit]
Location         [x] Save location  (Altea) [edit label]
                 [        Start game        ]
```

### S5 Turn Entry (core)
```
┌───────────────────────────────┐
│ ● Pavel          Round 3   ≡  │
│ Score 2 350   · to target 7 650│
│ ⏱ 18:42 (time mode)           │
├───────────────────────────────┤
│ Turn total        450         │  big
│ Dice left: 3   [●●● ○○○]      │
│ Bank needs 350 ✓ · 2 dice ✓   │
├───────────────────────────────┤
│ Steps: 100 · 50 · 300  (undo) │
├───────────────────────────────┤
│ Quick picks                   │
│ [1 +100][5 +50][1+5 +150]     │
│ [2×1 +200][2×5 +100]          │
│ [3×2][3×3][3×4][3×5][3×6][3×1]│
│ [4×1 +2000][Straight +1000]   │
│ [Dice picker] [Manual…]       │
├───────────────────────────────┤
│ [ BUST ]  [ ROLL AGAIN ] [BANK]│
└───────────────────────────────┘
```
Behaviour: tapping a quick pick adds a step immediately (with haptic tick); "Roll again" is only a visual confirmation that the player continues, and is enabled after at least one step; Bank is disabled/greyed with a hint if below the minimum or if the bank window is closed ("Bank needs 2 dice left or hot dice"). After hot dice the bar shows [BANK] and [THROW ALL 6].

### Dice picker (bottom sheet)
Six rows (faces 1–6), each with `−  n  +` stepper and the live computed points; footer shows "Dice used 4/6 · +350", invalid selections show a red reason ("Die 2 does not score"), and an "Add" button.

### Manual entry (bottom sheet)
Numeric keypad, quick increments (+50, +100), checks multiples of 50, optional "dice used" selector (unknown default).

### S6 Turn Confirm
```
Pavel banks +450
2 350 → 2 800
Next up: Jana (1 900)
[ Back ]      [ Confirm & pass ]
```
Bust variant: "Pavel busts – 0 points" (shows lost turn total in grey).

### S4 Hand-over
```
        Next player
          ● JANA
   Score 1 900   (8 100 to go)
   Needs 350 to bank
      [  Start turn  ]
```

### S8 Final Results
```
🏆 Game over — "Friday night"
 2nd  Pavel 10 250     1st  JANA 10 600     3rd  Tom 8 900
 ──────────────────────────────────────────
 1  Jana   10 600  · 11 turns · 2 busts · best 1 500
 2  Pavel  10 250  · ...
 3  Tom     8 900  · ...
 4  Eva     6 150  · ...
 [  Archive game  ]   [ Forget game ]
```

### S10 Game Detail
Tabs: **Overview** (ranking + awards + headline), **Players** (style labels, stats, feedback), **Log** (turns), **Chart** (score progress). Buttons: Share, Rename, Delete.

## 6. Interaction details
- Haptics: short tick on step added, double pulse on bust, success pattern on bank (if enabled).
- Sounds: optional, off by default.
- Bust button requires no confirmation on S5 (the confirmation is the S6 summary).
- Time-mode: when the timer ends during a turn, a non-blocking banner explains the finish rule.
- Undo: visible icon next to the steps list; after bank/bust, S6 "Back" returns to S5 with the turn restored.
- Empty states: Archive empty ("No archived games yet – finish a game and archive it").
- Loading is instantaneous (local data); no spinners except image generation.

## 7. Responsive rules
| Width | Layout |
|-------|--------|
| < 480 px | Single column, bottom action bar, bottom sheets |
| 480–900 px | Centred column max 560 px |
| > 900 px | Two panes on S5 (entry left, scoreboard right) and on S10 (list left, detail right) |
Safe-area insets respected (notch). Landscape on phones: scoreboard collapses into a top strip, quick picks in two columns.

## 8. Accessibility
- All buttons have text labels or `aria-label`; sheets trap focus; Esc closes.
- Colour palette tested for contrast; player colours are paired with a shape/initial.
- Respect `prefers-reduced-motion` and system font scaling.
- Screen reader announces "Pavel, turn total 450, 3 dice left".

## 9. Copy / i18n
All strings in `src/i18n/{cs,en}.json`. Czech first-class (e.g. Bust = "Propadlo", Bank = "Zapsat", Roll again = "Hodit znovu", Straight = "Postupka", Hot dice = "Všechny kostky bodují"). Number formatting via `Intl.NumberFormat` (thin space as thousands separator in cs).
