# Proposal: a shared game archive across devices

Status: **draft for review, nothing is implemented.** Decision needed from the owner (section 9).

## 1. The problem
The archive lives in IndexedDB inside one browser on one device. Anything that changes the browser profile or the address of the app gives a separate, empty archive:
- a second player's phone (the usual case: one person scores, the others never get the game),
- the same phone in another browser (Safari vs Chrome) or in the installed app vs a tab,
- the same app served from another address (for example tiiny.host vs github.io).

Players who play together regularly therefore each see a different archive and different player statistics.

## 2. Goals and non-goals
Goals
1. After a game, every player can get it into their own archive with very little effort.
2. The same game is never duplicated, even if imported twice or from two people.
3. Player statistics become the same on every device that has the same games.
4. Keep the product promises where possible: works offline, no accounts, no tracking, data not readable by us or a host.

Non-goals (this proposal): live multi-device scoring (several phones scoring one game at once), cross-group leaderboards, editing an archived game on two devices at the same time.

## 3. What already helps
- Games have a random UUID (`Game.id`), and archived games are effectively immutable, so merging by id is safe and conflict-free.
- A backup file format with preview and merge-by-id import already exists (`src/storage/backup.ts`).
- Cross-game statistics already match players by name, not by device-local id.

## 4. Options considered
| | A. Share a game (link, file, QR) | B. Cloud group archive, end-to-end encrypted | C. Device-to-device sync (WebRTC) | D. Shared cloud file (Drive, iCloud) |
|---|---|---|---|---|
| Needs a server | No | Yes, small | Signalling only | No (third party) |
| Accounts | None | None (capability link) | None | Provider account |
| Automatic | No, one tap per game | Yes | Only while both are online | Partly |
| Works offline | Yes | Yes, syncs later | No | Mostly |
| Privacy | Data travels only to chosen people | Server sees ciphertext only | Direct | Provider can read |
| Breaks a product rule | No | Yes: "no server" (needs an opt-in exception) | Mostly no | Yes (third party), poor iOS support |
| Effort | Small to medium | Medium to large, plus running a service | Large, fragile | Medium, unreliable on iPhone |

Rejected: C (needs both devices online and a pairing step each time, fragile on mobile networks) and D (the browser file-system API is missing on iPhone, and providers add accounts and privacy questions).

## 5. Recommendation
**Phase 1 (recommended now): option A, "Send to players".** It solves the real situation (one scorekeeper, several players) with no server, so every existing promise stays true.
**Phase 2 (optional, later): option B as an opt-in "Group archive"**, only if players want automatic sync. It builds on Phase 1 (same bundle format), so Phase 1 is not throw-away work.

## 6. Phase 1 design: share and import a game
### 6.1 User flow
Sender (usually the scorekeeper)
1. Archive the game, or open it from the Archive. A prompt after archiving offers **Send to players**.
2. Choose how: **Share link** (system share sheet, works with any messenger), **Share file** (`.dwf` / JSON), or **Show QR** (small games).
3. Options: include the place name (default off), include exact location (never; coordinates are always stripped).

Receiver
1. Opens the link or file. The app shows a preview: game name, date, players, winner, "N turns".
2. Buttons: **Add to my archive** or **Cancel**. If the game id is already in the archive: "Already in your archive", nothing changes.
3. The game appears in the Archive and in player statistics straight away.

Also: Archive screen gets **Import** (file or pasted link) for people who receive a file instead of a link.

### 6.2 Link format
`https://<app>/#/import/<payload>` where `payload = base64url(deflate(JSON bundle))`.
- It sits after `#`, so it is never sent to a server or logged by the host.
- Uses `CompressionStream` (Chrome and Safari 16.4 and newer); older browsers get the file option.
- Size estimate: an 11-round, 4-player game is about 10 KB of JSON; with the step details stripped about 3 KB, about 1.5 KB compressed and 2 KB as base64url. An 8-player, 20-round game stays under about 6 KB. Both fit in a message and the small ones in a QR code.

### 6.3 Bundle format
Reuse the existing backup schema with one game (`schemaVersion` 1 or 2), so one importer handles both. Additions:
- `bundleKind: 'game'`, `exportedBy` (random device id, no personal data), `exportedAt`.
- Option `compact: true`: turns keep result, total, scores and round but drop `steps`. The review (styles, awards, stats) is already stored in the game, so nothing visible is lost except the per-step detail in the log.
- Validation by the existing structural check; unknown fields are ignored; reject unknown future `schemaVersion` with a clear message.

### 6.4 Merge rules
- Key: `Game.id`. Present, so skip; absent, so add (never overwrite, as today).
- Imported games are marked `origin: { deviceId, importedAt }` for a small "shared by a friend" label and for support.
- Renaming or deleting an imported game is local only (documented in the UI).
- Same game recorded by two scorekeepers with different ids is a real duplicate. Phase 1 offers a manual **Merge duplicates** hint: games within 4 hours with the same player set are flagged ("Looks like the same game") and the user can delete one. No automatic merging.

### 6.5 Players across devices
Statistics already match by name (case-insensitive). Proposed small additions:
- Settings > "Player names": rename or merge names (for example "Tom" and "Tomas") applied at display and statistics time through an alias table, not by rewriting games.
- Out of scope: accounts or verified identities.

### 6.6 Privacy and safety
- Coordinates are stripped from every shared bundle; the place name is opt-in per share.
- Imports are validated and size-limited (for example 200 KB decoded); no HTML is ever rendered from imported text (React escapes it).
- The link contains game data. The share dialog says so: "Anyone with this link can read this game."

### 6.7 Work breakdown (Phase 1)
| Task | Size |
|---|---|
| Bundle encode/decode (`src/storage/bundle.ts`): deflate, base64url, compact mode, limits | S |
| Single-game export/import in `backup.ts` with preview report (new, already here, invalid) | S |
| Route `#/import/<payload>` and import preview screen | S |
| Send dialog: link, file, QR (small QR library or generator) | M |
| Prompt after archiving; Import entry on Archive | S |
| Duplicate-hint (same players within 4 h) | S |
| Name aliases in statistics | S to M |
| i18n cs/en, accessibility, fit-to-screen on the new screens | S |
| Tests: bundle round trip, size limits, duplicate import, malicious payloads; e2e: send on device A, import on device B (two browser contexts) | M |

Acceptance: a game archived in context A is imported in context B via link and via file; importing again changes nothing; statistics in A and B match; no screen needs scrolling on the iPhone viewports; location never appears in a bundle.

## 7. Phase 2 sketch: opt-in Group archive (only if wanted)
- A group is created on one device (name, random 128-bit `groupId`, random 256-bit key `K`). The **invite link** is `#/join/<groupId>.<K>`; `K` stays in the fragment.
- Archived games are encrypted in the browser (AES-GCM with `K`) and stored as opaque blobs keyed by `groupId/gameId`. The server (for example a Cloudflare Worker with KV or D1, or Supabase) sees only ciphertext, sizes and timestamps.
- Sync on app start and after archiving: list blobs newer than the last sync, download, decrypt, merge by id (same rules as 6.4). Deletes are tombstones; renames use last-writer-wins by `updatedAt`.
- Access control by possession of `groupId` plus a write token; rate limits and size caps on the server; no accounts, no analytics.
- Cost: free tiers cover a friend group; needs a privacy note and a retention rule (for example delete after 12 months idle).
- It requires amending the project rule "no server" to "no server unless the player opts in", and a short privacy statement. The app must keep working fully without it.

## 8. Risks and open points
- Receivers have to tap a link: mitigate with the post-archive prompt and QR for in-person sharing.
- Very old browsers lack `CompressionStream`: file sharing is the fallback.
- Different scorekeepers recording the same game give two ids: duplicate hint (6.4) instead of risky auto-merge.
- Name collisions between different people called the same: aliases help; real fix needs identities (non-goal).
- Phase 2 adds an operated service (uptime, abuse, cost): only start it after Phase 1 proves the need.

## 9. Decisions needed
1. Approve Phase 1 (share link, file and QR; merge by id; stripped location)? **Recommended: yes.**
2. Should the place name be included by default when sharing? Recommended: no (opt-in).
3. Do you want Phase 2 (automatic group sync) planned now, or only after Phase 1 is in use? Recommended: later.
4. If Phase 2: which host do you prefer (Cloudflare, Supabase, or another), and are you comfortable with an opt-in exception to the "no server" rule?
