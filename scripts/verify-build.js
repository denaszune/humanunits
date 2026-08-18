import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || './';
const html = await readFile(join(root, 'index.html'), 'utf8');

const htmlAssets = [
  'manifest.webmanifest',
  'icon-any.323fef38.svg',
  'favicon-32.42bba446.png',
  'apple-touch-180.72eade88.png',
];
const manifestAssets = [
  'icon-any-192.bf511c85.png',
  'icon-any-512.fa6c07c1.png',
  'icon-any.323fef38.svg',
  'icon-maskable-192.73ac1b16.png',
  'icon-maskable-512.c93087a1.png',
  'icon-maskable.f58926ff.svg',
  'icon-monochrome.25ecd6ba.svg',
];

for (const asset of htmlAssets) {
  // Rsbuild normalizes "./" away for hand-authored HTML tags; both forms are
  // document-relative and therefore remain portable to a project subpath.
  const expectedUrl = `${base === './' ? '' : base}${asset}`;
  if (!html.includes(`href="${expectedUrl}"`)) {
    throw new Error(`Built HTML does not reference ${expectedUrl}`);
  }
  await access(join(root, asset));
}

const manifest = JSON.parse(await readFile(join(root, 'manifest.webmanifest'), 'utf8'));
for (const asset of manifestAssets) {
  if (!manifest.icons?.some(icon => icon.src === asset)) {
    throw new Error(`Built manifest does not reference ${asset}`);
  }
  await access(join(root, asset));
}
for (const purpose of ['any', 'maskable', 'monochrome']) {
  if (!manifest.icons.some(icon => icon.purpose?.split(/\s+/).includes(purpose))) {
    throw new Error(`Built manifest does not provide a ${purpose} icon`);
  }
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
    !serviceWorker.includes("caches.match('./index.html').then(cached => cached || fetch(event.request))")) {
  throw new Error('Service worker must use cache-first navigation with a network fallback');
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
