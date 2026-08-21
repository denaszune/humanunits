import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('has no automatically detectable accessibility violations on primary views', async ({ page }) => {
  for (const hash of ['', '#pairs', '#library', '#about', '#license']) {
    await page.goto(`./${hash}`);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
  }
});

test('converts case-sensitive symbols and exposes accessible result actions', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await expect(input).toBeFocused();
  await input.fill('1 MW to W');
  await expect(page.locator('.result')).toContainText('1,000,000');
  await expect(page.getByRole('button', { name: 'Copy result' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Pin pair' })).toHaveAttribute('aria-pressed', 'false');
});

test('swaps compound feet and inches without visible round-trip drift', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await input.fill('180 cm in ft + in');
  await page.getByRole('group', { name: 'Significant digits' }).getByRole('button', { name: '15' }).click();
  const compoundResult = page.locator('.result strong');
  await expect(compoundResult).toHaveText('5 ft 10.866141732283 in');
  await expect.poll(() => compoundResult.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  })).toBe(1);
  const actionIconDisplays = await page.locator('.actions button > span').evaluateAll(elements => elements.map(element => getComputedStyle(element).display));
  expect(new Set(actionIconDisplays).size).toBe(1);
  await page.getByRole('button', { name: 'Swap units using full precision' }).click();
  await expect(input).toHaveValue('5 ft 10.86614173228347 in to cm');
  await expect(page.locator('.result')).toHaveText('180 cm');
});

test('survives malformed persisted data and migrates valid legacy values', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('humanunits:history:v1', 'null');
    localStorage.setItem('humanunits:pins:v1', JSON.stringify([null, { from: 'km', to: 'mi', query: 'stale' }]));
  });
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'What would you like to convert?' })).toBeVisible();
  await page.getByRole('link', { name: 'Library' }).first().click();
  await expect(page.getByRole('heading', { name: 'Library', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert km to mi' })).toBeVisible();
});

test('keeps working in memory and warns when storage writes are blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto('./');
  await page.getByRole('textbox', { name: 'What would you like to convert?' }).fill('10 km in mi');
  await page.getByRole('button', { name: 'Pin pair' }).click();
  await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('alert')).toContainText('blocked local storage');
});

test('hash routes update the page title, heading, history, and focus', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'About' }).first().click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page).toHaveTitle('About · Human Units');
  await expect(page.getByRole('heading', { name: 'About Human Units', level: 1 })).toBeVisible();
  await expect(page.locator('main')).toBeFocused();

  await page.getByRole('link', { name: 'License' }).last().click();
  await expect(page).toHaveURL(/#license$/);
  await expect(page.getByRole('heading', { name: 'MIT License', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'About Human Units', level: 1 })).toBeVisible();
});

test('keeps ambiguous category pins distinct after reload', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await input.fill('210 mm (typography) in pc (typography)');
  await page.getByRole('button', { name: 'Pin pair' }).click();
  await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await input.fill('210 mm (typography) in pc (typography)');
  await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('starts from the precache while offline after the service worker controls the page', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await expect(input).toBeVisible();
  await input.fill('72 f to c');
  await expect(page.locator('.result')).toContainText('22.2222');
});
