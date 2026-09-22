/* =========================================================
   حياتي — Service Worker
   Offline-first caching, install prompt support
   ========================================================= */

const CACHE_VERSION = 'hayati-v1.0.0';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/animations.css',
  './css/responsive.css',
  './js/storage.js',
  './js/router.js',
  './js/notifications.js',
  './js/tasks.js',
  './js/habits.js',
  './js/reminders.js',
  './js/calendar.js',
  './js/statistics.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-rounded.png'
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first with cache fallback for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Skip cross-origin requests (fonts from Google Fonts will fall back to network)
  if (url.origin !== location.origin) {
    // For Google Fonts, try cache then network
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
            }
            return resp;
          }).catch(() => cached);
        })
      );
    }
    return;
  }

  // Same-origin: cache-first for app shell, network-first for navigation
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
        return resp;
      }).catch(() => caches.match('./index.html').then((r) => r || caches.match(req)))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

// Listen for messages from the page (skip waiting on update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic sync for reminders (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'hayati-reminders') {
    event.waitUntil(showReminderNotifications());
  }
});

async function showReminderNotifications() {
  // Best-effort: send reminder notifications to active clients
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'CHECK_REMINDERS' });
  });
}

// Push notifications (for future server-side notifications)
self.addEventListener('push', (event) => {
  let data = { title: 'حياتي', body: 'لديك تذكير جديد' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [100, 50, 100],
      tag: data.tag || 'hayati-notif'
    })
  );
});

// Notification click: focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openApp();
    })
  );
});
