const CACHE = 'daily-tracker-v3';

const LOCAL_ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './icon-192.png', './icon-512.png',
  './locales/en.json', './locales/ja.json', './locales/zh.json',
  './locales/ko.json', './locales/es.json',
  './src/main.js', './src/i18n.js', './src/storage.js',
  './src/constants.js', './src/helpers.js', './src/App.js',
  './src/GameCard.js', './src/TaskRow.js',
  './src/Settings.js', './src/Calendar.js', './src/UI.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(LOCAL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // CDN resources: cache-first with network fallback
  if (url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Local assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => caches.match('./index.html'))
    )
  );
});
