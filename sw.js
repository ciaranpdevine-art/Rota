// Minimal service worker — its only job is to make this site installable
// as a desktop/home-screen app, with basic offline resilience.
//
// The page itself (index.html) is fetched network-first, so you always get
// the latest version when you have a connection — it only falls back to the
// cached copy if you're offline. Static assets (icons, manifest) are
// cached-first since they rarely change.
const CACHE_NAME = 'work-rota-v2';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Page navigations: always try the network first so updates show up
  // immediately; fall back to the cached shell only if offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (icons, manifest, Firebase SDK, etc.): cache-first,
  // then go to the network and store a copy for next time.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
