// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FarkleDb, useDatabase } from '../../src/storage/db';
import * as repo from '../../src/storage/repo';
import {
  buildBundle,
  decodePayload,
  encodePayload,
  importBundle,
  inspectBundle,
  linkFor,
  MAX_DECODED_BYTES,
  MAX_PAYLOAD_CHARS,
  payloadFromLink
} from '../../src/storage/bundle';
import { buildGame } from '../fixtures/makeGame';
import { generateReview } from '../../src/review';
import { findDuplicateHints, aggregatePlayers } from '../../src/review/crossGame';
import type { Game, Turn } from '../../src/storage/types';

let n = 0;
beforeEach(() => useDatabase(new FarkleDb('bundle-' + n++)));

function archivedFixture(id: string, names = ['Ann', 'Bob', 'Cy', 'Dee'], rounds = 11) {
  const specs = Array.from({ length: rounds }, (_, r) =>
    names.map((_nm, p) => ({
      p,
      kind: (r + p) % 5 === 0 ? ('bust' as const) : ('bank' as const),
      total: 300 + 50 * ((r * 3 + p * 7) % 12),
      steps: 2 + (p % 3)
    }))
  ).flat();
  const { game, turns } = buildGame(names, specs, { id });
  const archived: Game = {
    ...game,
    status: 'archived',
    review: generateReview(game, turns),
    location: { lat: 50.1, lon: 14.4, label: 'Pub' },
    placeLabel: 'Pub Na Rohu',
    activeTurn: undefined
  };
  return { game: archived, turns };
}

describe('bundle building', () => {
  const { game, turns } = archivedFixture('g1');
  it('never contains coordinates, and the place name only when asked', () => {
    const off = buildBundle(game, turns, { includePlace: false, compact: false });
    expect(off.games[0].location).toBeUndefined();
    expect(off.games[0].placeLabel).toBeUndefined();
    expect(JSON.stringify(off)).not.toContain('50.1');
    const on = buildBundle(game, turns, { includePlace: true, compact: false });
    expect(on.games[0].placeLabel).toBe('Pub Na Rohu');
    expect(on.games[0].location).toBeUndefined();
  });
  it('compact mode drops step details but keeps results', () => {
    const c = buildBundle(game, turns, { includePlace: false, compact: true });
    expect(c.turns.every((t) => t.steps.length === 0)).toBe(true);
    expect(c.turns.map((t) => t.turnTotal)).toEqual(turns.map((t) => t.turnTotal));
    expect(c.games[0].review).toBeTruthy();
  });
});

describe('link payload', () => {
  it('round-trips and stays small', async () => {
    const { game, turns } = archivedFixture('g2');
    const full = await encodePayload(buildBundle(game, turns, { includePlace: false, compact: false }));
    const compact = await encodePayload(buildBundle(game, turns, { includePlace: false, compact: true }));
    expect(compact.length).toBeLessThan(full.length);
    expect(compact.length).toBeLessThan(6000);
    const back = await decodePayload(compact);
    expect(back.ok && JSON.parse(back.text).games[0].id).toBe('g2');
    console.log('payload sizes (chars): 4 players x 11 rounds full', full.length, 'compact', compact.length);
  });
  it('8 players x 20 rounds stays well under the limit', async () => {
    const { game, turns } = archivedFixture('big', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 20);
    const compact = await encodePayload(buildBundle(game, turns, { includePlace: false, compact: true }));
    expect(compact.length).toBeLessThan(MAX_PAYLOAD_CHARS / 3);
    console.log('8 players x 20 rounds compact', compact.length);
  });
  it('rejects garbage, oversized and tampered payloads', async () => {
    expect((await decodePayload('')).ok).toBe(false);
    expect((await decodePayload('zz!!not base64')).ok).toBe(false);
    expect(await decodePayload('x' + 'A'.repeat(50))).toMatchObject({ ok: false, error: 'bad-format' });
    expect(await decodePayload('z' + 'A'.repeat(MAX_PAYLOAD_CHARS))).toMatchObject({ ok: false, error: 'too-large' });
    expect((await decodePayload('zQUJDRA')).ok).toBe(false);
  });
  it('stops inflating a decompression bomb', async () => {
    const bomb = new TextEncoder().encode('{"x":"' + 'a'.repeat(MAX_DECODED_BYTES * 20) + '"}');
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter();
    void w.write(bomb);
    void w.close();
    const packed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    expect(packed.length).toBeLessThan(MAX_PAYLOAD_CHARS); // small enough to arrive as a link
    let bin = '';
    for (const b of packed) bin += String.fromCharCode(b);
    const payload = 'z' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await decodePayload(payload)).toMatchObject({ ok: false, error: 'too-large' });
  });
  it('finds the payload in a pasted link', () => {
    expect(payloadFromLink('https://x.github.io/app/#/import/zABC-_1')).toBe('zABC-_1');
    expect(payloadFromLink('  zABC  ')).toBe('zABC');
    expect(linkFor('zAB', 'https://h/app/')).toBe('https://h/app/#/import/zAB');
  });
});

describe('importing a shared game', () => {
  async function shared(id: string, opts = { includePlace: false, compact: true }) {
    const { game, turns } = archivedFixture(id);
    return JSON.stringify(buildBundle(game, turns, { ...opts, deviceId: 'device-A' }));
  }

  it('previews without writing, then adds with origin and no location', async () => {
    const text = await shared('g3');
    const preview = await inspectBundle(text);
    expect(preview).toMatchObject({ ok: true, existing: 0, invalid: 0 });
    expect(preview.fresh[0]).toMatchObject({ id: 'g3', turns: 44 });
    expect(preview.fresh[0].players).toEqual(['Ann', 'Bob', 'Cy', 'Dee']);
    expect(await repo.listArchive()).toHaveLength(0);

    const ids = await importBundle(text, 5);
    expect(ids).toEqual(['g3']);
    const [g] = await repo.listArchive();
    expect(g.origin).toEqual({ deviceId: 'device-A', importedAt: 5 });
    expect(g.location).toBeUndefined();
    expect(g.placeLabel).toBeUndefined();
    expect(await repo.getTurns('g3')).toHaveLength(44);
  });

  it('importing the same game again changes nothing, and a local rename survives', async () => {
    const text = await shared('g4');
    await importBundle(text);
    await repo.renameGame('g4', 'My own name');
    expect(await inspectBundle(text)).toMatchObject({ ok: true, existing: 1, fresh: [] });
    expect(await importBundle(text)).toEqual([]);
    expect((await repo.listArchive())[0].name).toBe('My own name');
    expect(await repo.getTurns('g4')).toHaveLength(44);
  });

  it('keeps the place name only when it was shared', async () => {
    await importBundle(await shared('g5', { includePlace: true, compact: true }));
    expect((await repo.listArchive())[0].placeLabel).toBe('Pub Na Rohu');
  });

  it('rejects files that are not bundles and games that are not valid', async () => {
    expect(await inspectBundle('nope')).toMatchObject({ ok: false, error: 'not-json' });
    expect(await inspectBundle('{"app":"other"}')).toMatchObject({ ok: false, error: 'bad-format' });
    const empty = JSON.stringify({
      app: 'farkle-scorekeeper',
      schemaVersion: 1,
      exportedAt: 1,
      games: [],
      turns: [],
      players: [],
      presets: []
    });
    expect(await inspectBundle(empty)).toMatchObject({ ok: false, error: 'empty' });
    const bad = JSON.stringify({
      app: 'farkle-scorekeeper',
      schemaVersion: 1,
      exportedAt: 1,
      games: [{ id: 'x', status: 'inProgress' }],
      turns: [],
      players: [],
      presets: []
    });
    expect(await inspectBundle(bad)).toMatchObject({ ok: true, invalid: 1, fresh: [] });
    expect(await importBundle(bad)).toEqual([]);
  });

  it('bounds text from other devices and ignores script-like names (rendered as text only)', async () => {
    const { game, turns } = archivedFixture('g6');
    const b = buildBundle({ ...game, name: '<img src=x onerror=alert(1)>' + 'x'.repeat(500) }, turns, {
      includePlace: false,
      compact: true
    });
    await importBundle(JSON.stringify(b));
    const [g] = await repo.listArchive();
    expect(g.name.length).toBeLessThanOrEqual(60);
  });

  it('refuses a newer schema than this app understands', async () => {
    const { game, turns } = archivedFixture('g7');
    const b = { ...buildBundle(game, turns, { includePlace: false, compact: true }), schemaVersion: 99 };
    expect(await inspectBundle(JSON.stringify(b))).toMatchObject({ ok: false, error: 'bad-format' });
  });

  it('a device id is created once', async () => {
    const a = await repo.getDeviceId();
    expect(a).toMatch(/[0-9a-f-]{36}/);
    expect(await repo.getDeviceId()).toBe(a);
  });
});

describe('duplicate hints and name aliases', () => {
  const mk = (id: string, names: string[], at: number, winnerSeat = 0) => {
    const { game } = archivedFixture(id, names, 3);
    return { ...game, createdAt: at, result: { ...game.result!, winnerIds: [`p${winnerSeat}`] } } as Game;
  };
  it('flags the same players within four hours, not different players or days', () => {
    const h = 3600_000;
    const games = [
      mk('a', ['Ann', 'Bob'], 0),
      mk('b', ['bob', 'ANN'], 2 * h),
      mk('c', ['Ann', 'Bob'], 10 * h),
      mk('d', ['Ann', 'Cy'], 1 * h)
    ];
    const hints = findDuplicateHints(games);
    expect(hints.get('b')).toBe('a');
    expect(hints.has('c')).toBe(false);
    expect(hints.has('d')).toBe(false);
    expect(hints.has('a')).toBe(false);
  });
  it('aliases merge two spellings into one statistics row', () => {
    const games = [mk('a', ['Tom', 'Ann'], 0), mk('b', ['Tomas', 'Ann'], 100_000_000, 0)];
    expect(
      aggregatePlayers(games)
        .map((r) => r.name.toLowerCase())
        .sort()
    ).toEqual(['ann', 'tom', 'tomas']);
    const merged = aggregatePlayers(games, { tomas: 'Tom' });
    expect(merged.map((r) => r.name.toLowerCase()).sort()).toEqual(['ann', 'tom']);
    expect(merged.find((r) => r.name === 'Tom')!.games).toBe(2);
  });
});

export type { Turn };
