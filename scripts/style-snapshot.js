// Captures the full computed style of every element across routes, themes, viewports and
// a few interactive states. Used to prove a CSS refactor is behaviour-neutral: the
// snapshot must be identical before and after. Not part of the build or test suite.
import { chromium } from '@playwright/test';
import { startDistServer } from './serve-dist.js';
import { writeFileSync } from 'node:fs';

const ROUTES = ['', '#pairs', '#library', '#about', '#license'];
const VIEWPORTS = [[1280, 900], [640, 844], [390, 844]];
const THEMES = ['light', 'dark'];

const collect = () => [...document.querySelectorAll('*')].map(el => {
  const parts = [];
  const dump = (style, prefix) => {
    for (let i = 0; i < style.length; i++) {
      parts.push(prefix + style[i] + ':' + style.getPropertyValue(style[i]));
    }
  };
  dump(getComputedStyle(el), '');
  // pseudo-elements carry real chrome in this stylesheet, so capture them too
  for (const pseudo of ['::before', '::after']) {
    const ps = getComputedStyle(el, pseudo);
    if (ps.content && ps.content !== 'none') dump(ps, pseudo + '|');
  }
  const path = [];
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cls = typeof n.className === 'string' && n.className.trim()
      ? '.' + n.className.trim().replace(/\s+/g, '.') : '';
    path.unshift(n.tagName + cls);
  }
  return { path: path.join('>'), props: parts.join(';') };
});

// Sampling while a transition is mid-flight yields off-by-one interpolated colours and
// makes the snapshot nondeterministic. Snap every running animation to its end state
// first; this keeps the transition-* properties themselves observable.
const settle = async page => {
  await page.waitForTimeout(80);
  await page.evaluate(() => document.getAnimations().forEach(animation => {
    try { animation.finish(); } catch { animation.cancel(); }
  }));
  await page.waitForTimeout(80);
};

const server = await startDistServer(4199, '/');
const browser = await chromium.launch();
const out = [];
for (const theme of THEMES) {
  for (const [width, height] of VIEWPORTS) {
    const context = await browser.newContext({ colorScheme: theme, viewport: { width, height } });
    const page = await context.newPage();
    for (const route of ROUTES) {
      const label = theme + '|' + width + 'x' + height + '|' + (route || 'convert');
      await page.goto('http://127.0.0.1:4199/' + route);
      await settle(page);
      out.push({ key: label + '|base', elements: await page.evaluate(collect) });
      if (route === '#pairs') {
        // the expanded category is the state this refactor touches most
        await page.getByRole('button', { name: 'Acceleration 5 units', exact: true }).click();
        await settle(page);
        out.push({ key: label + '|expanded', elements: await page.evaluate(collect) });
        await page.getByRole('button', { name: 'm/s² meter per second squared', exact: true }).click();
        await settle(page);
        out.push({ key: label + '|selected', elements: await page.evaluate(collect) });
      }
    }
    await context.close();
  }
}
await browser.close();
server.closeAllConnections();
await new Promise(resolve => server.close(resolve));
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const total = out.reduce((sum, state) => sum + state.elements.length, 0);
console.log('snapshot: ' + out.length + ' states, ' + total + ' elements -> ' + process.argv[2]);
