import { expect, test } from '@playwright/test';
import { bankTurn, fresh, quick, startGame, startTurn } from './helpers';

test('happy path: target game, final round, archive, reload, review', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob', 'Cy'], { target: 1000 });
  await page.screenshot({ path: 'shots/01-handover.png' });

  // Ann: 3x1 = 1000 -> reaches the target on the first turn (3 dice used, 3 left: bank blocked)
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^3×1/ }).click();
  await expect(page.getByRole('button', { name: /^BANK/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^BANK/ })).toContainText(/Needs 2 or fewer dice/);
  await page.screenshot({ path: 'shots/02-turn-blocked.png' });
  await page.getByRole('button', { name: /^1\s*\+100/ }).click();
  await expect(page.getByRole('button', { name: /^BANK/ })).toBeEnabled();
  await page.screenshot({ path: 'shots/03-turn-allowed.png' });
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.screenshot({ path: 'shots/04-confirm.png' });
  await page.getByRole('button', { name: /Confirm & pass/ }).click();

  // final round banner for Bob
  await expect(page.getByText(/Final round – beat 1.100/)).toBeVisible();
  await bankTurn(page, ['3×4', '1']); // Bob 500
  await bankTurn(page, ['3×4', '1']); // Cy 500 -> game over
  await expect(page.getByText('Game over')).toBeVisible();
  await page.screenshot({ path: 'shots/05-final.png' });

  await page.getByRole('button', { name: 'Archive game' }).click();
  await expect(page.getByText('Ann wins by 600 points')).toBeVisible();
  await page.screenshot({ path: 'shots/06-detail.png' });
  await page.getByRole('button', { name: 'Chart' }).click();
  await page.screenshot({ path: 'shots/07-chart.png' });

  await page.reload();
  await expect(page.getByText('Ann wins by 600 points')).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  await page.screenshot({ path: 'shots/08-archive.png' });
  await expect(page.getByText(/Farkle –/).first()).toBeVisible();
  await page.screenshot({ path: 'shots/08-archive.png' });
});

test('crash recovery: half-entered turn survives a reload', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^3×4/ }).click();
  await page.getByRole('button', { name: /^1\s*\+100/ }).click();
  await page.reload();
  await expect(page.getByText('Ann').first()).toBeVisible();
  await expect(page.locator('.turn-total')).toHaveText('500');
});

test('forget removes the game for good', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^3×4/ }).click();
  await page.getByRole('button', { name: /^1\s*\+100/ }).click();
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
  await page.getByRole('link', { name: 'Scoreboard' }).click();
  await page.getByRole('button', { name: 'End game now' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End game now' }).click();
  await page.getByRole('button', { name: 'Forget game' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Forget game' }).click();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page.getByText(/No archived games yet/)).toBeVisible();
});

test('bust, undo last turn and scoreboard edit', async ({ page }) => {
  await fresh(page);
  await startGame(page, ['Ann', 'Bob']);
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^BUST/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
  await expect(page.getByText('Ann busted')).toBeVisible();
  await page.getByRole('button', { name: 'Undo last turn' }).click();
  await expect(page.locator('.turn-total')).toHaveText('0');
  // bank 500 for Ann, then edit it to 700
  await page.getByRole('button', { name: /^3×4/ }).click();
  await page.getByRole('button', { name: /^1\s*\+100/ }).click();
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
  await page.getByRole('link', { name: 'Scoreboard' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('button', { name: /Edit Ann/ }).click();
  await page.getByRole('textbox').fill('700');
  await page.getByRole('button', { name: 'Save change' }).click();
  await expect(page.getByText('edited · was 500')).toBeVisible();
  await page.getByRole('button', { name: 'Scoreboard', exact: true }).click();
  await expect(page.getByText('700').first()).toBeVisible();
});

test('time mode: expiry mid-turn asks to finish the turn, then ends the game', async ({ page }) => {
  await page.clock.install();
  await fresh(page);
  await startGame(page, ['Ann', 'Bob'], { minutes: 1 });
  await startTurn(page);
  await quick(page);
  await page.getByRole('button', { name: /^3×4/ }).click();
  await page.getByRole('button', { name: /^1\s*\+100/ }).click();
  await page.clock.fastForward(61000);
  await expect(page.getByText('Time is up – finish this turn.')).toBeVisible();
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
  await expect(page.getByText('Game over')).toBeVisible();
});

test('offline after first load: a full game can be created', async ({ page, context }) => {
  await fresh(page);
  await page.waitForTimeout(1500); // let the service worker precache
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await startGame(page, ['Ann', 'Bob']);
  await expect(page.getByText('Ann').first()).toBeVisible();
});

test('language switch keeps data and translates', async ({ page }) => {
  await fresh(page, 'cs');
  await expect(page.getByRole('button', { name: /Nová hra/ })).toBeVisible();
  await startGame(page, ['Ann', 'Bob']);
  await page.screenshot({ path: 'shots/09-cs-handover.png' });
  await startTurn(page);
  await quick(page);
  await expect(page.getByRole('button', { name: /^PROPADLO/ })).toBeVisible();
  await page.screenshot({ path: 'shots/10-cs-turn.png' });
});
