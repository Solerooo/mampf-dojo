/* Mampf-Dojo Service Worker
   - index.html: network-first (neue Version sofort, offline aus dem Cache)
   - alles andere: cache-first
   - VERSION bei JEDER Änderung erhöhen (gleich wie APP_VERSION in index.html)! */
const VERSION = '1.0.1';
const CACHE = 'mampf-dojo-' + VERSION;
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  // Kein automatisches skipWaiting: die Seite zeigt „Neues Update – neu laden?“
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mampf-dojo-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.typ === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.typ === 'VERSION' && event.source) event.source.postMessage({ typ: 'VERSION', version: VERSION });
});

function istSeite(request, url) {
  return request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // externe Links (Prospekte) nicht anfassen

  if (istSeite(req, url)) {
    // network-first mit Zeitlimit, Fallback Cache
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const netz = await Promise.race([
          fetch(req),
          new Promise((_, nein) => setTimeout(() => nein(new Error('timeout')), 4000)),
        ]);
        if (netz && netz.ok) cache.put('./index.html', netz.clone());
        return netz;
      } catch (e) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // cache-first für Icons, Manifest usw.
  event.respondWith((async () => {
    const treffer = await caches.match(req, { ignoreSearch: true });
    if (treffer) return treffer;
    try {
      const netz = await fetch(req);
      if (netz && netz.ok) { const cache = await caches.open(CACHE); cache.put(req, netz.clone()); }
      return netz;
    } catch (e) {
      return Response.error();
    }
  })());
});
