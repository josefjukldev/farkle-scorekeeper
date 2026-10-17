# 09 — Design Brief

Input for the visual and interaction design phase. Behaviour is defined in `02`, `03` and `05`; this file fixes the visual language and what to design first.

## 1. Product feel
Friendly tabletop companion: warm, a little playful, but dead clear. Used one-handed, in a dim pub, passed between people. Numbers are the hero.

## 2. Design tokens (proposal)
| Token | Light | Dark |
|-------|-------|------|
| Background | #FBF7F0 (paper) | #14171C |
| Surface | #FFFFFF | #1E232B |
| Text | #1B1F24 | #F2F4F7 |
| Accent / primary action (Bank) | #1F8A5B | #3DBE87 |
| Danger (Bust) | #C8372D | #FF6B5E |
| Warning (timer < 5 min) | #B7791F | #F2B84B |
| Hot dice highlight | #E8A317 | #FFC94D |

Player palette (8, colour-blind safe, each paired with an initial and a shape): blue, orange, teal, magenta, yellow, violet, red-brown, grey.
- Typography: system UI stack for the app; tabular numerals for all scores. Scale: score 56/40, player name 32, body 16, caption 13. Czech needs the longer strings tested (e.g. "Všechny kostky bodují").
- Spacing 4 px grid; radius 16 for cards and sheets, 12 for buttons; touch target at least 48 px, primary actions 64 px tall.
- Motion: 150 ms ease for sheets, a number count-up on bank, none when `prefers-reduced-motion`.
- Icons: simple outline set with six die-face glyphs for the dice picker.

## 3. Design priorities (order)
1. **S5 Turn Entry**: the core screen; thumb zone layout, quick-pick grid, Bust / Roll again / Bank bar.
2. **S4 Hand-over** and **S6 Turn Confirm**.
3. **S8 Final Results** (podium) and **S11 Share image** (the most shared artefact).
4. S2 New Game, S1 Home, S7 Scoreboard/History.
5. S9/S10 Archive, S12 Settings, S3 Rules Editor.

## 4. Components to define
Button (primary / danger / quiet), QuickPickButton (label + points), DiceFace and DiceRow (6 pips, used/remaining), Stepper, Keypad, Bottom sheet, PlayerBadge (colour + initial + shape), ScoreBar (progress to target), Timer (normal / amber / red / paused), Banner (hot dice, final round, time up), Toast, Dialog (destructive variant), RankRow, Podium, AwardCard, StyleBadge.

## 5. States to cover for each key screen
Empty, normal, minimum-not-reached (Bank disabled with "150 missing"), hot dice, final round, time-up banner, long names (24 chars), 8 players, Czech strings, dark mode, 360x640 and landscape phone, 560 px column, two-pane desktop.

## 6. Share image (1080x1350)
Podium for top 3, ranking list up to 8, up to 3 awards, style icon per player, footer line. Two themes: follows app theme, and a fixed colourful one. No coordinates; place label only when toggled.

## 7. Deliverables of the design phase
Token file (CSS variables), annotated mockups for the screens in section 3 in light and dark, component sheet with states, share-image template, copy deck cs/en for the visible strings (`05` section 9).

## 8. Open questions for the owner
1. A4 "2 kostky end" on the paper note: what does it mean? (Currently an optional off-by-default rule.)
2. Confirm the guessed values on the note: three 4s, three 5s, five and six 1s, n-of-a-kind doubling.
3. App name and logo, and any preferred colour or mood.
4. Hosting target (GitHub Pages, Netlify or Cloudflare Pages) and whether the app is public.
