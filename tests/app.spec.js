import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('has no automatically detectable accessibility violations on primary views', async ({ page }) => {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    for (const hash of ['', '#pairs', '#library', '#about', '#license']) {
      await page.goto(`./${hash}`);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
    }
  }
});

test('keeps expanded category cards in place and fills the available row width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('./#pairs');

  const categoryGrid = page.locator('.category-grid').first();
  const massCard = page.getByRole('button', { name: 'Mass 20 units', exact: true });
  const massItem = page.locator('.category-item').filter({ has: massCard });
  const cardBounds = () => massCard.evaluate(card => {
    const bounds = card.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  });
  const desktopCardBefore = await cardBounds();
  await massCard.evaluate(card => card.click());

  const desktopBounds = await Promise.all([categoryGrid.boundingBox(), massItem.locator('.unit-panel').boundingBox()]);
  expect(desktopBounds.every(Boolean)).toBe(true);
  expect(Math.abs(desktopBounds[0].x - desktopBounds[1].x)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopBounds[0].width - desktopBounds[1].width)).toBeLessThanOrEqual(1);
  expect(await cardBounds()).toEqual(desktopCardBefore);
  await massCard.hover();
  expect(await cardBounds()).toEqual(desktopCardBefore);
  const pressedAt = await massCard.boundingBox();
  await page.mouse.move(pressedAt.x + pressedAt.width / 2, pressedAt.y + pressedAt.height / 2);
  await page.mouse.down();
  await expect.poll(() => massCard.evaluate(card => getComputedStyle(card).transform)).toContain('0.98');
  const pressedStyles = await massItem.evaluate(item => ({
    background: getComputedStyle(item).backgroundColor,
    cardBorder: getComputedStyle(item.querySelector('.category-card')).borderTopColor,
    cardBottomWidth: getComputedStyle(item.querySelector('.category-card')).borderBottomWidth,
    cardBottomRadius: getComputedStyle(item.querySelector('.category-card')).borderBottomLeftRadius,
    panelBorder: getComputedStyle(item.querySelector('.unit-panel')).borderTopColor,
    panelTransform: getComputedStyle(item.querySelector('.unit-panel')).transform,
  }));
  expect(pressedStyles.background).toBe('rgba(0, 0, 0, 0)');
  // open card and panel are two separate fully-rounded surfaces sharing one accent border
  expect(pressedStyles.cardBorder).toBe(pressedStyles.panelBorder);
  expect(pressedStyles.cardBottomWidth).toBe('1px');
  expect(pressedStyles.cardBottomRadius).not.toBe('0px');
  const pressedCard = await cardBounds();
  const pressedPanel = await massItem.locator('.unit-panel').boundingBox();
  expect(Math.abs(pressedCard.width / desktopCardBefore.width - .98)).toBeLessThan(.005);
  // pressing the card must not drag the row-wide panel along with it
  expect(Math.abs(pressedPanel.width - desktopBounds[1].width)).toBeLessThanOrEqual(1);
  expect(pressedStyles.panelTransform).toBe('none');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect.poll(() => massCard.evaluate(card => getComputedStyle(card).transform)).toBe('none');
  const panelSpacing = await massItem.evaluate(item => {
    const card = item.querySelector('.category-card').getBoundingClientRect();
    const panel = item.querySelector('.unit-panel').getBoundingClientRect();
    const nextCard = item.nextElementSibling.getBoundingClientRect();
    return { above: panel.top - card.bottom, below: nextCard.top - panel.bottom };
  });
  expect(Math.abs(panelSpacing.above - panelSpacing.below)).toBeLessThanOrEqual(1);
  const unitColumnCount = () => massItem.locator('.unit-chips button').evaluateAll(buttons =>
    new Set(buttons.map(button => Math.round(button.getBoundingClientRect().x))).size);
  expect(await unitColumnCount()).toBeGreaterThan(2);

  await page.setViewportSize({ width: 600, height: 844 });
  await page.reload();
  const tabletCardBefore = await cardBounds();
  await massCard.evaluate(card => card.click());
  const tabletBounds = await Promise.all([categoryGrid.boundingBox(), massItem.locator('.unit-panel').boundingBox()]);
  expect(Math.abs(tabletBounds[0].x - tabletBounds[1].x)).toBeLessThanOrEqual(1);
  expect(Math.abs(tabletBounds[0].width - tabletBounds[1].width)).toBeLessThanOrEqual(1);
  expect(await cardBounds()).toEqual(tabletCardBefore);
  expect(await unitColumnCount()).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(unitColumnCount).toBe(2);
  const mobileBounds = await Promise.all([categoryGrid.boundingBox(), massItem.boundingBox()]);
  expect(Math.abs(mobileBounds[0].x - mobileBounds[1].x)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileBounds[0].width - mobileBounds[1].width)).toBeLessThanOrEqual(1);
});

test('follows the system theme and persists explicit theme choices', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  const root = page.locator('html');
  const canvas = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
  const themeColor = () => page.locator('meta[name="theme-color"]').getAttribute('content');

  expect(await root.getAttribute('data-theme')).toBeNull();
  await expect.poll(canvas).toBe('#121212');
  await expect.poll(themeColor).toBe('#121212');

  await page.getByRole('button', { name: 'Theme: System' }).click();
  const picker = page.getByRole('dialog', { name: 'Theme' });
  await expect(picker).toBeVisible();
  const placement = await picker.evaluate(element => {
    const pickerBounds = element.getBoundingClientRect();
    const buttonBounds = document.querySelector('.theme-toggle').getBoundingClientRect();
    return { rightGap: Math.abs(pickerBounds.right - buttonBounds.right), verticalGap: pickerBounds.top - buttonBounds.bottom };
  });
  expect(placement.rightGap).toBeLessThan(1);
  expect(placement.verticalGap).toBe(8);
  await expect(picker.getByRole('radio', { name: /System/ })).toBeChecked();
  await picker.getByRole('radio', { name: /Light/ }).check();
  await expect(picker).toBeHidden();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect.poll(canvas).toBe('#f6f2e8');
  await expect.poll(themeColor).toBe('#f6f2e8');
  expect(await page.evaluate(() => localStorage.getItem('humanunits:theme:v1'))).toBe('"light"');

  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Theme: Light' }).click();
  await page.getByRole('dialog', { name: 'Theme' }).getByRole('radio', { name: /Dark/ }).check();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect.poll(themeColor).toBe('#121212');

  await page.getByRole('button', { name: 'Theme: Dark' }).click();
  await page.getByRole('dialog', { name: 'Theme' }).getByRole('radio', { name: /System/ }).check();
  expect(await root.getAttribute('data-theme')).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('humanunits:theme:v1'))).toBeNull();
  await expect.poll(canvas).toBe('#121212');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(canvas).toBe('#f6f2e8');
  await expect.poll(themeColor).toBe('#f6f2e8');
});

test('applies a persisted theme before the application bundle runs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('humanunits:theme:v1', '"dark"'));
  await page.route('**/static/js/**', route => route.abort());
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121212');
});

test('keeps dark-theme brand green scoped to the logo and result band', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('./');
  const colors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries([
      '--dark-page', '--dark-surface-1', '--dark-surface-2', '--dark-control', '--dark-border-strong',
      '--dark-text', '--dark-text-muted', '--dark-accent', '--dark-accent-hover',
      '--dark-brand-surface', '--dark-brand-border', '--dark-brand-accent', '--dark-logo-background',
    ].map(property => [property, styles.getPropertyValue(property).trim()]));
  });
  const luminance = color => {
    const channels = color.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  };
  const contrast = (first, second) => {
    const values = [luminance(colors[first]), luminance(colors[second])].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  };

  for (const pair of [
    ['--dark-text', '--dark-surface-1'],
    ['--dark-text-muted', '--dark-surface-1'],
    ['--dark-accent', '--dark-surface-1'],
  ]) expect(contrast(...pair)).toBeGreaterThanOrEqual(4.5);
  for (const pair of [
    ['--dark-border-strong', '--dark-control'],
    ['--dark-border-strong', '--dark-surface-2'],
    ['--dark-accent', '--dark-surface-2'],
  ]) expect(contrast(...pair)).toBeGreaterThanOrEqual(3);

  const channels = color => color.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16));
  for (const property of ['--dark-page', '--dark-surface-1', '--dark-surface-2', '--dark-control']) {
    const [red, green, blue] = channels(colors[property]);
    expect(Math.max(red, green, blue) - Math.min(red, green, blue)).toBeLessThanOrEqual(4);
    expect(green).toBeLessThanOrEqual(red + 1);
  }

  const renderedChannels = color => color.match(/\d+/g).slice(0, 3).map(Number);

  // The general surface system stays strictly neutral. The logo and result band
  // are the only sanctioned green surfaces and are asserted separately below.
  const renderedBackgrounds = await page.locator('.converter-composer').evaluate(element => ({
    page: getComputedStyle(document.body).backgroundColor,
    card: getComputedStyle(element).backgroundColor,
    control: getComputedStyle(element.querySelector('input')).backgroundColor,
  }));
  for (const background of Object.values(renderedBackgrounds)) {
    const [red, green, blue] = background.match(/\d+/g).slice(0, 3).map(Number);
    expect(Math.max(red, green, blue) - Math.min(red, green, blue)).toBeLessThanOrEqual(4);
    expect(green).toBeLessThanOrEqual(red + 1);
  }

  // The result is a subdued green-black ground, while its divider and logo use
  // their dedicated brand tokens rather than leaking into general roles.
  const resultBackground = await page.locator('.converter-composer .result')
    .evaluate(element => getComputedStyle(element).backgroundColor);
  expect(renderedChannels(resultBackground)).toEqual(channels(colors['--dark-brand-surface']));
  const logoBackground = await page.locator('.brand-mark rect').evaluate(element => getComputedStyle(element).fill);
  expect(renderedChannels(logoBackground)).toEqual(channels(colors['--dark-logo-background']));
  const [brandRed, brandGreen, brandBlue] = channels(colors['--dark-brand-surface']);
  expect(brandGreen).toBeGreaterThan(brandRed);
  expect(Math.max(brandRed, brandGreen, brandBlue) - Math.min(brandRed, brandGreen, brandBlue)).toBeLessThanOrEqual(20);
  expect(luminance(colors['--dark-brand-surface'])).toBeLessThanOrEqual(luminance(colors['--dark-surface-2']));
  for (const pair of [
    ['--dark-text', '--dark-brand-surface'],
    ['--dark-text-muted', '--dark-brand-surface'],
    ['--dark-brand-accent', '--dark-brand-surface'],
  ]) expect(contrast(...pair)).toBeGreaterThanOrEqual(4.5);

  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await input.fill('10 km in miles');
  await page.getByRole('button', { name: 'Pin pair' }).click();
  const pinnedButton = page.getByRole('button', { name: 'Pinned', exact: true });
  await expect(pinnedButton).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => {
    const styles = await pinnedButton.evaluate(element => ({
      background: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
    }));
    return {
      background: renderedChannels(styles.background),
      color: renderedChannels(styles.color),
    };
  }).toEqual({
    background: channels(colors['--dark-surface-2']),
    color: channels(colors['--dark-accent-hover']),
  });
  const divider = await page.locator('.converter-composer .actions')
    .evaluate(element => getComputedStyle(element).borderTopColor);
  expect(renderedChannels(divider)).toEqual(channels(colors['--dark-brand-border']));

  await page.goto('./#pairs');
  const category = page.locator('.category-item').first();
  await category.locator('.category-card').click();
  await expect.poll(async () => {
    const styles = await category.evaluate(element => ({
      category: getComputedStyle(element.querySelector('.category-card')).backgroundColor,
      panel: getComputedStyle(element.querySelector('.unit-panel')).backgroundColor,
      icon: getComputedStyle(element.querySelector('.category-card > span:last-child')).color,
    }));
    return Object.fromEntries(Object.entries(styles).map(([key, value]) => [key, renderedChannels(value)]));
  }).toEqual({
    category: channels(colors['--dark-surface-2']),
    panel: channels(colors['--dark-control']),
    icon: channels(colors['--dark-accent']),
  });

  await page.goto('./#library');
  const librarySurfaces = await page.locator('.library-panel').first().evaluate(element => ({
    panel: getComputedStyle(element).backgroundColor,
    count: getComputedStyle(element.querySelector('.library-count')).backgroundColor,
  }));
  expect(renderedChannels(librarySurfaces.panel)).toEqual(channels(colors['--dark-surface-1']));
  expect(renderedChannels(librarySurfaces.count)).toEqual(channels(colors['--dark-surface-2']));
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

test('loads, updates, and copies shareable conversion URLs', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async value => { window.__copiedText = value; } },
    });
  });
  await page.goto('./?q=10k+to+mi&p=10');
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await expect(input).toHaveValue('10k to mi');
  await expect(page.locator('.result')).toContainText('6.213711922');
  await expect(page.getByRole('group', { name: 'Significant digits' }).getByRole('button', { name: '10' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  const copied = new URL(await page.evaluate(() => window.__copiedText));
  expect(copied.searchParams.get('q')).toBe('10k to mi');
  expect(copied.searchParams.get('p')).toBe('10');

  await page.getByRole('group', { name: 'Significant digits' }).getByRole('button', { name: '15' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('p')).toBe('15');
  await input.fill('5kg to lb');
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false);
  await input.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('5kg to lb');

  await page.reload();
  await expect(input).toHaveValue('5kg to lb');
  await expect(page.locator('.result')).toContainText('11.023113109243');
  await page.getByRole('button', { name: 'Clear conversion input' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false);
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

test('browse choices consistently focus and select the suggested amount', async ({ page }) => {
  await page.goto('./#pairs');
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });

  await page.locator('.popular-pairs a').first().click();
  await expect(input).toHaveValue('10 km in mi');
  await expect(input).toBeFocused();
  await expect.poll(() => input.evaluate(element => element.value.slice(element.selectionStart, element.selectionEnd))).toBe('10');

  await page.getByRole('link', { name: 'Browse' }).first().click();
  await page.getByRole('button', { name: /Length.*units/ }).click();
  await page.getByRole('button', { name: 'km Kilometer' }).click();
  await page.getByRole('button', { name: /^mi\b/i }).click();
  await expect(input).toHaveValue('10 km in mi');
  await expect(input).toBeFocused();
  await expect.poll(() => input.evaluate(element => element.value.slice(element.selectionStart, element.selectionEnd))).toBe('10');
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

test('refreshes through Cloudflare-style canonicalization and starts from the precache offline', async ({ page, context }) => {
  await page.goto('./');
  const serviceWorkerScope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(serviceWorkerScope).pathname).toBe(new URL('./', page.url()).pathname);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cachedShell = await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find(name => name.startsWith('humanunits-'));
    const response = cacheName && await (await caches.open(cacheName)).match('./');
    return response && { redirected: response.redirected, url: response.url };
  });
  expect(cachedShell).toEqual({ redirected: false, url: new URL('./', page.url()).href });

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'What would you like to convert?' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  const input = page.getByRole('textbox', { name: 'What would you like to convert?' });
  await expect(input).toBeVisible();
  await input.fill('72 f to c');
  await expect(page.locator('.result')).toContainText('22.2222');
});
