import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function fresh(page: Page, lang: 'en' | 'cs' = 'en') {
  await page.goto('/');
  await page.evaluate(async () => {
    sessionStorage.clear();
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name!); q.onsuccess = q.onerror = q.onblocked = () => r(null); })));
  });
  await page.goto('/');
  if (lang === 'en') {
    await page.getByRole('link', { name: 'Nastavení' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('link', { name: 'Home' }).click();
  }
}

export async function startGame(page: Page, names: string[], opts: { target?: number; minutes?: number } = {}) {
  await page.getByRole('button', { name: /New game|Nová hra/ }).click();
  const inputs = page.getByRole('textbox', { name: /Player \d name|Jméno hráče \d/ });
  for (let i = 0; i < names.length; i++) {
    if ((await inputs.count()) <= i) await page.getByRole('button', { name: /Add player|Přidat hráče/ }).click();
    await inputs.nth(i).fill(names[i]);
  }
  if (opts.target) {
    await page.getByRole('button', { name: /^Custom$|^Vlastní$/ }).click();
    const num = page.locator('input[inputmode="numeric"]');
    await num.fill(String(opts.target));
  }
  if (opts.minutes) {
    await page.getByRole('button', { name: /Time limit|Časový limit/ }).click();
    await page.getByRole('button', { name: /^Custom$|^Vlastní$/ }).click();
    await page.locator('input[inputmode="numeric"]').fill(String(opts.minutes));
  }
  await page.getByRole('button', { name: /Start game|Začít hru/ }).click();
  await expect(page.getByRole('button', { name: /Start turn|Začít kolo/ })).toBeVisible();
}

export const startTurn = (page: Page) => page.getByRole('button', { name: /Start turn|Začít kolo/ }).click();

/** Plays a banked turn of exactly `total` points using 3x4 (400) + 1 (100) style picks. */
export async function bankTurn(page: Page, picks: string[]) {
  await startTurn(page);
  for (const p of picks) await page.getByRole('button', { name: new RegExp(`^${p.replace(/[+×]/g, (c) => '\\' + c)} \\+`) }).click();
  await page.getByRole('button', { name: /^BANK/ }).click();
  await page.getByRole('button', { name: /Confirm & pass/ }).click();
}
