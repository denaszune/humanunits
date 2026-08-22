import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const root = join(process.cwd(), 'dist');
// Cloudflare Pages consumes underscore-prefixed deployment files instead of
// serving them. SEO discovery files also are not part of the offline app shell.
const nonAppShellFiles = new Set(['_headers', '_redirects', 'robots.txt', 'sitemap.xml']);
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(join(directory, entry.name)) : join(directory, entry.name)));
  return nested.flat();
}

const assetFiles = (await filesIn(root))
  .map(file => relative(root, file).split(sep).join('/'))
  .filter(file => file !== 'service-worker.js' && !file.endsWith('.map') && !nonAppShellFiles.has(file))
  .sort();
// Cloudflare Pages canonicalizes /index.html to /. Cache the canonical URL so
// the worker never returns a followed-redirect response to a navigation.
const assets = assetFiles.map(file => file === 'index.html' ? './' : `./${file}`);

const cacheHash = createHash('sha256');
for (const [index, asset] of assets.entries()) {
  cacheHash.update(asset);
  cacheHash.update(await readFile(join(root, assetFiles[index])));
}
const cacheVersion = cacheHash.digest('hex').slice(0, 12);
const source = `const CACHE = 'humanunits-${cacheVersion}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(async () => {
    // The previous Cloudflare build cached /index.html after its redirect to /.
    // Activate immediately only when that broken legacy response is present so
    // an already-controlled site can recover without a manual unregister.
    const legacyShell = await caches.match('./index.html');
    if (legacyShell?.redirected) await self.skipWaiting();
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('humanunits-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('./')).then(cached => cached || fetch(event.request)));
    return;
  }
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, { ignoreSearch: true })).then(cached => cached || fetch(event.request)));
});
`;
await writeFile(join(root, 'service-worker.js'), source);
console.log(`Precached ${assets.length} app-shell URLs.`);
