const CACHE_NAME = 'ai-code-v1';

// Detecta se estamos em produção (Render) ou desenvolvimento
const isProduction = self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1';

const urlsToCache = isProduction ? [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/success.html'
] : [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './success.html'
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
          return fetch(event.request).catch((error) => {
            console.warn('API request failed:', error);
            return new Response(JSON.stringify({
              error: 'Serviço temporariamente indisponível',
              message: 'Tente novamente em alguns instantes'
            }), {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              }
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
            return caches.match('/index.html').then((fallback) => {
              if (fallback) return fallback;
              // Retorna uma resposta HTML simples se não tivermos o index no cache
              return new Response(`<html><body><h1>Offline</h1><p>Sem conexão e sem cache disponível.</p></body></html>`, {
                headers: { 'Content-Type': 'text/html' },
                status: 503
              });
            });
          }
          // Para outros recursos, retorna um texto ou erro JSON dependendo do destino
          if (event.request.destination === 'image') {
            return new Response('Image unavailable', { status: 503 });
          }
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
  );
});