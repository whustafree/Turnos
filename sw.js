const CACHE_NAME = 'turnos-v9-rescue'; // Versión nueva para forzar borrado
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Cacheando archivos locales...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN (Limpieza agresiva de versiones viejas)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW: Eliminando caché corrupta/vieja', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH (Estrategia de seguridad)
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // --- REGLA DE ORO: IGNORAR EXTERNOS ---
  // Si la URL es de Tailwind, Supabase, FontAwesome o cualquier cosa fuera de tu dominio...
  // EL SERVICE WORKER NO HACE NADA. Deja que el navegador lo maneje normal.
  if (url.includes('cdn.tailwindcss.com') || 
      url.includes('supabase.co') || 
      url.includes('cloudflare.com') ||
      url.includes('jspdf') ||
      !url.includes(self.location.origin)) {
    return; // Salir y no tocar la petición
  }

  // Solo interceptamos archivos locales (index.html, style.css, script.js)
  // Estrategia: Network First (Intenta internet, si falla, usa caché)
  event.respondWith(
    fetch(req)
      .then(networkRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, networkRes.clone());
          return networkRes;
        });
      })
      .catch(() => caches.match(req)) // Si no hay internet, usa caché
  );
});