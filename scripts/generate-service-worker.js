import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const root = join(process.cwd(), 'dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(join(directory, entry.name)) : join(directory, entry.name)));
  return nested.flat();
}

const assets = (await filesIn(root))
  .map(file => relative(root, file).split(sep).join('/'))
  .filter(file => file !== 'service-worker.js' && !file.endsWith('.map'))
  .sort()
  .map(file => `./${file}`);

const cacheHash = createHash('sha256');
for (const asset of assets) {
  cacheHash.update(asset);
  cacheHash.update(await readFile(join(root, asset.slice(2))));
}
const cacheVersion = cacheHash.digest('hex').slice(0, 12);
const source = `const CACHE = 'humanunits-${cacheVersion}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
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
    event.respondWith(caches.match('./index.html').then(cached => cached || fetch(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request)));
});
`;
await writeFile(join(root, 'service-worker.js'), source);
console.log(`Precached ${assets.length} app-shell URLs.`);
