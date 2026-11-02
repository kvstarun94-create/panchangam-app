/* Vedic Chronometer service worker
   - App files: cache-first, so the app opens offline.
   - Google Fonts: cached the first time they load, then served offline.
   Bump CACHE_VERSION whenever you publish a new version of index.html. */
const CACHE_VERSION = 'v7.2.0';
const APP_CACHE = 'vedic-app-' + CACHE_VERSION;
const FONT_CACHE = 'vedic-fonts-v1';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => (k.startsWith('vedic-app-') && k !== APP_CACHE))
        .map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const fetched = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || fetched;
        })
      )
    );
    return;
  }

  // Same-origin app files: cache first, then network (and keep a fresh copy)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const fetched = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(APP_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit || caches.match('./index.html'));
        return hit || fetched;
      })
    );
  }
});
