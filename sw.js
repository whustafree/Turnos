const CACHE_NAME = 'turnos-v10-final';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // IGNORAR EXTERNOS (TAILWIND, SUPABASE)
  if (req.url.includes('http') && !req.url.includes(self.location.origin)) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkRes => {
        // Solo cachear respuestas válidas (status 200)
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic') {
            return networkRes;
        }
        const responseToCache = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
        return networkRes;
      }).catch(err => console.log('Offline:', err));
    })
  );
});