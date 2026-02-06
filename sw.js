const CACHE_NAME = 'turnos-v7-final'; // Cambié versión para limpiar errores previos
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
  // IMPORTANTE: NO ponemos aquí tailwind ni supabase para evitar el error CORS
];

// 1. INSTALACIÓN (Solo archivos locales)
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Cacheando archivos locales...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN (Limpieza)
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

// 3. FETCH (Estrategia Segura)
self.addEventListener('fetch', event => {
  const req = event.request;

  // Si es una petición externa (http/https que no es de mi dominio), la dejamos pasar normal
  // Esto evita el error de CORS con Tailwind y Supabase
  if (req.url.includes('http') && !req.url.includes(self.location.origin)) {
    return; 
  }

  // Para archivos locales, intentamos caché primero, luego red
  event.respondWith(
    caches.match(req).then(cachedRes => {
      if (cachedRes) return cachedRes;
      return fetch(req).catch(err => console.log('Error de red:', err));
    })
  );
});