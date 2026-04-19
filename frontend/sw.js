const CACHE_NAME = 'ai-code-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna cache se disponível, senão faz requisição
        if (response) {
          return response;
        }

        // Para requisições de API, não cacheia
        if (event.request.url.includes('/api/') ||
            event.request.url.includes('/register') ||
            event.request.url.includes('/login') ||
            event.request.url.includes('/generate') ||
            event.request.url.includes('/checkout') ||
            event.request.url.includes('/webhook') ||
            event.request.url.includes('/me') ||
            event.request.url.includes('/forgot-password') ||
            event.request.url.includes('/reset-password')) {
          return fetch(event.request).catch(() => {
            // Se a API falhar, retorna uma resposta de erro
            return new Response(JSON.stringify({ error: 'API unavailable' }), {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            });
          });
        }

        return fetch(event.request).then((response) => {
          // Cache apenas respostas bem-sucedidas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Fallback para offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          // Para outros recursos, retorna erro
          return new Response('Offline', { status: 503 });
        });
  );
});