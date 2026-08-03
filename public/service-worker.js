// Production builds replace this file with a version containing the complete asset list.
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
