const CACHE_NAME = 'turnos-v6-fix'; // Versión nueva para forzar limpieza
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Guardando archivos locales...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN (Limpieza de caché vieja)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW: Borrando caché antigua', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH (INTERCEPTOR)
self.addEventListener('fetch', event => {
  const req = event.request;

  // --- SOLUCIÓN DEL ERROR ---
  // Si la petición es externa (Tailwind, Supabase, Fuentes), NO la interceptamos.
  // Dejamos que el navegador la maneje directamente para evitar errores de CORS.
  if (req.url.includes('http') && !req.url.includes(self.location.origin)) {
    return; 
  }

  // Para archivos locales, usamos la estrategia: Caché primero, luego Red
  event.respondWith(
    caches.match(req).then(cachedRes => {
      if (cachedRes) return cachedRes;
      return fetch(req).catch(err => console.log('Fallo de red:', err));
    })
  );
});