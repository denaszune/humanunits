import { access, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || './';
const html = await readFile(join(root, 'index.html'), 'utf8');
const productionOrigin = 'https://humanunits.com';

for (const required of [
  '<title>Human Units — Fast, Private Unit Converter</title>',
  '<h1>Fast, private unit conversion</h1>',
  'Convert 500+ everyday, scientific, computing, and specialist units',
  '<meta name="referrer" content="no-referrer">',
  '<meta name="robots" content="index, follow">',
  '<meta http-equiv="Content-Security-Policy"',
  "default-src 'self'",
  "object-src 'none'",
  "script-src 'self'",
  `<link rel="canonical" href="${productionOrigin}/">`,
  `<meta property="og:url" content="${productionOrigin}/">`,
  '<script type="application/ld+json">',
]) {
  if (!html.includes(required)) throw new Error(`Built HTML is missing required production metadata: ${required}`);
}
if (html.includes('denaszune.github.io/humanunits')) {
  throw new Error('Built HTML still references the legacy GitHub Pages origin');
}

const htmlAssets = [
  'manifest.webmanifest',
  'icon-any.323fef38.svg',
  'favicon-32.b4790ade.png',
  'apple-touch-180.625da17a.png',
];
const manifestAssets = [
  'icon-any-192.e8768384.png',
  'icon-any-512.3275eece.png',
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
for (const [field, expected] of Object.entries({ id: './', start_url: './', scope: './', display: 'standalone', lang: 'en-US', dir: 'ltr' })) {
  if (manifest[field] !== expected) throw new Error(`Manifest ${field} must equal ${expected}`);
}
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
for (const excluded of ['./_headers', './_redirects', './robots.txt', './sitemap.xml']) {
  if (precache.includes(excluded)) throw new Error(`Service worker must not precache deployment/discovery file ${excluded}`);
}
const expectedCacheHash = createHash('sha256');
for (const asset of precache) {
  expectedCacheHash.update(asset);
  expectedCacheHash.update(await readFile(join(root, asset.slice(2))));
}
const expectedCache = `humanunits-${expectedCacheHash.digest('hex').slice(0, 12)}`;
if (!serviceWorker.includes(`const CACHE = '${expectedCache}'`)) {
  throw new Error('Service-worker cache version must include the contents of every precached asset');
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

const headers = (await readFile(join(root, '_headers'), 'utf8')).replaceAll('\r\n', '\n');
for (const required of [
  '/static/*\n  Cache-Control: public, max-age=31536000, immutable',
  '/icon-*\n  Cache-Control: public, max-age=31536000, immutable',
  '/favicon-*\n  Cache-Control: public, max-age=31536000, immutable',
  '/apple-touch-*\n  Cache-Control: public, max-age=31536000, immutable',
  '/\n  Cache-Control: public, max-age=0, must-revalidate',
  '/index.html\n  Cache-Control: public, max-age=0, must-revalidate',
  '/manifest.webmanifest\n  Cache-Control: public, max-age=0, must-revalidate',
  '/service-worker.js\n  Cache-Control: no-cache, no-store, must-revalidate',
  'https://staging.humanunits.com/*\n  X-Robots-Tag: noindex, nofollow',
  "frame-ancestors 'none'",
]) {
  if (!headers.includes(required)) throw new Error(`Cloudflare Pages headers are missing: ${required}`);
}

const robots = await readFile(join(root, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`)) {
  throw new Error('robots.txt does not advertise the production sitemap');
}
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
if (!sitemap.includes(`<loc>${productionOrigin}/</loc>`)) {
  throw new Error('Sitemap does not contain the production canonical URL');
}

console.log(`Verified ${base === './' ? 'domain-root' : base} asset paths, Cloudflare metadata, PWA files, and Solid JSX output.`);
