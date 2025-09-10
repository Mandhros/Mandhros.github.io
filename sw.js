const CACHE_NAME = 'gym-assistant-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
];

// Installe le service worker et met en cache les ressources de l'application
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepte les requêtes réseau et sert les ressources depuis le cache si disponible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Le cache a trouvé une correspondance, retourne la réponse
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Vérifie si nous avons reçu une réponse valide
            if (!response || response.status !== 200) {
              return response;
            }
            // Ne met pas en cache les requêtes de l'API Gemini ou d'autres API externes
            if (event.request.url.includes('generativelanguage.googleapis.com')) {
                return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Supprime les anciens caches lors de l'activation d'un nouveau service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
