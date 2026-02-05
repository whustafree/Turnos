const CACHE_NAME = 'turnos-v3-pro'; // Cambié el nombre para forzar actualización
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // LIBRERÍAS EXTERNAS (CRÍTICO: Si no están aquí, la PWA falla offline/al abrir)
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// INSTALACIÓN: Guardar todo en caché
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza al SW a activarse de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Abriendo caché y guardando assets...');
      return cache.addAll(assets);
    })
  );
});

// ACTIVACIÓN: Borrar cachés viejas (Para que no tengas que borrar datos manualmente)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma el control de la página inmediatamente
});

// FETCH: Estrategia "Network First" para HTML (para que siempre veas cambios) 
// y "Cache First" para lo demás (para velocidad)
self.addEventListener('fetch', event => {
  const req = event.request;
  
  // Para el HTML principal, intentar red primero, luego caché (para actualizaciones)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Para el resto (imágenes, scripts), intentar caché primero, luego red
  event.respondWith(
    caches.match(req).then(response => {
      return response || fetch(req);
    })
  );
});