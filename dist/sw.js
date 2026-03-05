const CACHE = 'daily-tracker';

const LOCAL_ASSETS = [
  './',
  './_virtual/jsx-runtime.js',
  './_virtual/jsx-runtime2.js',
  './_virtual/modulepreload-polyfill.js',
  './_virtual/react-jsx-runtime.production.min.js',
  './assets/ui/Calendar.module-Ddidh9x1.css',
  './assets/ui/CropModal.module-WNSlvr8i.css',
  './assets/ui/GameCard.module-B_oMEfQI.css',
  './assets/ui/Settings.module-iwkgneVJ.css',
  './assets/ui/shared.module-C-PpsaUJ.css',
  './assets/ui/TaskRow.module-mFKcPuAM.css',
  './assets/ui/UI.module-CHBfl9iQ.css',
  './assets/App.module-O9QnChSK.css',
  './assets/style-Ce4UYUml.css',
  './locales/en.json',
  './locales/es.json',
  './locales/ja.json',
  './locales/ko.json',
  './locales/zh-Hans.json',
  './locales/zh-Hant.json',
  './node_modules/react/cjs/react-jsx-runtime.production.min.js',
  './node_modules/react/jsx-runtime.js',
  './ui/Calendar.js',
  './ui/Calendar.module.css.js',
  './ui/CropModal.js',
  './ui/CropModal.module.css.js',
  './ui/GameCard.js',
  './ui/GameCard.module.css.js',
  './ui/Settings.js',
  './ui/Settings.module.css.js',
  './ui/shared.module.css.js',
  './ui/TaskRow.js',
  './ui/TaskRow.module.css.js',
  './ui/UI.js',
  './ui/UI.module.css.js',
  './util/cx.js',
  './util/helpers.js',
  './util/i18n.js',
  './util/imageStorage.js',
  './util/storage.js',
  './App.js',
  './App.module.css.js',
  './constants.js',
  './favicon.ico',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './index.html',
  './main.js',
  './manifest.json',
  './preview.png',
  './version.json',
];

const CDN_ORIGINS = ['cdn.jsdelivr.net'];

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
