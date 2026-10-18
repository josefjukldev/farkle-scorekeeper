import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { bankTurn, fresh, quick, startTurn } from './helpers';

async function newDevice(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 740 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await fresh(page);
  return { ctx, page };
}

/** Plays and archives a 2-player game on `page`; leaves it on the game detail with the send prompt. */
async function archiveGame(page: Page, opts: { place?: string } = {}) {
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Bob');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /^Custom$/ }).click();
  await page.locator('input[inputmode="numeric"]').fill('1000');
  if (opts.place) {
    await page.getByRole('switch', { name: /Save location/ }).click();
    await page.getByRole('textbox', { name: /Place name/ }).fill(opts.place);
  }
  await page.getByRole('button', { name: 'Start game' }).click();
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^3×1 \+/ }).click();
  await page.getByRole('button', { name: /^1 \+/ }).click();
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
  await bankTurn(page, ['3×4', '1']);
  await page.getByRole('button', { name: 'Archive game' }).click();
  await expect(page.getByText(/wins by/)).toBeVisible();
}

const readLink = (page: Page) => page.getByRole('textbox', { name: 'Link' }).inputValue();

test('a game archived on device A can be added on device B via link; importing again changes nothing', async ({ browser }) => {
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await archiveGame(a.page);

  // the prompt after archiving offers to send
  await expect(a.page.getByText('Send this game to the other players?')).toBeVisible();
  await a.page.screenshot({ path: 'shots/20-send-prompt.png' });
  await a.page.getByRole('button', { name: 'Send to players' }).first().click();
  const dialog = a.page.getByRole('dialog', { name: 'Send to players' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => readLink(a.page)).toContain('#/import/');
  await expect(dialog.getByText(/Anyone with this link can read this game/)).toBeVisible();
  await a.page.screenshot({ path: 'shots/21-send-dialog.png' });
  const link = await readLink(a.page);

  // device B: empty archive, opens the link
  await b.page.goto(link);
  await expect(b.page.getByRole('heading', { name: 'Add a shared game' })).toBeVisible();
  await expect(b.page.getByText('Ann', { exact: true }).first()).toBeVisible();
  await expect(b.page.getByText(/2 turns/)).toBeVisible();
  await b.page.screenshot({ path: 'shots/22-import-preview.png' });
  await b.page.getByRole('button', { name: 'Add 1 game to my archive' }).click();
  await expect(b.page.getByText(/wins by/)).toBeVisible();
  await expect(b.page.getByText('shared with you')).toBeVisible();

  // archive and statistics on B match A
  await b.page.getByRole('link', { name: 'Back' }).click();
  await expect(b.page.getByText(/Farkle –/).first()).toBeVisible();
  await b.page.goto('/#/stats');
  await expect(b.page.getByText('1 game · 1 win')).toBeVisible();

  // same link again: already there, nothing added
  await b.page.goto(link);
  await expect(b.page.getByText('This game is already in your archive. Nothing was changed.')).toBeVisible();
  await expect(b.page.getByRole('button', { name: /Add .* to my archive/ })).toHaveCount(0);
  await b.page.goto('/#/archive');
  await expect(b.page.locator('a.link-card')).toHaveCount(1);

  await a.ctx.close();
  await b.ctx.close();
});

test('the shared link never contains coordinates or the place name unless chosen', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 740 },
    permissions: ['geolocation'],
    geolocation: { latitude: 50.0875, longitude: 14.4213 }
  });
  const page = await ctx.newPage();
  await fresh(page);
  await archiveGame(page, { place: 'Pub Na Rohu' });
  await page.getByRole('button', { name: 'Send to players' }).first().click();
  await expect(page.getByRole('switch', { name: /Include the place name/ })).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => readLink(page)).toContain('#/import/');
  const decode = (payload: string) =>
    page.evaluate(async (p) => {
      const b64 = p.slice(1).replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const ds = new DecompressionStream('deflate-raw');
      const w = ds.writable.getWriter();
      void w.write(bytes);
      void w.close();
      return new Response(ds.readable).text();
    }, payload);
  const off = await decode((await readLink(page)).split('#/import/')[1]);
  expect(off).not.toContain('Pub Na Rohu');
  expect(off).not.toContain('50.08');
  expect(off).not.toContain('14.42');
  await page.getByRole('switch', { name: /Include the place name/ }).click();
  await expect.poll(async () => decode((await readLink(page)).split('#/import/')[1])).toContain('Pub Na Rohu');
  const on = await decode((await readLink(page)).split('#/import/')[1]);
  expect(on).not.toContain('50.08');
  expect(on).not.toContain('14.42');
  await ctx.close();
});

test('a game can also be sent as a file and imported on another device', async ({ browser }) => {
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await archiveGame(a.page);
  await a.page.getByRole('button', { name: 'Send to players' }).first().click();
  await expect.poll(() => readLink(a.page)).toContain('#/import/');
  const [download] = await Promise.all([a.page.waitForEvent('download'), a.page.getByRole('button', { name: 'Send as file' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.dices\.json$/);
  const path = await download.path();

  await b.page.goto('/#/archive');
  await b.page.getByRole('button', { name: 'Import', exact: true }).click();
  await b.page.getByLabel('Choose a file').setInputFiles(path!);
  await expect(b.page.getByText('Ann', { exact: true }).first()).toBeVisible();
  await b.page.getByRole('button', { name: 'Add 1 game to my archive' }).click();
  await expect(b.page.getByText(/wins by/)).toBeVisible();
  await a.ctx.close();
  await b.ctx.close();
});

test('pasting a link in the Import sheet works, and bad links show a clear message', async ({ browser }) => {
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await archiveGame(a.page);
  await a.page.getByRole('button', { name: 'Send to players' }).first().click();
  await expect.poll(() => readLink(a.page)).toContain('#/import/');
  const link = await readLink(a.page);

  await b.page.goto('/#/archive');
  await b.page.getByRole('button', { name: 'Import', exact: true }).click();
  await b.page.getByRole('textbox', { name: 'Link from a friend' }).fill('https://x.test/app/#/import/zNOTVALID');
  await b.page.getByRole('button', { name: 'Check link' }).click();
  await expect(b.page.getByText(/not valid/)).toBeVisible();
  await b.page.getByRole('textbox', { name: 'Link from a friend' }).fill(link);
  await b.page.getByRole('button', { name: 'Check link' }).click();
  await expect(b.page.getByRole('button', { name: 'Add 1 game to my archive' })).toBeVisible();
  await b.page.screenshot({ path: 'shots/23-import-sheet.png' });
  await b.page.getByRole('button', { name: 'Add 1 game to my archive' }).click();
  await expect(b.page.getByText(/wins by/)).toBeVisible();

  // a broken link opened directly
  await b.page.goto('/#/import/zAAAA');
  await expect(b.page.getByRole('alert')).toContainText(/not valid|too large/);
  await a.ctx.close();
  await b.ctx.close();
});

test('two scorekeepers recording the same evening are flagged as a possible duplicate, and names can be merged', async ({ browser }) => {
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await archiveGame(a.page);
  await archiveGame(b.page); // B recorded its own game with the same players
  await a.page.getByRole('button', { name: 'Send to players' }).first().click();
  await expect.poll(() => readLink(a.page)).toContain('#/import/');
  const link = await readLink(a.page);
  await b.page.goto(link);
  await b.page.getByRole('button', { name: 'Add 1 game to my archive' }).click();
  await expect(b.page.getByText(/wins by/)).toBeVisible();
  await b.page.evaluate(() => (location.hash = '#/archive'));
  await expect(b.page.locator('a.link-card')).toHaveCount(2);
  await expect(b.page.getByText(/Looks like/)).toBeVisible();
  await b.page.screenshot({ path: 'shots/24-duplicate.png' });

  // statistics count the two games; merging a spelling works
  await b.page.goto('/#/settings');
  await b.page.getByRole('button', { name: 'Merge player names' }).click();
  const dlg = b.page.getByRole('dialog', { name: 'Merge player names' });
  await dlg.getByLabel('Count this name').selectOption('Bob');
  await dlg.getByLabel('as').selectOption('Ann');
  await dlg.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(dlg.getByText('Merged names')).toBeVisible();
  await b.page.keyboard.press('Escape');
  await b.page.goto('/#/stats');
  await expect(b.page.getByText('Bob')).toHaveCount(0);
  await expect(b.page.getByText('4 games · 4 wins').or(b.page.getByText(/4 games/))).toBeVisible();
  await a.ctx.close();
  await b.ctx.close();
});
