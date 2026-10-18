import { db } from './db';
import { parseBackup, SCHEMA_VERSION } from './backup';
import type { Game, Turn } from './types';

/** A shareable bundle is the normal backup file format holding one game (see docs/proposals/shared-archive.md). */
export interface GameBundle {
  app: 'farkle-scorekeeper';
  schemaVersion: number;
  bundleKind: 'game';
  exportedAt: number;
  exportedBy?: string;
  compact: boolean;
  games: Game[];
  turns: Turn[];
  players: unknown[];
  presets: unknown[];
}

export const MAX_DECODED_BYTES = 200_000;
export const MAX_PAYLOAD_CHARS = 60_000;
export const MAX_GAMES_PER_FILE = 100;
const MAX_TEXT = 100;

export interface BuildOptions {
  /** Include the place name. Coordinates are never included. */
  includePlace: boolean;
  /** Drop the per-step detail of turns (much smaller; the review is kept). */
  compact: boolean;
  deviceId?: string;
}

export function buildBundle(game: Game, turns: Turn[], opts: BuildOptions, now = Date.now()): GameBundle {
  const shared: Game = {
    ...game,
    activeTurn: undefined,
    timer: undefined,
    location: undefined,
    origin: undefined,
    placeLabel: opts.includePlace ? game.placeLabel : undefined
  };
  return {
    app: 'farkle-scorekeeper',
    schemaVersion: SCHEMA_VERSION,
    bundleKind: 'game',
    exportedAt: now,
    exportedBy: opts.deviceId,
    compact: opts.compact,
    games: [shared],
    // compact: no step details, and ids/timestamps that compress well (random uuids would not)
    turns: turns.map((t) => (opts.compact ? { ...t, id: `${t.gameId}-${t.index}`, steps: [], startedAt: t.endedAt } : t)),
    players: [],
    presets: []
  };
}

// ---- link payload: 'z' + base64url(deflate-raw(JSON)), or 'j' + base64url(JSON) without CompressionStream ----

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (s: string): Uint8Array => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const compressionSupported = (): boolean => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function encodePayload(bundle: GameBundle): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  if (!compressionSupported()) return 'j' + toBase64Url(bytes);
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  const out = new Uint8Array(await new Response(cs.readable).arrayBuffer());
  return 'z' + toBase64Url(out);
}

export type DecodeError = 'too-large' | 'bad-format' | 'unsupported';

/** Returns the JSON text of the bundle, or an error. Inflating stops at MAX_DECODED_BYTES (zip-bomb guard). */
export async function decodePayload(payload: string): Promise<{ ok: true; text: string } | { ok: false; error: DecodeError }> {
  if (payload.length < 2 || payload.length > MAX_PAYLOAD_CHARS || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    return { ok: false, error: payload.length > MAX_PAYLOAD_CHARS ? 'too-large' : 'bad-format' };
  }
  try {
    const kind = payload[0];
    const raw = fromBase64Url(payload.slice(1));
    if (kind === 'j') {
      if (raw.length > MAX_DECODED_BYTES) return { ok: false, error: 'too-large' };
      return { ok: true, text: new TextDecoder().decode(raw) };
    }
    if (kind !== 'z') return { ok: false, error: 'bad-format' };
    if (!compressionSupported()) return { ok: false, error: 'unsupported' };
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(raw as BufferSource).catch(() => undefined);
    writer.close().catch(() => undefined);
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_DECODED_BYTES) {
        await reader.cancel();
        return { ok: false, error: 'too-large' };
      }
      chunks.push(value);
    }
    const all = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      all.set(c, off);
      off += c.length;
    }
    return { ok: true, text: new TextDecoder().decode(all) };
  } catch {
    return { ok: false, error: 'bad-format' };
  }
}

/** The part after `#/import/` of a pasted link (or the bare payload). */
export function payloadFromLink(input: string): string {
  const m = input.trim().match(/#\/import\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : input.trim();
}

export function linkFor(payload: string, base = location.origin + location.pathname): string {
  return `${base}#/import/${payload}`;
}

// ---- inspecting and importing ----

export interface GameSummary {
  id: string;
  name: string;
  createdAt: number;
  players: string[];
  winner?: string;
  turns: number;
  placeLabel?: string;
}

export interface BundlePreview {
  ok: boolean;
  error?: 'not-json' | 'bad-format' | 'empty';
  fresh: GameSummary[];
  existing: number;
  invalid: number;
}

const clip = (s: unknown, n = MAX_TEXT): string => (typeof s === 'string' ? s.slice(0, n) : '');

function validGame(g: unknown): g is Game {
  const x = g as Game;
  return (
    typeof x?.id === 'string' &&
    x.id.length <= 64 &&
    x.status === 'archived' &&
    typeof x.name === 'string' &&
    typeof x.createdAt === 'number' &&
    Array.isArray(x.players) &&
    x.players.length >= 2 &&
    x.players.length <= 8 &&
    x.players.every((p) => typeof p?.playerId === 'string' && typeof p?.name === 'string') &&
    !!x.rules &&
    !!x.endCondition &&
    !!x.result &&
    Array.isArray(x.result.ranking) &&
    !!x.review &&
    typeof x.review.stats === 'object'
  );
}

/** Cleans a game that comes from another device: no coordinates, bounded text, no leftovers of a running game. */
function sanitize(g: Game, exportedBy: string | undefined, now: number): Game {
  return {
    ...g,
    name: clip(g.name, 60),
    placeLabel: g.placeLabel ? clip(g.placeLabel, 40) : undefined,
    players: g.players.map((p) => ({ ...p, name: clip(p.name, 24), colour: clip(p.colour, 16) })),
    location: undefined,
    activeTurn: undefined,
    timer: undefined,
    origin: { deviceId: clip(exportedBy ?? 'unknown', 64), importedAt: now }
  };
}

async function parse(text: string) {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: 'not-json' as const };
  }
  const b = parseBackup(json);
  if (!b) return { error: 'bad-format' as const };
  if (b.games.length === 0) return { error: 'empty' as const };
  const existingIds = new Set((await db.games.toCollection().primaryKeys()) as string[]);
  const fresh: Game[] = [];
  let existing = 0;
  let invalid = 0;
  for (const g of b.games.slice(0, MAX_GAMES_PER_FILE)) {
    if (!validGame(g)) invalid++;
    else if (existingIds.has(g.id)) existing++;
    else fresh.push(g);
  }
  invalid += Math.max(0, b.games.length - MAX_GAMES_PER_FILE);
  const exportedBy = typeof (b as unknown as GameBundle).exportedBy === 'string' ? (b as unknown as GameBundle).exportedBy : undefined;
  return { fresh, existing, invalid, turns: b.turns as Turn[], exportedBy };
}

const summarize = (g: Game, turns: Turn[]): GameSummary => ({
  id: g.id,
  name: clip(g.name, 60),
  createdAt: g.createdAt,
  players: g.players.map((p) => clip(p.name, 24)),
  winner: g.players.find((p) => p.playerId === g.result?.winnerIds[0])?.name,
  turns: turns.filter((t) => t.gameId === g.id).length,
  placeLabel: g.placeLabel ? clip(g.placeLabel, 40) : undefined
});

/** Reads a bundle or backup without changing anything. */
export async function inspectBundle(text: string): Promise<BundlePreview> {
  const p = await parse(text);
  if ('error' in p) return { ok: false, error: p.error, fresh: [], existing: 0, invalid: 0 };
  return { ok: true, fresh: p.fresh.map((g) => summarize(g, p.turns)), existing: p.existing, invalid: p.invalid };
}

/** Adds the games that are not in the archive yet. Never overwrites or deletes. Returns the ids that were added. */
export async function importBundle(text: string, now = Date.now()): Promise<string[]> {
  const p = await parse(text);
  if ('error' in p) return [];
  const games = p.fresh.map((g) => sanitize(g, p.exportedBy, now));
  const ids = new Set(games.map((g) => g.id));
  const turns = p.turns.filter((t) => ids.has(t?.gameId)).slice(0, 20000);
  await db.transaction('rw', [db.games, db.turns], async () => {
    await db.games.bulkAdd(games);
    await db.turns.bulkPut(turns);
  });
  return games.map((g) => g.id);
}
