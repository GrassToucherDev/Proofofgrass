// Proof of Grass — Service Worker
// Strategy: Network-first for pages, Cache-first for assets
// Future: Add push notification handlers here

const CACHE_NAME = "pog-v1";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/leaderboard",
  "/quests",
  "/offline",
  "/touchgrass-transparent.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache failed for some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and Supabase API requests
  if (
    request.method !== "GET" ||
    !url.origin.includes(self.location.origin) ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Static assets — cache first, network fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network first, cache fallback, offline page last
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }
});

// ── Push Notifications (FUTURE — not active yet) ──────────────────────────────
// TODO Phase 8: Uncomment and implement when push is ready
//
// self.addEventListener("push", (event) => {
//   const data = event.data?.json() ?? {};
//   const title = data.title || "Proof of Grass";
//   const options = {
//     body: data.body || "Time to touch grass!",
//     icon: "/icons/icon-192.png",
//     badge: "/icons/icon-192.png",
//     data: { url: data.url || "/" },
//     actions: [
//       { action: "open", title: "Open App" },
//       { action: "dismiss", title: "Dismiss" },
//     ],
//   };
//   event.waitUntil(self.registration.showNotification(title, options));
// });
//
// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   if (event.action === "dismiss") return;
//   const url = event.notification.data?.url || "/";
//   event.waitUntil(
//     clients.matchAll({ type: "window" }).then((windowClients) => {
//       const existing = windowClients.find((c) => c.url === url && "focus" in c);
//       if (existing) return existing.focus();
//       return clients.openWindow(url);
//     })
//   );
// });