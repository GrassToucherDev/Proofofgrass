// Proof of Grass: push-only service worker. No caching, no fetch handling: it only shows reminder notifications.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = {}; }
  event.waitUntil(self.registration.showNotification(d.title || "Don't forget to touch grass today!", {
    body: d.body || "Log today's proof to keep your streak going.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: d.tag || "pog-reminder",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => "focus" in c);
    if (open) { open.navigate?.(url); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
