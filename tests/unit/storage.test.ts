// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FarkleDb, useDatabase } from '../../src/storage/db';
import * as repo from '../../src/storage/repo';
import { exportAll, importAll } from '../../src/storage/backup';
import { buildGame } from '../fixtures/makeGame';
import { generateReview } from '../../src/review';

let n = 0;
beforeEach(() => useDatabase(new FarkleDb('test-' + n++)));

const fixture = (id: string) =>
  buildGame(['Ann', 'Bob'], [{ p: 0, kind: 'bank', total: 500 }, { p: 1, kind: 'bust', total: 200 }, { p: 0, kind: 'bank', total: 400 }], { id });

describe('repository', () => {
  it('create, resume and forget', async () => {
    const { game, turns } = fixture('g1');
    const active = { ...game, status: 'inProgress' as const };
    await repo.saveGame(active);
    for (const t of turns) await repo.appendTurn(active, t);
    expect((await repo.getActiveGame())?.id).toBe('g1');
    expect(await repo.getTurns('g1')).toHaveLength(3);
    await repo.forgetGame('g1');
    expect(await repo.getActiveGame()).toBeUndefined();
    expect(await repo.getTurns('g1')).toHaveLength(0);
  });

  it('keeps activeTurn so a half-entered turn survives a reload', async () => {
    const { game } = fixture('g2');
    const withDraft = { ...game, status: 'inProgress' as const, activeTurn: { playerId: 'p0', started: true, startedAt: 5, turn: { steps: [{ id: 'x', points: 300, source: 'quick' as const, diceUsed: 3, at: 1 }], history: [], diceRemaining: 3, diceKnown: true, hotDicePending: false, hotDiceCount: 0 } } };
    await repo.saveGame(withDraft);
    const loaded = await repo.getActiveGame();
    expect(loaded?.activeTurn?.turn.steps[0].points).toBe(300);
    expect(loaded?.activeTurn?.turn.diceRemaining).toBe(3);
  });

  it('finish then archive moves the game to the archive', async () => {
    const { game, turns } = fixture('g3');
    await repo.saveGame({ ...game, status: 'inProgress' });
    await repo.finishGame({ ...game, status: 'inProgress' }, game.result!);
    expect((await repo.getActiveGame())?.status).toBe('finishedPending');
    await repo.archiveGame(game, generateReview(game, turns));
    expect(await repo.getActiveGame()).toBeUndefined();
    const list = await repo.listArchive();
    expect(list.map((g) => g.id)).toEqual(['g3']);
    expect(list[0].review?.awards.length).toBeGreaterThan(0);
  });

  it('search and filter the archive; rename and delete', async () => {
    for (const id of ['a', 'b']) {
      const { game, turns } = fixture(id);
      const archived = { ...game, name: id === 'a' ? 'Friday night' : 'Sunday', createdAt: id === 'a' ? 2 : 1 };
      for (const t of turns) await repo.appendTurn(archived, { ...t, id: id + t.id });
      await repo.archiveGame(archived, generateReview(game, turns));
    }
    expect((await repo.listArchive()).map((g) => g.id)).toEqual(['a', 'b']);
    expect((await repo.listArchive({ query: 'fri' })).map((g) => g.id)).toEqual(['a']);
    expect((await repo.listArchive({ playerName: 'Bob' })).length).toBe(2);
    expect((await repo.listArchive({ query: 'zzz' })).length).toBe(0);
    await repo.renameGame('a', 'Renamed');
    expect((await repo.listArchive({ query: 'renamed' })).length).toBe(1);
    await repo.deleteArchived('a');
    expect((await repo.listArchive()).map((g) => g.id)).toEqual(['b']);
  });

  it('settings default and persist', async () => {
    expect((await repo.getSettings()).language).toBe('cs');
    await repo.saveSettings({ ...(await repo.getSettings()), language: 'en' });
    expect((await repo.getSettings()).language).toBe('en');
  });

  it('recent players are ordered by last use', async () => {
    await repo.upsertPlayer({ id: '1', name: 'Old', colour: '#000', lastUsedAt: 1 });
    await repo.upsertPlayer({ id: '2', name: 'New', colour: '#000', lastUsedAt: 2 });
    expect((await repo.listRecentPlayers()).map((p) => p.name)).toEqual(['New', 'Old']);
  });
});

describe('backup', () => {
  async function seed(id: string) {
    const { game, turns } = fixture(id);
    await repo.archiveGame({ ...game, location: { lat: 1, lon: 2 }, placeLabel: 'Pub' }, generateReview(game, turns));
    for (const t of turns) await repo.appendTurn({ ...game, status: 'archived' }, t);
  }

  it('export then import round-trips into an empty database', async () => {
    await seed('g1');
    const before = await repo.listArchive();
    const text = await (await exportAll()).text();
    useDatabase(new FarkleDb('fresh-' + n++));
    const preview = await importAll(text, false);
    expect(preview).toMatchObject({ ok: true, newGames: 1, existingGames: 0 });
    expect(await repo.listArchive()).toHaveLength(0);
    await importAll(text, true);
    expect(await repo.listArchive()).toEqual(before);
    expect(await repo.getTurns('g1')).toHaveLength(3);
  });

  it('import with duplicates never overwrites', async () => {
    await seed('g1');
    const text = await (await exportAll()).text();
    await repo.renameGame('g1', 'Local rename');
    const report = await importAll(text, true);
    expect(report).toMatchObject({ newGames: 0, existingGames: 1 });
    expect((await repo.listArchive())[0].name).toBe('Local rename');
  });

  it('can exclude the location', async () => {
    await seed('g1');
    const data = JSON.parse(await (await exportAll({ excludeLocation: true })).text());
    expect(data.games[0].location).toBeUndefined();
    expect(data.games[0].placeLabel).toBeUndefined();
  });

  it('rejects bad files', async () => {
    expect((await importAll('not json', false)).error).toBe('not-json');
    expect((await importAll('{"app":"other"}', false)).error).toBe('bad-format');
  });

  it('counts invalid games', async () => {
    const text = JSON.stringify({ app: 'farkle-scorekeeper', schemaVersion: 1, exportedAt: 1, games: [{ id: 'x' }], turns: [], players: [], presets: [] });
    expect(await importAll(text, false)).toMatchObject({ ok: true, invalidGames: 1, newGames: 0 });
  });

  it('reset clears everything', async () => {
    await seed('g1');
    await repo.resetAll();
    expect(await repo.listArchive()).toHaveLength(0);
  });
});
