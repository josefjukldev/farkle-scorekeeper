# 01 — Product Overview

## 1. Purpose
Give Farkle players a fast, simple tool to set up a game, record every throw result turn by turn, see live standings, finish the game by target score or time limit, and keep a reviewable archive with a fun, shareable summary.

## 2. Problem and context
Players currently note scores on a piece of cardboard: per-throw tallies, a minimum turn total before banking (350 on the original note), and a set of combination values (1 = 100, 5 = 50, three of a kind = face x 100, three 1s = 1000, four 1s = 2000, straight = 1000). Paper is error-prone (adding up), slow, and loses history. The app removes arithmetic, enforces rules and preserves results.

## 3. Target users
- **Host / scorekeeper:** one person holds the phone, creates the game and records everyone's results (primary).
- **Players:** pass the phone or watch the screen; want clear "your score now / what you need" information.
- Typical group: 2 to 6 people at a table, possibly in a pub or at home with poor connectivity.

## 4. Scope
### In scope (v1)
- Game creation, players, end condition (target points or countdown).
- Turn-by-turn result recording with quick picks, dice-face picker and manual entry.
- Farkle rules enforcement (configurable).
- Live scoreboard, final ranking dashboard.
- Forget vs. archive decision at the end.
- Archive list and detail with review, player style assessment, shareable image.
- Optional location capture, local persistence, offline use, installable PWA, cs/en UI.
- JSON export/import of the archive (backup).

### Out of scope (v1)
- Networked multiplayer, accounts, cloud sync, leaderboards across devices.
- Dice recognition by camera, virtual dice rolling.
- Monetisation, ads, push notifications.

## 5. Glossary
| Term | Meaning |
|------|---------|
| Throw / roll | One physical roll of the remaining dice |
| Step | One recorded scoring set-aside within a turn (a throw that scored) |
| Turn | All steps by one player until they bank or bust |
| Turn total | Unbanked points collected in the current turn |
| Bank | End the turn voluntarily and add the turn total to the game score |
| Bust (Farkle) | A throw with no scoring dice; turn total is lost |
| Hot dice | All six dice have scored; the player may take all six again |
| Round | One turn for each player in seating order |
| Final round | Last set of turns triggered when a player reaches the target |
| Preset | A named, saved rule set |

## 6. Assumptions and open questions (defaults are implemented unless changed)
| # | Topic | Default in v1 | Exposed as setting |
|---|-------|---------------|--------------------|
| A1 | Straight 1-2-3-4-5-6 value | 1000 (per note) | Yes |
| A2 | Four of a kind | **Confirmed by owner:** triple value x 2 (4x2 = 3x2 x 2 = 400) | Yes (multiplier / doubling / table / off) |
| A3 | Five and six of a kind | **Confirmed:** linear multiplier, triple x 3 for five, x 4 for six (5x2 = 600). Classic preset uses doubling instead | Yes |
| A4 | "2 kostky end" on the note | **Confirmed meaning:** a player may end the turn (bank) only when exactly 2 unscored dice are left, or after hot dice (all 6 scored). They may always keep throwing instead; a throw with no score is a bust. Default **on** in House rules, **off** in Classic. See `bankRestriction` in `03`. Open: is banking with 1 die left allowed? Default no, variant `atMostTwoOrHot` | Yes |
| A5 | Minimum to bank | 350 every turn | Yes (plus optional higher first-entry minimum, default off) |
| A6 | Target-mode finish | Triggering player ends their turn, everyone else gets one final turn, highest total wins | Yes (final round on/off) |
| A7 | Time-mode finish | When the countdown reaches zero the current turn may be completed, then the game ends | Yes (finish current turn / stop immediately) |
| A8 | Default target | 10 000 points | Yes |
| A9 | Three busts in a row penalty | Off | Yes (off / -500 on third) |
| A10 | Ties | Shared rank (same position), shown as "1st (tie)" | No |

## 7. Success criteria
- A new user can start a 4-player game in under 30 seconds.
- Recording a typical turn takes 3 taps or fewer for the common cases.
- No data lost after killing the browser mid-game (verified by E2E test).
- Works fully offline after first load.
- All rule calculations match the examples in `03_game_rules_engine.md` section 9.
