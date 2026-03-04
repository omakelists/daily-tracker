const CACHE = 'daily-tracker-v10';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './version.json',
  './favicon.ico',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './locales/en.json',
  './locales/ja.json',
  './locales/zh-Hans.json',
  './locales/zh-Hant.json',
  './locales/ko.json',
  './locales/es.json',
  './src/main.js',
  './src/App.js',
  './src/ui/GameCard.js',
  './src/ui/TaskRow.js',
  './src/ui/Settings.js',
  './src/ui/Calendar.js',
  './src/ui/UI.js',
  './src/util/i18n.js',
  './src/util/storage.js',
  './src/util/helpers.js',
  './src/constants.js',
];

const CDN_ORIGINS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

// Install: cache all assets but do NOT call skipWaiting().
// The new SW waits until the user confirms the update in the app UI,
// at which point the app sends a SKIP_WAITING message.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(LOCAL_ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// When the app sends SKIP_WAITING (after user confirms update), take over immediately.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // version.json?check=1  →  always fetch from network (bypass cache) for update checks
  if (url.pathname.endsWith('/version.json') && url.searchParams.has('check')) {
    e.respondWith(fetch(url.pathname).catch(() => new Response('{}', { status: 503 })));
    return;
  }

  // Hard reload: browser sends cache:'no-cache' or 'reload' for sub-resources.
  // Bypass the SW cache so all assets are refreshed consistently with the new HTML.
  if (e.request.cache === 'no-cache' || e.request.cache === 'reload') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  const { hostname } = url;
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
