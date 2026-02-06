const CACHE_NAME = 'turnos-v15-fixed'; // Versión nueva
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. INSTALACIÓN: Guardamos solo lo nuestro
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Guardando archivos locales');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN: Limpieza profunda
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

// 3. FETCH: Lógica Inteligente
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // --- REGLAS DE EXCLUSIÓN (LO QUE NO SE DEBE TOCAR) ---
  
  // Ignorar extensiones de Chrome (evita el error 'unsupported scheme')
  if (!url.protocol.startsWith('http')) return;

  // Ignorar Supabase (base de datos) para que el login/dashboard no falle
  if (url.hostname.includes('supabase.co')) return;

  // Ignorar Tailwind y Fuentes (dejar que el navegador las maneje por su cuenta)
  // Esto arregla que se quede sin estilos al recargar
  if (url.hostname.includes('tailwindcss.com') || 
      url.hostname.includes('cloudflare.com') || 
      url.hostname.includes('jspdf')) {
      return; 
  }

  // --- ESTRATEGIA PARA ARCHIVOS LOCALES ---
  // Network First (Intenta internet para tener lo último, si falla usa caché)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache First para CSS, JS e imágenes locales
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(networkRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, networkRes.clone());
          return networkRes;
        });
      });
    })
  );
});