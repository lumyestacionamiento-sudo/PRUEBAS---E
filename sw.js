const CACHE_NAME = 'lumy-v-cache-v1';

// Archivos a cachear para funcionar offline
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js',
];

// Instalación: cachear todos los assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(e => console.log('No se pudo cachear:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: primero caché, luego red
self.addEventListener('fetch', event => {
  // Solo interceptar GET requests
  if(event.request.method !== 'GET') return;
  
  // Para Firebase (Firestore API) dejar pasar siempre a la red
  if(event.request.url.includes('firestore.googleapis.com') ||
     event.request.url.includes('firebase.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      // Si no está en caché, intentar red y guardar
      return fetch(event.request).then(response => {
        if(response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Si no hay red y no hay caché, devolver index.html como fallback
        if(event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
