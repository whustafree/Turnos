const CACHE_NAME = 'turnos-v5-final'; // Cambié versión para forzar actualización
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
  // NOTA: No ponemos librerías externas aquí para evitar error CORS al instalar
];

// 1. INSTALACIÓN: Solo archivos locales
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-cacheando archivos locales');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN: Limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW: Borrando caché vieja', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Cache Dinámico (Guarda lo externo automáticamente al usarlo)
self.addEventListener('fetch', event => {
  const req = event.request;

  // Solo interceptar GET http/https
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then(cachedRes => {
      // Si ya lo tenemos guardado (ej: Tailwind después de la primera carga), lo devolvemos rápido
      if (cachedRes) {
        return cachedRes;
      }

      // Si no, vamos a internet
      return fetch(req).then(networkRes => {
        // Verificamos que la respuesta sea válida
        if (!networkRes || networkRes.status !== 200 || networkRes.type === 'error') {
          return networkRes;
        }

        // Guardamos copia en caché para la próxima vez (y para offline)
        const responseToCache = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(req, responseToCache);
        });

        return networkRes;
      }).catch(() => {
        // Si falla internet y no estaba en caché...
        console.log('Offline y recurso no cacheado:', req.url);
      });
    })
  );
});