import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fresh, quick, startGame, startTurn } from './helpers';

// iPhone + Chrome: the toolbars leave roughly these visible viewports (CSS px)
const VIEWPORTS = [
  { name: 'iPhone SE, Chrome (small)', width: 375, height: 540 },
  { name: 'iPhone 13 mini / 12, Chrome', width: 375, height: 640 },
  { name: 'iPhone 14/15, Chrome', width: 390, height: 680 },
  { name: 'iPhone Pro Max, Chrome', width: 430, height: 780 }
];

/** Nothing may need scrolling: neither the page nor the screen's content area. */
async function expectFits(page: Page, label: string) {
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const content = document.querySelector('.screen > .content, .screen > .input-area') as HTMLElement | null;
    const screen = document.querySelector('.screen') as HTMLElement;
    const overflowing = [...document.querySelectorAll<HTMLElement>('.screen *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.bottom > window.innerHeight + 1 || r.right > window.innerWidth + 1);
    }).map((e) => e.className || e.tagName).slice(0, 5);
    // clipped content: an element with hidden overflow whose content is taller than the element
    const clipped = [...document.querySelectorAll<HTMLElement>('.screen *')].filter((e) => {
      const o = getComputedStyle(e).overflowY;
      return (o === 'hidden' || o === 'clip') && e.scrollHeight > e.clientHeight + 1 && e.clientHeight > 0;
    }).map((e) => e.className || e.tagName).slice(0, 5);
    const kids = content ? [...content.children].map((k) => `${k.className || k.tagName}:${Math.round(k.getBoundingClientRect().height)}`) : [];
    return {
      kids,
      clipped,
      page: doc.scrollHeight - window.innerHeight,
      content: content ? content.scrollHeight - content.clientHeight : 0,
      screen: screen.scrollHeight - screen.clientHeight,
      overflowing
    };
  });
  expect(m, label).toMatchObject({ page: expect.any(Number) });
  expect(m.page, `${label}: page scroll`).toBeLessThanOrEqual(0);
  expect(m.content, `${label}: content scroll ${JSON.stringify(m.kids)}`).toBeLessThanOrEqual(1);
  expect(m.screen, `${label}: screen overflow`).toBeLessThanOrEqual(1);
  expect(m.overflowing, `${label}: elements outside the viewport`).toEqual([]);
  expect(m.clipped, `${label}: clipped content`).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test(`no scrolling needed: ${vp.name} ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await fresh(page);
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
    await expectFits(page, 'home (empty)');
    await page.getByRole('button', { name: 'New game' }).click();
    await page.getByRole('textbox', { name: 'Player 1 name' }).fill('Ann');
    await page.getByRole('textbox', { name: 'Player 2 name' }).fill('Bob');
    await page.getByRole('button', { name: 'Add player' }).click();
    await page.getByRole('textbox', { name: 'Player 3 name' }).fill('Cy');
    await page.getByRole('button', { name: 'Add player' }).click();
    await page.getByRole('textbox', { name: 'Player 4 name' }).fill('Dee');
    await expectFits(page, 'new game step 1 (4 players)');
    await page.getByRole('button', { name: 'Next' }).click();
    await expectFits(page, 'new game step 2');
    await page.getByRole('switch', { name: /Save location/ }).click();
    await expectFits(page, 'new game step 2 with place field');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expectFits(page, 'hand-over');
    await startTurn(page);
    await expectFits(page, 'turn: manual');
    for (const k of ['3', '5', '0']) await page.locator('.keypad4').getByRole('button', { name: k, exact: true }).click();
    await page.getByRole('button', { name: 'Add step' }).click();
    await expectFits(page, 'turn: manual with a step');
    await page.screenshot({ path: `shots/fit-turn-manual-${vp.width}x${vp.height}.png` });
    await quick(page);
    await expectFits(page, 'turn: quick picks');
    await page.screenshot({ path: `shots/fit-turn-quick-${vp.width}x${vp.height}.png` });
    await page.getByRole('button', { name: /^BUST/ }).click();
    await expectFits(page, 'confirm bust');
    await page.getByRole('button', { name: /Confirm & pass/ }).click();
    await expectFits(page, 'hand-over after a turn');
    await page.goto('/#/');
    await expectFits(page, 'home with a game in progress');
    await page.screenshot({ path: `shots/fit-home-${vp.width}x${vp.height}.png` });
    await page.goto('/#/board');
    await expectFits(page, 'scoreboard (4 players)');
    await page.getByRole('button', { name: 'End game now' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'End game now' }).click();
    await expectFits(page, 'final results (4 players)');
    await page.screenshot({ path: `shots/fit-final-${vp.width}x${vp.height}.png` });
  });
}

test('dark mode and Czech still fit on the smallest phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 540 });
  await fresh(page, 'cs');
  await page.getByRole('link', { name: 'Nastavení' }).click();
  await page.getByRole('button', { name: 'Tmavý' }).click();
  await page.getByRole('link', { name: 'Domů' }).click();
  await startGame(page, ['Anna', 'Bohumil']);
  await expectFits(page, 'cs hand-over');
  await startTurn(page);
  await expectFits(page, 'cs turn manual');
  await page.getByRole('button', { name: 'Rychlé volby', exact: true }).click();
  await expectFits(page, 'cs turn quick');
});
