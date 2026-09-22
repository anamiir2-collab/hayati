/* =========================================================
   حياتي — Service Worker
   Offline-first / PWA / Notifications
   ========================================================= */

const CACHE_VERSION = "hayati-v1.1.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  // CSS
  "./css/style.css",
  "./css/animations.css",
  "./css/responsive.css",

  // JavaScript
  "./js/storage.js",
  "./js/router.js",
  "./js/notifications.js",
  "./js/tasks.js",
  "./js/habits.js",
  "./js/reminders.js",
  "./js/calendar.js",
  "./js/statistics.js",
  "./js/app.js",

  // App icons
  "./assets/icons/favicon-32.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-rounded.png",
  "./assets/icons/shortcut-habits.png"
];

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.warn("Hayati SW install cache error:", error);
      })
      .finally(() => {
        return self.skipWaiting();
      })
  );
});

/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => {
              return (
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE
              );
            })
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /* ---------------------------------------------
     External resources
     --------------------------------------------- */

  if (url.origin !== self.location.origin) {

    // Google Fonts
    if (
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com"
    ) {
      event.respondWith(
        caches.match(request)
          .then((cached) => {
            if (cached) {
              return cached;
            }

            return fetch(request)
              .then((response) => {

                if (
                  response &&
                  response.ok
                ) {
                  const copy = response.clone();

                  caches.open(RUNTIME_CACHE)
                    .then((cache) => {
                      cache.put(request, copy);
                    });
                }

                return response;
              })
              .catch(() => {
                return cached;
              });
          })
      );
    }

    return;
  }

  /* ---------------------------------------------
     Navigation requests
     Network first
     --------------------------------------------- */

  if (request.mode === "navigate") {

    event.respondWith(
      fetch(request)
        .then((response) => {

          if (response && response.ok) {
            const copy = response.clone();

            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, copy);
              });
          }

          return response;
        })
        .catch(() => {
          return caches.match("./index.html")
            .then((cached) => {
              return cached || Response.error();
            });
        })
    );

    return;
  }

  /* ---------------------------------------------
     Static resources
     Cache first
     --------------------------------------------- */

  event.respondWith(
    caches.match(request)
      .then((cached) => {

        if (cached) {
          return cached;
        }

        return fetch(request)
          .then((response) => {

            if (
              response &&
              response.ok &&
              response.type === "basic"
            ) {
              const copy = response.clone();

              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, copy);
                });
            }

            return response;
          })
          .catch(() => {
            return cached;
          });
      })
  );
});

/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener("message", (event) => {

  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_RUNTIME_CACHE") {
    caches.delete(RUNTIME_CACHE);
  }
});

/* =========================================================
   PERIODIC SYNC
   ========================================================= */

self.addEventListener("periodicsync", (event) => {

  if (event.tag === "hayati-reminders") {
    event.waitUntil(
      showReminderNotifications()
    );
  }

});

/* =========================================================
   REMINDER CHECK
   ========================================================= */

async function showReminderNotifications() {

  try {

    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clients) {

      client.postMessage({
        type: "CHECK_REMINDERS"
      });

    }

  } catch (error) {

    console.warn(
      "Hayati reminder sync error:",
      error
    );

  }

}

/* =========================================================
   PUSH
   ========================================================= */

self.addEventListener("push", (event) => {

  let data = {
    title: "حياتي",
    body: "لديك تذكير جديد"
  };

  try {

    if (event.data) {
      data = event.data.json();
    }

  } catch (error) {

    console.warn(
      "Invalid push data:",
      error
    );

  }

  const title = data.title || "حياتي";

  const options = {

    body: data.body || "لديك تذكير جديد",

    icon: "./assets/icons/icon-192.png",

    badge: "./assets/icons/favicon-32.png",

    image: data.image || undefined,

    dir: "rtl",

    lang: "ar",

    tag: data.tag || "hayati-notification",

    renotify: true,

    vibrate: [100, 50, 100],

    data: {
      url: data.url || "./"
    }

  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );

});

/* =========================================================
   NOTIFICATION CLICK
   ========================================================= */

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "./";

  event.waitUntil(

    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((clientList) => {

        // لو التطبيق مفتوح
        for (const client of clientList) {

          if (
            "focus" in client &&
            client.url.includes(self.location.origin)
          ) {

            return client.focus()
              .then(() => {

                if ("navigate" in client) {
                  return client.navigate(targetUrl);
                }

              });

          }

        }

        // لو التطبيق مش مفتوح
        if (self.clients.openWindow) {
          return self.clients.openWindow(
            targetUrl
          );
        }

      })

  );

});