const CACHE_NAME = 'turnos-v20-local';
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
  const url = new URL(req.url);

  // NO CACHEAR NADA EXTERNO (Supabase, Tailwind, Extensiones)
  if (!url.protocol.startsWith('http') || !url.href.includes(self.location.origin)) {
    return;
  }

  // ESTRATEGIA: Cache First para archivos locales (velocidad)
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      });
    }).catch(() => caches.match('./index.html')) // Fallback si falla todo
  );
});