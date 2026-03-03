const CACHE = 'daily-tracker-v6';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './locales/en.json',
  './locales/ja.json',
  './locales/zh.json',
  './locales/ko.json',
  './locales/es.json',
  './src/main.js',
  './src/App.js',
  './src/GameCard.js',
  './src/TaskRow.js',
  './src/Settings.js',
  './src/Calendar.js',
  './src/UI.js',
  './src/i18n.js',
  './src/storage.js',
  './src/helpers.js',
  './src/constants.js',
];

// jsdelivr serves React ESM modules (jsx-runtime, react-dom/client, etc.)
const CDN_ORIGINS = ['cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(LOCAL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { hostname } = new URL(e.request.url);

  if (CDN_ORIGINS.includes(hostname)) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) => cached || fetch(e.request).catch(() => caches.match('./index.html'))
    )
  );
});
