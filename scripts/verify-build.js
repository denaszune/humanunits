import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || './';
const html = await readFile(join(root, 'index.html'), 'utf8');

for (const asset of ['manifest.webmanifest', 'icon.svg']) {
  // Rsbuild normalizes "./" away for hand-authored HTML tags; both forms are
  // document-relative and therefore remain portable to a project subpath.
  const expectedUrl = `${base === './' ? '' : base}${asset}`;
  if (!html.includes(`href="${expectedUrl}"`)) {
    throw new Error(`Built HTML does not reference ${expectedUrl}`);
  }
  await access(join(root, asset));
}

for (const pattern of [
  /<script[^>]+src="([^"]+)"/,
  /<link[^>]+href="([^"]+\.css)"/,
]) {
  const url = html.match(pattern)?.[1];
  if (!url?.startsWith(base)) {
    throw new Error(`Built HTML asset URL ${url || '(missing)'} does not use base ${base}`);
  }
  const assetPath = url.slice(base.length).split(/[?#]/, 1)[0];
  await access(join(root, assetPath));
}

const serviceWorker = await readFile(join(root, 'service-worker.js'), 'utf8');
const precache = JSON.parse(serviceWorker.match(/const ASSETS = (\[[^;]+\]);/)?.[1] || 'null');
if (!Array.isArray(precache) || precache.includes('./') || !precache.includes('./index.html')) {
  throw new Error('Service worker must precache only the canonical index.html application shell');
}
if (!serviceWorker.includes("event.request.mode === 'navigate'") ||
    !serviceWorker.includes("fetch(event.request).catch(() => caches.match('./index.html'))")) {
  throw new Error('Service worker must use network-first navigation with an offline index.html fallback');
}
for (const url of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))(?:[?#][^"]*)?"/g)) {
  const assetPath = url[1].slice(base.length);
  await access(join(root, assetPath));
  if (!precache.includes(`./${assetPath}`)) {
    throw new Error(`Service worker does not precache HTML asset ${assetPath}`);
  }
}

const scriptsDirectory = join(root, 'static', 'js');
const scripts = await readdir(scriptsDirectory);
const sources = await Promise.all(
  scripts.filter(file => file.endsWith('.js')).map(file => readFile(join(scriptsDirectory, file), 'utf8')),
);

if (sources.some(source => source.includes('React.createElement'))) {
  throw new Error('Solid JSX was compiled as React.createElement');
}

console.log('Verified GitHub Pages asset paths and Solid JSX output.');
