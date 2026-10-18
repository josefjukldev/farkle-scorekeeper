import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { bankTurn, fresh, quick, startGame, startTurn } from './helpers';

async function archivedGame(page: Page) {
  await startGame(page, ['Ann', 'Bob'], { target: 1000 });
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

test('share: produces a 1080x1350 PNG and calls navigator.share with a file', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { shared: unknown[] }).shared = [];
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: async (d: ShareData) => {
        (window as unknown as { shared: ShareData[] }).shared.push(d);
      },
      configurable: true
    });
  });
  await fresh(page);
  await archivedGame(page);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const img = page.getByRole('img', { name: /Preview of the shared image/ });
  await expect(img).toBeVisible();
  const size = await img.evaluate(async (el) => {
    const i = el as HTMLImageElement;
    await i.decode();
    return [i.naturalWidth, i.naturalHeight];
  });
  expect(size).toEqual([1080, 1350]);
  await page.screenshot({ path: 'shots/11-share-dialog.png' });
  await page.getByRole('dialog').getByRole('button', { name: 'Share', exact: true }).click();
  const shared = await page.evaluate(() =>
    (window as unknown as { shared: { files: File[] }[] }).shared.map((d) => ({ type: d.files[0].type, name: d.files[0].name }))
  );
  expect(shared).toHaveLength(1);
  expect(shared[0].type).toBe('image/png');
  // save the full-size image for review
  const dataUrl = await img.evaluate((el) => {
    const i = el as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
    c.getContext('2d')!.drawImage(i, 0, 0);
    return c.toDataURL('image/png');
  });
  const fs = await import('node:fs');
  fs.writeFileSync('shots/share-image.png', Buffer.from(dataUrl.split(',')[1], 'base64'));
});

test('share fallback: downloads when navigator.share is missing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await fresh(page);
  await archivedGame(page);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('img', { name: /Preview/ })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('dialog').getByRole('button', { name: 'Share', exact: true }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

test('location granted is stored; denied still starts the game', async ({ browser }) => {
  const granted = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 50.08, longitude: 14.43 },
    viewport: { width: 393, height: 851 }
  });
  const p1 = await granted.newPage();
  await fresh(p1);
  await p1.getByRole('button', { name: 'New game' }).click();
  await p1.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
  await p1.getByRole('textbox', { name: 'Player 2 name' }).fill('Bob');
  await p1.getByRole('button', { name: 'Next' }).click();
  await p1.getByRole('switch', { name: /Save location/ }).click();
  await p1.getByRole('button', { name: 'Start game' }).click();
  await expect(p1.getByRole('button', { name: 'Start turn' })).toBeVisible();
  const readLoc = () =>
    p1.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open('dices-with-friends');
          open.onsuccess = () => {
            const q = open.result.transaction('games').objectStore('games').getAll();
            q.onsuccess = () => resolve(q.result[0]?.location);
          };
        })
    );
  await expect.poll(readLoc).toMatchObject({ lat: 50.08, lon: 14.43 });
  await granted.close();

  const denied = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const p2 = await denied.newPage();
  await fresh(p2);
  await p2.getByRole('button', { name: 'New game' }).click();
  await p2.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
  await p2.getByRole('textbox', { name: 'Player 2 name' }).fill('Bob');
  await p2.getByRole('button', { name: 'Next' }).click();
  await p2.getByRole('switch', { name: /Save location/ }).click();
  await p2.getByRole('button', { name: 'Start game' }).click();
  await expect(p2.getByRole('button', { name: 'Start turn' })).toBeVisible();
  await denied.close();
});

test('backup: export, reset, import restores the archive', async ({ page }) => {
  await fresh(page);
  await archivedGame(page);
  await page.goto('/#/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export file' }).click()]);
  const path = await download.path();
  await page.getByRole('button', { name: 'Reset all data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('button', { name: 'Nová hra' })).toBeVisible(); // settings are reset, so Czech again
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'English' }).click();
  await page.goto('/#/archive');
  await expect(page.getByText(/No archived games yet/)).toBeVisible();
  await page.goto('/#/settings');
  await page.getByLabel('Import file', { exact: true }).setInputFiles(path!);
  await expect(page.getByText(/1 new games/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('Imported 1 games.')).toBeVisible();
  await page.goto('/#/archive');
  await expect(page.getByText(/Farkle –/).first()).toBeVisible();
});

test('start a new game while one is in progress asks for confirmation', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await page.goto('/#/');
  await page.getByRole('button', { name: /New game/ }).click();
  await expect(page.getByRole('dialog', { name: 'Replace the current game?' })).toBeVisible();
});

test('validation: duplicate names disable Start', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
  await page.getByRole('textbox', { name: 'Player 2 name' }).fill('ann');
  await expect(page.getByText('Another player already has this name.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.screenshot({ path: 'shots/12-validation.png' });
});

test('turn screen: manual entry is the default, quick picks is the second view, no dice picker', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await startTurn(page);
  // manual view first, calculator keys only (no +50 / +100, no dice picker)
  await expect(page.getByRole('button', { name: 'Manual', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '+50' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+100' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Dice picker/i })).toHaveCount(0);
  const pad = page.locator('.keypad4');
  const press = async (...keys: string[]) => {
    for (const k of keys) await pad.getByRole('button', { name: k, exact: true }).click();
  };
  await press('3', '5', '5');
  await expect(page.getByText('multiple of 50')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add step' })).toBeDisabled(); // 355
  await pad.getByRole('button', { name: 'Delete' }).click();
  await press('0');
  await page.getByRole('button', { name: 'Add step' }).click();
  await expect(page.locator('.turn-total')).toHaveText('350');
  // without a dice count the dice are unknown; with one they are tracked
  await expect(page.getByText('Dice left: ?')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await press('4', '00', '0');
  await page.getByRole('group', { name: 'Dice used (optional)' }).getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Add step' }).click();
  await expect(page.locator('.turn-total')).toHaveText('4,000');
  await expect(page.getByText('Dice left: 3')).toBeVisible();
  await page.screenshot({ path: 'shots/13-manual.png' });
  // quick picks as the alternative view
  await page.getByRole('button', { name: 'Quick picks', exact: true }).click();
  await expect(page.getByRole('button', { name: /^3×4 \+/ })).toBeVisible();
  await page.screenshot({ path: 'shots/14-quick.png' });
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add step' })).toBeVisible();
});

test('bank blocked reason is shown on the Bank button', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await startTurn(page);
  await expect(page.getByRole('button', { name: /^BANK/ })).toContainText('Add points first');
  await quick(page);
  await page.getByRole('button', { name: /^3×4 \+/ }).click();
  await expect(page.getByRole('button', { name: /^BANK/ })).toContainText('Needs 2 or fewer dice');
  await page.getByRole('button', { name: /^1 \+/ }).click();
  await expect(page.getByRole('button', { name: /^BANK/ })).toBeEnabled();
});

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  const scan = async (page: Page, name: string) => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = r.violations.map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`
    );
    expect(bad, name).toEqual([]);
  };
  for (const theme of ['light', 'dark'] as const) {
    test(`all key screens, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await fresh(page);
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.getByRole('button', { name: theme === 'dark' ? 'Dark' : 'Light' }).click();
      await scan(page, 'settings');
      await page.getByRole('link', { name: 'Home' }).click();
      await scan(page, 'home');
      await page.getByRole('button', { name: 'New game' }).click();
      await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
      await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Bob');
      await scan(page, 'new game step 1');
      await page.getByRole('button', { name: 'Next' }).click();
      await scan(page, 'new game step 2');
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await scan(page, 'rules editor');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Start game' }).click();
      await scan(page, 'hand-over');
      await startTurn(page);
      await scan(page, 'turn entry manual');
      await quick(page);
      await page.getByRole('button', { name: /^3×4 \+/ }).click();
      await scan(page, 'turn entry quick');
      await page.getByRole('button', { name: 'BUST' }).click();
      await scan(page, 'confirm');
      await page.getByRole('button', { name: /Confirm & pass/ }).click();
      await page.getByRole('link', { name: 'Scoreboard' }).click();
      await scan(page, 'scoreboard');
      await page.getByRole('button', { name: 'History' }).click();
      await scan(page, 'history');
      await page.getByRole('button', { name: 'End game now' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'End game now' }).click();
      await scan(page, 'final results');
      await page.getByRole('button', { name: 'Archive game' }).click();
      await scan(page, 'game detail');
      await page.getByRole('button', { name: 'Chart' }).click();
      await scan(page, 'chart');
      await page.getByRole('link', { name: 'Back' }).click();
      await scan(page, 'archive');
    });
  }
});

test('wide screen shows the live standings beside the turn screen', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await expect(page.getByRole('complementary', { name: 'Scoreboard' })).toBeVisible();
  await startTurn(page);
  await expect(page.getByRole('complementary', { name: 'Scoreboard' })).toContainText('Bob');
  await page.screenshot({ path: 'shots/15-wide.png' });
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(page.getByRole('complementary', { name: 'Scoreboard' })).toBeHidden();
});

test('player statistics page aggregates archived games', async ({ page }) => {
  await fresh(page);
  await archivedGame(page);
  await page.goto('/#/stats');
  await expect(page.getByRole('heading', { name: 'Player statistics' })).toBeVisible();
  await expect(page.getByText('Ann').first()).toBeVisible();
  await expect(page.getByText('1 game · 1 win')).toBeVisible();
  await page.screenshot({ path: 'shots/16-stats.png' });
});
