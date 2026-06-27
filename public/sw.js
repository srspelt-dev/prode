// Service worker mínimo para que la app sea instalable (PWA).
// Estrategia network-first: usa la red y, si no hay, intenta el caché.

const CACHE = "prode-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo GET; el resto (POST/PUT) pasa directo a la red.
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cachear navegaciones y estáticos para fallback offline
        if (res.ok && (req.mode === "navigate" || req.destination)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// ===== Push (recordatorios) =====
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}
  const title = data.title || "Prode Mundial";
  const options = {
    body: data.body || "",
    icon: "/icon",
    badge: "/icon",
    vibrate: [80, 40, 80],
    data: { url: data.url || "/partidos" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/partidos";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
