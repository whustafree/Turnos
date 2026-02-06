const CACHE_NAME = 'turnos-v12-stable'; // Versión nueva para limpiar todo
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

  // --- PROTECCIÓN CONTRA ERRORES ---
  
  // 1. Si NO es http o https (ej: chrome-extension://), IGNORAR.
  // Esto arregla el error "Request scheme chrome-extension is unsupported"
  if (!req.url.startsWith('http')) return;

  // 2. Si NO es de mi propio dominio (ej: tailwind, supabase), IGNORAR.
  // Esto arregla el error de CORS y la pantalla blanca.
  if (!req.url.includes(self.location.origin)) return;

  // 3. Estrategia: Network First (Intentar red, si falla, usar caché)
  event.respondWith(
    fetch(req).then(networkRes => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(req, networkRes.clone());
        return networkRes;
      });
    }).catch(() => {
      // Si estamos offline, devolvemos lo guardado
      return caches.match(req);
    })
  );
});