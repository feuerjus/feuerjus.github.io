const CACHE = 'feuerjus-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/tools.html',
  '/knowledge.html',
  '/projects.html',
  '/pictures/logo_pwa.png',
  '/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        return new Response('offline', { status: 503 });
      });
    })
  );
});
